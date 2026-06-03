import { BlockPyEditor } from './components/code-editor/BlockPyEditor';
import './App.css';
import type { BlockPyResolvedConfig } from './types';

interface AppProps {
  config: BlockPyResolvedConfig;
}

function App({ config }: AppProps) {
  return (
    <div className="app">
      <main className="app-main" role="main">
        <BlockPyEditor config={config} />
      </main>
    </div>
  );
}

export default App;
