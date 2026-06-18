import { isParsedProfile } from '../types/parsedDocuments';
import { normalizeSearchLocation } from './searchLocation';

export interface CvSearchDefaults {
  query: string;
  location: string;
}

export function deriveSearchFromCv(parsedCV: unknown): CvSearchDefaults {
  if (!isParsedProfile(parsedCV)) {
    return { query: 'software engineer', location: 'South Africa' };
  }

  const headline = parsedCV.headline?.trim();
  const latestTitle = parsedCV.experience[0]?.title?.trim();
  const query = headline || latestTitle || parsedCV.skills[0] || 'software engineer';
  const location = normalizeSearchLocation(parsedCV.location?.trim() || 'South Africa');

  return { query, location };
}
