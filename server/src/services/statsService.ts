import { Application } from '../models/Application';
import { Job } from '../models/Job';
import { JobMatch } from '../models/JobMatch';
import { SearchRun } from '../models/SearchRun';
import { User } from '../models/User';

export interface DashboardStats {
  cvReady: boolean;
  profileName?: string;
  totalJobsInDb: number;
  rankedJobs: number;
  avgMatch: number | null;
  strongMatches: number;
  searchRuns: number;
  lastSearchAt: string | null;
  applicationsTotal: number;
  applicationsApplied: number;
  coverLettersGenerated: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const user = await User.findById(userId).select('parsedCV fullName');
  const cvReady = Boolean(user?.parsedCV);

  const [
    totalJobsInDb,
    matchDocs,
    searchRunCount,
    lastSearch,
    applicationsTotal,
    applicationsApplied,
    coverLettersGenerated,
  ] = await Promise.all([
    Job.countDocuments(),
    JobMatch.find({ user: userId }).lean(),
    SearchRun.countDocuments({ user: userId }),
    SearchRun.findOne({ user: userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
    Application.countDocuments({ user: userId }),
    Application.countDocuments({ user: userId, status: 'APPLIED' }),
    Application.countDocuments({
      user: userId,
      generatedCoverLetter: { $exists: true, $nin: [null, ''] },
    }),
  ]);

  const scores = matchDocs.map((m) => m.score);
  const avgMatch = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null;
  const strongMatches = scores.filter((s) => s >= 70).length;

  const parsedCV = user?.parsedCV as { name?: string } | undefined;

  return {
    cvReady,
    profileName: (user?.fullName as string | undefined) || parsedCV?.name,
    totalJobsInDb,
    rankedJobs: matchDocs.length,
    avgMatch,
    strongMatches,
    searchRuns: searchRunCount,
    lastSearchAt: lastSearch?.createdAt?.toISOString() ?? null,
    applicationsTotal,
    applicationsApplied,
    coverLettersGenerated,
  };
}
