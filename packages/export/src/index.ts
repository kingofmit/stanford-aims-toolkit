export * from "./types";
import type { ExportConfig, SPSSVariable, MethodsSection, VisualizationExport } from "./types";

export class CSVExporter {
  export(headers: string[], rows: (string | number)[][], config?: { delimiter?: string; includeHeader?: boolean }): string {
    const delim = config?.delimiter ?? ",";
    const lines: string[] = [];
    if (config?.includeHeader !== false) lines.push(headers.map((h) => this.escape(String(h), delim)).join(delim));
    for (const row of rows) lines.push(row.map((v) => this.escape(String(v), delim)).join(delim));
    return lines.join("\n");
  }

  private escape(value: string, delim: string): string {
    if (value.includes(delim) || value.includes('"') || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }
}

export class JSONExporter {
  export(data: Record<string, unknown>[], options?: { pretty?: boolean; includeMetadata?: boolean }): string {
    const output: Record<string, unknown> = { data };
    if (options?.includeMetadata) {
      output.metadata = { exportedAt: new Date().toISOString(), recordCount: data.length, tool: "Stanford AIMS Toolkit" };
    }
    return JSON.stringify(output, null, options?.pretty ? 2 : undefined);
  }
}

export class MethodsSectionGenerator {
  generate(config: {
    dataDescription: string;
    sampleSize: number;
    analysisSteps: { method: string; package: string; parameters?: string }[];
    toolVersion?: string;
  }): MethodsSection {
    const tools = `Stanford AIMS Toolkit${config.toolVersion ? ` v${config.toolVersion}` : ""} (Allem, 2026)`;
    const pipeline = config.analysisSteps.map((step) => {
      let desc = `${step.method} was conducted using the ${step.package} package`;
      if (step.parameters) desc += ` with ${step.parameters}`;
      return desc + ".";
    });

    const fullText = [
      `Data Analysis`,
      ``,
      `${config.dataDescription} The sample consisted of ${config.sampleSize} ${config.sampleSize === 1 ? "participant" : "participants"}.`,
      ``,
      `All analyses were conducted using ${tools}. ${pipeline.join(" ")}`,
    ].join("\n");

    return {
      title: "Data Analysis",
      dataCollection: config.dataDescription,
      sampleDescription: `N = ${config.sampleSize}`,
      analysisPipeline: pipeline,
      tools,
      fullText,
    };
  }
}

export class SPSSExporter {
  buildVariableDefinitions(columns: { name: string; type: "numeric" | "string"; label: string; values?: { value: number; label: string }[] }[]): SPSSVariable[] {
    return columns.map((col) => ({
      name: col.name.substring(0, 64).replace(/[^a-zA-Z0-9_]/g, "_"),
      type: col.type,
      label: col.label,
      values: col.values,
      width: col.type === "string" ? 255 : 8,
      decimals: col.type === "numeric" ? 2 : 0,
    }));
  }

  generateSyntax(variables: SPSSVariable[], dataRows: (string | number)[][]): string {
    const lines: string[] = ["* Stanford AIMS Toolkit SPSS Export.", ""];
    lines.push("DATA LIST FREE / " + variables.map((v) => `${v.name} (${v.type === "string" ? `A${v.width}` : `F${v.width}.${v.decimals}`})`).join(" ") + ".");
    lines.push("BEGIN DATA.");
    for (const row of dataRows) lines.push(row.map((v) => typeof v === "string" ? `"${v}"` : String(v)).join(" "));
    lines.push("END DATA.");
    lines.push("");
    for (const v of variables) {
      lines.push(`VARIABLE LABELS ${v.name} '${v.label}'.`);
      if (v.values?.length) {
        lines.push(`VALUE LABELS ${v.name}`);
        for (const val of v.values) lines.push(`  ${val.value} '${val.label}'`);
        lines.push(".");
      }
    }
    lines.push("EXECUTE.");
    return lines.join("\n");
  }
}

// ---------------------------------------------------------------------------
// LaTeX Table Exporter
// ---------------------------------------------------------------------------

export class LaTeXExporter {
  /** Generate a booktabs-style LaTeX table. */
  exportTable(
    headers: string[],
    rows: (string | number)[][],
    options?: {
      caption?: string;
      label?: string;
      notes?: string[];
      format?: 'booktabs' | 'apa';
    },
  ): string {
    const lines: string[] = [];
    const colSpec = headers.map(() => 'l').join(' ');

    lines.push('\\begin{table}[htbp]');
    lines.push('\\centering');
    if (options?.caption) lines.push(`\\caption{${this.escape(options.caption)}}`);
    if (options?.label) lines.push(`\\label{${options.label}}`);
    lines.push(`\\begin{tabular}{${colSpec}}`);
    lines.push('\\toprule');
    lines.push(headers.map((h) => this.escape(String(h))).join(' & ') + ' \\\\');
    lines.push('\\midrule');
    for (const row of rows) {
      lines.push(row.map((v) => this.escape(String(v))).join(' & ') + ' \\\\');
    }
    lines.push('\\bottomrule');
    lines.push('\\end{tabular}');
    if (options?.notes?.length) {
      lines.push('\\begin{tablenotes}[flushleft]');
      lines.push('\\small');
      for (const note of options.notes) lines.push(`\\item ${this.escape(note)}`);
      lines.push('\\end{tablenotes}');
    }
    lines.push('\\end{table}');
    return lines.join('\n');
  }

