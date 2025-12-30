/**
 * examples/basic-usage.tsの動作を検証するテスト
 * examplesファイルで使用されているAPIが正しく動作することを確認します
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  createMarkdownMiddleware,
  handleMarkdownRequest,
} from '../src/middleware';

// fetchをモック
global.fetch = vi.fn();

describe('examples/basic-usage.ts の動作検証', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な使用例', () => {
    it('createMarkdownMiddleware()が正しく動作する', async () => {
      const html = '<html><body><h1>Hello World</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      // examples/basic-usage.ts の基本的な使用例を再現
      const middleware = createMarkdownMiddleware();
      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);
      if (result) {
        const text = await result.text();
        expect(text).toContain('# Hello World');
      }
    });
  });

  describe('オプション付きの使用例', () => {
    it('cacheオプションが正しく動作する', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      // examples/basic-usage.ts のオプション付き使用例を再現
      const middleware = createMarkdownMiddleware({
        cache: {
          enabled: true,
          maxAge: 3600, // 1時間
        },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      expect(result?.headers.get('Cache-Control')).toContain('max-age=3600');
    });

    it('headersオプションが正しく動作する', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      const middleware = createMarkdownMiddleware({
        headers: {
          forward: ['user-agent', 'accept-language'],
          custom: {
            'X-Markdown-Converted': 'true',
          },
        },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: {
            host: 'localhost:3000',
            'user-agent': 'test-agent',
            'accept-language': 'en-US',
          },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      expect(result?.headers.get('X-Markdown-Converted')).toBe('true');
    });

    it('excludeオプションが正しく動作する', async () => {
      const middleware = createMarkdownMiddleware({
        exclude: {
          paths: ['/admin', /^\/private/],
          excludeApiRoutes: true,
        },
      });

      // /admin パスは除外される
      const adminRequest = new NextRequest(
        new URL('http://localhost:3000/admin/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const adminResult = await middleware(adminRequest);
      expect(adminResult).toBeInstanceOf(NextResponse);

      // /private パスは除外される
      const privateRequest = new NextRequest(
        new URL('http://localhost:3000/private/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const privateResult = await middleware(privateRequest);
      expect(privateResult).toBeInstanceOf(NextResponse);

      // APIルートは除外される
      const apiRequest = new NextRequest(
        new URL('http://localhost:3000/api/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const apiResult = await middleware(apiRequest);
      expect(apiResult).toBeInstanceOf(NextResponse);
    });

    it('turndownオプションが正しく動作する', async () => {
      const html = '<html><body><h1>Test</h1><ul><li>Item</li></ul></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      const middleware = createMarkdownMiddleware({
        turndown: {
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          bulletListMarker: '-',
        },
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      if (result) {
        const text = await result.text();
        // ATX形式の見出しが使用されていることを確認
        expect(text).toContain('# Test');
        // 箇条書きマーカーが '-' であることを確認（-のみを厳密にチェック）
        expect(text).toMatch(/^-\s+Item/m);
        // *や+が含まれていないことを確認
        expect(text).not.toMatch(/^[*+]\s+Item/m);
      }
    });

    it('maxRequestSizeオプションが正しく動作する', async () => {
      const largeHtml = 'x'.repeat(11 * 1024 * 1024); // 11MB
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => largeHtml,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(largeHtml.length),
        }),
      });

      const middleware = createMarkdownMiddleware({
        maxRequestSize: 10 * 1024 * 1024, // 10MB
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });

    it('onErrorオプションが正しく動作する', async () => {
      (global.fetch as unknown) = vi.fn().mockRejectedValue(
        new Error('Network error'),
      );

      const customErrorHandler = vi.fn().mockReturnValue(
        new Response(
          JSON.stringify({ error: 'Conversion failed' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const middleware = createMarkdownMiddleware({
        onError: customErrorHandler,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await middleware(request);

      expect(customErrorHandler).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      if (result) {
        const text = await result.text();
        const json = JSON.parse(text);
        expect(json.error).toBe('Conversion failed');
      }
    });
  });

  describe('既存のmiddlewareに統合する例', () => {
    it('handleMarkdownRequestが正しく動作する', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      // examples/basic-usage.ts の統合例を再現
      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const markdownResponse = await handleMarkdownRequest(request, {
        cache: { enabled: true },
      });

      expect(markdownResponse).not.toBeNull();
      expect(markdownResponse?.status).toBe(200);
      if (markdownResponse) {
        const text = await markdownResponse.text();
        expect(text).toContain('# Test');
      }
    });

    it('handleMarkdownRequestがnullを返す場合の処理', async () => {
      // .md拡張子がない場合はnullを返す
      const request = new NextRequest(
        new URL('http://localhost:3000/test'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const markdownResponse = await handleMarkdownRequest(request, {
        cache: { enabled: true },
      });

      expect(markdownResponse).toBeNull();
    });
  });

  describe('examplesファイルの全オプションを組み合わせた使用例', () => {
    it('すべてのオプションを組み合わせて使用できる', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(html.length),
        }),
      });

      // examples/basic-usage.ts の middlewareWithOptions を再現
      const middleware = createMarkdownMiddleware({
        cache: {
          enabled: true,
          maxAge: 3600,
        },
        headers: {
          forward: ['user-agent', 'accept-language'],
          custom: {
            'X-Markdown-Converted': 'true',
          },
        },
        exclude: {
          paths: ['/admin', /^\/private/],
          excludeApiRoutes: true,
        },
        turndown: {
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          bulletListMarker: '-',
        },
        maxRequestSize: 10 * 1024 * 1024,
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

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: {
            host: 'localhost:3000',
            'user-agent': 'test-agent',
            'accept-language': 'en-US',
          },
        },
      );

      const result = await middleware(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);
      expect(result?.headers.get('Cache-Control')).toContain('max-age=3600');
      expect(result?.headers.get('X-Markdown-Converted')).toBe('true');
      if (result) {
        const text = await result.text();
        expect(text).toContain('# Test');
      }
    });
  });
});

