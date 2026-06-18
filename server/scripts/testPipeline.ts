import 'dotenv/config';
import mongoose from 'mongoose';
import { scrapeJobs } from '../src/services/scrapingService';
import { isGoogleJobsConfigured } from '../src/services/googleJobsService';

async function main() {
  console.log('Env check:');
  console.log('  SERPAPI_API_KEY:', Boolean(process.env.SERPAPI_API_KEY));
  console.log('  ADZUNA_APP_ID:', Boolean(process.env.ADZUNA_APP_ID));
  console.log('  ADZUNA_APP_KEY:', Boolean(process.env.ADZUNA_APP_KEY));
  console.log('  Google configured:', isGoogleJobsConfigured());

  await mongoose.connect(process.env.MONGO_URI!);

  try {
    const result = await scrapeJobs({
      source: isGoogleJobsConfigured() ? 'both' : 'adzuna',
      query: 'Full-Stack Software Engineer',
      location: 'Pretoria, South Africa',
      datePosted: 'week',
    });
    console.log('\nScrape OK:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('\nScrape FAILED:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
