import { Schema } from 'mongoose';

const workExperienceSchema = new Schema(
  {
    company: { type: String, required: true },
    title: { type: String, required: true },
    startDate: String,
    endDate: String,
    location: String,
    description: { type: String, default: '' },
  },
  { _id: false }
);

const educationSchema = new Schema(
  {
    institution: { type: String, required: true },
    degree: String,
    field: String,
    startDate: String,
    endDate: String,
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    technologies: [String],
    url: String,
  },
  { _id: false }
);

const linksSchema = new Schema(
  {
    linkedin: String,
    github: String,
    portfolio: String,
    website: String,
  },
  { _id: false }
);

const parseMetaSchema = new Schema(
  {
    format: String,
    sectionsFound: [String],
    parser: { type: String, enum: ['heuristic', 'openai'] },
  },
  { _id: false }
);

export const parsedProfileSchema = new Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    location: String,
    headline: String,
    summary: String,
    skills: { type: [String], default: [] },
    experience: { type: [workExperienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    certifications: { type: [String], default: [] },
    languages: [String],
    projects: [projectSchema],
    links: linksSchema,
    rawMarkdown: String,
    parseMeta: parseMetaSchema,
  },
  { _id: false }
);
