export interface SearchRegionOption {
  id: string;
  label: string;
}

export const DEFAULT_SEARCH_REGION_IDS = ['za', 'remote', 'gb', 'us'] as const;

export const LOCATION_FILTER_OPTIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'All locations' },
  { id: 'za', label: 'South Africa' },
  { id: 'remote', label: 'Remote' },
  { id: 'gb', label: 'UK' },
  { id: 'us', label: 'US' },
  { id: 'ca', label: 'Canada' },
  { id: 'au', label: 'Australia' },
  { id: 'de', label: 'Germany' },
  { id: 'nl', label: 'Netherlands' },
  { id: 'ie', label: 'Ireland' },
  { id: 'sg', label: 'Singapore' },
  { id: 'in', label: 'India' },
  { id: 'other', label: 'Other' },
];

export function inferJobLocationBucket(location?: string): string {
  const loc = (location || '').trim();
  if (!loc) return 'other';
  if (/\bremote\b|\bwork from home\b|\bwfh\b|\banywhere\b|\bworldwide\b/i.test(loc)) {
    return 'remote';
  }

  const matchers: Array<{ pattern: RegExp; id: string }> = [
    { pattern: /\bsouth africa\b|\bza\b|\bgauteng\b|\bpretoria\b|\bjohannesburg\b|\bcape town\b|\bdurban\b/, id: 'za' },
    { pattern: /\bunited kingdom\b|\buk\b|\blondon\b|\bengland\b|\bscotland\b|\bwales\b/, id: 'gb' },
    { pattern: /\bunited states\b|\busa\b|\b u\.s\.|\bcalifornia\b|\btexas\b|\bnew york\b/, id: 'us' },
    { pattern: /\bcanada\b|\bontario\b|\btoronto\b|\bvancouver\b/, id: 'ca' },
    { pattern: /\baustralia\b|\bsydney\b|\bmelbourne\b/, id: 'au' },
    { pattern: /\bgermany\b|\bberlin\b|\bmunich\b/, id: 'de' },
    { pattern: /\bnetherlands\b|\bamsterdam\b/, id: 'nl' },
    { pattern: /\bireland\b|\bdublin\b/, id: 'ie' },
    { pattern: /\bsingapore\b/, id: 'sg' },
    { pattern: /\bindia\b|\bbangalore\b|\bmumbai\b/, id: 'in' },
  ];

  for (const { pattern, id } of matchers) {
    if (pattern.test(loc.toLowerCase())) return id;
  }

  return 'other';
}

export function jobMatchesLocationFilter(location: string | undefined, filterId: string): boolean {
  if (filterId === 'all') return true;
  return inferJobLocationBucket(location) === filterId;
}
