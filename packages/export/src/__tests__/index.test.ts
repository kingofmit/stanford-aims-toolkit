import { describe, it, expect } from "vitest";
import {
  CSVExporter,
  JSONExporter,
  SPSSExporter,
  LaTeXExporter,
  RExporter,
  StataExporter,
  MethodsSectionGenerator,
  generateCitation,
} from "../index";

// ---------------------------------------------------------------------------
// CSVExporter
// ---------------------------------------------------------------------------

describe("CSVExporter", () => {
  it("produces correct output with headers and rows", () => {
    const exporter = new CSVExporter();
    const result = exporter.export(["name", "age"], [["Alice", 30], ["Bob", 25]]);
    expect(result).toContain("name,age");
    expect(result).toContain("Alice,30");
    expect(result).toContain("Bob,25");
  });

  it("wraps fields containing commas in double quotes", () => {
    const exporter = new CSVExporter();
    const result = exporter.export(["name"], [["Smith, John"]]);
    expect(result).toContain('"Smith, John"');
  });

  it("escapes embedded double quotes", () => {
    const exporter = new CSVExporter();
    const result = exporter.export(["note"], [['She said "hello"']]);
    expect(result).toContain('""hello""');
  });

  it("omits header row when includeHeader is false", () => {
    const exporter = new CSVExporter();
    const result = exporter.export(["id", "value"], [[1, 2]], { includeHeader: false });
    expect(result).not.toContain("id");
    expect(result).not.toContain("value");
    expect(result).toContain("1,2");
  });

  it("supports a custom delimiter", () => {
    const exporter = new CSVExporter();
    const result = exporter.export(["a", "b"], [[1, 2]], { delimiter: "\t" });
    expect(result).toContain("a\tb");
    expect(result).toContain("1\t2");
  });
});

// ---------------------------------------------------------------------------
// JSONExporter
// ---------------------------------------------------------------------------

