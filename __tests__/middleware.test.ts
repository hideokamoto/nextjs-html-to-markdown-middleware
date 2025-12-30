import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  handleMarkdownRequest,
  createMarkdownMiddleware,
} from '../src/middleware';

// fetchをモック
global.fetch = vi.fn();

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMarkdownRequest', () => {
    it('.md拡張子がない場合はnullを返す', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/test'));
      const result = await handleMarkdownRequest(request);
      expect(result).toBeNull();
    });

    it('.md拡張子がある場合に処理する', async () => {
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

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);
      if (result) {
        const text = await result.text();
        expect(text).toContain('# Test');
      }
    });

    it('404エラーを適切に処理する', async () => {
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(404);
    });

    it('内部URLへのリクエストでfetchが呼ばれる', async () => {
      // 内部URL（localhost）へのリクエストはSSRFチェックをパスしてfetchが呼ばれる
      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await handleMarkdownRequest(request);

      // SSRFチェックをパスしてfetchが呼ばれたことを確認
      // 外部URL拒否の直接テストはutils.test.tsのvalidateInternalRequestテストで行う
      expect(global.fetch).toHaveBeenCalled();
    });

    it('リクエストサイズ制限を適用する', async () => {
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

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request, {
        maxRequestSize: 10 * 1024 * 1024, // 10MB
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });

    it('キャッシュヘッダーを設定する', async () => {
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

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request, {
        cache: { enabled: true, maxAge: 7200 },
      });

      expect(result).not.toBeNull();
      expect(result?.headers.get('Cache-Control')).toContain('max-age=7200');
    });

    it('カスタムヘッダーを追加する', async () => {
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

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request, {
        headers: { custom: { 'X-Custom': 'value' } },
      });

      expect(result).not.toBeNull();
      expect(result?.headers.get('X-Custom')).toBe('value');
    });

    it('カスタムエラーハンドラーを使用する', async () => {
      (global.fetch as unknown) = vi.fn().mockRejectedValue(
        new Error('Network error'),
      );

      const customErrorHandler = vi.fn().mockReturnValue(
        new NextResponse('Custom Error', { status: 500 }),
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request, {
        onError: customErrorHandler,
      });

      expect(customErrorHandler).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
    });

    it('除外パスをスキップする', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );
      const result = await handleMarkdownRequest(request, {
        exclude: { excludeApiRoutes: true },
      });

      expect(result).toBeNull();
    });
  });

  describe('createMarkdownMiddleware', () => {
    it('Middleware関数を返す', () => {
      const middleware = createMarkdownMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('処理しない場合はNextResponse.next()を返す', async () => {
      const middleware = createMarkdownMiddleware();
      const request = new NextRequest(new URL('http://localhost:3000/test'));
      const result = await middleware(request);
      expect(result).toBeInstanceOf(NextResponse);
    });
  });
});

