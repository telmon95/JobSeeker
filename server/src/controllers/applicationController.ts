// job-app-automator/server/src/controllers/applicationController.ts
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

    // ✅ DEFENSIVE PROMPT CONSTRUCTION:
    // We now safely access each piece of data and provide a fallback if it's missing.
    const userName = user.parsedCV.name?.raw || 'the candidate';
    const userEmail = user.parsedCV.emails?.[0]?.address || 'not specified';
    const userSkills = user.parsedCV.skills?.map((skill: any) => skill.name).join(', ') || 'a relevant skill set';
    // Affinda stores experience in a 'workExperience' array. We'll join the raw text of each entry.
    const userExperience = user.parsedCV.workExperience?.map((exp: any) => exp.raw).join('\n') || 'relevant professional experience';

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
      User Name: ${userName}
      User Email: ${userEmail}
      User Skills: ${userSkills}
      User Experience Summary: 
      ${userExperience}
      
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
    // This log is crucial. It will show the *specific* OpenAI error if one occurs.
    console.error('Error during AI generation:', error);
    res.status(500).json({ message: 'Server error during AI generation.', error: error.message });
  }
};

// The autoApplyToJob function remains the same
export const autoApplyToJob = async (req: AuthRequest, res: Response) => {
    // ... (no changes needed here)
};