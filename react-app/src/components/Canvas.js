import React from 'react';
import { useDiagram } from '../context/DiagramContext';

const Canvas = () => {
  const { state } = useDiagram();

  return (
    <div className="canvas-container">
      <div className="instructions">
        Drag elements from left.<br/>
        Hold Shift and click two nodes to connect them.<br/>
        Nodes: {Object.keys(state.nodes).length}
      </div>
      <svg className="connection-layer">
        {/* SVG paths will go here */}
      </svg>
      {/* Nodes will be rendered here */}
    </div>
  );
};

export default Canvas;
