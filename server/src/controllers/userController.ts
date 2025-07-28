// job-app-automator/server/src/controllers/userController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import fs from 'fs';

const ResumeParser = require('simple-resume-parser');

export const uploadCv = async (req: AuthRequest, res: Response) => {
  console.log('--- BACKEND: CV UPLOAD PROCESS STARTED ---');
  const filePath = req.file?.path;
  if (!filePath) {
    console.log('--- BACKEND ERROR: No file path received.');
    return res.status(400).json({ message: 'File upload failed. Please try again.' });
  }
  console.log(`--- BACKEND: File received at path: ${filePath}`);

  try {
    const resume = new ResumeParser(filePath);

    resume.parseToJSON()
      .then(async (parsedData: any) => {
        // ✅ DEBUG LOG 1: See if the parser actually worked.
        console.log('--- BACKEND: CV parsing successful. Parsed data name:', parsedData.name);

        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { parsedCV: parsedData },
          { new: true } // This is crucial to get the *new* document back
        ).select('-password');
        
        // ✅ DEBUG LOG 2: Check if the user object returned from the database has the CV data.
        console.log('--- BACKEND: User updated in DB. Does the returned user have a CV? ' + (updatedUser?.parsedCV ? 'YES' : 'NO'));

        if (!updatedUser) {
            console.log('--- BACKEND ERROR: User not found after update attempt.');
            return res.status(404).json({ message: 'Authenticated user not found.' });
        }

        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temporary CV file:', err);
        });
        
        // ✅ DEBUG LOG 3: Confirm we are sending the user back.
        console.log('--- BACKEND: Sending updated user object back to frontend.');
        res.status(200).json({
          message: 'CV uploaded and parsed successfully!',
          user: updatedUser,
        });
      })
      .catch((error: any) => {
        console.error('--- BACKEND ERROR: Error from parseToJSON library ---', error);
        res.status(500).json({ message: 'The parser library failed.', error: error.message });
      });

  } catch (error: any) {
    console.error('--- BACKEND ERROR: Critical error in try/catch block ---', error);
    res.status(500).json({ message: 'Server error while setting up parser.', error: error.message });
  }
};