  /** Export an APA-formatted correlation table. */
  correlationTable(
    variables: string[],
    matrix: number[][],
    pValues?: number[][],
  ): string {
    const n = variables.length;
    const headers = ['Variable', ...Array.from({ length: n }, (_, i) => String(i + 1))];
    const rows: string[][] = variables.map((name, i) => {
      const row = [
        `${i + 1}. ${this.escape(name)}`,
        ...matrix[i].map((r, j) => {
          if (j === i) return '---';
          if (j > i) return '';
          const val = r.toFixed(2);
          if (pValues && pValues[i][j] < 0.001) return `${val}***`;
          if (pValues && pValues[i][j] < 0.01) return `${val}**`;
          if (pValues && pValues[i][j] < 0.05) return `${val}*`;
          return val;
        }),
      ];
      return row;
    });

    return this.exportTable(headers, rows, {
      caption: 'Correlation Matrix',
      label: 'tab:correlations',
      notes: ['* p < .05. ** p < .01. *** p < .001.'],
    });
  }

  /** Export an APA-formatted descriptive statistics table. */
  descriptiveTable(
    stats: { variable: string; n: number; mean: number; sd: number; min: number; max: number }[],
  ): string {
    const headers = ['Variable', 'N', 'M', 'SD', 'Min', 'Max'];
    const rows = stats.map((s) => [
      this.escape(s.variable),
      String(s.n),
      s.mean.toFixed(2),
      s.sd.toFixed(2),
      s.min.toFixed(2),
      s.max.toFixed(2),
    ]);
    return this.exportTable(headers, rows, {
      caption: 'Descriptive Statistics',
      label: 'tab:descriptives',
    });
  }

  private escape(s: string): string {
    return s.replace(/[&%$#_{}~^\\]/g, (m) => `\\${m}`);
  }
}

// ---------------------------------------------------------------------------
// R Script Exporter
// ---------------------------------------------------------------------------

export class RExporter {
  generateScript(
    dataDescription: { headers: string[]; rows: (string | number)[][] },
    analyses?: { method: string; params?: Record<string, string> }[],
  ): string {
    const lines: string[] = [
      '# Stanford AIMS Toolkit — R Equivalent Script',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Load libraries',
      'library(tidyverse)',
      'library(psych)',
      '',
      '# Data',
      `data <- tibble(`,
    ];

    for (let i = 0; i < dataDescription.headers.length; i++) {
      const header = dataDescription.headers[i];
      const values = dataDescription.rows.map((r) => r[i]);
      const isNumeric = values.every((v) => typeof v === 'number');
      const valStr = isNumeric
        ? `c(${values.join(', ')})`
        : `c(${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(', ')})`;
      lines.push(`  ${header} = ${valStr}${i < dataDescription.headers.length - 1 ? ',' : ''}`);
    }
    lines.push(')');
    lines.push('');

    if (analyses) {
      for (const a of analyses) {
        lines.push(`# ${a.method}`);
        switch (a.method) {
          case 'descriptive':
            lines.push('describe(data)');
            break;
          case 'correlation':
            lines.push('cor(data %>% select(where(is.numeric)))');
            break;
          case 'ttest':
            lines.push(`t.test(${a.params?.formula ?? 'y ~ group'}, data = data)`);
            break;
          case 'anova':
            lines.push(`aov(${a.params?.formula ?? 'y ~ group'}, data = data) %>% summary()`);
            break;
          case 'regression':
            lines.push(`lm(${a.params?.formula ?? 'y ~ .'}, data = data) %>% summary()`);
            break;
          default:
            lines.push(`# ${a.method} — implement as needed`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Stata Exporter
// ---------------------------------------------------------------------------

export class StataExporter {
  generateDoFile(
    headers: string[],
    rows: (string | number)[][],
    analyses?: string[],
  ): string {
    const lines: string[] = [
      '* Stanford AIMS Toolkit — Stata Do File',
      `* Generated: ${new Date().toISOString()}`,
      '',
      '* Import data',
      `clear`,
      `set obs ${rows.length}`,
      '',
    ];

    for (let i = 0; i < headers.length; i++) {
      const name = headers[i].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
      const values = rows.map((r) => r[i]);
      const isNumeric = values.every((v) => typeof v === 'number');

      if (isNumeric) {
        lines.push(`gen ${name} = .`);
        for (let j = 0; j < values.length; j++) {
          lines.push(`replace ${name} = ${values[j]} in ${j + 1}`);
        }
      } else {
        lines.push(`gen str244 ${name} = ""`);
        for (let j = 0; j < values.length; j++) {
          lines.push(`replace ${name} = "${String(values[j]).replace(/"/g, '\\"')}" in ${j + 1}`);
        }
      }
      lines.push('');
    }

    if (analyses) {
      lines.push('* Analyses');
      for (const a of analyses) lines.push(a);
    }

    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// BibTeX Citation
// ---------------------------------------------------------------------------

export function generateCitation(format: 'apa' | 'bibtex' | 'ris' = 'apa'): string {
  const year = new Date().getFullYear();
  if (format === 'bibtex') {
    return [
      '@software{aims_toolkit,',
      '  author = {Allem, Ahmed},',
      `  title = {{Stanford AIMS Toolkit: AI Methods for Social Scientists}},`,
      `  year = {${year}},`,
      '  url = {https://github.com/stanford-aims/toolkit},',
      '  note = {Open-source software for qualitative and quantitative analysis}',
      '}',
    ].join('\n');
  }
  if (format === 'ris') {
    return [
      'TY  - COMP',
      'AU  - Allem, Ahmed',
      `TI  - Stanford AIMS Toolkit: AI Methods for Social Scientists`,
      `PY  - ${year}`,
      'UR  - https://github.com/stanford-aims/toolkit',
      'ER  - ',
    ].join('\n');
  }
  // APA
  return `Allem, A. (${year}). Stanford AIMS Toolkit: AI Methods for Social Scientists [Computer software]. https://github.com/stanford-aims/toolkit`;
}
