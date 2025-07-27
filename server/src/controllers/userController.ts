// job-app-automator/server/src/controllers/userController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import fs from 'fs';

// This is the correct import, exactly as shown in the documentation you found.
const ResumeParser = require('simple-resume-parser');

export const uploadCv = async (req: AuthRequest, res: Response) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ message: 'File upload failed. Please try again.' });
  }

  try {
    const resume = new ResumeParser(filePath);

    // This is the correct function call, as shown in the documentation.
    // We use .then() because that's how the library is designed.
    resume.parseToJSON()
      .then(async (parsedData: any) => {

        // Now we update the user inside the .then() block
        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { parsedCV: parsedData },
          { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'Authenticated user not found.' });
        }

        // Clean up the temporary file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temporary CV file:', err);
        });

        res.status(200).json({
          message: 'CV uploaded and parsed successfully!',
          user: updatedUser,
        });
      })
      .catch((error: any) => {
        console.error('Error from parseToJSON:', error);
        res.status(500).json({ message: 'The parser library failed.', error: error.message });
      });

  } catch (error: any) {
    console.error('Error setting up parser:', error);
    res.status(500).json({ message: 'Server error while setting up parser.', error: error.message });
  }
};