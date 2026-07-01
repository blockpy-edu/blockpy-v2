import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    base: process.env.VITE_BASE_URL ?? "/",
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test-setup.ts"],
        css: false,
    },
    optimizeDeps: {
        exclude: ["pyodide"],
    },
});
