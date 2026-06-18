import React, { useState } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { useSimulation } from '../context/SimulationContext';

const TracePanel = () => {
  const { state } = useDiagram();
  const { startTrace, traceError, scenario, stepIndex, goTo } = useSimulation();
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [sourceKey, setSourceKey] = useState('');

  const nodeList = Object.values(state.nodes);
  const labelOf = (id) => (state.nodes[id] ? state.nodes[id].label : id);

  const trace = () => startTrace(sourceId, targetId, sourceKey.trim());

  const activeTrace = scenario && scenario.isTrace ? scenario : null;

  return (
    <div className="sidebar-section">
      <h2>Packet Trace</h2>

      {nodeList.length < 2 ? (
        <div className="trace-hint">Add at least two connected nodes to trace a packet.</div>
      ) : (
        <>
          <label className="template-label">Source:</label>
          <select
            className="network-selector"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">Select…</option>
            {nodeList.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>

          <label className="template-label">Destination:</label>
          <select
            className="network-selector"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Select…</option>
            {nodeList.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>

          <label className="template-label">Source IP / client id (for IP Hash):</label>
          <input
            className="status-select"
            placeholder={sourceId ? labelOf(sourceId) : 'optional'}
            value={sourceKey}
            onChange={(e) => setSourceKey(e.target.value)}
          />

          <button
            className="tool-btn ai-generate"
            style={{ marginTop: 8 }}
            onClick={trace}
            disabled={!sourceId || !targetId}
          >
            Trace Packet
          </button>

          {traceError && <div className="ai-status ai-status-error">{traceError}</div>}

          {activeTrace && (
            <div className="trace-log">
              {activeTrace.steps.map((s, i) => (
                <div
                  key={i}
                  className={`trace-log-step ${i === stepIndex ? 'active' : ''}`}
                  onClick={() => goTo(i)}
                  title="Jump to this hop"
                >
                  <span className="trace-log-num">{i + 1}</span>
                  <span className="trace-log-hop">
                    {labelOf(s.from)} → {labelOf(s.to)}
                  </span>
                  <span className="trace-log-msg">{s.message}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TracePanel;
