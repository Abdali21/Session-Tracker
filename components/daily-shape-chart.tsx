import type { DailyReportMetrics } from "@/lib/report";

interface DailyShapeChartProps {
  values: DailyReportMetrics["normalized"];
}

const CENTER_X = 300;
const CENTER_Y = 205;
const RADIUS = 132;

export function DailyShapeChart({ values }: DailyShapeChartProps) {
  const axisValues = [
    values.deepWork,
    values.tasks,
    values.sessions,
    values.timeDiscipline,
  ];
  const dataPoints = getPoints(axisValues.map((value) => value / 100));

  return (
    <svg
      viewBox="0 0 600 410"
      className="mx-auto block h-auto w-full max-w-[680px] overflow-visible font-sans"
      role="img"
      aria-labelledby="daily-shape-title daily-shape-description"
    >
      <title id="daily-shape-title">Today&apos;s Shape</title>
      <desc id="daily-shape-description">
        Deep Work {values.deepWork} percent, Tasks {values.tasks} percent,
        Sessions {values.sessions} percent, and Time Discipline{" "}
        {values.timeDiscipline} percent.
      </desc>

      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={getPoints([scale, scale, scale, scale])}
          fill="none"
          stroke="#DEDEE6"
          strokeWidth={scale === 1 ? 1.25 : 1}
        />
      ))}

      <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X} y2={CENTER_Y - RADIUS} stroke="#DEDEE6" />
      <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X + RADIUS} y2={CENTER_Y} stroke="#DEDEE6" />
      <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X} y2={CENTER_Y + RADIUS} stroke="#DEDEE6" />
      <line x1={CENTER_X} y1={CENTER_Y} x2={CENTER_X - RADIUS} y2={CENTER_Y} stroke="#DEDEE6" />

      <polygon
        points={dataPoints}
        fill="#513FB0"
        fillOpacity="0.14"
        stroke="#513FB0"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {getPointCoordinates(axisValues.map((value) => value / 100)).map(
        ([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="5"
            fill="#2D2D83"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        )
      )}

      <AxisLabel x={CENTER_X} y={26} value={values.deepWork} label="Deep Work" />
      <AxisLabel
        x={CENTER_X + RADIUS + 32}
        y={CENTER_Y - 8}
        value={values.tasks}
        label="Tasks"
        textAnchor="start"
      />
      <AxisLabel
        x={CENTER_X}
        y={CENTER_Y + RADIUS + 34}
        value={values.sessions}
        label="Sessions"
      />
      <AxisLabel
        x={CENTER_X - RADIUS - 32}
        y={CENTER_Y - 8}
        value={values.timeDiscipline}
        label="Time Discipline"
        textAnchor="end"
      />
    </svg>
  );
}

interface AxisLabelProps {
  x: number;
  y: number;
  value: number;
  label: string;
  textAnchor?: "start" | "middle" | "end";
}

function AxisLabel({
  x,
  y,
  value,
  label,
  textAnchor = "middle",
}: AxisLabelProps) {
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#696978"
        fontSize="12"
        fontWeight="500"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 19}
        textAnchor={textAnchor}
        fill="#2D2D83"
        fontSize="14"
        fontWeight="600"
        className="tabular-nums"
      >
        {value}%
      </text>
    </g>
  );
}

function getPoints(scales: number[]): string {
  return getPointCoordinates(scales)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

function getPointCoordinates(scales: number[]): Array<[number, number]> {
  const [top, right, bottom, left] = scales;

  return [
    [CENTER_X, CENTER_Y - RADIUS * top],
    [CENTER_X + RADIUS * right, CENTER_Y],
    [CENTER_X, CENTER_Y + RADIUS * bottom],
    [CENTER_X - RADIUS * left, CENTER_Y],
  ];
}
