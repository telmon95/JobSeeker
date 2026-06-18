import { ParsedProfile } from '../types/parsedDocuments';

interface CoverLetterInput {
  profile: ParsedProfile;
  jobTitle: string;
  company: string;
  requiredSkills: string[];
}

export function generateCoverLetterTemplate(input: CoverLetterInput): string {
  const { profile, jobTitle, company, requiredSkills } = input;
  const matchedSkills = profile.skills.filter((skill) =>
    requiredSkills.some((req) => req.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(req.toLowerCase()))
  );
  const skillsLine = matchedSkills.length > 0
    ? matchedSkills.slice(0, 6).join(', ')
    : profile.skills.slice(0, 6).join(', ');

  const experienceLine = profile.experience[0]
    ? `${profile.experience[0].title} at ${profile.experience[0].company}`
    : 'relevant professional experience';

  return `Dear Hiring Team,

I am writing to express my strong interest in the ${jobTitle} position at ${company}. With a background in ${profile.summary || 'software engineering'} and hands-on experience as ${experienceLine}, I am confident I can contribute meaningfully to your team.

My technical skill set includes ${skillsLine}, which align closely with the requirements for this role. I have consistently delivered quality results in fast-paced environments and am eager to bring that same dedication to ${company}.

I would welcome the opportunity to discuss how my experience and enthusiasm can support your team's goals. Thank you for considering my application.

Sincerely,
${profile.name}
${profile.email || ''}`.trim();
}

export function isOpenAIQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate limit');
}
