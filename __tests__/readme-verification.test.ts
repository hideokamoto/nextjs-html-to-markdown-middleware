import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  handleMarkdownRequest,
  createMarkdownMiddleware,
} from '../src/middleware';
import type { MarkdownMiddlewareOptions } from '../src/types';

// fetchをモック
global.fetch = vi.fn();

/**
 * READMEに記載されている機能が正しく実装されているかを検証するテスト
 * Kent BeckのTDDアプローチに従い、READMEの内容を検証する
 */
describe('README Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('READMEに記載されているオプション設定の検証', () => {
    it('Content-Typeがtext/htmlまたはapplication/xhtml+xmlでない場合、415エラーを返す', async () => {
      // text/html以外のContent-Typeを返すレスポンスをモック
      (global.fetch as unknown) = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'not html',
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '10',
        }),
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await handleMarkdownRequest(request);

      // Content-Typeがtext/htmlまたはapplication/xhtml+xmlでない場合、415エラーを返す
      expect(result).not.toBeNull();
      expect(result?.status).toBe(415);
      if (result) {
        const text = await result.text();
        expect(text).toContain('Content-Type must be text/html');
      }
    });

    it('fetchTimeoutオプションが設定されている場合、タイムアウト時に504エラーを返す', async () => {
      // AbortErrorが発生した場合（タイムアウト時）の処理をテスト
      // handleMarkdownRequest内部のAbortControllerがタイムアウトを検出し、
      // fetchがAbortErrorを返すことをシミュレート
      (global.fetch as unknown) = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/test.md'),
        {
          headers: { host: 'localhost:3000' },
        },
      );

      const result = await handleMarkdownRequest(request, {
        fetchTimeout: 50, // 50msでタイムアウト
      });

      // タイムアウト時は504エラーを返す
      expect(result).not.toBeNull();
      expect(result?.status).toBe(504);
      if (result) {
        const text = await result.text();
        expect(text).toContain('Request Timeout');
      }
    });
  });

  describe('READMEに記載されている型定義の検証', () => {
    it('MarkdownMiddlewareOptionsにfetchTimeoutが含まれている', () => {
      // 型定義を確認するため、実際の型を使用
      const options: MarkdownMiddlewareOptions = {
        fetchTimeout: 30000,
      };
      
      expect(options.fetchTimeout).toBe(30000);
    });
  });
});

