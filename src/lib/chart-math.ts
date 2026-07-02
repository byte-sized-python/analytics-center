export function fmtNum(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtK(n: number) {
  n = Math.round(n);
  if (n >= 1000) {
    const s = (n / 1000).toFixed(n >= 10000 ? 0 : 1);
    return s.replace(/\.0$/, "") + "k";
  }
  return "" + n;
}

export function fmtDur(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

export function linePath(vals: number[], max: number, W: number, H: number, padTop: number, padBot: number) {
  const n = vals.length;
  if (n < 2 || max <= 0) {
    return { line: `M 0 ${H - padBot} L ${W} ${H - padBot}`, area: `M 0 ${H} L ${W} ${H} Z` };
  }
  const stepX = W / (n - 1);
  const usable = H - padTop - padBot;
  const pts = vals.map((v, i) => [+(i * stepX).toFixed(1), +(H - padBot - (v / max) * usable).toFixed(1)]);
  const line = "M " + pts.map((p) => p.join(" ")).join(" L ");
  const area = line + ` L ${W} ${H} L 0 ${H} Z`;
  return { line, area };
}

export function spark(vals: number[]) {
  const W = 120,
    H = 36;
  const n = vals.length;
  if (n < 2) return { line: `M 0 ${H - 4} L ${W} ${H - 4}`, area: `M 0 ${H} L ${W} ${H} Z` };
  const stepX = W / (n - 1);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const r = max - min || 1;
  const pts = vals.map((v, i) => [+(i * stepX).toFixed(1), +(H - 4 - ((v - min) / r) * (H - 9)).toFixed(1)]);
  const line = "M " + pts.map((p) => p.join(" ")).join(" L ");
  const area = line + ` L ${W} ${H} L 0 ${H} Z`;
  return { line, area };
}

const DONUT_COLORS = ["#3776AB", "#FED33B", "#64748B", "#F75D5D", "#CBD5E1"];

export function donut(pairs: [string, number][]) {
  const r = 54;
  const C = 2 * Math.PI * r;
  const total = pairs.reduce((a, p) => a + p[1], 0) || 1;
  let cum = 0;
  return pairs.map((p, i) => {
    const frac = p[1] / total;
    const len = frac * C;
    const seg = {
      label: p[0],
      value: p[1],
      pct: Math.round(frac * 100),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dash: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      offset: (-cum).toFixed(2),
    };
    cum += len;
    return seg;
  });
}

export function deltaText(delta: number, unit: "%" | "pts" = "%") {
  const up = delta >= 0;
  const arrow = up ? "▲" : "▼";
  return `${arrow} ${Math.abs(Math.round(delta * 10) / 10)}${unit === "pts" ? " pts" : "%"}`;
}

export function deltaStyle(good: boolean): import("react").CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: good ? "var(--success)" : "var(--danger)",
  };
}
