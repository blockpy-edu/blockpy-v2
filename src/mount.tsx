import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { resolveBlockPyConfig } from "./embed/config";
import type { BlockPyMountOptions, BlockPyResolvedConfig } from "./types";

export interface BlockPyMountHandle {
    update: (options: BlockPyMountOptions) => void;
    unmount: () => void;
    getConfig: () => BlockPyResolvedConfig;
}

export function mountBlockPy(node: Element, options: BlockPyMountOptions = {}): BlockPyMountHandle {
    let root: Root | null = createRoot(node);
    let resolvedConfig = resolveBlockPyConfig(options);

    root.render(
        <StrictMode>
            <App config={resolvedConfig} />
        </StrictMode>,
    );

    return {
        update: (nextOptions) => {
            if (!root) {
                return;
            }
            resolvedConfig = resolveBlockPyConfig(nextOptions);
            root.render(
                <StrictMode>
                    <App config={resolvedConfig} />
                </StrictMode>,
            );
        },
        unmount: () => {
            if (!root) {
                return;
            }
            root.unmount();
            root = null;
        },
        getConfig: () => resolvedConfig,
    };
}
