import { BlockPyEditor } from './components/BlockPyEditor';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header" role="banner">
        <h1>BlockPy</h1>
        <p>Dual Python Editor: Blocks + Code</p>
      </header>
      <main className="app-main" role="main">
        <BlockPyEditor />
      </main>
    </div>
  );
}

export default App;
