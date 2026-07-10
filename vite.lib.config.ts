// Library build for the drop-in blockpy-server bundle (`npm run build:lib`).
// Produces dist-lib/blockpy.js, an ES module the server templates load with
// <script type="module">; importing it registers the legacy `blockpy.BlockPy`
// global. ESM output is required so the Pyodide module worker
// (import.meta.url) keeps working.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist-lib",
        lib: {
            entry: resolve(__dirname, "src/embed/lib-entry.ts"),
            formats: ["es"],
            fileName: () => "blockpy.js",
        },
    },
    optimizeDeps: {
        exclude: ["pyodide"],
    },
});
