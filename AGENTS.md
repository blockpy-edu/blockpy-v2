# AGENTS.md

## Project Overview

This is a React + TypeScript application.

Goals:

- Maintain strict type safety.
- Prefer readability over cleverness.
- Minimize component complexity.
- Optimize for maintainability and testability.
- Avoid introducing technical debt.

## Tech Stack

- React 19
- TypeScript (strict mode)
- Vite
- Zustand
- Vitest
- Testing Library

## Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm dev
```

Run tests:

```bash
npm test
```

Run linting:

```bash
npm lint
```

Run type checking:

```bash
npm typecheck
```

Build production bundle:

```bash
npm build
```

## Architecture Rules

### Components

- Prefer functional components.
- One responsibility per component.
- Extract reusable UI into shared components.
- Keep presentation separate from business logic.
- Avoid components longer than ~200 lines.

### State Management

Order of preference:

1. Local component state
2. Custom hooks
3. Context
4. Global state

Do not introduce new global state without justification.

### TypeScript

Required:

- Strict mode.
- No `any`.
- No non-null assertions unless unavoidable.
- Prefer discriminated unions.
- Prefer explicit interfaces for public APIs.

Instead of:

```ts
const data: any;
```

Use:

```ts
interface User {
    id: string;
    name: string;
}
```

### Hooks

- Keep hooks focused.
- Custom hooks should encapsulate business logic.
- Never call hooks conditionally.
- Prefer composition over deeply nested hooks.

## File Organization

```text
src/
  components/
    code-editor/
  embed/
  services/
    mlt/
    python/
    typescript/
    git/
  types/
```

## Styling

- Avoid Tailwind or utility-first CSS.
- Avoid inline styles.
- Use CSS Classes or CSS Modules.
- Maintain accessibility and responsive layouts.

## Accessibility

Required for all UI changes:

- Keyboard navigation support.
- Proper labels.
- Semantic HTML.
- ARIA attributes only when necessary.
- Color contrast must remain accessible.

## Testing

For every meaningful feature change:

- Add or update tests.
- Test behavior, not implementation details.
- Prefer Testing Library queries that resemble user behavior.

Before completing work:

```bash
npm lint
npm typecheck
npm test
```

## Performance

- Memoize only when profiling justifies it.
- Avoid premature optimization.
- Prevent unnecessary re-renders.

## Pull Request Requirements

Before considering work complete:

1. Type check passes.
2. Tests pass.
3. Lint passes.
4. No TypeScript errors.
5. No unused code.
6. No console logs.
7. Accessibility reviewed.

## Forbidden Changes

Do not:

- Introduce new dependencies without justification.
- Disable lint rules.
- Bypass TypeScript checks.
- Use `any`.
- Commit commented-out code.
- Duplicate existing functionality.

## Agent Behavior

When implementing features:

1. Read existing patterns first.
2. Follow surrounding conventions.
3. Reuse existing abstractions.
4. Produce the smallest correct change.
5. Explain architectural tradeoffs when introducing new patterns.

When uncertain:

- Inspect neighboring files.
- Prefer consistency with the existing codebase.
- Ask for clarification rather than guessing business logic.
