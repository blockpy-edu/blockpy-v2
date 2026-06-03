# BlockPy

A modern dual Python editor that combines **Blockly** (visual block-based programming) and **CodeMirror 6** (text editing) with bidirectional synchronization, powered by **Pyodide** for in-browser Python execution.

---

## Project Purpose

BlockPy lets learners write Python code either as visual blocks or as text, with both views staying in sync. This lowers the barrier to learning Python: beginners can start with blocks and gradually transition to text.

---

## Architecture

```
src/
├── types/
│   └── index.ts              # Shared TypeScript types (SyncState, ParseResult, etc.)
├── services/
│   ├── pythonBlocks.ts       # Blockly block definitions for Python constructs
│   ├── blockToPython.ts      # Blockly workspace → Python source code
│   ├── pythonToBlocks.ts     # Python source → Blockly XML (uses CodeMirror parser)
│   ├── pyodideRunner.ts      # Lazy Pyodide loader + Python execution runtime
│   └── syncController.ts    # Bidirectional sync logic (debounced, no React deps)
├── components/
│   ├── BlocklyWorkspace.tsx  # Blockly editor React wrapper
│   ├── CodeMirrorEditor.tsx  # CodeMirror 6 editor React wrapper
│   └── BlockPyEditor.tsx     # Main container: coordinates sync, run, output
├── App.tsx
└── main.tsx
```

### Architectural Boundaries

| Layer                    | Responsibility                                   |
| ------------------------ | ------------------------------------------------ |
| React UI (`components/`) | Rendering only; delegates logic to services      |
| `syncController.ts`      | Source-of-truth for sync state; no React deps    |
| `pythonToBlocks.ts`      | Pure function: Python string → Blockly XML       |
| `blockToPython.ts`       | Pure function: Blockly workspace → Python string |
| `pythonBlocks.ts`        | Block schema and toolbox definitions             |
| `pyodideRunner.ts`       | Pyodide lifecycle; CDN-loaded lazily             |

---

## Synchronization Model

The sync flow is bidirectional but **change-source aware**:

```
User edits blocks → blockToPython → update CodeMirror text
User edits text  → (debounced 300ms) → pythonToBlocks → update Blockly workspace
```

Key properties:

- **Debounced**: Text changes wait 300 ms before triggering a parse, preventing lag during typing.
- **Source tracking**: `SyncSource = 'blocks' | 'text' | 'external'` prevents circular updates.
- **Non-destructive fallback**: If text cannot be parsed, the last valid Blockly workspace is preserved.
- **Dirty state**: Tracked in `SyncState.isDirty`.
- **No infinite loops**: `isUpdating` flag in `syncController.ts` gates re-entrant calls.

---

## Supported Python Subset

### Fully Supported

| Construct                                      | Block Type     |
| ---------------------------------------------- | -------------- |
| Number literals                                | `py_number`    |
| String literals                                | `py_string`    |
| Boolean literals (`True`/`False`)              | `py_boolean`   |
| `None`                                         | `py_none`      |
| Variable references                            | `py_variable`  |
| Assignment (`x = expr`)                        | `py_assign`    |
| Arithmetic (`+`, `-`, `*`, `/`, `%`, `**`)     | `py_add`, etc. |
| Comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`) | `py_compare`   |
| Boolean operators (`and`, `or`)                | `py_bool_op`   |
| `not`                                          | `py_not`       |
| `if`/`else`                                    | `py_if`        |
| `while` loop                                   | `py_while`     |
| `for` loop                                     | `py_for`       |
| Function definition                            | `py_func_def`  |
| Function call                                  | `py_func_call` |
| `return`                                       | `py_return`    |
| List literal                                   | `py_list`      |
| `print(...)`                                   | `py_print`     |
| `import`                                       | `py_import`    |

### Unsupported Syntax Behavior

When the Python-to-blocks parser encounters syntax it cannot convert:

1. **Parse errors** produce a `py_error` block with the error message.
2. **Unsupported-but-valid syntax** produces a `py_unsupported` block with the raw source.
3. **The last valid workspace is preserved** — unsupported code does NOT overwrite the workspace.
4. Errors are reported in the UI's **Parse Issues** panel with location info (line/col).

Every unsupported node emits a structured `UnsupportedSyntaxError` with:

- `nodeType`: the CST node type name
- `location`: `{ line, col, endLine, endCol }`
- `sourceExcerpt`: up to 60 chars of the offending code

---

## How to Run Locally

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Embedding and LMS Mounting

The app can run standalone or be mounted into any host page/LMS container.

### Host API

The browser global `window.BlockPy.mount(node, config?)` mounts the editor into a supplied DOM node.

```html
<div id="lesson-editor"></div>
<script>
  const node = document.getElementById('lesson-editor');
  const handle = window.BlockPy.mount(node, {
    user: { id: 'u-1', name: 'Ada', role: 'learner', courseId: 'c-1', groupId: 'g-1' },
    assignment: {
      id: 'a-1',
      name: 'Loops Practice',
      instructions: 'Write a loop that prints numbers 1 to 5.',
      points: 10,
      type: 'coding',
      tags: ['loops', 'intro-python'],
      startingCode: 'for i in range(1, 6):\n    print(i)\n',
    },
    submission: {
      id: 'sub-1',
      endpoint: '/api/submissions/sub-1',
      ownerId: 'u-1',
      version: 1,
    },
    server: {
      urls: { api: 'https://lms.example.edu/api' },
      accessToken: 'Bearer ...',
    },
    display: { readOnly: false },
    runtime: { partId: 'part-1', expectedOutput: '1\n2\n3\n4\n5' },
    callbacks: {
      onRunSuccess: ({ state }) => {
        console.log('Correct run for submission', state.submission.id);
      },
    },
  });

  // Later, when needed:
  // handle.unmount();
