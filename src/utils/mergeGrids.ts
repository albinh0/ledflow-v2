import { GridModel, DataLineConnection, PowerGroup, CustomModule, Point, MergedSubGrid } from '../types';
import { getModuleGeometry, getModuleId } from './geometry';

/**
 * Calculate greatest common divisor of two integers
 */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export interface MergeGridsOptions {
  gridIdsToMerge: string[];
  allGrids: Record<string, GridModel>;
  mergedName: string;
  keepOriginals?: boolean;
  customOffsets?: Record<string, { offsetX: number; offsetY: number }>;
}

export interface MergeGridsResult {
  mergedGrid: GridModel;
  newGridsMap: Record<string, GridModel>;
  mergedGridId: string;
}

export interface GridWorldBounds {
  gridId: string;
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getGridWorldBounds(
  grid: GridModel,
  gridId: string,
  customOffset?: { offsetX: number; offsetY: number }
): GridWorldBounds {
  const offX = customOffset ? customOffset.offsetX : grid.offsetX;
  const offY = customOffset ? customOffset.offsetY : grid.offsetY;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasActive = false;

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.gridState[r] && grid.gridState[r][c]) {
        const geom = getModuleGeometry(grid, r, c);
        const x1 = offX + geom.x;
        const y1 = offY + geom.y;
        const x2 = x1 + geom.width;
        const y2 = y1 + geom.height;
        if (x1 < minX) minX = x1;
        if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
        hasActive = true;
      }
    }
  }

  if (!hasActive) {
    minX = offX;
    minY = offY;
    maxX = offX + grid.cols * grid.moduleWidth;
    maxY = offY + grid.rows * grid.moduleHeight;
  }

  return {
    gridId,
    name: grid.name,
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

export interface OverlapPair {
  gridId1: string;
  gridName1: string;
  gridId2: string;
  gridName2: string;
}

export interface OverlapInfo {
  hasOverlap: boolean;
  overlappingPairs: OverlapPair[];
}

export function checkGridsOverlap(
  gridIds: string[],
  allGrids: Record<string, GridModel>,
  customOffsets?: Record<string, { offsetX: number; offsetY: number }>
): OverlapInfo {
  if (!gridIds || !allGrids || gridIds.length <= 1) {
    return {
      hasOverlap: false,
      overlappingPairs: []
    };
  }

  const boundsList = gridIds
    .map((id) => (allGrids[id] ? getGridWorldBounds(allGrids[id], id, customOffsets?.[id]) : null))
    .filter((b): b is GridWorldBounds => b !== null);

  const overlappingPairs: OverlapPair[] = [];

  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const a = boundsList[i];
      const b = boundsList[j];

      // Two rectangles overlap if:
      const isOverlapping = a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
      if (isOverlapping) {
        overlappingPairs.push({
          gridId1: a.gridId,
          gridName1: a.name,
          gridId2: b.gridId,
          gridName2: b.name
        });
      }
    }
  }

  return {
    hasOverlap: overlappingPairs.length > 0,
    overlappingPairs
  };
}

export type ShiftDirection = 'none' | 'right' | 'bottom' | 'auto';

