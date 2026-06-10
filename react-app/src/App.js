import React, { useState } from 'react';
import './App.css';
import { DiagramProvider } from './context/DiagramContext';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';

function App() {
  const [playing, setPlaying] = useState(false);

  return (
    <DiagramProvider>
      <div className="app">
        <div className="panel">
          <Sidebar />
          <hr className="panel-divider" />
          <PropertiesPanel />
          <hr className="panel-divider" />
          <Toolbar playing={playing} onTogglePlay={() => setPlaying((p) => !p)} />
        </div>
        <Canvas playing={playing} onSequenceEnd={() => setPlaying(false)} />
      </div>
    </DiagramProvider>
  );
}

export default App;
