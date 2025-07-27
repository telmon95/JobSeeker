// job-app-automator/server/src/controllers/jobController.ts
import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { scrapeJobs } from '../services/scrapingService';

// @desc    Get all jobs from the database
// @route   GET /api/jobs
export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 }); // Get newest jobs first
    res.status(200).json(jobs);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching jobs.', error: error.message });
  }
};

// @desc    Trigger the web scraper
// @route   POST /api/jobs/scrape
export const triggerScraping = async (req: Request, res: Response) => {
    try {
        console.log('Scraping process initiated...');
        await scrapeJobs(); // This can take a while
        console.log('Scraping process completed.');
        res.status(200).json({ message: 'Job scraping completed successfully.' });
    } catch (error: any) {
        console.error('Error during scraping process:', error);
        res.status(500).json({ message: 'Server error during scraping.', error: error.message });
    }
}