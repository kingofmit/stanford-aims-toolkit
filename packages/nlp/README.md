# @aims/nlp

Tokenization, stopword removal, stemming, NER, text stats, language detection, and n-grams for the Stanford AIMS Toolkit.

## Installation

```bash
pnpm add @aims/nlp
```

## Usage

```typescript
import { tokenize, removeStopwords, stem, extractEntities, textStats, detectLanguage, ngrams } from '@aims/nlp';

const tokens = tokenize('The researchers analyzed social media data.');
const cleaned = removeStopwords(tokens);
const stemmed = cleaned.map(stem);
const entities = extractEntities('Dr. Smith works at Stanford University.');
const stats = textStats('A sample text for analysis.');
const lang = detectLanguage('This is English text.');
const bigrams = ngrams(tokens, 2);
```

## License

[MIT](../../LICENSE)
