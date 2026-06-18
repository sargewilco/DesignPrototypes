import { GRID_SIZE } from '../constants';

export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Decide black/white text for readability against a background hex colour.
export function getContrastYIQ(hexcolor) {
  if (!hexcolor) return 'black';
  if (hexcolor.charAt(0) === '#') hexcolor = hexcolor.slice(1);
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map((h) => h + h).join('');
  }
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

export function rgbToHex(rgb) {
  if (!rgb) return '#ffffff';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#ffffff';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function nodeCenter(node) {
  return {
    x: node.x + (node.width || 0) / 2,
    y: node.y + (node.height || 0) / 2,
  };
}

function getNormal(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { nx: 0, ny: 0 };
  return { nx: -dy / len, ny: dx / len };
}

// Build SVG path data for a connection given an ordered list of points.
// Returns the single/centre path, the two offset paths (for bidirectional),
// and the geometric midpoint used to place the label.
export function buildGeometry(points, flow) {
  let center = '';
  points.forEach((p, i) => {
    center += (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y} `;
  });
  if (center === '') center = 'M 0 0 L 0 0';

  let d1 = center;
  let d2 = null;

  if (flow === 'bidirectional' && points.length >= 2) {
    const offset = 5;
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < points.length; i++) {
      let nx = 0;
      let ny = 0;
      if (i === 0) {
        const n = getNormal(points[0], points[1]);
        nx = n.nx; ny = n.ny;
      } else if (i === points.length - 1) {
        const n = getNormal(points[i - 1], points[i]);
        nx = n.nx; ny = n.ny;
      } else {
        const n1 = getNormal(points[i - 1], points[i]);
        const n2 = getNormal(points[i], points[i + 1]);
        const ax = n1.nx + n2.nx;
        const ay = n1.ny + n2.ny;
        const len = Math.sqrt(ax * ax + ay * ay);
        if (len !== 0) {
          nx = ax / len;
          ny = ay / len;
          const dot = n1.nx * nx + n1.ny * ny;
          if (dot > 0.1) {
            nx /= dot;
            ny /= dot;
          }
        } else {
          nx = n1.nx; ny = n1.ny;
        }
      }
      const ax = points[i].x + nx * offset;
      const ay = points[i].y + ny * offset;
      const bx = points[i].x - nx * offset;
      const by = points[i].y - ny * offset;
      p1 += (i === 0 ? 'M' : 'L') + ` ${ax} ${ay} `;
      p2 += (i === 0 ? 'M' : 'L') + ` ${bx} ${by} `;
    }
    d1 = p1;
    d2 = p2;
  }

  // Midpoint along the polyline for the label.
  let total = 0;
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segs.push({ p1: points[i], p2: points[i + 1], len });
    total += len;
  }
  let target = total / 2;
  let cur = 0;
  let mid = { x: points[0].x, y: points[0].y };
  for (const s of segs) {
    if (cur + s.len >= target) {
      const r = s.len ? (target - cur) / s.len : 0;
      mid = {
        x: s.p1.x + (s.p2.x - s.p1.x) * r,
        y: s.p1.y + (s.p2.y - s.p1.y) * r,
      };
      break;
    }
    cur += s.len;
  }

  return { d1, d2, hit: center, mid };
}

// Ordered point list for a connection: source centre, waypoints, target centre.
export function connectionPoints(conn, nodes) {
  const source = nodes[conn.sourceId];
  const target = nodes[conn.targetId];
  if (!source || !target) return null;
  return [nodeCenter(source), ...conn.waypoints, nodeCenter(target)];
}
