import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDiagram } from '../context/DiagramContext';
import { useSimulation } from '../context/SimulationContext';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, DEFAULT_LB_ALGORITHM } from '../constants';
import { snapToGrid } from '../utils/geometry';
import { getReferenceLabel, isValidConnection } from '../network/topology';
import Node from './Node';
import Connection from './Connection';
import Minimap from './Minimap';
import RadialMenu from './RadialMenu';

let nodeCounter = 0;
const newNodeId = () => `node_${Date.now()}_${nodeCounter++}`;

const Canvas = ({ playing, onSequenceEnd }) => {
  const { state, dispatch } = useDiagram();
  const simulation = useSimulation();
  const { nodes, connections, selectedNodeIds, selectedConnectionId, scale, panX, panY, networkSet } = state;

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const seqPacketRef = useRef(null);
  const scenarioPacketRef = useRef(null);

  // Latest view transform, for use inside imperative event handlers.
  const viewRef = useRef({ scale, panX, panY });
  viewRef.current = { scale, panX, panY };
  const stateRef = useRef(state);
  stateRef.current = state;

  const [dragging, setDragging] = useState(false);
  const [selBox, setSelBox] = useState(null); // {x, y, w, h} in container coords
  const [labelEditor, setLabelEditor] = useState(null); // {connId, x, y, value}

  const worldFromClient = useCallback((clientX, clientY) => {
    const r = containerRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - r.left - v.panX) / v.scale,
      y: (clientY - r.top - v.panY) / v.scale,
    };
  }, []);

  const createConnection = useCallback((sourceId, targetId) => {
    const s = stateRef.current.nodes[sourceId];
    const t = stateRef.current.nodes[targetId];
    const label = s && t ? getReferenceLabel(s.type, t.type) : '';
    dispatch({
      type: 'ADD_CONNECTION',
      payload: {
        id: `conn_${sourceId}_${targetId}_${Date.now()}`,
        sourceId,
        targetId,
        flow: 'forward',
        status: 'normal',
        label,
        sequence: '',
        waypoints: [],
      },
    });
  }, [dispatch]);

  // --- Drop from palette ---
  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;
    const world = worldFromClient(e.clientX, e.clientY);
    const x = snapToGrid(world.x - DEFAULT_NODE_WIDTH / 2);
    const y = snapToGrid(world.y - DEFAULT_NODE_HEIGHT / 2);
    dispatch({
      type: 'ADD_NODE',
      payload: {
        id: newNodeId(),
        type,
        label: type,
        x,
        y,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        color: '#ffffff',
        algorithm: type === 'Load Balancer' ? DEFAULT_LB_ALGORITHM : undefined,
      },
    });
  };

  // --- Node interactions ---
  const handleNodeMouseDown = (e, id) => {
    e.stopPropagation();
    const sel = stateRef.current.selectedNodeIds;

    if (e.shiftKey) {
      const last = sel[sel.length - 1];
      if (last && last !== id) {
        createConnection(last, id);
        dispatch({ type: 'SET_SELECTED_NODES', payload: [id] });
      } else {
        dispatch({ type: 'SET_SELECTED_NODES', payload: [id] });
      }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      dispatch({ type: 'TOGGLE_SELECTED_NODE', payload: id });
      return;
    }

    let dragIds = sel;
    if (!sel.includes(id)) {
      dragIds = [id];
      dispatch({ type: 'SET_SELECTED_NODES', payload: [id] });
    }

    const startMouse = { x: e.clientX, y: e.clientY };
    const starts = dragIds
      .map((nid) => stateRef.current.nodes[nid])
      .filter(Boolean)
      .map((n) => ({ id: n.id, x: n.x, y: n.y }));
    let committed = false;

    const onMove = (ev) => {
      const v = viewRef.current;
      const dx = (ev.clientX - startMouse.x) / v.scale;
      const dy = (ev.clientY - startMouse.y) / v.scale;
      if (!committed) {
        dispatch({ type: 'COMMIT' });
        committed = true;
        setDragging(true);
      }
      dispatch({
        type: 'MOVE_NODES',
        payload: starts.map((s) => ({
          id: s.id,
          x: snapToGrid(s.x + dx),
          y: snapToGrid(s.y + dy),
        })),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragging(false);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // --- Waypoint dragging ---
  const handleWaypointMouseDown = (e, connId, index) => {
    let committed = false;
    const onMove = (ev) => {
      const world = worldFromClient(ev.clientX, ev.clientY);
      if (!committed) {
        dispatch({ type: 'COMMIT' });
        committed = true;
      }
      dispatch({
        type: 'MOVE_WAYPOINT',
        payload: { connId, index, x: snapToGrid(world.x), y: snapToGrid(world.y) },
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleAddWaypoint = (connId, e) => {
    const world = worldFromClient(e.clientX, e.clientY);
    dispatch({
      type: 'ADD_WAYPOINT',
      payload: { connId, waypoint: { x: snapToGrid(world.x), y: snapToGrid(world.y) } },
    });
  };

  // --- Background: pan or rubber-band select ---
  const handleContainerMouseDown = (e) => {
    if (
      e.target !== containerRef.current &&
      e.target !== canvasRef.current &&
      e.target !== svgRef.current
    ) {
      return;
    }

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      dispatch({ type: 'DESELECT_ALL' });
    }

    const r = containerRef.current.getBoundingClientRect();

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      // Pan
      e.preventDefault();
      const panStart = { x: e.clientX - viewRef.current.panX, y: e.clientY - viewRef.current.panY };
      const onMove = (ev) => {
        dispatch({
          type: 'SET_TRANSFORM',
          payload: { panX: ev.clientX - panStart.x, panY: ev.clientY - panStart.y },
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    } else if (e.button === 0) {
      // Rubber-band selection
      const startClient = { x: e.clientX, y: e.clientY };
      const onMove = (ev) => {
        const left = Math.min(startClient.x, ev.clientX) - r.left;
        const top = Math.min(startClient.y, ev.clientY) - r.top;
        const w = Math.abs(ev.clientX - startClient.x);
        const h = Math.abs(ev.clientY - startClient.y);
        setSelBox({ x: left, y: top, w, h });
      };
      const onUp = (ev) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        setSelBox(null);
        const v = viewRef.current;
        const minX = Math.min(startClient.x, ev.clientX) - r.left;
        const maxX = Math.max(startClient.x, ev.clientX) - r.left;
        const minY = Math.min(startClient.y, ev.clientY) - r.top;
        const maxY = Math.max(startClient.y, ev.clientY) - r.top;
        if (Math.abs(maxX - minX) < 3 && Math.abs(maxY - minY) < 3) return;
        const matched = Object.values(stateRef.current.nodes)
          .filter((n) => {
            const nl = v.panX + n.x * v.scale;
            const nt = v.panY + n.y * v.scale;
            const nr = nl + n.width * v.scale;
            const nb = nt + n.height * v.scale;
            return nl < maxX && nr > minX && nt < maxY && nb > minY;
          })
          .map((n) => n.id);
        if (matched.length) dispatch({ type: 'SET_SELECTED_NODES', payload: matched });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  };

  // --- Wheel zoom (native, non-passive) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const v = viewRef.current;
      const delta = e.deltaY * -0.001;
      let newScale = Math.min(Math.max(0.2, v.scale + delta), 5);
      const r = el.getBoundingClientRect();
      const mouseX = e.clientX - r.left;
      const mouseY = e.clientY - r.top;
      const panX2 = mouseX - (mouseX - v.panX) * (newScale / v.scale);
      const panY2 = mouseY - (mouseY - v.panY) * (newScale / v.scale);
      dispatch({ type: 'SET_TRANSFORM', payload: { scale: newScale, panX: panX2, panY: panY2 } });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [dispatch]);

  // --- Keyboard: delete, undo/redo ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
          return;
        }
        if (e.key === 'y') {
          e.preventDefault();
          dispatch({ type: 'REDO' });
          return;
        }
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const s = stateRef.current;
        if (s.selectedNodeIds.length > 0) {
          dispatch({ type: 'DELETE_NODES', payload: s.selectedNodeIds });
        } else if (s.selectedConnectionId) {
          dispatch({ type: 'DELETE_CONNECTION', payload: s.selectedConnectionId });
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch]);

  // --- Radial menu quick-spawn ---
  const handleSpawn = (sourceId, type, angle) => {
    const source = stateRef.current.nodes[sourceId];
    if (!source) return;
    const dist = 120;
    const x = snapToGrid(source.x + Math.cos(angle) * dist);
    const y = snapToGrid(source.y + Math.sin(angle) * dist);
    const id = newNodeId();
    dispatch({
      type: 'ADD_NODE',
      payload: {
        id,
        type,
        label: type,
        x,
        y,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        color: '#ffffff',
        algorithm: type === 'Load Balancer' ? DEFAULT_LB_ALGORITHM : undefined,
      },
    });
    createConnection(sourceId, id);
    dispatch({ type: 'SET_SELECTED_NODES', payload: [id] });
  };

  // --- Label inline editor ---
  const commitLabel = () => {
    if (!labelEditor) return;
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: { id: labelEditor.connId, changes: { label: labelEditor.value } },
    });
    setLabelEditor(null);
  };

  // --- Sequence playback ---
  useEffect(() => {
    if (!playing) return undefined;
    const conns = stateRef.current.connections;
    const steps = [];
    conns.forEach((conn) => {
      if (conn.sequence) {
        conn.sequence.split(',').map((s) => s.trim()).forEach((s) => {
          const num = parseInt(s, 10);
          if (!isNaN(num)) steps.push({ number: num, conn });
        });
      }
    });
    if (steps.length === 0) {
      alert("No sequences defined. Enter 'Sequence Order' in connection properties (e.g. 1 or 1,2).");
      onSequenceEnd();
      return undefined;
    }
    steps.sort((a, b) => a.number - b.number);

    let cancelled = false;
    let raf = null;
    let idx = 0;
    let prevNodeId = null;
    let pos = 0;
    let dir = 1;
    let activeConn = null;
    const packet = seqPacketRef.current;

    const clearHighlights = () => {
      if (!containerRef.current) return;
      containerRef.current
        .querySelectorAll('.sequence-active')
        .forEach((el) => el.classList.remove('sequence-active'));
    };

    const animate = () => {
      if (cancelled) return;
      const path = containerRef.current.querySelector(`[data-conn-id="${activeConn.id}"] .connection`);
      if (path) {
        const len = path.getTotalLength();
        if (len > 0) {
          pos += dir * 0.01;
          if (pos > 1) pos = 1;
          if (pos < 0) pos = 0;
          const pt = path.getPointAtLength(pos * len);
          if (packet) {
            packet.setAttribute('cx', pt.x);
            packet.setAttribute('cy', pt.y);
            packet.style.display = '';
          }
          const done = dir > 0 ? pos >= 1 : pos <= 0;
          if (done) {
            idx += 1;
            setTimeout(startStep, 400);
            return;
          }
        }
      }
      raf = requestAnimationFrame(animate);
    };

    function startStep() {
      if (cancelled) return;
      clearHighlights();
      if (idx >= steps.length) {
        setTimeout(() => {
          if (!cancelled) {
            alert('Sequence Complete');
            onSequenceEnd();
          }
        }, 400);
        return;
      }
      const step = steps[idx];
      activeConn = step.conn;
      const grp = containerRef.current.querySelector(`[data-conn-id="${activeConn.id}"]`);
      if (grp) {
        grp.querySelectorAll('.connection, .connection-label').forEach((el) =>
          el.classList.add('sequence-active')
        );
      }
      if (prevNodeId === activeConn.targetId) {
        dir = -1;
        pos = 1;
        prevNodeId = activeConn.sourceId;
      } else {
        dir = 1;
        pos = 0;
        prevNodeId = activeConn.targetId;
      }
      animate();
    }

    if (packet) {
      packet.style.display = '';
      packet.classList.add('sequence-packet');
    }
    startStep();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      clearHighlights();
      if (packet) packet.style.display = 'none';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // --- Scenario step animation (explicit from/to, correct direction) ---
  const { scenario, stepIndex } = simulation;
  useEffect(() => {
    const packet = scenarioPacketRef.current;
    const clearHighlights = () => {
      if (containerRef.current) {
        containerRef.current
          .querySelectorAll('.sequence-active')
          .forEach((el) => el.classList.remove('sequence-active'));
      }
    };
    clearHighlights();
    if (packet) packet.style.display = 'none';

    if (!scenario || stepIndex < 0 || stepIndex >= scenario.steps.length) {
      return undefined;
    }
    const step = scenario.steps[stepIndex];
    const conn = stateRef.current.connections.find(
      (c) =>
        (c.sourceId === step.from && c.targetId === step.to) ||
        (c.sourceId === step.to && c.targetId === step.from)
    );
    if (!conn) return undefined;

    const grp = containerRef.current.querySelector(`[data-conn-id="${conn.id}"]`);
    const path = grp ? grp.querySelector('.connection') : null;
    if (grp) {
      grp
        .querySelectorAll('.connection, .connection-label')
        .forEach((el) => el.classList.add('sequence-active'));
    }

    const forward = conn.sourceId === step.from; // animate 0->1 if 'from' is the source
    const duration = 1000;
    let raf;
    let start;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const pos = forward ? p : 1 - p;
      if (path && packet) {
        const len = path.getTotalLength();
        if (len > 0) {
          const pt = path.getPointAtLength(pos * len);
          packet.setAttribute('cx', pt.x);
          packet.setAttribute('cy', pt.y);
          packet.style.display = '';
        }
      }
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      clearHighlights();
    };
  }, [scenario, stepIndex]);

  const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  const showRadial = selectedNodeIds.length === 1 && !dragging && !playing && !simulation.scenarioActive;
  const radialNode = showRadial ? nodes[selectedNodeIds[0]] : null;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleContainerMouseDown}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
      style={{
        backgroundPosition: `${panX}px ${panY}px`,
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
      }}
    >
      <svg ref={svgRef} className="connection-layer" style={{ transform }}>
        {connections.map((conn) => {
          const s = nodes[conn.sourceId];
          const t = nodes[conn.targetId];
          const invalid = s && t ? !isValidConnection(s.type, t.type) : false;
          return (
          <Connection
            key={conn.id}
            conn={conn}
            nodes={nodes}
            invalid={invalid}
            selected={conn.id === selectedConnectionId}
            paused={playing || simulation.scenarioActive}
            onSelect={(id) => dispatch({ type: 'SELECT_CONNECTION', payload: id })}
            onAddWaypoint={handleAddWaypoint}
            onWaypointMouseDown={handleWaypointMouseDown}
            onDelete={(id) => dispatch({ type: 'DELETE_CONNECTION', payload: id })}
            onEditLabel={(c, mid) =>
              setLabelEditor({ connId: c.id, x: mid.x, y: mid.y, value: c.label || '' })
            }
          />
          );
        })}
        <circle ref={seqPacketRef} className="packet" r={8} style={{ display: 'none' }} />
        <circle
          ref={scenarioPacketRef}
          className="packet sequence-packet"
          r={9}
          style={{ display: 'none' }}
        />
      </svg>

      <div ref={canvasRef} className="canvas" style={{ transform }}>
        {Object.values(nodes).map((node) => (
          <Node
            key={node.id}
            node={node}
            scale={scale}
            selected={selectedNodeIds.includes(node.id)}
            onMouseDown={handleNodeMouseDown}
          />
        ))}
        {labelEditor && (
          <input
            className="inline-editor"
            autoFocus
            style={{ left: labelEditor.x, top: labelEditor.y }}
            value={labelEditor.value}
            onChange={(e) => setLabelEditor({ ...labelEditor, value: e.target.value })}
            onBlur={commitLabel}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitLabel();
              }
            }}
          />
        )}
      </div>

      {selBox && (
        <div
          className="selection-box"
          style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}
        />
      )}

      {radialNode && (
        <RadialMenu
          node={radialNode}
          networkSet={networkSet}
          scale={scale}
          panX={panX}
          panY={panY}
          onSpawn={handleSpawn}
        />
      )}

      <Minimap containerRef={containerRef} />

      <div className="instructions">
        Drag elements from the left.<br />
        Hold <b>Shift</b> and click two nodes to connect them.<br />
        Double-click a node to rename it.<br />
        Click a line to edit it; double-click to label; right-click to remove.<br />
        <b>Alt-click</b> a line to add a waypoint, then drag it.<br />
        Scroll to zoom. Drag the background to multi-select.<br />
        <b>Middle-click</b> (or Shift+drag) the background to pan.
      </div>
    </div>
  );
};

export default Canvas;