export function calculateShiftedOffsets(
  gridIds: string[],
  allGrids: Record<string, GridModel>,
  direction: ShiftDirection
): Record<string, { offsetX: number; offsetY: number }> {
  const result: Record<string, { offsetX: number; offsetY: number }> = {};

  if (!gridIds || !allGrids) {
    return result;
  }

  gridIds.forEach((id) => {
    const g = allGrids[id];
    if (g) {
      result[id] = { offsetX: g.offsetX, offsetY: g.offsetY };
    }
  });

  const validGrids = gridIds
    .map((id) => ({ id, grid: allGrids[id] }))
    .filter((item): item is { id: string; grid: GridModel } => Boolean(item.grid));

  if (direction === 'none' || validGrids.length <= 1) {
    return result;
  }

  if (direction === 'right') {
    // Sort by current offsetX
    validGrids.sort((a, b) => a.grid.offsetX - b.grid.offsetX);
    let currentX = validGrids[0].grid.offsetX;

    for (let i = 0; i < validGrids.length; i++) {
      const { id, grid } = validGrids[i];
      const bounds = getGridWorldBounds(grid, id, { offsetX: 0, offsetY: 0 });
      result[id] = { offsetX: currentX, offsetY: grid.offsetY };
      currentX += bounds.width;
    }
  } else if (direction === 'bottom') {
    // Sort by current offsetY
    validGrids.sort((a, b) => a.grid.offsetY - b.grid.offsetY);
    let currentY = validGrids[0].grid.offsetY;

    for (let i = 0; i < validGrids.length; i++) {
      const { id, grid } = validGrids[i];
      const bounds = getGridWorldBounds(grid, id, { offsetX: 0, offsetY: 0 });
      result[id] = { offsetX: grid.offsetX, offsetY: currentY };
      currentY += bounds.height;
    }
  } else if (direction === 'auto') {
    // Progressively resolve overlaps along the closest non-colliding axis
    for (let i = 0; i < validGrids.length; i++) {
      for (let j = 0; j < i; j++) {
        const idA = validGrids[j].id;
        const idB = validGrids[i].id;
        const boundsA = getGridWorldBounds(validGrids[j].grid, idA, result[idA]);
        const boundsB = getGridWorldBounds(validGrids[i].grid, idB, result[idB]);

        if (
          boundsA.minX < boundsB.maxX &&
          boundsA.maxX > boundsB.minX &&
          boundsA.minY < boundsB.maxY &&
          boundsA.maxY > boundsB.minY
        ) {
          const overlapX = Math.min(boundsA.maxX, boundsB.maxX) - Math.max(boundsA.minX, boundsB.minX);
          const overlapY = Math.min(boundsA.maxY, boundsB.maxY) - Math.max(boundsA.minY, boundsB.minY);

          if (overlapX <= overlapY) {
            result[idB].offsetX = boundsA.maxX;
          } else {
            result[idB].offsetY = boundsA.maxY;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Merge multiple grids into a single unified GridModel
 * Preserves all cabinet positions, custom sizes, data lines, and power groups.
 */
export function mergeGrids({
  gridIdsToMerge,
  allGrids,
  mergedName,
  keepOriginals = false,
  customOffsets
}: MergeGridsOptions): MergeGridsResult {
  const sourceGrids = gridIdsToMerge
    .map((id) => ({ id, grid: allGrids[id] }))
    .filter((item): item is { id: string; grid: GridModel } => Boolean(item.grid));

  if (sourceGrids.length === 0) {
    throw new Error('No valid grids selected for merge');
  }

  // Primary template grid for styling defaults
  const primaryGrid = sourceGrids[0].grid;

  // 1. Determine base unit module width and height
  let baseWidth = primaryGrid.moduleWidth;
  let baseHeight = primaryGrid.moduleHeight;

  for (const { grid } of sourceGrids) {
    baseWidth = gcd(baseWidth, grid.moduleWidth);
    baseHeight = gcd(baseHeight, grid.moduleHeight);
    if (grid.customModules && grid.customModules.length > 0) {
      for (const cm of grid.customModules) {
        baseWidth = gcd(baseWidth, cm.width);
        baseHeight = gcd(baseHeight, cm.height);
      }
    }
  }

  // Ensure reasonable minimum base unit
  baseWidth = Math.max(10, baseWidth);
  baseHeight = Math.max(10, baseHeight);

  // 2. Extract all active modules from all source grids with absolute world coordinates
  interface ExtractedModule {
    sourceGridId: string;
    origRow: number;
    origCol: number;
    absX: number;
    absY: number;
    width: number;
    height: number;
    color: string;
    labelColor: string;
    anchor?: any;
  }

  const extractedModules: ExtractedModule[] = [];

  for (const { id: gridId, grid } of sourceGrids) {
    const offX = customOffsets?.[gridId]?.offsetX ?? grid.offsetX;
    const offY = customOffsets?.[gridId]?.offsetY ?? grid.offsetY;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.gridState[r] && grid.gridState[r][c]) {
          const geom = getModuleGeometry(grid, r, c);
          const absX = offX + geom.x;
          const absY = offY + geom.y;
          const custom = grid.customModules?.find((cm) => cm.row === r && cm.col === c);
          const modColor = grid.moduleColors?.[`${r},${c}`] || custom?.color || grid.moduleColor || '#282828';
          const modLabelColor = custom?.labelColor || grid.moduleLabelColor || '#E6E6E6';

          extractedModules.push({
            sourceGridId: gridId,
            origRow: r,
            origCol: c,
            absX,
            absY,
            width: geom.width,
            height: geom.height,
            color: modColor,
            labelColor: modLabelColor,
            anchor: custom?.anchor || 'top-left'
          });
        }
      }
    }
  }

  // Fallback if grids were completely empty
  let minAbsX = 0;
  let minAbsY = 0;
  let maxAbsX = 1000;
  let maxAbsY = 1000;

  if (extractedModules.length > 0) {
    minAbsX = Math.min(...extractedModules.map((m) => m.absX));
    minAbsY = Math.min(...extractedModules.map((m) => m.absY));
    maxAbsX = Math.max(...extractedModules.map((m) => m.absX + m.width));
    maxAbsY = Math.max(...extractedModules.map((m) => m.absY + m.height));
  } else {
    minAbsX = Math.min(...sourceGrids.map((s) => customOffsets?.[s.id]?.offsetX ?? s.grid.offsetX));
    minAbsY = Math.min(...sourceGrids.map((s) => customOffsets?.[s.id]?.offsetY ?? s.grid.offsetY));
    maxAbsX = Math.max(
      ...sourceGrids.map(
        (s) => (customOffsets?.[s.id]?.offsetX ?? s.grid.offsetX) + s.grid.cols * s.grid.moduleWidth
      )
    );
    maxAbsY = Math.max(
      ...sourceGrids.map(
        (s) => (customOffsets?.[s.id]?.offsetY ?? s.grid.offsetY) + s.grid.rows * s.grid.moduleHeight
      )
    );
  }

  const totalWidth = Math.max(baseWidth, maxAbsX - minAbsX);
  const totalHeight = Math.max(baseHeight, maxAbsY - minAbsY);

  const unifiedCols = Math.max(1, Math.ceil(totalWidth / baseWidth));
  const unifiedRows = Math.max(1, Math.ceil(totalHeight / baseHeight));

  // Initialize unified grid state with false (sparse grid)
  const unifiedGridState: boolean[][] = Array(unifiedRows)
    .fill(null)
    .map(() => Array(unifiedCols).fill(false));

  const unifiedCustomModules: CustomModule[] = [];
  const unifiedModuleColors: Record<string, string> = {};
  const moduleMapping = new Map<string, Point>(); // key: `${gridId}:${origRow},${origCol}` -> Point

  // Place modules into unified grid
  for (const mod of extractedModules) {
    const unifiedCol = Math.max(0, Math.min(unifiedCols - 1, Math.round((mod.absX - minAbsX) / baseWidth)));
    const unifiedRow = Math.max(0, Math.min(unifiedRows - 1, Math.round((mod.absY - minAbsY) / baseHeight)));

    unifiedGridState[unifiedRow][unifiedCol] = true;
    moduleMapping.set(`${mod.sourceGridId}:${mod.origRow},${mod.origCol}`, { row: unifiedRow, col: unifiedCol });
    unifiedModuleColors[`${unifiedRow},${unifiedCol}`] = mod.color;

    if (mod.width !== baseWidth || mod.height !== baseHeight || mod.color !== primaryGrid.moduleColor) {
      unifiedCustomModules.push({
        row: unifiedRow,
        col: unifiedCol,
        width: mod.width,
        height: mod.height,
        color: mod.color,
        labelColor: mod.labelColor,
        anchor: mod.anchor
      });
    }
  }

  // 3. Migrate Data Line Connections
  const mergedConnections: DataLineConnection[] = [];
  let maxLineCounter = 1;

  for (const { id: gridId, grid } of sourceGrids) {
    if (grid.lineCounter > maxLineCounter) {
      maxLineCounter = grid.lineCounter;
    }
    for (const conn of grid.connections) {
      const newPoints: Point[] = [];
      for (const p of conn.points) {
        const mapped = moduleMapping.get(`${gridId}:${p.row},${p.col}`);
        if (mapped) {
          newPoints.push({ row: mapped.row, col: mapped.col });
        }
      }
      if (newPoints.length > 0) {
        mergedConnections.push({
          ...conn,
          points: newPoints
        });
      }
    }
  }

  // 4. Migrate Power Groups
  const mergedPowerGroups: PowerGroup[] = [];
  let maxGroupCounter = 1;

  for (const { id: gridId, grid } of sourceGrids) {
    if (grid.groupCounter > maxGroupCounter) {
      maxGroupCounter = grid.groupCounter;
    }
    for (const grp of grid.selectedGroups) {
      const newModules: Point[] = [];
      for (const m of grp.modules) {
        const mapped = moduleMapping.get(`${gridId}:${m.row},${m.col}`);
        if (mapped) {
          newModules.push({ row: mapped.row, col: mapped.col });
        }
      }
      if (newModules.length > 0) {
        mergedPowerGroups.push({
          ...grp,
          modules: newModules
        });
      }
    }
  }

  // 5. Build Sub-Grid Sections to preserve independent styling and color control
  const mergedSubGrids: MergedSubGrid[] = [];

  for (const { id: gridId, grid } of sourceGrids) {
    if (grid.mergedSubGrids && grid.mergedSubGrids.length > 0) {
      // Source grid was itself a merged grid: preserve child sub-grids
      for (const sub of grid.mergedSubGrids) {
        const mappedSubModules: Point[] = [];
        const originMapping: { row: number; col: number; origRow: number; origCol: number }[] = [];
        for (const m of sub.modules) {
          const mapped = moduleMapping.get(`${gridId}:${m.row},${m.col}`);
          if (mapped) {
            mappedSubModules.push(mapped);
            const orig = sub.moduleOriginMapping?.find((om) => om.row === m.row && om.col === m.col);
            originMapping.push({
              row: mapped.row,
              col: mapped.col,
              origRow: orig !== undefined ? orig.origRow : m.row,
              origCol: orig !== undefined ? orig.origCol : m.col
            });
          }
        }
        if (mappedSubModules.length > 0) {
          mergedSubGrids.push({
            id: `${gridId}_${sub.id}`,
            name: `${grid.name} - ${sub.name}`,
            color: sub.color,
            labelColor: sub.labelColor,
            modules: mappedSubModules,
            idType: sub.idType || grid.idType,
            idFont: sub.idFont || grid.idFont,
            moduleLabelSizePercent: sub.moduleLabelSizePercent ?? grid.moduleLabelSizePercent,
            moduleSize: sub.moduleSize || grid.moduleSize,
            moduleWidth: sub.moduleWidth || grid.moduleWidth,
            moduleHeight: sub.moduleHeight || grid.moduleHeight,
            origRows: sub.origRows || grid.rows,
            origCols: sub.origCols || grid.cols,
            moduleOriginMapping: originMapping
          });
        }
      }
    } else {
      // Standard source grid
      const mappedSubModules: Point[] = [];
      const originMapping: { row: number; col: number; origRow: number; origCol: number }[] = [];
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          if (grid.gridState[r] && grid.gridState[r][c]) {
            const mapped = moduleMapping.get(`${gridId}:${r},${c}`);
            if (mapped) {
              mappedSubModules.push(mapped);
              originMapping.push({
                row: mapped.row,
                col: mapped.col,
                origRow: r,
                origCol: c
              });
            }
          }
        }
      }
      if (mappedSubModules.length > 0) {
        mergedSubGrids.push({
          id: gridId,
          name: grid.name,
          color: grid.moduleColor || '#282828',
          labelColor: grid.moduleLabelColor || '#E6E6E6',
          modules: mappedSubModules,
          idType: grid.idType,
          idFont: grid.idFont,
          moduleLabelSizePercent: grid.moduleLabelSizePercent,
          moduleSize: grid.moduleSize,
          moduleWidth: grid.moduleWidth,
          moduleHeight: grid.moduleHeight,
          origRows: grid.rows,
          origCols: grid.cols,
          moduleOriginMapping: originMapping
        });
      }
    }
  }

  // 6. Preserve Original Module IDs from source grids
  const unifiedModuleIds: Record<string, string> = {};
  for (const { id: gridId, grid } of sourceGrids) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.gridState[r] && grid.gridState[r][c]) {
          const mapped = moduleMapping.get(`${gridId}:${r},${c}`);
          if (mapped) {
            const origId = getModuleId(grid, r, c);
            unifiedModuleIds[`${mapped.row},${mapped.col}`] = origId;
          }
        }
      }
    }
  }

  const mergedGrid: GridModel = {
    name: mergedName,
    cols: unifiedCols,
    rows: unifiedRows,
    moduleSize: unifiedCustomModules.length > 0 ? 'custom' : primaryGrid.moduleSize,
    moduleWidth: baseWidth,
    moduleHeight: baseHeight,
    offsetX: minAbsX,
    offsetY: minAbsY,
    moduleColor: primaryGrid.moduleColor,
    moduleLabelColor: primaryGrid.moduleLabelColor,
    moduleLabelSizePercent: primaryGrid.moduleLabelSizePercent,
    dataLineFontSizePercent: primaryGrid.dataLineFontSizePercent,
    dataLineFont: primaryGrid.dataLineFont,
    hatchDensity: primaryGrid.hatchDensity,
    connectionFont: primaryGrid.connectionFont,
    connectionFontSize: primaryGrid.connectionFontSize,
    useDefaultNames: primaryGrid.useDefaultNames,
    dataLineNamingMode: primaryGrid.dataLineNamingMode || (primaryGrid.useDefaultNames ? 'p.1-p.9' : 'none'),
    dataLinePrefix: primaryGrid.dataLinePrefix || '1',
    idType: primaryGrid.idType || 'row.col',
    idFont: primaryGrid.idFont || 'Arial, sans-serif',
    visible: true,
    showAllLines: false,
    showAllGroups: false,
    dataLinesPage: 0,
    powerLinesPage: 0,
    hoveredLineIndex: null,
    hoveredGroupIndex: null,
    mode: primaryGrid.mode || 'data-lines',
    toolAction: primaryGrid.toolAction || 'draw',
    batchSelection: { firstModule: null, isActive: false },
    customModules: unifiedCustomModules,
    mergedSubGrids,
    moduleColors: unifiedModuleColors,
    moduleIds: unifiedModuleIds,
    overlappedModules: [],
    hideOverlapped: true,
    showingModules: [],
    hidingModules: [],
    gridState: unifiedGridState,
    connections: mergedConnections,
    selectedGroups: mergedPowerGroups,
    lineCounter: Math.max(maxLineCounter, mergedConnections.length + 1),
    groupCounter: Math.max(maxGroupCounter, mergedPowerGroups.length + 1),
    removedIndices: [],
    removedGroupIndices: [],
    currentConnection: [],
    currentColor: null,
    currentColorIndex: null,
    selectedModules: [],
    visibilityStart: null,
    blinkInterval: null,
    rectFirstCorner: null,
    powerFirstCorner: null
  };

  // Build new grids map
  const newGridsMap: Record<string, GridModel> = {};

  // If keepOriginals is false, omit the merged ones
  for (const [id, g] of Object.entries(allGrids)) {
    if (keepOriginals || !gridIdsToMerge.includes(id)) {
      newGridsMap[id] = g;
    }
  }

  // Create unique ID for merged grid
  let mergedGridId = `LED_MERGED_${Date.now() % 10000}`;
  let idCounter = 1;
  while (newGridsMap[mergedGridId]) {
    mergedGridId = `LED_MERGED_${idCounter++}`;
  }

  newGridsMap[mergedGridId] = mergedGrid;

  return {
    mergedGrid,
    newGridsMap,
    mergedGridId
  };
}

