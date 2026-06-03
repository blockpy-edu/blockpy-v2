import './index.css';
import { mountBlockPy } from './mount';
import type { BlockPyMountHandle } from './mount';
import type { BlockPyMountOptions } from './types';

declare global {
  interface Window {
    BlockPy?: {
      mount: (node: Element, options?: BlockPyMountOptions) => BlockPyMountHandle;
    };
    BLOCKPY_INITIAL_CONFIG?: BlockPyMountOptions;
  }
}

window.BlockPy = {
  ...(window.BlockPy ?? {}),
  mount: mountBlockPy,
};

const rootElement = document.getElementById('root');
if (rootElement) {
  mountBlockPy(rootElement, window.BLOCKPY_INITIAL_CONFIG);
}
