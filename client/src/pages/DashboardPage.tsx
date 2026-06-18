import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deriveSearchFromCv, hasParsedCv } from '../utils/cvSearchDefaults';
import type { JobListing } from '../types/job';
import {
  jobMatchesWorkTypeFilter,
  WORK_TYPE_OPTIONS,
  workTypeLabel,
  type WorkTypeId,
} from '../utils/workTypes';
import {
  DEFAULT_SEARCH_REGION_IDS,
  inferJobLocationBucket,
  jobMatchesLocationFilter,
  LOCATION_FILTER_OPTIONS,
  type SearchRegionOption,
} from '../utils/searchRegions';
import ProblemSolution from '../components/ProblemSolution';

const PIPELINE_TIMEOUT_MS = 180000;

interface IJob extends JobListing {}

type JobSource = 'google' | 'adzuna' | 'both';
type DatePosted = 'today' | '3days' | 'week' | 'month';

interface DashboardStats {
  cvReady: boolean;
  profileName?: string;
  totalJobsInDb: number;
  rankedJobs: number;
  avgMatch: number | null;
  strongMatches: number;
  searchRuns: number;
  lastSearchAt: string | null;
  applicationsTotal: number;
  applicationsApplied: number;
  coverLettersGenerated: number;
}

interface IApplication {
  _id: string;
  status: string;
  generatedCoverLetter?: string;
  job: IJob;
}

const STATUS_LABELS: Record<string, string> = {
  BOOKMARKED: 'Saved',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interview',
  OFFERED: 'Offered',
  REJECTED: 'Rejected',
};

function matchClass(score: number): string {
  if (score >= 70) return 'match-score--high';
  if (score >= 50) return 'match-score--mid';
  return 'match-score--low';
}

type FlowStep = 'cv' | 'searching' | 'matching' | 'ready';

const DashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const autoPipelineRan = useRef(false);
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>('cv');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [workTypeFilters, setWorkTypeFilters] = useState<WorkTypeId[]>([]);
  const [searchQuery, setSearchQuery] = useState('full stack software engineer');
  const [searchLocation, setSearchLocation] = useState('Pretoria, South Africa');
  const [searchRegions, setSearchRegions] = useState<string[]>([...DEFAULT_SEARCH_REGION_IDS]);
  const [regionOptions, setRegionOptions] = useState<SearchRegionOption[]>([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [searchSource, setSearchSource] = useState<JobSource>('adzuna');
  const [datePosted, setDatePosted] = useState<DatePosted>('week');
  const [googleJobsAvailable, setGoogleJobsAvailable] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const hasCV = hasParsedCv(user);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch {
      // non-fatal
    }
  }, [token]);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    try {
      const appsRes = await axios.get('/api/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(appsRes.data);
    } catch {
      // non-fatal
    }
  }, [token]);

  const fetchJobsOnly = useCallback(async () => {
    if (!token) return [];
    const jobsRes = await axios.get('/api/jobs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobs(jobsRes.data);
    return jobsRes.data as IJob[];
  }, [token]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchJobsOnly(), fetchApplications(), fetchStats()]);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchJobsOnly, fetchApplications, fetchStats]);

  const runPipeline = useCallback(
    async (options?: { query?: string; location?: string }) => {
      if (!token || !hasCV) return;

      setIsScraping(true);
      setFlowStep('searching');
      setError('');
      setSuccess('');

      const query = options?.query ?? searchQuery;
      const loc = options?.location ?? searchLocation;

      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
          timeout: PIPELINE_TIMEOUT_MS,
        };
        const response = await axios.post(
          '/api/jobs/pipeline',
          {
            source: searchSource,
            query,
            location: loc,
            searchRegions,
            datePosted,
          },
          config
        );

        setJobs(response.data.jobs || []);
        if (response.data.stats) setStats(response.data.stats);
        await fetchApplications();
        await fetchStats();
        setFlowStep('ready');
        setSuccess(response.data.message || 'Jobs ranked by your CV.');
      } catch (err: unknown) {
        setFlowStep(hasCV ? 'ready' : 'cv');
        let message = 'Job pipeline failed. Check API keys and try again.';
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string; error?: string } | undefined;
          message = data?.error || data?.message || err.message || message;
          if (err.code === 'ECONNABORTED') {
            message = 'Pipeline timed out. Try again or narrow your search.';
          }
          if (!err.response) {
            message = 'Cannot reach the server. Make sure the backend is running on port 5001.';
          }
        }
        setError(message);
        await fetchJobsOnly();
      } finally {
        setIsScraping(false);
      }
    },
    [token, hasCV, searchQuery, searchLocation, searchRegions, searchSource, datePosted, fetchApplications, fetchJobsOnly, fetchStats]
  );

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  useEffect(() => {
    if (!hasCV) {
      setFlowStep('cv');
      return;
    }
    if (isScraping) {
      setFlowStep('searching');
    } else if (jobs.length > 0) {
      setFlowStep('ready');
    } else {
      setFlowStep('matching');
    }
  }, [hasCV, isScraping, jobs.length]);

  useEffect(() => {
    if (user?.preferences?.searchQuery) {
      setSearchQuery(user.preferences.searchQuery);
      setSearchLocation(user.preferences.searchLocation || 'South Africa');
      if (user.preferences.searchRegions?.length) {
        setSearchRegions(user.preferences.searchRegions);
      }
      if (user.preferences.searchSource) {
        setSearchSource(user.preferences.searchSource);
      }
      if (user.preferences.datePosted) {
        setDatePosted(user.preferences.datePosted);
      }
      return;
    }
    if (!user?.parsedCV) return;
    const defaults = deriveSearchFromCv(user.parsedCV);
    setSearchQuery(defaults.query);
    setSearchLocation(defaults.location);
  }, [user?.parsedCV, user?.preferences]);

  useEffect(() => {
    if (!token || isLoading || !hasCV || autoPipelineRan.current) return;

    const runPipelineFlag = Boolean((location.state as { runPipeline?: boolean })?.runPipeline);
    if (runPipelineFlag || jobs.length === 0) {
      autoPipelineRan.current = true;
      navigate('.', { replace: true, state: {} });
      runPipeline();
    }
  }, [token, isLoading, hasCV, jobs.length, location.state, navigate, runPipeline]);

  useEffect(() => {
    if (!isLoading && user && !hasCV) {
      navigate('/profile', { replace: true });
    }
  }, [isLoading, user, hasCV, navigate]);

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/jobs/scrape/config', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setGoogleJobsAvailable(Boolean(res.data.googleJobsAvailable));
        if (res.data.defaultSource) {
          setSearchSource(res.data.defaultSource);
        }
        if (Array.isArray(res.data.searchRegions)) {
          setRegionOptions(res.data.searchRegions);
        }
        if (Array.isArray(res.data.defaultSearchRegions)) {
          setSearchRegions((prev) => (prev.length ? prev : res.data.defaultSearchRegions));
        }
      })
      .catch(() => {});
  }, [token]);

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (hasCV && minScore > 0) {
      list = list.filter((j) => (j.match?.score ?? 0) >= minScore);
    }
    if (workTypeFilters.length > 0) {
      list = list.filter((j) =>
        jobMatchesWorkTypeFilter({ workTypes: j.workTypes as WorkTypeId[] }, workTypeFilters)
      );
    }
    if (locationFilter !== 'all') {
      list = list.filter((j) => jobMatchesLocationFilter(j.location, locationFilter));
    }
    return list;
  }, [jobs, hasCV, minScore, workTypeFilters, locationFilter]);

  const workTypeCounts = useMemo(() => {
    const counts: Partial<Record<WorkTypeId, number>> = {};
    for (const job of jobs) {
      for (const t of (job.workTypes || []) as WorkTypeId[]) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, [jobs]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    for (const job of jobs) {
      const bucket = inferJobLocationBucket(job.location);
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  const toggleSearchRegion = (id: string) => {
    setSearchRegions((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  };

  const toggleWorkType = (id: WorkTypeId) => {
    setWorkTypeFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const avgMatch = useMemo(() => {
    const scored = jobs.filter((j) => j.match);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, j) => sum + (j.match?.score ?? 0), 0) / scored.length);
  }, [jobs]);

  const getApplicationForJob = (jobId: string) =>
    applications.find((app) => app.job?._id === jobId);

  const handleScrape = async () => {
    await runPipeline();
  };

  const copyCoverLetter = async () => {
    if (!generatedLetter) return;
    await navigator.clipboard.writeText(generatedLetter);
    setSuccess('Cover letter copied to clipboard.');
  };

  return (
    <div className="dashboard">
      <div className="page-header dashboard-hero">
        <div>
          <p className="dashboard-hero__eyebrow">Careers at JobSeeker</p>
          <h1 className="gradient-heading">Find roles matched to your CV.</h1>
          <p className="dashboard-hero__sub">Upload your resume, search live listings, and apply with confidence.</p>
          {hasCV && (
            <button
              type="button"
              className="btn-primary btn-primary--sm"
              onClick={() => handleScrape()}
              disabled={isScraping || isLoading}
            >
              {isScraping ? 'Searching…' : 'View openings'}
            </button>
          )}
        </div>
      </div>

      <div className="grain-banner" aria-hidden="true" />

      <ProblemSolution />

      {isScraping && (
        <div className="flow-banner glass-card">
          <span className="loading-pulse flow-banner__text">
            Running pipeline — searching recent jobs and ranking by your CV…
          </span>
        </div>
      )}

      <form
        className="scrape-search glass-card"
        onSubmit={(e) => {
          e.preventDefault();
          handleScrape();
        }}
      >
        <div className="scrape-search__fields">
          <label>
            <span>Search query</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. full stack software engineer"
              disabled={isScraping}
            />
          </label>
          <label>
            <span>Custom location (optional)</span>
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="e.g. Pretoria, South Africa"
              disabled={isScraping}
            />
          </label>
          <label>
            <span>Posted within</span>
            <select
              value={datePosted}
              onChange={(e) => setDatePosted(e.target.value as DatePosted)}
              disabled={isScraping}
            >
              <option value="today">Today</option>
              <option value="3days">Last 3 days</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
            </select>
          </label>
          <label>
            <span>Source</span>
            <select
              value={searchSource}
              onChange={(e) => setSearchSource(e.target.value as JobSource)}
              disabled={isScraping}
            >
              {googleJobsAvailable && (
                <option value="both">All sources (max data)</option>
              )}
              <option value="adzuna">Adzuna</option>
              <option value="google" disabled={!googleJobsAvailable}>
                Google Jobs{googleJobsAvailable ? '' : ' (needs SERPAPI_API_KEY)'}
              </option>
            </select>
          </label>
        </div>
        <div className="scrape-search__regions">
          <span className="filter-bar__label">Search regions (multi-select for more jobs):</span>
          <div className="work-type-filters">
            {(regionOptions.length ? regionOptions : LOCATION_FILTER_OPTIONS.filter((o) => o.id !== 'all' && o.id !== 'other')).map(
              (opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`work-type-chip ${searchRegions.includes(opt.id) ? 'work-type-chip--active' : ''}`}
                  onClick={() => toggleSearchRegion(opt.id)}
                  disabled={isScraping}
                >
                  {opt.label}
                </button>
              )
            )}
            <button
              type="button"
              className="work-type-chip work-type-chip--clear"
              onClick={() => setSearchRegions([...DEFAULT_SEARCH_REGION_IDS])}
              disabled={isScraping}
            >
              Reset defaults
            </button>
          </div>
        </div>
        <button type="submit" disabled={isScraping || isLoading || !searchQuery.trim() || !hasCV || searchRegions.length === 0}>
          {isScraping ? 'Pipeline running…' : 'Refresh job search'}
        </button>
      </form>

      <div className="workflow-steps glass-card">
        <div className={`workflow-step ${hasCV ? 'workflow-step--done' : 'workflow-step--active'}`}>
          <span className="workflow-step__num">1</span>
          <div>
            <strong>Upload CV</strong>
            <p>{hasCV ? 'Ready' : <Link to="/profile">Go to Profile</Link>}</p>
          </div>
        </div>
        <div
          className={`workflow-step ${
            jobs.length ? 'workflow-step--done' : flowStep === 'searching' ? 'workflow-step--active' : ''
          }`}
        >
          <span className="workflow-step__num">2</span>
          <div>
            <strong>Search jobs</strong>
            <p>{isScraping ? 'Searching…' : jobs.length ? `${jobs.length} listings` : 'Waiting'}</p>
          </div>
        </div>
        <div className={`workflow-step ${hasCV && jobs.length ? 'workflow-step--done' : ''}`}>
          <span className="workflow-step__num">3</span>
          <div>
            <strong>Match score</strong>
            <p>{avgMatch !== null ? `Avg ${avgMatch}% match` : 'CV vs job skills'}</p>
          </div>
        </div>
        <div className={`workflow-step ${flowStep === 'ready' && jobs.length ? 'workflow-step--active' : ''}`}>
          <span className="workflow-step__num">4</span>
          <div>
            <strong>Apply on source</strong>
            <p>Direct link to original posting</p>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="glass-card stat-card">
          <span className="stat-card__value">{stats?.totalJobsInDb ?? jobs.length}</span>
          <span className="stat-card__label">Jobs in DB</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-card__value">
            {(stats?.avgMatch ?? avgMatch) != null ? `${stats?.avgMatch ?? avgMatch}%` : '—'}
          </span>
          <span className="stat-card__label">Avg match</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-card__value">{stats?.strongMatches ?? filteredJobs.filter((j) => (j.match?.score ?? 0) >= 70).length}</span>
          <span className="stat-card__label">Strong (70%+)</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-card__value">{stats?.applicationsApplied ?? 0}</span>
          <span className="stat-card__label">Applied</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-card__value">{stats?.searchRuns ?? 0}</span>
          <span className="stat-card__label">Searches</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-card__value">{stats?.coverLettersGenerated ?? 0}</span>
          <span className="stat-card__label">Cover letters</span>
        </div>
      </div>

      {hasCV && jobs.length > 0 && (
        <div className="filter-bar glass-card">
          <div className="filter-bar__group">
            <label htmlFor="min-score">Min match score:</label>
            <select id="min-score" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
              <option value={0}>All jobs</option>
              <option value={50}>50%+</option>
              <option value={70}>70%+</option>
              <option value={80}>80%+</option>
            </select>
          </div>
          <div className="filter-bar__group filter-bar__group--work-types">
            <span className="filter-bar__label">Location:</span>
            <div className="work-type-filters">
              {LOCATION_FILTER_OPTIONS.filter(
                (opt) => opt.id === 'all' || (locationCounts[opt.id] || 0) > 0
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`work-type-chip ${locationFilter === opt.id ? 'work-type-chip--active' : ''}`}
                  onClick={() => setLocationFilter(opt.id)}
                >
                  {opt.label}
                  {opt.id !== 'all' && (
                    <span className="work-type-chip__count">{locationCounts[opt.id] || 0}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-bar__group filter-bar__group--work-types">
            <span className="filter-bar__label">Work type:</span>
            <div className="work-type-filters">
              {WORK_TYPE_OPTIONS.filter((opt) => (workTypeCounts[opt.id] || 0) > 0).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`work-type-chip ${workTypeFilters.includes(opt.id) ? 'work-type-chip--active' : ''}`}
                  onClick={() => toggleWorkType(opt.id)}
                >
                  {opt.label}
                  <span className="work-type-chip__count">{workTypeCounts[opt.id]}</span>
                </button>
              ))}
              {workTypeFilters.length > 0 && (
                <button
                  type="button"
                  className="work-type-chip work-type-chip--clear"
                  onClick={() => setWorkTypeFilters([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <span className="filter-bar__count">{filteredJobs.length} shown</span>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <div className="section-header">
            <h2>{hasCV ? 'Jobs ranked by match' : 'Scraped job listings'}</h2>
            <span className="section-count">{filteredJobs.length}</span>
          </div>

          <div className="job-list careers-list">
            {isLoading ? (
              <p className="loading-pulse empty-state">Loading jobs...</p>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const app = getApplicationForJob(job._id);
                return (
                  <Link key={job._id} to={`/jobs/${job._id}`} className="careers-row">
                    <div className="careers-row__main">
                      <h3 className="careers-row__title">{job.title}</h3>
                      <p className="careers-row__company">{job.company}</p>
                    </div>
                    <div className="careers-row__aside">
                      {job.match && (
                        <span className={`careers-row__match ${matchClass(job.match.score)}`}>
                          {job.match.score}%
                        </span>
                      )}
                      <span className="careers-row__location">
                        {job.location || 'Remote'}
                      </span>
                      {(job.workTypes?.length ?? 0) > 0 && (
                        <span className="careers-row__types">
                          {(job.workTypes as WorkTypeId[]).slice(0, 2).map((t) => workTypeLabel(t)).join(' · ')}
                        </span>
                      )}
                      {app && (
                        <span className={`status-badge status-badge--${app.status.toLowerCase()}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="glass-card empty-state">
                <div className="empty-state__icon">✦</div>
                <h3>{jobs.length ? 'No jobs match these filters' : 'No jobs yet'}</h3>
                <p>
                  {jobs.length
                    ? 'Clear filters or lower the match score.'
                    : 'Pipeline will run automatically when your CV is ready.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="dashboard-section dashboard-section--sidebar">
          <div className="section-header">
            <h2>My applications</h2>
            <span className="section-count">{applications.length}</span>
          </div>

          <div className="applications-list">
            {applications.length === 0 ? (
              <div className="glass-card empty-state empty-state--compact">
                <p>Click a source link to apply on the original job site.</p>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app._id} className="application-card glass-card">
                  <div className="application-card__header">
                    <strong>{app.job?.title}</strong>
                    <span className={`status-badge status-badge--${app.status.toLowerCase()}`}>
                      {STATUS_LABELS[app.status]}
                    </span>
                  </div>
                  <p className="application-card__company">{app.job?.company}</p>
                  {app.job?.applyUrl && (
                    <a
                      href={app.job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost btn-ghost--sm"
                    >
                      Open original posting →
                    </a>
                  )}
                  {app.generatedCoverLetter && (
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm"
                      onClick={() => {
                        setSelectedJob(app.job);
                        setGeneratedLetter(app.generatedCoverLetter || '');
                      }}
                    >
                      View cover letter
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {selectedJob && generatedLetter && (
        <div className="modal-backdrop" onClick={() => { setSelectedJob(null); setGeneratedLetter(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cover letter — {selectedJob.title}</h2>
            <textarea readOnly value={generatedLetter} rows={16} />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={copyCoverLetter}>
                Copy to clipboard
              </button>
              <a
                href={selectedJob.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-primary--sm"
              >
                Apply on {selectedJob.source} →
              </a>
              <button type="button" onClick={() => { setSelectedJob(null); setGeneratedLetter(''); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
