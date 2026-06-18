import axios from 'axios';
import { DatePostedFilter } from '../types/scrapeOptions';
import { normalizeSearchLocation } from '../utils/searchLocation';
import type { SearchRegion } from '../utils/searchRegions';

interface GoogleJobApplyOption {
  title?: string;
  link?: string;
}

interface GoogleJobResult {
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  via?: string;
  share_link?: string;
  job_id?: string;
  apply_options?: GoogleJobApplyOption[];
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
    work_from_home?: boolean;
  };
}

export interface NormalizedGoogleJob {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  via: string;
  postedAt?: string;
  salary?: string;
  scheduleType?: string;
  applyOptions: { title: string; link: string }[];
  scrapedFrom: 'google';
}

export interface FetchGoogleJobsOptions {
  query: string;
  location: string;
  datePosted?: DatePostedFilter;
  maxPages?: number;
  region?: Pick<SearchRegion, 'googleGl' | 'googleDomain' | 'remote'>;
}

function getSerpApiKey(): string | undefined {
  return process.env.SERPAPI_API_KEY || process.env.GOOGLE_JOBS_API_KEY;
}

export function isGoogleJobsConfigured(): boolean {
  return Boolean(getSerpApiKey());
}

function datePostedChip(datePosted: DatePostedFilter): string {
  return `date_posted:${datePosted}`;
}

function pickApplyUrl(job: GoogleJobResult): string | null {
  const applyLink = job.apply_options?.find((o) => o.link)?.link;
  if (applyLink) return applyLink;
  if (job.share_link) return job.share_link;
  return null;
}

function buildDescription(job: GoogleJobResult): string {
  const parts: string[] = [];
  const desc = job.description?.trim();
  if (desc) parts.push(desc);

  const extras = job.extensions?.filter(
    (e) => e && !e.toLowerCase().includes('ago') && !e.includes('$') && !e.includes('R')
  );
  if (extras?.length) parts.push(extras.join(' · '));
  if (job.via) parts.push(`Listed via ${job.via}.`);

  return parts.join('\n\n');
}

function normalizeJob(job: GoogleJobResult, fallbackLocation: string): NormalizedGoogleJob | null {
  const title = job.title?.trim();
  const applyUrl = pickApplyUrl(job);
  if (!title || !applyUrl) return null;

  const detected = job.detected_extensions || {};
  const applyOptions =
    job.apply_options
      ?.filter((o) => o.link)
      .map((o) => ({ title: o.title?.trim() || 'Apply', link: o.link! })) || [];

  return {
    title,
    company: job.company_name?.trim() || 'Unknown company',
    location: job.location?.trim() || fallbackLocation,
    description: buildDescription(job),
    applyUrl,
    via: job.via?.trim() || 'Google Jobs',
    postedAt: detected.posted_at,
    salary: detected.salary,
    scheduleType: detected.schedule_type || (detected.work_from_home ? 'Remote' : undefined),
    applyOptions,
    scrapedFrom: 'google',
  };
}

export async function fetchGoogleJobs(options: FetchGoogleJobsOptions): Promise<NormalizedGoogleJob[]> {
  const apiKey = getSerpApiKey();
  if (!apiKey) {
    throw new Error(
      'Google Jobs API key is not set. Add SERPAPI_API_KEY to server/.env (get one at https://serpapi.com).'
    );
  }

  const { query, datePosted = 'week', maxPages = 3, region } = options;
  const location = normalizeSearchLocation(options.location);
  const searchQuery = region?.remote && !/\bremote\b/i.test(query) ? `${query} remote` : query;
  const chips = datePostedChip(datePosted);
  const seenUrls = new Set<string>();
  const normalized: NormalizedGoogleJob[] = [];

  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const params: Record<string, string> = {
      engine: 'google_jobs',
      q: searchQuery,
      location,
      hl: 'en',
      gl: region?.googleGl || 'za',
      google_domain: region?.googleDomain || 'google.co.za',
      chips,
      api_key: apiKey,
    };

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const response = await axios.get('https://serpapi.com/search.json', {
      params,
      timeout: 90000,
    });

    const rawJobs: GoogleJobResult[] =
      response.data?.jobs_results || response.data?.job_results || [];

    if (!rawJobs.length) break;

    for (const job of rawJobs) {
      const item = normalizeJob(job, location);
      if (!item || seenUrls.has(item.applyUrl)) continue;
      seenUrls.add(item.applyUrl);
      normalized.push(item);
    }

    nextPageToken = response.data?.serpapi_pagination?.next_page_token;
    if (!nextPageToken) break;

    await new Promise((r) => setTimeout(r, 400));
  }

  if (!normalized.length) {
    console.log('Google Jobs API returned no results for:', searchQuery, location);
  }

  return normalized;
}
