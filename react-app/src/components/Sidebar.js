import React from 'react';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <h2>Elements</h2>
      <select>
        <option>Standard</option>
      </select>
      <div className="palette">
        <div className="palette-item">Router</div>
        <div className="palette-item">Switch</div>
        <div className="palette-item">Server</div>
        <div className="palette-item">Client</div>
      </div>
    </div>
  );
};

export default Sidebar;
