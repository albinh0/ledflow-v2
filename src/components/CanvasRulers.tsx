import React from 'react';

interface CanvasRulersProps {
  outputWidth: number;
  outputHeight: number;
  scale: number;
  rulerSize?: number;
}

export const RULER_THICKNESS = 17; // 30% narrower than 24px (24 * 0.7 = 16.8px ≈ 17px)

export function CanvasRulersTop({ outputWidth, scale, rulerSize = RULER_THICKNESS }: CanvasRulersProps) {
  // Adaptive step based on zoom scale
  const getStep = (s: number) => {
    if (s >= 2) return 50;
    if (s >= 0.7) return 100;
    if (s >= 0.35) return 200;
    return 500;
  };

  const step = getStep(scale);
  const numStepsX = Math.ceil(outputWidth / step) + 1;
  const totalWidthScaled = outputWidth * scale;

  return (
    <div className="sticky top-0 left-0 z-30 flex pointer-events-none select-none">
      {/* Corner indicator */}
      <div
        className="sticky left-0 z-40 bg-[#0c0c10] border-r border-b border-[#252532] flex items-center justify-center text-[8px] font-bold text-[#818cf8] shrink-0"
        style={{ width: `${rulerSize}px`, height: `${rulerSize}px` }}
        title="Units: pixels (px)"
      >
        px
      </div>

      {/* Top Horizontal Ruler */}
      <div
        className="bg-[#0c0c10]/95 backdrop-blur-xs border-b border-[#252532] overflow-visible flex items-end"
        style={{ width: `${totalWidthScaled}px`, height: `${rulerSize}px` }}
      >
        <svg width={totalWidthScaled} height={rulerSize} className="overflow-visible block">
          {Array.from({ length: numStepsX }).map((_, i) => {
            const worldVal = i * step;
            const screenX = worldVal * scale;
            if (worldVal > outputWidth) return null;

            return (
              <g key={`x-${worldVal}`} transform={`translate(${screenX}, 0)`}>
                {/* Major tick line */}
                <line x1={0} y1={7} x2={0} y2={rulerSize} stroke="#444458" strokeWidth={1} />
                {/* Mid tick */}
                <line x1={(step / 2) * scale} y1={11} x2={(step / 2) * scale} y2={rulerSize} stroke="#2c2c3c" strokeWidth={1} />
                {/* Fine ticks */}
                <line x1={(step / 4) * scale} y1={14} x2={(step / 4) * scale} y2={rulerSize} stroke="#20202e" strokeWidth={1} />
                <line x1={((3 * step) / 4) * scale} y1={14} x2={((3 * step) / 4) * scale} y2={rulerSize} stroke="#20202e" strokeWidth={1} />
                {/* Text Label */}
                <text x={2} y={8} fill="#94a3b8" fontSize={8} fontFamily="monospace" textAnchor="start">
                  {worldVal}
                </text>
              </g>
            );
          })}
          {/* Canvas Width End Marker */}
          <line x1={outputWidth * scale} y1={0} x2={outputWidth * scale} y2={rulerSize} stroke="#38bdf8" strokeWidth={1.5} />
          <text x={outputWidth * scale + 2} y={rulerSize - 4} fill="#38bdf8" fontSize={7.5} fontWeight="bold" fontFamily="monospace">
            {outputWidth}
          </text>
        </svg>
      </div>
    </div>
  );
}

export function CanvasRulersLeft({ outputHeight, scale, rulerSize = RULER_THICKNESS }: CanvasRulersProps) {
  const getStep = (s: number) => {
    if (s >= 2) return 50;
    if (s >= 0.7) return 100;
    if (s >= 0.35) return 200;
    return 500;
  };

  const step = getStep(scale);
  const numStepsY = Math.ceil(outputHeight / step) + 1;
  const totalHeightScaled = outputHeight * scale;

  return (
    <div
      className="sticky left-0 z-30 bg-[#0c0c10]/95 backdrop-blur-xs border-r border-[#252532] overflow-visible shrink-0 select-none pointer-events-none"
      style={{ width: `${rulerSize}px`, height: `${totalHeightScaled}px` }}
    >
      <svg width={rulerSize} height={totalHeightScaled} className="overflow-visible block">
        {Array.from({ length: numStepsY }).map((_, i) => {
          const worldVal = i * step;
          const screenY = worldVal * scale;
          if (worldVal > outputHeight) return null;

          return (
            <g key={`y-${worldVal}`} transform={`translate(0, ${screenY})`}>
              {/* Major tick line */}
              <line x1={7} y1={0} x2={rulerSize} y2={0} stroke="#444458" strokeWidth={1} />
              {/* Mid tick */}
              <line x1={11} y1={(step / 2) * scale} x2={rulerSize} y2={(step / 2) * scale} stroke="#2c2c3c" strokeWidth={1} />
              {/* Fine ticks */}
              <line x1={14} y1={(step / 4) * scale} x2={rulerSize} y2={(step / 4) * scale} stroke="#20202e" strokeWidth={1} />
              <line x1={14} y1={((3 * step) / 4) * scale} x2={rulerSize} y2={((3 * step) / 4) * scale} stroke="#20202e" strokeWidth={1} />
              {/* Vertical Text Label */}
              <text
                x={8}
                y={-2}
                fill="#94a3b8"
                fontSize={7.5}
                fontFamily="monospace"
                textAnchor="end"
                transform="rotate(-90, 8, -2)"
              >
                {worldVal}
              </text>
            </g>
          );
        })}
        {/* Canvas Height End Marker */}
        <line x1={0} y1={outputHeight * scale} x2={rulerSize} y2={outputHeight * scale} stroke="#38bdf8" strokeWidth={1.5} />
        <text
          x={8}
          y={outputHeight * scale + 10}
          fill="#38bdf8"
          fontSize={7.5}
          fontWeight="bold"
          fontFamily="monospace"
          transform={`rotate(-90, 8, ${outputHeight * scale + 10})`}
        >
          {outputHeight}
        </text>
      </svg>
    </div>
  );
}

// Backward-compatible default export
export function CanvasRulers(props: CanvasRulersProps) {
  return <CanvasRulersTop {...props} />;
}
