export * from "./types";
import type { ExportConfig, SPSSVariable, MethodsSection } from "./types";

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
