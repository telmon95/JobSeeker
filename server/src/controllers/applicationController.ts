import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { findUserByIdSafe } from '../services/userService';
import { openai } from '../config/openai';
import { ensureJobParsed, formatJobRequirementsForPrompt } from '../services/jobParsingService';
import { normalizeParsedProfile, formatProfileForPrompt } from '../utils/profileHelpers';
import { generateCoverLetterTemplate, isOpenAIQuotaError } from '../utils/coverLetterTemplate';
import { ParsedProfile } from '../types/parsedDocuments';

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const applications = await Application.find({ user: req.user._id })
      .populate('job')
      .sort({ updatedAt: -1 });

    res.status(200).json(applications);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch applications.', error: error.message });
  }
};

export const generateCoverLetter = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const userId = req.user._id;

  try {
    const job = await Job.findById(jobId);
    const user = await findUserByIdSafe(userId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    if (!user || !user.parsedCV) {
      return res.status(400).json({ message: 'Upload your CV on the Profile page before generating a cover letter.' });
    }

    const profile = normalizeParsedProfile(user.parsedCV as Record<string, unknown>);
    const profileFields = formatProfileForPrompt(profile);
    const jobRequirements = await ensureJobParsed(job);
    const structuredJobDetails = formatJobRequirementsForPrompt(jobRequirements);

    let generatedLetter: string;
    let usedTemplate = false;

    try {
      const prompt = `
      Generate a professional and enthusiastic cover letter for the following job.
      Use the provided user resume data to highlight relevant skills and experience.
      Reference specific required skills and responsibilities where the candidate has a strong match.
      The tone should be confident but not arrogant. Keep it concise, around 3-4 paragraphs.
      Address it to the "Hiring Team".

      --- JOB DETAILS ---
      Job Title: ${job.title}
      Company: ${job.company}
      Job Description: ${job.description}

      --- STRUCTURED JOB REQUIREMENTS ---
      ${structuredJobDetails}

      --- USER RESUME DATA ---
      User Name: ${profileFields.name}
      User Email: ${profileFields.email}
      Summary: ${profileFields.summary}
      User Skills: ${profileFields.skills}
      User Experience:
      ${profileFields.experience}
      Education: ${profileFields.education}
      Certifications: ${profileFields.certifications}

      --- END OF DATA ---

      Begin the cover letter now.
    `;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      generatedLetter = completion.choices[0].message.content || '';
      if (!generatedLetter) {
        throw new Error('AI failed to generate a cover letter.');
      }
    } catch (aiError) {
      if (!isOpenAIQuotaError(aiError)) {
        throw aiError;
      }
      console.warn('OpenAI quota/rate limit — using template cover letter fallback.');
      generatedLetter = generateCoverLetterTemplate({
        profile: profile as ParsedProfile,
        jobTitle: job.title,
        company: job.company,
        requiredSkills: jobRequirements.requiredSkills,
      });
      usedTemplate = true;
    }

    const application = await Application.findOneAndUpdate(
      { job: jobId, user: userId },
      { generatedCoverLetter: generatedLetter, status: 'BOOKMARKED' },
      { new: true, upsert: true }
    ).populate('job');

    res.status(200).json({
      message: usedTemplate
        ? 'Cover letter generated using template (AI quota limited).'
        : 'Cover letter generated successfully!',
      coverLetter: generatedLetter,
      application,
    });
  } catch (error: any) {
    console.error('Error during AI generation:', error);
    res.status(500).json({ message: 'Server error during AI generation.', error: error.message });
  }
};

export const applyToJob = async (req: AuthRequest, res: Response) => {
  const { jobId } = req.body;
  const userId = req.user._id;

  try {
    const job = await Job.findById(jobId);
    const user = await findUserByIdSafe(userId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    if (!user?.parsedCV) {
      return res.status(400).json({ message: 'Upload your CV on the Profile page before applying.' });
    }
    if (!job.applyUrl) {
      return res.status(400).json({ message: 'This job has no application link available.' });
    }

    const application = await Application.findOneAndUpdate(
      { job: jobId, user: userId },
      { status: 'APPLIED' },
      { new: true, upsert: true }
    ).populate('job');

    res.status(200).json({
      message: `Ready to apply to ${job.title} at ${job.company}. Complete your application on the employer site.`,
      applyUrl: job.applyUrl,
      application,
    });
  } catch (error: any) {
    console.error('Error applying to job:', error);
    res.status(500).json({ message: 'Server error while applying.', error: error.message });
  }
};

// Kept for backwards compatibility — delegates to applyToJob
export const autoApplyToJob = applyToJob;
