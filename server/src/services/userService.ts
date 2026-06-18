import { User } from '../models/User';
import { ParsedProfile } from '../types/parsedDocuments';
import { deriveSearchFromCv } from '../utils/cvSearchDefaults';
import { JobScrapeSource, DatePostedFilter } from '../types/scrapeOptions';
import { DEFAULT_SEARCH_REGION_IDS } from '../utils/searchRegions';

export interface UserPreferencesUpdate {
  searchQuery?: string;
  searchLocation?: string;
  searchRegions?: string[];
  searchSource?: JobScrapeSource;
  datePosted?: DatePostedFilter;
  minMatchScore?: number;
}

export async function findUserByEmailWithPassword(email: string) {
  return User.findOne({ email: email.toLowerCase().trim() }).select('+password');
}

export async function findUserByIdSafe(userId: string) {
  return User.findById(userId).select('-password');
}

export function userHasCv(user: { parsedCV?: unknown } | null): boolean {
  return Boolean(user?.parsedCV && typeof user.parsedCV === 'object');
}

export async function saveUserCv(
  userId: string,
  parsedProfile: ParsedProfile,
  fileMeta?: { originalFileName?: string; format?: string }
) {
  const searchDefaults = deriveSearchFromCv(parsedProfile);

  return User.findByIdAndUpdate(
    userId,
    {
      parsedCV: parsedProfile,
      fullName: parsedProfile.name,
      cvMeta: {
        originalFileName: fileMeta?.originalFileName,
        format: fileMeta?.format || parsedProfile.parseMeta?.format,
        uploadedAt: new Date(),
        parser: parsedProfile.parseMeta?.parser,
      },
      preferences: {
        searchQuery: searchDefaults.query,
        searchLocation: searchDefaults.location,
        searchRegions: [...DEFAULT_SEARCH_REGION_IDS],
        searchSource: 'both',
        datePosted: 'week',
      },
    },
    { new: true }
  ).select('-password');
}

export async function updateUserPreferences(userId: string, prefs: UserPreferencesUpdate) {
  const user = await User.findById(userId);
  if (!user) return null;

  const current = user.preferences
    ? JSON.parse(JSON.stringify(user.preferences))
    : {};
  user.preferences = { ...current, ...prefs };
  user.markModified('preferences');
  await user.save();
  return User.findById(userId).select('-password');
}

export async function recordUserLogin(userId: string) {
  await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
}

export async function getUserParsedCv(userId: string): Promise<unknown> {
  const user = await User.findById(userId).select('parsedCV preferences');
  return user?.parsedCV;
}

export async function getUserSearchPreferences(userId: string) {
  const user = await User.findById(userId).select('parsedCV preferences');
  if (!user) return null;

  const fromCv = user.parsedCV ? deriveSearchFromCv(user.parsedCV) : null;
  const prefs = user.preferences || {};

  return {
    searchQuery: prefs.searchQuery || fromCv?.query || 'software engineer',
    searchLocation: prefs.searchLocation || fromCv?.location || 'South Africa',
    searchRegions:
      Array.isArray(prefs.searchRegions) && prefs.searchRegions.length
        ? prefs.searchRegions
        : [...DEFAULT_SEARCH_REGION_IDS],
    searchSource: prefs.searchSource || 'both',
    datePosted: prefs.datePosted || 'week',
    minMatchScore: prefs.minMatchScore ?? 0,
  };
}
