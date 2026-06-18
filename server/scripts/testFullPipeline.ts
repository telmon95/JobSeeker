import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User';
import { scrapeJobs } from '../src/services/scrapingService';
import { enrichJobsForUser } from '../src/services/jobEnrichmentService';
import { getDashboardStats } from '../src/services/statsService';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const user = await User.findOne({ email: 'telmonm@gmail.com' });
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  const userId = user._id.toString();
  console.log('User:', user.email, 'CV:', Boolean(user.parsedCV));

  try {
    console.log('\n1. Scraping...');
    const scrape = await scrapeJobs({
      source: 'both',
      query: 'Full-Stack Software Engineer',
      location: 'Arcadia, Pretoria',
      datePosted: 'week',
    });
    console.log('Scrape:', scrape.found, 'found');

    console.log('\n2. Enriching...');
    const jobs = await enrichJobsForUser(userId);
    console.log('Enriched:', jobs.length, 'jobs, top score:', jobs[0]?.match?.score);

    console.log('\n3. Stats...');
    const stats = await getDashboardStats(userId);
    console.log('Stats OK, avgMatch:', stats.avgMatch);
  } catch (e) {
    console.error('\nPIPELINE FAILED:', e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
