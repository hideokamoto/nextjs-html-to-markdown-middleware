# next-markdown-middleware

A Next.js library for converting HTML pages to Markdown format. Automatically converts requests with `.md` extension to Markdown.

## Features

- **Easy Integration**: Simple integration with Next.js Middleware or Route Handlers
- **Security**: SSRF protection, safe header forwarding, request size limits
- **Performance**: Cache support, singleton pattern optimization
- **Customizable**: Rich configuration options
- **TypeScript**: Full TypeScript support
- **Next.js Compatible**: Supports Next.js 13.0.0+ (14.0.0+ recommended)

## Installation

```bash
npm install next-markdown-middleware
# or
yarn add next-markdown-middleware
# or
pnpm add next-markdown-middleware
```

## Usage

### Next.js App Router (Recommended)

For Next.js App Router, use the library's helper functions for easy integration.

#### 1. Create Middleware

Create `middleware.ts` in your project root:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createMarkdownRewrite } from 'next-markdown-middleware';

const rewrite = createMarkdownRewrite('/api/markdown');

export function middleware(request: NextRequest) {
  const response = rewrite(request);
  if (response) return response;
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

#### 2. Create Route Handler

Create `app/api/markdown/[...path]/route.ts`:

```typescript
import { createMarkdownHandler } from 'next-markdown-middleware';

// Node.js runtime is required for DOM parsing
export const runtime = 'nodejs';

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
```

#### 3. Usage

Access `/about.md` instead of `/about` to get the page in Markdown format.

### Next.js Pages Router

For Pages Router with Node.js runtime, you can use `handleMarkdownRequest` directly:

```typescript
import { handleMarkdownRequest } from 'next-markdown-middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = await handleMarkdownRequest(request, {
    cache: { enabled: true, maxAge: 3600 },
  });

  if (response) return response;

  // Continue to next middleware
  return NextResponse.next();
}
```

## Configuration Options

### Cache Settings

```typescript
import { convertHtmlToMarkdown } from 'next-markdown-middleware';

// In your Route Handler
const markdown = convertHtmlToMarkdown(html, baseUrl);

// Set cache headers in response
return new NextResponse(markdown, {
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  },
});
```

### Turndown Options

```typescript
convertHtmlToMarkdown(html, baseUrl, {
  headingStyle: 'atx',        // 'atx' | 'setext'
  codeBlockStyle: 'fenced',   // 'fenced' | 'indented'
  bulletListMarker: '-',      // '-' | '+' | '*'
});
```

### For handleMarkdownRequest

```typescript
handleMarkdownRequest(request, {
  cache: {
    enabled: true,
    maxAge: 3600,  // seconds (default: 3600)
  },
  headers: {
    forward: ['user-agent', 'accept-language'],
    custom: { 'X-Markdown-Converted': 'true' },
  },
  exclude: {
    paths: ['/admin', /^\/private/],
    excludeApiRoutes: true,  // default: true
  },
  turndown: {
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  },
  onError: (error, request) => {
    console.error('Conversion error:', error);
    return new Response('Error', { status: 500 });
  },
  maxRequestSize: 10 * 1024 * 1024,  // 10MB (default)
  fetchTimeout: 30000,  // 30 seconds (default)
});
```

## API Reference

### App Router Helpers

#### `createMarkdownHandler(options?)`

Creates a Route Handler for App Router.

```typescript
import { createMarkdownHandler } from 'next-markdown-middleware';

export const GET = createMarkdownHandler({
  cache: { maxAge: 3600, sMaxAge: 86400 },
  turndown: { headingStyle: 'atx' },
  forwardHeaders: ['user-agent', 'accept-language'],
  fetchTimeout: 30000,
  onError: (error, request) => new Response('Error', { status: 500 }),
});
```

#### `createMarkdownRewrite(apiPath?)`

Creates a middleware rewrite function for `.md` requests.

```typescript
import { createMarkdownRewrite } from 'next-markdown-middleware';

const rewrite = createMarkdownRewrite('/api/markdown');  // default: '/api/markdown'
```

### Core Functions

#### `convertHtmlToMarkdown(html, baseUrl, options?)`

Converts HTML to Markdown.

**Parameters:**
- `html`: `string` - HTML string to convert
- `baseUrl`: `string` - Base URL for resolving relative URLs
- `options` (optional): `TurndownOptions` - Turndown configuration

**Returns:**
- `string` - Converted Markdown string

#### `handleMarkdownRequest(request, options?)`

Handles Markdown requests. Standalone function for integration with existing middleware.

**Parameters:**
- `request`: `NextRequest` - Next.js request object
- `options` (optional): `MarkdownMiddlewareOptions` - Middleware options

**Returns:**
- `Promise<Response | null>` - Response or null (if not processed)

#### `createMarkdownMiddleware(options?)`

Creates a Markdown Middleware function.

**Parameters:**
- `options` (optional): `MarkdownMiddlewareOptions` - Middleware options

**Returns:**
- `(request: NextRequest) => Promise<Response | NextResponse>` - Middleware function

## Type Definitions

```typescript
interface MarkdownRouteHandlerOptions {
  cache?: {
    maxAge?: number;   // seconds (default: 3600)
    sMaxAge?: number;  // seconds
  };
  turndown?: TurndownOptions;
  forwardHeaders?: string[];
  fetchTimeout?: number;  // milliseconds (default: 30000)
  onError?: (error: Error, request: NextRequest) => Response | null;
}

interface MarkdownMiddlewareOptions {
  cache?: {
    enabled: boolean;
    maxAge?: number;  // seconds (default: 3600)
  };
  headers?: {
    forward?: string[];
    custom?: Record<string, string>;
  };
  exclude?: {
    paths?: (string | RegExp)[];
    excludeApiRoutes?: boolean;  // default: true
  };
  turndown?: {
    headingStyle?: 'atx' | 'setext';
    codeBlockStyle?: 'fenced' | 'indented';
    bulletListMarker?: '-' | '+' | '*';
    [key: string]: unknown;
  };
  onError?: (error: Error, request: NextRequest) => Response | null;
  maxRequestSize?: number;  // bytes (default: 10MB)
  fetchTimeout?: number;    // milliseconds (default: 30000)
}

interface TurndownOptions {
  headingStyle?: 'atx' | 'setext';
  codeBlockStyle?: 'fenced' | 'indented';
  bulletListMarker?: '-' | '+' | '*';
  [key: string]: unknown;
}
```

## Security

This library implements the following security measures:

### SSRF Protection

- **Internal requests only**: Prevents requests to external URLs by allowing only localhost, 127.0.0.1, or same hostname
- **Hostname validation**: Verifies internal requests by comparing with the Host header

### Header Injection Protection

- **Safe headers only**: Only forwards allowed headers (user-agent, accept-language, accept-encoding, accept, referer, origin)
- **Custom header validation**: Custom headers are forwarded only if they're in the safe headers list

### Request Size Limits

- **Default limit**: 10MB (configurable)
- **Content-Length check**: Pre-checks response header Content-Length
- **Actual size check**: Also checks actual response size when Content-Length is missing

### Content-Type Validation

- **HTML content only**: Returns 415 (Unsupported Media Type) if Content-Type is not `text/html` or `application/xhtml+xml`

### Timeout Handling

- **Default timeout**: 30 seconds (configurable)
- **Timeout behavior**: Returns 504 (Gateway Timeout) when timeout occurs
- **AbortController**: Uses AbortController internally for timeout implementation

See [Security Documentation](./docs/SECURITY.md) for details.

## Performance

- **Cache headers**: Configurable cache headers
- **Singleton pattern**: TurndownService singleton initialization
- **Skip unnecessary processing**: Early return for excluded paths and non-.md requests
- **Fast conversion**: Small HTML (1KB) converts in <100ms, medium (100KB) in <1s
- **Early return**: Non-.md requests are skipped in <10ms

### Performance Testing

```bash
npm run test:performance
```

## Next.js Compatibility

### Supported Versions

- **Next.js 13.0.0+**: Full support
- **Next.js 14.0.0+**: Recommended

### Runtime Requirements

- **Node.js runtime required**: HTML to Markdown conversion requires DOM parsing via jsdom
- **Route Handler pattern**: For App Router, use Route Handlers with `runtime = 'nodejs'`
- **Edge Runtime limitations**: Direct Edge Runtime middleware is not supported due to DOM parsing requirements

See [Compatibility Documentation](./docs/COMPATIBILITY.md) for details.

## Development

```bash
# Install dependencies
npm install

# Build (generates both ESM and CJS)
npm run build

# Test
npm test

# Test coverage (target: 80%+)
npm run test:coverage

# Security tests
npm run test:security

# Performance tests
npm run test:performance

# Lint
npm run lint

# Lint fix
npm run lint:fix

# Format
npm run format

# Type check
npm run typecheck
```

### Build Output

After building, the following files are generated in the `dist/` directory:

- `index.js` - ESM format main file
- `index.cjs` - CommonJS format main file
- `index.d.ts` - TypeScript type definitions
- Other source files (`.js`, `.cjs`, `.d.ts`)

## License

MIT

## Contributing

Pull requests and issue reports are welcome!

## Changelog

### 0.1.0

- Initial release
- Basic HTML to Markdown conversion
- Configuration options support
- Security measures implementation
- Performance optimization
- Comprehensive test suite
