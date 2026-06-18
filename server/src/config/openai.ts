import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('FATAL ERROR: OPENAI_API_KEY is not set in the .env file.');
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
