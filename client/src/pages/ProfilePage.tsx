// job-app-automator/client/src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, token, updateUserProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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

    setIsUploading(true);
    const formData = new FormData();
    formData.append('cv', file);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } };
      const response = await axios.post('/api/users/cv', formData, config);
      
      // ✅ FRONTEND DEBUG LOG: Let's see exactly what the backend sent us.
      console.log('--- FRONTEND: Received response from backend ---', response.data);

      if (response.data.user) {
        // We will now know if the 'user' object in the response has the 'parsedCV' field.
        console.log('--- FRONTEND: Calling updateUserProfile with the received user data.');
        updateUserProfile(response.data.user);
        setMessage(response.data.message);
      } else {
        console.log('--- FRONTEND ERROR: Backend response did not contain a user object.');
        setError('Received an invalid response from the server.');
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h1>User Profile</h1>
      <p>Welcome, {user?.email}!</p>
      <form onSubmit={handleSubmit}>
        <h2>Upload Your CV</h2>
        <p>Upload your resume to automatically populate your profile.</p>
        <div>
          <label htmlFor="cv-upload">CV File:</label>
          <input id="cv-upload" type="file" onChange={handleFileChange} />
        </div>
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload and Parse CV'}
        </button>
        {message && <p style={{ color: 'green', marginTop: '1rem' }}>{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
      
      {/* This section will only appear if user.parsedCV exists in the component's state */}
      {user?.parsedCV ? (
        <div style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
            <h2>Parsed CV Information</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f4f7f6', padding: '1rem', borderRadius: '6px' }}>
                {JSON.stringify(user.parsedCV, null, 2)}
            </pre>
        </div>
      ) : (
        <div style={{marginTop: '2rem', padding: '1rem', background: '#fff8e1', borderRadius: '8px'}}>
          <p>No parsed CV data found in the current state.</p>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;