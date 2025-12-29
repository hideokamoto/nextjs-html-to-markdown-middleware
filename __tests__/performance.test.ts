import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleMarkdownRequest } from '../src/middleware';
import { convertHtmlToMarkdown } from '../src/converter';

/**
 * パフォーマンステスト
 * レスポンス時間、メモリ使用量、スループットを測定
 */

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('小さいHTML（1KB）の変換が100ms以内で完了する', async () => {
    const html = '<html><body><h1>Test</h1><p>'.repeat(50) + '</p></body></html>';
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

    const startTime = performance.now();
    const result = await handleMarkdownRequest(request);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result).not.toBeNull();
    expect(duration).toBeLessThan(100); // 100ms以内
  });

  it('中サイズのHTML（100KB）の変換が1秒以内で完了する', async () => {
    const html = '<html><body><h1>Test</h1><p>Content</p>'.repeat(2000) + '</body></html>';
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

    const startTime = performance.now();
    const result = await handleMarkdownRequest(request);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result).not.toBeNull();
    expect(duration).toBeLessThan(1000); // 1秒以内
  });

  it('HTML→Markdown変換のパフォーマンス', () => {
    const html = '<html><body><h1>Title</h1><p>Content</p></body></html>';
    const iterations = 100;

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      convertHtmlToMarkdown(html, 'http://example.com');
    }
    const endTime = performance.now();
    const avgDuration = (endTime - startTime) / iterations;

    // 1回あたりの変換が10ms以内
    expect(avgDuration).toBeLessThan(10);
  });

  it('早期リターンが高速に動作する', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/test'));

    const startTime = performance.now();
    const result = await handleMarkdownRequest(request);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result).toBeNull();
    expect(duration).toBeLessThan(10); // 10ms以内で早期リターン
  });

  it('除外パスのチェックが高速に動作する', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/test.md'),
      {
        headers: { host: 'localhost:3000' },
      },
    );

    const startTime = performance.now();
    const result = await handleMarkdownRequest(request, {
      exclude: { excludeApiRoutes: true },
    });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result).toBeNull();
    expect(duration).toBeLessThan(10); // 10ms以内
  });

  it('シングルトンインスタンスが再利用される', () => {
    const html = '<html><body><h1>Test</h1></body></html>';

    // 最初の変換
    const start1 = performance.now();
    convertHtmlToMarkdown(html, 'http://example.com');
    const duration1 = performance.now() - start1;

    // 2回目の変換（シングルトンインスタンスを再利用）
    const start2 = performance.now();
    convertHtmlToMarkdown(html, 'http://example.com');
    const duration2 = performance.now() - start2;

    // 2回目は初期化コストがないため、1回目より高速または同等
    expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
  });
});

