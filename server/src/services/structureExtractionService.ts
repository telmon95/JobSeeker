import { openai } from '../config/openai';
import { ParsedJobRequirements, ParsedProfile } from '../types/parsedDocuments';
import { extractProfileHeuristic } from '../utils/cvSectionParser';

const PROFILE_SCHEMA = `{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "headline": "string or null",
  "summary": "string or null",
  "skills": ["string"],
  "experience": [{ "company": "string", "title": "string", "startDate": "string or null", "endDate": "string or null", "location": "string or null", "description": "string" }],
  "education": [{ "institution": "string", "degree": "string or null", "field": "string or null", "startDate": "string or null", "endDate": "string or null" }],
  "certifications": ["string"],
  "languages": ["string"],
  "projects": [{ "name": "string", "description": "string or null", "technologies": ["string"], "url": "string or null" }],
  "links": { "linkedin": "string or null", "github": "string or null", "portfolio": "string or null", "website": "string or null" }
}`;

const JOB_SCHEMA = `{
  "title": "string or null",
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "experienceLevel": "string or null",
  "qualifications": ["string"],
  "responsibilities": ["string"],
  "keywords": ["string"]
}`;

function parseJsonResponse<T>(content: string): T {
  return JSON.parse(content) as T;
}

function isOpenAIUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; code?: string; message?: string };
  const msg = e.message || '';
  return (
    e.status === 429 ||
    e.code === 'insufficient_quota' ||
    e.code === 'rate_limit_exceeded' ||
    /quota|rate limit|429/i.test(msg)
  );
}

const useOpenAIForCv = process.env.USE_OPENAI_CV_PARSING === 'true';

export async function extractProfileFromMarkdown(markdown: string, format = 'markdown'): Promise<ParsedProfile> {
  if (!markdown.trim()) {
    throw new Error('No readable text was extracted from this document.');
  }

  if (!useOpenAIForCv) {
    return extractProfileHeuristic(markdown, format);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You extract structured resume/CV data from parsed document text. Support modern CV layouts: chronological and functional formats, LinkedIn exports, multi-column text, Europass-style sections, project portfolios, and categorized skill blocks. Return valid JSON matching this schema: ${PROFILE_SCHEMA}. Use empty arrays when a section is missing. Normalize dates (e.g. "Jan 2022 – Present"). Infer skills from experience when not listed explicitly. Extract LinkedIn/GitHub/portfolio URLs into links.`,
        },
        { role: 'user', content: markdown },
      ],
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('AI failed to extract profile data from CV.');
    }

    const profile = parseJsonResponse<ParsedProfile>(content);
    return {
      ...profile,
      rawMarkdown: markdown,
      parseMeta: { format, sectionsFound: [], parser: 'openai' },
    };
  } catch (error) {
    if (isOpenAIUnavailable(error)) {
      console.warn('OpenAI unavailable — using heuristic CV parser.');
      return extractProfileHeuristic(markdown, format);
    }
    throw error;
  }
}

function extractJobHeuristic(description: string, title?: string): ParsedJobRequirements {
  const text = `${title || ''} ${description}`.toLowerCase();
  const words = description.match(/\b[A-Z][a-zA-Z+#.]{1,25}\b/g) || [];
  const techTerms = [...new Set(words.filter((w) => w.length > 2))].slice(0, 20);

  const level =
    text.includes('senior') ? 'Senior' :
    text.includes('junior') ? 'Junior' :
    text.includes('lead') ? 'Lead' : undefined;

  return {
    title: title || undefined,
    requiredSkills: techTerms.slice(0, 10),
    preferredSkills: techTerms.slice(10, 15),
    experienceLevel: level,
    qualifications: [],
    responsibilities: description.split(/[.!]\s+/).slice(0, 5).filter((s) => s.length > 20),
    keywords: techTerms,
  };
}

export async function extractJobRequirements(description: string, title?: string): Promise<ParsedJobRequirements> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You extract structured job requirements from a job posting. Return valid JSON matching this schema: ${JOB_SCHEMA}. Put must-have skills in requiredSkills, nice-to-haves in preferredSkills, and ATS-relevant terms in keywords.`,
        },
        {
          role: 'user',
          content: title ? `Job Title: ${title}\n\n${description}` : description,
        },
      ],
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('AI failed to extract job requirements.');
    }

    return parseJsonResponse<ParsedJobRequirements>(content);
  } catch (error) {
    if (isOpenAIUnavailable(error)) {
      console.warn('OpenAI unavailable — using heuristic job parser.');
      return extractJobHeuristic(description, title);
    }
    throw error;
  }
}
