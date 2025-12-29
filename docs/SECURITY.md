# セキュリティ

このドキュメントでは、`next-markdown-middleware`のセキュリティ対策について説明します。

## セキュリティ対策

### 1. SSRF（Server-Side Request Forgery）対策

#### 実装内容

- **内部リクエストのみ許可**: 外部URLへのリクエストを防ぐため、以下のホストのみを許可：
  - `localhost`
  - `127.0.0.1`
  - `[::1]` (IPv6 localhost)
  - リクエストのHostヘッダーと同じホスト名
  - 相対パス

#### 検証方法

```typescript
// ✅ 許可される
http://localhost:3000/test
http://127.0.0.1:3000/test
/relative/path

// ❌ 拒否される
http://example.com/test
http://malicious.com/test
```

### 2. ヘッダーインジェクション対策

#### 実装内容

- **安全なヘッダーのみ転送**: 以下のヘッダーのみを転送：
  - `user-agent`
  - `accept-language`
  - `accept-encoding`
  - `accept`
  - `referer`
  - `origin`

#### 検証方法

カスタム転送ヘッダーが指定されても、安全なヘッダーリストに含まれていない場合は転送されません。

```typescript
// カスタムヘッダーが指定されても、安全でないヘッダーは転送されない
headers: {
  forward: ['x-malicious-header', 'user-agent']
}
// → user-agentのみ転送される
```

### 3. リクエストサイズ制限

#### 実装内容

- **デフォルト制限**: 10MB（設定可能）
- **Content-Lengthチェック**: レスポンスヘッダーのContent-Lengthを事前にチェック
- **実際のサイズチェック**: Content-Lengthヘッダーがない場合も、実際のレスポンスサイズをチェック

#### 設定方法

```typescript
createMarkdownMiddleware({
  maxRequestSize: 10 * 1024 * 1024, // 10MB（デフォルト）
});
```

### 4. 相対URL解決

#### 実装内容

- **`<base>`タグの追加**: 相対URLを含むHTMLを正しく処理するため、`<base>`タグを自動的に追加
- **既存の`<base>`タグの置き換え**: 既存の`<base>`タグがある場合は、安全なベースURLに置き換え

### 5. エラーハンドリング

#### 実装内容

- **機密情報の保護**: エラーメッセージに機密情報が含まれないように注意
- **カスタムエラーハンドラー**: ユーザーがカスタムエラーハンドラーを指定可能

## セキュリティベストプラクティス

### 推奨設定

```typescript
createMarkdownMiddleware({
  // リクエストサイズ制限を設定
  maxRequestSize: 5 * 1024 * 1024, // 5MB

  // キャッシュを有効化（パフォーマンス向上）
  cache: {
    enabled: true,
    maxAge: 3600,
  },

  // カスタムエラーハンドラー
  onError: (error, request) => {
    // ログに記録（本番環境では適切なログサービスを使用）
    console.error('Markdown conversion error:', error);

    // ユーザーには汎用的なエラーメッセージを返す
    return new NextResponse(
      JSON.stringify({ error: 'Conversion failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  },
});
```

### セキュリティチェックリスト

- [ ] リクエストサイズ制限を適切に設定
- [ ] カスタムエラーハンドラーで機密情報を保護
- [ ] キャッシュ設定を適切に設定
- [ ] 除外パスを適切に設定（機密情報を含むページを除外）
- [ ] 定期的に依存関係のセキュリティチェックを実施

## 依存関係のセキュリティ

### セキュリティチェック

定期的に依存関係のセキュリティチェックを実施してください：

```bash
# npm audit
npm audit

# 自動修正（可能な場合）
npm audit fix

# 詳細なレポート
npm audit --json
```

### 推奨ツール

- **GitHub Dependabot**: 自動的にセキュリティ更新を監視
- **Snyk**: 依存関係の脆弱性をスキャン
- **npm audit**: npmの組み込みセキュリティチェック

## 脆弱性の報告

セキュリティ脆弱性を発見した場合は、GitHubのSecurity Advisoryで報告してください。

**重要**: 公開リポジトリやIssuesで脆弱性を報告しないでください。

## 変更履歴

### v0.1.0

- 初回リリース
- SSRF対策の実装
- ヘッダーインジェクション対策の実装
- リクエストサイズ制限の実装

