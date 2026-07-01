# 05 — Execution Engine

## 1. Architecture

Pyodide runs in a dedicated **Web Worker** per mount. The main thread never
blocks; infinite loops are killable by terminating the worker (Story 6.4) —
something the current main-thread `pyodideRunner.ts` cannot do.

```
src/engine/
  EngineHost.ts          // main-thread facade: run(), evaluate(), interrupt()
  worker/
    engine.worker.ts     // worker entry: pyodide bootstrap, message loop
    phases.ts            // phase orchestration (see §3)
    instrument.ts        // trace/coverage instrumentation hooks
    sandbox.ts           // module allowlist, input/output bridging
  protocol.ts            // discriminated-union message types (both directions)
  feedback/
    feedbackEngine.ts    // interprets on_run results -> Feedback objects
    categories.ts        // severity/category taxonomy (Story 8.1)
```

### 1.1 Message protocol

All worker communication is a typed discriminated union (`protocol.ts`):

```ts
type ToWorker =
    | { kind: "init"; pyodideUrl: string; packages: string[] }
    | {
          kind: "run";
          phase: Phase;
          files: RuntimeFileMap;
          main: string;
          inputs: string[];
          settings: RunSettings;
          runId: number;
      }
    | { kind: "evaluate"; code: string; runId: number } // console REPL
    | { kind: "input-response"; value: string }
    | { kind: "interrupt" }; // SharedArrayBuffer or terminate

type FromWorker =
    | { kind: "ready" }
    | { kind: "stdout" | "stderr"; text: string; runId: number }
    | { kind: "input-request"; prompt: string; runId: number }
    | { kind: "image"; png: string; runId: number } // turtle/matplotlib
    | { kind: "trace-step"; step: TraceStep; runId: number }
    | { kind: "result"; runId: number; outcome: RunOutcome }
    | { kind: "feedback-raw"; runId: number; payload: InstructorFeedbackRaw }
    | { kind: "fatal"; error: EngineError };
```

`runId` correlates streams to runs so a stale worker message can never pollute a
newer run's console (the engine bumps `runId` and drops mismatches).

### 1.2 Interrupt strategy

Preferred: `SharedArrayBuffer` interrupt buffer (`pyodide.setInterruptBuffer`)
when cross-origin isolation headers permit. Fallback: worker termination +
re-init (state loss acceptable; the engine reports "restarting Python" status).
Timeout default 7s per phase, disabled by `disableTimeout` setting.

## 2. RuntimeFileMap

The VFS produces a flat map written into Pyodide's FS before each run
(doc 04 §3). Student runs receive student+starting+readOnly+generated files;
instructor-phase runs additionally receive hidden+secret files. Generated files
written by the program are read back after the run into the `generated`
namespace (Story 4.3).

## 3. Execution phases (Story 6.2)

A "run" is a pipeline of phases, each an isolated Pyodide execution with its own
globals:

| Phase                 | Trigger                                  | Code                   | Purpose                                                                     |
| --------------------- | ---------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `student.run`         | Run button                               | `answer.py` (+VFS)     | the learner's program                                                       |
| `instructor.onRun`    | after student.run                        | `!on_run.py`           | grading/feedback; receives student source, AST facts, output, trace summary |
| `student.evaluate`    | console REPL entry                       | typed expression       | interactive exploration                                                     |
| `instructor.onEval`   | after evaluate                           | `!on_eval.py`          | feedback on REPL usage                                                      |
| `instructor.onChange` | debounced edit (if `on_change` nonempty) | `!on_change.py`        | live nudges                                                                 |
| `sample.run`          | instructor tools                         | sample submission code | testing graders (Story 16.4)                                                |

The instructor phases run with a feedback API preloaded (v2 ships a small
Python shim module exposing the legacy `pedal`-style entry points the existing
curriculum expects — `gently()`, `explain()`, `set_success()`, `give_partial()`,
`compliment()`, plus access to `student.data`, parsed AST, and output). The shim
serializes results as `InstructorFeedbackRaw` for the main thread. Exact shim
surface is locked to what existing on_run scripts use; survey during Slice 4.

## 4. Feedback engine (Epic 8)

`feedbackEngine.ts` converts raw phase outcomes into one `Feedback` object:

```ts
export interface Feedback {
    category:
        | "syntax"
        | "runtime"
        | "analyzer"
        | "instructor"
        | "success"
        | "partial"
        | "system"
        | "none";
    label: string; // short title ("SyntaxError", "Complete!")
    message: string; // sanitized HTML (doc 07 §3)
    priority: number;
    score: number | null; // 0..1 when grading occurred
    correct: boolean;
    hiddenFromStudent: boolean; // assignment.hidden support
    location?: { file: string; line: number };
}
```

Precedence (highest wins): system error → syntax error → instructor feedback →
runtime error → analyzer tips → success/partial. Python tracebacks are rewritten
to student-relevant frames only (frames inside instructor/secret files are
stripped — Epic 20), with friendly explanations for the common error classes
(Story 8.3, porting the legacy "pretty errors" tables).

Each feedback presentation logs an `Intervention` event; `update_submission`
fires when the instructor phase sets score/correct (Story 10.3). The Feedback
context panel renders current feedback; line highlights flow to the editor via
the `BlockEditorAdapter.setHighlightedLines` API (Story 5.2).

## 5. Console panel

One console per workspace (Tool panel), with:

- streamed stdout/stderr (batched via `requestAnimationFrame` to handle
  high-volume prints, Story 7.4),
- inline `input()` handling: `input-request` renders an inline text field;
  queued-inputs UI lets students pre-supply inputs (hidden by
  `hideQueuedInputs`),
- a REPL line (hidden by `hideEvaluate`) running `student.evaluate`,
- image output blocks for turtle/plot `image` messages, with "save to
  submission" calling `save_image` (Story 11.4),
- run separators showing phase, timestamp, and runId.

## 6. Trace and coverage (Epic 9)

Instrumentation uses `sys.settrace` inside the worker, enabled only when the
trace/coverage buttons request it (cost is significant; never on by default).

- **Trace:** each step records `{line, event, localsDiff}` capped at N=10k steps;
  the Trace context panel scrubs through steps, driving editor line highlights.
- **Coverage:** executed-line sets per file, rendered as gutter shading;
  hidden by `hideCoverageButton`/`hideTraceButton` settings.
- Trace summaries (executed line count, call counts) are passed to
  `instructor.onRun` so graders can assert on them, matching legacy capability.
