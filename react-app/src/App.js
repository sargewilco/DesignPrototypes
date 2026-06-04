import React from 'react';
import './App.css';
import { DiagramProvider } from './context/DiagramContext';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';

function App() {
  return (
    <DiagramProvider>
      <div className="app">
        <div style={{ display: 'flex', flexDirection: 'column', width: '250px' }}>
          <Sidebar />
          <PropertiesPanel />
        </div>
        <Canvas />
      </div>
    </DiagramProvider>
  );
}

export default App;
