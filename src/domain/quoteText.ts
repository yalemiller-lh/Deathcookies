// Tidies text read from a screenshot (or pasted) into a quote and its author.
// It is a first guess; the person checks it before saving.

const OPENING = `"'“‘«„`;
const CLOSING = `"'”’»“`;
const DASH = /^[—–―\-~]+\s*/;

/** Removes wrapping quote marks and squeezes whitespace. */
export function cleanQuoteText(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  while (t.length > 1 && OPENING.includes(t[0]!) && CLOSING.includes(t[t.length - 1]!)) t = t.slice(1, -1).trim();
  // A lone opening or closing mark left by a cropped screenshot.
  if (t.length > 1 && OPENING.includes(t[0]!) && !CLOSING.split('').some(c => t.slice(1).includes(c))) t = t.slice(1).trim();
  if (t.length > 1 && CLOSING.includes(t[t.length - 1]!) && !OPENING.split('').some(c => t.slice(0, -1).includes(c))) t = t.slice(0, -1).trim();
  return t;
}

/** Removes a leading dash and trailing commas from an author line. */
export function cleanAuthor(by: string): string {
  return by.replace(DASH, '').replace(/[\s,;]+$/, '').replace(/\s+/g, ' ').trim();
}

/** Phone status-bar bits and other lines that are only numbers and symbols. */
function isClutter(line: string): boolean {
  if (line.length <= 1) return true;
  if (/^\d{1,2}[:.]\d{2}\s*([ap]\.?m\.?)?$/i.test(line)) return true;
  return /^[\d\s%.,:;|•·<>/()+-]+$/.test(line);
}

const endsWithClosingQuote = (line: string) => CLOSING.includes(line[line.length - 1] ?? '');
const looksLikeName = (line: string) => line.split(/\s+/).length <= 6 && !/[.!?:]$/.test(line);

export function parseQuoteText(raw: string): { text: string; by: string } {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !isClutter(l));

  // "— Seneca" style: the author line, and anything after it (likes, captions) is dropped.
  const dashed = lines.findIndex((l, i) => i > 0 && DASH.test(l) && cleanAuthor(l).length > 0);
  if (dashed > 0) {
    return { text: cleanQuoteText(lines.slice(0, dashed).join(' ')), by: cleanAuthor(lines[dashed]!) };
  }

  // “Quote.” then a short name on the last line.
  const last = lines.at(-1);
  const beforeLast = lines.at(-2);
  if (last && beforeLast && endsWithClosingQuote(beforeLast) && looksLikeName(last)) {
    return { text: cleanQuoteText(lines.slice(0, -1).join(' ')), by: cleanAuthor(last) };
  }

  return { text: cleanQuoteText(lines.join(' ')), by: '' };
}
