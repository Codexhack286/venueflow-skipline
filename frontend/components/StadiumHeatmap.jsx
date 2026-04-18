"use client";

import { useState } from "react";

/**
 * SVG Stadium Heatmap — renders an oval stadium with 12 zones.
 * Zones are color-coded by density, with wait time badges and anomaly markers.
 */

// Density → color mapping
function densityColor(d) {
  if (d < 0.4) return "#22C55E";   // green
  if (d < 0.6) return "#84CC16";   // lime
  if (d < 0.7) return "#EAB308";   // yellow
  if (d < 0.85) return "#F97316";  // orange
  return "#EF4444";                 // red
}

function densityBg(d) {
  if (d < 0.4) return "rgba(34,197,94,0.15)";
  if (d < 0.7) return "rgba(234,179,8,0.15)";
  if (d < 0.85) return "rgba(249,115,22,0.15)";
  return "rgba(239,68,68,0.15)";
}

// Zone shape configs for SVG placement
const ZONE_SHAPES = {
  // Gates — small rectangles at cardinal points
  gate_a:   { x: 370, y: 28,  w: 80, h: 32, rx: 6 },
  gate_b:   { x: 718, y: 235, w: 32, h: 80, rx: 6 },
  gate_c:   { x: 370, y: 490, w: 80, h: 32, rx: 6 },
  gate_d:   { x: 68,  y: 235, w: 32, h: 80, rx: 6 },
  // Concessions — rounded rects inside perimeter
  concession_1: { x: 540, y: 100, w: 90, h: 45, rx: 10 },
  concession_2: { x: 540, y: 405, w: 90, h: 45, rx: 10 },
  concession_3: { x: 188, y: 405, w: 90, h: 45, rx: 10 },
  concession_4: { x: 188, y: 100, w: 90, h: 45, rx: 10 },
  // Seating sections — larger areas
  section_north: { x: 250, y: 80,  w: 320, h: 65, rx: 14 },
  section_east:  { x: 640, y: 180, w: 65,  h: 190, rx: 14 },
  section_south: { x: 250, y: 405, w: 320, h: 65, rx: 14 },
  section_west:  { x: 112, y: 180, w: 65,  h: 190, rx: 14 },
};

const ZONE_LABELS = {
  gate_a: "Gate A", gate_b: "Gate B", gate_c: "Gate C", gate_d: "Gate D",
  concession_1: "Food NE", concession_2: "Food SE",
  concession_3: "Food SW", concession_4: "Food NW",
  section_north: "North", section_east: "East",
  section_south: "South", section_west: "West",
};

