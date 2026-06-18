import { SearchRun } from '../models/SearchRun';
import { ScrapeJobsResult } from '../types/scrapeOptions';

export async function recordSearchRun(
  userId: string,
  result: ScrapeJobsResult,
  isPipeline: boolean
): Promise<void> {
  await SearchRun.create({
    user: userId,
    source: result.source,
    query: result.query,
    location: result.location,
    datePosted: result.datePosted,
    found: result.found,
    saved: result.saved,
    isPipeline,
  });
}