describe("JSONExporter", () => {
  it("produces valid JSON output", () => {
    const exporter = new JSONExporter();
    const result = exporter.export([{ id: 1, name: "Alice" }]);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("wraps records under a 'data' key", () => {
    const exporter = new JSONExporter();
    const parsed = JSON.parse(exporter.export([{ x: 1 }]));
    expect(Array.isArray(parsed.data)).toBe(true);
    expect(parsed.data[0].x).toBe(1);
  });

  it("includes metadata when requested", () => {
    const exporter = new JSONExporter();
    const parsed = JSON.parse(exporter.export([{ a: 1 }], { includeMetadata: true }));
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.recordCount).toBe(1);
    expect(parsed.metadata.tool).toBe("Stanford AIMS Toolkit");
  });

  it("omits metadata by default", () => {
    const exporter = new JSONExporter();
    const parsed = JSON.parse(exporter.export([{ a: 1 }]));
    expect(parsed.metadata).toBeUndefined();
  });

  it("pretty-prints when pretty option is true", () => {
    const exporter = new JSONExporter();
    const result = exporter.export([{ a: 1 }], { pretty: true });
    expect(result).toContain("\n");
  });
});

// ---------------------------------------------------------------------------
// SPSSExporter
// ---------------------------------------------------------------------------

describe("SPSSExporter", () => {
  it("truncates variable names to 64 characters", () => {
    const exporter = new SPSSExporter();
    const longName = "a".repeat(80);
    const vars = exporter.buildVariableDefinitions([
      { name: longName, type: "numeric", label: "Long name" },
    ]);
    expect(vars[0].name.length).toBeLessThanOrEqual(64);
  });

  it("replaces non-alphanumeric characters in variable names", () => {
    const exporter = new SPSSExporter();
    const vars = exporter.buildVariableDefinitions([
      { name: "age-group", type: "numeric", label: "Age group" },
    ]);
    expect(vars[0].name).toBe("age_group");
  });

  it("generates syntax with BEGIN DATA and END DATA markers", () => {
    const exporter = new SPSSExporter();
    const vars = exporter.buildVariableDefinitions([
      { name: "score", type: "numeric", label: "Score" },
    ]);
    const syntax = exporter.generateSyntax(vars, [[42]]);
    expect(syntax).toContain("BEGIN DATA.");
    expect(syntax).toContain("END DATA.");
  });

  it("includes VARIABLE LABELS in generated syntax", () => {
    const exporter = new SPSSExporter();
    const vars = exporter.buildVariableDefinitions([
      { name: "age", type: "numeric", label: "Participant Age" },
    ]);
    const syntax = exporter.generateSyntax(vars, [[25]]);
    expect(syntax).toContain("VARIABLE LABELS age 'Participant Age'.");
  });

  it("includes VALUE LABELS when value mappings are provided", () => {
    const exporter = new SPSSExporter();
    const vars = exporter.buildVariableDefinitions([
      {
        name: "gender",
        type: "numeric",
        label: "Gender",
        values: [
          { value: 1, label: "Male" },
          { value: 2, label: "Female" },
        ],
      },
    ]);
    const syntax = exporter.generateSyntax(vars, [[1]]);
    expect(syntax).toContain("VALUE LABELS gender");
    expect(syntax).toContain("1 'Male'");
  });
});

// ---------------------------------------------------------------------------
// LaTeXExporter
// ---------------------------------------------------------------------------

describe("LaTeXExporter", () => {
  it("exportTable produces valid LaTeX with toprule/midrule/bottomrule", () => {
    const exporter = new LaTeXExporter();
    const result = exporter.exportTable(["Name", "Score"], [["Alice", 95], ["Bob", 87]]);
    expect(result).toContain("\\toprule");
    expect(result).toContain("\\midrule");
    expect(result).toContain("\\bottomrule");
  });

  it("exportTable wraps content in tabular and table environments", () => {
    const exporter = new LaTeXExporter();
    const result = exporter.exportTable(["A"], [["1"]]);
    expect(result).toContain("\\begin{table}");
    expect(result).toContain("\\end{table}");
    expect(result).toContain("\\begin{tabular}");
    expect(result).toContain("\\end{tabular}");
  });

  it("correlationTable includes significance stars for p < 0.05", () => {
    const exporter = new LaTeXExporter();
    const matrix = [[1, 0.65], [0.65, 1]];
    const pValues = [[0, 0.03], [0.03, 0]];
    const result = exporter.correlationTable(["Var1", "Var2"], matrix, pValues);
    expect(result).toContain("*");
    expect(result).toContain("p < .05");
  });

  it("correlationTable uses triple stars for p < 0.001", () => {
    const exporter = new LaTeXExporter();
    const matrix = [[1, 0.90], [0.90, 1]];
    const pValues = [[0, 0.0005], [0.0005, 0]];
    const result = exporter.correlationTable(["A", "B"], matrix, pValues);
    expect(result).toContain("***");
  });

  it("descriptiveTable has correct APA column headers", () => {
    const exporter = new LaTeXExporter();
    const result = exporter.descriptiveTable([
      { variable: "Age", n: 100, mean: 25.4, sd: 3.2, min: 18, max: 45 },
    ]);
    expect(result).toContain("Variable");
    expect(result).toContain("N");
    expect(result).toContain("M");
    expect(result).toContain("SD");
    expect(result).toContain("Min");
    expect(result).toContain("Max");
  });

  it("escapes LaTeX special characters in cell values", () => {
    const exporter = new LaTeXExporter();
    // Use a single-column table so the only '&' and '%' in the output come from
    // our cell values, making it easy to verify they were escaped.
    const result = exporter.exportTable(
      ["Note"],
      [["profit is 50%"], ["cost $10"], ["item #1"]],
    );
    // Escaped versions must appear
    expect(result).toContain("\\%");
    expect(result).toContain("\\$");
    expect(result).toContain("\\#");
    // No bare (unescaped) percent sign in cell content
    // The column-separator ' & ' uses & but no % should be bare
    expect(result).not.toMatch(/(?<!\\)%/);
  });
});

// ---------------------------------------------------------------------------
// RExporter
// ---------------------------------------------------------------------------

describe("RExporter", () => {
  it("generates a script with library() calls", () => {
    const exporter = new RExporter();
    const script = exporter.generateScript({
      headers: ["x", "y"],
      rows: [[1, 2], [3, 4]],
    });
    expect(script).toContain("library(tidyverse)");
    expect(script).toContain("library(psych)");
  });

  it("generates a tibble with the provided data", () => {
    const exporter = new RExporter();
    const script = exporter.generateScript({
      headers: ["score"],
      rows: [[10], [20]],
    });
    expect(script).toContain("tibble(");
    expect(script).toContain("score = c(10, 20)");
  });

  it("wraps string columns in quotes in the tibble", () => {
    const exporter = new RExporter();
    const script = exporter.generateScript({
      headers: ["name"],
      rows: [["Alice"], ["Bob"]],
    });
    expect(script).toContain('"Alice"');
    expect(script).toContain('"Bob"');
  });

  it("includes analysis commands when analyses are provided", () => {
    const exporter = new RExporter();
    const script = exporter.generateScript(
      { headers: ["x"], rows: [[1]] },
      [{ method: "descriptive" }],
    );
    expect(script).toContain("describe(data)");
  });

  it("includes correlation analysis command", () => {
    const exporter = new RExporter();
    const script = exporter.generateScript(
      { headers: ["x"], rows: [[1]] },
      [{ method: "correlation" }],
    );
    expect(script).toContain("cor(");
  });
});

// ---------------------------------------------------------------------------
// StataExporter
// ---------------------------------------------------------------------------

describe("StataExporter", () => {
  it("generates clear and set obs commands", () => {
    const exporter = new StataExporter();
    const doFile = exporter.generateDoFile(["score"], [[10], [20], [30]]);
    expect(doFile).toContain("clear");
    expect(doFile).toContain("set obs 3");
  });

  it("generates gen command for numeric variables", () => {
    const exporter = new StataExporter();
    const doFile = exporter.generateDoFile(["age"], [[25], [30]]);
    expect(doFile).toContain("gen age = .");
    expect(doFile).toContain("replace age = 25 in 1");
  });

  it("generates gen str244 for string variables", () => {
    const exporter = new StataExporter();
    const doFile = exporter.generateDoFile(["name"], [["Alice"], ["Bob"]]);
    expect(doFile).toContain("gen str244 name");
    expect(doFile).toContain('"Alice"');
  });

  it("sanitizes variable names with special characters", () => {
    const exporter = new StataExporter();
    const doFile = exporter.generateDoFile(["age-group"], [[1]]);
    expect(doFile).toContain("age_group");
  });

  it("includes analysis commands when provided", () => {
    const exporter = new StataExporter();
    const doFile = exporter.generateDoFile(["x"], [[1]], ["regress y x"]);
    expect(doFile).toContain("regress y x");
  });
});

// ---------------------------------------------------------------------------
// MethodsSectionGenerator
// ---------------------------------------------------------------------------

describe("MethodsSectionGenerator", () => {
  it("includes tool citation with author name in generated text", () => {
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: "Survey data were collected online.",
      sampleSize: 120,
      analysisSteps: [{ method: "Sentiment analysis", package: "@aims/sentiment" }],
    });
    expect(result.tools).toContain("Allem");
    expect(result.fullText).toContain("Allem");
  });

  it("includes sample size in generated text", () => {
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: "Interview transcripts were analyzed.",
      sampleSize: 50,
      analysisSteps: [{ method: "Thematic analysis", package: "@aims/topics" }],
    });
    expect(result.fullText).toContain("50 participants");
    expect(result.sampleDescription).toBe("N = 50");
  });

  it("lists the analysis pipeline steps", () => {
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: "Text data.",
      sampleSize: 10,
      analysisSteps: [
        { method: "Tokenization", package: "@aims/nlp" },
        { method: "Topic modeling", package: "@aims/topics" },
      ],
    });
    expect(result.analysisPipeline).toHaveLength(2);
    expect(result.fullText).toContain("Tokenization");
    expect(result.fullText).toContain("Topic modeling");
  });

  it("includes parameters in pipeline description when provided", () => {
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: "Survey data.",
      sampleSize: 30,
      analysisSteps: [
        { method: "LDA", package: "@aims/topics", parameters: "k = 10 topics" },
      ],
    });
    expect(result.fullText).toContain("k = 10 topics");
  });

  it("uses singular 'participant' for sample size of 1", () => {
    const gen = new MethodsSectionGenerator();
    const result = gen.generate({
      dataDescription: "Case study.",
      sampleSize: 1,
      analysisSteps: [],
    });
    expect(result.fullText).toContain("1 participant");
    expect(result.fullText).not.toContain("1 participants");
  });
});

