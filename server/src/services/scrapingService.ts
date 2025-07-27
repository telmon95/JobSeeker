// job-app-automator/server/src/services/scrapingService.ts
import axios from 'axios';
import { Job } from '../models/Job';

// This function is now an API caller, not a scraper.
// Its job is to fetch jobs from the Adzuna API and save them to our database.
export const scrapeJobs = async () => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  // First, we check if the API keys are present in the .env file.
  if (!appId || !appKey) {
    console.error('Adzuna API credentials are not set in the .env file.');
    // We throw an error to stop the process if keys are missing.
    throw new Error('Adzuna API credentials are not set in the .env file.');
  }

  // We construct the URL for the Adzuna API request.
  // You can customize the country ('us'), search term ('what'), and results per page.
  const targetUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=software%20engineer&content-type=application/json`;

  console.log('Fetching jobs from Adzuna API...');

  try {
    // We use axios to make a GET request to the Adzuna API.
    const response = await axios.get(targetUrl);
    const apiJobs = response.data.results;

    if (!apiJobs || apiJobs.length === 0) {
      console.log('Adzuna API returned no job results for this search.');
      return; // Exit the function if no jobs were found.
    }

    console.log(`Found ${apiJobs.length} jobs from the API. Saving new jobs to the database...`);

    // We loop through the jobs returned from the API.
    for (const job of apiJobs) {
      try {
        // To avoid duplicates, we check if a job with the same URL already exists in our DB.
        const existingJob = await Job.findOne({ applyUrl: job.redirect_url });
        
        if (!existingJob) {
          // If the job does not exist, we create a new Job document...
          const newJob = new Job({
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            description: job.description,
            applyUrl: job.redirect_url, // This is the direct link to the job posting.
          });
          // ...and save it to the database.
          await newJob.save();
          console.log(`Saved new job: ${newJob.title}`);
        }
      } catch (error) {
        // This catches errors during the database save operation for a single job.
        console.error(`Error saving job titled: ${job.title}`, error);
      }
    }
  } catch (error: any) {
    // This catches errors if the main API call to Adzuna fails (e.g., network error, invalid keys).
    console.error('Failed to fetch jobs from Adzuna API:', error.response?.data || error.message);
    // We re-throw the error so the controller that called this function knows it failed.
    throw error;
  }
};