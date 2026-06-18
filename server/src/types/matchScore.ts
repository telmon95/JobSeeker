export interface MatchBreakdown {
  skills: number;
  title: number;
  location: number;
  experience: number;
}

export interface JobMatchResult {
  score: number;
  strongMatches: string[];
  missingSkills: string[];
  jobSkills: string[];
  breakdown: MatchBreakdown;
  matchLabel: 'Excellent' | 'Strong' | 'Good' | 'Fair' | 'Low';
}
