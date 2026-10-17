# discord-helm

English | [日本語](./README.ja.md)

An interface for an LLM to operate Discord as a bot: actions on Discord are exposed to the LLM as tools.
Works with any OpenAI-compatible API.

> This project is in the early stages of development. The interfaces and specifications are subject to change.

## Design

- Actions are offered to the LLM as tool choices, so it acts on Discord actively within the loop.
- Every action on Discord goes through a tool.

## Setup

```bash
git clone https://github.com/ritzowo/discord-helm.git
cd discord-helm
npm install
cp .env.example .env   # fill in each value
npm run dev
```

## Environment Variables

Set these in `.env` (copy it from `.env.example`).

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | Discord application (client) ID |
| `DISCORD_GUILD_ID` | | If set, registers slash commands only to that guild (handy for development) |
| `LLM_MODEL` | ✅ | Model ID to use (e.g. `openai.gpt-oss-120b-1:0`) |
| `LLM_BASE_URL` | | Base URL of the OpenAI-compatible endpoint (default: `http://localhost:11434/v1`) |
| `LLM_API_KEY` | | API key (if the backend requires one) |
| `LLM_TEMPERATURE` | | Sent only when set (otherwise the server default applies) |
| `LLM_TIMEOUT_MS` | | LLM request timeout in milliseconds (default: `120000`) |
| `DB_PATH` | | Path to the SQLite file (default: `./data/discord-helm.sqlite`) |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start in development mode (watches for file changes) |
| `npm run build` | Build TypeScript |
| `npm start` | Start the built bot |
| `npm run typecheck` | Type-check |
| `npm test` | Run tests (node:test) |
| `npm run lint` | ESLint |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate migrations from the schema (Drizzle) |
| `npm run db:studio` | Launch Drizzle Studio |

## Contribution

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.

## LICENSE

[MIT](./LICENSE)
