# next-markdown-middleware

Next.js Middleware用のHTML→Markdown変換ライブラリです。`.md`拡張子が付いたリクエストを自動的にHTMLページからMarkdown形式に変換します。

## 特徴

- 🚀 **簡単な統合**: Next.js Middlewareに簡単に統合可能
- 🔒 **セキュリティ**: SSRF対策、安全なヘッダー転送、リクエストサイズ制限
- ⚡ **パフォーマンス**: キャッシュサポート、シングルトンパターンによる最適化
- 🎨 **カスタマイズ可能**: 豊富なオプション設定
- 📦 **TypeScript**: 完全なTypeScriptサポート
- ⚡ **Edge Runtime対応**: Next.js Edge Runtimeで動作
- 🔄 **Next.js互換性**: Next.js 13.0.0以上をサポート

## インストール

```bash
npm install next-markdown-middleware turndown
# または
yarn add next-markdown-middleware turndown
# または
pnpm add next-markdown-middleware turndown
```

## 基本的な使用方法

### 1. Middlewareファイルの作成

`middleware.ts`（または`middleware.js`）をプロジェクトルートに作成します：

```typescript
import { createMarkdownMiddleware } from 'next-markdown-middleware';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return createMarkdownMiddleware()(request);
}

export const config = {
  matcher: ['/:path*.md'],
};
```

### 2. 使用例

`/about`ページにアクセスする代わりに、`/about.md`にアクセスすると、自動的にMarkdown形式で返されます。

## オプション設定

### キャッシュ設定

```typescript
createMarkdownMiddleware({
  cache: {
    enabled: true,
    maxAge: 3600, // 秒単位（デフォルト: 3600）
  },
});
```

### ヘッダー転送設定

```typescript
createMarkdownMiddleware({
  headers: {
    // 転送するヘッダー名のリスト
    forward: ['user-agent', 'accept-language'],
    // カスタムヘッダー
    custom: {
      'X-Markdown-Converted': 'true',
    },
  },
});
```

### パス除外設定

```typescript
createMarkdownMiddleware({
  exclude: {
    // 除外するパスパターン（正規表現または文字列）
    paths: ['/admin', /^\/private/],
    // APIルートを除外するか（デフォルト: true）
    excludeApiRoutes: true,
  },
});
```

### Turndown設定

```typescript
createMarkdownMiddleware({
  turndown: {
    headingStyle: 'atx', // 'atx' | 'setext'
    codeBlockStyle: 'fenced', // 'fenced' | 'indented'
    bulletListMarker: '-', // '-' | '+' | '*'
  },
});
```

### エラーハンドリング

```typescript
createMarkdownMiddleware({
  onError: (error, request) => {
    console.error('Markdown conversion error:', error);
    return new Response(
      JSON.stringify({ error: 'Conversion failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  },
});
```

### リクエストサイズ制限

```typescript
createMarkdownMiddleware({
  maxRequestSize: 10 * 1024 * 1024, // 10MB（デフォルト）
});
```

### フェッチタイムアウト設定

```typescript
createMarkdownMiddleware({
  fetchTimeout: 30000, // ミリ秒単位（デフォルト: 30000 = 30秒）
});
```

タイムアウトが発生した場合、504（Gateway Timeout）エラーを返します。

## APIリファレンス

### `createMarkdownMiddleware(options?)`

Markdown Middleware関数を作成します。

**パラメータ:**
- `options` (optional): `MarkdownMiddlewareOptions` - Middlewareオプション

**戻り値:**
- `(request: NextRequest) => Promise<Response | NextResponse>` - Middleware関数

### `handleMarkdownRequest(request, options?)`

Markdownリクエストを処理します。既存のmiddlewareに統合しやすいスタンドアロン関数です。

**パラメータ:**
- `request`: `NextRequest` - Next.jsリクエストオブジェクト
- `options` (optional): `MarkdownMiddlewareOptions` - Middlewareオプション

**戻り値:**
- `Promise<Response | null>` - レスポンスまたはnull（処理しない場合）

### `convertHtmlToMarkdown(html, baseUrl, options?)`

HTMLをMarkdownに変換します。

**パラメータ:**
- `html`: `string` - 変換するHTML文字列
- `baseUrl`: `string` - 相対URL解決のためのベースURL
- `options` (optional): `TurndownOptions` - Turndownオプション

**戻り値:**
- `string` - 変換されたMarkdown文字列

## 型定義

```typescript
interface MarkdownMiddlewareOptions {
  cache?: {
    enabled: boolean;
    maxAge?: number; // 秒単位（デフォルト: 3600）
  };
  headers?: {
    forward?: string[];
    custom?: Record<string, string>;
  };
  exclude?: {
    paths?: (string | RegExp)[];
    excludeApiRoutes?: boolean; // デフォルト: true
  };
  turndown?: {
    headingStyle?: 'atx' | 'setext';
    codeBlockStyle?: 'fenced' | 'indented';
    bulletListMarker?: '-' | '+' | '*';
    [key: string]: unknown;
  };
  onError?: (error: Error, request: NextRequest) => Response | null;
  maxRequestSize?: number; // バイト単位（デフォルト: 10MB）
  fetchTimeout?: number; // ミリ秒単位（デフォルト: 30000 = 30秒）
}
```

## セキュリティ

このライブラリは以下のセキュリティ対策を実装しています：

### SSRF対策

