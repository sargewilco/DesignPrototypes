import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { useDiagram } from '../context/DiagramContext';

const COL_W = 160;
const LEFT_PAD = 40;
const HEADER_Y = 22;
const LIFELINE_TOP = 44;
const FIRST_ROW_Y = 84;
const ROW_H = 48;

const SequenceDiagram = () => {
  const { scenario, stepIndex, ladderOpen, goTo, setLadderOpen } = useSimulation();
  const { state } = useDiagram();

  if (!scenario || !ladderOpen) return null;

  const steps = scenario.steps;

  // Participants ordered by first appearance across the steps.
  const order = [];
  steps.forEach((s) => {
    if (!order.includes(s.from)) order.push(s.from);
    if (!order.includes(s.to)) order.push(s.to);
  });
  const indexOf = {};
  order.forEach((id, i) => {
    indexOf[id] = i;
  });
  const labelOf = (id) => (state.nodes[id] && state.nodes[id].label) || id;
  const px = (i) => LEFT_PAD + COL_W / 2 + i * COL_W;

  const width = LEFT_PAD * 2 + order.length * COL_W;
  const height = FIRST_ROW_Y + steps.length * ROW_H + 24;
  const lifelineBottom = height - 16;

  return (
    <div className="ladder-overlay" onMouseDown={() => setLadderOpen(false)}>
      <div className="ladder-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ladder-header">
          <span>{scenario.name} — sequence diagram</span>
          <button className="ladder-close" onClick={() => setLadderOpen(false)}>
            ✕
          </button>
        </div>
        <div className="ladder-scroll">
          <svg width={width} height={height} className="ladder-svg">
            <defs>
              <marker
                id="ladder-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#555" />
              </marker>
              <marker
                id="ladder-arrow-active"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#007bff" />
              </marker>
            </defs>

            {/* Participant headers + lifelines */}
            {order.map((id, i) => (
              <g key={id}>
                <rect
                  x={px(i) - COL_W / 2 + 12}
                  y={HEADER_Y - 14}
                  width={COL_W - 24}
                  height={28}
                  rx={6}
                  className="ladder-participant"
                />
                <text x={px(i)} y={HEADER_Y + 1} className="ladder-participant-label">
                  {labelOf(id)}
                </text>
                <line
                  x1={px(i)}
                  y1={LIFELINE_TOP}
                  x2={px(i)}
                  y2={lifelineBottom}
                  className="ladder-lifeline"
                />
              </g>
            ))}

            {/* Step messages */}
            {steps.map((s, idx) => {
              const y = FIRST_ROW_Y + idx * ROW_H;
              const x1 = px(indexOf[s.from]);
              const x2 = px(indexOf[s.to]);
              const active = idx === stepIndex;
              const dir = x2 >= x1 ? 1 : -1;
              return (
                <g
                  key={idx}
                  className={`ladder-step ${active ? 'active' : ''}`}
                  onClick={() => goTo(idx)}
                >
                  <rect x={0} y={y - ROW_H / 2} width={width} height={ROW_H} className="ladder-rowhit" />
                  {active && (
                    <rect x={6} y={y - ROW_H / 2 + 4} width={width - 12} height={ROW_H - 8} rx={6} className="ladder-rowbg" />
                  )}
                  <text x={16} y={y + 4} className="ladder-num">
                    {idx + 1}
                  </text>
                  <line
                    x1={x1 + 4 * dir}
                    y1={y}
                    x2={x2 - 9 * dir}
                    y2={y}
                    className={`ladder-msg-line ${active ? 'active' : ''}`}
                    markerEnd={active ? 'url(#ladder-arrow-active)' : 'url(#ladder-arrow)'}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 8}
                    className={`ladder-msg-label ${active ? 'active' : ''}`}
                  >
                    {s.message}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="ladder-hint">Click a message to jump to that step.</div>
      </div>
    </div>
  );
};

export default SequenceDiagram;
