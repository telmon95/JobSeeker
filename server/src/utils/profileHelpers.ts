import { ParsedProfile, isParsedProfile } from '../types/parsedDocuments';

function legacyString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

export function normalizeParsedProfile(cv: Record<string, unknown>): ParsedProfile {
  if (isParsedProfile(cv)) {
    return cv;
  }

  const name =
    legacyString(cv.name) ||
    legacyString((cv.name as { raw?: string })?.raw) ||
    'Unknown';

  const email =
    legacyString(cv.email) ||
    legacyString((cv.emails as { address?: string }[])?.[0]?.address);

  const skills = Array.isArray(cv.skills)
    ? cv.skills.map((skill) =>
        typeof skill === 'string' ? skill : (skill as { name?: string }).name || ''
      ).filter(Boolean)
    : [];

  const experience = Array.isArray(cv.workExperience)
    ? cv.workExperience.map((entry) => ({
        company: legacyString((entry as { company?: string }).company) || 'Unknown',
        title: legacyString((entry as { title?: string }).title) || 'Role',
        description: legacyString((entry as { raw?: string }).raw) || legacyString((entry as { description?: string }).description) || '',
      }))
    : [];

  return {
    name,
    email,
    skills,
    experience,
    education: Array.isArray(cv.education) ? (cv.education as ParsedProfile['education']) : [],
    certifications: Array.isArray(cv.certifications) ? (cv.certifications as string[]) : [],
    summary: legacyString(cv.summary),
    location: legacyString(cv.location),
    headline: legacyString(cv.headline),
    languages: Array.isArray(cv.languages) ? (cv.languages as string[]) : undefined,
    projects: Array.isArray(cv.projects) ? (cv.projects as ParsedProfile['projects']) : undefined,
    links: cv.links as ParsedProfile['links'],
    parseMeta: cv.parseMeta as ParsedProfile['parseMeta'],
  };
}

export function formatProfileForPrompt(profile: ParsedProfile): {
  name: string;
  email: string;
  skills: string;
  experience: string;
  education: string;
  certifications: string;
  summary: string;
} {
  return {
    name: profile.name || 'the candidate',
    email: profile.email || 'not specified',
    skills: profile.skills.length ? profile.skills.join(', ') : 'a relevant skill set',
    experience: profile.experience.length
      ? profile.experience
          .map((exp) => `${exp.title} at ${exp.company}: ${exp.description}`)
          .join('\n')
      : 'relevant professional experience',
    education: profile.education.length
      ? profile.education
          .map((edu) => `${edu.degree || 'Degree'} at ${edu.institution}`)
          .join(', ')
      : 'not specified',
    certifications: profile.certifications.length
      ? profile.certifications.join(', ')
      : 'none listed',
    summary: profile.summary || 'not provided',
  };
}
