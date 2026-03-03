import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Person } from '../types/person';
import type { TemplateColumn, ParsedRow, ValidationError, ImportResult } from '../types/import';
import { BAND_ORDER, DEFAULT_PRACTICE_AREAS } from '../types/enums';

// Valid enum values for strict validation
const VALID_OFFICES = ['New York', 'Washington DC', 'Boston', 'Austin', 'Atlanta', 'Remote'];
const VALID_PERFORMANCE = ['Star Performer', 'Performer', 'Performance Improvement'];
const VALID_RISK = ['Low', 'Watch', 'Elevated', 'Critical'];
const VALID_STATUS = ['Active', 'On Leave', 'Notice Period', 'Open Seat', 'Terminated'];
const VALID_EMPLOYMENT = ['Full-Time', 'Part-Time', 'Contract'];
const VALID_COMPENSATION = ['Base + Bonus', 'Base + Commission', 'Base Only'];

export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: 'id', header: 'ID', required: false, type: 'string' },
  { key: 'firstName', header: 'First Name', required: true, type: 'string' },
  { key: 'lastName', header: 'Last Name', required: true, type: 'string' },
  { key: 'preferredName', header: 'Preferred Name', required: false, type: 'string' },
  { key: 'title', header: 'Title', required: true, type: 'string' },
  { key: 'band', header: 'Band', required: false, type: 'string', enumValues: BAND_ORDER as string[] },
  { key: 'practiceArea', header: 'Practice Area', required: false, type: 'string' },
  { key: 'office', header: 'Office', required: false, type: 'string', enumValues: VALID_OFFICES },
  { key: 'employmentType', header: 'Employment Type', required: false, type: 'string', enumValues: VALID_EMPLOYMENT },
  { key: 'status', header: 'Status', required: false, type: 'string', enumValues: VALID_STATUS },
  { key: 'performanceRating', header: 'Performance Rating', required: false, type: 'string', enumValues: VALID_PERFORMANCE },
  { key: 'retentionRisk', header: 'Retention Risk', required: false, type: 'string', enumValues: VALID_RISK },
  { key: 'isRevenueProducer', header: 'Is Revenue Producer', required: false, type: 'boolean' },
  { key: 'currentYearOCE', header: 'YTD OCE', required: false, type: 'number' },
  { key: 'priorYearOCE', header: 'Prior Year OCE', required: false, type: 'number' },
  { key: 'revenueTarget', header: 'Revenue Target', required: false, type: 'number' },
  { key: 'pipelineValue', header: 'Pipeline Value', required: false, type: 'number' },
  { key: 'startDate', header: 'Start Date', required: false, type: 'date' },
  { key: 'baseSalary', header: 'Base Salary', required: false, type: 'number' },
  { key: 'totalOTE', header: 'Total OTE', required: false, type: 'number' },
  { key: 'compensationType', header: 'Compensation Type', required: false, type: 'string', enumValues: VALID_COMPENSATION },
  { key: 'photoUrl', header: 'Photo URL', required: false, type: 'string' },
  { key: 'skillsTags', header: 'Skills Tags', required: false, type: 'tags' },
  { key: 'needsTags', header: 'Needs Tags', required: false, type: 'tags' },
  { key: 'performanceNotes', header: 'Performance Notes', required: false, type: 'string' },
  { key: 'retentionNotes', header: 'Retention Notes', required: false, type: 'string' },
  { key: 'adminNotes', header: 'Admin Notes', required: false, type: 'string' },
];

// ---------------------------------------------------------------------------
// Template generation & download
// ---------------------------------------------------------------------------

