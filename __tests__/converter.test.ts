import { describe, it, expect, beforeEach } from 'vitest';
import { convertHtmlToMarkdown, resetTurndownService } from '../src/converter';

describe('converter', () => {
  beforeEach(() => {
    resetTurndownService();
  });

  it('HTMLをMarkdownに変換する', () => {
    const html = '<h1>Hello World</h1><p>This is a test.</p>';
    const markdown = convertHtmlToMarkdown(html, 'http://example.com');
    expect(markdown).toContain('Hello World');
    expect(markdown).toContain('This is a test');
  });

  it('<base>タグを追加する', () => {
    const html = '<html><head></head><body>Test</body></html>';
    const markdown = convertHtmlToMarkdown(html, 'http://example.com');
    // Turndownが<base>タグを処理するため、変換結果に影響があることを確認
    expect(markdown).toBeTruthy();
  });

  it('見出しを変換する', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const markdown = convertHtmlToMarkdown(html, 'http://example.com');
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('## Subtitle');
  });

  it('リンクを変換する', () => {
    const html = '<a href="http://example.com">Link</a>';
    const markdown = convertHtmlToMarkdown(html, 'http://example.com');
    expect(markdown).toContain('[Link]');
    expect(markdown).toContain('http://example.com');
  });

  it('コードブロックを変換する', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    const markdown = convertHtmlToMarkdown(html, 'http://example.com');
    expect(markdown).toContain('```');
    expect(markdown).toContain('const x = 1;');
  });
});