export default function StadiumHeatmap({
  zones = [],
  densities = {},
  surges = [],
  waitTimes = [],
  anomalies = [],
}) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const surgeZoneIds = new Set(surges.map((s) => s.zone_id));
  const anomalyMap = {};
  anomalies.forEach((a) => { anomalyMap[a.zone_id] = a; });
  const waitTimeMap = {};
  waitTimes.forEach((w) => { waitTimeMap[w.zone_id] = w; });

  const handleMouseEnter = (zoneId, e) => {
    setHoveredZone(zoneId);
    const rect = e.currentTarget.closest("svg").getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
  };

  const hoveredData = hoveredZone
    ? {
        density: densities[hoveredZone] || 0,
        label: ZONE_LABELS[hoveredZone] || hoveredZone,
        wait: waitTimeMap[hoveredZone],
        anomaly: anomalyMap[hoveredZone],
        surge: surges.find((s) => s.zone_id === hoveredZone),
      }
    : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 820 550"
        className="w-full h-auto"
        style={{ maxHeight: "520px" }}
      >
        {/* Stadium outline — outer oval */}
        <ellipse
          cx="410" cy="275" rx="370" ry="245"
          fill="rgba(15, 23, 42, 0.8)"
          stroke="rgba(148,163,184,0.3)"
          strokeWidth="2"
        />
        {/* Inner field */}
        <ellipse
          cx="410" cy="275" rx="200" ry="130"
          fill="rgba(34,197,94,0.08)"
          stroke="rgba(34,197,94,0.2)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
        {/* Field label */}
        <text x="410" y="270" textAnchor="middle" fill="rgba(148,163,184,0.4)" fontSize="14" fontWeight="300">
          PLAYING FIELD
        </text>
        <text x="410" y="290" textAnchor="middle" fill="rgba(148,163,184,0.25)" fontSize="11">
          ⚽
        </text>

        {/* Zone shapes */}
        {Object.entries(ZONE_SHAPES).map(([zoneId, shape]) => {
          const density = densities[zoneId] || 0;
          const color = densityColor(density);
          const isSurging = surgeZoneIds.has(zoneId);
          const isAnomaly = !!anomalyMap[zoneId];
          const wait = waitTimeMap[zoneId];

          return (
            <g key={zoneId}>
              {/* Zone rectangle */}
              <rect
                x={shape.x} y={shape.y}
                width={shape.w} height={shape.h}
                rx={shape.rx}
                fill={color + "30"}
                stroke={color}
                strokeWidth={hoveredZone === zoneId ? 2.5 : 1.5}
                className={`zone-shape ${isSurging ? "animate-pulse-glow" : ""}`}
                onMouseEnter={(e) => handleMouseEnter(zoneId, e)}
                onMouseLeave={() => setHoveredZone(null)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.closest("svg").getBoundingClientRect();
                  setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
                }}
              />
              {/* Zone label */}
              <text
                x={shape.x + shape.w / 2}
                y={shape.y + shape.h / 2 - (wait ? 4 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#E2E8F0"
                fontSize={shape.w > 100 ? "11" : "9"}
                fontWeight="600"
                pointerEvents="none"
              >
                {ZONE_LABELS[zoneId]}
              </text>
              {/* Density percentage */}
              <text
                x={shape.x + shape.w / 2}
                y={shape.y + shape.h / 2 + (wait ? 8 : 12)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={shape.w > 100 ? "12" : "9"}
                fontWeight="700"
                pointerEvents="none"
              >
                {Math.round(density * 100)}%
              </text>
              {/* Wait time badge for concessions */}
              {wait && (
                <g>
                  <rect
                    x={shape.x + shape.w - 28}
                    y={shape.y - 8}
                    width="32" height="16"
                    rx="8"
                    fill="#1E293B"
                    stroke="rgba(148,163,184,0.3)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={shape.x + shape.w - 12}
                    y={shape.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#60A5FA"
                    fontSize="8"
                    fontWeight="600"
                  >
                    {wait.wait_minutes}m
                  </text>
                </g>
              )}
              {/* Anomaly marker */}
              {isAnomaly && (
                <g className="animate-anomaly">
                  <circle
                    cx={shape.x + 10}
                    cy={shape.y + 10}
                    r="8"
                    fill="rgba(239,68,68,0.3)"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                  />
                  <text
                    x={shape.x + 10}
                    y={shape.y + 13}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#EF4444"
                  >
                    ⚠
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="absolute z-50 pointer-events-none glass-card-sm px-3 py-2 text-xs max-w-[200px]"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 60}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold text-white mb-1">{hoveredData.label}</div>
          <div style={{ color: densityColor(hoveredData.density) }}>
            Density: {Math.round(hoveredData.density * 100)}%
          </div>
          {hoveredData.wait && (
            <div className="text-blue-400">Wait: ~{hoveredData.wait.wait_minutes} min</div>
          )}
          {hoveredData.surge && (
            <div className="text-orange-400">⚡ Surge in ~{hoveredData.surge.estimated_minutes_to_peak} min</div>
          )}
          {hoveredData.anomaly && (
            <div className="text-red-400">⚠ {hoveredData.anomaly.severity}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#22C55E" }} /> Low</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#EAB308" }} /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#F97316" }} /> High</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#EF4444" }} /> Critical</span>
      </div>
    </div>
  );
}
