import { describe, it, expect } from "vitest";
import { parseCSV, parseJSON, detectColumnTypes, validateDataset } from "../index";

describe("parseCSV", () => {
  it("parses basic CSV", () => {
    const csv = "name,age,score\nAlice,30,85\nBob,25,92";
    const ds = parseCSV(csv);
    expect(ds.rowCount).toBe(2);
    expect(ds.rows[0].name).toBe("Alice");
    expect(ds.rows[0].age).toBe(30);
    expect(ds.rows[1].score).toBe(92);
  });

  it("handles quoted fields", () => {
    const csv = 'name,bio\n"Smith, John","He said ""hello"""';
    const ds = parseCSV(csv);
    expect(ds.rows[0].name).toBe("Smith, John");
    expect(ds.rows[0].bio).toBe('He said "hello"');
  });

  it("handles empty values", () => {
    const csv = "a,b\n1,\n,2";
    const ds = parseCSV(csv);
    expect(ds.rows[0].b).toBeNull();
    expect(ds.rows[1].a).toBeNull();
  });
});

describe("parseJSON", () => {
  it("parses array of objects", () => {
    const data = [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }];
    const ds = parseJSON(data);
    expect(ds.rowCount).toBe(2);
    expect(ds.rows[0].name).toBe("Alice");
  });
});

describe("detectColumnTypes", () => {
  it("detects numeric columns", () => {
    const ds = parseCSV("x,y\n1,hello\n2,world\n3,test");
    const numCol = ds.columns.find((c) => c.name === "x");
    expect(numCol?.type).toBe("number");
  });

  it("detects string columns", () => {
    const ds = parseCSV("x,y\n1,hello\n2,world");
    const strCol = ds.columns.find((c) => c.name === "y");
    expect(strCol?.type).toBe("string");
  });
});

describe("validateDataset", () => {
  it("detects empty dataset", () => {
    const result = validateDataset({ rows: [], columns: [], rowCount: 0, source: "test" });
    expect(result.valid).toBe(false);
  });

  it("warns about high null rates", () => {
    const csv = "a,b\n1,\n2,\n3,";
    const ds = parseCSV(csv);
    const result = validateDataset(ds);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
