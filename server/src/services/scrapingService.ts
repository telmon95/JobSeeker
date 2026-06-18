import axios from 'axios';
import { Job } from '../models/Job';
import { fetchGoogleJobs, isGoogleJobsConfigured } from './googleJobsService';
import { DatePostedFilter, JobScrapeSource, ScrapeJobsOptions, ScrapeJobsResult } from '../types/scrapeOptions';
import { adzunaWhereClause, normalizeSearchLocation } from '../utils/searchLocation';
import { resolveSearchRegions, SearchRegion } from '../utils/searchRegions';

const DEFAULT_QUERY = 'software engineer';
const DEFAULT_LOCATION = 'South Africa';

interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  postedAt?: string;
  salary?: string;
  scheduleType?: string;
  scrapedFrom: 'google' | 'adzuna';
  applyOptions?: { title: string; link: string }[];
}

const ADZUNA_CURRENCY: Record<string, string> = {
  za: 'R',
  gb: '£',
  us: '$',
  ca: 'C$',
  au: 'A$',
  de: '€',
  nl: '€',
  ie: '€',
  sg: 'S$',
  in: '₹',
  ae: 'AED ',
};

function maxPagesFromEnv(): number {
  const n = parseInt(process.env.SCRAPE_MAX_PAGES || '3', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5) : 3;
}

function pagesForRegionCount(maxPages: number, regionCount: number): number {
  if (regionCount <= 1) return maxPages;
  return Math.max(1, Math.min(2, maxPages));
}

function adzunaMaxDaysOld(datePosted: DatePostedFilter): number {
  switch (datePosted) {
    case 'today':
      return 1;
    case '3days':
      return 3;
    case 'week':
      return 7;
    case 'month':
      return 30;
    default:
      return 7;
  }
}

function formatAdzunaSalary(country: string, min?: number, max?: number): string | undefined {
  if (!min && !max) return undefined;
  const sym = ADZUNA_CURRENCY[country] || '$';
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `From ${sym}${min.toLocaleString()}`;
  return `Up to ${sym}${max!.toLocaleString()}`;
}

function effectiveQuery(query: string, region: SearchRegion): string {
  if (region.remote && !/\bremote\b/i.test(query)) {
    return `${query} remote`;
  }
  return query;
}

async function saveJobs(jobs: NormalizedJob[]): Promise<number> {
  let saved = 0;

  for (const job of jobs) {
    try {
      const existingJob = await Job.findOne({ applyUrl: job.applyUrl });
      if (existingJob) continue;

      await new Job(job).save();
      saved += 1;
      console.log(`Saved new job: ${job.title}`);
    } catch (error) {
      console.error(`Error saving job titled: ${job.title}`, error);
    }
  }

  return saved;
}

