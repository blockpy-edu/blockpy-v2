import { useEffect, useRef } from 'react';
import { registerPythonBlocks, PYTHON_TOOLBOX } from '../../services/mlt/pythonBlocks';
import { workspaceToPython } from '../../services/mlt/blockToPython';
import * as Blockly from 'blockly/core';
import * as BlocklyMsgEn from 'blockly/msg/en';

interface BlocklyWorkspaceProps {
  blocksXml?: string;
  onCodeChange: (code: string, blocksXml: string) => void;
  className?: string;
}

export function BlocklyWorkspace({ blocksXml, onCodeChange, className }: BlocklyWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceRef = useRef<any>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const isExternalUpdateRef = useRef(false);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  });

  useEffect(() => {
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFallbackHandler: (() => void) | null = null;

    const init = async () => {
      if (!containerRef.current) return;

      try {
        if (!mounted) return;

        Blockly.setLocale(BlocklyMsgEn as unknown as { [key: string]: string });
        registerPythonBlocks(Blockly);

        const workspace = Blockly.inject(containerRef.current, {
          toolbox: PYTHON_TOOLBOX,
          grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
          zoom: { controls: true, wheel: true, startScale: 1.0 },
          trashcan: true,
        });

        workspaceRef.current = workspace;

        // Keep Blockly's SVG viewport in sync with CSS-driven pane resizes.
        const triggerResize = () => {
          if (workspaceRef.current) {
            Blockly.svgResize(workspaceRef.current);
          }
        };

        triggerResize();

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            triggerResize();
          });
          resizeObserver.observe(containerRef.current);
        } else {
          resizeFallbackHandler = triggerResize;
          window.addEventListener('resize', resizeFallbackHandler);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workspace.addChangeListener((event: any) => {
          if (isExternalUpdateRef.current) return;
          const changeTypes = new Set([
            'move',
            'change',
            'delete',
            'create',
            Blockly.Events?.BLOCK_MOVE,
            Blockly.Events?.BLOCK_CHANGE,
            Blockly.Events?.BLOCK_DELETE,
            Blockly.Events?.BLOCK_CREATE,
          ]);
          if (changeTypes.has(event.type as string)) {
            const result = workspaceToPython(workspace);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Xml = (Blockly as any).Xml;
            const xml = Xml?.workspaceToDom(workspace) as Element | undefined;
            const xmlText = xml ? (Xml?.domToText(xml) as string) : '';
            onCodeChangeRef.current(result.code, xmlText);
          }
        });
      } catch (err) {
        console.error('Failed to initialize Blockly:', err);
      }
    };

    void init();

    return () => {
      mounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      if (resizeFallbackHandler) {
        window.removeEventListener('resize', resizeFallbackHandler);
        resizeFallbackHandler = null;
      }

      if (workspaceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (workspaceRef.current as any).dispose();
        workspaceRef.current = null;
      }
    };
  }, []);

  // Sync external blocksXml into workspace
  useEffect(() => {
    if (!workspaceRef.current || !blocksXml) return;

    const updateWorkspace = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Xml = (Blockly as any).Xml;
        if (Xml) {
          isExternalUpdateRef.current = true;
          Blockly.Events.disable();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (workspaceRef.current as any).clear();
          const dom = Blockly.utils.xml.textToDom(blocksXml) as Element;
          Xml.domToWorkspace(dom, workspaceRef.current);
        }
      } catch (err) {
        console.error('Failed to update Blockly workspace:', err);
      } finally {
        Blockly.Events.enable();
        isExternalUpdateRef.current = false;
      }
    };

    void updateWorkspace();
  }, [blocksXml]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: '100%', width: '100%' }}
      role="application"
      aria-label="Blockly visual programming workspace"
    />
  );
}
