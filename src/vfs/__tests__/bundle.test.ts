import { describe, expect, it } from "vitest";
import { bundleToFiles, filesToBundle, parseBundle, serializeBundle } from "../bundle";
import { parseSigilName, toSigilName } from "../types";
import type { VfsFile } from "../types";

describe("parseSigilName", () => {
    it("maps sigils to namespaces", () => {
        expect(parseSigilName("!on_run.py")).toEqual({
            name: "on_run.py",
            namespace: "instructor",
            explicit: true,
        });
        expect(parseSigilName("^starting_code.py").namespace).toBe("starting");
        expect(parseSigilName("?hidden.txt").namespace).toBe("hidden");
        expect(parseSigilName("&data.csv").namespace).toBe("readOnly");
        expect(parseSigilName("$secret.txt").namespace).toBe("secret");
        expect(parseSigilName("*output.png").namespace).toBe("generated");
    });

    it("maps legacy path prefixes inside bundles", () => {
        expect(parseSigilName("_instructor/grader.py")).toEqual({
            name: "grader.py",
            namespace: "instructor",
            explicit: true,
        });
        expect(parseSigilName("_student/notes.txt")).toEqual({
            name: "notes.txt",
            namespace: "student",
            explicit: true,
        });
    });

    it("defaults plain names to the student namespace, non-explicitly", () => {
        expect(parseSigilName("answer.py")).toEqual({
            name: "answer.py",
            namespace: "student",
            explicit: false,
        });
    });

    it("round-trips through toSigilName", () => {
        for (const raw of ["!on_run.py", "^start.py", "?h.txt", "&r.csv", "$s.txt", "*g.png"]) {
            const parsed = parseSigilName(raw);
            expect(toSigilName(parsed)).toBe(raw);
        }
    });
});

describe("parseBundle / serializeBundle", () => {
    it("parses {filename, contents} records", () => {
        const entries = parseBundle('[{"filename": "data.csv", "contents": "a,b"}]');
        expect(entries).toEqual([{ filename: "data.csv", contents: "a,b", extra: {} }]);
    });

    it("preserves unknown fields across a round trip", () => {
        const raw = JSON.stringify([
            { filename: "data.csv", contents: "a,b", mimetype: "text/csv", size: 3 },
        ]);
        const entries = parseBundle(raw);
        expect(entries[0].extra).toEqual({ mimetype: "text/csv", size: 3 });
        const parsed = JSON.parse(serializeBundle(entries)) as Record<string, unknown>[];
        expect(parsed[0]).toEqual({
            filename: "data.csv",
            contents: "a,b",
            mimetype: "text/csv",
            size: 3,
        });
    });

    it("returns an empty bundle for malformed input", () => {
        expect(parseBundle("")).toEqual([]);
        expect(parseBundle("not json")).toEqual([]);
        expect(parseBundle('{"filename": "x"}')).toEqual([]);
        expect(parseBundle('[42, {"contents": "no filename"}]')).toEqual([]);
    });
});

describe("bundleToFiles / filesToBundle", () => {
    it("uses the fallback namespace for plain entries only", () => {
        const files = bundleToFiles(
            [
                { filename: "data.csv", contents: "a", extra: {} },
                { filename: "?hidden.txt", contents: "b", extra: {} },
                { filename: "_student/notes.txt", contents: "c", extra: {} },
            ],
            "readOnly",
        );
        expect(files.map((file) => file.namespace)).toEqual(["readOnly", "hidden", "student"]);
    });

    it("restores original raw filenames when re-serializing", () => {
        const entries = [
            { filename: "data.csv", contents: "a", extra: { legacy: true } },
            { filename: "_instructor/grader.py", contents: "b", extra: {} },
        ];
        const roundTripped = filesToBundle(bundleToFiles(entries, "readOnly"));
        expect(roundTripped).toEqual(entries);
    });

    it("synthesizes sigil names for files created in the client", () => {
        const created: VfsFile = {
            name: "extra.py",
            namespace: "hidden",
            content: "x",
            origin: "bundle",
        };
        expect(filesToBundle([created])[0].filename).toBe("?extra.py");
    });
});