export function generateTemplateCsv(people?: Person[]): string {
  const headers = TEMPLATE_COLUMNS.map(c => c.header);

  if (!people || people.length === 0) {
    return headers.join(',') + '\n';
  }

  const rows = people.map(person => {
    return TEMPLATE_COLUMNS.map(col => {
      const val = (person as unknown as Record<string, unknown>)[col.key];
      if (val === null || val === undefined) return '';
      if (col.type === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (col.type === 'tags') return Array.isArray(val) ? val.join(';') : '';
      const str = String(val);
      // CSV escape: quote if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadTemplate(people?: Person[]): void {
  const csv = generateTemplateCsv(people);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = people && people.length > 0 ? 'odgers-org-data.csv' : 'odgers-org-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------------------------------------------------------------------------
// CSV escape helper
// ---------------------------------------------------------------------------

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Open Seats template
// ---------------------------------------------------------------------------

export const OPEN_SEAT_COLUMNS: TemplateColumn[] = [
  { key: 'id', header: 'ID', required: false, type: 'string' },
  { key: 'title', header: 'Role Title', required: true, type: 'string' },
  { key: 'band', header: 'Band', required: false, type: 'string', enumValues: BAND_ORDER as string[] },
  { key: 'practiceArea', header: 'Practice Area', required: true, type: 'string' },
  { key: 'office', header: 'Office', required: false, type: 'string', enumValues: VALID_OFFICES },
  { key: 'hiringPriority', header: 'Priority', required: false, type: 'string', enumValues: ['Critical', 'High', 'Medium', 'Low'] },
  { key: 'recruitingStatus', header: 'Recruiting Status', required: false, type: 'string', enumValues: ['Not Started', 'Sourcing', 'Screening', 'Interviewing', 'Offer', 'Closed'] },
  { key: 'recruiterType', header: 'Recruiter Type', required: false, type: 'string', enumValues: ['Internal', 'Retained Search', 'Contingency', 'Direct Sourcing'] },
  { key: 'recruiterName', header: 'Recruiter / Firm', required: false, type: 'string' },
  { key: 'targetStartDate', header: 'Target Start Date', required: false, type: 'date' },
  { key: 'budgetedCompensation', header: 'Budgeted Compensation', required: false, type: 'string' },
  { key: 'recruitingFeeStructure', header: 'Fee Structure', required: false, type: 'string' },
  { key: 'recruitingSpendActual', header: 'Actual Spend', required: false, type: 'number' },
  { key: 'recruitingSpendCommitted', header: 'Committed Spend', required: false, type: 'number' },
  { key: 'recruitingSpendProjected', header: 'Projected Spend', required: false, type: 'number' },
  { key: 'reportsTo', header: 'Reports To (ID)', required: false, type: 'string' },
  { key: 'jobSpec', header: 'Job Specification', required: false, type: 'string' },
  { key: 'recruitingNotes', header: 'Recruiting Notes', required: false, type: 'string' },
];

export function downloadOpenSeatsTemplate(people?: Person[]): void {
  const headers = OPEN_SEAT_COLUMNS.map(c => c.header);
  const openSeats = people?.filter(p => p.status === 'Open Seat') ?? [];

  const rows = openSeats.map(seat =>
    OPEN_SEAT_COLUMNS.map(col => csvEscape((seat as unknown as Record<string, unknown>)[col.key])).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = openSeats.length > 0 ? 'odgers-open-seats.csv' : 'odgers-open-seats-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------------------------------------------------------------------------
// Candidates template
// ---------------------------------------------------------------------------

export const CANDIDATE_COLUMNS: TemplateColumn[] = [
  { key: 'seatId', header: 'Seat ID', required: true, type: 'string' },
  { key: 'seatTitle', header: 'Seat Title (reference)', required: false, type: 'string' },
  { key: 'candidateName', header: 'Candidate Name', required: true, type: 'string' },
  { key: 'currentTitle', header: 'Current Title', required: false, type: 'string' },
  { key: 'currentCompany', header: 'Current Company', required: false, type: 'string' },
  { key: 'location', header: 'Location', required: false, type: 'string' },
  { key: 'stage', header: 'Stage', required: false, type: 'string', enumValues: ['Identified', 'Screening', 'First Interview', 'Final Interview', 'Offer Extended', 'Offer Accepted', 'Placed', 'Declined', 'Withdrawn'] },
  { key: 'source', header: 'Source', required: false, type: 'string' },
  { key: 'isFinalist', header: 'Finalist', required: false, type: 'boolean' },
  { key: 'linkedinUrl', header: 'LinkedIn URL', required: false, type: 'string' },
  { key: 'notes', header: 'Notes', required: false, type: 'string' },
];

export function downloadCandidatesTemplate(people?: Person[]): void {
  const headers = CANDIDATE_COLUMNS.map(c => c.header);
  const openSeats = people?.filter(p => p.status === 'Open Seat') ?? [];

  const allRows: string[] = [];
  for (const seat of openSeats) {
    if ((seat.candidates?.length ?? 0) > 0) {
      for (const c of seat.candidates!) {
        allRows.push([
          csvEscape(seat.id), csvEscape(seat.title), csvEscape(c.name),
          csvEscape(c.currentTitle), csvEscape(c.currentCompany), csvEscape(c.location),
          csvEscape(c.stage), csvEscape(c.source), c.isFinalist ? 'TRUE' : 'FALSE',
          csvEscape(c.linkedinUrl), csvEscape(c.notes),
        ].join(','));
      }
    } else {
      // Include seat reference row with blank candidate fields
      allRows.push([
        csvEscape(seat.id), csvEscape(seat.title), '', '', '', '',
        'Identified', '', 'FALSE', '', '',
      ].join(','));
    }
  }

  const csv = [headers.join(','), ...allRows].join('\n');
  const hasCandidates = openSeats.some(s => (s.candidates?.length ?? 0) > 0);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = hasCandidates ? 'odgers-candidates.csv' : 'odgers-candidates-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------------------------------------------------------------------------
// File parsing (CSV & Excel)
// ---------------------------------------------------------------------------

export function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: '' });
          // Convert all values to strings for consistency
          const stringRows = rows.map(row => {
            const stringRow: ParsedRow = {};
            Object.entries(row).forEach(([key, val]) => {
              stringRow[key] = val === null || val === undefined ? '' : String(val);
            });
            return stringRow;
          });
          resolve(stringRows);
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + (err as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // CSV
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<ParsedRow>) => {
        resolve(results.data);
      },
      error: (err: Error) => {
        reject(new Error('Failed to parse CSV: ' + err.message));
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Value parsing helpers
// ---------------------------------------------------------------------------

function parseNumber(val: string): number | null {
  if (!val || val.trim() === '') return null;
  // Strip currency symbols and commas
  const cleaned = val.replace(/[$,\s]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function parseBoolean(val: string): boolean | null {
  if (!val || val.trim() === '') return null;
  const lower = val.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(lower)) return true;
  if (['false', '0', 'no', 'n'].includes(lower)) return false;
  return null;
}

function parseTags(val: string): string[] {
  if (!val || val.trim() === '') return [];
  return val.split(';').map(t => t.trim()).filter(Boolean);
}

function isValidDate(val: string): boolean {
  if (!val || val.trim() === '') return true; // empty is ok
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

function mapHeaderToKey(header: string): string | null {
  // First try exact match with template column headers
  const col = TEMPLATE_COLUMNS.find(c => c.header.toLowerCase() === header.trim().toLowerCase());
  if (col) return col.key;
  // Also try matching by key directly
  const byKey = TEMPLATE_COLUMNS.find(c => c.key.toLowerCase() === header.trim().toLowerCase());
  if (byKey) return byKey.key;
  return null;
}

// ---------------------------------------------------------------------------
// Validation & processing
// ---------------------------------------------------------------------------

export function validateAndProcessRows(rows: ParsedRow[], existingPeople: Person[]): ImportResult {
  const result: ImportResult = { toAdd: [], toUpdate: [], errors: [], warnings: [], totalParsed: rows.length };
  const existingById = new Map(existingPeople.map(p => [p.id, p]));

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2; // +2 for 1-indexed and header row
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Map headers to keys
    const mapped: Record<string, string> = {};
    Object.entries(row).forEach(([header, val]) => {
      const key = mapHeaderToKey(header);
      if (key) mapped[key] = String(val || '');
    });

    // Required field validation
    if (!mapped.firstName?.trim()) errors.push({ field: 'firstName', message: 'First Name is required' });
    if (!mapped.lastName?.trim()) errors.push({ field: 'lastName', message: 'Last Name is required' });
    if (!mapped.title?.trim()) errors.push({ field: 'title', message: 'Title is required' });

    // Enum validation (strict)
    if (mapped.office && mapped.office.trim() && !VALID_OFFICES.includes(mapped.office.trim())) {
      errors.push({ field: 'office', message: `Office must be one of: ${VALID_OFFICES.join(', ')}` });
    }
    if (mapped.performanceRating && mapped.performanceRating.trim() && !VALID_PERFORMANCE.includes(mapped.performanceRating.trim())) {
      errors.push({ field: 'performanceRating', message: `Performance Rating must be one of: ${VALID_PERFORMANCE.join(', ')}` });
    }
    if (mapped.retentionRisk && mapped.retentionRisk.trim() && !VALID_RISK.includes(mapped.retentionRisk.trim())) {
      errors.push({ field: 'retentionRisk', message: `Retention Risk must be one of: ${VALID_RISK.join(', ')}` });
    }
    if (mapped.status && mapped.status.trim() && !VALID_STATUS.includes(mapped.status.trim())) {
      errors.push({ field: 'status', message: `Status must be one of: ${VALID_STATUS.join(', ')}` });
    }
    if (mapped.employmentType && mapped.employmentType.trim() && !VALID_EMPLOYMENT.includes(mapped.employmentType.trim())) {
      errors.push({ field: 'employmentType', message: `Employment Type must be one of: ${VALID_EMPLOYMENT.join(', ')}` });
    }
    if (mapped.compensationType && mapped.compensationType.trim() && !VALID_COMPENSATION.includes(mapped.compensationType.trim())) {
      errors.push({ field: 'compensationType', message: `Compensation Type must be one of: ${VALID_COMPENSATION.join(', ')}` });
    }

    // Enum validation (warn only for extensible)
    if (mapped.band && mapped.band.trim() && !(BAND_ORDER as string[]).includes(mapped.band.trim())) {
      warnings.push(`Band "${mapped.band.trim()}" is not standard but will be accepted`);
    }
    if (mapped.practiceArea && mapped.practiceArea.trim() && !DEFAULT_PRACTICE_AREAS.includes(mapped.practiceArea.trim()) && mapped.practiceArea.trim() !== 'Central') {
      warnings.push(`Practice Area "${mapped.practiceArea.trim()}" is not standard and will be added`);
    }

    // Number field validation
    (['currentYearOCE', 'priorYearOCE', 'revenueTarget', 'pipelineValue', 'baseSalary', 'totalOTE'] as const).forEach(field => {
      if (mapped[field] && mapped[field].trim()) {
        const num = parseNumber(mapped[field]);
        if (num === null && mapped[field].trim() !== '') {
          errors.push({ field, message: `${field} must be a valid number` });
        }
      }
    });

    // Boolean validation
    if (mapped.isRevenueProducer && mapped.isRevenueProducer.trim()) {
      const bool = parseBoolean(mapped.isRevenueProducer);
      if (bool === null) {
        errors.push({ field: 'isRevenueProducer', message: 'Is Revenue Producer must be TRUE or FALSE' });
      }
    }

    // Date validation
    if (mapped.startDate && !isValidDate(mapped.startDate)) {
      errors.push({ field: 'startDate', message: 'Start Date must be in YYYY-MM-DD format' });
    }

    if (errors.length > 0) {
      result.errors.push({ rowIndex, errors, warnings: [] });
      if (warnings.length > 0) result.warnings.push({ rowIndex, warnings, errors: [] });
      return;
    }

    if (warnings.length > 0) {
      result.warnings.push({ rowIndex, errors: [], warnings });
    }

    // Determine if UPDATE or ADD
    const existingId = mapped.id?.trim();
    const existingPerson = existingId ? existingById.get(existingId) : null;

    if (existingPerson) {
      // UPDATE -- compute only changed fields
      const updates: Partial<Person> = {};
      if (mapped.firstName?.trim() && mapped.firstName.trim() !== existingPerson.firstName) updates.firstName = mapped.firstName.trim();
      if (mapped.lastName?.trim() && mapped.lastName.trim() !== existingPerson.lastName) updates.lastName = mapped.lastName.trim();
      if (mapped.preferredName !== undefined) {
        const pn = mapped.preferredName.trim() || undefined;
        if (pn !== existingPerson.preferredName) updates.preferredName = pn;
      }
      if (mapped.title?.trim() && mapped.title.trim() !== existingPerson.title) updates.title = mapped.title.trim();
      if (mapped.band?.trim() && mapped.band.trim() !== existingPerson.band) updates.band = mapped.band.trim() as Person['band'];
      if (mapped.practiceArea?.trim() && mapped.practiceArea.trim() !== existingPerson.practiceArea) updates.practiceArea = mapped.practiceArea.trim();
      if (mapped.office?.trim() && mapped.office.trim() !== existingPerson.office) updates.office = mapped.office.trim() as Person['office'];
      if (mapped.employmentType?.trim() && mapped.employmentType.trim() !== existingPerson.employmentType) updates.employmentType = mapped.employmentType.trim() as Person['employmentType'];
      if (mapped.status?.trim() && mapped.status.trim() !== existingPerson.status) updates.status = mapped.status.trim() as Person['status'];
      if (mapped.performanceRating?.trim() && mapped.performanceRating.trim() !== existingPerson.performanceRating) updates.performanceRating = mapped.performanceRating.trim() as Person['performanceRating'];
      if (mapped.retentionRisk?.trim() && mapped.retentionRisk.trim() !== existingPerson.retentionRisk) updates.retentionRisk = mapped.retentionRisk.trim() as Person['retentionRisk'];
      if (mapped.compensationType?.trim() && mapped.compensationType.trim() !== existingPerson.compensationType) updates.compensationType = mapped.compensationType.trim() as Person['compensationType'];
      if (mapped.photoUrl !== undefined && mapped.photoUrl.trim() !== (existingPerson.photoUrl || '')) updates.photoUrl = mapped.photoUrl.trim() || undefined;

      // Boolean
      if (mapped.isRevenueProducer?.trim()) {
        const bv = parseBoolean(mapped.isRevenueProducer);
        if (bv !== null && bv !== existingPerson.isRevenueProducer) updates.isRevenueProducer = bv;
      }

      // Numbers
      const numFields = ['currentYearOCE', 'priorYearOCE', 'revenueTarget', 'pipelineValue', 'baseSalary', 'totalOTE'] as const;
      numFields.forEach(f => {
        if (mapped[f] !== undefined) {
          const nv = parseNumber(mapped[f]);
          if (nv !== existingPerson[f]) (updates as Record<string, unknown>)[f] = nv;
        }
      });

      // Date
      if (mapped.startDate?.trim() && mapped.startDate.trim() !== existingPerson.startDate) updates.startDate = mapped.startDate.trim();

      // Tags
      if (mapped.skillsTags !== undefined) {
        const tags = parseTags(mapped.skillsTags);
        if (JSON.stringify(tags) !== JSON.stringify(existingPerson.skillsTags)) updates.skillsTags = tags;
      }
      if (mapped.needsTags !== undefined) {
        const tags = parseTags(mapped.needsTags);
        if (JSON.stringify(tags) !== JSON.stringify(existingPerson.needsTags)) updates.needsTags = tags;
      }

      // Notes
      if (mapped.performanceNotes !== undefined && mapped.performanceNotes !== existingPerson.performanceNotes) updates.performanceNotes = mapped.performanceNotes;
      if (mapped.retentionNotes !== undefined && mapped.retentionNotes !== existingPerson.retentionNotes) updates.retentionNotes = mapped.retentionNotes;
      if (mapped.adminNotes !== undefined && mapped.adminNotes !== existingPerson.adminNotes) updates.adminNotes = mapped.adminNotes;

      if (Object.keys(updates).length > 0) {
        result.toUpdate.push({ id: existingId!, updates });
      }
    } else {
      // ADD -- create full Person object
      const newPerson: Person = {
        id: existingId || uuidv4(),
        firstName: mapped.firstName?.trim() || '',
        lastName: mapped.lastName?.trim() || '',
        preferredName: mapped.preferredName?.trim() || undefined,
        title: mapped.title?.trim() || '',
        band: (mapped.band?.trim() || 'Operations & Admin') as Person['band'],
        practiceArea: mapped.practiceArea?.trim() || 'Central',
        subPracticeSpecialties: [],
        office: (mapped.office?.trim() || 'New York') as Person['office'],
        employmentType: (mapped.employmentType?.trim() || 'Full-Time') as Person['employmentType'],
        status: (mapped.status?.trim() || 'Active') as Person['status'],
        photoUrl: mapped.photoUrl?.trim() || undefined,
        reportsTo: null,
        supportLines: [],
        practiceAreaLead: false,
        performanceRating: (mapped.performanceRating?.trim() || 'Performer') as Person['performanceRating'],
        retentionRisk: (mapped.retentionRisk?.trim() || 'Low') as Person['retentionRisk'],
        performanceNotes: mapped.performanceNotes || '',
        retentionNotes: mapped.retentionNotes || '',
        lastReviewDate: null,
        isRevenueProducer: parseBoolean(mapped.isRevenueProducer || '') ?? false,
        currentYearOCE: parseNumber(mapped.currentYearOCE || ''),
        priorYearOCE: parseNumber(mapped.priorYearOCE || ''),
        revenueTarget: parseNumber(mapped.revenueTarget || ''),
        pipelineValue: parseNumber(mapped.pipelineValue || ''),
        startDate: mapped.startDate?.trim() || new Date().toISOString().split('T')[0],
        lastPayIncreaseDate: null,
        lastPayIncreasePercent: null,
        birthday: null,
        compensationType: (mapped.compensationType?.trim() || 'Base + Bonus') as Person['compensationType'],
        baseSalary: parseNumber(mapped.baseSalary || ''),
        totalOTE: parseNumber(mapped.totalOTE || ''),
        employeeFileLink: null,
        skillsTags: parseTags(mapped.skillsTags || ''),
        needsTags: parseTags(mapped.needsTags || ''),
        supportRequirements: null,
        adminNotes: mapped.adminNotes || '',
        lastUpdated: new Date().toISOString(),
      };
      result.toAdd.push(newPerson);
    }
  });

  return result;
}
