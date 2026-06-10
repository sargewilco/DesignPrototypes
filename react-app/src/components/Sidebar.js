import React, { useState } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { elementSets, networkTypeOptions } from '../constants';
import { templates, flows } from '../network/topology';

const Sidebar = () => {
  const { state, dispatch } = useDiagram();
  const items = elementSets[state.networkSet] || [];
  const [templateKey, setTemplateKey] = useState(templates[0].key);
  const [flowKey, setFlowKey] = useState(flows[0].key);

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const confirmReplace = () => {
    const hasContent =
      Object.keys(state.nodes).length > 0 || state.connections.length > 0;
    return !hasContent || window.confirm('Replace the current diagram?');
  };

  const loadTemplate = () => {
    const tpl = templates.find((t) => t.key === templateKey);
    if (!tpl || !confirmReplace()) return;
    dispatch({ type: 'LOAD_STATE', payload: tpl.build() });
  };

  const loadFlow = () => {
    const flow = flows.find((f) => f.key === flowKey);
    if (!flow || !confirmReplace()) return;
    dispatch({ type: 'LOAD_STATE', payload: flow.build() });
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

      <label className="template-label">Templates:</label>
      <select
        className="network-selector"
        value={templateKey}
        onChange={(e) => setTemplateKey(e.target.value)}
      >
        {templates.map((t) => (
          <option key={t.key} value={t.key}>
            {t.name}
          </option>
        ))}
      </select>
      <button className="tool-btn" onClick={loadTemplate}>
        Load Template
      </button>

      <label className="template-label">Sample 5G SA flows:</label>
      <select
        className="network-selector"
        value={flowKey}
        onChange={(e) => setFlowKey(e.target.value)}
      >
        {flows.map((f) => (
          <option key={f.key} value={f.key}>
            {f.name}
          </option>
        ))}
      </select>
      <button className="tool-btn" onClick={loadFlow}>
        Load Flow
      </button>
      <div className="template-hint">Then press “Play Sequence” to step through it.</div>
    </div>
  );
};

export default Sidebar;
