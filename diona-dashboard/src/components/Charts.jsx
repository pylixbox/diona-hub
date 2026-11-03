import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import Panel from './Panel'
import { useTheme } from '../context/ThemeContext'
import { PHILIPPINES_TIME_ZONE } from '../utils/time'

const ORDER = ['High', 'Medium', 'Low']

const fmtDay = (d) =>
  d
    ? new Date(`${d}T12:00:00+08:00`).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        timeZone: PHILIPPINES_TIME_ZONE,
      })
    : ''

export function SeverityChart({ data, days = 7 }) {
  const { colors } = useTheme()
  const sev = { High: colors.high, Medium: colors.medium, Low: colors.low }
  const byName = Object.fromEntries(data.map((d) => [d.severity, d.count]))
  const rows = ORDER.map((s) => ({ severity: s, count: byName[s] || 0 }))
  const total = rows.reduce((a, r) => a + r.count, 0)
  const pieData = total ? rows : [{ severity: 'none', count: 1 }]

  return (
    <Panel title="Severity mix" meta={`${days}d`}>
      <div className="flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="severity"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={total ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {pieData.map((e) => (
                  <Cell key={e.severity} fill={sev[e.severity] || colors.line} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-semibold tabular-nums text-ink">{total}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted">alerts</span>
          </div>
        </div>
        <ul className="flex-1 space-y-3">
          {rows.map((r) => (
            <li key={r.severity} className="flex items-center gap-3 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: sev[r.severity] }} />
              <span className="flex-1 text-inkSoft">{r.severity}</span>
              <span className="font-mono tabular-nums text-ink">{r.count}</span>
              <span className="w-9 text-right font-mono text-[11px] text-muted">
                {total ? Math.round((r.count / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

export function TrendChart({ data, height = 220 }) {
  const { colors } = useTheme()
  const sev = { High: colors.high, Medium: colors.medium, Low: colors.low }
  const tooltip = { background: colors.panel, border: `1px solid ${colors.line}`, fontSize: 12, borderRadius: 2 }
  const legend = (
    <div className="flex gap-3">
      {ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: sev[s] }} />
          {s}
        </span>
      ))}
    </div>
  )
  return (
    <Panel title="Alert volume" meta={legend}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="trendGradHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.hiTop} />
              <stop offset="100%" stopColor={colors.hiBot} />
            </linearGradient>
            <linearGradient id="trendGradMedium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.medTop} />
              <stop offset="100%" stopColor={colors.medBot} />
            </linearGradient>
            <linearGradient id="trendGradLow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.lowTop} />
              <stop offset="100%" stopColor={colors.lowBot} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.line} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: colors.muted, fontSize: 11 }}
            tickFormatter={fmtDay}
            axisLine={false}
            tickLine={false}
            minTickGap={14}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={tooltip}
            labelStyle={{ color: colors.tipLabel }}
            itemStyle={{ color: colors.ink }}
            labelFormatter={fmtDay}
            cursor={{ fill: colors.cursor }}
          />
          <Bar dataKey="High" stackId="sev" fill="url(#trendGradHigh)" maxBarSize={40} />
          <Bar dataKey="Medium" stackId="sev" fill="url(#trendGradMedium)" maxBarSize={40} />
          <Bar dataKey="Low" stackId="sev" fill="url(#trendGradLow)" maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  )
}
