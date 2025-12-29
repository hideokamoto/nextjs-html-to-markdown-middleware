import type { NextRequest } from 'next/server';
import type { RequestValidationResult, ExcludeOptions } from './types';

/**
 * 安全に転送できるヘッダーのリスト
 */
const SAFE_HEADERS = new Set([
  'user-agent',
  'accept-language',
  'accept-encoding',
  'accept',
  'referer',
  'origin',
]);

/**
 * リクエストが内部リクエストかどうかを検証
 * SSRF対策のため、外部URLへのリクエストを防ぐ
 *
 * @param url - 検証するURL
 * @param request - Next.jsリクエストオブジェクト
 * @returns 検証結果（有効な場合はisValid: true、無効な場合はエラーメッセージを含む）
 * @example
 * ```typescript
 * const url = new URL('http://localhost:3000/test');
 * const result = validateInternalRequest(url, request);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateInternalRequest(
  url: URL,
  request: NextRequest,
): RequestValidationResult {
  // 相対パスの場合は常に有効
  if (!url.hostname) {
    return { isValid: true };
  }

  // リクエストのホスト名を取得
  const requestHost = request.headers.get('host');
  if (!requestHost) {
    return {
      isValid: false,
      error: 'Missing Host header',
    };
  }

  // ホスト名の比較（ポート番号を除去）
  const requestHostname = requestHost.split(':')[0];
  const urlHostname = url.hostname;

  // localhost、127.0.0.1、または同じホスト名の場合のみ許可
  const isLocalhost =
    urlHostname === 'localhost' ||
    urlHostname === '127.0.0.1' ||
    urlHostname === '[::1]' ||
    urlHostname === requestHostname;

  if (!isLocalhost) {
    return {
      isValid: false,
      error: `External URL not allowed: ${urlHostname}`,
    };
  }

  return { isValid: true };
}

/**
 * 安全なヘッダーを抽出
 * 許可されたヘッダーのみを転送して、ヘッダーインジェクション攻撃を防ぐ
 *
 * @param request - Next.jsリクエストオブジェクト
 * @param forwardHeaders - 転送するヘッダー名のリスト（オプション）
 * @returns 抽出された安全なヘッダー
 * @example
 * ```typescript
 * const headers = extractSafeHeaders(request, ['user-agent', 'accept-language']);
 * ```
 */
export function extractSafeHeaders(
  request: NextRequest,
  forwardHeaders?: string[],
): Headers {
  const headers = new Headers();

  // カスタム転送ヘッダーを追加（安全なヘッダーのみ）
  if (forwardHeaders) {
    for (const headerName of forwardHeaders) {
      const lowerName = headerName.toLowerCase();
      if (SAFE_HEADERS.has(lowerName)) {
        const value = request.headers.get(headerName);
        if (value) {
          headers.set(headerName, value);
        }
      }
    }
  }

  // デフォルトの安全なヘッダーを追加（まだ追加されていない場合）
  for (const headerName of SAFE_HEADERS) {
    if (!headers.has(headerName)) {
      const value = request.headers.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    }
  }

  return headers;
}

/**
 * パスが除外対象かどうかを判定
 *
 * @param pathname - チェックするパス名
 * @param options - 除外設定オプション
 * @returns 除外対象の場合はtrue、そうでない場合はfalse
 * @example
 * ```typescript
 * if (shouldExcludePath('/api/test', { excludeApiRoutes: true })) {
 *   // APIルートは除外
 * }
 * ```
 */
export function shouldExcludePath(
  pathname: string,
  options?: ExcludeOptions,
): boolean {
  if (!options) {
    return false;
  }

  // APIルートを除外
  if (options.excludeApiRoutes !== false && pathname.startsWith('/api/')) {
    return true;
  }

  // カスタムパスパターンで除外
  if (options.paths) {
    for (const pattern of options.paths) {
      if (typeof pattern === 'string') {
        if (pathname.includes(pattern)) {
          return true;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(pathname)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * .md拡張子を除去して元のパスを取得
 *
 * @param pathname - .md拡張子が付いたパス名
 * @returns .md拡張子を除去したパス名
 * @example
 * ```typescript
 * const original = getOriginalPath('/about.md'); // '/about'
 * ```
 */
export function getOriginalPath(pathname: string): string {
  if (pathname.endsWith('.md')) {
    return pathname.slice(0, -3);
  }
  return pathname;
}

/**
 * 絶対URLを構築
 *
 * @param pathname - パス名
 * @param request - Next.jsリクエストオブジェクト
 * @returns 構築された絶対URL
 * @example
 * ```typescript
 * const url = buildAbsoluteUrl('/about', request);
 * // http://localhost:3000/about
 * ```
 */
export function buildAbsoluteUrl(
  pathname: string,
  request: NextRequest,
): URL {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost';
  return new URL(pathname, `${protocol}://${host}`);
}

/**
 * HTMLに<base>タグを追加して相対URLを解決
 * 相対URLを含むHTMLを正しく処理するために使用
 *
 * @param html - HTML文字列
 * @param baseUrl - ベースURL
 * @returns <base>タグが追加されたHTML文字列
 * @example
 * ```typescript
 * const htmlWithBase = addBaseTag('<html><body>...</body></html>', 'http://example.com');
 * ```
 */
export function addBaseTag(html: string, baseUrl: string): string {
  // 既に<base>タグがある場合は置き換え
  const baseTagRegex = /<base[^>]*>/i;
  const baseTag = `<base href="${baseUrl}">`;

  if (baseTagRegex.test(html)) {
    return html.replace(baseTagRegex, baseTag);
  }

  // <head>タグの直後に<base>タグを追加
  const headRegex = /<head[^>]*>/i;
  if (headRegex.test(html)) {
    return html.replace(headRegex, `$&${baseTag}`);
  }

  // <html>タグの直後に<base>タグを追加
  const htmlRegex = /<html[^>]*>/i;
  if (htmlRegex.test(html)) {
    return html.replace(htmlRegex, `$&<head>${baseTag}</head>`);
  }

  // どれもない場合は先頭に追加
  return `${baseTag}${html}`;
}

