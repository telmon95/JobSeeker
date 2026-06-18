import { Schema } from 'mongoose';

export const cvMetaSchema = new Schema(
  {
    originalFileName: String,
    format: String,
    uploadedAt: { type: Date, default: Date.now },
    parser: String,
  },
  { _id: false }
);
