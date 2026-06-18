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
  description?: string;
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
    sectionsFound?: string[];
    parser?: 'heuristic' | 'openai';
  };
}

export interface UserPreferences {
  searchQuery?: string;
  searchLocation?: string;
  searchRegions?: string[];
  searchSource?: 'google' | 'adzuna' | 'both';
  datePosted?: 'today' | '3days' | 'week' | 'month';
  minMatchScore?: number;
}

export interface CvMeta {
  originalFileName?: string;
  format?: string;
  uploadedAt?: string;
  parser?: string;
}

export interface UserProfile {
  _id: string;
  email: string;
  fullName?: string;
  parsedCV?: ParsedProfile;
  preferences?: UserPreferences;
  cvMeta?: CvMeta;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  _id: string;
  email: string;
  fullName?: string;
  parsedCV?: ParsedProfile;
  preferences?: UserPreferences;
  token: string;
}
