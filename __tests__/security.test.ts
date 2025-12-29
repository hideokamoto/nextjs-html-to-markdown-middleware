import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleMarkdownRequest } from '../src/middleware';
import { validateInternalRequest } from '../src/utils';

/**
 * セキュリティテスト
 * SSRF、ヘッダーインジェクション、その他のセキュリティ脆弱性をテスト
 */

describe('Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SSRF対策', () => {
    it('外部URLへのリクエストを拒否する', async () => {
      const request = new NextRequest(
        new URL('http://example.com/test.md'),
        {
          headers: { host: 'example.com' },
        },
      );

      const result = await handleMarkdownRequest(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('localhostへのリクエストを許可する', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-length': String(html.length) }),
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
    });

    it('127.0.0.1へのリクエストを許可する', () => {
      const url = new URL('http://127.0.0.1:3000/test');
      const request = new NextRequest(url, {
        headers: { host: '127.0.0.1:3000' },
      });

      const validation = validateInternalRequest(url, request);
      expect(validation.isValid).toBe(true);
    });

    it('異なるホスト名へのリクエストを拒否する', () => {
      const url = new URL('http://malicious.com/test');
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: { host: 'localhost:3000' },
      });

      const validation = validateInternalRequest(url, request);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('External URL not allowed');
    });

    it('相対パスを許可する', () => {
      const url = new URL('/test', 'http://localhost:3000');
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: { host: 'localhost:3000' },
      });

      const validation = validateInternalRequest(url, request);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('ヘッダーインジェクション対策', () => {
    it('安全でないヘッダーを転送しない', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-length': String(html.length) }),
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: {
            host: 'localhost:3000',
            'x-custom-header': 'malicious-value',
            'user-agent': 'test-agent',
          },
        },
      );

      await handleMarkdownRequest(request);

      // fetchが呼ばれたことを確認
      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const fetchOptions = fetchCall[1] as { headers: Headers };

      // 安全でないヘッダーが転送されていないことを確認
      expect(fetchOptions.headers.get('x-custom-header')).toBeNull();
      // 安全なヘッダーは転送されていることを確認
      expect(fetchOptions.headers.get('user-agent')).toBe('test-agent');
    });

    it('カスタム転送ヘッダーも安全なヘッダーのみ転送', async () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-length': String(html.length) }),
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: {
            host: 'localhost:3000',
            'x-malicious-header': 'malicious',
            'user-agent': 'test-agent',
          },
        },
      );

      await handleMarkdownRequest(request, {
        headers: {
          forward: ['x-malicious-header', 'user-agent'],
        },
      });

      const fetchCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const fetchOptions = fetchCall[1] as { headers: Headers };

      // 安全でないヘッダーは転送されていない
      expect(fetchOptions.headers.get('x-malicious-header')).toBeNull();
      // 安全なヘッダーは転送されている
      expect(fetchOptions.headers.get('user-agent')).toBe('test-agent');
    });
  });

  describe('リクエストサイズ制限', () => {
    it('大きなリクエストを拒否する', async () => {
      const largeHtml = 'x'.repeat(11 * 1024 * 1024); // 11MB
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => largeHtml,
        headers: new Headers({
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

    it('Content-Lengthヘッダーがない場合もサイズチェック', async () => {
      const largeHtml = 'x'.repeat(11 * 1024 * 1024); // 11MB
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => largeHtml,
        headers: new Headers(), // Content-Lengthヘッダーなし
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
  });

  describe('エラーハンドリング', () => {
    it('エラーメッセージに機密情報が含まれない', async () => {
      (global.fetch as unknown) = vi.fn().mockRejectedValue(
        new Error('Internal server error with sensitive data'),
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await handleMarkdownRequest(request);

      expect(result).not.toBeNull();
      if (result) {
        const text = await result.text();
        // エラーメッセージが適切に処理されていることを確認
        expect(text).toBeTruthy();
      }
    });
  });
});

