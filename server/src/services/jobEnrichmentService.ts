import { Job } from '../models/Job';
import { User } from '../models/User';
import { calculateJobMatch, getSourceLabel } from './matchScoringService';
import { normalizeParsedProfile } from '../utils/profileHelpers';
import { isParsedProfile, ParsedJobRequirements, ParsedProfile } from '../types/parsedDocuments';
import { persistUserJobMatches } from './matchPersistenceService';
import { postedAtSortKey } from '../utils/postedAtSort';
import { buildJobCmsFields, JobCmsContent } from '../utils/jobCmsFields';
import { inferWorkTypes, WorkTypeId } from '../utils/workType';

export interface EnrichedJob {
  _id: unknown;
  title: string;
  company: string;
  location?: string;
  description: string;
  descriptionPreview: string;
  applyUrl: string;
  source: string;
  postedAt?: string;
  salary?: string;
  scheduleType?: string;
  scrapedFrom?: string;
  createdAt: Date;
  match: ReturnType<typeof calculateJobMatch> | null;
  workTypes: WorkTypeId[];
}

export interface EnrichedJobDetail extends EnrichedJob {
  cms: JobCmsContent;
}

function enrichSingleJob(
  job: {
    _id: unknown;
    title: string;
    company: string;
    location?: string | null;
    description: string;
    parsedDescription?: unknown;
    applyUrl: string;
    postedAt?: string | null;
    salary?: string | null;
    scheduleType?: string | null;
    scrapedFrom?: string | null;
    createdAt: Date;
  },
  profile: ParsedProfile | null
): EnrichedJob {
  const source = getSourceLabel(job.applyUrl);
  const base = {
    _id: job._id,
    title: job.title,
    company: job.company,
    location: job.location ?? undefined,
    description: job.description,
    descriptionPreview:
      job.description.slice(0, 220).trim() + (job.description.length > 220 ? '…' : ''),
    applyUrl: job.applyUrl,
    source,
    postedAt: job.postedAt ?? undefined,
    salary: job.salary ?? undefined,
    scheduleType: job.scheduleType ?? undefined,
    scrapedFrom: job.scrapedFrom ?? undefined,
    createdAt: job.createdAt,
  };

  if (!profile) {
    return {
      ...base,
      match: null,
      workTypes: inferWorkTypes({
        title: job.title,
        location: job.location ?? undefined,
        description: job.description,
        scheduleType: job.scheduleType ?? undefined,
      }),
    };
  }

  const match = calculateJobMatch(
    profile,
    job.description,
    job.parsedDescription as ParsedJobRequirements | null,
    job.title,
    job.location ?? undefined
  );

  return {
    ...base,
    match,
    workTypes: inferWorkTypes({
      title: job.title,
      location: job.location ?? undefined,
      description: job.description,
      scheduleType: job.scheduleType ?? undefined,
    }),
  };
}

export async function enrichJobForUser(
  userId: string,
  jobId: string
): Promise<EnrichedJobDetail | null> {
  const job = await Job.findById(jobId).lean();
  if (!job) return null;

  const user = await User.findById(userId).select('parsedCV');
  const hasCV = user?.parsedCV && isParsedProfile(user.parsedCV);
  const profile: ParsedProfile | null = hasCV
    ? normalizeParsedProfile(user!.parsedCV as Record<string, unknown>)
    : null;

  const enriched = enrichSingleJob(job, profile);
  const cms = buildJobCmsFields(
    job.title,
    job.company,
    job.description,
    job.parsedDescription as ParsedJobRequirements | null,
    {
      company: job.company,
      location: job.location ?? undefined,
      salary: job.salary ?? undefined,
      scheduleType: job.scheduleType ?? undefined,
      postedAt: job.postedAt ?? undefined,
      source: enriched.source,
    }
  );

  return { ...enriched, cms };
}

export async function enrichJobsForUser(userId: string): Promise<EnrichedJob[]> {
  const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
  const user = await User.findById(userId).select('parsedCV');

  const hasCV = user?.parsedCV && isParsedProfile(user.parsedCV);
  const profile: ParsedProfile | null = hasCV
    ? normalizeParsedProfile(user!.parsedCV as Record<string, unknown>)
    : null;

  const enriched: EnrichedJob[] = jobs.map((job) => enrichSingleJob(job, profile));

  enriched.sort((a, b) => {
    if (profile) {
      const scoreDiff = (b.match?.score ?? 0) - (a.match?.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }
    const postedDiff =
      postedAtSortKey(b.postedAt ?? undefined) - postedAtSortKey(a.postedAt ?? undefined);
    if (postedDiff !== 0) return postedDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (profile) {
    await persistUserJobMatches(userId, enriched);
  }

  return enriched;
}
