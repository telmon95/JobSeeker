import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import {
  findUserByEmailWithPassword,
  recordUserLogin,
  findUserByIdSafe,
} from '../services/userService';

const generateToken = (userId: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in the environment variables.');
  }
  return jwt.sign({ id: userId }, secret, { expiresIn: '30d' });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    const safeUser = await findUserByIdSafe(user._id.toString());

    res.status(201).json({
      _id: user._id,
      email: user.email,
      parsedCV: safeUser?.parsedCV,
      preferences: safeUser?.preferences,
      token: generateToken(user._id.toString()),
    });
  } catch (error: unknown) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmailWithPassword(String(email).toLowerCase().trim());
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, String(user.password));
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    await recordUserLogin(user._id.toString());
    const safeUser = await findUserByIdSafe(user._id.toString());

    res.status(200).json({
      _id: user._id,
      email: user.email,
      parsedCV: safeUser?.parsedCV,
      preferences: safeUser?.preferences,
      fullName: safeUser?.fullName,
      token: generateToken(user._id.toString()),
    });
  } catch (error: unknown) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await findUserByEmailWithPassword(String(email).toLowerCase().trim());
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error: unknown) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
};
