import { ParsedJobRequirements, ParsedProfile } from '../types/parsedDocuments';
import { JobMatchResult, MatchBreakdown } from '../types/matchScore';

const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'react', 'node.js', 'node', 'mongodb',
  'sql', 'postgresql', 'mysql', 'redis', 'aws', 'docker', 'kubernetes', 'git',
  'html', 'css', 'java', 'c++', 'c#', 'csharp', '.net', 'dotnet', 'go', 'rust',
  'angular', 'vue', 'express', 'fastapi', 'django', 'flask', 'rest', 'graphql',
  'linux', 'agile', 'scrum', 'ci/cd', 'tensorflow', 'pytorch', 'machine learning',
  'spring', 'ruby', 'rails', 'php', 'laravel', 'swift', 'kotlin', 'scala',
  'azure', 'gcp', 'terraform', 'jenkins', 'figma', 'next.js', 'nextjs', 'vite',
  'tailwind', 'sass', 'webpack', 'babel', 'nestjs', 'prisma', 'supabase',
  'firebase', 'elasticsearch', 'rabbitmq', 'kafka', 'microservices', 'api',
];

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'javascript'],
  typescript: ['ts', 'typescript'],
  'node.js': ['node', 'nodejs', 'node.js'],
  csharp: ['c#', 'csharp', '.net', 'dotnet'],
  react: ['react', 'reactjs', 'react.js'],
  postgresql: ['postgres', 'postgresql', 'psql'],
  mongodb: ['mongo', 'mongodb'],
  'ci/cd': ['cicd', 'ci/cd', 'ci cd', 'devops'],
  'machine learning': ['ml', 'machine learning', 'ai'],
};

const NOISE_SKILLS = new Set([
  'the', 'you', 'our', 'and', 'for', 'with', 'your', 'will', 'must', 'have',
  'principal', 'framework', 'financial', 'science', 'senior', 'junior', 'lead',
  'remote', 'hybrid', 'contract', 'permanent', 'apis', 'api', 'restful',
  'experience', 'years', 'team', 'work', 'role', 'position', 'company',
  'south', 'africa', 'based', 'looking', 'ideal', 'candidate', 'skills',
]);

const TITLE_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'in', 'at', 'of', 'with',
  'senior', 'junior', 'lead', 'principal', 'staff', 'mid', 'level',
  'remote', 'hybrid', 'contract', 'permanent', 'part', 'time', 'full',
]);

function normalize(skill: string): string {
  return skill.toLowerCase().trim().replace(/\./g, '').replace(/\s+/g, ' ');
}

function canonicalSkill(skill: string): string {
  const n = normalize(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((a) => n === normalize(a) || n.includes(normalize(a)))) {
      return canonical;
    }
  }
  return n;
}

