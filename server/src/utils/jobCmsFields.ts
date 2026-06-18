import { ParsedJobRequirements } from '../types/parsedDocuments';

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

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractBullets(block: string): string[] {
  return block
    .split(/\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter((line) => line.length > 10);
}

function splitBySectionHeaders(text: string): Record<string, string> {
  const headers =
    /(?:^|\n)\s*(about(?:\s+the\s+role)?|responsibilities|what you(?:'|')?ll do|requirements|qualifications|skills|who you are|the role)\s*[:\n]/gi;
  const sections: Record<string, string> = {};
  const parts = text.split(headers);
  const matches = [...text.matchAll(headers)];

  for (let i = 0; i < matches.length; i += 1) {
    const key = matches[i][1].toLowerCase().replace(/\s+/g, ' ');
    const body = parts[i + 1]?.trim() || '';
    if (body) sections[key] = body;
  }

  return sections;
}

export function buildJobCmsFields(
  title: string,
  company: string,
  description: string,
  parsed: ParsedJobRequirements | null | undefined,
  meta: JobCmsContent['meta']
): JobCmsContent {
  const plain = stripHtml(description);
  const sections = splitBySectionHeaders(plain);

  const responsibilities =
    parsed?.responsibilities?.filter(Boolean) ||
    extractBullets(sections['responsibilities'] || sections["what you'll do"] || '');

  const qualifications =
    parsed?.qualifications?.filter(Boolean) ||
    extractBullets(
      sections.qualifications || sections.requirements || sections.skills || ''
    );

  let about =
    sections['about the role'] ||
    sections.about ||
    sections['the role'] ||
    sections['who you are'] ||
    '';

  if (!about) {
    const paragraphs = plain.split(/\n\n+/).filter((p) => p.length > 40);
    about = paragraphs[0] || plain.slice(0, 600);
  }

  if (!responsibilities.length && plain.length > 200) {
    const mid = plain.slice(about.length, about.length + 1200);
    responsibilities.push(...extractBullets(mid).slice(0, 8));
  }

  if (!qualifications.length && parsed?.requiredSkills?.length) {
    qualifications.push(...parsed.requiredSkills.slice(0, 10));
  }

  return {
    about: about.slice(0, 2000),
    responsibilities: responsibilities.slice(0, 12),
    qualifications: qualifications.slice(0, 12),
    meta: { ...meta, company: company || meta.company },
  };
}
