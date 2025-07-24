import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In a real app, hash this!
  fullName: { type: String },
  parsedCV: { type: Object } // Store parsed resume JSON
}, { timestamps: true });

export const User = model('User', userSchema);