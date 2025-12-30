# CLAUDE.md - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working with the `next-markdown-middleware` codebase.

## Project Overview

**Project Name**: next-markdown-middleware
**Version**: 0.1.0
**Purpose**: Next.js middleware library for automatically converting HTML pages to Markdown format when requested with `.md` extension
**Language**: TypeScript
**License**: MIT
**Author**: hideokamoto

### Core Functionality

The library intercepts Next.js requests ending in `.md`, fetches the corresponding HTML page, and converts it to Markdown using the Turndown library. For example, `/about.md` → fetches `/about` → returns as Markdown.

## Architecture & Design Patterns

### Module Structure

The codebase follows a clean, modular architecture:

```
src/
├── index.ts         # Public API exports
├── types.ts         # TypeScript type definitions
├── middleware.ts    # Main middleware logic
├── converter.ts     # HTML→Markdown conversion
└── utils.ts         # Utility functions
```

### Key Design Patterns

1. **Singleton Pattern**: `TurndownService` uses a singleton to optimize performance and avoid repeated instantiation
2. **Factory Pattern**: `createMarkdownMiddleware()` factory function creates configured middleware
3. **Strategy Pattern**: Pluggable options allow customization of behavior (cache, headers, exclusions, error handling)
4. **Guard Clauses**: Early returns for non-.md requests and excluded paths minimize unnecessary processing

### Request Flow

```
Request with .md extension
    ↓
Check if path should be excluded
    ↓
Strip .md and build absolute URL
    ↓
Validate internal request (SSRF protection)
    ↓
Extract safe headers
    ↓
Fetch HTML with timeout
    ↓
Validate content type and size
    ↓
Convert HTML to Markdown
    ↓
Return with appropriate headers
```

## File Structure & Responsibilities

### src/index.ts
- Public API surface
- Exports main functions: `createMarkdownMiddleware`, `handleMarkdownRequest`, `convertHtmlToMarkdown`
- Exports all TypeScript types

### src/types.ts
- Type definitions for all options and configurations
- Interfaces: `CacheOptions`, `HeadersOptions`, `ExcludeOptions`, `TurndownOptions`, `MarkdownMiddlewareOptions`
- Validation types: `RequestValidationResult`

### src/middleware.ts
Main middleware implementation:
- `handleMarkdownRequest()`: Core logic for processing .md requests
- `createMarkdownMiddleware()`: Factory function returning configured middleware
- Default constants: `DEFAULT_MAX_REQUEST_SIZE` (10MB), `DEFAULT_FETCH_TIMEOUT` (30s)

**Key behaviors**:
- Returns `null` for non-.md requests (allows Next.js to continue)
- Returns appropriate HTTP status codes (403, 404, 413, 415, 500, 504)
- Implements timeout using AbortController
- Validates content-type must be `text/html` or `application/xhtml+xml`

### src/converter.ts
HTML to Markdown conversion:
- `convertHtmlToMarkdown()`: Main conversion function
- `getTurndownService()`: Returns singleton instance with default config
- `createTurndownConfig()`: Merges user options with defaults (uses nullish coalescing)
- `resetTurndownService()`: Test utility to reset singleton

**Important**: Uses singleton only when no options are provided; creates new instance if custom options are given.

### src/utils.ts
Security-critical utility functions:

1. **validateInternalRequest()**: SSRF protection
   - Only allows: localhost, 127.0.0.1, ::1, same hostname, or relative paths
   - Validates against request's Host header

2. **extractSafeHeaders()**: Header injection protection
   - Whitelist: `user-agent`, `accept-language`, `accept-encoding`, `accept`, `referer`, `origin`
   - Only forwards intersection of custom headers and safe headers

3. **shouldExcludePath()**: Path exclusion logic
   - String patterns use `includes()` (substring match)
   - RegExp patterns use `test()` for precise matching
   - Default: excludes `/api/` routes

4. **buildAbsoluteUrl()**: Safe URL construction
   - Validates `x-forwarded-proto` header (only allows 'http' or 'https')
   - Falls back to 'https' by default

5. **addBaseTag()**: Relative URL resolution
   - Escapes base URL to prevent XSS
   - Replaces existing `<base>` tags or inserts into `<head>`

## Security Architecture

### Critical Security Features

1. **SSRF Protection** (src/utils.ts:validateInternalRequest)
   - Prevents requests to external URLs
   - Only allows internal/localhost requests
   - Validates against Host header

