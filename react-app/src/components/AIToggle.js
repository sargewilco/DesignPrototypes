import React from 'react';

// Master switch for AI Assist / Advanced Mode. When off, the app is fully
// usable with no LLM dependency; when on, the AI Assist panel appears.
const AIToggle = ({ enabled, onToggle }) => (
  <div className="ai-toggle">
    <span className="ai-toggle-label">AI Assist</span>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={`switch ${enabled ? 'on' : ''}`}
      onClick={onToggle}
      title={enabled ? 'Turn AI Assist off' : 'Turn AI Assist on'}
    >
      <span className="switch-knob" />
    </button>
  </div>
);

export default AIToggle;
