import { Schema, model } from 'mongoose';

const jobSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  description: { type: String, required: true },
  applyUrl: { type: String, required: true, unique: true }
}, { timestamps: true });

export const Job = model('Job', jobSchema);
