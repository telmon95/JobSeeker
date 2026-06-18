import fs from 'fs';
import path from 'path';
import { ParsedProfile } from '../types/parsedDocuments';
import { stripRtfToPlain } from '../utils/cvNormalize';
import { parseDocumentToMarkdown } from './llamaParseService';
import { extractProfileFromMarkdown } from './structureExtractionService';

const LLAMAPARSE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.rtf',
]);

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv']);

export const SUPPORTED_CV_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.rtf',
  '.txt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

async function readTextCv(filePath: string): Promise<string> {
  const text = fs.readFileSync(filePath, 'utf-8');
  if (!text.trim()) {
    throw new Error('This text file appears empty.');
  }
  return text;
}

async function readRtfCv(filePath: string, filePathForLlama: string): Promise<{ text: string; format: string }> {
  const rtf = fs.readFileSync(filePath, 'utf-8');
  const plain = stripRtfToPlain(rtf);
  if (plain.length >= 80) {
    return { text: plain, format: 'rtf' };
  }
  const markdown = await parseDocumentToMarkdown(filePathForLlama);
  return { text: markdown, format: 'rtf-document' };
}

export async function parseCvFile(filePath: string, originalName?: string): Promise<ParsedProfile> {
  const ext = path.extname(originalName || filePath).toLowerCase();

  let markdown: string;
  let format: string;

  if (TEXT_EXTENSIONS.has(ext)) {
    markdown = await readTextCv(filePath);
    format = ext.replace('.', '');
  } else if (ext === '.rtf') {
    const result = await readRtfCv(filePath, filePath);
    markdown = result.text;
    format = result.format;
  } else if (LLAMAPARSE_EXTENSIONS.has(ext)) {
    markdown = await parseDocumentToMarkdown(filePath);
    format = ext.replace('.', '');
  } else {
    throw new Error(
      `Unsupported CV format "${ext || 'unknown'}". Supported: PDF, Word, ODT, RTF, TXT, MD, and images.`
    );
  }

  const profile = await extractProfileFromMarkdown(markdown, format);
  return profile;
}
