import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLayoutState } from '../useWorkspace';
import { collectPanelIds, getPreset } from './presets';
import { SplitRegion } from './SplitRegion';
import type { PanelId } from './types';
import styles from './LayoutRoot.module.css';

interface LayoutRootProps {
  renderPanel: (panelId: PanelId) => ReactNode;
}

/** Below this width (px) the layout falls back to a vertically stacked list. */
const STACKED_BREAKPOINT = 640;

function useIsNarrow(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < STACKED_BREAKPOINT);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return isNarrow;
}

export function LayoutRoot({ renderPanel }: LayoutRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const presetId = useLayoutState((state) => state.presetId);
  const fullscreenPanelId = useLayoutState((state) => state.fullscreenPanelId);
  const isNarrow = useIsNarrow(containerRef);

  const preset = getPreset(presetId);

  let content: ReactNode;
  if (fullscreenPanelId !== null) {
    content = <div className={styles.fullscreenPane}>{renderPanel(fullscreenPanelId)}</div>;
  } else if (isNarrow) {
    content = collectPanelIds(preset.regions).map((panelId) => (
      <div key={panelId} className={styles.stackedPane}>
        {renderPanel(panelId)}
      </div>
    ));
  } else if (preset.regions.kind === 'panel') {
    content = renderPanel(preset.regions.panelId);
  } else {
    content = <SplitRegion node={preset.regions} regionPath="root" renderPanel={renderPanel} />;
  }

  return (
    <div
      ref={containerRef}
      className={
        isNarrow && fullscreenPanelId === null ? `${styles.root} ${styles.stacked}` : styles.root
      }
    >
      {content}
    </div>
  );
}