function skillsMatch(cvSkill: string, jobSkill: string): boolean {
  const a = canonicalSkill(cvSkill);
  const b = canonicalSkill(jobSkill);
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !TITLE_STOP_WORDS.has(t));
}

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of TECH_SKILLS) {
    const pattern = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${pattern}\\b`, 'i').test(lower)) {
      found.add(canonicalSkill(skill));
    }
  }

  return Array.from(found);
}

function collectCvSkills(profile: ParsedProfile): string[] {
  const pool = new Set<string>();

  for (const skill of profile.skills || []) {
    if (skill.trim()) pool.add(canonicalSkill(skill));
  }

  for (const exp of profile.experience || []) {
    for (const skill of extractSkillsFromText(`${exp.title} ${exp.description}`)) {
      pool.add(skill);
    }
    for (const token of tokenizeTitle(exp.title)) {
      if (token.length > 3) pool.add(token);
    }
  }

  for (const project of profile.projects || []) {
    for (const tech of project.technologies || []) {
      pool.add(canonicalSkill(tech));
    }
    for (const skill of extractSkillsFromText(project.description || '')) {
      pool.add(skill);
    }
  }

  if (profile.headline) {
    for (const skill of extractSkillsFromText(profile.headline)) pool.add(skill);
    for (const token of tokenizeTitle(profile.headline)) pool.add(token);
  }

  return Array.from(pool);
}

function getJobSkills(
  jobTitle: string,
  description: string,
  parsed?: ParsedJobRequirements | null
): { all: string[]; required: string[] } {
  const required = (parsed?.requiredSkills || [])
    .map((s) => canonicalSkill(s))
    .filter((s) => s && !NOISE_SKILLS.has(s));

  const preferred = (parsed?.preferredSkills || [])
    .map((s) => canonicalSkill(s))
    .filter((s) => s && !NOISE_SKILLS.has(s));

  const fromText = extractSkillsFromText(`${jobTitle} ${description}`);
  const combined = [...required, ...preferred, ...fromText, ...extractSkillsFromText(jobTitle)];

  const unique: string[] = [];
  for (const skill of combined) {
    const trimmed = skill.trim();
    if (!trimmed || NOISE_SKILLS.has(trimmed)) continue;
    if (!unique.some((s) => skillsMatch(s, trimmed))) {
      unique.push(trimmed);
    }
  }

  return {
    all: unique.slice(0, 14),
    required: required.length ? required : unique.slice(0, 8),
  };
}

function scoreSkills(cvSkills: string[], jobSkills: string[], requiredSkills: string[]): {
  score: number;
  strongMatches: string[];
  missingSkills: string[];
} {
  if (!cvSkills.length || !jobSkills.length) {
    return { score: 0, strongMatches: [], missingSkills: jobSkills.slice(0, 6) };
  }

  const strongMatches: string[] = [];
  const missingSkills: string[] = [];
  const targets = requiredSkills.length ? requiredSkills : jobSkills;

  for (const jobSkill of targets) {
    const matched = cvSkills.some((cv) => skillsMatch(cv, jobSkill));
    if (matched) {
      if (!strongMatches.some((s) => skillsMatch(s, jobSkill))) {
        strongMatches.push(jobSkill);
      }
    } else {
      missingSkills.push(jobSkill);
    }
  }

  const baseRatio = targets.length ? strongMatches.length / targets.length : 0;

  const bonusMatches = jobSkills.filter(
    (js) =>
      !targets.some((t) => skillsMatch(t, js)) &&
      cvSkills.some((cv) => skillsMatch(cv, js))
  );
  const bonus = Math.min(15, bonusMatches.length * 3);

  const score = Math.min(100, Math.round(baseRatio * 85 + bonus));
  return {
    score,
    strongMatches: strongMatches.slice(0, 8),
    missingSkills: missingSkills.slice(0, 8),
  };
}

function scoreTitle(jobTitle: string, profile: ParsedProfile): number {
  const jobTokens = new Set(tokenizeTitle(jobTitle));
  if (!jobTokens.size) return 0;

  const cvTitles = [
    profile.headline || '',
    ...(profile.experience || []).slice(0, 3).map((e) => e.title),
  ];

  let best = 0;
  for (const cvTitle of cvTitles) {
    const cvTokens = tokenizeTitle(cvTitle);
    if (!cvTokens.length) continue;
    const overlap = cvTokens.filter((t) => jobTokens.has(t) || [...jobTokens].some((j) => j.includes(t) || t.includes(j)));
    const ratio = overlap.length / Math.max(jobTokens.size, cvTokens.length);
    best = Math.max(best, ratio);
  }

  const roleKeywords = ['engineer', 'developer', 'programmer', 'analyst', 'architect', 'fullstack', 'full-stack', 'stack'];
  const jobHasRole = roleKeywords.some((k) => jobTitle.toLowerCase().includes(k));
  const cvHasRole = roleKeywords.some((k) =>
    cvTitles.join(' ').toLowerCase().includes(k)
  );
  if (jobHasRole && cvHasRole) best = Math.max(best, 0.55);

  return Math.min(100, Math.round(best * 100));
}

function scoreLocation(jobLocation: string | undefined, profileLocation: string | undefined): number {
  if (!jobLocation || !profileLocation) return 50;

  const job = normalize(jobLocation);
  const profile = normalize(profileLocation);

  if (job === profile || job.includes(profile) || profile.includes(job)) return 100;

  const jobParts = job.split(/[,\s]+/).filter((p) => p.length > 3);
  const profileParts = profile.split(/[,\s]+/).filter((p) => p.length > 3);
  const overlap = jobParts.filter((p) => profileParts.some((pp) => p.includes(pp) || pp.includes(p)));

  if (overlap.length >= 2) return 90;
  if (overlap.length === 1) return 75;

  if (job.includes('south africa') && profile.includes('south africa')) return 65;
  if (job.includes('remote')) return 60;

  return 35;
}

function scoreExperience(jobDescription: string, profile: ParsedProfile): number {
  const desc = jobDescription.toLowerCase();
  const yearsMatch = desc.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  const requiredYears = yearsMatch ? parseInt(yearsMatch[1], 10) : null;

  const expCount = profile.experience?.length || 0;
  let estimatedYears = expCount >= 3 ? 5 : expCount >= 2 ? 3 : expCount >= 1 ? 2 : 0;

  if (!requiredYears) return estimatedYears >= 2 ? 80 : 60;
  if (estimatedYears >= requiredYears) return 100;
  if (estimatedYears >= requiredYears - 1) return 75;
  return Math.max(30, Math.round((estimatedYears / requiredYears) * 70));
}

function matchLabel(score: number): JobMatchResult['matchLabel'] {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
}

export function calculateJobMatch(
  profile: ParsedProfile,
  jobDescription: string,
  parsedJob?: ParsedJobRequirements | null,
  jobTitle?: string,
  jobLocation?: string
): JobMatchResult {
  const title = jobTitle || '';
  const cvSkills = collectCvSkills(profile);
  const { all: jobSkills, required: requiredSkills } = getJobSkills(title, jobDescription, parsedJob);

  const skillsResult = scoreSkills(cvSkills, jobSkills, requiredSkills);
  const breakdown: MatchBreakdown = {
    skills: skillsResult.score,
    title: scoreTitle(title, profile),
    location: scoreLocation(jobLocation, profile.location),
    experience: scoreExperience(jobDescription, profile),
  };

  const score = Math.min(
    100,
    Math.round(
      breakdown.skills * 0.5 +
        breakdown.title * 0.28 +
        breakdown.location * 0.12 +
        breakdown.experience * 0.1
    )
  );

  return {
    score,
    strongMatches: skillsResult.strongMatches,
    missingSkills: skillsResult.missingSkills,
    jobSkills,
    breakdown,
    matchLabel: matchLabel(score),
  };
}

export function getSourceLabel(applyUrl: string): string {
  try {
    const host = new URL(applyUrl).hostname.replace('www.', '');
    if (host.includes('adzuna')) return 'Adzuna';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('indeed')) return 'Indeed';
    if (host.includes('glassdoor')) return 'Glassdoor';
    if (host.includes('careers')) return 'Company site';
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch {
    return 'Original source';
  }
}
