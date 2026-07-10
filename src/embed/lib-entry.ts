// Library entry for the drop-in blockpy-server bundle. Built with
// `npm run build:lib` into an ES module; loading it with
// <script type="module"> registers the legacy `blockpy.BlockPy` global that
// the existing server templates instantiate.

import { registerBlockPyGlobal } from "./legacy";

export { BlockPy, legacySettingsToMountOptions, registerBlockPyGlobal } from "./legacy";
export { mountBlockPy } from "../mount";

registerBlockPyGlobal();
