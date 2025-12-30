# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-30

### Added

- 基本的なHTML→Markdown変換機能
- `.md`拡張子が付いたリクエストの自動検出
- 設定可能なオプション（キャッシュ、ヘッダー転送、パス除外、Turndown設定）
- セキュリティ対策（SSRF対策、安全なヘッダー転送、リクエストサイズ制限）
- エラーハンドリング（カスタムエラーハンドラーのサポート）
- 相対URL解決（`<base>`タグの追加）
- シングルトンパターンによるTurndownServiceの最適化
- TypeScript完全サポート
- 包括的なテストスイート
- ドキュメント（README、使用例）

### Security

- 内部リクエストのみ許可（SSRF対策）
- 安全なヘッダーのみ転送
- リクエストサイズ制限（デフォルト10MB）

