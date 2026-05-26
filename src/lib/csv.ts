import Papa from 'papaparse';

export interface ParsedCsv<T = Record<string, string>> {
  headers: string[];
  rows: T[];
  errors: Papa.ParseError[];
}

export function parseCSV<T = Record<string, string>>(text: string): ParsedCsv<T> {
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors,
  };
}

export function toCSV(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows);
}
