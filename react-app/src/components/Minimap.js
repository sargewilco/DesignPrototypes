import React, { useRef, useEffect, useState } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { nodeCenter } from '../utils/geometry';

const MAP_W = 200;
const MAP_H = 150;

const Minimap = ({ containerRef }) => {
  const { state, dispatch } = useDiagram();
  const { nodes, connections, scale, panX, panY } = state;
  const canvasRef = useRef(null);
  const transformRef = useRef({ minimapScale: 1, offsetX: 0, offsetY: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    const allNodes = Object.values(nodes);
    if (allNodes.length === 0 && connections.length === 0) return;

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
    connections.forEach((c) =>
      c.waypoints.forEach((wp) => {
        minX = Math.min(minX, wp.x);
        minY = Math.min(minY, wp.y);
        maxX = Math.max(maxX, wp.x);
        maxY = Math.max(maxY, wp.y);
      })
    );

    const container = containerRef.current;
    const cw = container ? container.clientWidth : 800;
    const ch = container ? container.clientHeight : 600;
    const viewX = -panX / scale;
    const viewY = -panY / scale;
    const viewW = cw / scale;
    const viewH = ch / scale;
    minX = Math.min(minX, viewX);
    minY = Math.min(minY, viewY);
    maxX = Math.max(maxX, viewX + viewW);
    maxY = Math.max(maxY, viewY + viewH);

    const padding = 50;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const mScale = Math.min(MAP_W / mapW, MAP_H / mapH);
    const offsetX = (MAP_W - mapW * mScale) / 2 - minX * mScale;
    const offsetY = (MAP_H - mapH * mScale) / 2 - minY * mScale;
    transformRef.current = { minimapScale: mScale, offsetX, offsetY };

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';
    connections.forEach((conn) => {
      const source = nodes[conn.sourceId];
      const target = nodes[conn.targetId];
      if (!source || !target) return;
      const sc = nodeCenter(source);
      const tc = nodeCenter(target);
      ctx.beginPath();
      ctx.moveTo(sc.x * mScale + offsetX, sc.y * mScale + offsetY);
      conn.waypoints.forEach((wp) =>
        ctx.lineTo(wp.x * mScale + offsetX, wp.y * mScale + offsetY)
      );
      ctx.lineTo(tc.x * mScale + offsetX, tc.y * mScale + offsetY);
      ctx.stroke();
    });

    allNodes.forEach((n) => {
      ctx.fillStyle = n.color || '#ffffff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const x = n.x * mScale + offsetX;
      const y = n.y * mScale + offsetY;
      const w = n.width * mScale;
      const h = n.height * mScale;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });
  }, [nodes, connections, scale, panX, panY, containerRef]);

  const panToEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { minimapScale, offsetX, offsetY } = transformRef.current;
    const worldX = (mx - offsetX) / minimapScale;
    const worldY = (my - offsetY) / minimapScale;
    const container = containerRef.current;
    const cw = container ? container.clientWidth : 800;
    const ch = container ? container.clientHeight : 600;
    dispatch({
      type: 'SET_TRANSFORM',
      payload: {
        panX: -(worldX * scale) + cw / 2,
        panY: -(worldY * scale) + ch / 2,
      },
    });
  };

  // Viewport overlay rectangle.
  const { minimapScale, offsetX, offsetY } = transformRef.current;
  const container = containerRef.current;
  const cw = container ? container.clientWidth : 800;
  const ch = container ? container.clientHeight : 600;
  const viewX = -panX / scale;
  const viewY = -panY / scale;
  const vpStyle = {
    left: viewX * minimapScale + offsetX,
    top: viewY * minimapScale + offsetY,
    width: (cw / scale) * minimapScale,
    height: (ch / scale) * minimapScale,
  };

  return (
    <div
      className="minimap-container"
      onMouseDown={(e) => {
        setDragging(true);
        panToEvent(e);
      }}
      onMouseMove={(e) => dragging && panToEvent(e)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
    >
      <canvas ref={canvasRef} width={MAP_W} height={MAP_H} className="minimap-canvas" />
      <div className="minimap-viewport" style={vpStyle} />
    </div>
  );
};

export default Minimap;
