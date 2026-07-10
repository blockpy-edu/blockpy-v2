// Client-side TypeScript compilation for kettle tasks. Mirrors the legacy
// kettle component (blockpy-server frontend/components/kettle), which
// transpiles in the browser and executes in a Worker. The compiler is
// imported lazily so Python-only mounts never pay for it.

export interface CompiledTypeScript {
    js: string;
    /** First syntax diagnostic, when compilation failed. */
    error: { message: string; line: number | null } | null;
}

type TypeScriptModule = typeof import("typescript");

let compilerPromise: Promise<TypeScriptModule> | null = null;

function loadCompiler(): Promise<TypeScriptModule> {
    if (!compilerPromise) {
        compilerPromise = import("typescript");
    }
    return compilerPromise;
}

/** 1-based line for a character offset in `source`. */
function lineOfOffset(source: string, offset: number): number {
    let line = 1;
    for (let index = 0; index < offset && index < source.length; index += 1) {
        if (source[index] === "\n") {
            line += 1;
        }
    }
    return line;
}

export async function compileTypeScript(source: string): Promise<CompiledTypeScript> {
    const ts = await loadCompiler();
    const result = ts.transpileModule(source, {
        reportDiagnostics: true,
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            // The worker harness supplies exports/module/require stubs;
            // ModuleKind.None is deprecated in TypeScript 6.
            module: ts.ModuleKind.CommonJS,
            removeComments: false,
        },
    });
    const diagnostic = (result.diagnostics ?? []).find(
        (entry) => entry.category === ts.DiagnosticCategory.Error,
    );
    if (diagnostic) {
        return {
            js: result.outputText,
            error: {
                message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
                line:
                    typeof diagnostic.start === "number"
                        ? lineOfOffset(source, diagnostic.start)
                        : null,
            },
        };
    }
    return { js: result.outputText, error: null };
}
