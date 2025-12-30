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
  // IPv6アドレスの場合、ブラケットを除去してからポート番号を除去
  let requestHostname = requestHost;
  if (requestHostname.startsWith('[')) {
    // IPv6: [::1]:3000 -> ::1
    const closeBracket = requestHostname.indexOf(']');
    if (closeBracket !== -1) {
      requestHostname = requestHostname.slice(1, closeBracket);
    }
  } else {
    // IPv4/hostname: localhost:3000 -> localhost
    requestHostname = requestHostname.split(':')[0];
  }
  const urlHostname = url.hostname;

  // localhost、127.0.0.1、::1、または同じホスト名の場合のみ許可
  const isLocalhost =
    urlHostname === 'localhost' ||
    urlHostname === '127.0.0.1' ||
    urlHostname === '::1' ||
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
 *                         指定された場合、SAFE_HEADERSとの交差のみが転送される
 *                         指定されない場合、すべてのSAFE_HEADERSが転送される
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

  if (forwardHeaders) {
    // forwardHeadersが指定された場合、SAFE_HEADERSとの交差のみを転送
    for (const headerName of forwardHeaders) {
      const lowerName = headerName.toLowerCase();
      if (SAFE_HEADERS.has(lowerName)) {
        const value = request.headers.get(headerName);
        if (value) {
          headers.set(headerName, value);
        }
      }
    }
  } else {
    // forwardHeadersが指定されない場合、すべてのSAFE_HEADERSを転送
    for (const headerName of SAFE_HEADERS) {
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
 *
 * // 文字列パターンは部分一致（パス内の任意の位置にマッチ）
 * shouldExcludePath('/foo/admin/bar', { paths: ['admin'] }) // true
 *
 * // より精密なマッチングにはRegExpを使用
 * shouldExcludePath('/foo/admin', { paths: [/^\/admin/] }) // false
 * shouldExcludePath('/admin/bar', { paths: [/^\/admin/] }) // true
 * ```
 *
 * @remarks
 * 文字列パターンは pathname.includes() を使用して部分一致を行います。
 * セグメント単位やプレフィックスマッチングには RegExp パターンの使用を推奨します。
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
  // x-forwarded-proto ヘッダーを検証（ホワイトリスト方式）
  const forwardedProto = request.headers.get('x-forwarded-proto');
  let protocol = 'https';
  if (forwardedProto) {
    const normalizedProto = forwardedProto.trim().toLowerCase();
    if (normalizedProto === 'http' || normalizedProto === 'https') {
      protocol = normalizedProto;
    }
  }
  const host = request.headers.get('host') || 'localhost';
  return new URL(pathname, `${protocol}://${host}`);
}

/**
 * HTML属性値をエスケープ
 * XSS対策のため、HTMLエンティティに変換
 *
 * @param value - エスケープする文字列
 * @returns エスケープされた文字列
 * @internal
 */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  // XSS対策: baseUrlをエスケープ
  const safeBaseUrl = escapeHtmlAttribute(baseUrl);

  // 既に<base>タグがある場合は置き換え
  const baseTagRegex = /<base[^>]*>/i;
  const baseTag = `<base href="${safeBaseUrl}">`;

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

