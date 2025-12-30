import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // .md拡張子のリクエストをRoute Handlerにリダイレクト
  if (pathname.endsWith('.md')) {
    const originalPath = pathname.slice(0, -3); // .mdを除去
    const url = request.nextUrl.clone();
    url.pathname = `/api/markdown${originalPath}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
