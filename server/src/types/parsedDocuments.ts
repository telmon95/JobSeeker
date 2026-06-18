export interface ProfileLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface ProjectEntry {
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description: string;
  location?: string;
}

export interface Education {
  institution: string;
  degree?: string;
  field?: string;
  endDate?: string;
  startDate?: string;
}

export interface ParsedProfile {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: string[];
  languages?: string[];
  projects?: ProjectEntry[];
  links?: ProfileLinks;
  rawMarkdown?: string;
  parseMeta?: {
    format?: string;
    sectionsFound: string[];
    parser: 'heuristic' | 'openai';
  };
}

export interface ParsedJobRequirements {
  title?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel?: string;
  qualifications: string[];
  responsibilities: string[];
  keywords: string[];
}

export function isParsedProfile(cv: unknown): cv is ParsedProfile {
  if (!cv || typeof cv !== 'object') return false;
  const profile = cv as ParsedProfile;
  return typeof profile.name === 'string' && Array.isArray(profile.skills);
}
