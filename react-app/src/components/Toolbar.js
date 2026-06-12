import React, { useRef } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { downloadSVG, downloadPNG, downloadJSON } from '../utils/exportSvg';

const Toolbar = ({ playing, onTogglePlay }) => {
  const { state, dispatch } = useDiagram();
  const fileInputRef = useRef(null);

  const snapshotForSave = () => ({
    scale: state.scale,
    panX: state.panX,
    panY: state.panY,
    nodes: Object.values(state.nodes),
    connections: state.connections.map((c) => ({
      sourceId: c.sourceId,
      targetId: c.targetId,
      flow: c.flow,
      label: c.label,
      status: c.status,
      sequence: c.sequence,
      weight: c.weight,
      activeConnections: c.activeConnections,
      responseTime: c.responseTime,
      waypoints: c.waypoints,
    })),
  });

  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        dispatch({ type: 'LOAD_STATE', payload: data });
      } catch (err) {
        console.error(err);
        alert('Error parsing JSON file');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      dispatch({ type: 'CLEAR' });
    }
  };

  return (
    <div className="sidebar-section">
      <h2>Actions</h2>
      <div className="toolbar">
        <button
          className="tool-btn"
          style={
            playing
              ? { backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545' }
              : { backgroundColor: '#28a745', color: 'white', borderColor: '#28a745' }
          }
          onClick={onTogglePlay}
        >
          {playing ? 'Stop Sequence' : 'Play Sequence'}
        </button>
        <button className="tool-btn" onClick={() => downloadJSON(snapshotForSave())}>
          Save JSON
        </button>
        <button className="tool-btn" onClick={() => fileInputRef.current.click()}>
          Load JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLoad}
        />
        <button className="tool-btn" onClick={() => downloadSVG(state.nodes, state.connections)}>
          Export SVG
        </button>
        <button className="tool-btn" onClick={() => downloadPNG(state.nodes, state.connections)}>
          Export PNG
        </button>
        <button className="tool-btn btn-danger" onClick={handleClear}>
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
