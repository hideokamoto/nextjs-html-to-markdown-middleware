/**
 * Next.js Middleware用 HTML→Markdown変換ライブラリ
 *
 * @packageDocumentation
 */

export { createMarkdownMiddleware, handleMarkdownRequest } from './middleware';
export { convertHtmlToMarkdown, resetTurndownService } from './converter';
export type {
  MarkdownMiddlewareOptions,
  CacheOptions,
  HeadersOptions,
  ExcludeOptions,
  TurndownOptions,
  RequestValidationResult,
} from './types';

