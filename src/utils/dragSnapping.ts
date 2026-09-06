import { GridModel } from '../types';
import { getModuleGeometry } from './geometry';

export interface DragGuideLine {
  type: 'vertical' | 'horizontal';
  position: number; // world x for vertical, world y for horizontal
  source: 'canvas' | 'grid';
  label: string;
}

export interface DragSnapResult {
  snappedX: number;
  snappedY: number;
  guideLines: DragGuideLine[];
  snapLabelX?: string;
  snapLabelY?: string;
  isSnappedToGridX?: boolean;
  isSnappedToGridY?: boolean;
  isSnappedToCanvasX?: boolean;
  isSnappedToCanvasY?: boolean;
}

export interface DragSnapOptions {
  snapToGrids?: boolean;
  snapToCanvas?: boolean;
  snapToModuleStep?: boolean;
}

/**
 * Returns total outer bounding box dimensions for a grid (in px / world coordinates)
 */
export function getGridWorldDimensions(grid: GridModel): { width: number; height: number } {
  let w = grid.cols * (grid.moduleWidth || 100);
  let h = grid.rows * (grid.moduleHeight || 100);

  if (grid.customModules && grid.customModules.length > 0) {
    grid.customModules.forEach((cm) => {
      const geom = getModuleGeometry(grid, cm.row, cm.col);
      w = Math.max(w, geom.x + geom.width);
      h = Math.max(h, geom.y + geom.height);
    });
  }

  return { width: w, height: h };
}

interface SnapCandidate {
  targetOffset: number;
  guidePos: number;
  source: 'canvas' | 'grid';
  label: string;
  isGrid: boolean;
  isCanvas: boolean;
}

/**
 * Computes snapped coordinates (offsetX, offsetY) and smart guide lines when moving a grid.
 */
