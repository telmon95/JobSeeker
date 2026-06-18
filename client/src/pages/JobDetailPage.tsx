import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { JobDetail } from '../types/job';
import { workTypeLabel, type WorkTypeId } from '../utils/workTypes';

function matchClass(score: number): string {
  if (score >= 70) return 'match-score--high';
  if (score >= 50) return 'match-score--mid';
  return 'match-score--low';
}

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const fetchJob = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJob(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('This opening is no longer available.');
      } else {
        setError('Failed to load job details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleApply = () => {
    if (!job || !token) return;
    axios
      .post('/api/applications/apply', { jobId: job._id }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {});
    window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCoverLetter = async () => {
    if (!job || !token) return;
    setIsGenerating(true);
    setCoverLetter('');
    try {
      const { data } = await axios.post(
        '/api/applications/generate-letter',
        { jobId: job._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCoverLetter(data.coverLetter || '');
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to generate cover letter.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="job-detail">
        <p className="loading-pulse">Loading role…</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="job-detail">
        <Link to="/" className="job-detail__back">← Back to openings</Link>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!job) return null;

  return (
    <article className="job-detail">
      <div className="job-detail__main">
        <Link to="/" className="job-detail__back">← Back to openings</Link>

        <header className="job-detail__header">
          <p className="job-detail__eyebrow">{job.company}</p>
          <h1 className="gradient-heading">{job.title}</h1>
          <p className="job-detail__meta">
            {[job.cms.meta.location, job.cms.meta.scheduleType, job.cms.meta.postedAt]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {job.cms.meta.salary && (
            <p className="job-detail__salary">{job.cms.meta.salary}</p>
          )}
          {job.workTypes && job.workTypes.length > 0 && (
            <div className="job-detail__work-types">
              {(job.workTypes as WorkTypeId[]).map((t) => (
                <span key={t} className="work-type-chip work-type-chip--active">
                  {workTypeLabel(t)}
                </span>
              ))}
            </div>
          )}
        </header>

        {job.match && (
          <div className="job-detail__match-bar glass-card">
            <div className={`match-score ${matchClass(job.match.score)}`}>
              <span className="match-score__value">{job.match.score}%</span>
              <span className="match-score__label">{job.match.matchLabel || 'match'}</span>
            </div>
            {job.match.breakdown && (
              <div className="match-breakdown match-breakdown--inline">
                {(
                  [
                    ['Skills', job.match.breakdown.skills],
                    ['Title', job.match.breakdown.title],
                    ['Location', job.match.breakdown.location],
                    ['Experience', job.match.breakdown.experience],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="match-breakdown__row">
                    <span className="match-breakdown__label">{label}</span>
                    <div className="match-breakdown__track">
                      <div className="match-breakdown__fill" style={{ width: `${value}%` }} />
                    </div>
                    <span className="match-breakdown__pct">{value}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grain-banner grain-banner--detail" aria-hidden="true" />

        <div className="job-detail__cms">
          <section className="cms-section">
            <h2>About the role</h2>
            <p>{job.cms.about}</p>
          </section>

          {job.cms.responsibilities.length > 0 && (
            <section className="cms-section">
              <h2>Responsibilities</h2>
              <ul>
                {job.cms.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {job.cms.qualifications.length > 0 && (
            <section className="cms-section">
              <h2>Qualifications</h2>
              <ul>
                {job.cms.qualifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {job.match && (
            <section className="cms-section cms-section--skills">
              {job.match.strongMatches.length > 0 && (
                <div>
                  <h3>Your strong matches</h3>
                  <div className="skill-tags">
                    {job.match.strongMatches.map((s) => (
                      <span key={s} className="skill-tag skill-tag--match">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {job.match.missingSkills.length > 0 && (
                <div>
                  <h3>Gaps to address</h3>
                  <div className="skill-tags">
                    {job.match.missingSkills.map((s) => (
                      <span key={s} className="skill-tag skill-tag--missing">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {coverLetter && (
          <section className="cms-section glass-card job-detail__letter">
            <h2>Cover letter</h2>
            <textarea readOnly value={coverLetter} rows={14} />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(coverLetter)}
            >
              Copy to clipboard
            </button>
          </section>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>

      <aside className="job-detail__sidebar">
        <div className="job-detail__actions job-detail__actions--sticky">
          <button type="button" className="btn-primary" onClick={handleApply}>
            Apply on {job.source} →
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCoverLetter}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating…' : 'Generate cover letter'}
          </button>
        </div>
      </aside>
    </article>
  );
};

export default JobDetailPage;
