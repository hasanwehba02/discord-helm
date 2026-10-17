# Contributing

Thanks for your interest in contributing! This document describes how to work on this project.

## Development Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

Requires Node.js >= 20 and an OpenAI-compatible LLM endpoint. See the [README](./README.md) for environment variables.

## Pull Requests

- Branch from `main`
- Branch name: `feat/description`, `fix/description`, `docs/description`, etc.
- Keep PRs focused — one feature or fix per PR
- Make sure the following all pass before submitting:

  ```bash
  npm run typecheck
  npm run build
  npm run lint
  npm test
  ```

- Add or update tests (`node:test`, under `test/*.test.ts`) when changing behavior
- Direct pushes to `main` are blocked; all changes go through PRs

## Commit Messages

```
prefix(scope): content
```

### Prefix

- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `docs` — Documentation
- `chore` — Build, config, and other maintenance

### Scope

Optional. The area of the codebase the change touches, e.g. `llm`, `context`, `db`, `events`.
Omit it when the change spans multiple areas.

### Examples

```
feat(llm): add a react tool so the model can add emoji reactions
fix(events): keep the typing indicator alive after each sent message
refactor(context): split context building from the chat-message mapping
docs: add CONTRIBUTING.md
```

## Code Style

- Formatting is handled by Prettier (`npm run format`) and linting by ESLint (`npm run lint`).
- Prefer clear, self-explanatory code over comments.
