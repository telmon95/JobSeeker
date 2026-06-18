import {
  Education,
  ParsedProfile,
  ProfileLinks,
  ProjectEntry,
  WorkExperience,
} from '../types/parsedDocuments';
import { normalizeCvMarkdown } from './cvNormalize';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d{2,4})?/g;
const DATE_RANGE_RE =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|Present|Current|Now)/i;
const URL_RE = /https?:\/\/[^\s)>\]]+/gi;

const SECTION_ALIASES: Record<string, string[]> = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'about me',
    'about',
    'career summary',
    'executive summary',
    'personal statement',
    'objective',
    'career objective',
  ],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'employment',
    'work history',
    'career history',
    'relevant experience',
  ],
  education: [
    'education',
    'academic background',
    'academic qualifications',
    'qualifications',
    'academics',
  ],
  skills: [
    'skills',
    'technical skills',
    'core competencies',
    'competencies',
    'technologies',
    'tech stack',
    'tools',
    'key skills',
    'areas of expertise',
    'expertise',
    'skills & tools',
    'skills and tools',
  ],
  certifications: [
    'certifications',
    'certificates',
    'licenses',
    'licences',
    'professional certifications',
    'credentials',
  ],
  projects: ['projects', 'personal projects', 'selected projects', 'portfolio projects', 'key projects'],
  languages: ['languages', 'language skills'],
};

const TECH_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'React Native', 'Next.js', 'Angular', 'Vue', 'Vue.js', 'Svelte', 'Node.js', 'Express', 'NestJS',
  'Django', 'Flask', 'FastAPI', 'Spring Boot', '.NET', 'ASP.NET',
  'HTML', 'CSS', 'Tailwind', 'SASS', 'Bootstrap',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'SQLite', 'Oracle',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions',
  'CI/CD', 'DevOps', 'Linux', 'Bash', 'Shell', 'Git',
  'REST', 'GraphQL', 'gRPC', 'Microservices', 'API',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'NLP', 'LLM', 'OpenAI',
  'Agile', 'Scrum', 'Jira', 'Figma',
  'Cybersecurity', 'Penetration Testing', 'OWASP', 'Burp Suite',
  'Selenium', 'Cypress', 'Jest', 'Mocha', 'Playwright',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionPattern(headings: string[]): RegExp {
  const labels = headings.map(escapeRegex).join('|');
  return new RegExp(
    `(?:^|\\n)(?:#{1,3}\\s*|\\*\\*|__)?\\s*(?:${labels})\\s*(?:\\*\\*|__)?\\s*[:\\-]?\\s*\\n([\\s\\S]*?)(?=\\n(?:#{1,3}\\s*|\\*\\*|__)?\\s*(?:${Object.values(SECTION_ALIASES).flat().map(escapeRegex).join('|')})\\b|$)`,
    'i'
  );
}

function extractSection(markdown: string, key: keyof typeof SECTION_ALIASES): string {
  const match = markdown.match(sectionPattern(SECTION_ALIASES[key]));
  return match?.[1]?.trim() || '';
}

function findSectionsFound(markdown: string): string[] {
  return Object.keys(SECTION_ALIASES).filter((key) =>
    sectionPattern(SECTION_ALIASES[key as keyof typeof SECTION_ALIASES]).test(markdown)
  );
}

function extractLinks(markdown: string): ProfileLinks {
  const links: ProfileLinks = {};
  const urls = markdown.match(URL_RE) || [];

  for (const url of urls) {
    const clean = url.replace(/[.,;]+$/, '');
    if (/linkedin\.com/i.test(clean) && !links.linkedin) links.linkedin = clean;
    else if (/github\.com/i.test(clean) && !links.github) links.github = clean;
    else if (!links.portfolio && !/linkedin|github|mailto/i.test(clean)) links.portfolio = clean;
    else if (!links.website) links.website = clean;
  }

  const linkedinLabel = markdown.match(/linkedin\.com\/[^\s)>\]]+/i)?.[0];
  if (linkedinLabel && !links.linkedin) links.linkedin = `https://${linkedinLabel.replace(/^https?:\/\//, '')}`;

  const githubLabel = markdown.match(/github\.com\/[^\s)>\]]+/i)?.[0];
  if (githubLabel && !links.github) links.github = `https://${githubLabel.replace(/^https?:\/\//, '')}`;

  return links;
}

function extractName(markdown: string, email?: string): string {
  const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1 && h1.length < 80 && !EMAIL_RE.test(h1)) return h1;

  const h2 = markdown.match(/^##\s+([^#\n]+)$/m)?.[1]?.trim();
  if (h2 && h2.length < 80 && !EMAIL_RE.test(h2) && !/summary|experience|skills/i.test(h2)) return h2;

  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.startsWith('#')) continue;
    if (EMAIL_RE.test(line) || URL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/^(summary|experience|education|skills|profile|contact)/i.test(line)) continue;
    if (line.length > 2 && line.length < 60 && /^[A-Z][a-zA-Z\s.'-]+$/.test(line)) {
      return line;
    }
  }

  if (email) {
    const fromEmail = email.split('@')[0].replace(/[._]/g, ' ');
    if (fromEmail.length > 2) return fromEmail.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return 'Unknown';
}

