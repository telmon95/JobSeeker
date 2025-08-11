# JobSeeker AI - Full-Stack Job Application Automation Platform

![JobSeeker Demo GIF](https-placeholder-for-your-demo-gif)
> **Showcase:** A powerful way to demonstrate this project is to add a short screen recording (converted to a GIF) of the app in action and place it here. Show the login, job finding, and cover letter generation process.

## 🚀 About This Project

JobSeeker AI is a full-stack web application designed to streamline and automate the modern job search. It leverages a suite of powerful APIs to source relevant job postings, parse user CVs to extract structured data, and generate tailored cover letters using artificial intelligence. This project demonstrates a complete end-to-end development cycle, from backend architecture and third-party API integration to a responsive and interactive React frontend.

---

### ✨ Key Features

*   **Secure User Authentication:** Full registration and login system using JWT for protected routes and persistent user sessions.
*   **Automated CV Parsing:** Users can upload their CV (PDF, DOCX), which is processed by the **Affinda API** to extract skills, work experience, and contact information into a structured JSON format.
*   **Multi-API Job Aggregation:** The platform fetches job listings from multiple professional sources (**Adzuna** and **Jooble APIs**), normalizes the data, and de-duplicates the results to provide a comprehensive and relevant job feed.
*   **AI-Powered Cover Letter Generation:** Integrates with the **OpenAI API (GPT-3.5-Turbo)** to generate unique, professional cover letters tailored to a specific job description and the user's parsed CV data.
*   **Experimental Auto-Apply:** A foundational feature using **Puppeteer** to automate the process of filling out job applications on external career pages, demonstrating advanced browser automation skills.

---

### 🛠️ Tech Stack

| Category          | Technologies                                                              |
| ----------------- | ------------------------------------------------------------------------- |
| **Frontend**      | React, TypeScript, Vite, React Router, Axios, Context API                 |
| **Backend**       | Node.js, Express, TypeScript, Mongoose                                  |
| **Database**      | MongoDB (with MongoDB Atlas)                                              |
| **Authentication**| JSON Web Tokens (JWT), bcrypt.js                                          |
| **APIs & Services**| OpenAI, Adzuna, Jooble, Affinda, Puppeteer                                |
| **Deployment**    | (Planned) AWS EC2, Nginx, PM2, Docker                                     |

---

### ⚙️ Local Setup and Installation

To run this project on your local machine, you will need two separate terminal windows (one for the `client` and one for the `server`).

**1. Clone the repository:**
```bash
git clone https://github.com/telmon95/JobSeeker.git
cd JobSeeker
2. Backend Setup:
code
Bash
# Navigate to the server directory
cd server

# Install all dependencies
npm install

# Create the environment variables file
# (On Mac/Linux)
cp .env.example .env
# (On Windows, manually create .env and copy content from .env.example)

# Add your secret keys to the .env file (see section below)

# Start the backend development server
npm run dev
3. Frontend Setup (in a new terminal):
code
Bash
# Navigate to the client directory
cd client

# Install all dependencies
npm install

# Start the frontend development server
npm run dev
The application should now be running. The frontend will be accessible at http://localhost:3000 and the backend will be running on http://localhost:5001.
🔑 Environment Variables
The backend requires a .env file located in the /server directory. This file stores all required secret keys and API credentials.
code
Code
# MongoDB Connection String from MongoDB Atlas
MONGO_URI="your_mongodb_connection_string"

# A strong, random string for signing JSON Web Tokens
JWT_SECRET="your_strong_jwt_secret"

# Your API key from the OpenAI Platform
OPENAI_API_KEY="sk-..."

# Your App ID and Key from the Adzuna Developer dashboard
ADZUNA_APP_ID="your_adzuna_app_id"
ADZUNA_APP_KEY="your_adzuna_app_key"

# Your API key from the Affinda dashboard
AFFINDA_API_KEY="af_..."

# The port for the backend server (optional, defaults to 5001)
PORT=5001
📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.
