import { Schema, model, Types } from 'mongoose';

const jobMatchSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: Types.ObjectId, ref: 'Job', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    strongMatches: [{ type: String }],
    missingSkills: [{ type: String }],
    jobSkills: [{ type: String }],
  },
  { timestamps: true }
);

jobMatchSchema.index({ user: 1, job: 1 }, { unique: true });
jobMatchSchema.index({ user: 1, score: -1 });

export const JobMatch = model('JobMatch', jobMatchSchema);
