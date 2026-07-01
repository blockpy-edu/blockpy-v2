// (De)serialization of `#extra_*.blockpy` bundle files (docs/architecture/04 §5).
// Bundles are JSON arrays of {filename, contents} records. Unknown extra
// fields on each record are preserved for lossless round-trips.

import { parseSigilName, toSigilName } from "./types";
import type { Namespace, VfsFile } from "./types";

export interface BundleEntry {
    filename: string;
    contents: string;
    /** Unknown legacy fields preserved verbatim. */
    extra: Record<string, unknown>;
}

/** Parses bundle JSON. Total: malformed input yields an empty bundle. */
export function parseBundle(raw: string): BundleEntry[] {
    if (!raw.trim()) {
        return [];
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) {
        return [];
    }
    const entries: BundleEntry[] = [];
    for (const item of parsed) {
        if (typeof item !== "object" || item === null) {
            continue;
        }
        const record = item as Record<string, unknown>;
        const { filename, contents, ...extra } = record;
        if (typeof filename !== "string") {
            continue;
        }
        entries.push({
            filename,
            contents: typeof contents === "string" ? contents : "",
            extra,
        });
    }
    return entries;
}

export function serializeBundle(entries: readonly BundleEntry[]): string {
    return JSON.stringify(
        entries.map(({ filename, contents, extra }) => ({ ...extra, filename, contents })),
    );
}

/** Maps bundle entries to VFS files, resolving sigils and path prefixes. */
export function bundleToFiles(entries: readonly BundleEntry[], fallback: Namespace): VfsFile[] {
    return entries.map((entry) => {
        const { name, namespace, explicit } = parseSigilName(entry.filename);
        return {
            name,
            namespace: explicit ? namespace : fallback,
            content: entry.contents,
            origin: "bundle" as const,
            rawName: entry.filename,
            bundleExtra: entry.extra,
        };
    });
}

/** Re-serializes VFS files into a bundle, restoring original filenames. */
export function filesToBundle(files: readonly VfsFile[]): BundleEntry[] {
    return files.map((file) => ({
        filename: file.rawName ?? (file.namespace === "student" ? file.name : toSigilName(file)),
        contents: file.content,
        extra: file.bundleExtra ?? {},
    }));
}
