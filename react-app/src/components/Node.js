import React, { useRef, useState, useLayoutEffect } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { getContrastYIQ } from '../utils/geometry';

const Node = ({ node, scale, selected, onMouseDown }) => {
  const { dispatch } = useDiagram();
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.label);

  // Measure rendered size (unscaled) so connection geometry stays accurate.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width / scale;
    const height = rect.height / scale;
    if (Math.abs(width - node.width) > 0.5 || Math.abs(height - node.height) > 0.5) {
      dispatch({ type: 'SET_NODE_SIZE', payload: { id: node.id, width, height } });
    }
  }, [node.label, node.id, node.width, node.height, node.algorithm, scale, dispatch]);

  const startEditing = (e) => {
    e.stopPropagation();
    setDraft(node.label);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== node.label) {
      dispatch({ type: 'UPDATE_NODE', payload: { id: node.id, changes: { label: draft } } });
      dispatch({ type: 'COMMIT' });
    }
  };

  return (
    <div
      ref={ref}
      className={`node ${selected ? 'selected' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        backgroundColor: node.color || '#ffffff',
        color: getContrastYIQ(node.color || '#ffffff'),
      }}
      onMouseDown={(e) => {
        if (editing) return;
        onMouseDown(e, node.id);
      }}
      onDoubleClick={startEditing}
    >
      {editing ? (
        <input
          autoFocus
          className="node-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <span>{node.label}</span>
      )}
      {node.type === 'Load Balancer' && (
        <div className="node-sublabel">{node.algorithm || 'Round Robin'}</div>
      )}
    </div>
  );
};

export default Node;
