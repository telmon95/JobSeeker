import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { scrapeJobs } from '../services/scrapingService';
import { isGoogleJobsConfigured } from '../services/googleJobsService';
import { enrichJobsForUser, enrichJobForUser } from '../services/jobEnrichmentService';
import { countWorkTypes, WORK_TYPE_OPTIONS } from '../utils/workType';
import { recordSearchRun } from '../services/searchRunService';
import { getDashboardStats } from '../services/statsService';
import {
  getUserParsedCv,
  getUserSearchPreferences,
  updateUserPreferences,
  userHasCv,
} from '../services/userService';
import { JobScrapeSource, DatePostedFilter } from '../types/scrapeOptions';
import { normalizeSearchLocation } from '../utils/searchLocation';
import { DEFAULT_SEARCH_REGION_IDS, SEARCH_REGIONS } from '../utils/searchRegions';

export const getJobs = async (req: AuthRequest, res: Response) => {
  try {
    const enriched = await enrichJobsForUser(req.user._id);
    res.status(200).json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error fetching jobs.', error: message });
  }
};

export const getJobById = async (req: AuthRequest, res: Response) => {
  try {
    const job = await enrichJobForUser(req.user._id, req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    res.status(200).json(job);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error fetching job.', error: message });
  }
};

export const getJobFilters = async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await enrichJobsForUser(req.user._id);
    const workTypeCounts = countWorkTypes(jobs);

    res.status(200).json({
      workTypes: WORK_TYPE_OPTIONS.map((opt) => ({
        id: opt.id,
        label: opt.label,
        count: workTypeCounts[opt.id],
      })).filter((w) => w.count > 0),
      totalJobs: jobs.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error fetching filters.', error: message });
  }
};

export const getScrapeConfig = async (_req: AuthRequest, res: Response) => {
  res.status(200).json({
    googleJobsAvailable: isGoogleJobsConfigured(),
    adzunaAvailable: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    defaultSource: isGoogleJobsConfigured() ? 'both' : 'adzuna',
    datePostedOptions: ['today', '3days', 'week', 'month'],
    defaultDatePosted: 'week',
    maxPages: parseInt(process.env.SCRAPE_MAX_PAGES || '3', 10) || 3,
    searchRegions: SEARCH_REGIONS.map(({ id, label }) => ({ id, label })),
    defaultSearchRegions: [...DEFAULT_SEARCH_REGION_IDS],
  });
};

async function resolveScrapeParams(userId: string, body: Record<string, unknown>) {
  const parsedCV = await getUserParsedCv(userId);
  const savedPrefs = await getUserSearchPreferences(userId);

  const locationRaw =
    typeof body.location === 'string' && body.location.trim()
      ? body.location.trim()
      : savedPrefs?.searchLocation || 'South Africa';

  const searchRegions = Array.isArray(body.searchRegions)
    ? (body.searchRegions as unknown[]).filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : savedPrefs?.searchRegions || [...DEFAULT_SEARCH_REGION_IDS];

  return {
    source:
      (body.source as JobScrapeSource) ||
      savedPrefs?.searchSource ||
      (isGoogleJobsConfigured() ? 'both' : 'adzuna'),
    query:
      typeof body.query === 'string' && body.query.trim()
        ? body.query.trim()
        : savedPrefs?.searchQuery || 'software engineer',
    location: normalizeSearchLocation(locationRaw),
    searchRegions,
    datePosted:
      (body.datePosted as DatePostedFilter) || savedPrefs?.datePosted || 'week',
    parsedCV,
  };
}

export const triggerScraping = async (req: AuthRequest, res: Response) => {
  try {
    const params = await resolveScrapeParams(req.user._id, req.body || {});

    console.log(`Scraping process initiated (${params.source}):`, params.query, params.location);
    const result = await scrapeJobs(params);
    await recordSearchRun(req.user._id, result, false);
    await updateUserPreferences(req.user._id, {
      searchQuery: params.query,
      searchLocation: params.location,
      searchRegions: params.searchRegions,
      searchSource: params.source,
      datePosted: params.datePosted,
    });
    console.log('Scraping process completed.');

    res.status(200).json({
      message: result.notice || `Found ${result.found} jobs, saved ${result.saved} new listings.`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during scraping process:', error);
    res.status(500).json({ message: 'Server error during scraping.', error: message });
  }
};

export const runJobPipeline = async (req: AuthRequest, res: Response) => {
  try {
    const params = await resolveScrapeParams(req.user._id, req.body || {});

    if (!userHasCv({ parsedCV: params.parsedCV })) {
      return res.status(400).json({
        message: 'Upload your CV first to run the job pipeline.',
        step: 'cv_required',
      });
    }

    console.log(`Pipeline started (${params.source}):`, params.query, params.location);
    const scrapeResult = await scrapeJobs(params);
    await recordSearchRun(req.user._id, scrapeResult, true);
    await updateUserPreferences(req.user._id, {
      searchQuery: params.query,
      searchLocation: params.location,
      searchRegions: params.searchRegions,
      searchSource: params.source,
      datePosted: params.datePosted,
    });

    const jobs = await enrichJobsForUser(req.user._id);
    const stats = await getDashboardStats(req.user._id);

    res.status(200).json({
      message:
        scrapeResult.notice ||
        `Pipeline complete — ${jobs.length} jobs ranked by your CV.`,
      step: 'ready',
      scrape: scrapeResult,
      jobs,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pipeline error:', error);
    res.status(500).json({ message: 'Job pipeline failed.', error: message });
  }
};