2. **Header Injection Prevention** (src/utils.ts:extractSafeHeaders)
   - Whitelist-based header forwarding
   - No user-controlled headers are passed through

3. **Request Size Limits** (src/middleware.ts)
   - Default: 10MB (configurable)
   - Checks both Content-Length header and actual response size

4. **XSS Prevention** (src/utils.ts:escapeHtmlAttribute)
   - Escapes HTML entities in base URLs
   - Prevents malicious scripts in `<base>` tags

5. **Timeout Protection** (src/middleware.ts)
   - Default: 30 seconds
   - Uses AbortController to prevent hanging requests

### Security Testing

All security features have dedicated tests in `__tests__/security.test.ts`:
- SSRF attack prevention
- Header injection attempts
- Request size limit enforcement
- XSS prevention in base tags

**IMPORTANT**: When modifying security-related code, always run: `npm run test:security`

## Development Conventions

### TypeScript Configuration

**tsconfig.json** (ESM build):
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Node16 module resolution
- Output: `dist/` directory

**tsconfig.cjs.json** (CommonJS build):
- Extends main config
- Module: CommonJS
- Output: `.cjs` files

### Code Style (Biome)

Configuration in `biome.json`:
- **Formatter**: 2-space indents, 100-char line width, single quotes, semicolons required
- **Linter**: Recommended rules + custom strictness
  - `noUnusedVariables`: error
  - `noExplicitAny`: warn
  - `useConst`: error
  - `useTemplate`: error

**Commands**:
```bash
npm run lint         # Check code
npm run lint:fix     # Auto-fix issues
npm run format       # Format code
```

### Testing Strategy

**Framework**: Vitest
**Coverage Target**: 80%+

**Test Suites**:
1. `__tests__/middleware.test.ts` - Core middleware logic
2. `__tests__/converter.test.ts` - HTML→Markdown conversion
3. `__tests__/utils.test.ts` - Utility functions
4. `__tests__/security.test.ts` - Security features
5. `__tests__/performance.test.ts` - Performance benchmarks
6. `__tests__/edge-runtime.test.ts` - Edge runtime compatibility

**Performance Expectations**:
- Small HTML (1KB): < 100ms
- Medium HTML (100KB): < 1000ms
- Non-.md requests: < 10ms (early return)

**Test Commands**:
```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
npm run test:security     # Security tests only
npm run test:performance  # Performance benchmarks
npm run test:edge         # Edge runtime tests
```

### Build System

**Dual Output**: ESM and CommonJS

