import React, { useEffect, useRef, useState } from 'react';
import { GridModel, Point, GridMode, ToolAction, DragOptions, CanvasBackgroundStyle } from '../types';
import { MAIN_COLORS, GROUP_COLORS, HIGHLIGHT_DURATION, DEFAULT_ID_FONT } from '../constants';
import {
  getModuleGeometry,
  getModuleId,
  getModuleAtPosition,
  isValidModuleCell,
  areModulesAdjacent,
  findConnectedGroups,
  interpolatePoints,
  getUncoveredSegments,
  computeDataLineNames,
  calculatePowerGroupRemoval,
  calculateDataLineRemoval
} from '../utils/geometry';
import { computeDragSnap, DragSnapResult, getGridWorldDimensions } from '../utils/dragSnapping';
import { CanvasRulersTop, CanvasRulersLeft, RULER_THICKNESS } from './CanvasRulers';
import { getPatternColors } from '../utils/exportImport';

interface CanvasStageProps {
  grids: Record<string, GridModel>;
  activeTab: string;
  outputWidth: number;
  outputHeight: number;
  currentScale: number;
  highlightedGridId: string | null;
  altLineStyle?: boolean;
  cableCurvature?: number;
  canvasBackground?: CanvasBackgroundStyle;
  backgroundColor?: string;
  gridCellSize?: number;
  dotsSpacing?: number;
  patternBrightness?: number;
  showRulers?: boolean;
  canvasDragMode?: boolean;
  dragOptions?: DragOptions;
  onSelectGrid: (gridId: string) => void;
  onUpdateGrid: (gridId: string, updater: (prev: GridModel) => GridModel, actionDescription?: string) => void;
  onShowTooltip: (msg: string, type?: 'error' | 'success') => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const HANDWRITING_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M3 21l3.5-1L18 8.5 15.5 6 4 17.5 3 21z' fill='%230f172a' stroke='%23ffffff' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cpath d='M14 4.5l2.5-2.5a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L18 8.5 14 4.5z' fill='%230284c7' stroke='%23ffffff' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='2.5' cy='21.5' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E") 2 22, crosshair`;

const HANDWRITING_ERASE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3C!-- Pen body --%3E%3Cpath d='M3 21l3.5-1L18 8.5 15.5 6 4 17.5 3 21z' fill='%230f172a' stroke='%23ffffff' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cpath d='M14 4.5l2.5-2.5a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L18 8.5 14 4.5z' fill='%230284c7' stroke='%23ffffff' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='2.5' cy='21.5' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E") 2 22, crosshair`;

const PRECISION_SELECT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3C!-- White backing outline for contrast --%3E%3Cpath d='M3 9V3h6M15 3h6v6M3 15v6h6M21 15v6h-6' fill='none' stroke='%23ffffff' stroke-width='3.6' stroke-linecap='square' stroke-linejoin='miter'/%3E%3C!-- Dark corner brackets forming frame --%3E%3Cpath d='M3 9V3h6M15 3h6v6M3 15v6h6M21 15v6h-6' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter'/%3E%3C!-- Cyan-blue corner accent points --%3E%3Cpath d='M3 3h2v2H3zM19 3h2v2h-2zM3 19h2v2H3zM19 19h2v2h-2z' fill='%230284c7'/%3E%3C/svg%3E") 8 8, crosshair`;

const PRECISION_SELECT_ERASE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3C!-- Corner brackets --%3E%3Cpath d='M3 9V3h6M15 3h6v6M3 15v6h6M21 15v6h-6' fill='none' stroke='%23ffffff' stroke-width='3.6' stroke-linecap='square' stroke-linejoin='miter'/%3E%3Cpath d='M3 9V3h6M15 3h6v6M3 15v6h6M21 15v6h-6' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter'/%3E%3Cpath d='M3 3h2v2H3zM19 3h2v2h-2zM3 19h2v2H3zM19 19h2v2h-2z' fill='%230284c7'/%3E%3C!-- Minus badge --%3E%3Ccircle cx='20' cy='20' r='6.5' fill='%23ef4444' stroke='%23ffffff' stroke-width='1.4'/%3E%3Cline x1='16.5' y1='20' x2='23.5' y2='20' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 8 8, crosshair`;

const HIDE_SELECT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3C!-- White backing outline for contrast --%3E%3Cpath d='M2 9.5C6.5 17 17.5 17 22 9.5M4 11.2L2.5 14.8M7.6 13.8L6 18M12 14.5V19.5M16.4 13.8L18 18M20 11.2L21.5 14.8' fill='none' stroke='%23ffffff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C!-- Dark closed eye with lashes --%3E%3Cpath d='M2 9.5C6.5 17 17.5 17 22 9.5M4 11.2L2.5 14.8M7.6 13.8L6 18M12 14.5V19.5M16.4 13.8L18 18M20 11.2L21.5 14.8' fill='none' stroke='%230f172a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 8 8, pointer`;

const getCanvasCursor = (
  isOverActive: boolean,
  isOverAnyGrid: boolean,
  isDragging: boolean,
  mode?: GridMode,
  toolAction?: ToolAction,
  canvasDragMode?: boolean
): string => {
  if (canvasDragMode || mode === 'drag') {
    if (isDragging) return 'grabbing';
    if (isOverAnyGrid || isOverActive) return 'grab';
    return 'default';
  }
  if (!isOverActive) return 'default';
  if (toolAction === 'erase') {
    if (mode === 'data-lines') return HANDWRITING_ERASE_CURSOR;
    if (mode === 'power-lines') return PRECISION_SELECT_ERASE_CURSOR;
  }
  if (mode === 'data-lines') return HANDWRITING_CURSOR;
  if (mode === 'power-lines') return PRECISION_SELECT_CURSOR;
  if (mode === 'visibility') return HIDE_SELECT_CURSOR;
  return 'default';
};

const getCanvasWrapperBackgroundStyle = (
  bgStyle: CanvasBackgroundStyle = 'transparent'
): React.CSSProperties => {
  if (bgStyle === 'transparent') {
    return {
      backgroundColor: '#222228',
      backgroundImage: `
        linear-gradient(45deg, #2f2f38 25%, transparent 25%),
        linear-gradient(-45deg, #2f2f38 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2f2f38 75%),
        linear-gradient(-45deg, transparent 75%, #2f2f38 75%)
      `,
      backgroundSize: '16px 16px',
      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
    };
  }
  return {};
};

export function CanvasStage({
  grids,
  activeTab,
  outputWidth,
  outputHeight,
  currentScale,
  highlightedGridId,
  altLineStyle = true,
  cableCurvature = 0.2,
  canvasBackground = 'transparent',
  backgroundColor = '#151518',
  gridCellSize = 25,
  dotsSpacing = 25,
  patternBrightness = 29,
  showRulers = false,
  canvasDragMode = true,
  dragOptions,
  onSelectGrid,
  onUpdateGrid,
  onShowTooltip,
  containerRef,
  canvasRef
}: CanvasStageProps) {
  const highlightStartRef = useRef<number | null>(null);
  const animationsRef = useRef<Map<string, { type: 'show' | 'hide'; startTime: number }>>(new Map());
  const [hoveredMod, setHoveredMod] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (activeTab && activeTab !== 'settings') {
      highlightStartRef.current = performance.now();
    }
  }, [activeTab]);

  useEffect(() => {
    if (highlightedGridId) {
      highlightStartRef.current = performance.now();
    }
  }, [highlightedGridId]);

  // Keys tracking for cursor & behavior
  const altKeyRef = useRef(false);
  const shiftKeyRef = useRef(false);
  const cursorOverGridRef = useRef(false);
  const cursorOverAnyGridRef = useRef(false);

  // Drag mode state & snap guides
  const justDraggedRef = useRef(false);
  const dragStateRef = useRef<{
    isDragging: boolean;
    gridId: string;
    startMouseCanvasX: number;
    startMouseCanvasY: number;
    startOffsetX: number;
    startOffsetY: number;
    currentOffsetX: number;
    currentOffsetY: number;
    hasMoved: boolean;
  } | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const activeDragGuidesRef = useRef<DragSnapResult | null>(null);

  // Animation frame loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = outputWidth;
      canvas.height = outputHeight;
      ctx.clearRect(0, 0, outputWidth, outputHeight);

      // 0. Render Canvas Background onto canvas (Transparent, Solid, Grid, or Dots)
      if (canvasBackground === 'solid') {
        ctx.fillStyle = backgroundColor || '#151518';
        ctx.fillRect(0, 0, outputWidth, outputHeight);
      } else if (canvasBackground === 'grid') {
        const patternColors = getPatternColors(patternBrightness);
        ctx.fillStyle = patternColors.bgColor;
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        const cellSize = Math.max(5, Math.min(200, gridCellSize || 25));
        ctx.strokeStyle = `rgba(${patternColors.fgColor}, ${patternColors.fgAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = cellSize; x < outputWidth; x += cellSize) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, outputHeight);
        }
        for (let y = cellSize; y < outputHeight; y += cellSize) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(outputWidth, y + 0.5);
        }
        ctx.stroke();
      } else if (canvasBackground === 'dots') {
        const patternColors = getPatternColors(patternBrightness);
        ctx.fillStyle = patternColors.bgColor;
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        const spacing = Math.max(5, Math.min(200, dotsSpacing || 25));
        const dotRadius = Math.max(1, Math.min(3, spacing * 0.05));
        ctx.fillStyle = `rgba(${patternColors.fgColor}, ${Math.min(1, patternColors.fgAlpha * 1.4)})`;
        for (let x = spacing / 2; x < outputWidth; x += spacing) {
          for (let y = spacing / 2; y < outputHeight; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Output border
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, outputWidth, outputHeight);

      const gridEntries = Object.entries(grids);

      if (gridEntries.length === 0) {
        ctx.save();
        ctx.font = '36px Arial, sans-serif';
        ctx.fillStyle = '#707070';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Press + to create new grid', outputWidth / 2, outputHeight / 2);
        ctx.restore();
      } else {
        gridEntries.forEach(([gId, grid]) => {
          if (!grid.visible) return;

          ctx.save();
          ctx.translate(grid.offsetX, grid.offsetY);

          const isCurrentGrid = gId === activeTab;
          const isVisibilityMode = isCurrentGrid && grid.mode === 'visibility';

          // 1. Draw Modules
          for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
              if (!isValidModuleCell(grid, row, col)) continue;
              const isVisible = !!(grid.gridState[row] && grid.gridState[row][col]);
              const isFirstCorner =
                isCurrentGrid &&
                shiftKeyRef.current &&
                grid.rectFirstCorner !== null &&
                grid.rectFirstCorner.row === row &&
                grid.rectFirstCorner.col === col;

              const animKey = `${gId}:${row},${col}`;
              const anim = animationsRef.current.get(animKey);
              let animElapsed = anim ? time - anim.startTime : 99999;
              if (anim && animElapsed > 1050) {
                animationsRef.current.delete(animKey);
                animElapsed = 99999;
              }

              const geom = getModuleGeometry(grid, row, col);

              if (isVisible) {
                let moduleOpacity = 1.0;
                let useDiagonalStripes = false;
                let stripeFadeOpacity = 0.6;

                if (isFirstCorner && isVisibilityMode) {
                  moduleOpacity = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.003));
                }

                if (anim && anim.type === 'show' && animElapsed < 1050) {
                  useDiagonalStripes = true;
                  const fadeStartTime = 350;
                  if (animElapsed >= fadeStartTime) {
                    const fadeProgress = (animElapsed - fadeStartTime) / (1050 - fadeStartTime);
                    stripeFadeOpacity = 0.6 * (1 - fadeProgress);
                  }
                }

                // Fill
                const customMod = grid.customModules?.find((cm) => cm.row === row && cm.col === col);
                const subGrid = grid.mergedSubGrids?.find((s) => s.modules.some((m) => m.row === row && m.col === col));
                const fillColor = subGrid?.color || grid.moduleColors?.[`${row},${col}`] || customMod?.color || grid.moduleColor;
                const r = parseInt(fillColor.slice(1, 3), 16) || 40;
                const g = parseInt(fillColor.slice(3, 5), 16) || 40;
                const b = parseInt(fillColor.slice(5, 7), 16) || 40;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${moduleOpacity})`;
                ctx.fillRect(geom.x, geom.y, geom.width, geom.height);

                // Diagonal stripes (show animation)
                if (useDiagonalStripes && stripeFadeOpacity > 0) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(geom.x, geom.y, geom.width, geom.height);
                  ctx.clip();
                  ctx.strokeStyle = `rgba(255, 255, 255, ${stripeFadeOpacity})`;
                  ctx.lineWidth = 6;
                  const stripeSpacing = 15;
                  for (let i = -geom.height; i <= geom.width + geom.height; i += stripeSpacing) {
                    ctx.beginPath();
                    ctx.moveTo(geom.x + i, geom.y);
                    ctx.lineTo(geom.x + i + geom.height, geom.y + geom.height);
                    ctx.stroke();
                  }
                  ctx.restore();
                }

                // Stroke
                const labelColor = subGrid?.labelColor || customMod?.labelColor || grid.moduleLabelColor;
                const lr = parseInt(labelColor.slice(1, 3), 16) || 230;
                const lg = parseInt(labelColor.slice(3, 5), 16) || 230;
                const lb = parseInt(labelColor.slice(5, 7), 16) || 230;

                if (isFirstCorner && isVisibilityMode) {
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = 2.5;
                } else {
                  ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${moduleOpacity})`;
                  ctx.lineWidth = 1;
                }
                ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);

                // ID label
                const minSide = Math.min(geom.width, geom.height);
                const labelSizePercent = subGrid?.moduleLabelSizePercent ?? grid.moduleLabelSizePercent;
                const idFont = subGrid?.idFont || grid.idFont || DEFAULT_ID_FONT;
                const isPixelFont = idFont.includes('VT323');
                const fontSizeMultiplier = isPixelFont ? 1.25 : 1.0;
                const fontSize = Math.max(8, Math.round(minSide * (labelSizePercent / 100) * fontSizeMultiplier));
                ctx.font = `${fontSize}px ${idFont}`;
                ctx.fillStyle = `rgba(${lr}, ${lg}, ${lb}, ${moduleOpacity})`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(getModuleId(grid, row, col), geom.x + 10, geom.y + 10);
              } else {
                // Module is hidden
                const customMod = grid.customModules?.find((cm) => cm.row === row && cm.col === col);
                const subGrid = grid.mergedSubGrids?.find((s) => s.modules.some((m) => m.row === row && m.col === col));

                if (anim && anim.type === 'hide' && animElapsed < 1050) {
                  // Currently fading out animation
                  let moduleOpacity = 1.0;
                  const fadeStartTime = 350;
                  if (animElapsed < fadeStartTime) {
                    moduleOpacity = Math.abs(Math.sin(time * 0.003));
                  } else {
                    const fadeProgress = (animElapsed - fadeStartTime) / (1050 - fadeStartTime);
                    moduleOpacity = Math.max(0, 1.0 - fadeProgress);
                  }

                  const fillColor = subGrid?.color || grid.moduleColors?.[`${row},${col}`] || customMod?.color || grid.moduleColor;
                  const r = parseInt(fillColor.slice(1, 3), 16) || 40;
                  const g = parseInt(fillColor.slice(3, 5), 16) || 40;
                  const b = parseInt(fillColor.slice(5, 7), 16) || 40;
                  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${moduleOpacity})`;
                  ctx.fillRect(geom.x, geom.y, geom.width, geom.height);

                  const lr = 200, lg = 200, lb = 200;
                  ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${moduleOpacity})`;
                  ctx.lineWidth = 1;
                  ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);
                } else if (isVisibilityMode) {
                  // In Visibility/Hide mode: Render ghost cell so user can see & click to unhide
                  ctx.save();
                  ctx.fillStyle = 'rgba(20, 20, 24, 0.45)';
                  ctx.fillRect(geom.x, geom.y, geom.width, geom.height);

                  if (isFirstCorner) {
                    const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 + 0.5 * pulse})`;
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(geom.x + 1, geom.y + 1, geom.width - 2, geom.height - 2);
                    ctx.setLineDash([]);
                  } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);
                    ctx.setLineDash([]);
                  }

                  const minSide = Math.min(geom.width, geom.height);
                  const labelSizePercent = subGrid?.moduleLabelSizePercent ?? grid.moduleLabelSizePercent;
                  const idFont = subGrid?.idFont || grid.idFont || DEFAULT_ID_FONT;
                  const isPixelFont = idFont.includes('VT323');
                  const fontSizeMultiplier = isPixelFont ? 1.25 : 1.0;
                  const fontSize = Math.max(9, Math.round(minSide * (labelSizePercent / 100) * fontSizeMultiplier));
                  ctx.font = `${fontSize}px ${idFont}`;
                  ctx.fillStyle = isFirstCorner ? 'rgba(96, 165, 250, 0.9)' : 'rgba(255, 255, 255, 0.28)';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'top';
                  ctx.fillText(getModuleId(grid, row, col), geom.x + 8, geom.y + 8);
                  ctx.restore();
                }
              }
            }
          }

          // 2. Draw Data Lines (Connections)
          grid.connections.forEach((conn, index) => {
            if (conn.points && conn.points.length > 0) {
              const step = 20 - grid.hatchDensity;
              const lineIndex = conn.colorIndex !== undefined ? conn.colorIndex : index;
              const isForwardSlash = lineIndex % 2 === 0;

              // Hatching on visible modules (Only if altLineStyle is OFF)
              if (!altLineStyle) {
                const hatchColor = (conn.color && conn.color !== '#000000')
                  ? conn.color
                  : MAIN_COLORS[lineIndex % MAIN_COLORS.length];

                conn.points.forEach((point) => {
                  if (!grid.gridState[point.row] || !grid.gridState[point.row][point.col]) return;
                  const geom = getModuleGeometry(grid, point.row, point.col);
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(geom.x, geom.y, geom.width, geom.height);
                  ctx.clip();
                  ctx.strokeStyle = hatchColor + '80';
                  ctx.lineWidth = 2;

                  if (isForwardSlash) {
                    for (let i = -geom.height; i <= geom.width + geom.height; i += step) {
                      ctx.beginPath();
                      ctx.moveTo(geom.x + i, geom.y);
                      ctx.lineTo(geom.x + i + geom.height, geom.y + geom.height);
                      ctx.stroke();
                    }
                  } else {
                    for (let i = -geom.height; i <= geom.width + geom.height; i += step) {
                      ctx.beginPath();
                      ctx.moveTo(geom.x + i, geom.y);
                      ctx.lineTo(geom.x + i - geom.height, geom.y + geom.height);
                      ctx.stroke();
                    }
                  }
                  ctx.restore();
                });
              }

              // Connection wire, Arrow, and Start Dot
              if (conn.points.length >= 1) {
                const visiblePoints = conn.points.filter(
                  (p) =>
                    grid.gridState[p.row] &&
                    grid.gridState[p.row][p.col]
                );

                if (visiblePoints.length >= 1) {
                  const isHovered = grid.hoveredLineIndex === index;
                  const strokeColor = isHovered
                    ? '#00BFFF'
                    : (altLineStyle ? (conn.color || '#000000') : '#000000');

                  // Start point dot in Modern style
                  if (altLineStyle) {
                    const firstPoint = visiblePoints[0];
                    const firstGeom = getModuleGeometry(grid, firstPoint.row, firstPoint.col);
                    const dotRadius = Math.max(3, Math.min(firstGeom.width, firstGeom.height) * 0.06);

                    ctx.save();
                    ctx.fillStyle = strokeColor;
                    ctx.beginPath();
                    ctx.arc(firstGeom.centerX, firstGeom.centerY, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                  }

                  if (visiblePoints.length >= 2) {
                    const lineWidth = Math.max(3, grid.moduleWidth / 30);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();

                    if (altLineStyle && cableCurvature > 0 && visiblePoints.length > 2) {
                      const geom0 = getModuleGeometry(grid, visiblePoints[0].row, visiblePoints[0].col);
                      ctx.moveTo(geom0.centerX, geom0.centerY);

                      const cornerRadius = Math.min(geom0.width, geom0.height) * 0.35 * Math.min(1, Math.max(0, cableCurvature));
                      for (let i = 1; i < visiblePoints.length - 1; i++) {
                        const currentGeom = getModuleGeometry(grid, visiblePoints[i].row, visiblePoints[i].col);
                        const nextGeom = getModuleGeometry(grid, visiblePoints[i + 1].row, visiblePoints[i + 1].col);
                        ctx.arcTo(currentGeom.centerX, currentGeom.centerY, nextGeom.centerX, nextGeom.centerY, cornerRadius);
                      }
                      const lastGeom = getModuleGeometry(grid, visiblePoints[visiblePoints.length - 1].row, visiblePoints[visiblePoints.length - 1].col);
                      ctx.lineTo(lastGeom.centerX, lastGeom.centerY);
                    } else {
                      visiblePoints.forEach((point, i) => {
                        const geom = getModuleGeometry(grid, point.row, point.col);
                        if (i === 0) ctx.moveTo(geom.centerX, geom.centerY);
                        else ctx.lineTo(geom.centerX, geom.centerY);
                      });
                    }
                    ctx.stroke();

                    // Arrowhead
                    const last = visiblePoints[visiblePoints.length - 1];
                    const secondLast = visiblePoints[visiblePoints.length - 2];
                    const geom1 = getModuleGeometry(grid, secondLast.row, secondLast.col);
                    const geom2 = getModuleGeometry(grid, last.row, last.col);

                    const angle = Math.atan2(geom2.centerY - geom1.centerY, geom2.centerX - geom1.centerX);
                    const headLength = 40;
                    const headWidth = 20;

                    ctx.fillStyle = strokeColor;
                    ctx.beginPath();
                    ctx.moveTo(geom2.centerX, geom2.centerY);
                    ctx.lineTo(
                      geom2.centerX - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
                      geom2.centerY - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
                    );
                    ctx.lineTo(
                      geom2.centerX - headLength * Math.cos(angle),
                      geom2.centerY - headLength * Math.sin(angle)
                    );
                    ctx.closePath();
                    ctx.fill();
                  }
                }
              }

              // Labels on visible points
              const visiblePoints = conn.points.filter(
                (p) => grid.gridState[p.row] && grid.gridState[p.row][p.col]
              );

              if (visiblePoints.length === 1) {
                if (conn.name || conn.endName) {
                  const first = visiblePoints[0];
                  const geom = getModuleGeometry(grid, first.row, first.col);
                  let labelText = '';
                  if (conn.name && conn.endName) labelText = `${conn.name}-${conn.endName}`;
                  else if (conn.name) labelText = conn.name;
                  else if (conn.endName) labelText = conn.endName;

                  if (labelText) {
                    const minSide = Math.min(geom.width, geom.height);
                    const fontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));
                    ctx.font = `bold ${fontSize}px ${grid.dataLineFont}`;
                    ctx.fillStyle = '#000000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText, geom.centerX, geom.centerY);
                  }
                }
              } else if (visiblePoints.length >= 2) {
                const first = visiblePoints[0];
                const second = visiblePoints[1];
                const last = visiblePoints[visiblePoints.length - 1];
                const secondLast = visiblePoints[visiblePoints.length - 2];

                if (conn.name) {
                  const geom = getModuleGeometry(grid, first.row, first.col);
                  let labelX = geom.centerX;
                  let labelY = geom.centerY;
                  if (second.col > first.col) {
                    labelX = geom.x + geom.width / 4;
                    labelY = geom.y + (3 * geom.height) / 4;
                  } else if (second.col < first.col) {
                    labelX = geom.x + (3 * geom.width) / 4;
                    labelY = geom.y + geom.height / 4;
                  } else if (second.row > first.row) {
                    labelX = geom.x + (3 * geom.width) / 4;
                    labelY = geom.y + geom.height / 4;
                  } else if (second.row < first.row) {
                    labelX = geom.x + geom.width / 4;
                    labelY = geom.y + (3 * geom.height) / 4;
                  }
                  const minSide = Math.min(geom.width, geom.height);
                  const fontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));
                  ctx.font = `bold ${fontSize}px ${grid.dataLineFont}`;
                  ctx.fillStyle = '#000000';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(conn.name, labelX, labelY);
                }

                if (conn.endName) {
                  const geom = getModuleGeometry(grid, last.row, last.col);
                  let labelX = geom.centerX;
                  let labelY = geom.centerY;
                  if (secondLast.col > last.col || secondLast.row < last.row) {
                    labelX = geom.x + geom.width / 4;
                    labelY = geom.y + (3 * geom.height) / 4;
                  } else if (secondLast.col < last.col || secondLast.row > last.row) {
                    labelX = geom.x + (3 * geom.width) / 4;
                    labelY = geom.y + geom.height / 4;
                  }
                  const minSide = Math.min(geom.width, geom.height);
                  const fontSize = Math.round(minSide * (grid.dataLineFontSizePercent / 100));
                  ctx.font = `bold ${fontSize}px ${grid.dataLineFont}`;
                  ctx.fillStyle = '#000000';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(conn.endName, labelX, labelY);
                }
              }
            }
          });

          // 3. Draw Power Groups
          grid.selectedGroups.forEach((group, groupIndex) => {
            const activeGroupMods = group.modules.filter((m) => grid.gridState[m.row] && grid.gridState[m.row][m.col]);
            if (activeGroupMods.length > 0) {
              const groupColor = GROUP_COLORS[(group.colorIndex - 1) % GROUP_COLORS.length] || '#808080';
              if (altLineStyle) {
                // Alternative visual mode: Hatching with individual power group color (perimeter left unhatched)
                const tolerance = 0.5;

                const clipRects: { x: number; y: number; w: number; h: number }[] = [];
                let groupMinX = Infinity, groupMinY = Infinity, groupMaxX = -Infinity, groupMaxY = -Infinity;

                activeGroupMods.forEach((module) => {
                  const geom = getModuleGeometry(grid, module.row, module.col);
                  const x = geom.x;
                  const y = geom.y;
                  const width = geom.width;
                  const height = geom.height;
                  const maxX = x + width;
                  const maxY = y + height;

                  groupMinX = Math.min(groupMinX, x);
                  groupMinY = Math.min(groupMinY, y);
                  groupMaxX = Math.max(groupMaxX, maxX);
                  groupMaxY = Math.max(groupMaxY, maxY);

                  // Top
                  const topSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxY = otherGeom.y + otherGeom.height;
                      if (Math.abs(otherMaxY - y) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          topSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredTop = getUncoveredSegments(x, maxX, topSegments);

                  // Bottom
                  const bottomSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.y - maxY) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          bottomSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredBottom = getUncoveredSegments(x, maxX, bottomSegments);

                  // Left
                  const leftSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxX = otherGeom.x + otherGeom.width;
                      if (Math.abs(otherMaxX - x) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          leftSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredLeft = getUncoveredSegments(y, maxY, leftSegments);

                  // Right
                  const rightSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.x - maxX) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          rightSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredRight = getUncoveredSegments(y, maxY, rightSegments);

                  const minSide = Math.min(width, height);
                  const perimeterInset = Math.ceil((minSide * 6) / 100);

                  const insetTop = uncoveredTop.length > 0 ? perimeterInset : 0;
                  const insetBottom = uncoveredBottom.length > 0 ? perimeterInset : 0;
                  const insetLeft = uncoveredLeft.length > 0 ? perimeterInset : 0;
                  const insetRight = uncoveredRight.length > 0 ? perimeterInset : 0;

                  const clipX = x + insetLeft;
                  const clipY = y + insetTop;
                  const clipW = width - insetLeft - insetRight;
                  const clipH = height - insetTop - insetBottom;

                  if (clipW > 0 && clipH > 0) {
                    clipRects.push({ x: clipX, y: clipY, w: clipW, h: clipH });
                  }
                });

                if (clipRects.length > 0) {
                  const isHovered = grid.hoveredGroupIndex === groupIndex;
                  const strokeColor = isHovered ? '#FFFFFF' : groupColor;
                  const step = 20 - (grid.hatchDensity || 6);
                  const isForwardSlash = (group.colorIndex ?? groupIndex) % 2 === 0;

                  ctx.save();
                  ctx.beginPath();
                  clipRects.forEach((r) => {
                    ctx.rect(r.x, r.y, r.w, r.h);
                  });
                  ctx.clip();

                  ctx.strokeStyle = strokeColor + (strokeColor.length === 7 ? 'B0' : '');
                  ctx.lineWidth = 2.5;

                  const heightSpan = groupMaxY - groupMinY;
                  const startX = Math.floor((groupMinX - heightSpan) / step) * step;
                  const endX = groupMaxX + heightSpan;

                  ctx.beginPath();
                  if (isForwardSlash) {
                    for (let sx = startX; sx <= endX; sx += step) {
                      ctx.moveTo(sx, groupMinY);
                      ctx.lineTo(sx + heightSpan, groupMaxY);
                    }
                  } else {
                    for (let sx = startX; sx <= endX; sx += step) {
                      ctx.moveTo(sx, groupMinY);
                      ctx.lineTo(sx - heightSpan, groupMaxY);
                    }
                  }
                  ctx.stroke();
                  ctx.restore();
                }
              } else {
                // Default visual mode: Dashed outline edges
                const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
                const offset = 4.5;
                const tolerance = 0.5;

                activeGroupMods.forEach((module) => {
                  const geom = getModuleGeometry(grid, module.row, module.col);
                  const x = geom.x;
                  const y = geom.y;
                  const width = geom.width;
                  const height = geom.height;
                  const maxX = x + width;
                  const maxY = y + height;

                  // Top
                  const topSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxY = otherGeom.y + otherGeom.height;
                      if (Math.abs(otherMaxY - y) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          topSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredTop = getUncoveredSegments(x, maxX, topSegments);
                  uncoveredTop.forEach((segment) => {
                    edges.push({ x1: segment.start + offset, y1: y + offset, x2: segment.end - offset, y2: y + offset });
                  });

                  // Bottom
                  const bottomSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.y - maxY) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          bottomSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredBottom = getUncoveredSegments(x, maxX, bottomSegments);
                  uncoveredBottom.forEach((segment) => {
                    edges.push({
                      x1: segment.start + offset,
                      y1: y + height - offset,
                      x2: segment.end - offset,
                      y2: y + height - offset
                    });
                  });

                  // Left
                  const leftSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxX = otherGeom.x + otherGeom.width;
                      if (Math.abs(otherMaxX - x) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          leftSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredLeft = getUncoveredSegments(y, maxY, leftSegments);
                  uncoveredLeft.forEach((segment) => {
                    edges.push({ x1: x + offset, y1: segment.start + offset, x2: x + offset, y2: segment.end - offset });
                  });

                  // Right
                  const rightSegments: { start: number; end: number }[] = [];
                  activeGroupMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.x - maxX) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          rightSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredRight = getUncoveredSegments(y, maxY, rightSegments);
                  uncoveredRight.forEach((segment) => {
                    edges.push({
                      x1: x + width - offset,
                      y1: segment.start + offset,
                      x2: x + width - offset,
                      y2: segment.end - offset
                    });
                  });
                });

                const isHovered = grid.hoveredGroupIndex === groupIndex;
                ctx.strokeStyle = isHovered ? '#FF5722' : groupColor;
                ctx.lineWidth = 9;
                ctx.setLineDash([22.5, 10]);
                ctx.beginPath();
                edges.forEach((edge) => {
                  ctx.moveTo(edge.x1, edge.y1);
                  ctx.lineTo(edge.x2, edge.y2);
                });
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }
          });

          // 4. Draw In-Progress Power Selection with Pulsation
          if (isCurrentGrid && grid.selectedModules && grid.selectedModules.length > 0) {
            const pulseOpacity = 0.3 + 0.7 * (Math.sin(time * 0.003) * 0.5 + 0.5);

            if (!altLineStyle) {
              // Legacy mode: Dashed outline with pulsation
              grid.selectedModules.forEach((m) => {
                const geom = getModuleGeometry(grid, m.row, m.col);
                ctx.strokeStyle = `rgba(90, 90, 90, ${pulseOpacity})`;
                ctx.lineWidth = 9;
                ctx.setLineDash([22.5, 10]);
                ctx.strokeRect(geom.x + 4.5, geom.y + 4.5, geom.width - 9, geom.height - 9);
                ctx.setLineDash([]);
              });
            } else {
              // Modern mode: Hatching with pulsation and perimeter inset matching completed groups
              const activeSelectedMods = grid.selectedModules.filter(
                (m) => grid.gridState[m.row] && grid.gridState[m.row][m.col]
              );
              if (activeSelectedMods.length > 0) {
                const nextGroupIdx = grid.selectedGroups.length + 1;
                const nextColorIdx = ((nextGroupIdx - 1) % 3) + 4;
                const groupColor = GROUP_COLORS[(nextColorIdx - 1) % GROUP_COLORS.length] || '#606060';
                const tolerance = 0.5;

                const clipRects: { x: number; y: number; w: number; h: number }[] = [];
                let groupMinX = Infinity, groupMinY = Infinity, groupMaxX = -Infinity, groupMaxY = -Infinity;

                activeSelectedMods.forEach((module) => {
                  const geom = getModuleGeometry(grid, module.row, module.col);
                  const x = geom.x;
                  const y = geom.y;
                  const width = geom.width;
                  const height = geom.height;
                  const maxX = x + width;
                  const maxY = y + height;

                  groupMinX = Math.min(groupMinX, x);
                  groupMinY = Math.min(groupMinY, y);
                  groupMaxX = Math.max(groupMaxX, maxX);
                  groupMaxY = Math.max(groupMaxY, maxY);

                  // Top
                  const topSegments: { start: number; end: number }[] = [];
                  activeSelectedMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxY = otherGeom.y + otherGeom.height;
                      if (Math.abs(otherMaxY - y) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          topSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredTop = getUncoveredSegments(x, maxX, topSegments);

                  // Bottom
                  const bottomSegments: { start: number; end: number }[] = [];
                  activeSelectedMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.y - maxY) < tolerance) {
                        const overlapLeft = Math.max(x, otherGeom.x);
                        const overlapRight = Math.min(maxX, otherGeom.x + otherGeom.width);
                        if (overlapLeft < overlapRight) {
                          bottomSegments.push({ start: overlapLeft, end: overlapRight });
                        }
                      }
                    }
                  });
                  const uncoveredBottom = getUncoveredSegments(x, maxX, bottomSegments);

                  // Left
                  const leftSegments: { start: number; end: number }[] = [];
                  activeSelectedMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      const otherMaxX = otherGeom.x + otherGeom.width;
                      if (Math.abs(otherMaxX - x) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          leftSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredLeft = getUncoveredSegments(y, maxY, leftSegments);

                  // Right
                  const rightSegments: { start: number; end: number }[] = [];
                  activeSelectedMods.forEach((other) => {
                    if (other.row !== module.row || other.col !== module.col) {
                      const otherGeom = getModuleGeometry(grid, other.row, other.col);
                      if (Math.abs(otherGeom.x - maxX) < tolerance) {
                        const overlapTop = Math.max(y, otherGeom.y);
                        const overlapBottom = Math.min(maxY, otherGeom.y + otherGeom.height);
                        if (overlapTop < overlapBottom) {
                          rightSegments.push({ start: overlapTop, end: overlapBottom });
                        }
                      }
                    }
                  });
                  const uncoveredRight = getUncoveredSegments(y, maxY, rightSegments);

                  const minSide = Math.min(width, height);
                  const perimeterInset = Math.ceil((minSide * 6) / 100);

                  const insetTop = uncoveredTop.length > 0 ? perimeterInset : 0;
                  const insetBottom = uncoveredBottom.length > 0 ? perimeterInset : 0;
                  const insetLeft = uncoveredLeft.length > 0 ? perimeterInset : 0;
                  const insetRight = uncoveredRight.length > 0 ? perimeterInset : 0;

                  const clipX = x + insetLeft;
                  const clipY = y + insetTop;
                  const clipW = width - insetLeft - insetRight;
                  const clipH = height - insetTop - insetBottom;

                  if (clipW > 0 && clipH > 0) {
                    clipRects.push({ x: clipX, y: clipY, w: clipW, h: clipH });
                  }
                });

                if (clipRects.length > 0) {
                  const step = 20 - (grid.hatchDensity || 6);
                  const isForwardSlash = nextColorIdx % 2 === 0;

                  const r = parseInt(groupColor.slice(1, 3), 16) || 80;
                  const g = parseInt(groupColor.slice(3, 5), 16) || 80;
                  const b = parseInt(groupColor.slice(5, 7), 16) || 80;

                  ctx.save();
                  ctx.beginPath();
                  clipRects.forEach((rect) => {
                    ctx.rect(rect.x, rect.y, rect.w, rect.h);
                  });
                  ctx.clip();

                  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pulseOpacity})`;
                  ctx.lineWidth = 2.5;

                  const heightSpan = groupMaxY - groupMinY;
                  const startX = Math.floor((groupMinX - heightSpan) / step) * step;
                  const endX = groupMaxX + heightSpan;

                  ctx.beginPath();
                  if (isForwardSlash) {
                    for (let sx = startX; sx <= endX; sx += step) {
                      ctx.moveTo(sx, groupMinY);
                      ctx.lineTo(sx + heightSpan, groupMaxY);
                    }
                  } else {
                    for (let sx = startX; sx <= endX; sx += step) {
                      ctx.moveTo(sx, groupMinY);
                      ctx.lineTo(sx - heightSpan, groupMaxY);
                    }
                  }
                  ctx.stroke();
                  ctx.restore();
                }
              }
            }
          }

          // 5. Draw In-Progress Data Line Connection with Pulsation
          if (isCurrentGrid && grid.currentConnection && grid.currentConnection.length > 0) {
            const pulseOpacity = 0.3 + 0.7 * (Math.sin(time * 0.003) * 0.5 + 0.5);

            // Hatching on in-progress connection points (Only if altLineStyle is OFF)
            if (!altLineStyle) {
              const step = 20 - grid.hatchDensity;
              const lineIndex = grid.currentColorIndex !== null ? grid.currentColorIndex : grid.connections.length;
              const isForwardSlash = lineIndex % 2 === 0;

              grid.currentConnection.forEach((point) => {
                const geom = getModuleGeometry(grid, point.row, point.col);
                ctx.save();
                ctx.beginPath();
                ctx.rect(geom.x, geom.y, geom.width, geom.height);
                ctx.clip();

                const baseColor = (grid.currentColor && grid.currentColor !== '#000000')
                  ? grid.currentColor
                  : MAIN_COLORS[lineIndex % MAIN_COLORS.length];
                const r = parseInt(baseColor.slice(1, 3), 16);
                const g = parseInt(baseColor.slice(3, 5), 16);
                const b = parseInt(baseColor.slice(5, 7), 16);
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${pulseOpacity * 0.5})`;
                ctx.lineWidth = 2;

                if (isForwardSlash) {
                  for (let i = -geom.height; i <= geom.width + geom.height; i += step) {
                    ctx.beginPath();
                    ctx.moveTo(geom.x + i, geom.y);
                    ctx.lineTo(geom.x + i + geom.height, geom.y + geom.height);
                    ctx.stroke();
                  }
                } else {
                  for (let i = -geom.height; i <= geom.width + geom.height; i += step) {
                    ctx.beginPath();
                    ctx.moveTo(geom.x + i, geom.y);
                    ctx.lineTo(geom.x + i - geom.height, geom.y + geom.height);
                    ctx.stroke();
                  }
                }
                ctx.restore();
              });
            } else if (grid.currentConnection.length >= 1) {
              // Modern visual mode: draw a pulsing dot at the center of the first clicked module (start of line)
              const firstPoint = grid.currentConnection[0];
              const geom = getModuleGeometry(grid, firstPoint.row, firstPoint.col);
              const dotRadius = Math.max(3, Math.min(geom.width, geom.height) * 0.06);
              const inProgressColor = altLineStyle ? (grid.currentColor || '#000000') : '#000000';
              ctx.save();
              ctx.fillStyle = inProgressColor;
              ctx.globalAlpha = pulseOpacity;
              ctx.beginPath();
              ctx.arc(geom.centerX, geom.centerY, dotRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            if (grid.currentConnection.length >= 2) {
              const inProgressColor = altLineStyle ? (grid.currentColor || '#000000') : '#000000';
              const lineWidth = Math.max(3, grid.moduleWidth / 30);
              ctx.save();
              ctx.strokeStyle = inProgressColor;
              ctx.globalAlpha = pulseOpacity;
              ctx.lineWidth = lineWidth;
              ctx.beginPath();
              grid.currentConnection.forEach((point, i) => {
                const geom = getModuleGeometry(grid, point.row, point.col);
                if (i === 0) ctx.moveTo(geom.centerX, geom.centerY);
                else ctx.lineTo(geom.centerX, geom.centerY);
              });
              ctx.stroke();
              ctx.restore();

              const last = grid.currentConnection[grid.currentConnection.length - 1];
              const secondLast = grid.currentConnection[grid.currentConnection.length - 2];
              const geom1 = getModuleGeometry(grid, secondLast.row, secondLast.col);
              const geom2 = getModuleGeometry(grid, last.row, last.col);

              const angle = Math.atan2(geom2.centerY - geom1.centerY, geom2.centerX - geom1.centerX);
              const headLength = 40;
              const headWidth = 20;

              ctx.save();
              ctx.fillStyle = inProgressColor;
              ctx.globalAlpha = pulseOpacity;
              ctx.beginPath();
              ctx.moveTo(geom2.centerX, geom2.centerY);
              ctx.lineTo(
                geom2.centerX - headLength * Math.cos(angle) - headWidth * Math.sin(angle),
                geom2.centerY - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
              );
              ctx.lineTo(
                geom2.centerX - headLength * Math.cos(angle),
                geom2.centerY - headLength * Math.sin(angle)
              );
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
          }

          // 6. Highlight Border on Grid Selection Switch with fading ACTIVE badge at bottom-left
          if (gId === highlightedGridId && highlightStartRef.current !== null) {
            const elapsed = time - highlightStartRef.current;
            if (elapsed < HIGHLIGHT_DURATION) {
              let opacity = 0;
              if (elapsed < 300) opacity = elapsed / 300;
              else if (elapsed < 800) opacity = 1.0;
              else opacity = 1.0 - (elapsed - 800) / 300;

              const gridWidth = grid.cols * grid.moduleWidth;
              const gridHeight = grid.rows * grid.moduleHeight;
              const strokeWidth = 8.25; // 1.5x thicker than original 5.5px
              const halfStroke = strokeWidth / 2;

              ctx.save();
              // Red border
              ctx.beginPath();
              ctx.rect(halfStroke, halfStroke, gridWidth - strokeWidth, gridHeight - strokeWidth);
              ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
              ctx.lineWidth = strokeWidth;
              ctx.lineJoin = 'miter';
              ctx.stroke();

              // Active Badge in bottom-left corner (3x size)
              const badgePaddingX = 28;
              const badgeHeight = 66;
              const badgeMargin = strokeWidth + 8;
              const badgeY = gridHeight - strokeWidth - badgeHeight - 8;
              const badgeX = badgeMargin;

              ctx.font = '900 32px Inter, system-ui, -apple-system, sans-serif';
              const text = 'ACTIVE';
              const textWidth = ctx.measureText(text).width;
              const badgeWidth = textWidth + badgePaddingX * 2 + 28; // includes scaled status dot and spacing

              // Badge background
              ctx.fillStyle = `rgba(239, 68, 68, ${0.95 * opacity})`;
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 12);
              } else {
                ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
              }
              ctx.fill();

              // White dot inside badge
              const dotX = badgeX + badgePaddingX;
              const dotY = badgeY + badgeHeight / 2;
              ctx.beginPath();
              ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.fill();

              // ACTIVE text
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, dotX + 20, dotY);

              ctx.restore();
            }
          }

          // 7. Batch Visibility Rectangle Selection Preview
          if (isVisibilityMode && shiftKeyRef.current && hoveredMod) {
            if (grid.rectFirstCorner !== null) {
              const r1 = grid.rectFirstCorner.row;
              const c1 = grid.rectFirstCorner.col;
              const r2 = hoveredMod.row;
              const c2 = hoveredMod.col;

              const isCornerVisible = !!(grid.gridState[r1] && grid.gridState[r1][c1]);
              const targetAction = isCornerVisible ? 'hide' : 'show';

              const g1 = getModuleGeometry(grid, r1, c1);
              const g2 = getModuleGeometry(grid, r2, c2);

              const minX = Math.min(g1.x, g2.x);
              const minY = Math.min(g1.y, g2.y);
              const maxX = Math.max(g1.x + g1.width, g2.x + g2.width);
              const maxY = Math.max(g1.y + g1.height, g2.y + g2.height);

              const rectX = minX;
              const rectY = minY;
              const rectW = maxX - minX;
              const rectH = maxY - minY;

              ctx.save();
              if (targetAction === 'hide') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
                ctx.strokeStyle = '#ef4444';
              } else {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
                ctx.strokeStyle = '#60a5fa';
              }
              ctx.lineWidth = 3;
              ctx.setLineDash([8, 6]);
              ctx.fillRect(rectX, rectY, rectW, rectH);
              ctx.strokeRect(rectX, rectY, rectW, rectH);
              ctx.setLineDash([]);
              ctx.restore();
            } else {
              // Hovered single module preview while Shift is held down before 1st click
              const isHoveredVisible = !!(grid.gridState[hoveredMod.row] && grid.gridState[hoveredMod.row][hoveredMod.col]);
              const geom = getModuleGeometry(grid, hoveredMod.row, hoveredMod.col);
              ctx.save();
              ctx.strokeStyle = isHoveredVisible ? '#ef4444' : '#60a5fa';
              ctx.fillStyle = isHoveredVisible ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.18)';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([6, 4]);
              ctx.fillRect(geom.x, geom.y, geom.width, geom.height);
              ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);
              ctx.setLineDash([]);
              ctx.restore();
            }
          }

          // 8. Erase / Remove Mode Hover Overlay
          if (isCurrentGrid && grid.toolAction === 'erase' && hoveredMod) {
            const { row: hRow, col: hCol } = hoveredMod;
            const pulseOpacity = 0.25 + 0.15 * Math.sin(time * 0.006);

            if (grid.mode === 'data-lines') {
              let targetConnIdx = -1;
              grid.connections.forEach((conn, cIdx) => {
                if (conn.points.some((p) => p.row === hRow && p.col === hCol)) {
                  targetConnIdx = cIdx;
                }
              });

              if (targetConnIdx !== -1) {
                const conn = grid.connections[targetConnIdx];
                const removal = calculateDataLineRemoval(conn, targetConnIdx, hRow, hCol);
                if (removal && removal.removedPoints.length > 0) {
                  ctx.save();
                  removal.removedPoints.forEach((p) => {
                    if (!isValidModuleCell(grid, p.row, p.col)) return;
                    const geom = getModuleGeometry(grid, p.row, p.col);
                    ctx.fillStyle = `rgba(239, 68, 68, ${pulseOpacity + 0.12})`;
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([6, 4]);
                    ctx.fillRect(geom.x, geom.y, geom.width, geom.height);
                    ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);
                  });

                  // Emphasized minus badge on the hovered root module
                  const hGeom = getModuleGeometry(grid, hRow, hCol);
                  const cx = hGeom.x + hGeom.width / 2;
                  const cy = hGeom.y + hGeom.height / 2;
                  const badgeRadius = Math.min(13, Math.min(hGeom.width, hGeom.height) * 0.26);
                  ctx.beginPath();
                  ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
                  ctx.fillStyle = '#dc2626';
                  ctx.fill();
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([]);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(cx - badgeRadius * 0.55, cy);
                  ctx.lineTo(cx + badgeRadius * 0.55, cy);
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 2.4;
                  ctx.lineCap = 'round';
                  ctx.stroke();

                  ctx.restore();
                }
              }
            } else if (grid.mode === 'power-lines') {
              let targetGroupIdx = -1;
              grid.selectedGroups.forEach((g, gIdx) => {
                if (g.modules.some((m) => m.row === hRow && m.col === hCol)) {
                  targetGroupIdx = gIdx;
                }
              });

              if (targetGroupIdx !== -1) {
                const g = grid.selectedGroups[targetGroupIdx];
                const removal = calculatePowerGroupRemoval(g, hRow, hCol);
                if (removal && removal.removedModules.length > 0) {
                  ctx.save();
                  removal.removedModules.forEach((p) => {
                    if (!isValidModuleCell(grid, p.row, p.col)) return;
                    const geom = getModuleGeometry(grid, p.row, p.col);
                    ctx.fillStyle = `rgba(239, 68, 68, ${pulseOpacity + 0.12})`;
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([6, 4]);
                    ctx.fillRect(geom.x, geom.y, geom.width, geom.height);
                    ctx.strokeRect(geom.x, geom.y, geom.width, geom.height);
                  });

                  // Emphasized minus badge on the hovered root module
                  const hGeom = getModuleGeometry(grid, hRow, hCol);
                  const cx = hGeom.x + hGeom.width / 2;
                  const cy = hGeom.y + hGeom.height / 2;
                  const badgeRadius = Math.min(13, Math.min(hGeom.width, hGeom.height) * 0.26);
                  ctx.beginPath();
                  ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
                  ctx.fillStyle = '#dc2626';
                  ctx.fill();
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1.5;
                  ctx.setLineDash([]);
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(cx - badgeRadius * 0.55, cy);
                  ctx.lineTo(cx + badgeRadius * 0.55, cy);
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 2.4;
                  ctx.lineCap = 'round';
                  ctx.stroke();

                  ctx.restore();
                }
              }
            }
          }

          ctx.restore();
        });
      }

      // Draw Drag Mode Visual Aids: Active Screen Boundary, Snapping Guides & Coordinate HUD
      const activeGrid = grids[activeTab];
      const draggedGridId = dragStateRef.current?.gridId;
      const targetDragGrid = draggedGridId ? grids[draggedGridId] : activeGrid;
      const isDragModeActive = (activeTab === 'settings' && canvasDragMode) || (activeGrid && activeGrid.visible && activeGrid.mode === 'drag') || (canvasDragMode && isDraggingState);

      // 1. Draw Smart Snapping Magnetic Guidelines
      const currentDragSnap = activeDragGuidesRef.current;
      if (currentDragSnap && currentDragSnap.guideLines && currentDragSnap.guideLines.length > 0 && isDraggingState) {
        ctx.save();
        currentDragSnap.guideLines.forEach((gl) => {
          ctx.beginPath();
          if (gl.type === 'vertical') {
            ctx.moveTo(gl.position, 0);
            ctx.lineTo(gl.position, outputHeight);
          } else {
            ctx.moveTo(0, gl.position);
            ctx.lineTo(outputWidth, gl.position);
          }
          ctx.strokeStyle = gl.source === 'canvas' ? '#38bdf8' : '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
          ctx.shadowBlur = 8;
          ctx.stroke();
        });
        ctx.restore();
      }

      // 2. Screen Bounding Box, Brackets & Coordinate HUD
      if (isDragModeActive && targetDragGrid && targetDragGrid.visible) {
        const dim = getGridWorldDimensions(targetDragGrid);
        const gx = targetDragGrid.offsetX;
        const gy = targetDragGrid.offsetY;
        const gw = dim.width;
        const gh = dim.height;

        ctx.save();
        const isCurrentlyDragging = isDraggingState || (dragStateRef.current?.isDragging ?? false);
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);

        // Active screen bounds box in drag mode
        if (isCurrentlyDragging) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.7 + 0.3 * pulse})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
        }
        ctx.strokeRect(gx - 1.5, gy - 1.5, gw + 3, gh + 3);
        ctx.setLineDash([]);

        // High-contrast Corner brackets
        const bracketLen = Math.max(14, Math.min(28, Math.min(gw, gh) * 0.15));
        ctx.strokeStyle = isCurrentlyDragging ? '#38bdf8' : '#60a5fa';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'square';

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(gx - 3, gy - 3 + bracketLen);
        ctx.lineTo(gx - 3, gy - 3);
        ctx.lineTo(gx - 3 + bracketLen, gy - 3);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(gx + gw + 3 - bracketLen, gy - 3);
        ctx.lineTo(gx + gw + 3, gy - 3);
        ctx.lineTo(gx + gw + 3, gy - 3 + bracketLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(gx - 3, gy + gh + 3 - bracketLen);
        ctx.lineTo(gx - 3, gy + gh + 3);
        ctx.lineTo(gx - 3 + bracketLen, gy + gh + 3);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(gx + gw + 3 - bracketLen, gy + gh + 3);
        ctx.lineTo(gx + gw + 3, gy + gh + 3);
        ctx.lineTo(gx + gw + 3, gy + gh + 3 - bracketLen);
        ctx.stroke();

        ctx.restore();

        // ================= COORDINATE HUD BADGES (ONLY IN DRAG MODE) =================
        const coordFont = '700 40px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

        const renderGridCoordBadge = (gridId: string, grid: GridModel, isActive: boolean) => {
          const roundX = Math.round(grid.offsetX);
          const roundY = Math.round(grid.offsetY);
          const badgeText = `[${roundX};${roundY}]`;

          ctx.save();
          ctx.font = coordFont;
          const textW = ctx.measureText(badgeText).width;

          const badgePaddingX = 26;
          const badgeH = 72;
          const totalBadgeW = textW + badgePaddingX * 2;

          const badgeX = grid.offsetX + 14;
          const badgeY = grid.offsetY + 14;

          if (isActive) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = isCurrentlyDragging ? '#38bdf8' : '#3b82f6';
            ctx.lineWidth = 3.5;
          } else {
            // Inactive grids: 30% lower intensity for clean secondary hierarchy
            ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.50)';
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
            ctx.lineWidth = 2;
          }

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(badgeX, badgeY, totalBadgeW, badgeH, 14);
          } else {
            ctx.rect(badgeX, badgeY, totalBadgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          // Reset shadow for crisp text rendering
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.textAlign = 'left';
          
          const metrics = ctx.measureText(badgeText);
          const actualAscent = metrics.actualBoundingBoxAscent;
          const actualDescent = metrics.actualBoundingBoxDescent;
          let textY = badgeY + badgeH / 2;

          if (typeof actualAscent === 'number' && typeof actualDescent === 'number' && actualAscent > 0) {
            ctx.textBaseline = 'alphabetic';
            textY = badgeY + badgeH / 2 + (actualAscent - actualDescent) / 2;
          } else {
            ctx.textBaseline = 'middle';
            textY = badgeY + badgeH / 2;
          }

          if (isActive) {
            ctx.fillStyle = '#ffffff';
            ctx.font = coordFont;
            ctx.fillText(badgeText, badgeX + badgePaddingX, textY);
          } else {
            ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
            ctx.font = coordFont;
            ctx.fillText(badgeText, badgeX + badgePaddingX, textY);
          }

          ctx.restore();
        };

        const activeId = draggedGridId || activeTab;
        // Draw inactive grids first
        gridEntries.forEach(([gId, grid]) => {
          if (!grid.visible || gId === activeId) return;
          renderGridCoordBadge(gId, grid, false);
        });

        // Draw active/dragged grid on top
        if (targetDragGrid) {
          renderGridCoordBadge(activeId, targetDragGrid, true);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [grids, activeTab, outputWidth, outputHeight, highlightedGridId, hoveredMod, altLineStyle, cableCurvature, canvasBackground, backgroundColor, gridCellSize, dotsSpacing, patternBrightness]);

  // Global keydown / keyup for modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altKeyRef.current = true;
      if (e.key === 'Shift') shiftKeyRef.current = true;

      // Ignore arrow key interception if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      // Arrow keys movement in Drag mode
      if (!isInput && activeTab !== 'settings') {
        const activeGrid = grids[activeTab];
        if (activeGrid && activeGrid.visible && activeGrid.mode === 'drag') {
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();

            // Shift for fine 10px nudging, otherwise full module pitch
            const stepX = e.shiftKey ? 10 : (activeGrid.moduleWidth || 100);
            const stepY = e.shiftKey ? 10 : (activeGrid.moduleHeight || 100);

            let newX = activeGrid.offsetX;
            let newY = activeGrid.offsetY;

            if (e.key === 'ArrowLeft') newX = Math.max(0, activeGrid.offsetX - stepX);
            if (e.key === 'ArrowRight') newX = activeGrid.offsetX + stepX;
            if (e.key === 'ArrowUp') newY = Math.max(0, activeGrid.offsetY - stepY);
            if (e.key === 'ArrowDown') newY = activeGrid.offsetY + stepY;

            if (newX !== activeGrid.offsetX || newY !== activeGrid.offsetY) {
              onUpdateGrid(
                activeTab,
                (prev) => ({ ...prev, offsetX: newX, offsetY: newY }),
                `Moved screen "${activeGrid.name}" to (${newX}, ${newY})`
              );
            }
            return;
          }
        }
      }

      // ESC: cancel active line, power group, or rect selection
      if (e.key === 'Escape') {
        if (activeTab !== 'settings' && grids[activeTab]) {
          onUpdateGrid(activeTab, (prev) => ({
            ...prev,
            rectFirstCorner: null,
            powerFirstCorner: null,
            selectedModules: [],
            currentConnection: [],
            currentColor: null,
            currentColorIndex: null
          }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altKeyRef.current = false;
      if (e.key === 'Shift') {
        shiftKeyRef.current = false;
        if (activeTab !== 'settings' && grids[activeTab]?.rectFirstCorner !== null) {
          onUpdateGrid(activeTab, (prev) => ({
            ...prev,
            rectFirstCorner: null
          }));
        }
      }
    };

    const handleBlur = () => {
      altKeyRef.current = false;
      shiftKeyRef.current = false;
      if (activeTab !== 'settings' && grids[activeTab]?.rectFirstCorner !== null) {
        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          rectFirstCorner: null
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeTab, grids, onUpdateGrid]);

  // Helper to find grid at coordinates
  const findGridAtCanvasPos = (canvasX: number, canvasY: number) => {
    const gridIds = Object.keys(grids).reverse();
    for (const gridId of gridIds) {
      const grid = grids[gridId];
      if (!grid.visible) continue;
      const x = canvasX - grid.offsetX;
      const y = canvasY - grid.offsetY;
      if (x >= 0 && y >= 0 && x < grid.cols * grid.moduleWidth && y < grid.rows * grid.moduleHeight) {
        const modPos = getModuleAtPosition(grid, x, y);
        if (modPos) {
          return { gridId, grid, row: modPos.row, col: modPos.col };
        }
      }
    }
    return null;
  };

  // Canvas Click Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) / currentScale;
    const canvasY = (e.clientY - rect.top) / currentScale;

    const hit = findGridAtCanvasPos(canvasX, canvasY);

    if (activeTab === 'settings') {
      return;
    }

    if (hit && hit.gridId !== activeTab) {
      onSelectGrid(hit.gridId);
      return;
    }

    const currentGrid = grids[activeTab];
    if (!currentGrid) return;

    if (currentGrid.mode === 'drag') {
      return;
    }

    const relX = canvasX - currentGrid.offsetX;
    const relY = canvasY - currentGrid.offsetY;
    const modulePos = getModuleAtPosition(currentGrid, relX, relY);
    if (!modulePos) return;

    const { row, col } = modulePos;
    const mode = currentGrid.mode;

    // --- ERASE / REMOVE MODE (Remove from Power Group or Data Line) ---
    if (currentGrid.toolAction === 'erase') {
      if (!currentGrid.gridState[row] || !currentGrid.gridState[row][col]) return;

      if (mode === 'data-lines') {
        let targetConnIdx = -1;
        currentGrid.connections.forEach((conn, cIdx) => {
          if (conn.points.some((p) => p.row === row && p.col === col)) {
            targetConnIdx = cIdx;
          }
        });

        if (targetConnIdx === -1) {
          // Empty or unassigned module: do nothing
          return;
        }

        const conn = currentGrid.connections[targetConnIdx];
        const removal = calculateDataLineRemoval(conn, targetConnIdx, row, col);
        if (!removal) return;

        onUpdateGrid(activeTab, (prev) => {
          const newConns = [...prev.connections];
          const newRemovedIndices = [...prev.removedIndices];

          if (removal.isEntireLineRemoved) {
            if (conn.colorIndex !== undefined) {
              newRemovedIndices.push(conn.colorIndex);
            }
            newConns.splice(targetConnIdx, 1);
          } else {
            newConns[targetConnIdx] = {
              ...conn,
              points: removal.keptPoints
            };
          }

          return {
            ...prev,
            connections: newConns,
            removedIndices: newRemovedIndices
          };
        }, removal.isEntireLineRemoved ? `Deleted data line "${conn.name || targetConnIdx + 1}"` : `Cut data line "${conn.name || targetConnIdx + 1}"`);

        onShowTooltip(
          removal.isEntireLineRemoved
            ? `Deleted data line "${conn.name || targetConnIdx + 1}"`
            : `Cut data line at ${getModuleId(currentGrid, row, col)} (${removal.removedPoints.length} cab. removed)`,
          'success'
        );
        return;
      }

      if (mode === 'power-lines') {
        let targetGroupIdx = -1;
        currentGrid.selectedGroups.forEach((g, gIdx) => {
          if (g.modules.some((m) => m.row === row && m.col === col)) {
            targetGroupIdx = gIdx;
          }
        });

        if (targetGroupIdx === -1) {
          // Empty or unassigned module: do nothing
          return;
        }

        const g = currentGrid.selectedGroups[targetGroupIdx];
        const removal = calculatePowerGroupRemoval(g, row, col);
        if (!removal) return;

        onUpdateGrid(activeTab, (prev) => {
          const newGroups = [...prev.selectedGroups];

          if (removal.isEntireGroupRemoved) {
            newGroups.splice(targetGroupIdx, 1);
          } else {
            newGroups[targetGroupIdx] = {
              ...g,
              modules: removal.keptModules
            };
          }

          return {
            ...prev,
            selectedGroups: newGroups
          };
        }, removal.isEntireGroupRemoved ? `Deleted power group ${g.index}` : `Removed ${removal.removedModules.length} cab. from power group ${g.index}`);

        onShowTooltip(
          removal.isEntireGroupRemoved
            ? `Deleted Power Group ${g.index}`
            : `Removed ${removal.removedModules.length} cab. from Power Group ${g.index}`,
          'success'
        );
        return;
      }

      return;
    }

    // --- VISIBILITY (HIDE) MODE ---
    if (mode === 'visibility') {
      if (e.shiftKey) {
        if (currentGrid.rectFirstCorner === null) {
          // Select 1st corner
          onUpdateGrid(activeTab, (prev) => ({
            ...prev,
            rectFirstCorner: { row, col }
          }));
          const isCornerVis = !!(currentGrid.gridState[row] && currentGrid.gridState[row][col]);
          onShowTooltip(
            `Corner 1: ${getModuleId(currentGrid, row, col)} (${isCornerVis ? 'Hide' : 'Show'} mode). Shift+Click Corner 2 to complete.`,
            'success'
          );
        } else {
          // Complete rectangle
          const firstCorner = currentGrid.rectFirstCorner;
          const g1 = getModuleGeometry(currentGrid, firstCorner.row, firstCorner.col);
          const g2 = getModuleGeometry(currentGrid, row, col);

          const minX = Math.min(g1.x, g2.x);
          const minY = Math.min(g1.y, g2.y);
          const maxX = Math.max(g1.x + g1.width, g2.x + g2.width);
          const maxY = Math.max(g1.y + g1.height, g2.y + g2.height);

          const isCornerVis = !!(currentGrid.gridState[firstCorner.row] && currentGrid.gridState[firstCorner.row][firstCorner.col]);
          const targetState = !isCornerVis; // If 1st corner was visible, we hide. If 1st corner was hidden, we restore/unhide.

          const now = performance.now();
          let count = 0;

          onUpdateGrid(activeTab, (prev) => {
            const newState = prev.gridState.map((r) => [...r]);

            for (let r = 0; r < prev.rows; r++) {
              for (let c = 0; c < prev.cols; c++) {
                if (!isValidModuleCell(prev, r, c)) continue;
                const geom = getModuleGeometry(prev, r, c);
                if (
                  geom.x + geom.width > minX &&
                  geom.x < maxX &&
                  geom.y + geom.height > minY &&
                  geom.y < maxY
                ) {
                  newState[r][c] = targetState;
                  animationsRef.current.set(`${activeTab}:${r},${c}`, {
                    type: targetState ? 'show' : 'hide',
                    startTime: now
                  });
                  count++;
                }
              }
            }

            return {
              ...prev,
              gridState: newState,
              rectFirstCorner: null
            };
          }, `${targetState ? 'Restored' : 'Hidden'} ${count} modules`);

          onShowTooltip(
            `${targetState ? 'Restored' : 'Hidden'} ${count} cabinets`,
            'success'
          );
        }
      } else {
        // Single module toggle
        const curState = !!(currentGrid.gridState[row] && currentGrid.gridState[row][col]);
        const targetState = !curState;
        const now = performance.now();

        onUpdateGrid(activeTab, (prev) => {
          const newGState = prev.gridState.map((r) => [...r]);
          newGState[row][col] = targetState;
          animationsRef.current.set(`${activeTab}:${row},${col}`, {
            type: targetState ? 'show' : 'hide',
            startTime: now
          });
          return {
            ...prev,
            gridState: newGState,
            rectFirstCorner: null
          };
        }, `${targetState ? 'Restored' : 'Hidden'} module ${getModuleId(currentGrid, row, col)}`);

        onShowTooltip(
          `${targetState ? 'Restored' : 'Hidden'} cabinet ${getModuleId(currentGrid, row, col)}`,
          'success'
        );
      }
      return;
    }

    // --- POWER LINES MODE ---
    if (mode === 'power-lines') {
      if (!currentGrid.gridState[row] || !currentGrid.gridState[row][col]) return;

      const inOtherPowerGroup = currentGrid.selectedGroups.some((g) =>
        g.modules.some((m) => m.row === row && m.col === col)
      );
      if (inOtherPowerGroup) return;

      const alreadySelected = currentGrid.selectedModules.some((m) => m.row === row && m.col === col);
      if (alreadySelected) return;

      if (currentGrid.selectedModules.length === 0) {
        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          selectedModules: [{ row, col }]
        }));
        return;
      }

      const lastModule = currentGrid.selectedModules[currentGrid.selectedModules.length - 1];
      const isAdjLast = areModulesAdjacent(currentGrid, lastModule.row, lastModule.col, row, col);

      if (isAdjLast) {
        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          selectedModules: [...prev.selectedModules, { row, col }]
        }));
        return;
      }

      let isAdjAny = false;
      for (const sel of currentGrid.selectedModules) {
        if (areModulesAdjacent(currentGrid, sel.row, sel.col, row, col)) {
          isAdjAny = true;
          break;
        }
      }

      if (isAdjAny) {
        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          selectedModules: [...prev.selectedModules, { row, col }]
        }));
        return;
      }

      // Fill bounding rectangle
      const allModules = [...currentGrid.selectedModules, { row, col }];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      allModules.forEach((m) => {
        const geom = getModuleGeometry(currentGrid, m.row, m.col);
        minX = Math.min(minX, geom.x);
        minY = Math.min(minY, geom.y);
        maxX = Math.max(maxX, geom.x + geom.width);
        maxY = Math.max(maxY, geom.y + geom.height);
      });

      const sRow = Math.floor(minY / currentGrid.moduleHeight);
      const eRow = Math.floor((maxY - 1) / currentGrid.moduleHeight);
      const sCol = Math.floor(minX / currentGrid.moduleWidth);
      const eCol = Math.floor((maxX - 1) / currentGrid.moduleWidth);

      const modulesToAdd: Point[] = [];
      for (let r = sRow; r <= eRow; r++) {
        for (let c = sCol; c <= eCol; c++) {
          if (!currentGrid.gridState[r] || !currentGrid.gridState[r][c]) continue;
          const inOther = currentGrid.selectedGroups.some((g) =>
            g.modules.some((m) => m.row === r && m.col === c)
          );
          if (inOther) return;
          const already = currentGrid.selectedModules.some((m) => m.row === r && m.col === c);
          if (!already) modulesToAdd.push({ row: r, col: c });
        }
      }

      onUpdateGrid(activeTab, (prev) => ({
        ...prev,
        selectedModules: [...prev.selectedModules, ...modulesToAdd]
      }));
      return;
    }

    // --- DATA LINES MODE ---
    if (mode === 'data-lines') {
      if (!currentGrid.gridState[row] || !currentGrid.gridState[row][col]) return;

      if (currentGrid.currentConnection.length === 0) {
        const inOther = currentGrid.connections.some((c) =>
          c.points.some((p) => p.row === row && p.col === col)
        );
        if (inOther) return;

        let colorIndex: number;
        const newRemoved = [...currentGrid.removedIndices];
        if (newRemoved.length > 0) {
          newRemoved.sort((a, b) => a - b);
          colorIndex = newRemoved.shift()!;
        } else {
          colorIndex = currentGrid.connections.length;
        }

        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          removedIndices: newRemoved,
          currentColor: altLineStyle ? '#000000' : MAIN_COLORS[colorIndex % MAIN_COLORS.length],
          currentColorIndex: colorIndex,
          currentConnection: [{ row, col }]
        }));
      } else {
        const lastP = currentGrid.currentConnection[currentGrid.currentConnection.length - 1];
        const interpolated = interpolatePoints(currentGrid, lastP, { row, col });

        onUpdateGrid(activeTab, (prev) => {
          const newConnection = [...prev.currentConnection];
          for (const p of interpolated) {
            const inOther = prev.connections.some((c) =>
              c.points.some((cp) => cp.row === p.row && cp.col === p.col)
            );
            if (inOther) return prev;

            const alreadyInCurrent = newConnection.some((cp) => cp.row === p.row && cp.col === p.col);
            if (!alreadyInCurrent) {
              newConnection.push(p);
            }
          }
          return { ...prev, currentConnection: newConnection };
        });
      }
    }
  };

  // Canvas Double Click Handler (Switch to Grid from Canvas / Complete Line / Power Group)
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) / currentScale;
      const canvasY = (e.clientY - rect.top) / currentScale;
      const hit = findGridAtCanvasPos(canvasX, canvasY);

      // If currently on the Canvas tab, double-clicking a grid switches to that grid's tab
      if (activeTab === 'settings') {
        if (hit) {
          onSelectGrid(hit.gridId);
        }
        return;
      }
    }

    const currentGrid = grids[activeTab];
    if (!currentGrid) return;
    if (currentGrid.toolAction === 'erase') return;

    const mode = currentGrid.mode;

    // Power Group complete
    if (mode === 'power-lines' && currentGrid.selectedModules.length > 0) {
      // Use strictly the exact modules selected by the user (preserving custom L-shapes, polygons, etc.)
      // and ensure no modules overlap with already existing power groups
      const existingGroupModules = new Set(
        currentGrid.selectedGroups.flatMap((g) => g.modules.map((m) => `${m.row},${m.col}`))
      );

      const seen = new Set<string>();
      const finalModules: Point[] = [];

      for (const m of currentGrid.selectedModules) {
        const key = `${m.row},${m.col}`;
        if (
          !seen.has(key) &&
          !existingGroupModules.has(key) &&
          currentGrid.gridState[m.row] &&
          currentGrid.gridState[m.row][m.col]
        ) {
          seen.add(key);
          finalModules.push(m);
        }
      }

      if (finalModules.length === 0) {
        onUpdateGrid(activeTab, (prev) => ({
          ...prev,
          selectedModules: []
        }));
        return;
      }

      const groupIdx = currentGrid.selectedGroups.length + 1;
      const colorIdx = ((groupIdx - 1) % 3) + 4;

      onUpdateGrid(activeTab, (prev) => ({
        ...prev,
        selectedGroups: [
          ...prev.selectedGroups,
          { index: groupIdx, colorIndex: colorIdx, modules: finalModules }
        ],
        selectedModules: []
      }), `Created power group (${finalModules.length} cab.)`);
      onShowTooltip(`Created power group (${finalModules.length} cabinets)`, 'success');
      return;
    }

    // Data Line complete
    if (mode === 'data-lines' && currentGrid.currentConnection.length >= 1) {
      const lineIndex =
        currentGrid.currentColorIndex !== null
          ? currentGrid.currentColorIndex
          : currentGrid.connections.length;
      const namingMode = currentGrid.dataLineNamingMode || (currentGrid.useDefaultNames ? '1.1-1.9' : 'none');
      const { name, endName } = computeDataLineNames(namingMode, lineIndex);

      onUpdateGrid(activeTab, (prev) => ({
        ...prev,
        connections: [
          ...prev.connections,
          {
            points: [...prev.currentConnection],
            color: altLineStyle
              ? (prev.currentColor || '#000000')
              : ((prev.currentColor && prev.currentColor !== '#000000') ? prev.currentColor : MAIN_COLORS[lineIndex % MAIN_COLORS.length]),
            colorIndex: lineIndex,
            name,
            endName
          }
        ],
        currentConnection: [],
        currentColor: null,
        currentColorIndex: null
      }), `Created data line "${name || lineIndex + 1}"`);
      onShowTooltip(`Created data line ${name || lineIndex + 1} (${currentGrid.currentConnection.length} cabinets)`, 'success');
    }
  };

  // Mouse Down for drag mode
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) / currentScale;
    const canvasY = (e.clientY - rect.top) / currentScale;

    const hit = findGridAtCanvasPos(canvasX, canvasY);
    const currentGrid = grids[activeTab];
    const isDragAllowed = (activeTab === 'settings' && canvasDragMode) || currentGrid?.mode === 'drag' || (hit && hit.grid.mode === 'drag');

    if (isDragAllowed && hit) {
      if (hit.gridId !== activeTab && activeTab !== 'settings') {
        onSelectGrid(hit.gridId);
      }
      dragStateRef.current = {
        isDragging: true,
        gridId: hit.gridId,
        startMouseCanvasX: canvasX,
        startMouseCanvasY: canvasY,
        startOffsetX: hit.grid.offsetX,
        startOffsetY: hit.grid.offsetY,
        currentOffsetX: hit.grid.offsetX,
        currentOffsetY: hit.grid.offsetY,
        hasMoved: false,
      };
      setIsDraggingState(true);
      activeDragGuidesRef.current = null;
    }
  };

  // Window drag listeners (allows smooth dragging across the entire screen)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.isDragging) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) / currentScale;
      const canvasY = (e.clientY - rect.top) / currentScale;

      const deltaX = canvasX - dragState.startMouseCanvasX;
      const deltaY = canvasY - dragState.startMouseCanvasY;

      if (!dragState.hasMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        dragState.hasMoved = true;
      }

      const rawOffsetX = dragState.startOffsetX + deltaX;
      const rawOffsetY = dragState.startOffsetY + deltaY;

      const targetGrid = grids[dragState.gridId];
      if (!targetGrid) return;

      const snapResult = computeDragSnap(
        targetGrid,
        dragState.gridId,
        rawOffsetX,
        rawOffsetY,
        grids,
        outputWidth,
        outputHeight,
        currentScale,
        dragOptions
      );

      dragState.currentOffsetX = snapResult.snappedX;
      dragState.currentOffsetY = snapResult.snappedY;
      activeDragGuidesRef.current = snapResult;

      onUpdateGrid(dragState.gridId, (prev) => ({
        ...prev,
        offsetX: snapResult.snappedX,
        offsetY: snapResult.snappedY,
      }));
    };

    const handleWindowMouseUp = () => {
      const dragState = dragStateRef.current;
      if (!dragState || !dragState.isDragging) return;

      if (dragState.hasMoved) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 80);

        const targetGrid = grids[dragState.gridId];
        if (targetGrid) {
          const movedX = dragState.currentOffsetX !== dragState.startOffsetX;
          const movedY = dragState.currentOffsetY !== dragState.startOffsetY;
          if (movedX || movedY) {
            onUpdateGrid(
              dragState.gridId,
              (prev) => ({
                ...prev,
                offsetX: dragState.currentOffsetX,
                offsetY: dragState.currentOffsetY,
              }),
              `Moved screen "${targetGrid.name}" to (${dragState.currentOffsetX}, ${dragState.currentOffsetY})`
            );
          }
        }
      }

      dragStateRef.current = null;
      activeDragGuidesRef.current = null;
      setIsDraggingState(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [currentScale, grids, outputWidth, outputHeight, dragOptions, onUpdateGrid]);

  useEffect(() => {
    if (canvasRef.current) {
      const isDrag = (activeTab === 'settings' && canvasDragMode) || grids[activeTab]?.mode === 'drag';
      canvasRef.current.style.cursor = getCanvasCursor(
        cursorOverGridRef.current,
        cursorOverAnyGridRef.current,
        isDraggingState,
        grids[activeTab]?.mode,
        grids[activeTab]?.toolAction,
        isDrag
      );
    }
  }, [activeTab, grids[activeTab]?.mode, grids[activeTab]?.toolAction, isDraggingState, canvasDragMode]);

  // Mouse Move on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) / currentScale;
    const canvasY = (e.clientY - rect.top) / currentScale;

    const hit = findGridAtCanvasPos(canvasX, canvasY);
    const isOverActive = hit ? hit.gridId === activeTab : false;
    const isOverAny = hit !== null;
    cursorOverGridRef.current = isOverActive;
    cursorOverAnyGridRef.current = isOverAny;

    const currentGrid = grids[activeTab];
    const isDrag = (activeTab === 'settings' && canvasDragMode) || currentGrid?.mode === 'drag';
    canvas.style.cursor = getCanvasCursor(
      isOverActive,
      isOverAny,
      isDraggingState || (dragStateRef.current?.isDragging ?? false),
      currentGrid?.mode,
      currentGrid?.toolAction,
      isDrag
    );

    if (hit && hit.gridId === activeTab) {
      setHoveredMod({ row: hit.row, col: hit.col });

      // Erase Mode Dynamic Hover Tooltip
      if (currentGrid && currentGrid.toolAction === 'erase') {
        const { row: hRow, col: hCol } = hit;
        if (currentGrid.mode === 'data-lines') {
          let targetConnIdx = -1;
          currentGrid.connections.forEach((conn, cIdx) => {
            if (conn.points.some((p) => p.row === hRow && p.col === hCol)) {
              targetConnIdx = cIdx;
            }
          });

          if (targetConnIdx !== -1) {
            const conn = currentGrid.connections[targetConnIdx];
            const removal = calculateDataLineRemoval(conn, targetConnIdx, hRow, hCol);
            if (removal) {
              if (removal.isEntireLineRemoved) {
                onShowTooltip(`Remove entire data line "${conn.name || targetConnIdx + 1}" (${removal.removedPoints.length} cab.)`, 'error');
              } else {
                onShowTooltip(`Cut data line at ${getModuleId(currentGrid, hRow, hCol)} (${removal.removedPoints.length} cab. to remove)`, 'error');
              }
            }
          }
        } else if (currentGrid.mode === 'power-lines') {
          let targetGroupIdx = -1;
          currentGrid.selectedGroups.forEach((g, gIdx) => {
            if (g.modules.some((m) => m.row === hRow && m.col === hCol)) {
              targetGroupIdx = gIdx;
            }
          });

          if (targetGroupIdx !== -1) {
            const g = currentGrid.selectedGroups[targetGroupIdx];
            const removal = calculatePowerGroupRemoval(g, hRow, hCol);
            if (removal) {
              if (removal.isEntireGroupRemoved) {
                onShowTooltip(`Remove Power Group ${g.index} (${removal.removedModules.length} cab.)`, 'error');
              } else if (removal.removedModules.length === 1) {
                onShowTooltip(`Remove cabinet ${getModuleId(currentGrid, hRow, hCol)} from Power Group ${g.index}`, 'error');
              } else {
                onShowTooltip(`Remove cab. ${getModuleId(currentGrid, hRow, hCol)} + ${removal.removedModules.length - 1} disconnected from Group ${g.index}`, 'error');
              }
            }
          }
        }
      }
    } else {
      setHoveredMod(null);
    }
  };

  const handleMouseLeave = () => {
    cursorOverGridRef.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    setHoveredMod(null);
  };

  // Edge-aware Mouse Wheel Scroll:
  // - Wheel near left & right edges -> Vertical scroll (scrollTop)
  // - Wheel near top & bottom edges -> Horizontal scroll (scrollLeft)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // If Ctrl / Meta is pressed (standard browser zoom / pinch gesture), let default browser zoom proceed
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate distances from the mouse pointer to the 4 container edges
      const distLeft = Math.max(0, mouseX);
      const distRight = Math.max(0, rect.width - mouseX);
      const distTop = Math.max(0, mouseY);
      const distBottom = Math.max(0, rect.height - mouseY);

      const minHorizontalEdgeDist = Math.min(distTop, distBottom); // Distance to top or bottom edge
      const minVerticalEdgeDist = Math.min(distLeft, distRight);   // Distance to left or right edge

      // Normalized proximity relative to dimensions
      const normTopBottom = minHorizontalEdgeDist / rect.height;
      const normLeftRight = minVerticalEdgeDist / rect.width;

      // Wheel delta
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;

      if (normTopBottom < normLeftRight) {
        // Closer to top or bottom edge -> Scroll Horizontally
        container.scrollLeft += delta;
      } else {
        // Closer to left or right edge -> Scroll Vertically
        container.scrollTop += delta;
      }

      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef]);

  const rulerSize = showRulers ? RULER_THICKNESS : 0;

  return (
    <div
      id="canvasContainer"
      ref={containerRef}
      className="flex-1 overflow-auto relative select-none bg-[#151518]"
    >
      <div
        className="relative"
        style={{
          width: `${outputWidth * currentScale + rulerSize}px`,
          height: `${outputHeight * currentScale + rulerSize}px`,
          minWidth: '100%',
          minHeight: '100%'
        }}
      >
        {/* Visual Coordinate Top Ruler (Corner + Horizontal Ruler) */}
        {showRulers && (
          <CanvasRulersTop
            outputWidth={outputWidth}
            outputHeight={outputHeight}
            scale={currentScale}
            rulerSize={RULER_THICKNESS}
          />
        )}

        {/* Row: Left Vertical Ruler + Canvas Stage Area */}
        <div className="flex">
          {showRulers && (
            <CanvasRulersLeft
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              scale={currentScale}
              rulerSize={RULER_THICKNESS}
            />
          )}

          <div
            className="relative"
            style={{
              width: `${outputWidth * currentScale}px`,
              height: `${outputHeight * currentScale}px`,
              ...getCanvasWrapperBackgroundStyle(canvasBackground)
            }}
          >
            <canvas
              id="gridCanvas"
              ref={canvasRef}
              className="block absolute top-0 left-0 origin-top-left"
              style={{
                transform: `scale(${currentScale})`,
                cursor: getCanvasCursor(
                  cursorOverGridRef.current,
                  cursorOverAnyGridRef.current,
                  isDraggingState,
                  grids[activeTab]?.mode,
                  grids[activeTab]?.toolAction
                )
              }}
              onMouseDown={handleMouseDown}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
