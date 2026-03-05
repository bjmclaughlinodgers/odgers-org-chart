import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function — Email Ingest Agent
 *
 * POST /api/email-ingest
 * Body: { emailText: string, openSeats: SeatSummary[] }
 *
 * Uses the Anthropic Claude API to parse email text for candidate and seat information,
 * cross-reference against existing open seats, and return structured results.
 */

interface SeatSummary {
  id: string;
  title: string;
  practiceArea: string;
  band: string;
  candidates: { id: string; name: string; linkedinUrl?: string }[];
}

interface ParsedCandidate {
  name: string;
  linkedinUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  notes: string | null;
  existingCandidateId: string | null;
  action: 'create' | 'update';
}

interface ParseResult {
  matchedSeatId: string | null;
  seatTitle: string | null;
  confidence: 'high' | 'medium' | 'low';
  newSeat: {
    title: string;
    practiceArea: string;
    band: string;
  } | null;
  candidates: ParsedCandidate[];
  summary: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY in your Vercel environment variables.',
    });
  }

  const { emailText, openSeats } = req.body ?? {};

  if (!emailText || typeof emailText !== 'string') {
    return res.status(400).json({ error: 'emailText is required' });
  }

  if (emailText.length > 50000) {
    return res.status(400).json({ error: 'Email text is too long (max 50,000 characters)' });
  }

  // Build the seat context for the prompt
  const seatsContext = Array.isArray(openSeats) && openSeats.length > 0
    ? openSeats.map((s: SeatSummary) =>
        `- Seat ID: ${s.id} | Title: "${s.title}" | Practice: ${s.practiceArea} | Band: ${s.band} | Existing candidates: ${
          s.candidates.length > 0
            ? s.candidates.map(c => `${c.name}${c.linkedinUrl ? ` (${c.linkedinUrl})` : ''}`).join(', ')
            : 'none'
        }`
      ).join('\n')
    : 'No open seats currently in the system.';

  const systemPrompt = `You are an HR data extraction assistant for Odgers Berndtson, an executive search firm. Your job is to parse forwarded emails and extract structured candidate and open seat information.

You will receive:
1. The text of a forwarded email
2. A list of current open seats in the recruiting database

Your task:
1. Identify which open seat the email most likely relates to (match by role title, practice area, or other keywords)
2. Extract all candidate information mentioned in the email
3. Cross-reference candidates against existing candidates in the matched seat (by name or LinkedIn URL)
4. Return structured JSON

IMPORTANT RULES:
- Extract LinkedIn URLs exactly as they appear (linkedin.com/in/... format)
- For candidate names, extract full names when available
- If the email mentions a role/position that doesn't match any existing seat, set matchedSeatId to null and populate newSeat
- Set confidence to "high" if the seat title is clearly mentioned, "medium" if inferred from context, "low" if uncertain
- For existing candidates (matched by name or LinkedIn URL), set action to "update" and include their existingCandidateId
- For new candidates, set action to "create" and existingCandidateId to null
- Extract any contextual notes about candidates (strengths, concerns, interview feedback, etc.) into the notes field
- If no candidates are found, return an empty candidates array
- Always provide a brief summary of what was parsed`;

  const userMessage = `Here are the current open seats in our database:

${seatsContext}

---

Here is the email to parse:

${emailText}

---

Return ONLY a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "matchedSeatId": "seat-id-here or null",
  "seatTitle": "matched or inferred seat title",
  "confidence": "high|medium|low",
  "newSeat": null or { "title": "...", "practiceArea": "...", "band": "..." },
  "candidates": [
    {
      "name": "Full Name",
      "linkedinUrl": "https://linkedin.com/in/... or null",
      "currentTitle": "Their title or null",
      "currentCompany": "Their company or null",
      "location": "City, State or null",
      "notes": "Any contextual notes from the email or null",
      "existingCandidateId": "id if matched or null",
      "action": "create or update"
    }
  ],
  "summary": "Brief description of what was parsed"
}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errBody);

      if (anthropicRes.status === 401) {
        return res.status(500).json({ error: 'Invalid Anthropic API key' });
      }
      if (anthropicRes.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded — try again shortly' });
      }
      return res.status(500).json({ error: `Anthropic API returned ${anthropicRes.status}` });
    }

    const anthropicData = await anthropicRes.json();

    // Extract the text content from the response
    const textBlock = anthropicData.content?.find(
      (block: { type: string }) => block.type === 'text'
    );
    if (!textBlock?.text) {
      return res.status(500).json({ error: 'No text response from Anthropic API' });
    }

    // Parse the JSON response — strip any markdown code fences just in case
    let rawJson = textBlock.text.trim();
    if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let result: ParseResult;
    try {
      result = JSON.parse(rawJson);
    } catch (parseErr) {
      console.error('Failed to parse Claude response as JSON:', parseErr, rawJson);
      return res.status(500).json({
        error: 'Failed to parse AI response. The email may be too complex or ambiguous.',
        raw: rawJson.slice(0, 500),
      });
    }

    // Validate required fields
    if (!result.candidates) {
      result.candidates = [];
    }
    if (!result.summary) {
      result.summary = `Parsed ${result.candidates.length} candidate(s)`;
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Email ingest failed:', err);
    return res.status(500).json({ error: 'Failed to process email. Please try again.' });
  }
}
