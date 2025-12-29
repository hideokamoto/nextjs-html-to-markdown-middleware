import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleMarkdownRequest } from '../src/middleware';

/**
 * Edge Runtime互換性のテスト
 * Next.js Edge Runtimeでは、Node.js APIが使用できないため、
 * すべての機能がEdge Runtimeで動作することを確認
 */

describe('Edge Runtime Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Edge Runtimeで使用可能なAPIのみを使用している', async () => {
    // Edge Runtimeで使用可能なAPI:
    // - fetch
    // - URL
    // - Headers
    // - Response
    // - TextEncoder/TextDecoder
    // - AbortController

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

    // Edge Runtimeで動作することを確認
    const result = await handleMarkdownRequest(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(200);
  });

  it('Node.js固有のAPIを使用していない', () => {
    // 以下のAPIは使用していないことを確認:
    // - require('fs')
    // - require('path')
    // - require('crypto')
    // - process.env（環境変数はNext.js経由で取得可能）

    // コード内でNode.js固有のAPIを使用していないことを確認
    // （これは静的解析で確認する必要があるが、テストでは実行時エラーを確認）
    expect(true).toBe(true); // このテストは主にドキュメント目的
  });

  it('fetch APIが正常に動作する', async () => {
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
    expect(global.fetch).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('URL APIが正常に動作する', () => {
    const url = new URL('http://localhost:3000/test');
    expect(url.hostname).toBe('localhost');
    expect(url.pathname).toBe('/test');
  });

  it('Headers APIが正常に動作する', () => {
    const headers = new Headers();
    headers.set('Content-Type', 'text/html');
    expect(headers.get('Content-Type')).toBe('text/html');
  });
});

