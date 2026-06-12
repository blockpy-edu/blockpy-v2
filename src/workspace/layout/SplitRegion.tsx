import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLayoutActions, useLayoutState } from '../useWorkspace';
import { MIN_PANE_PERCENT } from './types';
import type { PanelId, RegionNode, SplitNode } from './types';
import styles from './SplitRegion.module.css';

interface SplitRegionProps {
  node: SplitNode;
  regionPath: string;
  renderPanel: (panelId: PanelId) => ReactNode;
}

const KEYBOARD_STEP_PERCENT = 5;

/**
 * Clamp a proposed delta so both panes adjacent to a separator keep at least
 * MIN_PANE_PERCENT. Returns the applied delta.
 */
function clampDelta(before: number, after: number, delta: number): number {
  const minDelta = MIN_PANE_PERCENT - before;
  const maxDelta = after - MIN_PANE_PERCENT;
  return Math.min(Math.max(delta, minDelta), maxDelta);
}

function applyDelta(sizes: number[], separatorIndex: number, delta: number): number[] {
  const applied = clampDelta(sizes[separatorIndex], sizes[separatorIndex + 1], delta);
  const next = [...sizes];
  next[separatorIndex] += applied;
  next[separatorIndex + 1] -= applied;
  return next;
}

function isCollapsedPanel(node: RegionNode, collapsed: Partial<Record<PanelId, boolean>>): boolean {
  return node.kind === 'panel' && collapsed[node.panelId] === true;
}

export function SplitRegion({ node, regionPath, renderPanel }: SplitRegionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ position: number; sizes: number[] } | null>(null);
  const [activeSeparator, setActiveSeparator] = useState<number | null>(null);

  const sizes = useLayoutState((state) => state.sizes[regionPath]) ?? node.sizes;
  const collapsed = useLayoutState((state) => state.collapsed);
  const { setRegionSizes } = useLayoutActions();

  const isRow = node.direction === 'row';

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, index: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      position: isRow ? event.clientX : event.clientY,
      sizes,
    };
    setActiveSeparator(index);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>, index: number) => {
    const dragStart = dragStartRef.current;
    const container = containerRef.current;
    if (!dragStart || !container) {
      return;
    }
    const containerSize = isRow ? container.clientWidth : container.clientHeight;
    if (containerSize <= 0) {
      return;
    }
    const position = isRow ? event.clientX : event.clientY;
    const deltaPercent = ((position - dragStart.position) / containerSize) * 100;
    setRegionSizes(regionPath, applyDelta(dragStart.sizes, index, deltaPercent));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStartRef.current = null;
    setActiveSeparator(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    const decreaseKey = isRow ? 'ArrowLeft' : 'ArrowUp';
    const increaseKey = isRow ? 'ArrowRight' : 'ArrowDown';
    let delta: number;
    if (event.key === decreaseKey) {
      delta = -KEYBOARD_STEP_PERCENT;
    } else if (event.key === increaseKey) {
      delta = KEYBOARD_STEP_PERCENT;
    } else {
      return;
    }
    event.preventDefault();
    setRegionSizes(regionPath, applyDelta(sizes, index, delta));
  };

  return (
    <div ref={containerRef} className={`${styles.region} ${isRow ? styles.row : styles.column}`}>
      {node.children.map((child, index) => {
        const childPath = `${regionPath}.${index}`;
        const childCollapsed = isCollapsedPanel(child, collapsed);
        const paneClass = childCollapsed ? `${styles.pane} ${styles.paneCollapsed}` : styles.pane;
        const paneStyle = { '--pane-size': `${sizes[index]}%` } as React.CSSProperties;

        const separatorIndex = index - 1;
        const separatorDisabled =
          index > 0 && (childCollapsed || isCollapsedPanel(node.children[index - 1], collapsed));

        return [
          index > 0 && (
            <div
              key={`separator-${index}`}
              role="separator"
              aria-orientation={isRow ? 'vertical' : 'horizontal'}
              aria-label={`Resize panes ${index} and ${index + 1}`}
              aria-valuenow={Math.round(sizes[separatorIndex])}
              aria-valuemin={MIN_PANE_PERCENT}
              aria-valuemax={100 - MIN_PANE_PERCENT}
              aria-disabled={separatorDisabled || undefined}
              tabIndex={separatorDisabled ? -1 : 0}
              className={`${styles.separator} ${
                activeSeparator === separatorIndex ? styles.separatorActive : ''
              } ${separatorDisabled ? styles.separatorDisabled : ''}`}
              onPointerDown={
                separatorDisabled ? undefined : (event) => handlePointerDown(event, separatorIndex)
              }
              onPointerMove={
                separatorDisabled ? undefined : (event) => handlePointerMove(event, separatorIndex)
              }
              onPointerUp={separatorDisabled ? undefined : handlePointerUp}
              onKeyDown={
                separatorDisabled ? undefined : (event) => handleKeyDown(event, separatorIndex)
              }
            />
          ),
          <div key={childPath} className={paneClass} style={paneStyle}>
            {child.kind === 'panel' ? (
              renderPanel(child.panelId)
            ) : (
              <SplitRegion node={child} regionPath={childPath} renderPanel={renderPanel} />
            )}
          </div>,
        ];
      })}
    </div>
  );
}
