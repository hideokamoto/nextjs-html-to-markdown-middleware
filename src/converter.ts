import TurndownService from 'turndown';
import type { TurndownOptions } from './types';
import { addBaseTag } from './utils';

/**
 * TurndownServiceのシングルトンインスタンス
 */
let turndownServiceInstance: TurndownService | null = null;

/**
 * TurndownServiceのシングルトンインスタンスを取得
 * パフォーマンス最適化のため、インスタンスを再利用
 *
 * @param options - Turndownオプション（初回初期化時のみ適用）
 * @returns TurndownServiceインスタンス
 * @internal
 */
function getTurndownService(options?: TurndownOptions): TurndownService {
  if (!turndownServiceInstance) {
    turndownServiceInstance = new TurndownService({
      headingStyle: options?.headingStyle || 'atx',
      codeBlockStyle: options?.codeBlockStyle || 'fenced',
      bulletListMarker: options?.bulletListMarker || '-',
      ...options,
    });
  }
  return turndownServiceInstance;
}

/**
 * HTMLをMarkdownに変換
 *
 * @param html - 変換するHTML文字列
 * @param baseUrl - 相対URL解決のためのベースURL
 * @param options - Turndownオプション
 * @returns 変換されたMarkdown文字列
 */
export function convertHtmlToMarkdown(
  html: string,
  baseUrl: string,
  options?: TurndownOptions,
): string {
  // <base>タグを追加して相対URLを解決
  const htmlWithBase = addBaseTag(html, baseUrl);

  // TurndownServiceで変換
  const service = getTurndownService(options);
  return service.turndown(htmlWithBase);
}

/**
 * TurndownServiceインスタンスをリセット（テスト用）
 * テスト時に異なるオプションで再初期化するために使用
 *
 * @example
 * ```typescript
 * resetTurndownService();
 * const markdown = convertHtmlToMarkdown(html, baseUrl, { headingStyle: 'setext' });
 * ```
 */
export function resetTurndownService(): void {
  turndownServiceInstance = null;
}