Build process:
1. `npm run build:esm` - TypeScript → ESM (dist/*.js)
2. `npm run build:cjs` - TypeScript → CJS (dist/*.cjs)
3. `scripts/rename-cjs.js` - Renames .js to .cjs for CommonJS

**Output Structure**:
```
dist/
├── index.js          # ESM main
├── index.cjs         # CJS main
├── index.d.ts        # Type definitions
├── *.js              # ESM modules
├── *.cjs             # CJS modules
└── *.d.ts            # Type definitions
```

**package.json exports**:
- Supports both `import` (ESM) and `require` (CJS)
- Type definitions available for both

## Common Development Tasks

### Adding a New Feature

1. **Update types** in `src/types.ts` if adding new options
2. **Implement logic** in appropriate module
3. **Add tests** covering new functionality
4. **Update README.md** with examples
5. **Run full test suite**: `npm test`
6. **Check types**: `npm run typecheck`
7. **Lint and format**: `npm run lint:fix && npm run format`
8. **Build**: `npm run build`

### Modifying Security Features

1. **Never** weaken security validations
2. **Always** add corresponding tests in `__tests__/security.test.ts`
3. **Run** `npm run test:security` before committing
4. **Update** `docs/SECURITY.md` with changes
5. **Consider** if change needs security advisory

### Adding Dependencies

1. **Check** if dependency is Edge Runtime compatible (no Node.js-specific APIs)
2. **Run** `npm audit` after installation
3. **Update** package.json engines if needed
4. **Test** Edge Runtime compatibility: `npm run test:edge`

### Performance Optimization

1. **Benchmark** before and after: `npm run test:performance`
2. **Profile** critical paths (middleware request handling, conversion)
3. **Consider** caching strategies (current singleton pattern for TurndownService)
4. **Avoid** blocking operations in hot paths

## Important Notes for AI Assistants

### Code Modification Guidelines

1. **Preserve Security**: Never modify security validations without explicit approval
2. **Maintain Backwards Compatibility**: This is a published npm package
3. **Type Safety**: All changes must pass `npm run typecheck`
4. **Test Coverage**: Maintain 80%+ coverage
5. **Edge Runtime**: No Node.js-specific APIs (fs, path, etc.)

### Default Values Pattern

The codebase uses **nullish coalescing (`??`)** to handle defaults:

```typescript
// CORRECT - preserves false values
headingStyle: headingStyle ?? 'atx'

// INCORRECT - false would trigger default
headingStyle: headingStyle || 'atx'
```

**Why**: Prevents `undefined` from overriding defaults while allowing explicit `false`, `0`, or empty string.

### Path Matching Pattern

**String patterns**: Use `includes()` (substring match)
```typescript
// '/foo/admin/bar' matches pattern 'admin'
paths: ['admin']
```

**RegExp patterns**: Use `test()` (precise matching)
```typescript
// '/admin/foo' matches, but '/foo/admin' does not
paths: [/^\/admin/]
```

**Recommendation**: Prefer RegExp for precise control.

### Error Handling Pattern

The codebase uses specific HTTP status codes:
- `403`: SSRF/external URL blocked
- `404`: Page not found
- `413`: Request too large
- `415`: Invalid content type
- `500`: Internal error
- `504`: Request timeout

**Custom error handlers** should return `Response | null`. Returning `null` falls back to default handling.

### Documentation Language

**README.md**: Japanese (primary audience)
**Code comments**: Japanese
**Git commits**: English recommended
**Types/APIs**: English

When adding features, update documentation in Japanese unless specified otherwise.

### Testing Mock Pattern

The codebase uses Vitest mocks:

```typescript
// Mock global fetch
global.fetch = vi.fn();

// In tests
(global.fetch as unknown) = vi.fn().mockResolvedValue({...});

// Clear between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Commit Message Conventions

Recent commits follow conventional format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes

Use descriptive messages focusing on "why" rather than "what".

## Quick Reference

### File Locations

- Source code: `src/`
- Tests: `__tests__/`
- Documentation: `docs/` (SECURITY.md, COMPATIBILITY.md)
- Examples: `examples/basic-usage.ts`
- Build output: `dist/`
- Build scripts: `scripts/rename-cjs.js`

### Key Constants

```typescript
DEFAULT_MAX_REQUEST_SIZE = 10 * 1024 * 1024  // 10MB
DEFAULT_FETCH_TIMEOUT = 30000                // 30 seconds
DEFAULT_CACHE_MAX_AGE = 3600                 // 1 hour
SAFE_HEADERS = ['user-agent', 'accept-language', ...]
```

### Environment Support

- **Node.js**: >= 18.0.0
- **Next.js**: >= 13.0.0 (>= 14.0.0 recommended)
- **Edge Runtime**: Fully compatible

### Related Documentation

- Main: `README.md` (Japanese)
- Security: `docs/SECURITY.md` (Japanese)
- Compatibility: `docs/COMPATIBILITY.md` (Japanese)
- Changelog: `CHANGELOG.md`
- License: `LICENSE` (MIT)

## Workflow for AI Assistants

### Before Making Changes

1. Read relevant source files and tests
2. Understand security implications
3. Check existing patterns and conventions
4. Verify Edge Runtime compatibility

### During Development

1. Follow TypeScript strict mode
2. Use Biome formatting (2-space, single quotes)
3. Add comprehensive tests
4. Maintain or improve coverage
5. Update types if adding options

### Before Committing

1. `npm run typecheck` - Verify types
2. `npm test` - Run all tests
3. `npm run lint:fix` - Fix lint issues
4. `npm run format` - Format code
5. `npm run build` - Ensure builds succeed

### For Security Changes

1. Get explicit approval first
2. Add tests to `__tests__/security.test.ts`
3. Run `npm run test:security`
4. Update `docs/SECURITY.md`
5. Consider if security advisory needed

### For Performance Changes

1. Run `npm run test:performance` before changes
2. Implement optimization
3. Run performance tests again
4. Verify improvement meets targets
5. Ensure no security regression

## Version Information

**Current Version**: 0.1.0
**Release Date**: 2025-12-30
**Status**: Initial release

## Contact & Support

- **Repository**: https://github.com/hideokamoto/nextjs-html-to-markdown-middleware
- **Issues**: https://github.com/hideokamoto/nextjs-html-to-markdown-middleware/issues
- **Author**: hideokamoto

---

**Last Updated**: 2025-12-30
**Document Version**: 1.0.0
