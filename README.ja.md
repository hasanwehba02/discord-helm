# discord-helm

[English](./README.md) | 日本語

LLMがBotとしてDiscordを操作するためのインターフェースで、Discordへの作用をツールとして提供しています。
OpenAI 互換 API に対応。

> This project is in the early stages of development. The interfaces and specifications are subject to change.

## 設計思想

- Toolsとして選択肢を提示することでループの中で能動的にDiscordへの操作をさせる。
- Discordへの作用はすべてツール経由。

## セットアップ

```bash
git clone https://github.com/ritzowo/discord-helm.git
cd discord-helm
npm install
cp .env.example .env   # 各値を設定
npm run dev
```

## 環境変数

`.env`（`.env.example` をコピーして作成）に設定します。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Discord Bot のトークン |
| `DISCORD_CLIENT_ID` | ✅ | Discord アプリケーション（クライアント）ID |
| `DISCORD_GUILD_ID` | | 指定するとそのギルドにのみスラッシュコマンドを登録（開発時に便利） |
| `LLM_MODEL` | ✅ | 使用するモデル ID（例: `openai.gpt-oss-120b-1:0`） |
| `LLM_BASE_URL` | | OpenAI 互換エンドポイントのベース URL（既定: `http://localhost:11434/v1`） |
| `LLM_API_KEY` | | API キー（必要なバックエンドの場合） |
| `LLM_TEMPERATURE` | | 指定時のみリクエストに付与（未指定ならサーバー既定に委ねる） |
| `LLM_TIMEOUT_MS` | | LLM リクエストのタイムアウト（ミリ秒、既定: `120000`） |
| `DB_PATH` | | SQLite ファイルのパス（既定: `./data/discord-helm.sqlite`） |

## Scripts

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発モードで起動（ファイル変更を監視） |
| `npm run build` | TypeScript をビルド |
| `npm start` | ビルド済みの Bot を起動 |
| `npm run typecheck` | 型チェック |
| `npm test` | テスト実行（node:test） |
| `npm run lint` | ESLint |
| `npm run format` | Prettier で整形 |
| `npm run db:generate` | スキーマからマイグレーションを生成（Drizzle） |
| `npm run db:studio` | Drizzle Studio を起動 |

## Contribution

コントリビュート方法は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## LICENSE

[MIT](./LICENSE)
