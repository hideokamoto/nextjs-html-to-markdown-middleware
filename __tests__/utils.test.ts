import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateInternalRequest,
  extractSafeHeaders,
  shouldExcludePath,
  getOriginalPath,
  buildAbsoluteUrl,
  addBaseTag,
} from '../src/utils';

describe('utils', () => {
  describe('validateInternalRequest', () => {
    it('相対パスを許可する', () => {
      const url = new URL('/test', 'http://localhost');
      const request = new NextRequest(new URL('http://localhost/test'), {
        headers: { host: 'localhost' },
      });
      const result = validateInternalRequest(url, request);
      expect(result.isValid).toBe(true);
    });

    it('同じホスト名を許可する', () => {
      const url = new URL('http://localhost:3000/test');
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: { host: 'localhost:3000' },
      });
      const result = validateInternalRequest(url, request);
      expect(result.isValid).toBe(true);
    });

    it('外部URLを拒否する', () => {
      const url = new URL('http://example.com/test');
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: { host: 'localhost:3000' },
      });
      const result = validateInternalRequest(url, request);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('External URL not allowed');
    });

    it('Hostヘッダーがない場合にエラーを返す', () => {
      const url = new URL('http://example.com/test');
      const request = new NextRequest(new URL('http://localhost:3000/test'));
      const result = validateInternalRequest(url, request);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing Host header');
    });
  });

  describe('extractSafeHeaders', () => {
    it('安全なヘッダーを抽出する', () => {
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: {
          'user-agent': 'test-agent',
          'accept-language': 'en-US',
          'x-custom-header': 'should-not-be-included',
        },
      });
      const headers = extractSafeHeaders(request);
      expect(headers.get('user-agent')).toBe('test-agent');
      expect(headers.get('accept-language')).toBe('en-US');
      expect(headers.get('x-custom-header')).toBeNull();
    });

    it('カスタム転送ヘッダーを追加する', () => {
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: {
          'user-agent': 'test-agent',
        },
      });
      const headers = extractSafeHeaders(request, ['user-agent']);
      expect(headers.get('user-agent')).toBe('test-agent');
    });
  });

  describe('shouldExcludePath', () => {
    it('APIルートを除外する（デフォルト）', () => {
      const result = shouldExcludePath('/api/test', {});
      expect(result).toBe(true);
    });

    it('APIルートの除外を無効化できる', () => {
      const result = shouldExcludePath('/api/test', {
        excludeApiRoutes: false,
      });
      expect(result).toBe(false);
    });

    it('文字列パターンで除外する', () => {
      const result = shouldExcludePath('/admin/test', {
        paths: ['/admin'],
      });
      expect(result).toBe(true);
    });

    it('正規表現パターンで除外する', () => {
      const result = shouldExcludePath('/private/123', {
        paths: [/^\/private/],
      });
      expect(result).toBe(true);
    });

    it('除外対象でないパスを許可する', () => {
      const result = shouldExcludePath('/public/test', {
        paths: ['/admin'],
      });
      expect(result).toBe(false);
    });
  });

  describe('getOriginalPath', () => {
    it('.md拡張子を除去する', () => {
      expect(getOriginalPath('/test.md')).toBe('/test');
    });

    it('.md拡張子がない場合はそのまま返す', () => {
      expect(getOriginalPath('/test')).toBe('/test');
    });
  });

  describe('buildAbsoluteUrl', () => {
    it('絶対URLを構築する', () => {
      const request = new NextRequest(new URL('http://localhost:3000/test'), {
        headers: { host: 'localhost:3000' },
      });
      const url = buildAbsoluteUrl('/test', request);
      expect(url.href).toContain('localhost:3000');
      expect(url.pathname).toBe('/test');
    });
  });

  describe('addBaseTag', () => {
    it('<base>タグを追加する', () => {
      const html = '<html><head></head><body>Test</body></html>';
      const result = addBaseTag(html, 'http://example.com');
      expect(result).toContain('<base href="http://example.com">');
    });

    it('既存の<base>タグを置き換える', () => {
      const html = '<html><head><base href="old"></head><body>Test</body></html>';
      const result = addBaseTag(html, 'http://example.com');
      expect(result).toContain('<base href="http://example.com">');
      expect(result).not.toContain('href="old"');
    });

    it('<head>タグがない場合に追加する', () => {
      const html = '<html><body>Test</body></html>';
      const result = addBaseTag(html, 'http://example.com');
      expect(result).toContain('<base href="http://example.com">');
    });
  });
});