function extractHeadline(markdown: string, name: string): string | undefined {
  const lines = markdown.split('\n').map((l) => l.trim()).filter(Boolean);
  const nameIdx = lines.findIndex((l) => l.includes(name) || l === `# ${name}`);
  if (nameIdx >= 0 && lines[nameIdx + 1]) {
    const next = lines[nameIdx + 1];
    if (
      next.length < 100 &&
      !EMAIL_RE.test(next) &&
      !next.startsWith('#') &&
      !/^(phone|email|linkedin|github)/i.test(next)
    ) {
      return next;
    }
  }
  return undefined;
}

function extractLocation(markdown: string): string | undefined {
  const top = markdown.slice(0, 800);
  const cityCountry = top.match(
    /\b([A-Z][a-zA-Z\s]+,\s*(?:South Africa|USA|UK|United Kingdom|Canada|Australia|[A-Z][a-zA-Z\s]+))\b/
  );
  if (cityCountry) return cityCountry[1].trim();

  const saCity = top.match(/\b(Pretoria|Johannesburg|Cape Town|Durban|Sandton|Midrand|Centurion)[^,\n]*/i);
  if (saCity) return saCity[0].trim();

  return undefined;
}

function parseSkillTokens(text: string): string[] {
  const found = new Set<string>();

  for (const skill of TECH_SKILLS) {
    if (new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i').test(text)) {
      found.add(skill);
    }
  }

  const lines = text.split('\n');
  for (const line of lines) {
    const cleaned = line.replace(/^[-•*#>\d.)\s]+/, '').trim();
    if (!cleaned || cleaned.length > 120) continue;

    if (/[:|]/.test(cleaned) && cleaned.length < 80) {
      const afterColon = cleaned.split(/[:|]/).slice(1).join(':');
      afterColon.split(/[,;|•/]/).forEach((part) => {
        const t = part.trim();
        if (t.length > 1 && t.length < 40) found.add(t);
      });
      continue;
    }

    if (/^[-•*]/.test(line) || cleaned.split(/[,;|•/]/).length > 1) {
      cleaned.split(/[,;|•/]/).forEach((part) => {
        const t = part.trim();
        if (t.length > 1 && t.length < 40 && !/^(skills|tools|languages)/i.test(t)) found.add(t);
      });
    }
  }

  return Array.from(found).slice(0, 40);
}

function extractSkills(markdown: string): string[] {
  const section = extractSection(markdown, 'skills');
  const fromSection = parseSkillTokens(section);
  if (fromSection.length >= 3) return fromSection;

  const fromAll = parseSkillTokens(markdown);
  return fromAll.slice(0, 40);
}

function splitExperienceBlocks(section: string): string[] {
  const byHeading = section.split(/\n(?=#{2,3}\s)/).filter((b) => b.trim());
  if (byHeading.length > 1) return byHeading;

  const byDoubleNewline = section.split(/\n\n+/).filter((b) => b.trim().length > 10);
  if (byDoubleNewline.length > 1) return byDoubleNewline;

  return section.split(/\n(?=[A-Z][^\n]{2,60}\n)/).filter((b) => b.trim());
}

function parseDateRange(block: string): { startDate?: string; endDate?: string } {
  const match = block.match(DATE_RANGE_RE);
  if (!match) return {};
  const parts = match[0].split(/\s*(?:[-–—]|to)\s*/i);
  return { startDate: parts[0]?.trim(), endDate: parts[1]?.trim() };
}

function parseExperienceBlock(block: string): WorkExperience | null {
  const lines = block
    .split('\n')
    .map((l) => l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const { startDate, endDate } = parseDateRange(block);
  const dateLineIdx = lines.findIndex((l) => DATE_RANGE_RE.test(l));

  let title = lines[0];
  let company = 'Unknown';
  let descriptionLines = lines.slice(1);

  const pipeMatch = lines[0].match(/^(.+?)\s*[|@]\s*(.+)$/);
  const atMatch = lines[0].match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  const dashMatch = lines[0].match(/^(.+?)\s*[-–—]\s*(.+)$/);

  if (pipeMatch) {
    const parts = lines[0].split('|').map((p) => p.trim());
    title = parts[0] || lines[0];
    company = (parts[1] || 'Unknown').replace(DATE_RANGE_RE, '').trim() || 'Unknown';
    descriptionLines = lines.slice(1);
  } else if (atMatch) {
    title = atMatch[1].trim();
    company = atMatch[2].trim();
    descriptionLines = lines.slice(1);
  } else if (lines.length >= 2 && !DATE_RANGE_RE.test(lines[1])) {
    if (lines[1].length < 60 && !lines[1].startsWith('-')) {
      company = lines[0];
      title = lines[1];
      descriptionLines = lines.slice(2);
    } else if (dashMatch) {
      title = dashMatch[1].trim();
      company = dashMatch[2].trim();
    }
  }

  if (dateLineIdx >= 0) {
    descriptionLines = descriptionLines.filter((_, i) => i + 1 !== dateLineIdx && _ !== lines[dateLineIdx]);
  }

  const description = descriptionLines
    .filter((l) => !DATE_RANGE_RE.test(l))
    .map((l) => l.replace(/^[-•*]\s*/, ''))
    .join(' ')
    .slice(0, 500);

  if (!title || title.length > 120) return null;

  return {
    title,
    company,
    startDate,
    endDate,
    description: description || title,
  };
}

function extractExperience(markdown: string): WorkExperience[] {
  const section = extractSection(markdown, 'experience');
  if (!section) return [];

  return splitExperienceBlocks(section)
    .map(parseExperienceBlock)
    .filter((e): e is WorkExperience => e !== null)
    .slice(0, 12);
}

function parseEducationLine(line: string): Education {
  const cleaned = line.replace(/^[-•*#>\s]+/, '').trim();
  const degreeMatch = cleaned.match(
    /^(Bachelor|Master|BSc|MSc|B\.?Sc|M\.?Sc|PhD|MBA|Diploma|Certificate|Honours|National Diploma)[^,]*,?\s*(.*)$/i
  );

  if (degreeMatch) {
    return {
      degree: degreeMatch[1].trim(),
      institution: degreeMatch[2]?.trim() || cleaned,
      field: undefined,
    };
  }

  const atMatch = cleaned.match(/^(.+?)\s*[-–—,|]\s*(.+)$/);
  if (atMatch) {
    return { degree: atMatch[1].trim(), institution: atMatch[2].trim() };
  }

  return { institution: cleaned };
}

function extractEducation(markdown: string): Education[] {
  const section = extractSection(markdown, 'education');
  if (!section) return [];

  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !/^education$/i.test(l))
    .map(parseEducationLine)
    .slice(0, 8);
}

function extractCertifications(markdown: string): string[] {
  const section = extractSection(markdown, 'certifications');
  const source = section || '';
  if (!source) return [];

  return source
    .split('\n')
    .map((l) => l.replace(/^[-•*#>\s]+/, '').trim())
    .filter((l) => l.length > 3)
    .slice(0, 15);
}

function extractLanguages(markdown: string): string[] {
  const section = extractSection(markdown, 'languages');
  if (!section) return [];

  return section
    .split(/[,;|\n]/)
    .map((l) => l.replace(/^[-•*#>\s]+/, '').trim())
    .filter((l) => l.length > 1 && l.length < 40)
    .slice(0, 10);
}

function extractProjects(markdown: string): ProjectEntry[] {
  const section = extractSection(markdown, 'projects');
  if (!section) return [];

  const projects: ProjectEntry[] = [];

  for (const block of splitExperienceBlocks(section)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const name = lines[0].replace(/^[-•*#>\s]+/, '');
    const description = lines.slice(1).join(' ').slice(0, 300);
    const technologies = parseSkillTokens(block).slice(0, 8);
    const url = block.match(URL_RE)?.[0];

    projects.push({
      name,
      description: description || undefined,
      technologies: technologies.length ? technologies : undefined,
      url,
    });
  }

  return projects.slice(0, 8);
}

export function extractProfileHeuristic(rawMarkdown: string, format = 'markdown'): ParsedProfile {
  const markdown = normalizeCvMarkdown(rawMarkdown);
  const sectionsFound = findSectionsFound(markdown);

  const emails = markdown.match(EMAIL_RE) || [];
  const email = emails[0];
  const phone = (markdown.match(PHONE_RE) || []).find((p) => p.replace(/\D/g, '').length >= 9);

  const name = extractName(markdown, email);
  const headline = extractHeadline(markdown, name);
  const location = extractLocation(markdown);
  const links = extractLinks(markdown);

  const summarySection = extractSection(markdown, 'summary');
  const summary =
    summarySection.slice(0, 800) ||
    markdown
      .split('\n')
      .slice(1, 4)
      .join(' ')
      .replace(EMAIL_RE, '')
      .replace(URL_RE, '')
      .trim()
      .slice(0, 400) ||
    undefined;

  const skills = extractSkills(markdown);
  const experience = extractExperience(markdown);
  const education = extractEducation(markdown);
  const certifications = extractCertifications(markdown);
  const languages = extractLanguages(markdown);
  const projects = extractProjects(markdown);

  return {
    name,
    email,
    phone,
    location,
    headline,
    summary: summary || undefined,
    skills,
    experience,
    education,
    certifications,
    languages: languages.length ? languages : undefined,
    projects: projects.length ? projects : undefined,
    links: Object.keys(links).length ? links : undefined,
    rawMarkdown: markdown,
    parseMeta: {
      format,
      sectionsFound,
      parser: 'heuristic',
    },
  };
}
