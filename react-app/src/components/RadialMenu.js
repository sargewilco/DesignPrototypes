import React from 'react';
import { elementSets } from '../constants';
import { nodeCenter } from '../utils/geometry';

// Quick-spawn ring shown around a single selected node.
const RadialMenu = ({ node, networkSet, scale, panX, panY, onSpawn }) => {
  if (!node) return null;

  const items = elementSets[networkSet] || [];
  if (items.length === 0) return null;

  const center = nodeCenter(node);
  const left = center.x * scale + panX;
  const top = center.y * scale + panY;
  const radius = 60;
  const angleStep = (2 * Math.PI) / items.length;

  return (
    <div className="radial-menu visible" style={{ left, top }}>
      {items.map((type, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={type}
            className="radial-item"
            title={type}
            style={{
              left: `calc(50% + ${x}px - 18px)`,
              top: `calc(50% + ${y}px - 18px)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSpawn(node.id, type, angle);
            }}
          >
            {type.length > 5 ? type.substring(0, 4) + '.' : type}
          </div>
        );
      })}
    </div>
  );
};

export default RadialMenu;