export interface UnmergeGridsOptions {
  mergedGridId: string;
  allGrids: Record<string, GridModel>;
}

export interface UnmergeGridsResult {
  newGridsMap: Record<string, GridModel>;
  restoredGridIds: string[];
  removedCrossLineCount: number;
  removedCrossPowerGroupCount: number;
}

/**
 * Unmerge a unified grid back into its individual constituent grids.
 * Data lines and power groups that span across multiple subgrids are cleanly removed.
 */
export function unmergeGrids({
  mergedGridId,
  allGrids
}: UnmergeGridsOptions): UnmergeGridsResult {
  const mergedGrid = allGrids[mergedGridId];
  if (!mergedGrid) {
    throw new Error('Merged grid not found');
  }

  const subGrids = mergedGrid.mergedSubGrids;
  if (!subGrids || subGrids.length === 0) {
    throw new Error('This grid does not contain any merged sub-grids to unmerge');
  }

  const newGridsMap: Record<string, GridModel> = { ...allGrids };
  delete newGridsMap[mergedGridId];

  const restoredGridIds: string[] = [];
  let removedCrossLineCount = 0;
  let removedCrossPowerGroupCount = 0;

  // Track which subgrid each module in mergedGrid belongs to
  // Key: `${row},${col}` -> sub.id
  const moduleToSubGridMap = new Map<string, string>();
  for (const sub of subGrids) {
    for (const m of sub.modules) {
      moduleToSubGridMap.set(`${m.row},${m.col}`, sub.id);
    }
  }

  // Count lines that cross between subgrids
  for (const conn of mergedGrid.connections) {
    const subGridIds = new Set<string>();
    for (const p of conn.points) {
      const subId = moduleToSubGridMap.get(`${p.row},${p.col}`);
      if (subId) subGridIds.add(subId);
    }
    if (subGridIds.size > 1) {
      removedCrossLineCount++;
    }
  }

  // Count power groups that cross between subgrids
  for (const grp of mergedGrid.selectedGroups) {
    const subGridIds = new Set<string>();
    for (const m of grp.modules) {
      const subId = moduleToSubGridMap.get(`${m.row},${m.col}`);
      if (subId) subGridIds.add(subId);
    }
    if (subGridIds.size > 1) {
      removedCrossPowerGroupCount++;
    }
  }

  // For each subgrid, create a new separate GridModel
  subGrids.forEach((sub, index) => {
    // Determine mapping from merged coordinates (row, col) to restored grid coordinates (origRow, origCol)
    const mergedToRestored = new Map<string, Point>();

    let maxOrigRow = 0;
    let maxOrigCol = 0;

    if (sub.moduleOriginMapping && sub.moduleOriginMapping.length > 0) {
      for (const map of sub.moduleOriginMapping) {
        mergedToRestored.set(`${map.row},${map.col}`, { row: map.origRow, col: map.origCol });
        if (map.origRow > maxOrigRow) maxOrigRow = map.origRow;
        if (map.origCol > maxOrigCol) maxOrigCol = map.origCol;
      }
    } else {
      // Fallback: derive relative coordinates from sub.modules bounding box
      const minR = Math.min(...sub.modules.map((m) => m.row));
      const minC = Math.min(...sub.modules.map((m) => m.col));
      for (const m of sub.modules) {
        const oR = m.row - minR;
        const oC = m.col - minC;
        mergedToRestored.set(`${m.row},${m.col}`, { row: oR, col: oC });
        if (oR > maxOrigRow) maxOrigRow = oR;
        if (oC > maxOrigCol) maxOrigCol = oC;
      }
    }

    const cols = Math.max(1, sub.origCols || (maxOrigCol + 1));
    const rows = Math.max(1, sub.origRows || (maxOrigRow + 1));

    const gridState: boolean[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(false));

    for (const m of sub.modules) {
      const target = mergedToRestored.get(`${m.row},${m.col}`);
      if (target && target.row < rows && target.col < cols) {
        gridState[target.row][target.col] = true;
      }
    }

    // Calculate world offset for this subgrid
    let minWorldX = Infinity;
    let minWorldY = Infinity;
    for (const m of sub.modules) {
      const geom = getModuleGeometry(mergedGrid, m.row, m.col);
      const absX = mergedGrid.offsetX + geom.x;
      const absY = mergedGrid.offsetY + geom.y;
      if (absX < minWorldX) minWorldX = absX;
      if (absY < minWorldY) minWorldY = absY;
    }
    if (minWorldX === Infinity) minWorldX = mergedGrid.offsetX;
    if (minWorldY === Infinity) minWorldY = mergedGrid.offsetY;

    // Filter connections that are strictly inside this subgrid
    const restoredConnections: DataLineConnection[] = [];
    for (const conn of mergedGrid.connections) {
      let isStrictlyInside = true;
      const newPoints: Point[] = [];
      for (const p of conn.points) {
        const target = mergedToRestored.get(`${p.row},${p.col}`);
        if (!target) {
          isStrictlyInside = false;
          break;
        }
        newPoints.push(target);
      }
      if (isStrictlyInside && newPoints.length > 0) {
        restoredConnections.push({
          ...conn,
          points: newPoints
        });
      }
    }

    // Filter power groups strictly inside this subgrid
    const restoredPowerGroups: PowerGroup[] = [];
    for (const grp of mergedGrid.selectedGroups) {
      let isStrictlyInside = true;
      const newModules: Point[] = [];
      for (const m of grp.modules) {
        const target = mergedToRestored.get(`${m.row},${m.col}`);
        if (!target) {
          isStrictlyInside = false;
          break;
        }
        newModules.push(target);
      }
      if (isStrictlyInside && newModules.length > 0) {
        restoredPowerGroups.push({
          ...grp,
          modules: newModules
        });
      }
    }

    // Custom modules for this subgrid
    const subMW = sub.moduleWidth || 100;
    const subMH = sub.moduleHeight || 100;
    const restoredCustomModules: CustomModule[] = [];
    if (mergedGrid.customModules && mergedGrid.customModules.length > 0) {
      for (const cm of mergedGrid.customModules) {
        const target = mergedToRestored.get(`${cm.row},${cm.col}`);
        if (target) {
          const isDimensionCustom = (cm.width !== subMW || cm.height !== subMH);
          const isColorCustom = Boolean(cm.color && cm.color !== (sub.color || mergedGrid.moduleColor));
          const isAnchorCustom = Boolean(cm.anchor && cm.anchor !== 'top-left');
          if (isDimensionCustom || isColorCustom || isAnchorCustom) {
            restoredCustomModules.push({
              ...cm,
              row: target.row,
              col: target.col
            });
          }
        }
      }
    }

    // Preserve custom module colors and IDs if any
    const restoredModuleColors: Record<string, string> = {};
    const restoredModuleIds: Record<string, string> = {};
    for (const m of sub.modules) {
      const target = mergedToRestored.get(`${m.row},${m.col}`);
      if (target) {
        if (mergedGrid.moduleColors && mergedGrid.moduleColors[`${m.row},${m.col}`]) {
          restoredModuleColors[`${target.row},${target.col}`] = mergedGrid.moduleColors[`${m.row},${m.col}`];
        }
        if (mergedGrid.moduleIds && mergedGrid.moduleIds[`${m.row},${m.col}`]) {
          restoredModuleIds[`${target.row},${target.col}`] = mergedGrid.moduleIds[`${m.row},${m.col}`];
        }
      }
    }

    // Determine clean new grid ID
    let newGridId = sub.id;
    if (newGridsMap[newGridId] || newGridId.startsWith('LED_MERGED')) {
      newGridId = `LED_${Date.now() % 10000}_${index + 1}`;
      let counter = 1;
      while (newGridsMap[newGridId]) {
        newGridId = `LED_${index + 1}_${counter++}`;
      }
    }

    const restoredGrid: GridModel = {
      name: sub.name,
      cols,
      rows,
      moduleSize: sub.moduleSize || 'square',
      moduleWidth: subMW,
      moduleHeight: subMH,
      offsetX: minWorldX,
      offsetY: minWorldY,
      moduleColor: sub.color || mergedGrid.moduleColor,
      moduleLabelColor: sub.labelColor || mergedGrid.moduleLabelColor,
      moduleLabelSizePercent: sub.moduleLabelSizePercent ?? mergedGrid.moduleLabelSizePercent,
      dataLineFontSizePercent: mergedGrid.dataLineFontSizePercent,
      dataLineFont: mergedGrid.dataLineFont,
      hatchDensity: mergedGrid.hatchDensity,
      connectionFont: mergedGrid.connectionFont,
      connectionFontSize: mergedGrid.connectionFontSize,
      useDefaultNames: mergedGrid.useDefaultNames,
      idType: sub.idType || mergedGrid.idType,
      idFont: sub.idFont || mergedGrid.idFont || 'Arial, sans-serif',
      visible: true,
      showAllLines: false,
      showAllGroups: false,
      dataLinesPage: 0,
      powerLinesPage: 0,
      hoveredLineIndex: null,
      hoveredGroupIndex: null,
      mode: mergedGrid.mode || 'data-lines',
      toolAction: mergedGrid.toolAction || 'draw',
      batchSelection: { firstModule: null, isActive: false },
      customModules: restoredCustomModules,
      moduleColors: Object.keys(restoredModuleColors).length > 0 ? restoredModuleColors : undefined,
      moduleIds: Object.keys(restoredModuleIds).length > 0 ? restoredModuleIds : undefined,
      overlappedModules: [],
      hideOverlapped: false,
      showingModules: [],
      hidingModules: [],
      gridState,
      connections: restoredConnections,
      selectedGroups: restoredPowerGroups,
      lineCounter: Math.max(restoredConnections.length + 1, 1),
      groupCounter: Math.max(restoredPowerGroups.length + 1, 1),
      removedIndices: [],
      removedGroupIndices: [],
      currentConnection: [],
      currentColor: null,
      currentColorIndex: null,
      selectedModules: [],
      visibilityStart: null,
      blinkInterval: null,
      rectFirstCorner: null,
      powerFirstCorner: null
    };

    newGridsMap[newGridId] = restoredGrid;
    restoredGridIds.push(newGridId);
  });

  return {
    newGridsMap,
    restoredGridIds,
    removedCrossLineCount,
    removedCrossPowerGroupCount
  };
}
