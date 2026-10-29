import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTheme } from 'styled-components';
import { withAlpha } from '../../../theme';
import {
  formatCount,
  formatRupees,
  formatRupeesCompact,
} from '../../../services/admin/adminDashboardModels';
import type { RevenuePoint } from '../../../services/admin/adminDashboardModels';
import {
  ChartFrame,
  AxisText,
  EndLabel,
  Tooltip,
  TooltipTitle,
  TooltipRow,
} from './AdminDashboard.styles';

interface Labels {
  week: string;
  revenue: string;
  orders: string;
}

interface RevenueTrendChartProps {
  points: RevenuePoint[];
  labels: Labels;
  /** Accessible name for the plot. */
  title: string;
}

/** Rounds the axis max up to a clean step so ticks read 0 / 3L / 6L / … */
function niceScale(max: number, tickCount = 4) {
  const raw = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  return { step, max: step * Math.ceil(max / step) };
}

/**
 * Single-series weekly revenue line + 10% area wash. One y-axis (orders show in
 * the tooltip only). Hover / arrow keys move a crosshair over the nearest week.
 */
export function RevenueTrendChart({ points, labels, title }: RevenueTrendChartProps) {
  const theme = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const {
    adminChartHeight: height,
    adminChartAxisWidth: left,
    adminChartAxisHeight: bottom,
  } = theme.layout;
  const top = theme.spacing.space2;
  const right = theme.spacing.space12; // room for the end label
  const plotW = Math.max(0, width - left - right);
  const plotH = height - top - bottom;

  const { step, max } = niceScale(Math.max(...points.map((p) => p.revenue)));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const x = (i: number) => left + (points.length > 1 ? (i / (points.length - 1)) * plotW : 0);
  const y = (v: number) => top + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.revenue)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points.length - 1;
  // Show every other week label on narrow plots so they never collide.
  const labelEvery = plotW / points.length < 44 ? 2 : 1;

  const nearest = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || plotW <= 0) return null;
    const ratio = (clientX - rect.left - left) / plotW;
    return Math.max(0, Math.min(last, Math.round(ratio * last)));
  };

  const onPointerMove = (e: PointerEvent) => setActive(nearest(e.clientX));
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(last, (i ?? (dir > 0 ? -1 : last + 1)) + dir)));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const point = active !== null ? points[active] : null;
  const tooltipW = theme.layout.adminTooltipWidth;
  const tooltipLeft =
    active !== null
      ? Math.min(Math.max(0, x(active) - tooltipW / 2), Math.max(0, width - tooltipW))
      : 0;

  return (
    <ChartFrame ref={frameRef}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. Use left and right arrow keys to read each week.`}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          {/* Recessive hairline grid + y ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={theme.colors.divider}
                strokeWidth={1}
              />
              <AxisText x={left - theme.spacing.space2} y={y(t)} dy="0.32em" textAnchor="end">
                {t === 0 ? '0' : formatRupeesCompact(t)}
              </AxisText>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelEvery === last % labelEvery ? (
              <AxisText key={p.weekStart} x={x(i)} y={height - 8} textAnchor="middle">
                {p.label}
              </AxisText>
            ) : null,
          )}

          <path d={area} fill={withAlpha(theme.colors.primary, 0.1)} />
          <path
            d={line}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Crosshair */}
          {point && active !== null && (
            <g>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={top}
                y2={y(0)}
                stroke={theme.colors.outlineVariant}
                strokeWidth={1}
              />
              <circle
                cx={x(active)}
                cy={y(point.revenue)}
                r={5}
                fill={theme.colors.primary}
                stroke={theme.colors.surface}
                strokeWidth={2}
              />
            </g>
          )}

          {/* End marker + direct label (the latest week) */}
          <circle
            cx={x(last)}
            cy={y(points[last].revenue)}
            r={4}
            fill={theme.colors.primary}
            stroke={theme.colors.surface}
            strokeWidth={2}
          />
          <EndLabel x={x(last) + theme.spacing.space2} y={y(points[last].revenue)} dy="0.32em">
            {formatRupeesCompact(points[last].revenue)}
          </EndLabel>
        </svg>
      )}

      {point && (
        <Tooltip style={{ left: tooltipLeft }} role="status">
          <TooltipTitle>
            {labels.week} {point.label}
          </TooltipTitle>
          <TooltipRow>
            {labels.revenue}
            <strong>{formatRupees(point.revenue)}</strong>
          </TooltipRow>
          <TooltipRow>
            {labels.orders}
            <strong>{formatCount(point.orders)}</strong>
          </TooltipRow>
        </Tooltip>
      )}
    </ChartFrame>
  );
}