async function scrapeFromAdzuna(
  query: string,
  region: SearchRegion,
  datePosted: DatePostedFilter,
  maxPages: number
): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Adzuna API credentials are not set in the .env file.');
  }

  const country = region.adzunaCountry;
  const searchQuery = effectiveQuery(query, region);
  const resultsPerPage = 50;
  const allJobs: NormalizedJob[] = [];
  const seenUrls = new Set<string>();

  console.log(`Fetching Adzuna jobs (${country}) for ${region.label}...`);

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`, {
      params: {
        app_id: appId,
        app_key: appKey,
        results_per_page: resultsPerPage,
        what: searchQuery,
        where: adzunaWhereClause(region.location),
        sort_by: 'date',
        max_days_old: adzunaMaxDaysOld(datePosted),
        'content-type': 'application/json',
      },
      timeout: 60000,
    });

    const apiJobs = response.data.results as Array<{
      title: string;
      company: { display_name: string };
      location: { display_name: string };
      description: string;
      redirect_url: string;
      created?: string;
      salary_min?: number;
      salary_max?: number;
      contract_time?: string;
    }>;

    if (!apiJobs?.length) break;

    for (const job of apiJobs) {
      if (seenUrls.has(job.redirect_url)) continue;
      seenUrls.add(job.redirect_url);

      const postedAt = job.created
        ? new Date(job.created).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
        : undefined;

      allJobs.push({
        title: job.title,
        company: job.company.display_name,
        location: job.location.display_name,
        description: job.description,
        applyUrl: job.redirect_url,
        postedAt,
        salary: formatAdzunaSalary(country, job.salary_min, job.salary_max),
        scheduleType: job.contract_time?.replace('_', ' '),
        scrapedFrom: 'adzuna',
      });
    }

    if (apiJobs.length < resultsPerPage) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return allJobs;
}

async function scrapeFromGoogle(
  query: string,
  region: SearchRegion,
  datePosted: DatePostedFilter,
  maxPages: number
): Promise<NormalizedJob[]> {
  console.log(`Fetching Google Jobs for ${region.label}...`);
  const jobs = await fetchGoogleJobs({
    query,
    location: region.location,
    datePosted,
    maxPages,
    region,
  });
  return jobs.map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt,
    salary: job.salary,
    scheduleType: job.scheduleType,
    scrapedFrom: job.scrapedFrom,
    applyOptions: job.applyOptions,
  }));
}

async function scrapeSourceForRegion(
  source: 'google' | 'adzuna',
  query: string,
  region: SearchRegion,
  datePosted: DatePostedFilter,
  maxPages: number
): Promise<{ jobs: NormalizedJob[]; saved: number }> {
  const jobs =
    source === 'google'
      ? await scrapeFromGoogle(query, region, datePosted, maxPages)
      : await scrapeFromAdzuna(query, region, datePosted, maxPages);

  const saved = await saveJobs(jobs);
  return { jobs, saved };
}

function scrapeErrorMessage(error: unknown): string {
  const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
  return (
    axiosError.response?.data?.error ||
    axiosError.message ||
    (error instanceof Error ? error.message : 'Unknown scrape error')
  );
}

async function scrapeSingleLocation(
  source: JobScrapeSource,
  query: string,
  location: string,
  datePosted: DatePostedFilter,
  maxPages: number,
  requestedSource: JobScrapeSource
): Promise<ScrapeJobsResult> {
  const region = resolveSearchRegions(undefined, location)[0];
  let activeSource: JobScrapeSource = source;
  let fallback = false;
  let notice: string | undefined;

  if (requestedSource === 'google' && !isGoogleJobsConfigured()) {
    activeSource = 'adzuna';
    fallback = true;
    notice =
      'Google Jobs needs SERPAPI_API_KEY in server/.env. Used Adzuna instead (your keys are already configured).';
  }

  if (requestedSource === 'both' && !isGoogleJobsConfigured()) {
    activeSource = 'adzuna';
    notice = 'Google unavailable — searched Adzuna only. Add SERPAPI_API_KEY to enable both sources.';
  }

  if (activeSource === 'both' && isGoogleJobsConfigured()) {
    const [googleSettled, adzunaSettled] = await Promise.allSettled([
      scrapeSourceForRegion('google', query, region, datePosted, maxPages),
      scrapeSourceForRegion('adzuna', query, region, datePosted, maxPages),
    ]);

    const warnings: string[] = [];
    const googleResult =
      googleSettled.status === 'fulfilled' ? googleSettled.value : { jobs: [], saved: 0 };
    const adzunaResult =
      adzunaSettled.status === 'fulfilled' ? adzunaSettled.value : { jobs: [], saved: 0 };

    if (googleSettled.status === 'rejected') {
      warnings.push(`Google: ${scrapeErrorMessage(googleSettled.reason)}`);
    }
    if (adzunaSettled.status === 'rejected') {
      warnings.push(`Adzuna: ${scrapeErrorMessage(adzunaSettled.reason)}`);
    }

    const found = googleResult.jobs.length + adzunaResult.jobs.length;
    const saved = googleResult.saved + adzunaResult.saved;

    if (found === 0) {
      throw new Error(warnings.join(' ') || 'No jobs returned from Google or Adzuna.');
    }

    return {
      source: 'both',
      requestedSource,
      found,
      saved,
      query,
      location,
      datePosted,
      notice:
        warnings.length > 0
          ? `Partial results — ${warnings.join(' ')}`
          : `Pulled ${googleResult.jobs.length} from Google + ${adzunaResult.jobs.length} from Adzuna.`,
      sources: {
        google: { found: googleResult.jobs.length, saved: googleResult.saved },
        adzuna: { found: adzunaResult.jobs.length, saved: adzunaResult.saved },
      },
    };
  }

  const singleSource = activeSource === 'both' ? 'adzuna' : activeSource;
  const { jobs, saved } = await scrapeSourceForRegion(
    singleSource,
    query,
    region,
    datePosted,
    maxPages
  );

  return {
    source: singleSource,
    requestedSource,
    found: jobs.length,
    saved,
    query,
    location,
    datePosted,
    fallback,
    notice: notice || `Found ${jobs.length} recent jobs, saved ${saved} new listings.`,
  };
}

async function scrapeMultipleRegions(
  source: JobScrapeSource,
  query: string,
  regions: SearchRegion[],
  datePosted: DatePostedFilter,
  maxPages: number,
  requestedSource: JobScrapeSource
): Promise<ScrapeJobsResult> {
  let activeSource: JobScrapeSource = source;
  let notice: string | undefined;

  if (requestedSource === 'google' && !isGoogleJobsConfigured()) {
    activeSource = 'adzuna';
    notice = 'Google unavailable — searched Adzuna only across selected regions.';
  } else if (requestedSource === 'both' && !isGoogleJobsConfigured()) {
    activeSource = 'adzuna';
    notice = 'Google unavailable — searched Adzuna only across selected regions.';
  }

  const pagesPerRegion = pagesForRegionCount(maxPages, regions.length);
  let totalFound = 0;
  let totalSaved = 0;
  let googleFound = 0;
  let googleSaved = 0;
  let adzunaFound = 0;
  let adzunaSaved = 0;
  const warnings: string[] = [];
  const regionLabels: string[] = [];

  for (const region of regions) {
    regionLabels.push(region.label);
    console.log(`Scraping region: ${region.label} (${region.location})`);

    if (activeSource === 'both' && isGoogleJobsConfigured()) {
      const [googleSettled, adzunaSettled] = await Promise.allSettled([
        scrapeSourceForRegion('google', query, region, datePosted, pagesPerRegion),
        scrapeSourceForRegion('adzuna', query, region, datePosted, pagesPerRegion),
      ]);

      if (googleSettled.status === 'fulfilled') {
        googleFound += googleSettled.value.jobs.length;
        googleSaved += googleSettled.value.saved;
        totalFound += googleSettled.value.jobs.length;
        totalSaved += googleSettled.value.saved;
      } else {
        warnings.push(`${region.label} Google: ${scrapeErrorMessage(googleSettled.reason)}`);
      }

      if (adzunaSettled.status === 'fulfilled') {
        adzunaFound += adzunaSettled.value.jobs.length;
        adzunaSaved += adzunaSettled.value.saved;
        totalFound += adzunaSettled.value.jobs.length;
        totalSaved += adzunaSettled.value.saved;
      } else {
        warnings.push(`${region.label} Adzuna: ${scrapeErrorMessage(adzunaSettled.reason)}`);
      }
    } else {
      const singleSource = activeSource === 'both' ? 'adzuna' : activeSource;
      try {
        const result = await scrapeSourceForRegion(
          singleSource,
          query,
          region,
          datePosted,
          pagesPerRegion
        );
        totalFound += result.jobs.length;
        totalSaved += result.saved;
        if (singleSource === 'adzuna') {
          adzunaFound += result.jobs.length;
          adzunaSaved += result.saved;
        } else {
          googleFound += result.jobs.length;
          googleSaved += result.saved;
        }
      } catch (error) {
        warnings.push(`${region.label}: ${scrapeErrorMessage(error)}`);
      }
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  if (totalFound === 0) {
    throw new Error(warnings.join(' ') || 'No jobs returned from any selected region.');
  }

  const locationSummary = regionLabels.join(', ');
  const baseNotice = `Searched ${regions.length} region(s) — found ${totalFound}, saved ${totalSaved} new.`;

  return {
    source: activeSource === 'both' && isGoogleJobsConfigured() ? 'both' : activeSource === 'both' ? 'adzuna' : activeSource,
    requestedSource,
    found: totalFound,
    saved: totalSaved,
    query,
    location: locationSummary,
    searchRegions: regions.map((r) => r.id),
    datePosted,
    notice: warnings.length ? `${baseNotice} ${warnings.join(' ')}` : notice || baseNotice,
    sources:
      activeSource === 'both' && isGoogleJobsConfigured()
        ? { google: { found: googleFound, saved: googleSaved }, adzuna: { found: adzunaFound, saved: adzunaSaved } }
        : undefined,
  };
}

export const scrapeJobs = async (options: ScrapeJobsOptions = {}): Promise<ScrapeJobsResult> => {
  const requestedSource = options.source ?? 'adzuna';
  const query = options.query?.trim() || DEFAULT_QUERY;
  const location = normalizeSearchLocation(options.location?.trim() || DEFAULT_LOCATION);
  const datePosted = options.datePosted ?? 'week';
  const maxPages = options.maxPages ?? maxPagesFromEnv();
  const regions = resolveSearchRegions(options.searchRegions, location);
  const useMultiRegion = Boolean(options.searchRegions?.length);

  try {
    if (useMultiRegion) {
      return scrapeMultipleRegions(requestedSource, query, regions, datePosted, maxPages, requestedSource);
    }
    return scrapeSingleLocation(requestedSource, query, location, datePosted, maxPages, requestedSource);
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string };
    console.error(
      'Failed to fetch jobs:',
      axiosError.response?.data || axiosError.message || error
    );
    throw error;
  }
};
