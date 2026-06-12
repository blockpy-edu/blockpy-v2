import { WorkspaceProvider } from './workspace/WorkspaceProvider';
import { WorkspaceShell } from './workspace/WorkspaceShell';
import './App.css';
import type { BlockPyResolvedConfig } from './types';

interface AppProps {
  config: BlockPyResolvedConfig;
}

function App({ config }: AppProps) {
  return (
    <div className="app">
      <WorkspaceProvider config={config}>
        <WorkspaceShell />
      </WorkspaceProvider>
    </div>
  );
}

export default App;
