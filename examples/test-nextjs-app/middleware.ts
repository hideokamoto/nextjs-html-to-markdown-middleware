import { NextRequest, NextResponse } from 'next/server';
import { createMarkdownRewrite } from 'next-markdown-middleware';

// ライブラリのcreateMarkdownRewriteを使用して.mdリクエストをリダイレクト
const rewrite = createMarkdownRewrite('/api/markdown');

export function middleware(request: NextRequest) {
  const response = rewrite(request);
  if (response) return response;
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