export function computeDragSnap(
  currentGrid: GridModel,
  dragGridId: string,
  rawOffsetX: number,
  rawOffsetY: number,
  grids: Record<string, GridModel>,
  outputWidth: number,
  outputHeight: number,
  currentScale: number = 1,
  options: DragSnapOptions = {}
): DragSnapResult {
  const {
    snapToGrids = true,
    snapToCanvas = true,
    snapToModuleStep = true,
  } = options;

  const curDim = getGridWorldDimensions(currentGrid);
  const curW = curDim.width;
  const curH = curDim.height;

  const stepX = currentGrid.moduleWidth || 100;
  const stepY = currentGrid.moduleHeight || 100;

  // Snapping threshold in world coordinates (scales with zoom for consistent feel ~16px on screen)
  const threshold = Math.max(12, 16 / Math.max(0.1, currentScale));

  const xCandidates: SnapCandidate[] = [];
  const yCandidates: SnapCandidate[] = [];

  // 1. Canvas Boundary & Center Targets
  if (snapToCanvas && outputWidth > 0 && outputHeight > 0) {
    // Left edge (0)
    xCandidates.push({
      targetOffset: 0,
      guidePos: 0,
      source: 'canvas',
      label: 'Canvas Left',
      isGrid: false,
      isCanvas: true,
    });
    // Canvas Horizontal Center
    const canvasCenterX = Math.round(outputWidth / 2);
    xCandidates.push({
      targetOffset: Math.round((outputWidth - curW) / 2),
      guidePos: canvasCenterX,
      source: 'canvas',
      label: 'Canvas Center',
      isGrid: false,
      isCanvas: true,
    });
    // Canvas Right edge
    xCandidates.push({
      targetOffset: outputWidth - curW,
      guidePos: outputWidth,
      source: 'canvas',
      label: 'Canvas Right',
      isGrid: false,
      isCanvas: true,
    });

    // Top edge (0)
    yCandidates.push({
      targetOffset: 0,
      guidePos: 0,
      source: 'canvas',
      label: 'Canvas Top',
      isGrid: false,
      isCanvas: true,
    });
    // Canvas Vertical Center
    const canvasCenterY = Math.round(outputHeight / 2);
    yCandidates.push({
      targetOffset: Math.round((outputHeight - curH) / 2),
      guidePos: canvasCenterY,
      source: 'canvas',
      label: 'Canvas Center',
      isGrid: false,
      isCanvas: true,
    });
    // Canvas Bottom edge
    yCandidates.push({
      targetOffset: outputHeight - curH,
      guidePos: outputHeight,
      source: 'canvas',
      label: 'Canvas Bottom',
      isGrid: false,
      isCanvas: true,
    });
  }

  // 2. Inter-Grid Targets (adjacent flush docking and edge/center alignment)
  if (snapToGrids) {
    Object.entries(grids).forEach(([otherId, otherGrid]) => {
      if (otherId === dragGridId || !otherGrid.visible) return;

      const otherDim = getGridWorldDimensions(otherGrid);
      const otherLeft = otherGrid.offsetX;
      const otherRight = otherGrid.offsetX + otherDim.width;
      const otherTop = otherGrid.offsetY;
      const otherBottom = otherGrid.offsetY + otherDim.height;
      const otherCenterX = Math.round(otherLeft + otherDim.width / 2);
      const otherCenterY = Math.round(otherTop + otherDim.height / 2);

      const name = otherGrid.name || `Screen ${otherId}`;

      // X Snap targets:
      // A) Flush dock to right of other grid
      xCandidates.push({
        targetOffset: otherRight,
        guidePos: otherRight,
        source: 'grid',
        label: `${name} (Right edge)`,
        isGrid: true,
        isCanvas: false,
      });
      // B) Flush dock to left of other grid
      xCandidates.push({
        targetOffset: otherLeft - curW,
        guidePos: otherLeft,
        source: 'grid',
        label: `${name} (Left edge)`,
        isGrid: true,
        isCanvas: false,
      });
      // C) Align Left edges
      xCandidates.push({
        targetOffset: otherLeft,
        guidePos: otherLeft,
        source: 'grid',
        label: `${name} (Align Left)`,
        isGrid: true,
        isCanvas: false,
      });
      // D) Align Right edges
      xCandidates.push({
        targetOffset: otherRight - curW,
        guidePos: otherRight,
        source: 'grid',
        label: `${name} (Align Right)`,
        isGrid: true,
        isCanvas: false,
      });
      // E) Align Centers
      xCandidates.push({
        targetOffset: Math.round(otherCenterX - curW / 2),
        guidePos: otherCenterX,
        source: 'grid',
        label: `${name} (Align Center)`,
        isGrid: true,
        isCanvas: false,
      });

      // Y Snap targets:
      // A) Flush dock below other grid
      yCandidates.push({
        targetOffset: otherBottom,
        guidePos: otherBottom,
        source: 'grid',
        label: `${name} (Bottom edge)`,
        isGrid: true,
        isCanvas: false,
      });
      // B) Flush dock above other grid
      yCandidates.push({
        targetOffset: otherTop - curH,
        guidePos: otherTop,
        source: 'grid',
        label: `${name} (Top edge)`,
        isGrid: true,
        isCanvas: false,
      });
      // C) Align Top edges
      yCandidates.push({
        targetOffset: otherTop,
        guidePos: otherTop,
        source: 'grid',
        label: `${name} (Align Top)`,
        isGrid: true,
        isCanvas: false,
      });
      // D) Align Bottom edges
      yCandidates.push({
        targetOffset: otherBottom - curH,
        guidePos: otherBottom,
        source: 'grid',
        label: `${name} (Align Bottom)`,
        isGrid: true,
        isCanvas: false,
      });
      // E) Align Centers
      yCandidates.push({
        targetOffset: Math.round(otherCenterY - curH / 2),
        guidePos: otherCenterY,
        source: 'grid',
        label: `${name} (Align Center)`,
        isGrid: true,
        isCanvas: false,
      });
    });
  }

  // Evaluate closest X candidate
  let bestX: SnapCandidate | null = null;
  let bestXDist = threshold;

  for (const cand of xCandidates) {
    const dist = Math.abs(rawOffsetX - cand.targetOffset);
    if (dist < bestXDist) {
      bestXDist = dist;
      bestX = cand;
    }
  }

  // Evaluate closest Y candidate
  let bestY: SnapCandidate | null = null;
  let bestYDist = threshold;

  for (const cand of yCandidates) {
    const dist = Math.abs(rawOffsetY - cand.targetOffset);
    if (dist < bestYDist) {
      bestYDist = dist;
      bestY = cand;
    }
  }

  const guideLines: DragGuideLine[] = [];
  let snappedX = rawOffsetX;
  let snappedY = rawOffsetY;
  let snapLabelX: string | undefined;
  let snapLabelY: string | undefined;
  let isSnappedToGridX = false;
  let isSnappedToGridY = false;
  let isSnappedToCanvasX = false;
  let isSnappedToCanvasY = false;

  // Resolve X
  if (bestX) {
    snappedX = bestX.targetOffset;
    snapLabelX = bestX.label;
    isSnappedToGridX = bestX.isGrid;
    isSnappedToCanvasX = bestX.isCanvas;
    guideLines.push({
      type: 'vertical',
      position: bestX.guidePos,
      source: bestX.source,
      label: bestX.label,
    });
  } else if (snapToModuleStep && stepX > 0) {
    snappedX = Math.round(rawOffsetX / stepX) * stepX;
  } else {
    snappedX = Math.round(rawOffsetX);
  }

  // Resolve Y
  if (bestY) {
    snappedY = bestY.targetOffset;
    snapLabelY = bestY.label;
    isSnappedToGridY = bestY.isGrid;
    isSnappedToCanvasY = bestY.isCanvas;
    guideLines.push({
      type: 'horizontal',
      position: bestY.guidePos,
      source: bestY.source,
      label: bestY.label,
    });
  } else if (snapToModuleStep && stepY > 0) {
    snappedY = Math.round(rawOffsetY / stepY) * stepY;
  } else {
    snappedY = Math.round(rawOffsetY);
  }

  // Ensure positive coordinates
  snappedX = Math.max(0, snappedX);
  snappedY = Math.max(0, snappedY);

  return {
    snappedX,
    snappedY,
    guideLines,
    snapLabelX,
    snapLabelY,
    isSnappedToGridX,
    isSnappedToGridY,
    isSnappedToCanvasX,
    isSnappedToCanvasY,
  };
}
