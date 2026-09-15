export type CsvSource = {
  id: string;
  publication: string;
  country: string;
  url: string;
  rss_available: string;
  rss_url: string;
  website_available: string;
  scrape_difficulty: string;
  editorial_category: string;
  marques_covered: string;
  drv247_relevance: string;
  enabled: string;
  source_type: string;
  rss_verified_status: string;
  rss_confidence: string;
};

export function parseCsv(text: string): CsvSource[] {
  const rows = splitCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = cells[index] ?? "";
    });
    return row as CsvSource;
  });
}

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || (char === "\r" && next === "\n")) {
      if (char === "\r") i += 1;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

export function splitList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
