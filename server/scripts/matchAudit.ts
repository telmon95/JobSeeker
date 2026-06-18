/**
 * Quick audit of match quality — run: npx ts-node scripts/matchAudit.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Job } from '../src/models/Job';
import { calculateJobMatch } from '../src/services/matchScoringService';
import { normalizeParsedProfile } from '../src/utils/profileHelpers';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const user = await User.findOne({ email: 'telmonm@gmail.com' }).select('parsedCV fullName');
  if (!user?.parsedCV) {
    console.log('No CV found');
    process.exit(1);
  }

  const profile = normalizeParsedProfile(user.parsedCV as Record<string, unknown>);
  const jobs = await Job.find({}).sort({ createdAt: -1 }).limit(10).lean();

  console.log(`\nProfile: ${profile.name}`);
  console.log(`CV skills (${profile.skills.length}):`, profile.skills.slice(0, 15).join(', '));
  console.log(`Headline: ${profile.headline || '—'}`);
  console.log(`Location: ${profile.location || '—'}\n`);

  const scores: number[] = [];
  for (const job of jobs) {
    const match = calculateJobMatch(
      profile,
      job.description,
      job.parsedDescription as never,
      job.title,
      job.location ?? undefined
    );
    scores.push(match.score);
    console.log(
      `${match.score}% (${match.matchLabel}) | skills:${match.breakdown.skills} title:${match.breakdown.title} | ${job.title.slice(0, 40)}`
    );
  }

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  console.log(`\nAvg top-10 score: ${avg}%`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
