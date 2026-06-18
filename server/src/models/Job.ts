import { Schema, model } from 'mongoose';

const applyOptionSchema = new Schema(
  {
    title: { type: String, required: true },
    link: { type: String, required: true },
  },
  { _id: false }
);

const jobSchema = new Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    description: { type: String, required: true },
    parsedDescription: { type: Object },
    applyUrl: { type: String, required: true, unique: true },
    postedAt: { type: String },
    salary: { type: String },
    scheduleType: { type: String },
    scrapedFrom: { type: String, enum: ['google', 'adzuna'] },
    applyOptions: [applyOptionSchema],
  },
  { timestamps: true }
);

export const Job = model('Job', jobSchema);
