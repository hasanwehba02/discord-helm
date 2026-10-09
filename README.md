# discord-llm

Discord bot for chatting with local LLMs (OpenAI-compatible API), with per-thread sessions.
Designed for multi-user Discord servers. Pluggable model backends. OSS.

> Status: early scaffold. Connects to Discord and replies to mentions.

## Requirements

- Node.js >= 20
- A local LLM exposing an OpenAI-compatible API (llama.cpp server, LM Studio, vLLM, etc.) — _integration not wired up yet_

## Setup

```bash
npm install
cp .env.example .env   # then fill in DISCORD_TOKEN and DISCORD_CLIENT_ID
```

Get `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` from the
[Discord Developer Portal](https://discord.com/developers/applications).
Enable the **Message Content Intent** for the bot.

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Run with hot reload (tsx watch)          |
| `npm run build`     | Compile TypeScript to `dist/`            |
| `npm start`         | Run the compiled bot (`dist/index.js`)   |
| `npm run typecheck` | Type-check without emitting              |
| `npm run lint`      | Lint `src/`                              |
| `npm run format`    | Format with Prettier                     |

## Project layout

```
src/
  config.ts               # loads & validates environment variables
  index.ts                # Discord client entry point
  events/
    messageCreate.ts      # replies when the bot is mentioned
```
