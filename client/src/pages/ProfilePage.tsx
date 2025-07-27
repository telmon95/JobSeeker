// job-app-automator/client/src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, token, login } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post('/api/users/cv', formData, config);
      
      setMessage(response.data.message);
      setError('');
      
      if(response.data.user && token) {
        login({ user: response.data.user, token: token });
      }

    } catch (err: any) { // <-- BRACES ADDED HERE
      setError(err.response?.data?.message || 'An error occurred during upload.');
      setMessage('');
    } // <-- AND HERE
  };

  return (
    <div>
      <h1>User Profile</h1>
      <p>Welcome, {user?.email}!</p>

      <form onSubmit={handleSubmit}>
        <h2>Upload Your CV</h2>
        <p>Upload your resume (PDF, DOCX, PNG, JPG) to automatically populate your profile.</p>
        <div>
          <label htmlFor="cv-upload">CV File:</label>
          <input id="cv-upload" type="file" onChange={handleFileChange} />
        </div>
        <button type="submit">Upload and Parse CV</button>
        {message && <p style={{ color: 'green', marginTop: '1rem' }}>{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>

      {user?.parsedCV && (
        <div style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
            <h2>Parsed CV Information</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f4f7f6', padding: '1rem', borderRadius: '6px' }}>
                {JSON.stringify(user.parsedCV, null, 2)}
            </pre>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;