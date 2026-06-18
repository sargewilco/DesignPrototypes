import React from 'react';
import { useDiagram } from '../context/DiagramContext';
import { isValidConnection } from '../network/topology';

const ValidationPanel = () => {
  const { state, dispatch } = useDiagram();
  const { connections, nodes } = state;

  const issues = connections.filter((c) => {
    const s = nodes[c.sourceId];
    const t = nodes[c.targetId];
    return s && t && !isValidConnection(s.type, t.type);
  });

  return (
    <div className="sidebar-section">
      <h2>Validation</h2>
      {issues.length === 0 ? (
        <div className="validation-ok">✓ All links valid</div>
      ) : (
        <>
          <div className="validation-warn">
            ⚠ {issues.length} invalid link{issues.length > 1 ? 's' : ''}
          </div>
          <ul className="validation-list">
            {issues.map((c) => {
              const s = nodes[c.sourceId];
              const t = nodes[c.targetId];
              return (
                <li
                  key={c.id}
                  onClick={() => dispatch({ type: 'SELECT_CONNECTION', payload: c.id })}
                  title="Select this connection"
                >
                  {s.type} — {t.type}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default ValidationPanel;
