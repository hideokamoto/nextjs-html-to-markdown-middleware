import { NextRequest, NextResponse } from 'next/server';
import type { MarkdownMiddlewareOptions } from './types';
import {
  validateInternalRequest,
  extractSafeHeaders,
  shouldExcludePath,
  getOriginalPath,
  buildAbsoluteUrl,
} from './utils';
import { convertHtmlToMarkdown } from './converter';

/**
 * Markdownリクエストを処理
 *
 * @param request - Next.jsリクエストオブジェクト
 * @param options - Middlewareオプション
 * @returns レスポンスまたはnull（処理しない場合）
 */
export async function handleMarkdownRequest(
  request: NextRequest,
  options?: MarkdownMiddlewareOptions,
): Promise<Response | null> {
  const { pathname } = request.nextUrl;

  // .md拡張子が付いていない場合は処理しない
  if (!pathname.endsWith('.md')) {
    return null;
  }

  // 除外パスのチェック
  if (shouldExcludePath(pathname, options?.exclude)) {
    return null;
  }

  try {
    // 元のパスを取得
    const originalPath = getOriginalPath(pathname);
    const originalUrl = buildAbsoluteUrl(originalPath, request);

    // 内部リクエストの検証（SSRF対策）
    const validation = validateInternalRequest(originalUrl, request);
    if (!validation.isValid) {
      return new NextResponse(
        JSON.stringify({ error: validation.error }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // 安全なヘッダーを抽出
    const headers = extractSafeHeaders(
      request,
      options?.headers?.forward,
    );

    // HTMLをfetch
    const response = await fetch(originalUrl.toString(), {
      headers,
      method: 'GET',
    });

    // 404エラーの処理
    if (response.status === 404) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // その他のエラーステータス
    if (!response.ok) {
      return new NextResponse(
        `Failed to fetch: ${response.statusText}`,
        { status: response.status },
      );
    }

    // レスポンスサイズのチェック
    const contentLength = response.headers.get('content-length');
    const maxSize = options?.maxRequestSize || 10 * 1024 * 1024; // デフォルト10MB
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return new NextResponse('Request Entity Too Large', { status: 413 });
    }

    // HTMLを取得
    const html = await response.text();

    // 実際のサイズをチェック（Content-Lengthヘッダーがない場合）
    if (html.length > maxSize) {
      return new NextResponse('Request Entity Too Large', { status: 413 });
    }

    // HTMLをMarkdownに変換
    const markdown = convertHtmlToMarkdown(
      html,
      originalUrl.toString(),
      options?.turndown,
    );

    // レスポンスヘッダーを設定
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/markdown; charset=utf-8');

    // キャッシュヘッダーの設定
    if (options?.cache?.enabled) {
      const maxAge = options.cache.maxAge || 3600;
      responseHeaders.set(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      );
    } else {
      responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    // カスタムヘッダーの追加
    if (options?.headers?.custom) {
      for (const [key, value] of Object.entries(options.headers.custom)) {
        responseHeaders.set(key, value);
      }
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    // カスタムエラーハンドラーがある場合は使用
    if (options?.onError && error instanceof Error) {
      const customResponse = options.onError(error, request);
      if (customResponse) {
        return customResponse;
      }
    }

    // デフォルトのエラーハンドリング
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Markdown Middlewareを作成
 * Next.js Middlewareで使用する関数を返す
 *
 * @param options - Middlewareオプション
 * @returns Middleware関数（NextRequestを受け取り、ResponseまたはNextResponseを返す）
 * @example
 * ```typescript
 * export function middleware(request: NextRequest) {
 *   return createMarkdownMiddleware({
 *     cache: { enabled: true },
 *   })(request);
 * }
 * ```
 */
export function createMarkdownMiddleware(
  options?: MarkdownMiddlewareOptions,
) {
  return async (request: NextRequest): Promise<Response | NextResponse> => {
    const result = await handleMarkdownRequest(request, options);
    return result || NextResponse.next();
  };
}

