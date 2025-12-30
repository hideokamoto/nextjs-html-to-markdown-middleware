import type { NextRequest } from 'next/server';

/**
 * キャッシュ設定
 */
export interface CacheOptions {
  /** キャッシュを有効にするか */
  enabled: boolean;
  /** キャッシュの最大有効期限（秒単位、デフォルト: 3600） */
  maxAge?: number;
}

/**
 * ヘッダー転送設定
 */
export interface HeadersOptions {
  /** 転送するヘッダー名のリスト */
  forward?: string[];
  /** カスタムヘッダー */
  custom?: Record<string, string>;
}

/**
 * パス除外設定
 */
export interface ExcludeOptions {
  /** 除外するパスパターン（正規表現または文字列） */
  paths?: (string | RegExp)[];
  /** APIルートを除外するか（デフォルト: true） */
  excludeApiRoutes?: boolean;
}

/**
 * Turndown設定
 */
export interface TurndownOptions {
  /** 見出しスタイル */
  headingStyle?: 'atx' | 'setext';
  /** コードブロックスタイル */
  codeBlockStyle?: 'fenced' | 'indented';
  /** 箇条書きマーカー */
  bulletListMarker?: '-' | '+' | '*';
  /** その他のTurndownオプション */
  [key: string]: unknown;
}

/**
 * Markdown Middlewareのオプション
 */
export interface MarkdownMiddlewareOptions {
  /** キャッシュ設定 */
  cache?: CacheOptions;
  /** ヘッダー転送設定 */
  headers?: HeadersOptions;
  /** パス除外設定 */
  exclude?: ExcludeOptions;
  /** Turndown設定 */
  turndown?: TurndownOptions;
  /** エラーハンドリング */
  onError?: (error: Error, request: NextRequest) => Response | null;
  /** リクエストサイズ制限（バイト単位、デフォルト: 10MB） */
  maxRequestSize?: number;
  /** fetchタイムアウト（ミリ秒単位、デフォルト: 30000） */
  fetchTimeout?: number;
}

/**
 * 内部リクエストの検証結果
 */
export interface RequestValidationResult {
  /** 有効なリクエストか */
  isValid: boolean;
  /** エラーメッセージ（無効な場合） */
  error?: string;
}

