/**
 * 基本的な使用例
 *
 * Next.jsプロジェクトの `middleware.ts` ファイルに以下のように記述します。
 */

import { createMarkdownMiddleware } from 'next-markdown-middleware';
import type { NextRequest } from 'next/server';

// 基本的な使用例
export function middleware(request: NextRequest) {
  const markdownMiddleware = createMarkdownMiddleware();
  return markdownMiddleware(request);
}

// オプション付きの使用例
export function middlewareWithOptions(request: NextRequest) {
  const markdownMiddleware = createMarkdownMiddleware({
    // キャッシュ設定
    cache: {
      enabled: true,
      maxAge: 3600, // 1時間
    },
    // ヘッダー転送設定
    headers: {
      forward: ['user-agent', 'accept-language'],
      custom: {
        'X-Markdown-Converted': 'true',
      },
    },
    // パス除外設定
    exclude: {
      paths: ['/admin', /^\/private/],
      excludeApiRoutes: true,
    },
    // Turndown設定
    turndown: {
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    },
    // リクエストサイズ制限
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    // エラーハンドリング
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
  return markdownMiddleware(request);
}

// 既存のmiddlewareに統合する例
export async function integratedMiddleware(request: NextRequest) {
  // 他のmiddleware処理
  // ...

  // Markdownリクエストの処理
  const { handleMarkdownRequest } = await import('next-markdown-middleware');
  const markdownResponse = await handleMarkdownRequest(request, {
    cache: { enabled: true },
  });

  if (markdownResponse) {
    return markdownResponse;
  }

  // 他の処理を続行
  // ...
}

// マッチング設定（Next.js 13+）
export const config = {
  matcher: [
    /*
     * 以下のパスにマッチ:
     * - /:path*.md (すべての.mdで終わるパス)
     */
    '/:path*.md',
  ],
};

