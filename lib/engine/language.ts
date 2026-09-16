/** Skip non-English teasers at ingest. No LLM — stopwords + script + diacritics. */

const NON_LATIN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Thai}\p{Script=Hebrew}\p{Script=Greek}\p{Script=Devanagari}]/u;

const ENGLISH = new Set([
  "the",
  "and",
  "of",
  "to",
  "in",
  "for",
  "on",
  "with",
  "at",
  "from",
  "by",
  "an",
  "is",
  "are",
  "was",
  "were",
  "this",
  "that",
  "its",
  "as",
  "be",
  "or",
  "into",
  "after",
  "before",
  "over",
  "under",
  "has",
  "have",
  "had",
  "will",
  "would",
  "could",
  "should",
  "about",
  "their",
  "his",
  "her",
  "our",
  "your",
  "not",
  "but",
  "than",
  "more",
  "most",
  "it",
  "they",
  "we",
  "you",
  "who",
  "which",
  "when",
  "where",
  "what",
  "how",
  "if",
  "so",
  "also",
  "just",
  "only",
  "can",
  "may",
  "been",
  "being",
  "all",
  "any",
  "some",
  "out",
  "then",
  "now",
  "here",
  "there",
  "these",
  "those",
  "such",
  "other",
  "through",
  "between",
  "during",
  "without",
  "within",
  "against",
  "among",
  "first",
  "new",
  "last",
]);

/** Distinctive function words. Skip tokens that collide with English (la, le, die, am, per, come). */
const FRENCH = new Set([
  "les",
  "des",
  "une",
  "du",
  "au",
  "aux",
  "et",
  "est",
  "dans",
  "pour",
  "avec",
  "sur",
  "qui",
  "que",
  "cette",
  "cet",
  "ces",
  "nous",
  "vous",
  "ils",
  "elles",
  "elle",
  "sont",
  "etre",
  "être",
  "ete",
  "été",
  "pas",
  "comme",
  "mais",
  "où",
  "aussi",
  "très",
  "tout",
  "tous",
  "toute",
  "toutes",
  "encore",
  "déjà",
  "apres",
  "après",
  "avant",
  "sous",
  "entre",
  "chez",
  "sans",
  "vers",
  "dès",
  "depuis",
  "alors",
  "ses",
  "leur",
  "leurs",
  "dont",
  "voitures",
  "voiture",
  "plus",
]);

const GERMAN = new Set([
  "und",
  "ist",
  "sind",
  "von",
  "mit",
  "auf",
  "für",
  "als",
  "auch",
  "nach",
  "nicht",
  "wird",
  "wurden",
  "wurde",
  "sich",
  "über",
  "zum",
  "zur",
  "den",
  "dem",
  "der",
  "das",
  "ein",
  "eine",
  "einer",
  "einem",
  "einen",
  "uns",
  "unsere",
  "unserer",
  "unseren",
  "seit",
  "steht",
  "jahren",
  "zwischen",
  "berichtete",
  "berichtet",
  "seinen",
  "seine",
  "seiner",
]);

const ITALIAN = new Set([
  "il",
  "gli",
  "dello",
  "della",
  "delle",
  "dei",
  "nel",
  "nella",
  "nei",
  "nelle",
  "sono",
  "più",
  "anche",
  "questo",
  "questa",
  "dalla",
  "dallo",
  "degli",
  "alle",
  "allo",
  "agli",
  "che",
  "una",
  "non",
]);

const SPANISH = new Set([
  "los",
  "las",
  "del",
  "por",
  "para",
  "este",
  "esta",
  "está",
  "más",
  "que",
  "una",
  "con",
  "una",
]);

function tokens(text: string): string[] {
  return text.toLowerCase().normalize("NFKC").match(/\p{L}+/gu) ?? [];
}

function hits(words: string[], lexicon: Set<string>): number {
  let count = 0;
  for (const word of words) {
    if (lexicon.has(word)) count += 1;
  }
  return count;
}

function diacriticCount(text: string): number {
  let count = 0;
  for (const char of text) {
    if (!/\p{L}/u.test(char)) continue;
    if (char.normalize("NFD").length > 1) count += 1;
  }
  return count;
}

export function isEnglish(title: string, excerpt = ""): boolean {
  const text = `${title} ${excerpt}`.trim();
  if (!text) return true;
  if (NON_LATIN.test(text)) return false;

  const words = tokens(text);
  if (!words.length) return true;

  const english = hits(words, ENGLISH);
  const french = hits(words, FRENCH);
  const german = hits(words, GERMAN);
  const italian = hits(words, ITALIAN);
  const spanish = hits(words, SPANISH);
  const foreign = Math.max(french, german, italian, spanish);
  const accents = diacriticCount(text);

  if (foreign >= 4) return false;
  if (foreign >= 3 && foreign >= english) return false;
  if (foreign >= 2 && english === 0) return false;
  if (accents >= 8) return false;
  if (accents >= 5 && foreign >= 2) return false;
  return true;
}
