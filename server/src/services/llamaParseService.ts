import LlamaCloud from '@llamaindex/llama-cloud';
import fs from 'fs';

let client: LlamaCloud | null = null;

function getClient(): LlamaCloud {
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    throw new Error('LLAMA_CLOUD_API_KEY is not set in the .env file.');
  }
  if (!client) {
    client = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY });
  }
  return client;
}

export async function parseDocumentToMarkdown(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error('Uploaded file was not found on the server.');
  }

  const llamaClient = getClient();

  let file;
  try {
    file = await llamaClient.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'parse',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/401|403|unauthorized|invalid.*key/i.test(msg)) {
      throw new Error('LlamaParse API key is invalid. Check LLAMA_CLOUD_API_KEY in your .env file.');
    }
    if (/429|rate|quota/i.test(msg)) {
      throw new Error('LlamaParse rate limit reached. Wait a minute and try again.');
    }
    throw new Error(`LlamaParse upload failed: ${msg}`);
  }

  let result;
  const tier = (process.env.CV_PARSE_TIER as 'fast' | 'cost_effective' | 'agentic') || 'cost_effective';
  try {
    result = await llamaClient.parsing.parse({
      file_id: file.id,
      tier,
      version: 'latest',
      expand: ['markdown'],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/429|rate|quota/i.test(msg)) {
      throw new Error('LlamaParse is busy. Please wait a moment and try again.');
    }
    throw new Error(`LlamaParse parsing failed: ${msg}`);
  }

  if (!result.markdown?.pages?.length) {
    throw new Error('LlamaParse returned no content for this document.');
  }

  const markdown = result.markdown.pages
    .map((page) => ('markdown' in page ? page.markdown : ''))
    .filter(Boolean)
    .join('\n\n---\n\n');

  if (!markdown.trim()) {
    throw new Error('Could not extract readable text from this file. Try a text-based PDF or Word document.');
  }

  return markdown;
}
