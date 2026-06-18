/** Normalize LlamaParse / export quirks before structured extraction. */
export function normalizeCvMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^#{4,}\s*/gm, '### ')
    .trim();
}

export function stripRtfToPlain(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\line/gi, '\n')
    .replace(/\\tab/gi, '\t')
    .replace(/\\'[0-9a-f]{2}/gi, ' ')
    .replace(/\{\\[^{}]*\}/g, '')
    .replace(/\\[a-z]+\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
