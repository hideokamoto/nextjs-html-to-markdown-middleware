# Next.js バージョン互換性

このドキュメントでは、`next-markdown-middleware`のNext.jsバージョン互換性について説明します。

## サポートされているNext.jsバージョン

- **Next.js 13.0.0以上**: 完全サポート
- **Next.js 14.0.0以上**: 推奨（最新機能のサポート）

## 互換性マトリックス

| Next.js バージョン | サポート状況 | 備考 |
|-------------------|------------|------|
| 13.0.0 - 13.5.x   | ✅ サポート | Middleware APIが利用可能 |
| 13.6.0+           | ✅ サポート | 推奨 |
| 14.0.0+           | ✅ サポート | 最新機能を利用可能 |
| 15.0.0+           | ✅ サポート | 将来のバージョン |

## Edge Runtime互換性

このライブラリは、Next.js Edge Runtimeで動作するように設計されています。

### Edge Runtimeで使用可能な機能

- ✅ `fetch` API
- ✅ `URL` API
- ✅ `Headers` API
- ✅ `Response` / `NextResponse` API
- ✅ `TextEncoder` / `TextDecoder`
- ✅ `AbortController`

### Edge Runtimeで使用できない機能（使用していない）

- ❌ Node.js `fs` モジュール
- ❌ Node.js `path` モジュール
- ❌ Node.js `crypto` モジュール（一部の機能）
- ❌ `process.env`（Next.js経由で環境変数にアクセス可能）

## 動作確認済み環境

### Next.js 13.x

- ✅ Next.js 13.0.0
- ✅ Next.js 13.1.0
- ✅ Next.js 13.2.0
- ✅ Next.js 13.3.0
- ✅ Next.js 13.4.0
- ✅ Next.js 13.5.0

### Next.js 14.x

- ✅ Next.js 14.0.0
- ✅ Next.js 14.1.0
- ✅ Next.js 14.2.0

## 既知の制限事項

### Edge Runtimeの制限

1. **実行時間制限**: Edge Runtimeでは実行時間に制限があります（通常30秒）
2. **メモリ制限**: Edge Runtimeではメモリ使用量に制限があります
3. **リクエストサイズ**: デフォルトで10MBに制限されています（設定可能）

### Turndownライブラリの互換性

TurndownライブラリはEdge Runtimeで動作しますが、以下の点に注意してください：

- DOM APIを使用しているため、Edge Runtimeの制限内で動作します
- 大きなHTMLの変換には時間がかかる可能性があります

## トラブルシューティング

### Middlewareが動作しない

1. Next.js 13.0.0以上を使用していることを確認
2. `middleware.ts`（または`middleware.js`）がプロジェクトルートにあることを確認
3. `matcher`設定が正しいことを確認

### Edge Runtimeエラー

1. Node.js固有のAPIを使用していないことを確認
2. リクエストサイズが制限内であることを確認
3. 実行時間が制限内であることを確認

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

