import { Job } from '../models/Job';
import { extractJobRequirements } from './structureExtractionService';
import { ParsedJobRequirements } from '../types/parsedDocuments';

export async function ensureJobParsed(job: InstanceType<typeof Job>): Promise<ParsedJobRequirements> {
  if (job.parsedDescription) {
    return job.parsedDescription as ParsedJobRequirements;
  }

  const parsed = await extractJobRequirements(job.description, job.title);
  job.parsedDescription = parsed;
  await job.save();
  return parsed;
}

export function formatJobRequirementsForPrompt(requirements: ParsedJobRequirements): string {
  return [
    `Required Skills: ${requirements.requiredSkills.join(', ') || 'not specified'}`,
    `Preferred Skills: ${requirements.preferredSkills.join(', ') || 'not specified'}`,
    `Experience Level: ${requirements.experienceLevel || 'not specified'}`,
    `Qualifications: ${requirements.qualifications.join('; ') || 'not specified'}`,
    `Key Responsibilities: ${requirements.responsibilities.join('; ') || 'not specified'}`,
    `ATS Keywords: ${requirements.keywords.join(', ') || 'not specified'}`,
  ].join('\n');
}
