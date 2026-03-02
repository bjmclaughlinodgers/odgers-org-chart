export function computeTenure(startDate: string): { years: number; months: number; display: string } {
  const start = new Date(startDate);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < start.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (parts.length === 0) parts.push('<1m');

  return { years, months, display: parts.join(' ') };
}

export function getAnniversaryDate(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const thisYear = now.getFullYear();

  const anniversary = new Date(thisYear, start.getMonth(), start.getDate());
  if (anniversary < now) {
    anniversary.setFullYear(thisYear + 1);
  }

  return anniversary.toISOString().split('T')[0];
}

export function getMilestoneYear(startDate: string): number | null {
  const { years } = computeTenure(startDate);
  const milestones = [1, 3, 5, 10, 15, 20, 25, 30];
  // Check if the next anniversary is a milestone
  const nextYear = years + 1;
  return milestones.includes(nextYear) ? nextYear : null;
}

export function isUpcomingBirthday(birthday: string | null, daysAhead: number = 30): boolean {
  if (!birthday) return false;
  const [month, day] = birthday.split('-').map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();

  const bday = new Date(thisYear, month - 1, day);
  if (bday < now) {
    bday.setFullYear(thisYear + 1);
  }

  const diffMs = bday.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= daysAhead;
}

export function isUpcomingAnniversary(startDate: string, daysAhead: number = 30): boolean {
  const anniversaryStr = getAnniversaryDate(startDate);
  const anniversary = new Date(anniversaryStr);
  const now = new Date();

  const diffMs = anniversary.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= daysAhead;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatBirthday(birthday: string | null): string {
  if (!birthday) return '—';
  const [month, day] = birthday.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}`;
}
