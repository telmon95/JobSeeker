export interface SearchRegion {
  id: string;
  label: string;
  location: string;
  adzunaCountry: string;
  googleGl: string;
  googleDomain: string;
  /** When true, append "remote" to the query for broader worldwide listings. */
  remote?: boolean;
}

export const SEARCH_REGIONS: SearchRegion[] = [
  {
    id: 'za',
    label: 'South Africa',
    location: 'South Africa',
    adzunaCountry: 'za',
    googleGl: 'za',
    googleDomain: 'google.co.za',
  },
  {
    id: 'za-pretoria',
    label: 'Pretoria',
    location: 'Pretoria, South Africa',
    adzunaCountry: 'za',
    googleGl: 'za',
    googleDomain: 'google.co.za',
  },
  {
    id: 'za-jhb',
    label: 'Johannesburg',
    location: 'Johannesburg, South Africa',
    adzunaCountry: 'za',
    googleGl: 'za',
    googleDomain: 'google.co.za',
  },
  {
    id: 'za-cpt',
    label: 'Cape Town',
    location: 'Cape Town, South Africa',
    adzunaCountry: 'za',
    googleGl: 'za',
    googleDomain: 'google.co.za',
  },
  {
    id: 'remote',
    label: 'Remote (worldwide)',
    location: 'Remote',
    adzunaCountry: 'us',
    googleGl: 'us',
    googleDomain: 'google.com',
    remote: true,
  },
  {
    id: 'gb',
    label: 'United Kingdom',
    location: 'United Kingdom',
    adzunaCountry: 'gb',
    googleGl: 'uk',
    googleDomain: 'google.co.uk',
  },
  {
    id: 'gb-london',
    label: 'London',
    location: 'London, United Kingdom',
    adzunaCountry: 'gb',
    googleGl: 'uk',
    googleDomain: 'google.co.uk',
  },
  {
    id: 'us',
    label: 'United States',
    location: 'United States',
    adzunaCountry: 'us',
    googleGl: 'us',
    googleDomain: 'google.com',
  },
  {
    id: 'ca',
    label: 'Canada',
    location: 'Canada',
    adzunaCountry: 'ca',
    googleGl: 'ca',
    googleDomain: 'google.ca',
  },
  {
    id: 'au',
    label: 'Australia',
    location: 'Australia',
    adzunaCountry: 'au',
    googleGl: 'au',
    googleDomain: 'google.com.au',
  },
  {
    id: 'de',
    label: 'Germany',
    location: 'Germany',
    adzunaCountry: 'de',
    googleGl: 'de',
    googleDomain: 'google.de',
  },
  {
    id: 'nl',
    label: 'Netherlands',
    location: 'Netherlands',
    adzunaCountry: 'nl',
    googleGl: 'nl',
    googleDomain: 'google.nl',
  },
  {
    id: 'ie',
    label: 'Ireland',
    location: 'Ireland',
    adzunaCountry: 'gb',
    googleGl: 'ie',
    googleDomain: 'google.ie',
  },
  {
    id: 'sg',
    label: 'Singapore',
    location: 'Singapore',
    adzunaCountry: 'sg',
    googleGl: 'sg',
    googleDomain: 'google.com.sg',
  },
  {
    id: 'in',
    label: 'India',
    location: 'India',
    adzunaCountry: 'in',
    googleGl: 'in',
    googleDomain: 'google.co.in',
  },
];

export const DEFAULT_SEARCH_REGION_IDS = ['za', 'remote', 'gb', 'us'] as const;

const REGION_BY_ID = new Map(SEARCH_REGIONS.map((r) => [r.id, r]));

export function getSearchRegion(id: string): SearchRegion | undefined {
  return REGION_BY_ID.get(id);
}

export function resolveSearchRegions(
  regionIds?: string[],
  fallbackLocation?: string
): SearchRegion[] {
  if (regionIds?.length) {
    const resolved = regionIds
      .map((id) => getSearchRegion(id))
      .filter((r): r is SearchRegion => Boolean(r));
    if (resolved.length) return resolved;
  }

  if (fallbackLocation) {
    const match = matchRegionFromLocation(fallbackLocation);
    if (match) return [match];
  }

  return DEFAULT_SEARCH_REGION_IDS.map((id) => getSearchRegion(id)!);
}

export function matchRegionFromLocation(location: string): SearchRegion | undefined {
  const lower = location.toLowerCase().trim();
  if (!lower) return getSearchRegion('za');

  if (/\bremote\b|\bwork from home\b|\bwfh\b/.test(lower)) {
    return getSearchRegion('remote');
  }

  const direct = SEARCH_REGIONS.find(
    (r) => r.location.toLowerCase() === lower || r.label.toLowerCase() === lower
  );
  if (direct) return direct;

  const countryMatchers: Array<{ pattern: RegExp; id: string }> = [
    { pattern: /\bsouth africa\b|\bza\b|\bgauteng\b|\bpretoria\b|\bjohannesburg\b|\bcape town\b|\bdurban\b/, id: 'za' },
    { pattern: /\bunited kingdom\b|\buk\b|\blondon\b|\bengland\b|\bscotland\b|\bwales\b/, id: 'gb' },
    { pattern: /\bunited states\b|\busa\b|\b u\.s\.|\bcalifornia\b|\btexas\b|\bnew york\b/, id: 'us' },
    { pattern: /\bcanada\b|\bontario\b|\btoronto\b|\bvancouver\b/, id: 'ca' },
    { pattern: /\baustralia\b|\bsydney\b|\bmelbourne\b/, id: 'au' },
    { pattern: /\bgermany\b|\bberlin\b|\bmunich\b|\bfrankfurt\b/, id: 'de' },
    { pattern: /\bnetherlands\b|\bamsterdam\b|\bholland\b/, id: 'nl' },
    { pattern: /\bireland\b|\bdublin\b/, id: 'ie' },
    { pattern: /\bsingapore\b/, id: 'sg' },
    { pattern: /\bindia\b|\bbangalore\b|\bmumbai\b|\bdelhi\b/, id: 'in' },
  ];

  for (const { pattern, id } of countryMatchers) {
    if (pattern.test(lower)) return getSearchRegion(id);
  }

  return undefined;
}

/** Bucket a job listing location string for dashboard filters. */
export function inferJobLocationBucket(location?: string): string {
  const loc = (location || '').trim();
  if (!loc) return 'other';
  if (/\bremote\b|\bwork from home\b|\bwfh\b|\banywhere\b|\bworldwide\b/i.test(loc)) {
    return 'remote';
  }
  const region = matchRegionFromLocation(loc);
  if (region) return region.id.startsWith('za') ? 'za' : region.id.split('-')[0];
  return 'other';
}
