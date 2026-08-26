import { GridModel, ModuleGeometry, Point, AnchorPoint, MergedSubGrid, IdType, DataLineNamingMode, DataLineConnection, PowerGroup } from '../types';
import { MODULE_PALETTE_25 } from '../constants';

/**
 * Compute start (main) and end (backup) names for a data line based on naming mode and index
 */
export function computeDataLineNames(
  mode: DataLineNamingMode | undefined,
  lineIndex: number,
  globalPrefix?: string,
  linePrefix?: string
): { name: string; endName: string } {
  if (mode === 'none') {
    return { name: '', endName: '' };
  }
  if (mode === 'p.1-p.9') {
    const p = (linePrefix !== undefined && linePrefix !== '')
      ? linePrefix
      : (globalPrefix !== undefined && globalPrefix !== '' ? globalPrefix : '1');
    const startPort = (lineIndex % 8) + 1; // 1 to 8
    const endPort = (lineIndex % 8) + 9;   // 9 to 16
    return {
      name: `${p}.${startPort}`,
      endName: `${p}.${endPort}`
    };
  }
  // Default is '1A-1B'
  return {
    name: `${lineIndex + 1}A`,
    endName: `${lineIndex + 1}B`
  };
}

/**
 * Convert a number (1-based) to Excel-style letter(s)
 * 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, 28 -> AB, etc.
 */
export function numberToLetter(num: number): string {
  let result = '';
  let n = num;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || 'A';
}

/**
 * Compute sub-grid module ID based on sub-grid original relative position and idType
 */
export function computeSubGridModuleId(
  sub: MergedSubGrid,
  origRow: number,
  origCol: number,
  idType: IdType
): string {
  const rowNum = origRow + 1;
  const colNum = origCol + 1;
  const cols = sub.origCols || (Math.max(...sub.modules.map(m => m.col)) + 1);

  switch (idType) {
    case 'row.col':
      return `${rowNum}.${colNum}`;
    case 'col.row':
      return `${colNum}.${rowNum}`;
    case 'row-letter':
      return `${rowNum}${numberToLetter(colNum)}`;
    case 'letter-col':
      return `${numberToLetter(rowNum)}${colNum}`;
    case 'sequential':
      return `${origRow * cols + origCol + 1}`;
    default:
      return `${rowNum}.${colNum}`;
  }
}

/**
 * Get formatted module ID based on grid's idType
 */
export function getModuleId(grid: GridModel, row: number, col: number): string {
  if (grid.moduleIds && grid.moduleIds[`${row},${col}`] !== undefined) {
    return grid.moduleIds[`${row},${col}`];
  }
  const rowNum = row + 1;
  const colNum = col + 1;

  switch (grid.idType) {
    case 'row.col':
      return `${rowNum}.${colNum}`;
    case 'col.row':
      return `${colNum}.${rowNum}`;
    case 'row-letter':
      return `${rowNum}${numberToLetter(colNum)}`;
    case 'letter-col':
      return `${numberToLetter(rowNum)}${colNum}`;
    case 'sequential':
      return `${row * grid.cols + col + 1}`;
    default:
      return `${rowNum}.${colNum}`;
  }
}

/**
 * Get module geometry (position, size, center) accounting for custom sizes and anchors
 */
export function getModuleGeometry(grid: GridModel, row: number, col: number): ModuleGeometry {
  const customModule = grid.customModules ? grid.customModules.find(m => m.row === row && m.col === col) : null;
  const subGrid = grid.mergedSubGrids?.find(s => s.modules.some(m => m.row === row && m.col === col));
  const width = customModule ? customModule.width : (subGrid?.moduleWidth || grid.moduleWidth);
  const height = customModule ? customModule.height : (subGrid?.moduleHeight || grid.moduleHeight);
  const anchor = customModule ? (customModule.anchor || 'top-left') : 'top-left';

  let x: number;
  let y: number;

  switch (anchor) {
    case 'top-left':
      x = col * grid.moduleWidth;
      y = row * grid.moduleHeight;
      break;
    case 'top-right':
      x = (col + 1) * grid.moduleWidth - width;
      y = row * grid.moduleHeight;
      break;
    case 'bottom-left':
      x = col * grid.moduleWidth;
      y = (row + 1) * grid.moduleHeight - height;
      break;
    case 'bottom-right':
      x = (col + 1) * grid.moduleWidth - width;
      y = (row + 1) * grid.moduleHeight - height;
      break;
    case 'center':
      x = col * grid.moduleWidth + (grid.moduleWidth - width) / 2;
      y = row * grid.moduleHeight + (grid.moduleHeight - height) / 2;
      break;
    default:
      x = col * grid.moduleWidth;
      y = row * grid.moduleHeight;
  }

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return { x, y, width, height, centerX, centerY };
}

