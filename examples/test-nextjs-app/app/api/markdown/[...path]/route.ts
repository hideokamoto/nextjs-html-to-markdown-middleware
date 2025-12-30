import { NextRequest, NextResponse } from 'next/server';
import { convertHtmlToMarkdown } from 'next-markdown-middleware';

export const runtime = 'nodejs'; // Node.js runtime required for DOM parsing

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = '/' + params.path.join('/');
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';

  const originalUrl = `${protocol}://${host}${path}`;

  try {
    const response = await fetch(originalUrl, {
      headers: {
        'accept': 'text/html',
      },
    });

    if (!response.ok) {
      return new NextResponse('Page not found', { status: response.status });
    }

    const html = await response.text();
    const markdown = convertHtmlToMarkdown(html, originalUrl);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error converting to markdown:', error);
    return new NextResponse('Error converting to markdown', { status: 500 });
  }
}
