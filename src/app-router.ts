/**
 * Next.js App Router用のRoute Handlerヘルパー
 *
 * @packageDocumentation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { convertHtmlToMarkdown } from './converter';
import type { TurndownOptions } from './types';
import { extractSafeHeaders, validateInternalRequest } from './utils';

/**
 * App Router Route Handler用のオプション
 */
export interface MarkdownRouteHandlerOptions {
  /** キャッシュ設定 */
  cache?: {
    /** Cache-Control max-age（秒単位、デフォルト: 3600） */
    maxAge?: number;
    /** Cache-Control s-maxage（秒単位） */
    sMaxAge?: number;
  };
  /** Turndownオプション */
  turndown?: TurndownOptions;
  /** 転送するヘッダー */
  forwardHeaders?: string[];
  /** フェッチタイムアウト（ミリ秒、デフォルト: 30000） */
  fetchTimeout?: number;
  /** エラーハンドラー */
  onError?: (error: Error, request: NextRequest) => Response | null;
}

const DEFAULT_FETCH_TIMEOUT = 30000;
const DEFAULT_CACHE_MAX_AGE = 3600;

/**
 * App Router用のMarkdown変換Route Handlerを作成
 *
 * @example
 * ```typescript
 * // app/api/markdown/[...path]/route.ts
 * import { createMarkdownHandler } from 'next-markdown-middleware';
 *
 * export const runtime = 'nodejs';
 *
 * const handler = createMarkdownHandler({
 *   cache: { maxAge: 3600 },
 *   turndown: { headingStyle: 'atx' },
 * });
 *
 * export const GET = handler;
 * ```
 *
 * @param options - Route Handlerオプション
 * @returns Route Handler関数
 */
export function createMarkdownHandler(options: MarkdownRouteHandlerOptions = {}) {
  const {
    cache = {},
    turndown,
    forwardHeaders = ['user-agent', 'accept-language'],
    fetchTimeout = DEFAULT_FETCH_TIMEOUT,
    onError,
  } = options;

  return async function handler(
    request: NextRequest,
    { params }: { params: { path: string[] } | Promise<{ path: string[] }> },
  ): Promise<Response> {
    // Next.js 15+ ではparamsがPromiseになる可能性がある
    const resolvedParams = params instanceof Promise ? await params : params;
    const path = '/' + resolvedParams.path.join('/');
    const host = request.headers.get('host') ?? 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
    const baseUrl = `${protocol}://${host}`;
    const targetUrl = `${baseUrl}${path}`;

    // SSRF対策: 内部リクエストのみ許可
    const validation = validateInternalRequest(new URL(targetUrl), request);
    if (!validation.isValid) {
      return new NextResponse(JSON.stringify({ error: validation.error }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // タイムアウト付きでフェッチ
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

      const safeHeaders = extractSafeHeaders(request, forwardHeaders);
      // Headersオブジェクトにacceptヘッダーを追加
      safeHeaders.set('accept', 'text/html');

      const response = await fetch(targetUrl, {
        headers: safeHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return new NextResponse(JSON.stringify({ error: 'Page not found' }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Content-Type検証
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return new NextResponse(JSON.stringify({ error: 'Invalid content type' }), {
          status: 415,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const html = await response.text();
      const markdown = convertHtmlToMarkdown(html, baseUrl, turndown);

      // キャッシュヘッダーの構築
      const maxAge = cache.maxAge ?? DEFAULT_CACHE_MAX_AGE;
      const cacheControl = cache.sMaxAge
        ? `public, max-age=${maxAge}, s-maxage=${cache.sMaxAge}`
        : `public, max-age=${maxAge}`;

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': cacheControl,
        },
      });
    } catch (error) {
      // タイムアウトエラー
      if (error instanceof Error && error.name === 'AbortError') {
        return new NextResponse(JSON.stringify({ error: 'Request timeout' }), {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // カスタムエラーハンドラー
      if (onError && error instanceof Error) {
        const customResponse = onError(error, request);
        if (customResponse) return customResponse;
      }

      console.error('Markdown conversion error:', error);
      return new NextResponse(JSON.stringify({ error: 'Conversion failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

/**
 * App Router Middleware用のリライト関数を作成
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { createMarkdownRewrite } from 'next-markdown-middleware';
 *
 * const rewrite = createMarkdownRewrite('/api/markdown');
 *
 * export function middleware(request: NextRequest) {
 *   return rewrite(request);
 * }
 * ```
 *
 * @param apiPath - Route HandlerのAPIパス（デフォルト: '/api/markdown'）
 * @returns Middleware関数
 */
export function createMarkdownRewrite(apiPath = '/api/markdown') {
  return function rewrite(request: NextRequest): NextResponse | null {
    const { pathname } = request.nextUrl;

    if (pathname.endsWith('.md')) {
      const originalPath = pathname.slice(0, -3);
      const url = request.nextUrl.clone();
      url.pathname = `${apiPath}${originalPath}`;
      return NextResponse.rewrite(url);
    }

    return null;
  };
}
