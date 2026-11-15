# Contributing to Stanford AIMS Toolkit

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/stanford-aims-toolkit.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development

```bash
# Build all packages
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Project Structure

```
packages/
  core/        # Dataset loading, validation, project management
  nlp/         # Tokenization, NER, text stats
  sentiment/   # Sentiment & emotion analysis
  topics/      # LDA topic modeling
  coding/      # Qualitative coding & inter-rater reliability
  embeddings/  # Text embeddings & clustering
  survey/      # Descriptive stats & factor analysis
  export/      # CSV/JSON/SVG export & APA methods generator
```

## Pull Requests

1. Ensure your code builds: `pnpm build`
2. Add tests for new functionality
3. Update relevant README files
4. Submit a PR with a clear description of changes

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add emotion detection to sentiment package`
- `fix: correct chi-square calculation in survey`
- `docs: update quick start guide`

## Reporting Issues

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) for bugs
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) for ideas

## Questions?

Reach out at **allem.ahmed@gmail.com**.
