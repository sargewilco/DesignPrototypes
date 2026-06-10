import React from 'react';
import { useDiagram } from '../context/DiagramContext';
import { elementSets, networkTypeOptions } from '../constants';

const Sidebar = () => {
  const { state, dispatch } = useDiagram();
  const items = elementSets[state.networkSet] || [];

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="sidebar-section">
      <h2>Elements</h2>
      <select
        className="network-selector"
        value={state.networkSet}
        onChange={(e) => dispatch({ type: 'SET_NETWORK_SET', payload: e.target.value })}
      >
        {networkTypeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="palette">
        {items.map((type) => (
          <div
            key={type}
            className="palette-item"
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
          >
            {type}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
