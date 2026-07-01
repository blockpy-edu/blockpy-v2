// AssignmentSettings: strict parsed type over the historically loose
// `assignment.settings` JSON string (docs/architecture/03 §4).
//
// The parser is total (never throws) and preserves unknown keys in `extra`
// so legacy settings blobs round-trip without loss (Story 19.5).

export interface AssignmentSettings {
    // editor
    startView: "split" | "text" | "block";
    canChangeView: boolean;
    enableBlocks: boolean;
    // panels
    hideFiles: boolean;
    hideQueuedInputs: boolean;
    hideEditors: boolean;
    hideEvaluate: boolean;
    hideImportDatasetsButton: boolean;
    hideImportStatements: boolean;
    hideCoverageButton: boolean;
    hideTraceButton: boolean;
    // behavior
    disableInstructorRun: boolean;
    disableEdit: boolean;
    disableTimeout: boolean;
    onlyInteractive: boolean;
    onlyUploads: boolean;
    // grading
    disableFeedback: boolean;
    forceTextMode: boolean;
    preventPaste: boolean;
    datasets: string[];
    /** Unknown legacy keys, preserved verbatim for round-tripping. */
    extra: Record<string, unknown>;
}

export const DEFAULT_ASSIGNMENT_SETTINGS: AssignmentSettings = {
    startView: "split",
    canChangeView: true,
    enableBlocks: true,
    hideFiles: false,
    hideQueuedInputs: false,
    hideEditors: false,
    hideEvaluate: false,
    hideImportDatasetsButton: false,
    hideImportStatements: false,
    hideCoverageButton: false,
    hideTraceButton: false,
    disableInstructorRun: false,
    disableEdit: false,
    disableTimeout: false,
    onlyInteractive: false,
    onlyUploads: false,
    disableFeedback: false,
    forceTextMode: false,
    preventPaste: false,
    datasets: [],
    extra: {},
};

const BOOLEAN_KEYS = [
    "canChangeView",
    "enableBlocks",
    "hideFiles",
    "hideQueuedInputs",
    "hideEditors",
    "hideEvaluate",
    "hideImportDatasetsButton",
    "hideImportStatements",
    "hideCoverageButton",
    "hideTraceButton",
    "disableInstructorRun",
    "disableEdit",
    "disableTimeout",
    "onlyInteractive",
    "onlyUploads",
    "disableFeedback",
    "forceTextMode",
    "preventPaste",
] as const;

type BooleanKey = (typeof BOOLEAN_KEYS)[number];

const KNOWN_KEYS: ReadonlySet<string> = new Set<string>(["startView", "datasets", ...BOOLEAN_KEYS]);

const START_VIEWS = ["split", "text", "block"] as const;

function isStartView(value: unknown): value is AssignmentSettings["startView"] {
    return typeof value === "string" && (START_VIEWS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parses a settings JSON string. Never throws; unknown keys go to `extra`. */
export function parseAssignmentSettings(raw: string): AssignmentSettings {
    const settings: AssignmentSettings = {
        ...DEFAULT_ASSIGNMENT_SETTINGS,
        datasets: [],
        extra: {},
    };

    if (!raw.trim()) {
        return settings;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return settings;
    }
    if (!isRecord(parsed)) {
        return settings;
    }

    for (const key of BOOLEAN_KEYS) {
        const value = parsed[key];
        if (typeof value === "boolean") {
            assignBoolean(settings, key, value);
        }
    }
    if (isStartView(parsed.startView)) {
        settings.startView = parsed.startView;
    }
    if (Array.isArray(parsed.datasets)) {
        settings.datasets = parsed.datasets.filter(
            (entry): entry is string => typeof entry === "string",
        );
    }
    for (const [key, value] of Object.entries(parsed)) {
        if (!KNOWN_KEYS.has(key)) {
            settings.extra[key] = value;
        }
    }
    return settings;
}

function assignBoolean(settings: AssignmentSettings, key: BooleanKey, value: boolean): void {
    settings[key] = value;
}

/** Serializes settings back to JSON, restoring preserved unknown keys. */
export function serializeAssignmentSettings(settings: AssignmentSettings): string {
    const { extra, ...known } = settings;
    return JSON.stringify({ ...extra, ...known });
}
