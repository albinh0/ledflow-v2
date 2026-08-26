export type GridMode = 'data-lines' | 'power-lines' | 'visibility';

export type ToolAction = 'draw' | 'erase';

export type IdType = 'row.col' | 'col.row' | 'row-letter' | 'letter-col' | 'sequential';

export type ModuleSizePreset = 'square' | 'horizontal' | 'vertical' | 'custom';

export type GridPlacementOption = 'right' | 'bottom';

export type AnchorPoint = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface Point {
  row: number;
  col: number;
}

export interface CustomModule {
  row: number;
  col: number;
  width: number;
  height: number;
  anchor?: AnchorPoint;
  color?: string;
  labelColor?: string;
}

export interface OverlappedModule {
  row: number;
  col: number;
}

export type DataLineNamingMode = 'none' | '1A-1B' | 'p.1-p.9';

export interface DataLineConnection {
  points: Point[];
  color: string;
  colorIndex?: number;
  name: string;
  endName: string;
  prefix?: string;
}

export interface PowerGroup {
  index: number;
  colorIndex: number;
  modules: Point[];
}

export interface AnimatingModule {
  row: number;
  col: number;
  startTime: number;
}

export interface BatchSelectionState {
  firstModule: Point | null;
  isActive: boolean;
}

export interface MergedSubGrid {
  id: string;
  name: string;
  color: string;
  labelColor: string;
  modules: Point[];
  idType?: IdType;
  idFont?: string;
  moduleLabelSizePercent?: number;
  moduleSize?: ModuleSizePreset;
  moduleWidth?: number;
  moduleHeight?: number;
  origRows?: number;
  origCols?: number;
  moduleOriginMapping?: { row: number; col: number; origRow: number; origCol: number }[];
}

export interface GridModel {
  name: string;
  cols: number;
  rows: number;
  moduleSize: ModuleSizePreset;
  moduleWidth: number;
  moduleHeight: number;
  offsetX: number;
  offsetY: number;
  moduleColor: string;
  moduleLabelColor: string;
  moduleLabelSizePercent: number;
  dataLineFontSizePercent: number;
  dataLineFont: string;
  hatchDensity: number;
  connectionFont: string;
  connectionFontSize: number;
  useDefaultNames: boolean;
  dataLineNamingMode?: DataLineNamingMode;
  dataLinePrefix?: string;
  idType: IdType;
  idFont?: string;
  visible: boolean;
  showAllLines: boolean;
  showAllGroups: boolean;
  dataLinesPage: number;
  powerLinesPage: number;
  hoveredLineIndex: number | null;
  hoveredGroupIndex: number | null;
  mode: GridMode;
  toolAction?: ToolAction;
  batchSelection: BatchSelectionState;
  customModules: CustomModule[];
  mergedSubGrids?: MergedSubGrid[];
  moduleColors?: Record<string, string>; // "row,col" -> hex color override
  moduleIds?: Record<string, string>; // "row,col" -> module ID override (preserves original IDs when merged)
  overlappedModules: OverlappedModule[];
  hideOverlapped: boolean;
  showingModules: AnimatingModule[];
  hidingModules: AnimatingModule[];
  gridState: boolean[][]; // [row][col] -> isVisible
  connections: DataLineConnection[];
  selectedGroups: PowerGroup[];
  lineCounter: number;
  groupCounter: number;
  removedIndices: number[];
  removedGroupIndices: number[];
  currentConnection: Point[];
  currentColor: string | null;
  currentColorIndex: number | null;
  selectedModules: Point[];
  visibilityStart: number | null;
  blinkInterval: number | null;
  rectFirstCorner: Point | null;
  powerFirstCorner: Point | null;
}

export interface AppStateSnapshot {
  grids: Record<string, GridModel>;
  activeTab: string;
  currentGridId: string;
  gridCounter: number;
  currentScale: number;
  outputWidth: number;
  outputHeight: number;
  fitToGrids: boolean;
}

export interface HistoryItem {
  actionName: string;
  timestamp: number;
  state: AppStateSnapshot;
}

export interface ModuleGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}