/**
 * Calculate geometry for a given width, height and anchor
 */
export function calculateModuleGeometry(
  grid: GridModel,
  row: number,
  col: number,
  width: number,
  height: number,
  anchor: AnchorPoint
): { x: number; y: number; width: number; height: number } {
  const baseX = col * grid.moduleWidth;
  const baseY = row * grid.moduleHeight;

  let x = baseX;
  let y = baseY;

  if (anchor === 'top-right') {
    x = baseX + grid.moduleWidth - width;
  } else if (anchor === 'bottom-left') {
    y = baseY + grid.moduleHeight - height;
  } else if (anchor === 'bottom-right') {
    x = baseX + grid.moduleWidth - width;
    y = baseY + grid.moduleHeight - height;
  } else if (anchor === 'center') {
    x = baseX + (grid.moduleWidth - width) / 2;
    y = baseY + (grid.moduleHeight - height) / 2;
  }

  return { x, y, width, height };
}

/**
 * Check if a cell (row, col) represents an actual LED module (and not a phantom/covered/empty cell).
 */
export function isValidModuleCell(grid: GridModel, row: number, col: number): boolean {
  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
    return false;
  }

  // If this grid is a merged grid with sub-grids, valid modules are strictly those in mergedSubGrids
  if (grid.mergedSubGrids && grid.mergedSubGrids.length > 0) {
    return grid.mergedSubGrids.some(sub => sub.modules.some(m => m.row === row && m.col === col));
  }

  // Check if this cell is covered by another custom module
  if (grid.customModules && grid.customModules.length > 0) {
    const cellCenterX = col * grid.moduleWidth + grid.moduleWidth / 2;
    const cellCenterY = row * grid.moduleHeight + grid.moduleHeight / 2;

    for (const cm of grid.customModules) {
      if (cm.row === row && cm.col === col) continue;
      const geom = getModuleGeometry(grid, cm.row, cm.col);
      if (
        cellCenterX >= geom.x &&
        cellCenterX < geom.x + geom.width &&
        cellCenterY >= geom.y &&
        cellCenterY < geom.y + geom.height
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get module at position (x, y) relative to grid offset
 */
export function getModuleAtPosition(grid: GridModel, x: number, y: number): Point | null {
  if (grid.customModules && grid.customModules.length > 0) {
    for (const customModule of grid.customModules) {
      const geom = getModuleGeometry(grid, customModule.row, customModule.col);
      if (x >= geom.x && x < geom.x + geom.width && y >= geom.y && y < geom.y + geom.height) {
        if (isValidModuleCell(grid, customModule.row, customModule.col)) {
          return { row: customModule.row, col: customModule.col };
        }
      }
    }
  }

  const col = Math.floor(x / grid.moduleWidth);
  const row = Math.floor(y / grid.moduleHeight);

  if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) {
    return null;
  }

  if (!isValidModuleCell(grid, row, col)) {
    return null;
  }

  return { row, col };
}

/**
 * Check if two modules are physically adjacent (touching edges)
 */
export function areModulesAdjacent(grid: GridModel, module1Row: number, module1Col: number, module2Row: number, module2Col: number): boolean {
  const geom1 = getModuleGeometry(grid, module1Row, module1Col);
  const geom2 = getModuleGeometry(grid, module2Row, module2Col);

  if (!geom1 || !geom2) return false;

  const geom1MaxX = geom1.x + geom1.width;
  const geom1MaxY = geom1.y + geom1.height;
  const geom2MaxX = geom2.x + geom2.width;
  const geom2MaxY = geom2.y + geom2.height;

  const horizontalTouch = (
    (Math.abs(geom1MaxX - geom2.x) < 0.001 || Math.abs(geom2MaxX - geom1.x) < 0.001) &&
    !(geom1MaxY <= geom2.y || geom1.y >= geom2MaxY)
  );

  const verticalTouch = (
    (Math.abs(geom1MaxY - geom2.y) < 0.001 || Math.abs(geom2MaxY - geom1.y) < 0.001) &&
    !(geom1MaxX <= geom2.x || geom1.x >= geom2MaxX)
  );

  return horizontalTouch || verticalTouch;
}

/**
 * Check if all modules in a group are connected
 */
export function areAllModulesConnected(modules: Point[]): boolean {
  if (modules.length <= 1) return true;
  const visited = new Set<string>();

  function isAdjacent(p1: Point, p2: Point) {
    return (Math.abs(p1.row - p2.row) === 1 && p1.col === p2.col) ||
           (Math.abs(p1.col - p2.col) === 1 && p1.row === p2.row);
  }

  function dfs(module: Point) {
    const key = `${module.row},${module.col}`;
    visited.add(key);
    modules.forEach(other => {
      if (!visited.has(`${other.row},${other.col}`) && isAdjacent(module, other)) {
        dfs(other);
      }
    });
  }

  dfs(modules[0]);
  return visited.size === modules.length;
}

export function findConnectedGroups(modules: Point[]): Point[][] {
  if (modules.length === 0) return [];
  const groups: Point[][] = [];
  const unvisited = new Set(modules.map(m => `${m.row},${m.col}`));

  while (unvisited.size > 0) {
    const firstKey = unvisited.values().next().value;
    const [row, col] = firstKey.split(',').map(Number);
    const startModule = modules.find(m => m.row === row && m.col === col)!;

    const group: Point[] = [];
    const queue = [startModule];
    const visited = new Set([firstKey]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);
      unvisited.delete(`${current.row},${current.col}`);

      const neighbors = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
      ];

      for (const { dr, dc } of neighbors) {
        const neighborRow = current.row + dr;
        const neighborCol = current.col + dc;
        const key = `${neighborRow},${neighborCol}`;

        if (!visited.has(key) && unvisited.has(key)) {
          const neighbor = modules.find(m => m.row === neighborRow && m.col === neighborCol);
          if (neighbor) {
            visited.add(key);
            queue.push(neighbor);
          }
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function findFurthestModules(modules: Point[]): [Point, Point] {
  let maxDistance = -1;
  let corner1 = modules[0];
  let corner2 = modules[0];

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const dist = Math.abs(modules[i].row - modules[j].row) + Math.abs(modules[i].col - modules[j].col);
      if (dist > maxDistance) {
        maxDistance = dist;
        corner1 = modules[i];
        corner2 = modules[j];
      }
    }
  }

  return [corner1, corner2];
}

export function getModulesInRectangle(grid: GridModel, corner1: Point, corner2: Point): Point[] {
  const g1 = getModuleGeometry(grid, corner1.row, corner1.col);
  const g2 = getModuleGeometry(grid, corner2.row, corner2.col);
  const minX = Math.min(g1.x, g2.x);
  const minY = Math.min(g1.y, g2.y);
  const maxX = Math.max(g1.x + g1.width, g2.x + g2.width);
  const maxY = Math.max(g1.y + g1.height, g2.y + g2.height);

  const modules: Point[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (!isValidModuleCell(grid, row, col)) continue;
      if (!grid.gridState[row] || !grid.gridState[row][col]) continue;
      const geom = getModuleGeometry(grid, row, col);
      if (
        geom.x + geom.width > minX &&
        geom.x < maxX &&
        geom.y + geom.height > minY &&
        geom.y < maxY
      ) {
        modules.push({ row, col });
      }
    }
  }
  return modules;
}

export function interpolatePoints(grid: GridModel, start: Point, end: Point): Point[] {
  const points: Point[] = [];
  const startGeom = getModuleGeometry(grid, start.row, start.col);
  const endGeom = getModuleGeometry(grid, end.row, end.col);

  if (!startGeom || !endGeom) {
    const steps = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col)) || 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const row = Math.round(start.row + (end.row - start.row) * t);
      const col = Math.round(start.col + (end.col - start.col) * t);
      points.push({ row, col });
    }
    return points;
  }

  const startCenterX = startGeom.x + startGeom.width / 2;
  const startCenterY = startGeom.y + startGeom.height / 2;
  const endCenterX = endGeom.x + endGeom.width / 2;
  const endCenterY = endGeom.y + endGeom.height / 2;

  const dx = endCenterX - startCenterX;
  const dy = endCenterY - startCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const stepSize = Math.min(grid.moduleWidth, grid.moduleHeight) / 2;
  const numSteps = Math.max(Math.ceil(distance / stepSize), 1);

  const visited = new Set<string>();
  visited.add(`${start.row},${start.col}`);
  points.push({ row: start.row, col: start.col });

  for (let i = 1; i <= numSteps; i++) {
    const t = i / numSteps;
    const x = startCenterX + dx * t;
    const y = startCenterY + dy * t;

    const modulePos = getModuleAtPosition(grid, x, y);
    if (modulePos) {
      const key = `${modulePos.row},${modulePos.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        points.push({ row: modulePos.row, col: modulePos.col });
      }
    }
  }

  const endKey = `${end.row},${end.col}`;
  if (!visited.has(endKey)) {
    points.push({ row: end.row, col: end.col });
  }

  return points;
}

export function calculateGridsBounds(grids: Record<string, GridModel>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  Object.values(grids).forEach(grid => {
    const gridMinX = grid.offsetX;
    const gridMinY = grid.offsetY;
    let gridMaxX = grid.offsetX + grid.cols * grid.moduleWidth;
    let gridMaxY = grid.offsetY + grid.rows * grid.moduleHeight;

    if (grid.customModules && grid.customModules.length > 0) {
      grid.customModules.forEach(customModule => {
        const geom = getModuleGeometry(grid, customModule.row, customModule.col);
        const moduleX = grid.offsetX + geom.x;
        const moduleY = grid.offsetY + geom.y;
        const moduleMaxX = moduleX + geom.width;
        const moduleMaxY = moduleY + geom.height;

        gridMaxX = Math.max(gridMaxX, moduleMaxX);
        gridMaxY = Math.max(gridMaxY, moduleMaxY);
      });
    }

    minX = Math.min(minX, gridMinX);
    minY = Math.min(minY, gridMinY);
    maxX = Math.max(maxX, gridMaxX);
    maxY = Math.max(maxY, gridMaxY);
  });

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
  }

  return { minX, minY, maxX, maxY };
}

export function getMostContrastColor(baseColor: string): string {
  function getLuminance(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  }

  function getContrast(color1: string, color2: string) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  let maxContrast = 0;
  let bestColor = MODULE_PALETTE_25[0];

  MODULE_PALETTE_25.forEach(color => {
    const contrast = getContrast(baseColor, color);
    if (contrast > maxContrast) {
      maxContrast = contrast;
      bestColor = color;
    }
  });

  return bestColor;
}

export function getUncoveredSegments(start: number, end: number, coveredSegments: { start: number; end: number }[]): { start: number; end: number }[] {
  if (coveredSegments.length === 0) {
    return [{ start, end }];
  }

  const sorted = coveredSegments.slice().sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.start <= last.end + 1.0) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  const uncovered: { start: number; end: number }[] = [];
  const tolerance = 1.0;

  if (merged[0].start - start > tolerance) {
    uncovered.push({ start, end: merged[0].start });
  }

  for (let i = 0; i < merged.length - 1; i++) {
    if (merged[i + 1].start - merged[i].end > tolerance) {
      uncovered.push({ start: merged[i].end, end: merged[i + 1].start });
    }
  }

  if (end - merged[merged.length - 1].end > tolerance) {
    uncovered.push({ start: merged[merged.length - 1].end, end });
  }

  return uncovered;
}

export interface PowerGroupRemovalResult {
  groupIndex: number;
  removedModules: Point[];
  keptModules: Point[];
  isEntireGroupRemoved: boolean;
}

/**
 * Calculate the effect of removing a module from a Power Group.
 * If the group splits into disconnected components, keeps the largest component.
 * On tie, preserves the component containing the original start module.
 */
export function calculatePowerGroupRemoval(
  group: PowerGroup,
  removeRow: number,
  removeCol: number
): PowerGroupRemovalResult | null {
  const modIdx = group.modules.findIndex((m) => m.row === removeRow && m.col === removeCol);
  if (modIdx === -1) return null;

  if (group.modules.length <= 1) {
    return {
      groupIndex: group.index,
      removedModules: [...group.modules],
      keptModules: [],
      isEntireGroupRemoved: true
    };
  }

  const remaining = group.modules.filter((m) => !(m.row === removeRow && m.col === removeCol));
  const components = findConnectedGroups(remaining);

  if (components.length <= 1) {
    return {
      groupIndex: group.index,
      removedModules: [{ row: removeRow, col: removeCol }],
      keptModules: remaining,
      isEntireGroupRemoved: false
    };
  }

  // Multiple disconnected components: determine which one to keep
  const startModule = group.modules[0];
  const startModuleComp = components.find((comp) =>
    comp.some((m) => m.row === startModule.row && m.col === startModule.col)
  );

  const maxLen = Math.max(...components.map((c) => c.length));
  const largestComps = components.filter((c) => c.length === maxLen);

  let chosenComp: Point[];
  if (startModuleComp && largestComps.includes(startModuleComp)) {
    // Start module is in one of the largest components
    chosenComp = startModuleComp;
  } else if (largestComps.length === 1) {
    // There is a strictly larger component
    chosenComp = largestComps[0];
  } else if (startModuleComp) {
    // There is a tie and startModule component exists
    chosenComp = startModuleComp;
  } else {
    // Start module was the removed one and there's a tie: keep the component with the earliest module in original group order
    chosenComp = largestComps.reduce((best, curr) => {
      const bestMinIdx = Math.min(
        ...best.map((m) => group.modules.findIndex((gm) => gm.row === m.row && gm.col === m.col))
      );
      const currMinIdx = Math.min(
        ...curr.map((m) => group.modules.findIndex((gm) => gm.row === m.row && gm.col === m.col))
      );
      return currMinIdx < bestMinIdx ? curr : best;
    });
  }

  const keptKeys = new Set(chosenComp.map((m) => `${m.row},${m.col}`));
  const removedModules = group.modules.filter((m) => !keptKeys.has(`${m.row},${m.col}`));

  return {
    groupIndex: group.index,
    removedModules,
    keptModules: chosenComp,
    isEntireGroupRemoved: chosenComp.length === 0
  };
}

export interface DataLineRemovalResult {
  connIndex: number;
  removedPoints: Point[];
  keptPoints: Point[];
  isEntireLineRemoved: boolean;
}

/**
 * Calculate the effect of removing a module from a Data Line.
 * Truncates from the clicked module to the end of the line.
 * If the first module is removed, the entire line is deleted.
 */
export function calculateDataLineRemoval(
  conn: DataLineConnection,
  connIndex: number,
  removeRow: number,
  removeCol: number
): DataLineRemovalResult | null {
  const mIdxInLine = conn.points.findIndex((p) => p.row === removeRow && p.col === removeCol);
  if (mIdxInLine === -1) return null;

  if (mIdxInLine === 0) {
    return {
      connIndex,
      removedPoints: [...conn.points],
      keptPoints: [],
      isEntireLineRemoved: true
    };
  }

  return {
    connIndex,
    removedPoints: conn.points.slice(mIdxInLine),
    keptPoints: conn.points.slice(0, mIdxInLine),
    isEntireLineRemoved: false
  };
}

