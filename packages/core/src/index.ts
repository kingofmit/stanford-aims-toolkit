export type {
  DataRow,
  ColumnType,
  ColumnSchema,
  Dataset,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Project,
} from './types';

import type {
  DataRow,
  ColumnType,
  ColumnSchema,
  Dataset,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Project,
} from './types';

// ---------------------------------------------------------------------------
// CSV / JSON Loading
// ---------------------------------------------------------------------------

/** Parse a CSV string into a Dataset. */
export function parseCSV(csv: string, source = 'inline'): Dataset {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) {
    return { rows: [], columns: [], rowCount: 0, source };
  }

  const headers = parseLine(lines[0]);
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: DataRow = {};
    headers.forEach((h, idx) => {
      row[h] = coerce(values[idx] ?? '');
    });
    rows.push(row);
  }

  const columns = detectColumnTypes({ rows, source });
  return { rows, columns, rowCount: rows.length, source };
}

/** Load a CSV file (Node.js only — reads via dynamic import of fs). */
export async function loadCSV(filePath: string): Promise<Dataset> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCSV(content, filePath);
}

/** Parse a JSON array into a Dataset. */
export function parseJSON(data: Record<string, unknown>[], source = 'inline'): Dataset {
  const rows: DataRow[] = data.map((item) => {
    const row: DataRow = {};
    for (const [key, value] of Object.entries(item)) {
      row[key] = value as string | number | boolean | null;
    }
    return row;
  });

  const columns = detectColumnTypes({ rows, source });
  return { rows, columns, rowCount: rows.length, source };
}

/** Load a JSON file (Node.js only). */
export async function loadJSON(filePath: string): Promise<Dataset> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of objects');
  }
  return parseJSON(data, filePath);
}

// ---------------------------------------------------------------------------
// Column Type Detection
// ---------------------------------------------------------------------------

/** Detect the type of each column in the dataset. */
export function detectColumnTypes(dataset: Pick<Dataset, 'rows' | 'source'>): ColumnSchema[] {
  if (dataset.rows.length === 0) return [];

  const keys = Object.keys(dataset.rows[0]);
  return keys.map((name) => {
    const values = dataset.rows.map((r) => r[name]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
    const nullable = nonNull.length < values.length;
    const uniqueValues = new Set(nonNull.map(String)).size;

    const type = inferType(nonNull);
    return { name, type, nullable, uniqueValues };
  });
}

function inferType(values: (string | number | boolean | null)[]): ColumnType {
  if (values.length === 0) return 'unknown';

  let allNum = true;
  let allBool = true;
  let allDate = true;

  for (const v of values) {
    const s = String(v).trim();
    if (allNum && isNaN(Number(s))) allNum = false;
    if (allBool && s !== 'true' && s !== 'false') allBool = false;
    if (allDate && isNaN(Date.parse(s))) allDate = false;
    if (!allNum && !allBool && !allDate) break;
  }

  if (allBool) return 'boolean';
  if (allNum) return 'number';
  if (allDate) return 'date';
  return 'string';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a dataset for common issues. */
export function validateDataset(dataset: Dataset): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for empty dataset
  if (dataset.rows.length === 0) {
    errors.push({ row: 0, column: '', message: 'Dataset is empty' });
  }

  // Check for columns with high null rates
  for (const col of dataset.columns) {
    const nullCount = dataset.rows.filter(
      (r) => r[col.name] === null || r[col.name] === undefined || r[col.name] === '',
    ).length;
    const nullRate = nullCount / dataset.rows.length;

    if (nullRate > 0.5) {
      warnings.push({
        column: col.name,
        message: `Column has ${Math.round(nullRate * 100)}% missing values`,
      });
    }
  }

  // Check for duplicate rows
  const seen = new Set<string>();
  for (let i = 0; i < dataset.rows.length; i++) {
    const key = JSON.stringify(dataset.rows[i]);
    if (seen.has(key)) {
      warnings.push({ column: '', message: `Duplicate row at index ${i}` });
    }
    seen.add(key);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dataset,
  };
}

// ---------------------------------------------------------------------------
// Project Management
// ---------------------------------------------------------------------------

/** Create a new research project. */
export function createProject(name: string, dataset?: Dataset, description = ''): Project {
  return {
    id: generateId(),
    name,
    description,
    datasets: dataset ? [dataset] : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Add a dataset to an existing project. */
export function addDataset(project: Project, dataset: Dataset): Project {
  return {
    ...project,
    datasets: [...project.datasets, dataset],
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function coerce(value: string): string | number | boolean | null {
  if (value === '') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  return value;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
