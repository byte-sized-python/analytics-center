"use client";

import { useRef, useState, type MouseEvent, type TouchEvent } from "react";

export type TrendChartSeries = {
  key: string;
  color: string;
  areaFill: string;
  line: string;
  area: string;
  points: { x: number; y: number }[];
};

export type TrendChartRow = {
  label: string;
  values: { key: string; text: string; color: string }[];
};

export default function TrendChart({
  viewBoxWidth,
  viewBoxHeight,
  displayHeight,
  grid,
  series,
  rows,
}: {
  viewBoxWidth: number;
  viewBoxHeight: number;
  displayHeight?: number;
  grid: { label: string; y: number }[];
  series: TrendChartSeries[];
  rows: TrendChartRow[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const n = rows.length;

  function updateFromClientX(clientX: number) {
    const svg = svgRef.current;
    if (!svg || n < 1) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const frac = relX / rect.width;
    const idx = n > 1 ? Math.round(frac * (n - 1)) : 0;
    setHoverIndex(Math.min(Math.max(idx, 0), n - 1));
  }

  const handleMouseMove = (e: MouseEvent) => updateFromClientX(e.clientX);
  const handleMouseLeave = () => setHoverIndex(null);
  const handleTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) updateFromClientX(t.clientX);
  };
  const handleTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) updateFromClientX(t.clientX);
  };
  const handleTouchEnd = () => setHoverIndex(null);

  const hoverRow = hoverIndex !== null ? rows[hoverIndex] : null;
  const hoverX = hoverIndex !== null && n > 1 ? (hoverIndex / (n - 1)) * viewBoxWidth : 0;
  const leftPct = viewBoxWidth > 0 ? (hoverX / viewBoxWidth) * 100 : 0;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height={displayHeight ?? viewBoxHeight}
        preserveAspectRatio="none"
        style={{ display: "block", touchAction: "none" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((g, i) => (
          <line key={i} x1="0" y1={g.y} x2={viewBoxWidth} y2={g.y} stroke="var(--slate-200)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s) => (
          <path key={`${s.key}-area`} d={s.area} fill={s.areaFill} />
        ))}
        {series.map((s) => (
          <path key={`${s.key}-line`} d={s.line} fill="none" stroke={s.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ))}
        {hoverIndex !== null && (
          <line x1={hoverX} y1="0" x2={hoverX} y2={viewBoxHeight} stroke="var(--slate-300)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
        )}
        {hoverIndex !== null &&
          series.map((s) => {
            const pt = s.points[hoverIndex];
            if (!pt) return null;
            return (
              <g key={`${s.key}-dot`}>
                <circle cx={pt.x} cy={pt.y} r="7" fill={s.color} opacity="0.18" />
                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
      </svg>
      {hoverRow && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            top: 8,
            left: `${leftPct}%`,
            transform: leftPct < 15 ? "translateX(0)" : leftPct > 85 ? "translateX(-100%)" : "translateX(-50%)",
            background: "var(--slate-900)",
            color: "#fff",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            lineHeight: 1.5,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-card)",
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{hoverRow.label}</div>
          {hoverRow.values.map((v) => (
            <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: v.color, flexShrink: 0 }} />
              <span>{v.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
