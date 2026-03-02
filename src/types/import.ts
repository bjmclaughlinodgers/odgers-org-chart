import type { Person } from './person';

export interface TemplateColumn {
  key: string;
  header: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date' | 'tags';
  enumValues?: string[];
}

export interface ParsedRow {
  [key: string]: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface RowValidation {
  rowIndex: number;
  errors: ValidationError[];
  warnings: string[];
}

export interface ImportResult {
  toAdd: Person[];
  toUpdate: { id: string; updates: Partial<Person> }[];
  errors: RowValidation[];
  warnings: RowValidation[];
  totalParsed: number;
}
