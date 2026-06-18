import { Schema, model } from 'mongoose';
import { parsedProfileSchema } from './schemas/parsedProfile.schema';
import { userPreferencesSchema } from './schemas/userPreferences.schema';
import { cvMetaSchema } from './schemas/cvMeta.schema';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    fullName: { type: String, trim: true },
    parsedCV: parsedProfileSchema,
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
    cvMeta: cvMetaSchema,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        const { password: _pw, ...safe } = ret;
        return safe;
      },
    },
  }
);

export const User = model('User', userSchema);
