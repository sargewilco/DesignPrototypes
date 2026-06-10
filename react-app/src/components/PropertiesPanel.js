import React from 'react';
import { useDiagram } from '../context/DiagramContext';
import { presetColors, flowOptions, statusOptions } from '../constants';

const PropertiesPanel = () => {
  const { state, dispatch } = useDiagram();
  const { selectedNodeIds, selectedConnectionId, nodes, connections } = state;

  const hasNodeSelection = selectedNodeIds.length > 0;
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

  const firstNodeColor = hasNodeSelection
    ? (nodes[selectedNodeIds[0]] && nodes[selectedNodeIds[0]].color) || '#ffffff'
    : '#ffffff';

  const applyColor = (color) => {
    if (!hasNodeSelection) return;
    dispatch({ type: 'SET_NODE_COLOR', payload: { ids: selectedNodeIds, color } });
  };

  const updateConnection = (changes) => {
    if (!selectedConnection) return;
    dispatch({ type: 'UPDATE_CONNECTION', payload: { id: selectedConnection.id, changes } });
  };

  return (
    <div className="sidebar-section">
      <h2>Properties</h2>

      {selectedConnection ? (
        <div className="property-group">
          <label>Flow Direction:</label>
          <select
            className="status-select"
            value={selectedConnection.flow}
            onChange={(e) => updateConnection({ flow: e.target.value })}
          >
            {flowOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label style={{ marginTop: 10, display: 'block', fontSize: '0.9em' }}>
            Connection Status:
          </label>
          <select
            className="status-select"
            value={selectedConnection.status}
            onChange={(e) => updateConnection({ status: e.target.value })}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label style={{ marginTop: 10, display: 'block', fontSize: '0.9em' }}>
            Sequence Order:
          </label>
          <input
            type="text"
            className="status-select"
            placeholder="e.g. 1, 3"
            value={selectedConnection.sequence || ''}
            onChange={(e) => updateConnection({ sequence: e.target.value })}
          />
        </div>
      ) : (
        <div className="property-group">
          <label>Background Color:</label>
          <div className={`color-presets ${hasNodeSelection ? '' : 'disabled'}`}>
            {presetColors.map((color) => (
              <div
                key={color}
                className={`color-swatch ${
                  color.toLowerCase() === firstNodeColor.toLowerCase() ? 'active' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => applyColor(color)}
              />
            ))}
          </div>
          <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.9em', color: '#555' }}>Custom:</label>
            <input
              type="color"
              value={firstNodeColor}
              disabled={!hasNodeSelection}
              onChange={(e) => applyColor(e.target.value)}
            />
          </div>
          {!hasNodeSelection && (
            <div style={{ marginTop: 10, fontSize: '0.85em', color: '#666' }}>
              Select a node to change its colour, or a connection to edit its flow.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
