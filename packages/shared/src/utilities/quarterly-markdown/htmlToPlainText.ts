/**
 * Converts stored goal-log HTML into plain text, mirroring the legacy
 * sanitize-then-textContent pipeline byte-for-byte without a DOM.
 *
 * Constraint: this file must stay DOM-free and dependency-free (the CLI
 * vendors this directory by copy), so it carries its own small entity table.
 * Constraint: block tags add NO separator between their text, reproducing the
 * legacy quirk where `<p>a</p><p>b</p>` becomes `ab`.
 */

const DROP_WITH_CONTENT =
  'script|style|iframe|noscript|template|title|xmp|noembed|noframes|audio|video|desc|foreignobject';
// An open tag body that tolerates quoted '>' inside attributes.
const TAG_BODY = `[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*`;
// Dropped elements remove themselves AND their content; unterminated -> drop to end.
const DROP_RE = new RegExp(
  `<(${DROP_WITH_CONTENT})(?![\\w:-])${TAG_BODY}>[\\s\\S]*?(?:<\\/\\1\\s*>|$)`,
  'gi'
);
const PLAINTEXT_RE = /<plaintext(?![\w:-])[\s\S]*$/gi;
const COMMENT_RE = /<!--[\s\S]*?(?:-->|$)/g;
// BOGUS: <!DOCTYPE …>, <?php … ?>
const BOGUS_RE = /<[!?][^>]*>/g;
const TAG_RE = /<\/?[a-zA-Z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g;
const ENTITY_RE = /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
  laquo: '«',
  raquo: '»',
  times: '×',
  divide: '÷',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  deg: '°',
  plusmn: '±',
  para: '¶',
  sect: '§',
};

const REPLACEMENT_CHARACTER = '\uFFFD';
const MAX_CODE_POINT = 0x10ffff;
const SURROGATE_START = 0xd800;
const SURROGATE_END = 0xdfff;
const HEX_ENTITY_PREFIX_RE = /^#[xX]/;

const isInUnicodeRange = (cp: number): boolean => cp >= 1 && cp <= MAX_CODE_POINT;

const isSurrogateCodePoint = (cp: number): boolean => cp >= SURROGATE_START && cp <= SURROGATE_END;

function toCodePointOrReplacement(cp: number): string {
  if (Number.isNaN(cp) || !isInUnicodeRange(cp)) return REPLACEMENT_CHARACTER;
  if (isSurrogateCodePoint(cp)) return REPLACEMENT_CHARACTER;
  return String.fromCodePoint(cp);
}

function decodeNumericEntity(body: string): string {
  const hex = HEX_ENTITY_PREFIX_RE.test(body);
  const digits = hex ? body.slice(2) : body.slice(1);
  return toCodePointOrReplacement(parseInt(digits, hex ? 16 : 10));
}

function decodeEntity(match: string, body: string): string {
  if (body[0] !== '#') {
    return NAMED_ENTITIES[body] ?? match;
  }
  return decodeNumericEntity(body);
}

/**
 * Extracts display text from log HTML.
 *
 * @param html - stored log content, possibly untrusted HTML
 * @returns whitespace-collapsed plain text; empty logs return an empty string
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const text = html
    .replace(DROP_RE, '')
    .replace(PLAINTEXT_RE, '')
    .replace(COMMENT_RE, '')
    .replace(BOGUS_RE, '')
    .replace(TAG_RE, '') // strip tags, NO separator inserted
    .replace(ENTITY_RE, decodeEntity); // exactly one decoding pass, AFTER tag stripping
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .trim();
}
