# 07 — Testing, Migration, Security, Accessibility

## 1. Testing strategy

Vitest + Testing Library are already configured; tests live in `__tests__/`
folders beside the code (existing convention).

### 1.1 Test layers

| Layer        | Scope                                                                                                       | Examples                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Pure unit    | domain mappers, settings parser, VFS resolution, policy functions, quiz tokenizer, pool randomizer (seeded) | `parseAssignmentSettings` round-trips unknown keys; `[key]`/`[[escape]]` tokenizer; namespace visibility matrix |
| Store        | Zustand stores via factories                                                                                | focusTask flushes saves; dirty flags survive failed saves                                                       |
| API contract | `BlockPyApiClient` against a mock transport replaying **recorded legacy payloads**                          | save_file param shape per filename class; envelope injection; version_change handling                           |
| Component    | panels with Testing Library, user-behavior queries                                                          | quiz attempt flow; console input(); feedback rendering; activity rail navigation + policy gating                |
| Engine       | worker protocol with a fake worker; real-Pyodide smoke tests in a separate slow suite                       | runId staleness; interrupt; phase ordering; traceback stripping                                                 |
| Existing     | MLT round-trip suites continue unchanged                                                                    | already in repo                                                                                                 |

### 1.2 Fixture corpus (the migration safety net)

`src/api/__fixtures__/` holds real (anonymized) payloads captured from a live
blockpy-server: `load_assignment` responses for each assignment type, quiz
instructions for all 12 question types, extra-file bundles, settings blobs from
old courses, history responses. Contract tests assert v2 parses every fixture
without loss and re-serializes byte-compatible where the server requires it
(Story 19.5). Any schema assumption flagged "verify during Slice N" in docs
01–06 gets locked by a fixture test the moment it is verified.

### 1.3 Engine determinism

Seeded RNG injection for pool shuffling and any randomized feedback selection,
so tests are reproducible.

## 2. Migration and compatibility

1. **Wire compatibility first.** v2 talks to the _unmodified_ blockpy-server:
   same routes, form-encoded params, same filename sigils, same event strings.
   No server changes are required for parity; server improvements are out of
   scope for this design.
2. **Schema tolerance.** All parsers are total functions returning fallbacks +
   preserved `extra` fields; nothing throws on legacy content (settings,
   bundles, quiz JSON, textbook JSON).
3. **Score convention.** int 0–100 on the wire, float 0–1 in domain — converted
   in mappers only (doc 01 §1.4).
4. **part_id injection.** Replicate `inject_code_part` delimiters exactly;
   verified by fixtures (doc 01 §1.4).
5. **Event continuity.** Emit identical `event_type/category/label` strings so
   downstream research/analytics pipelines keep working (doc 01 §1.5).
6. **Embed continuity.** `mountBlockPy` keeps the existing config surface in
   [src/embed/config.ts](../../src/embed/config.ts), extended additively.

## 3. Security (Epic 20)

| Threat                                                                                 | Mitigation                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| XSS via instructions/quiz bodies/feedback messages (instructor-authored HTML/markdown) | All HTML passes through DOMPurify with a fixed allowlist (no scripts, no event handlers, iframe allowlist for video). One `SanitizedHtml` component; raw `dangerouslySetInnerHTML` is forbidden elsewhere (lint rule). |
| Answer-key leakage (quiz)                                                              | `on_run` checks never leave the server for students: `for_editor` already omits them; client types make the field `string                                                                                              | undefined` for student role and panels never render it. Grading is server-side only. |
| Instructor/secret file leakage                                                         | VFS visibility filtering is the single chokepoint (doc 04 §3); tracebacks strip non-student frames (doc 05 §4); secret file contents are excluded from logs and error messages.                                        |
| Untrusted student code                                                                 | Runs only inside the Pyodide worker; no DOM access; module allowlist; network disabled in the worker except Pyodide package loading.                                                                                   |
| IP-range / passcode bypass                                                             | Client treats `ip_ranges`/`passcode` as UX prompts; server enforcement is authoritative. Passcode entry dialog stores the passcode in sessionStore, sent in the envelope.                                              |
| CSRF / auth                                                                            | Same-origin cookie session as legacy; the client never persists credentials.                                                                                                                                           |
| Paste detection                                                                        | `preventPaste` blocks paste in editors and logs `X-Editor.Paste` either way.                                                                                                                                           |

## 4. Accessibility (Epic 18)

- All panels keyboard-reachable: PanelHost provides a roving-focus toolbar; a
  global panel switcher (`Ctrl+Shift+P`-style menu listing panels).
- Activity rail = `<nav>` with `aria-current`; task status conveyed in text,
  not color alone.
- Console output is `role="log"` with `aria-live="polite"`; feedback panel uses
  `aria-live="assertive"` for grading results.
- Quiz inputs are native form controls with `<fieldset>/<legend>` per question;
  blank/dropdown markers get generated labels ("Blank 1 of 3").
- Splitters are `role="separator"` with `aria-valuenow` and arrow-key resizing
  (extends the existing pointer-event splitter).
- CSS Modules with a contrast-checked token palette; respects
  `prefers-reduced-motion`; no inline styles (AGENTS.md).
- Block editor: Blockly keyboard-navigation plugin evaluated in Slice 8; text
  mode is always available as the accessible equivalent (`canChangeView`
  override for assistive-tech users).

## 5. Quality gates

Every slice (doc 08) ends with: `npm lint`, `npm typecheck`, `npm test` green;
no `any`; no console logs; a11y review for new UI; fixtures added for any newly
verified legacy schema.
