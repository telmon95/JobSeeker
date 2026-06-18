export interface JobMatch {
  score: number;
  strongMatches: string[];
  missingSkills: string[];
  breakdown?: {
    skills: number;
    title: number;
    location: number;
    experience: number;
  };
  matchLabel?: string;
}

export interface JobCmsContent {
  about: string;
  responsibilities: string[];
  qualifications: string[];
  meta: {
    company: string;
    location?: string;
    salary?: string;
    scheduleType?: string;
    postedAt?: string;
    source: string;
  };
}

export interface JobListing {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  descriptionPreview: string;
  applyUrl: string;
  source: string;
  postedAt?: string;
  salary?: string;
  scheduleType?: string;
  scrapedFrom?: string;
  match: JobMatch | null;
  workTypes?: string[];
}

export interface JobDetail extends JobListing {
  cms: JobCmsContent;
}
