import { Schema, model, Types } from 'mongoose';

const searchRunSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, enum: ['google', 'adzuna', 'both'], required: true },
    query: { type: String, required: true },
    location: { type: String, required: true },
    datePosted: { type: String, enum: ['today', '3days', 'week', 'month'], default: 'week' },
    found: { type: Number, default: 0 },
    saved: { type: Number, default: 0 },
    isPipeline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SearchRun = model('SearchRun', searchRunSchema);
