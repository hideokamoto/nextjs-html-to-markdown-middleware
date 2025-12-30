import TurndownService from 'turndown';
import type { TurndownOptions } from './types';
import { addBaseTag } from './utils';

/**
 * TurndownServiceのシングルトンインスタンス（デフォルト設定用）
 */
let turndownServiceInstance: TurndownService | null = null;

/**
 * TurndownServiceのシングルトンインスタンスを取得
 * パフォーマンス最適化のため、インスタンスを再利用
 * デフォルト設定で初期化される
 *
 * @returns TurndownServiceインスタンス
 * @internal
 */
function getTurndownService(): TurndownService {
  if (!turndownServiceInstance) {
    turndownServiceInstance = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
  }
  return turndownServiceInstance;
}

/**
 * オプションからTurndownServiceの設定オブジェクトを作成
 *
 * @param options - Turndownオプション
 * @returns TurndownServiceの設定オブジェクト
 * @internal
 */
function createTurndownConfig(options?: TurndownOptions): {
  headingStyle: 'atx' | 'setext';
  codeBlockStyle: 'fenced' | 'indented';
  bulletListMarker: '-' | '+' | '*';
  [key: string]: unknown;
} {
  return {
    headingStyle: options?.headingStyle || 'atx',
    codeBlockStyle: options?.codeBlockStyle || 'fenced',
    bulletListMarker: options?.bulletListMarker || '-',
    ...options,
  };
}

/**
 * HTMLをMarkdownに変換
 *
 * @param html - 変換するHTML文字列
 * @param baseUrl - 相対URL解決のためのベースURL
 * @param options - Turndownオプション（オプション）
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
  // オプションが提供された場合は新しいインスタンスを作成
  // オプションが提供されない場合はシングルトンインスタンスを使用
  const service = options
    ? new TurndownService(createTurndownConfig(options))
    : getTurndownService();
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

