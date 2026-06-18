import React, { useRef, useEffect } from 'react';
import { buildGeometry, connectionPoints } from '../utils/geometry';

const Connection = ({
  conn,
  nodes,
  invalid,
  selected,
  paused,
  onSelect,
  onAddWaypoint,
  onWaypointMouseDown,
  onDelete,
  onEditLabel,
}) => {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const fwdRef = useRef(null);
  const revRef = useRef(null);

  const points = connectionPoints(conn, nodes);

  // Animate packets along the rendered paths. Restart only when the packet
  // configuration changes — geometry updates flow through the DOM paths.
  useEffect(() => {
    const fwd = fwdRef.current;
    const rev = revRef.current;
    if (fwd) fwd.style.display = 'none';
    if (rev) rev.style.display = 'none';

    if (paused || conn.status === 'down') {
      return undefined;
    }

    const speed = conn.status === 'congested' ? 0.002 : 0.005;
    const packets = [];

    if (conn.flow === 'forward' || conn.flow === 'bidirectional') {
      packets.push({ circle: fwd, getPath: () => line1Ref.current, position: 0, dir: 1 });
    } else if (conn.flow === 'reverse') {
      packets.push({ circle: fwd, getPath: () => line1Ref.current, position: 1, dir: -1 });
    }
    if (conn.flow === 'bidirectional') {
      packets.push({ circle: rev, getPath: () => line2Ref.current, position: 1, dir: -1 });
    }

    packets.forEach((p) => {
      if (p.circle) p.circle.style.display = '';
    });

    let raf;
    const tick = () => {
      packets.forEach((p) => {
        const path = p.getPath();
        if (!p.circle || !path) return;
        const len = path.getTotalLength();
        if (len > 0) {
          p.position += p.dir * speed;
          if (p.position > 1) p.position = 0;
          if (p.position < 0) p.position = 1;
          const pt = path.getPointAtLength(p.position * len);
          p.circle.setAttribute('cx', pt.x);
          p.circle.setAttribute('cy', pt.y);
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [conn.flow, conn.status, paused]);

  if (!points) return null;

  const { d1, d2, hit, mid } = buildGeometry(points, conn.flow);
  const isBidi = conn.flow === 'bidirectional';
  const strokeStyle = selected ? { stroke: '#007bff' } : undefined;

  const handleClick = (e) => {
    e.stopPropagation();
    if (e.altKey) {
      onAddWaypoint(conn.id, e);
    } else {
      onSelect(conn.id);
    }
  };

  return (
    <g
      className="connection-group"
      data-conn-id={conn.id}
      data-status={conn.status}
      onClick={handleClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditLabel(conn, mid);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(conn.id);
      }}
    >
      {invalid && <title>Invalid link: no reference point between these node types</title>}
      <path className="connection-hitarea" d={hit} />
      <path
        ref={line1Ref}
        className={`connection ${selected ? 'sel' : ''} ${invalid ? 'invalid' : ''}`}
        d={d1}
        style={strokeStyle}
      />
      {isBidi && (
        <path
          ref={line2Ref}
          className={`connection ${selected ? 'sel' : ''} ${invalid ? 'invalid' : ''}`}
          d={d2}
          style={strokeStyle}
        />
      )}
      {conn.label && (
        <text className="connection-label" x={mid.x} y={mid.y}>
          {conn.label}
        </text>
      )}
      {conn.waypoints.map((wp, i) => (
        <circle
          key={i}
          className="waypoint"
          cx={wp.x}
          cy={wp.y}
          r={5}
          onMouseDown={(e) => {
            e.stopPropagation();
            onWaypointMouseDown(e, conn.id, i);
          }}
        />
      ))}
      <circle ref={fwdRef} className="packet" r={4} style={{ display: 'none' }} />
      <circle ref={revRef} className="packet" r={4} style={{ display: 'none' }} />
    </g>
  );
};

export default Connection;
