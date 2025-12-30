import { createMarkdownHandler } from 'next-markdown-middleware';

// Node.js runtime required for DOM parsing
export const runtime = 'nodejs';

// ライブラリのcreateMarkdownHandlerを使用
export const GET = createMarkdownHandler({
  cache: {
    maxAge: 3600,
    sMaxAge: 86400,
  },
  turndown: {
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  },
});
