import { Schema } from 'mongoose';

export const userPreferencesSchema = new Schema(
  {
    searchQuery: { type: String, default: 'software engineer' },
    searchLocation: { type: String, default: 'South Africa' },
    searchSource: {
      type: String,
      enum: ['google', 'adzuna', 'both'],
      default: 'both',
    },
    datePosted: {
      type: String,
      enum: ['today', '3days', 'week', 'month'],
      default: 'week',
    },
    minMatchScore: { type: Number, default: 0, min: 0, max: 100 },
    searchRegions: { type: [String], default: ['za', 'remote', 'gb', 'us'] },
  },
  { _id: false }
);