</script>
```

### Supported Configuration

- `user`: `id`, `name`, `role`, `courseId`, `groupId`
- `assignment`: `id`, `name`, `instructions`, `url`, `type`, `points`, `visibilityFlags`, `settings`, `startingCode`, `instructorHooks`, `tags`, `sampleSubmissions`, `extraFiles`
- `submission`: `id`, `code`, `extraFiles`, `score`, `correctness`, `status`, `ownerId`, `endpoint`, `version`
- `server`: `urls`, `accessToken`
- `display`: `readOnly`
- `runtime`: `partId`, `executionTimeoutMs`, `expectedOutput`, `settings`
- `callbacks`: `onReady`, `onStateChange`, `onRunStart`, `onRunComplete`, `onRunSuccess`, `isCorrectRun`

All config fields are optional. Missing values fall back to defaults.

### Available Scripts

| Script               | Description                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Start Vite dev server                      |
| `npm run build`      | TypeScript compile + Vite production build |
| `npm run preview`    | Preview production build                   |
| `npm test`           | Run tests once (Vitest)                    |
| `npm run test:watch` | Run tests in watch mode                    |
| `npm run lint`       | ESLint check                               |
| `npm run format`     | Prettier format                            |
| `npm run typecheck`  | TypeScript type check (no emit)            |

---

## How to Run Tests

```bash
npm test
```

Tests use **Vitest** + **React Testing Library** + **jsdom**.

### Test Coverage

| Test File                | What It Tests                                                    |
| ------------------------ | ---------------------------------------------------------------- |
| `blockToPython.test.ts`  | Block structures → Python source code                            |
| `pythonToBlocks.test.ts` | Python source → Blockly XML (all supported constructs)           |
| `roundTrip.test.ts`      | Round-trip stability: blocks→Python→blocks, Python→blocks→Python |
| `pyodideRunner.test.ts`  | Pyodide loader/runner API (mocked)                               |
| `syncController.test.ts` | Sync logic: debounce, source tracking, no-infinite-loops         |
| `BlockPyEditor.test.tsx` | React rendering smoke tests                                      |

Property-based tests (via `fast-check`) cover round-trip stability for numeric and string literals.

Golden-file tests cover representative Python snippets (assignments, if/else, for loops, function defs).

---

## Browser Support

- Chrome (current stable)
- Firefox (current stable)
- Safari (current stable)
- Edge (current stable)

**Pyodide/WebAssembly limitations**: Pyodide requires SharedArrayBuffer in some modes; the app uses the single-threaded Pyodide build which works without special HTTP headers.

---

## Known Limitations

- `elif` chains are not yet supported (modeled as nested `if/else`).
- Multi-target assignments (`a = b = c`) are not supported.
- Augmented assignments (`+=`, `-=`) are not supported.
- List/dict/tuple comprehensions are not supported.
- `try`/`except` blocks are not supported.
- f-strings produce `py_unsupported` blocks.
- Lambda expressions are not supported.
- Decorator syntax is not supported.
- Comments are not preserved through round-trips (they appear as `py_unsupported` blocks).
- The Blockly workspace state is not persisted between page reloads.

---

## Security

- Python code is executed entirely in-browser via Pyodide's WebAssembly sandbox.
- No code is sent to any external server.
- Execution has a 10-second timeout.
- No telemetry is collected.

---

## Architecture Tradeoffs

1. **CodeMirror parser for Python→Blocks**: We use the actual `@codemirror/lang-python` Lezer parser rather than a custom parser. This is more reliable but means we depend on Lezer's CST node names.

2. **Dynamic Blockly import**: Blockly is lazy-loaded to keep the initial bundle smaller and avoid SSR issues.

3. **Pyodide via CDN**: Pyodide (~7MB) is loaded lazily from jsDelivr only when the user clicks "Run", keeping initial load fast.

4. **Sync debounce**: 300ms debounce on text changes balances responsiveness against parse cost. The last valid block workspace is always preserved on parse failure.

5. **Block schema versioning**: The `PYTHON_BLOCK_TYPES` constant serves as the block schema. Future migrations should use the `py_error`/`py_unsupported` fallback blocks for unknown types.
