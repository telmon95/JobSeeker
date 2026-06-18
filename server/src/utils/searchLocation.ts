import { matchRegionFromLocation } from './searchRegions';

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
  'stellenbosch',
  'soweto',
  'randburg',
  'rosebank',
  'menlyn',
  'hatfield',
  'arcadia',
]);

const KNOWN_COUNTRIES = [
  'South Africa',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Germany',
  'Netherlands',
  'Ireland',
  'Singapore',
  'India',
  'United Arab Emirates',
  'Remote',
];

/**
 * SerpAPI Google Jobs only accepts supported city/region strings.
 * CV suburbs like "Arcadia, Pretoria" must be normalized to "Pretoria, South Africa".
 * International locations are preserved when a country is already present.
 */
export function normalizeSearchLocation(location: string): string {
  const raw = location.trim();
  if (!raw) return 'South Africa';

  const lower = raw.toLowerCase();
  if (lower === 'remote' || lower.includes('remote')) return 'Remote';

  const matched = matchRegionFromLocation(raw);
  if (matched && matched.id !== 'za') {
    return matched.location;
  }

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
    const partLower = part.toLowerCase();
    if (SA_CITIES.has(partLower) && partLower !== 'arcadia') {
      return `${part}, South Africa`;
    }
  }

  const hasKnownCountry = KNOWN_COUNTRIES.some((c) => lower.includes(c.toLowerCase()));
  if (hasKnownCountry) return raw;

  if (parts.length >= 2) {
    const mainCity = parts[parts.length - 1];
    return `${mainCity}, South Africa`;
  }

  if (!raw.toLowerCase().includes('south africa')) {
    return `${raw}, South Africa`;
  }

  return raw;
}

/** Adzuna `where` works best with a single city name. */
export function adzunaWhereClause(location: string): string {
  const normalized = normalizeSearchLocation(location);
  if (normalized.toLowerCase() === 'remote') return '';
  return normalized.split(',')[0]?.trim() || 'South Africa';
}
