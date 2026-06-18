import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CV_UPLOAD_TIMEOUT_MS = 120000;

const ProfilePage: React.FC = () => {
  const { user, token, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    setIsUploading(true);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.append('cv', file);

    try {
      const response = await axios.post('/api/users/cv', formData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: CV_UPLOAD_TIMEOUT_MS,
      });

      if (response.data.user) {
        updateUserProfile(response.data.user);
        setMessage('CV parsed — searching jobs for you…');
        setFile(null);
        navigate('/', { replace: true, state: { runPipeline: true } });
      } else {
        setError('Received an invalid response from the server.');
      }
    } catch (err: any) {
      if (err.code === 'ECONNABORTED') {
        setError('Upload timed out. LlamaParse can take up to 2 minutes — please try again.');
      } else if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 5001.');
      } else {
        const serverMsg = err.response?.data?.message;
        const detail = err.response?.data?.error;
        setError(detail ? `${serverMsg} (${detail})` : serverMsg || err.message || 'Upload failed.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const parsedCV = user?.parsedCV;

  return (
    <div>
      <div className="page-header">
        <h1 className="gradient-heading">Profile</h1>
        <p>Welcome back, {user?.email}</p>
      </div>

      <div className="profile-grid">
        <div className="glass-card profile-upload-form">
          <h2>Upload your CV</h2>
          <p>
            Supports modern CV formats: PDF, Word, ODT, RTF, plain text, Markdown, and scanned images.
            We extract skills, experience, education, certifications, projects, and links.
          </p>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="cv-upload">Resume file</label>
              <input
                id="cv-upload"
                type="file"
                accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
            </div>
            <button type="submit" disabled={isUploading || !file}>
              {isUploading ? 'Parsing CV (30–90 sec)...' : 'Upload & parse'}
            </button>
            {isUploading && (
              <p className="upload-hint">LlamaParse is reading your document. Please wait…</p>
            )}
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
          </form>
        </div>

        {parsedCV ? (
          <div className="glass-card glass-card--glow cv-preview">
            <h2>Parsed profile</h2>
            {parsedCV.name && (
              <div className="cv-field">
                <strong>Name</strong>
                {parsedCV.name}
              </div>
            )}
            {parsedCV.headline && (
              <div className="cv-field">
                <strong>Headline</strong>
                {parsedCV.headline}
              </div>
            )}
            {parsedCV.location && (
              <div className="cv-field">
                <strong>Location</strong>
                {parsedCV.location}
              </div>
            )}
            {parsedCV.summary && (
              <div className="cv-field">
                <strong>Summary</strong>
                <p className="cv-summary">{parsedCV.summary}</p>
              </div>
            )}
            {parsedCV.email && (
              <div className="cv-field">
                <strong>Email</strong>
                {parsedCV.email}
              </div>
            )}
            {parsedCV.phone && (
              <div className="cv-field">
                <strong>Phone</strong>
                {parsedCV.phone}
              </div>
            )}
            {parsedCV.skills?.length > 0 && (
              <div className="cv-field">
                <strong>Skills</strong>
                <div className="skill-tags">
                  {parsedCV.skills.map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}
            {parsedCV.experience?.length > 0 && (
              <div className="cv-field">
                <strong>Experience</strong>
                <ul className="experience-list">
                  {parsedCV.experience.map((exp, i) => (
                    <li key={i}>
                      {exp.title} at {exp.company}
                      {(exp.startDate || exp.endDate) && (
                        <span className="cv-dates"> ({[exp.startDate, exp.endDate].filter(Boolean).join(' – ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsedCV.education?.length > 0 && (
              <div className="cv-field">
                <strong>Education</strong>
                <ul className="experience-list">
                  {parsedCV.education.map((edu, i) => (
                    <li key={i}>{edu.degree ? `${edu.degree} — ` : ''}{edu.institution}</li>
                  ))}
                </ul>
              </div>
            )}
            {parsedCV.certifications?.length > 0 && (
              <div className="cv-field">
                <strong>Certifications</strong>
                <ul className="experience-list">
                  {parsedCV.certifications.map((cert, i) => (
                    <li key={i}>{cert}</li>
                  ))}
                </ul>
              </div>
            )}
            {parsedCV.projects && parsedCV.projects.length > 0 && (
              <div className="cv-field">
                <strong>Projects</strong>
                <ul className="experience-list">
                  {parsedCV.projects.map((proj, i) => (
                    <li key={i}>{proj.name}{proj.description ? ` — ${proj.description.slice(0, 80)}` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {parsedCV.links && (
              <div className="cv-field">
                <strong>Links</strong>
                <div className="cv-links">
                  {parsedCV.links.linkedin && <a href={parsedCV.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
                  {parsedCV.links.github && <a href={parsedCV.links.github} target="_blank" rel="noreferrer">GitHub</a>}
                  {parsedCV.links.portfolio && <a href={parsedCV.links.portfolio} target="_blank" rel="noreferrer">Portfolio</a>}
                </div>
              </div>
            )}
            <details className="cv-details">
              <summary>View raw JSON</summary>
              <pre>{JSON.stringify(parsedCV, null, 2)}</pre>
            </details>
          </div>
        ) : (
          <div className="glass-card alert-banner alert-banner--warning">
            <p>No CV parsed yet. Upload PDF, Word, ODT, RTF, TXT, or an image to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
