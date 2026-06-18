import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';
import { parseCvFile, SUPPORTED_CV_EXTENSIONS } from '../services/cvParseService';
import {
  findUserByIdSafe,
  saveUserCv,
  updateUserPreferences,
  UserPreferencesUpdate,
} from '../services/userService';

function getErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('LLAMA_CLOUD_API_KEY')) {
    return 'LlamaParse is not configured. Add LLAMA_CLOUD_API_KEY to your .env file.';
  }
  if (/Unsupported CV format/i.test(msg)) {
    return msg;
  }
  if (/LlamaParse|invalid.*key/i.test(msg)) {
    return msg;
  }
  if (msg.includes('LlamaParse returned no content') || msg.includes('Could not extract readable text')) {
    return 'Could not read text from this file. Try exporting your CV as PDF or DOCX with selectable text.';
  }
  if (msg.includes('empty')) {
    return 'This file appears empty. Please upload a CV with readable content.';
  }
  return msg || `Failed to parse CV. Supported formats: ${SUPPORTED_CV_EXTENSIONS.join(', ')}`;
}

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await findUserByIdSafe(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error fetching profile.', error: message });
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as UserPreferencesUpdate;
    const user = await updateUserPreferences(req.user._id, body);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'Preferences saved.', user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to save preferences.', error: message });
  }
};

export const uploadCv = async (req: AuthRequest, res: Response) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({
      message: `No file received. Supported formats: ${SUPPORTED_CV_EXTENSIONS.join(', ')}`,
    });
  }

  const ext = path.extname(req.file?.originalname || '').toLowerCase();

  try {
    console.log(`CV upload started for user ${req.user._id}: ${req.file?.originalname} (${ext})`);
    const parsedProfile = await parseCvFile(filePath, req.file?.originalname);
    console.log(
      `Profile structured — name: ${parsedProfile.name}, skills: ${parsedProfile.skills?.length || 0}`
    );

    const updatedUser = await saveUserCv(req.user._id, parsedProfile, {
      originalFileName: req.file?.originalname,
      format: ext.replace('.', ''),
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Authenticated user not found.' });
    }

    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temporary CV file:', err);
    });

    res.status(200).json({
      message: 'CV uploaded and parsed successfully!',
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error('CV parsing error:', error);
    fs.unlink(filePath, () => {});

    const message = getErrorMessage(error);
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message, error: detail });
  }
};