- **内部リクエストのみ許可**: 外部URLへのリクエストを防ぐため、localhost、127.0.0.1、または同じホスト名のみを許可
- **ホスト名検証**: リクエストのHostヘッダーと比較して、内部リクエストであることを確認

### ヘッダーインジェクション対策

- **安全なヘッダーのみ転送**: 許可されたヘッダー（user-agent、accept-language、accept-encoding、accept、referer、origin）のみを転送
- **カスタムヘッダーの検証**: カスタム転送ヘッダーも安全なヘッダーリストに含まれている場合のみ転送

### リクエストサイズ制限

- **デフォルト制限**: 10MB（設定可能）
- **Content-Lengthチェック**: レスポンスヘッダーのContent-Lengthを事前にチェック
- **実際のサイズチェック**: Content-Lengthヘッダーがない場合も、実際のレスポンスサイズをチェック

### Content-Type検証

- **HTMLコンテンツのみ許可**: レスポンスのContent-Typeが`text/html`または`application/xhtml+xml`でない場合、415（Unsupported Media Type）エラーを返します
- **セキュリティ**: 意図しないコンテンツタイプの処理を防ぎます

### タイムアウト処理

- **デフォルトタイムアウト**: 30秒（設定可能）
- **タイムアウト時の動作**: タイムアウトが発生した場合、504（Gateway Timeout）エラーを返します
- **AbortController**: 内部でAbortControllerを使用してタイムアウトを実装しています

### 相対URL解決

- **`<base>`タグの追加**: 相対URLを含むHTMLを正しく処理するため、`<base>`タグを自動的に追加
- **既存の`<base>`タグの置き換え**: 既存の`<base>`タグがある場合は、安全なベースURLに置き換え

### 依存関係のセキュリティ

定期的に依存関係のセキュリティチェックを実施することを推奨します：

```bash
npm audit
```

または、GitHubのDependabotやSnykなどのツールを使用して、自動的にセキュリティ更新を監視できます。

詳細は[セキュリティドキュメント](./docs/SECURITY.md)を参照してください。

## パフォーマンス

- **キャッシュヘッダー**: 設定可能なキャッシュヘッダー
- **シングルトンパターン**: TurndownServiceのシングルトン初期化
- **不要な処理のスキップ**: 除外パスや非`.md`リクエストの早期リターン
- **高速な変換**: 小さいHTML（1KB）は100ms以内、中サイズ（100KB）は1秒以内で変換
- **早期リターン**: 非`.md`リクエストは10ms以内で処理をスキップ

### パフォーマンステスト

```bash
npm run test -- __tests__/performance.test.ts
```

## Next.js互換性

### サポートされているバージョン

- **Next.js 13.0.0以上**: 完全サポート
- **Next.js 14.0.0以上**: 推奨

詳細は[互換性ドキュメント](./docs/COMPATIBILITY.md)を参照してください。

### Edge Runtime対応

このライブラリは、Next.js Edge Runtimeで動作するように設計されています。

- ✅ Edge Runtimeで使用可能なAPIのみを使用
- ✅ Node.js固有のAPIを使用していない
- ✅ 実行時間とメモリ使用量を最適化

詳細は[互換性ドキュメント](./docs/COMPATIBILITY.md)を参照してください。

## 開発

```bash
# 依存関係のインストール
npm install

# ビルド（ESMとCJSの両方を生成）
npm run build

# テスト
npm test

# テストカバレッジ（80%以上のカバレッジを目標）
npm run test:coverage

# セキュリティテスト
npm run test:security

# パフォーマンステスト
npm run test:performance

# Edge Runtimeテスト
npm run test:edge

# Lint
npm run lint

# Lint修正
npm run lint:fix

# フォーマット
npm run format

# 型チェック
npm run typecheck
```

### ビルド出力

ビルド後、以下のファイルが`dist/`ディレクトリに生成されます：

- `index.js` - ESM形式のメインファイル
- `index.cjs` - CommonJS形式のメインファイル
- `index.d.ts` - TypeScript型定義ファイル
- その他のソースファイル（`.js`、`.cjs`、`.d.ts`）

## ライセンス

MIT

## 貢献

プルリクエストやイシューの報告を歓迎します！

## 注意事項

### Next.jsのバージョン互換性

- Next.js 13.0.0以上が必要です
- 詳細は[互換性ドキュメント](./docs/COMPATIBILITY.md)を参照してください

### Edge Runtimeでの動作

- このライブラリはNext.js Edge Runtimeで動作するように設計されています
- Node.js固有のAPIは使用していません
- 詳細は[互換性ドキュメント](./docs/COMPATIBILITY.md)を参照してください

### パフォーマンス

- 小さいHTML（1KB）は100ms以内で変換されます
- 中サイズのHTML（100KB）は1秒以内で変換されます
- パフォーマンステストは`npm run test:performance`で実行できます

### セキュリティ

- SSRF対策、ヘッダーインジェクション対策、リクエストサイズ制限を実装
- 詳細は[セキュリティドキュメント](./docs/SECURITY.md)を参照してください
- セキュリティテストは`npm run test:security`で実行できます

## 変更履歴

### 0.1.0

- 初回リリース
- 基本的なHTML→Markdown変換機能
- オプション設定のサポート
- セキュリティ対策の実装
- Edge Runtime対応
- パフォーマンス最適化
- 包括的なテストスイート

