import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

interface IJob {
  _id: string;
  title: string;
  company: string;
  location: string;
}

const DashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/api/jobs', config);
      setJobs(response.data);
    } catch (err: any) {
      setError('Failed to fetch jobs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchJobs();
    }
  }, [token]);

  const handleScrape = async () => {
    setIsScraping(true);
    setError('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/api/jobs/scrape', {}, config);
      await fetchJobs(); 
    } catch (err: any) {
      setError('An error occurred while scraping for new jobs.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerateLetter = async (job: IJob) => {
    if (!user?.parsedCV) {
        alert("Please upload your CV on the Profile page first.");
        return;
    }
    setSelectedJob(job);
    setIsGenerating(true);
    setGeneratedLetter('');
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.post('/api/applications/generate-letter', { jobId: job._id }, config);
        setGeneratedLetter(response.data.coverLetter);
    } catch (err: any) {
        setError(err.response?.data?.message || "Failed to generate letter.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAutoApply = async (job: IJob) => {
    if (!window.confirm(`Are you sure you want to attempt to automatically apply to ${job.title} at ${job.company}? This process is experimental.`)) {
      return;
    }
    setSelectedJob(job);
    setIsApplying(true);
    setError('');
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.post('/api/applications/auto-apply', { jobId: job._id }, config);
        alert(response.data.message);
    } catch (err: any) {
        alert(err.response?.data?.message || "An error occurred during the auto-apply process.");
    } finally {
        setIsApplying(false);
        setSelectedJob(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Job Dashboard</h1>
        <button onClick={handleScrape} disabled={isScraping || isLoading} style={{width: 'auto', padding: '0.75rem 1.5rem'}}>
          {isScraping ? 'Scraping...' : 'Find New Jobs'}
        </button>
      </div>
      <p>Click the button to find new job postings. The results will appear below.</p>
      {error && <p className="error-message">{error}</p>}
      <div className="job-list" style={{ marginTop: '2rem' }}>
        {isLoading ? ( <p>Loading...</p> ) : jobs.length > 0 ? (
          jobs.map(job => (
            <div key={job._id} className="job-card">
              <div>
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <p className="location">{job.location}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="generate-button"
                  onClick={() => handleGenerateLetter(job)}
                  disabled={isGenerating && selectedJob?._id === job._id}
                >
                  {isGenerating && selectedJob?._id === job._id ? '...' : 'Generate Letter'}
                </button>
                <button
                  onClick={() => handleAutoApply(job)}
                  disabled={isApplying && selectedJob?._id === job._id}
                >
                  {isApplying && selectedJob?._id === job._id ? 'Applying...' : 'Auto-Apply'}
                </button>
              </div>
            </div>
          ))
        ) : ( 
          <div style={{textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px'}}>
            <h3>No Jobs Found</h3>
            <p>Click "Find New Jobs" to start your search!</p>
          </div>
        )}
      </div>
      {/* Cover Letter Modal */}
      {selectedJob && (
        <div className="modal-backdrop" onClick={() => setSelectedJob(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Cover Letter for {selectedJob.title}</h2>
            {isGenerating ? (
              <p>Generating, please wait...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ): (
              <textarea
                readOnly
                value={generatedLetter}
                rows={20}
                style={{ width: '100%', whiteSpace: 'pre-wrap' }}
              />
            )}
            <button onClick={() => setSelectedJob(null)} style={{marginTop: '1rem'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;