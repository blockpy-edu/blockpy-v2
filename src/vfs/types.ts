// Virtual file system types (docs/architecture/04).
// Namespaces are dictated by the server's filename sigil conventions; the VFS
// is a faithful client-side projection of them.

export type Namespace =
    | "student"
    | "instructor"
    | "starting"
    | "hidden"
    | "readOnly"
    | "secret"
    | "generated";

export type VfsRole = "student" | "instructor";

export type FileOrigin = "column" | "bundle" | "generated" | "upload";

export interface VfsFile {
    /** Display name without sigil ("answer.py"). */
    name: string;
    namespace: Namespace;
    content: string;
    origin: FileOrigin;
    /** Original bundle filename (sigils/prefixes intact) for lossless saves. */
    rawName?: string;
    /** Unknown legacy bundle-record fields preserved verbatim. */
    bundleExtra?: Record<string, unknown>;
}

export type WriteResult =
    | { ok: true; file: VfsFile }
    | { ok: false; reason: "not-found" | "not-writable" | "not-visible" };

/** Flat name → content map handed to the runtime (docs/architecture/05 §2). */
export type RuntimeFileMap = Record<string, string>;

const SIGIL_TO_NAMESPACE: Record<string, Namespace> = {
    "!": "instructor",
    "^": "starting",
    "?": "hidden",
    "&": "readOnly",
    $: "secret",
    "*": "generated",
};

const NAMESPACE_TO_SIGIL: Record<Namespace, string> = {
    student: "",
    instructor: "!",
    starting: "^",
    hidden: "?",
    readOnly: "&",
    secret: "$",
    generated: "*",
};

export interface ParsedSigilName {
    name: string;
    namespace: Namespace;
    /** True when the namespace came from a sigil or path prefix (not default). */
    explicit: boolean;
}

/**
 * Splits a sigil-prefixed legacy filename into namespace + bare name.
 * Bundle entries may instead carry `_instructor/` / `_student/` path
 * prefixes (Story 4.2).
 */
export function parseSigilName(raw: string): ParsedSigilName {
    if (raw.startsWith("_instructor/")) {
        return { name: raw.slice("_instructor/".length), namespace: "instructor", explicit: true };
    }
    if (raw.startsWith("_student/")) {
        return { name: raw.slice("_student/".length), namespace: "student", explicit: true };
    }
    const namespace = SIGIL_TO_NAMESPACE[raw.charAt(0)];
    if (namespace) {
        return { name: raw.slice(1), namespace, explicit: true };
    }
    return { name: raw, namespace: "student", explicit: false };
}

/** Inverse of parseSigilName for serialization back to legacy filenames. */
export function toSigilName(file: Pick<VfsFile, "name" | "namespace">): string {
    return `${NAMESPACE_TO_SIGIL[file.namespace]}${file.name}`;
}

/** Namespaces a viewer may see (Epic 20: filtering happens inside the VFS). */
export function visibleNamespaces(role: VfsRole): ReadonlySet<Namespace> {
    return role === "instructor" ? INSTRUCTOR_VISIBLE : STUDENT_VISIBLE;
}

const STUDENT_VISIBLE: ReadonlySet<Namespace> = new Set([
    "student",
    "starting",
    "readOnly",
    "generated",
]);

const INSTRUCTOR_VISIBLE: ReadonlySet<Namespace> = new Set([
    "student",
    "instructor",
    "starting",
    "hidden",
    "readOnly",
    "secret",
    "generated",
]);

/** Namespaces a role may write through the editor. */
export function writableNamespaces(role: VfsRole): ReadonlySet<Namespace> {
    return role === "instructor" ? INSTRUCTOR_WRITABLE : STUDENT_WRITABLE;
}

const STUDENT_WRITABLE: ReadonlySet<Namespace> = new Set(["student"]);

const INSTRUCTOR_WRITABLE: ReadonlySet<Namespace> = new Set([
    "student",
    "instructor",
    "starting",
    "hidden",
    "readOnly",
    "secret",
]);

/**
 * Runtime name-collision priority (docs/architecture/04 §3): earlier wins.
 * Hidden/secret only participate in instructor-phase runs.
 */
export const RUNTIME_RESOLUTION_ORDER: readonly Namespace[] = [
    "student",
    "generated",
    "starting",
    "readOnly",
    "hidden",
    "secret",
];