// ---------------------------------------------------------------------------
// generateCitation
// ---------------------------------------------------------------------------

describe("generateCitation", () => {
  it("APA format contains author, year, title, and URL", () => {
    const citation = generateCitation("apa");
    expect(citation).toContain("Allem");
    expect(citation).toContain("Stanford AIMS Toolkit");
    expect(citation).toContain("https://github.com");
  });

  it("BibTeX format has required @software fields", () => {
    const citation = generateCitation("bibtex");
    expect(citation).toContain("@software{");
    expect(citation).toContain("author");
    expect(citation).toContain("title");
    expect(citation).toContain("year");
    expect(citation).toContain("url");
  });

  it("BibTeX year matches current year", () => {
    const citation = generateCitation("bibtex");
    const year = new Date().getFullYear();
    expect(citation).toContain(String(year));
  });

  it("RIS format has required TY, AU, TI, PY, UR, and ER tags", () => {
    const citation = generateCitation("ris");
    expect(citation).toContain("TY  -");
    expect(citation).toContain("AU  -");
    expect(citation).toContain("TI  -");
    expect(citation).toContain("PY  -");
    expect(citation).toContain("UR  -");
    expect(citation).toContain("ER  -");
  });

  it("defaults to APA format", () => {
    const citation = generateCitation();
    expect(citation).not.toContain("@software");
    expect(citation).not.toContain("TY  -");
    expect(citation).toContain("Allem");
  });
});
