import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function — RocketReach LinkedIn Lookup
 *
 * POST /api/rocketreach-lookup
 * Body: { linkedinUrl: string }
 *
 * Returns: { name, currentTitle, currentCompany, location, linkedinUrl }
 */

interface RocketReachProfile {
  id: number;
  status: string;
  name: string;
  first_name: string;
  last_name: string;
  current_title: string;
  current_employer: string;
  city: string;
  region: string;
  country_code: string;
  linkedin_url: string;
  profile_pic: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ROCKETREACH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RocketReach API key not configured' });
  }

  const { linkedinUrl } = req.body ?? {};
  if (!linkedinUrl || typeof linkedinUrl !== 'string') {
    return res.status(400).json({ error: 'linkedinUrl is required' });
  }

  // Validate it looks like a LinkedIn URL
  const cleaned = linkedinUrl.trim().replace(/\/$/, '');
  if (!cleaned.includes('linkedin.com/in/')) {
    return res.status(400).json({ error: 'Invalid LinkedIn profile URL' });
  }

  try {
    const rrRes = await fetch(
      `https://api.rocketreach.co/api/v2/person/lookup?linkedin_url=${encodeURIComponent(cleaned)}`,
      {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!rrRes.ok) {
      const errBody = await rrRes.text();
      console.error('RocketReach error:', rrRes.status, errBody);
      return res.status(rrRes.status).json({
        error: rrRes.status === 401
          ? 'Invalid RocketReach API key'
          : rrRes.status === 429
            ? 'Rate limit exceeded — try again shortly'
            : `RocketReach returned ${rrRes.status}`,
      });
    }

    const profile: RocketReachProfile = await rrRes.json();

    // RocketReach may return status: "progress" / "searching" if still resolving
    if (profile.status === 'progress' || profile.status === 'searching') {
      return res.status(202).json({
        error: 'Profile lookup is still processing. Try again in a few seconds.',
        retryable: true,
      });
    }

    // Build a clean response with only what we need
    const location = [profile.city, profile.region, profile.country_code]
      .filter(Boolean)
      .join(', ');

    return res.status(200).json({
      name: profile.name ?? '',
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      currentTitle: profile.current_title ?? '',
      currentCompany: profile.current_employer ?? '',
      location: location || undefined,
      linkedinUrl: profile.linkedin_url ?? cleaned,
      profilePic: profile.profile_pic ?? undefined,
    });
  } catch (err) {
    console.error('RocketReach lookup failed:', err);
    return res.status(500).json({ error: 'Failed to reach RocketReach API' });
  }
}
