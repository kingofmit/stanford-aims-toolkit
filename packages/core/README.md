# @aims/core

Dataset loading, column type detection, data validation, and project management for the Stanford AIMS Toolkit.

## Installation

```bash
pnpm add @aims/core
```

## Usage

```typescript
import { loadCSV, loadJSON, validateDataset, detectColumnTypes, createProject } from '@aims/core';

const dataset = await loadCSV('data.csv');
const types = detectColumnTypes(dataset);
const validated = validateDataset(dataset);
const project = createProject('My Research', dataset);
```

## License

[MIT](../../LICENSE)
