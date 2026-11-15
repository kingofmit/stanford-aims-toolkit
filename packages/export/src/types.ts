export interface ExportConfig { format: "csv" | "json" | "spss" | "stata" | "r"; filename: string; includeMetadata?: boolean; encoding?: string; }
export interface SPSSVariable { name: string; type: "numeric" | "string"; label: string; values?: { value: number; label: string }[]; width?: number; decimals?: number; }
export interface StataVariable { name: string; type: "byte" | "int" | "long" | "float" | "double" | "str"; label: string; format?: string; }
export interface MethodsSection { title: string; dataCollection: string; sampleDescription: string; analysisPipeline: string[]; tools: string; fullText: string; }
export interface VisualizationExport { format: "svg" | "png"; width: number; height: number; content: string; }
