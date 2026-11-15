/** A single row of data represented as key-value pairs. */
export type DataRow = Record<string, string | number | boolean | null>;

/** Column data-type as detected by the toolkit. */
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

/** Schema describing column names and their detected types. */
export interface ColumnSchema {
  name: string;
  type: ColumnType;
  nullable: boolean;
  uniqueValues: number;
}

/** A loaded dataset with rows and metadata. */
export interface Dataset {
  rows: DataRow[];
  columns: ColumnSchema[];
  rowCount: number;
  source: string;
}

/** Validation result for a dataset. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  dataset: Dataset;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ValidationWarning {
  column: string;
  message: string;
}

/** A research project container. */
export interface Project {
  id: string;
  name: string;
  description: string;
  datasets: Dataset[];
  createdAt: Date;
  updatedAt: Date;
}
