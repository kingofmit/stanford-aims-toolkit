# @aims/sentiment

AFINN lexicon-based sentiment analysis, emotion detection, aspect sentiment, and temporal tracking for the Stanford AIMS Toolkit.

## Installation

```bash
pnpm add @aims/sentiment
```

## Usage

```typescript
import { analyzeSentiment, detectEmotions, aspectSentiment, temporalSentiment } from '@aims/sentiment';

const result = analyzeSentiment('I love this amazing research!');
// { score: 7, comparative: 1.4, positive: ['love', 'amazing'], negative: [] }

const emotions = detectEmotions('I am so happy and excited about this!');
// { joy: 0.8, surprise: 0.3, ... }

const aspects = aspectSentiment('The methodology was excellent but the sample size was too small.', ['methodology', 'sample size']);

const timeline = temporalSentiment([
  { text: 'Great progress today', date: '2026-01-01' },
  { text: 'Frustrating setback', date: '2026-01-02' },
]);
```

## License

[MIT](../../LICENSE)
