import { JobMatch } from '../models/JobMatch';
import { EnrichedJob } from './jobEnrichmentService';

export async function persistUserJobMatches(
  userId: string,
  enrichedJobs: EnrichedJob[]
): Promise<void> {
  const withScores = enrichedJobs.filter((j) => j.match);

  await Promise.all(
    withScores.map((job) =>
      JobMatch.findOneAndUpdate(
        { user: userId, job: job._id },
        {
          score: job.match!.score,
          strongMatches: job.match!.strongMatches,
          missingSkills: job.match!.missingSkills,
          jobSkills: job.match!.jobSkills,
        },
        { upsert: true, new: true }
      )
    )
  );
}
