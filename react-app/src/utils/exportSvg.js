import { getContrastYIQ, buildGeometry, connectionPoints, nodeCenter } from './geometry';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Produce a standalone SVG string of the whole diagram, derived from state.
export function generateSVGString(nodes, connections) {
  const allNodes = Object.values(nodes);
  if (allNodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  allNodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  connections.forEach((c) => {
    c.waypoints.forEach((wp) => {
      minX = Math.min(minX, wp.x);
      minY = Math.min(minY, wp.y);
      maxX = Math.max(maxX, wp.x);
      maxY = Math.max(maxY, wp.y);
    });
  });

  minX -= 50; minY -= 50; maxX += 50; maxY += 50;
  const width = maxX - minX;
  const height = maxY - minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">`;
  svg += `<style>
    .connection { fill: none; stroke: #555; stroke-width: 3; stroke-linecap: round; }
    .node-bg { stroke: #333; stroke-width: 2; rx: 8; ry: 8; }
    .node-text { font-family: sans-serif; font-size: 16px; text-anchor: middle; dominant-baseline: middle; }
    .node-subtext { font-family: sans-serif; font-size: 11px; text-anchor: middle; dominant-baseline: middle; opacity: 0.7; }
    .connection-label { font-family: sans-serif; font-size: 14px; font-weight: bold; fill: #333; text-anchor: middle; dominant-baseline: middle; paint-order: stroke; stroke: white; stroke-width: 4px; }
  </style>`;

  svg += '<g id="connections">';
  connections.forEach((c) => {
    const points = connectionPoints(c, nodes);
    if (!points) return;
    const { d1, d2, mid } = buildGeometry(points, c.flow);
    svg += `<path class="connection" d="${d1}" />`;
    if (d2) svg += `<path class="connection" d="${d2}" />`;
    if (c.label) {
      svg += `<text class="connection-label" x="${mid.x}" y="${mid.y}">${escapeXml(c.label)}</text>`;
    }
  });
  svg += '</g>';

  svg += '<g id="nodes">';
  allNodes.forEach((n) => {
    const fg = getContrastYIQ(n.color);
    const c = nodeCenter(n);
    const isLB = n.type === 'Load Balancer' && n.algorithm;
    const labelY = isLB ? c.y - 7 : c.y;
    svg += `<rect class="node-bg" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${n.color || '#ffffff'}" />`;
    svg += `<text class="node-text" x="${c.x}" y="${labelY}" fill="${fg}">${escapeXml(n.label)}</text>`;
    if (isLB) {
      svg += `<text class="node-subtext" x="${c.x}" y="${c.y + 9}" fill="${fg}">${escapeXml(n.algorithm)}</text>`;
    }
  });
  svg += '</g></svg>';

  return svg;
}

export function downloadSVG(nodes, connections) {
  const svg = generateSVGString(nodes, connections);
  if (!svg) {
    alert('Canvas is empty');
    return;
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram.svg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadPNG(nodes, connections) {
  const svg = generateSVGString(nodes, connections);
  if (!svg) {
    alert('Canvas is empty');
    return;
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onerror = () => alert('Failed to export PNG. See console.');
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'diagram.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(pngUrl);
    });
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function downloadJSON(stateSnapshot) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stateSnapshot, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', 'diagram.json');
  document.body.appendChild(a);
  a.click();
  a.remove();
}
