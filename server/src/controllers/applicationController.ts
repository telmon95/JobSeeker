import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { User } from '../models/User';
import OpenAI from 'openai';
import puppeteer from 'puppeteer';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('FATAL ERROR: Your OPENAI_API_KEY is not set in the .env file.');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateCoverLetter = async (req: AuthRequest, res: Response) => {
    const { jobId } = req.body;
    const userId = req.user._id;

    try {
        const job = await Job.findById(jobId);
        const user = await User.findById(userId);

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (!user || !user.parsedCV) {
            return res.status(400).json({ message: 'User profile or CV data is missing. Please upload your CV first.' });
        }

        const prompt = `
            Generate a professional and enthusiastic cover letter for the following job.
            Use the provided user resume data to highlight relevant skills and experience.
            The tone should be confident but not arrogant. Keep it concise, around 3-4 paragraphs.
            Address it to the "Hiring Team".

            --- JOB DETAILS ---
            Job Title: ${job.title}
            Company: ${job.company}
            Job Description: ${job.description}

            --- USER RESUME DATA ---
            User Name: ${user.parsedCV.name}
            User Email: ${user.parsedCV.email}
            User Skills: ${user.parsedCV.skills.join(', ')}
            User Experience: ${user.parsedCV.experience}
            
            --- END OF DATA ---

            Begin the cover letter now.
        `;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        const generatedLetter = completion.choices[0].message.content;

        if (!generatedLetter) {
            throw new Error('AI failed to generate a cover letter.');
        }

        const application = await Application.findOneAndUpdate(
            { job: jobId, user: userId },
            { generatedCoverLetter: generatedLetter, status: 'BOOKMARKED' },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: 'Cover letter generated successfully!',
            coverLetter: generatedLetter,
            application,
        });
    } catch (error: any) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ message: 'Server error during AI generation.', error: error.message });
    }
};

export const autoApplyToJob = async (req: AuthRequest, res: Response) => {
    const { jobId } = req.body;
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        const job = await Job.findById(jobId);

        if (!job || !job.applyUrl) {
            return res.status(404).json({ message: 'Job with a valid apply URL not found.' });
        }
        if (!user || !user.parsedCV) {
            return res.status(400).json({ message: 'Please upload your CV before attempting to apply.' });
        }

        console.log(`Starting auto-apply process for: ${job.title}`);
        const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        await page.goto(job.applyUrl, { waitUntil: 'networkidle2' });
        console.log(`Landed on application page: ${page.url()}`);

        console.log('Puppeteer logic would run here to fill the form.');
        
        await page.screenshot({ path: `application-attempt-${jobId}.png` });

        await browser.close();

        await Application.findOneAndUpdate(
            { job: jobId, user: userId },
            { status: 'APPLIED' },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: `Successfully simulated auto-apply for ${job.title}. A screenshot was saved.` });
    } catch (error: any) {
        console.error('Error during auto-apply process:', error);
        res.status(500).json({ message: 'Server error during auto-apply.', error: error.message });
    }
};