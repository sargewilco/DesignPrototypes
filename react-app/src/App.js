import React, { useState, useEffect } from 'react';
import './App.css';
import { DiagramProvider } from './context/DiagramContext';
import { SimulationProvider } from './context/SimulationContext';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import ValidationPanel from './components/ValidationPanel';
import Canvas from './components/Canvas';
import FlowControls from './components/FlowControls';
import SequenceDiagram from './components/SequenceDiagram';
import AIToggle from './components/AIToggle';
import AIAssistPanel from './components/AIAssistPanel';

function App() {
  const [playing, setPlaying] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(
    () => localStorage.getItem('aiAssist') === '1'
  );

  useEffect(() => {
    localStorage.setItem('aiAssist', aiEnabled ? '1' : '0');
  }, [aiEnabled]);

  return (
    <DiagramProvider>
      <SimulationProvider>
        <div className="app">
          <div className="panel">
            <AIToggle enabled={aiEnabled} onToggle={() => setAiEnabled((v) => !v)} />
            {aiEnabled && (
              <>
                <AIAssistPanel />
                <hr className="panel-divider" />
              </>
            )}
            <Sidebar />
            <hr className="panel-divider" />
            <PropertiesPanel />
            <hr className="panel-divider" />
            <ValidationPanel />
            <hr className="panel-divider" />
            <Toolbar playing={playing} onTogglePlay={() => setPlaying((p) => !p)} />
          </div>
          <Canvas playing={playing} onSequenceEnd={() => setPlaying(false)} />
          <FlowControls />
          <SequenceDiagram />
        </div>
      </SimulationProvider>
    </DiagramProvider>
  );
}

export default App;
