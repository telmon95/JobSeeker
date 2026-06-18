export type JobScrapeSource = 'google' | 'adzuna' | 'both';

export type DatePostedFilter = 'today' | '3days' | 'week' | 'month';

export interface ScrapeJobsOptions {
  source?: JobScrapeSource;
  query?: string;
  location?: string;
  /** Region preset ids — when set, scrapes each region to maximize job volume. */
  searchRegions?: string[];
  datePosted?: DatePostedFilter;
  maxPages?: number;
}

export interface ScrapeJobsResult {
  source: JobScrapeSource;
  found: number;
  saved: number;
  query: string;
  location: string;
  searchRegions?: string[];
  datePosted: DatePostedFilter;
  requestedSource?: JobScrapeSource;
  fallback?: boolean;
  notice?: string;
  sources?: { google?: { found: number; saved: number }; adzuna?: { found: number; saved: number } };
}
