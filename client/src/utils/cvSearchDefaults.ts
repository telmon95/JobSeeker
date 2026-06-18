export interface CvSearchDefaults {
  query: string;
  location: string;
}

const SA_CITIES = new Set([
  'pretoria',
  'johannesburg',
  'cape town',
  'durban',
  'sandton',
  'centurion',
  'midrand',
  'gqeberha',
  'port elizabeth',
  'bloemfontein',
]);

export function normalizeSearchLocation(location: string): string {
  const raw = location.trim();
  if (!raw) return 'South Africa';

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const lowerParts = parts.map((p) => p.toLowerCase());

  if (lowerParts.includes('south africa') || lowerParts.includes('za')) {
    const withoutCountry = parts.filter(
      (p) => !['south africa', 'za', 'gauteng', 'western cape', 'kwazulu-natal', 'kzn'].includes(p.toLowerCase())
    );
    const city = withoutCountry[withoutCountry.length - 1] || parts[0];
    return `${city}, South Africa`;
  }

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (SA_CITIES.has(part.toLowerCase())) {
      return `${part}, South Africa`;
    }
  }

  if (parts.length >= 2) {
    return `${parts[parts.length - 1]}, South Africa`;
  }

  if (!raw.toLowerCase().includes('south africa')) {
    return `${raw}, South Africa`;
  }

  return raw;
}

export function deriveSearchFromCv(parsedCV: unknown): CvSearchDefaults {
  if (!parsedCV || typeof parsedCV !== 'object') {
    return { query: 'software engineer', location: 'South Africa' };
  }

  const cv = parsedCV as Record<string, unknown>;
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const skills = Array.isArray(cv.skills) ? cv.skills : [];

  const headline = typeof cv.headline === 'string' ? cv.headline.trim() : '';
  const latestTitle =
    experience[0] && typeof experience[0] === 'object'
      ? String((experience[0] as { title?: string }).title || '').trim()
      : '';
  const query = headline || latestTitle || String(skills[0] || 'software engineer');

  const loc = typeof cv.location === 'string' ? cv.location.trim() : '';
  const location = normalizeSearchLocation(loc || 'South Africa');

  return { query, location };
}

export function hasParsedCv(user: { parsedCV?: unknown } | null): boolean {
  if (!user?.parsedCV || typeof user.parsedCV !== 'object') return false;
  const cv = user.parsedCV as Record<string, unknown>;
  return typeof cv.name === 'string' && Array.isArray(cv.skills);
}
