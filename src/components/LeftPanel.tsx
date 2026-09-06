import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GridModel, GridMode, HistoryItem, ModuleSizePreset, IdType, DataLineNamingMode, DragOptions, CanvasBackgroundStyle } from '../types';
import { MAIN_COLORS, DATA_LINE_COLORS, GROUP_COLORS, MODULE_PALETTE_16, FONT_OPTIONS, ID_FONT_OPTIONS, DEFAULT_ID_FONT, APP_VERSION, APP_AUTHOR } from '../constants';
import { getMostContrastColor, isValidModuleCell, computeSubGridModuleId, computeDataLineNames, getModuleGeometry } from '../utils/geometry';
import { getPatternColors } from '../utils/exportImport';
import { MergeIcon, UnmergeIcon, CanvasIcon } from './CustomIcons';
import { ColorPicker } from './ColorPicker';
import { CustomSelect } from './CustomSelect';

interface LeftPanelProps {
  grids: Record<string, GridModel>;
  activeTab: string;
  onSwitchTab: (tab: string) => void;
  onOpenNewGridModal: () => void;
  onOpenRenameModal: () => void;
  onOpenMergeModal: () => void;
  onDeleteGrid: (gridId: string) => void;
  onToggleGridVisibility: (gridId: string) => void;
  onFocusOnGrid: (gridId: string) => void;
  onResetAllGrids: () => void;
  onImportXML: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportXML?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onExportPDF?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  outputWidth: number;
  outputHeight: number;
  fitToGrids: boolean;
  onOutputSizeChange: (width: number, height: number) => void;
  onFitToGridsChange: (fit: boolean) => void;
  onUpdateGrid: (gridId: string, updater: (prev: GridModel) => GridModel, actionDescription?: string) => void;
  onUnmergeGrid: (gridId: string) => void;
  altLineStyle: boolean;
  onAltLineStyleChange: (enabled: boolean) => void;
  cableCurvature?: number;
  onCableCurvatureChange?: (val: number) => void;
  autoSave?: boolean;
  onAutoSaveChange?: (val: boolean) => void;
  autoFocus?: boolean;
  onAutoFocusChange?: (val: boolean) => void;
  canvasBackground?: CanvasBackgroundStyle;
  onCanvasBackgroundChange?: (style: CanvasBackgroundStyle) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  gridCellSize?: number;
  onGridCellSizeChange?: (size: number) => void;
  dotsSpacing?: number;
  onDotsSpacingChange?: (spacing: number) => void;
  patternBrightness?: number;
  onPatternBrightnessChange?: (brightness: number) => void;
  showRulers?: boolean;
  onShowRulersChange?: (show: boolean) => void;
  canvasDragMode?: boolean;
  onCanvasDragModeChange?: (enabled: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  history: HistoryItem[];
  currentHistoryIndex: number;
  onJumpToHistory: (index: number) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  dragOptions?: DragOptions;
  onDragOptionsChange?: (options: DragOptions) => void;
}

const ID_TYPE_OPTIONS: { id: IdType; label: string; example: string }[] = [
  { id: 'row.col', label: 'Row.Col', example: '1.1' },
  { id: 'col.row', label: 'Col.Row', example: '1.1' },
  { id: 'row-letter', label: 'Row+Let', example: '1A' },
  { id: 'letter-col', label: 'Let+Col', example: 'A1' },
  { id: 'sequential', label: 'Seq', example: '1' },
];

export function LeftPanel({
  grids,
  activeTab,
  onSwitchTab,
  onOpenNewGridModal,
  onOpenRenameModal,
  onOpenMergeModal,
  onDeleteGrid,
  onToggleGridVisibility,
  onFocusOnGrid,
  onResetAllGrids,
  onImportXML,
  onExportXML,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  outputWidth,
  outputHeight,
  fitToGrids,
  onOutputSizeChange,
  onFitToGridsChange,
  onUpdateGrid,
  onUnmergeGrid,
  altLineStyle,
  onAltLineStyleChange,
  cableCurvature = 0.2,
  onCableCurvatureChange,
  autoSave = true,
  onAutoSaveChange,
  autoFocus = true,
  onAutoFocusChange,
  canvasBackground = 'transparent',
  onCanvasBackgroundChange,
  backgroundColor = '#151518',
  onBackgroundColorChange,
  gridCellSize = 25,
  onGridCellSizeChange,
  dotsSpacing = 25,
  onDotsSpacingChange,
  patternBrightness = 29,
  onPatternBrightnessChange,
  showRulers = false,
  onShowRulersChange,
  canvasDragMode = true,
  onCanvasDragModeChange,
  isCollapsed,
  onToggleCollapse,
  history,
  currentHistoryIndex,
  onJumpToHistory,
  panelRef,
  dragOptions = { snapToGrids: true, snapToCanvas: true, snapToModuleStep: true },
  onDragOptionsChange
}: LeftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion state
  const [screenPositioningOpen, setScreenPositioningOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [dataSectionOpen, setDataSectionOpen] = useState(false);
  const [powerSectionOpen, setPowerSectionOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Selected screen for canvas tab drag controls
  const [canvasTargetGridId, setCanvasTargetGridId] = useState<string>('');

  // Swatch dropdown open state per line/group index
  const [openDataSwatchIndex, setOpenDataSwatchIndex] = useState<number | null>(null);
  const [openPowerSwatchIndex, setOpenPowerSwatchIndex] = useState<number | null>(null);

  // Close color swatch pickers when clicking outside or pressing Escape
  useEffect(() => {
    if (openDataSwatchIndex === null && openPowerSwatchIndex === null) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.color-swatch-container')) {
        return;
      }
      setOpenDataSwatchIndex(null);
      setOpenPowerSwatchIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDataSwatchIndex(null);
        setOpenPowerSwatchIndex(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDataSwatchIndex, openPowerSwatchIndex]);

  // Reset swatches when switching active tab
  useEffect(() => {
    setOpenDataSwatchIndex(null);
    setOpenPowerSwatchIndex(null);
  }, [activeTab]);

  // Selected sub-grid target for color customization on merged grids
  const [selectedSubGridId, setSelectedSubGridId] = useState<string>('');

  // ID Type & ID Font custom dropdown state
  const [isIdTypeDropdownOpen, setIsIdTypeDropdownOpen] = useState<boolean>(false);
  const idTypeDropdownRef = useRef<HTMLDivElement | null>(null);

  const [isIdFontDropdownOpen, setIsIdFontDropdownOpen] = useState<boolean>(false);
  const idFontDropdownRef = useRef<HTMLDivElement | null>(null);

  // Custom Color Picker dropdown states
  const [isGridColorPickerOpen, setIsGridColorPickerOpen] = useState<boolean>(false);
  const gridColorPickerRef = useRef<HTMLDivElement | null>(null);
  const [isBgColorPickerOpen, setIsBgColorPickerOpen] = useState<boolean>(false);
  const bgColorPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (idTypeDropdownRef.current && !idTypeDropdownRef.current.contains(e.target as Node)) {
        setIsIdTypeDropdownOpen(false);
      }
      if (idFontDropdownRef.current && !idFontDropdownRef.current.contains(e.target as Node)) {
        setIsIdFontDropdownOpen(false);
      }
      if (gridColorPickerRef.current && !gridColorPickerRef.current.contains(e.target as Node)) {
        setIsGridColorPickerOpen(false);
      }
      if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(e.target as Node)) {
        setIsBgColorPickerOpen(false);
      }
    };
    if (isIdTypeDropdownOpen || isIdFontDropdownOpen || isGridColorPickerOpen || isBgColorPickerOpen) {
      document.addEventListener('pointerdown', handlePointerDownOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isIdTypeDropdownOpen, isIdFontDropdownOpen, isGridColorPickerOpen, isBgColorPickerOpen]);

  // Reset dropdowns when switching active tab
  useEffect(() => {
    setIsIdTypeDropdownOpen(false);
    setIsIdFontDropdownOpen(false);
    setIsGridColorPickerOpen(false);
    setIsBgColorPickerOpen(false);
  }, [activeTab]);

  const currentGrid = activeTab !== 'settings' ? grids[activeTab] : null;
  const hasSubGrids = !!(currentGrid?.mergedSubGrids && currentGrid.mergedSubGrids.length > 0);

  // Mathematically accurate columns and rows calculation (especially for merged grids)
  const { effectiveCols, effectiveRows } = React.useMemo(() => {
    if (!currentGrid) return { effectiveCols: 1, effectiveRows: 1 };
    if (!hasSubGrids || !currentGrid.mergedSubGrids || currentGrid.mergedSubGrids.length === 0) {
      return { effectiveCols: currentGrid.cols, effectiveRows: currentGrid.rows };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let activeModuleCount = 0;

    for (let r = 0; r < currentGrid.rows; r++) {
      for (let c = 0; c < currentGrid.cols; c++) {
        if (currentGrid.gridState[r] && currentGrid.gridState[r][c] && isValidModuleCell(currentGrid, r, c)) {
          const geom = getModuleGeometry(currentGrid, r, c);
          minX = Math.min(minX, geom.x);
          maxX = Math.max(maxX, geom.x + geom.width);
          minY = Math.min(minY, geom.y);
          maxY = Math.max(maxY, geom.y + geom.height);
          activeModuleCount++;
        }
      }
    }

    if (activeModuleCount > 0 && isFinite(minX) && isFinite(maxX)) {
      const totalPhysicalWidth = maxX - minX;
      const totalPhysicalHeight = maxY - minY;

      const firstSub = currentGrid.mergedSubGrids[0];
      const dominantModW = firstSub?.moduleWidth || (currentGrid.customModules?.[0]?.width) || currentGrid.moduleWidth || 100;
      const dominantModH = firstSub?.moduleHeight || (currentGrid.customModules?.[0]?.height) || currentGrid.moduleHeight || 100;

      const calcCols = Math.max(1, Math.round(totalPhysicalWidth / dominantModW));
      const calcRows = Math.max(1, Math.round(totalPhysicalHeight / dominantModH));

      return { effectiveCols: calcCols, effectiveRows: calcRows };
    }

    // Fallback if sparse or empty
    const maxCols = Math.max(...currentGrid.mergedSubGrids.map((s) => s.origCols || 1), 1);
    const maxRows = Math.max(...currentGrid.mergedSubGrids.map((s) => s.origRows || 1), 1);
    return { effectiveCols: maxCols, effectiveRows: maxRows };
  }, [currentGrid, hasSubGrids]);

  // Number input stepping helper with continuous holding
  const steppingRef = useRef<{ timer: any; interval: any } | null>(null);

  const startStepping = (action: () => void, isFast = false) => {
    action();
    const intervalTime = isFast ? 10 : 60;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        action();
      }, intervalTime);
      steppingRef.current = { timer, interval };
    }, 400);
    steppingRef.current = { timer, interval: null };
  };

  const stopStepping = () => {
    if (steppingRef.current) {
      if (steppingRef.current.timer) clearTimeout(steppingRef.current.timer);
      if (steppingRef.current.interval) clearInterval(steppingRef.current.interval);
      steppingRef.current = null;
    }
  };

  // Summary computations
  const gridEntries = Object.entries(grids);
  const totalGridsCount = gridEntries.length;

  // Scrollable tabs navigation state
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabsScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 2);
    setCanScrollRight(overflow && scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkTabsScroll();
    const el = tabsContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkTabsScroll, { passive: true });
    window.addEventListener('resize', checkTabsScroll);
    return () => {
      el.removeEventListener('scroll', checkTabsScroll);
      window.removeEventListener('resize', checkTabsScroll);
    };
  }, [checkTabsScroll, gridEntries.length]);

  useEffect(() => {
    checkTabsScroll();
  }, [activeTab, gridEntries, checkTabsScroll]);

  const handleTabsScroll = (dir: 'left' | 'right') => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const offset = 120;
    el.scrollBy({ left: dir === 'left' ? -offset : offset, behavior: 'smooth' });
  };

  return (
    <div
      ref={panelRef}
      className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}
    >
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xml"
        onChange={onImportXML}
        className="hidden"
      />

      {/* Vertical Two-Column Architecture: Left Rail (Screens) + Right Content (Inspector) */}
      <div className="flex flex-1 min-h-0 w-full min-w-[420px]">
        {/* ================= SCREENS VERTICAL SIDEBAR RAIL ================= */}
        <div className="w-[98px] shrink-0 flex flex-col bg-[#111114] border-r border-[#24242a] select-none">
          {/* Rail Header: Global Canvas Tab */}
          <div className="p-1.5 border-b border-[#202026] flex flex-col gap-1.5">
            {/* Global Canvas Tab */}
            <button
              type="button"
              title="Canvas Settings (Global)"
              aria-label="Canvas Settings (Global)"
              className={`group relative w-full h-[40px] rounded flex items-center justify-center transition-colors active:scale-95 cursor-pointer select-none ${
                activeTab === 'settings'
                  ? 'text-blue-400 bg-[#1c1c24]/70'
                  : 'text-[#7e7e90] hover:text-[#e2e8f0] hover:bg-[#181820]/60'
              }`}
              onClick={() => onSwitchTab('settings')}
            >
              {activeTab === 'settings' && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-blue-500 rounded-r-full" />
              )}
              <CanvasIcon className={`w-[22px] h-[22px] shrink-0 transition-colors duration-200 group-hover-sway ${activeTab === 'settings' ? 'text-blue-400' : 'text-[#7e7e90] group-hover:text-blue-300'}`} />
            </button>
          </div>

          {/* Rail Center: Scrollable Vertical List of Screens */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-1 no-scrollbar">
            <div className="px-1 pt-1 pb-0.5 flex items-center justify-between text-[8.5px] font-semibold text-[#5a5a68] uppercase tracking-wider">
              <span>Screens ({gridEntries.length})</span>
            </div>

            {gridEntries.map(([gId, g]) => {
              const isMerged = !!(g.mergedSubGrids && g.mergedSubGrids.length > 0);
              const sizeLabel = isMerged ? 'Merged' : `${g.cols}×${g.rows}`;
              const isActive = activeTab === gId;

              return (
                <button
                  key={gId}
                  type="button"
                  className={`group relative w-full px-1.5 py-1 rounded-md flex flex-col justify-center items-start transition-all cursor-pointer select-none text-left ${
                    isActive
                      ? 'bg-[#22222c] text-white border border-blue-500/50 shadow-sm'
                      : 'bg-[#16161b] hover:bg-[#1e1e26] text-[#8e8e9c] hover:text-[#e2e8f0] border border-[#24242c] hover:border-[#353542]'
                  }`}
                  onClick={() => onSwitchTab(gId)}
                  title={`${g.name} (${sizeLabel})`}
                >
                  {/* Left vertical active bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-[2.5px] bg-blue-500 rounded-r-full" />
                  )}

                  <div className="flex items-center gap-1 w-full min-w-0">
                    <span
                      className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                        g.visible
                          ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span className="truncate text-[10.5px] font-semibold tracking-tight leading-tight">
                      {g.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 w-full pl-2.5 mt-0.5">
                    <span
                      className={`text-[8.5px] font-mono leading-none tracking-tighter ${
                        isActive
                          ? 'text-blue-400 font-medium'
                          : 'text-[#626272] group-hover:text-[#828294]'
                      }`}
                    >
                      {sizeLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rail Footer: Prominent New Screen CTA (Enlarged, nearly square) */}
          <div className="p-1.5 border-t border-[#202026] bg-[#0e0e11] flex flex-col justify-center h-[91px] shrink-0">
            <button
              type="button"
              onClick={onOpenNewGridModal}
              title="Create new screen grid"
              className="w-full h-[78px] px-1.5 rounded-lg flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.15)] group select-none"
            >
              <span className="material-symbols-outlined text-[24px] leading-none transition-transform duration-200 group-hover:rotate-90 text-blue-400 group-hover:text-blue-300">
                add
              </span>
              <span className="font-semibold text-[11px] leading-tight text-center">New Screen</span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT INSPECTOR / TAB CONTENT ================= */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#121215] relative">
          <div className="flex-1 min-h-0 p-3.5 panel-inspector-content">
            {/* Unified Top Row: Reserved Space for Animated Floating Collapse Button + Tab Header (only shown for screens, hidden for canvas) */}
            <div className={`flex items-center gap-2 ${activeTab === 'settings' ? 'mb-1' : 'mb-3'}`}>
              {/* Reserved slot for the animated floating collapse button */}
              <div className="w-[41px] h-[32px] shrink-0" />

              {activeTab !== 'settings' && currentGrid && (
                <div className="flex-1 h-[32px] flex items-center justify-between px-2.5 bg-[#161619] rounded-md border border-[#27272f]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[15px] text-blue-400">
                      grid_view
                    </span>
                    <span className="text-[11.5px] font-semibold text-[#e2e8f0] truncate">
                      {currentGrid.name || 'Screen Inspector'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#78788a] shrink-0">
                    {currentGrid.cols}×{currentGrid.rows}
                  </span>
                </div>
              )}
            </div>

            {/* ================= CANVAS / SETTINGS TAB ================= */}
            {activeTab === 'settings' && (() => {
              const activeTargetGridId = canvasTargetGridId && grids[canvasTargetGridId] ? canvasTargetGridId : (gridEntries[0] ? gridEntries[0][0] : '');
              const activeTargetGrid = grids[activeTargetGridId];

              return (
                <div className="tab-content active space-y-3">
                  {/* 1. Canvas Size (Width / Height & Autofit - if grids exist) */}
                  {gridEntries.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="panel-label">Canvas Width / Height</span>
                        <div className={`flex items-center h-8 bg-[#141418] border border-[#272732] focus-within:border-blue-500/80 rounded-lg overflow-hidden transition-colors ${fitToGrids ? 'opacity-60 pointer-events-none' : ''}`}>
                          {/* Width Half */}
                          <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                            <button
                              type="button"
                              disabled={fitToGrids}
                              title="Decrease Width"
                              aria-label="Decrease Width"
                              className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              onMouseDown={() => startStepping(() => onOutputSizeChange(Math.max(1, outputWidth - 10), outputHeight), true)}
                              onMouseUp={stopStepping}
                              onMouseLeave={stopStepping}
                            >
                              <span className="material-symbols-outlined text-[12px]">remove</span>
                            </button>

                            <input
                              type="number"
                              disabled={fitToGrids}
                              value={outputWidth}
                              min={1}
                              title="Canvas Width"
                              onChange={(e) => onOutputSizeChange(parseInt(e.target.value, 10) || 1, outputHeight)}
                              className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70"
                            />

                            <button
                              type="button"
                              disabled={fitToGrids}
                              title="Increase Width"
                              aria-label="Increase Width"
                              className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth + 10, outputHeight), true)}
                              onMouseUp={stopStepping}
                              onMouseLeave={stopStepping}
                            >
                              <span className="material-symbols-outlined text-[12px]">add</span>
                            </button>
                          </div>

                          {/* Divider */}
                          <div className="w-[1px] h-3.5 bg-[#272734] shrink-0" />

                          {/* Height Half */}
                          <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                            <button
                              type="button"
                              disabled={fitToGrids}
                              title="Decrease Height"
                              aria-label="Decrease Height"
                              className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth, Math.max(1, outputHeight - 10)), true)}
                              onMouseUp={stopStepping}
                              onMouseLeave={stopStepping}
                            >
                              <span className="material-symbols-outlined text-[12px]">remove</span>
                            </button>

                            <input
                              type="number"
                              disabled={fitToGrids}
                              value={outputHeight}
                              min={1}
                              title="Canvas Height"
                              onChange={(e) => onOutputSizeChange(outputWidth, parseInt(e.target.value, 10) || 1)}
                              className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-70"
                            />

                            <button
                              type="button"
                              disabled={fitToGrids}
                              title="Increase Height"
                              aria-label="Increase Height"
                              className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                              onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth, outputHeight + 10), true)}
                              onMouseUp={stopStepping}
                              onMouseLeave={stopStepping}
                            >
                              <span className="material-symbols-outlined text-[12px]">add</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Autofit Switch */}
                      <div className="flex flex-col shrink-0">
                        <span className="panel-label whitespace-nowrap">Autofit</span>
                        <div
                          onClick={() => onFitToGridsChange(!fitToGrids)}
                          title={fitToGrids ? 'Autofit is ON (Canvas auto-fits screens)' : 'Autofit is OFF (Custom canvas size)'}
                          className="h-8 px-2 bg-[#141418] border border-[#272732] hover:border-[#353542] rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <label className="panel-toggle-switch scale-75 cursor-pointer pointer-events-none">
                            <input
                              type="checkbox"
                              checked={fitToGrids}
                              onChange={(e) => onFitToGridsChange(e.target.checked)}
                            />
                            <div className="panel-toggle-track">
                              <div className="panel-toggle-knob" />
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Summary Section (Always Visible when grids exist) */}
                  {gridEntries.length > 0 && (
                    <div className="p-3 bg-[#16161a] rounded-xl border border-[#23232c] shadow-xs space-y-2 font-mono text-[11px] text-[#8e8e9c]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#23232c]">
                        <div className="flex items-center gap-1.5 font-sans font-semibold text-[11.5px] uppercase tracking-wider text-[#d0d0dc]">
                          <span className="material-symbols-outlined text-[15px] text-emerald-400">monitoring</span>
                          <span>Summary</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#78788a]">
                          {totalGridsCount} {totalGridsCount === 1 ? 'Screen' : 'Screens'}
                        </span>
                      </div>

                      <div className="text-[10px] text-[#707080] pb-1 border-b border-[#23232c]">
                        Canvas: {outputWidth}×{outputHeight}px
                      </div>

                      {gridEntries.map(([gId, grid]) => {
                        const dataLinesCount = grid.connections.length;
                        const powerLinesCount = grid.selectedGroups.length;

                        let totalDataLineCabinets = 0;
                        grid.connections.forEach((conn) => {
                          conn.points.forEach((point) => {
                            if (grid.gridState[point.row] && grid.gridState[point.row][point.col]) {
                              totalDataLineCabinets++;
                            }
                          });
                        });

                        let totalPowerGroupCabinets = 0;
                        grid.selectedGroups.forEach((group) => {
                          group.modules.forEach((module) => {
                            if (grid.gridState[module.row] && grid.gridState[module.row][module.col]) {
                              totalPowerGroupCabinets++;
                            }
                          });
                        });

                        const avgDataLine = dataLinesCount > 0 ? (totalDataLineCabinets / dataLinesCount).toFixed(1) : '0';
                        const avgPowerGroup = powerLinesCount > 0 ? (totalPowerGroupCabinets / powerLinesCount).toFixed(1) : '0';

                        let notConnectedCount = 0;
                        let totalCabinets = 0;
                        for (let r = 0; r < grid.rows; r++) {
                          for (let c = 0; c < grid.cols; c++) {
                            if (isValidModuleCell(grid, r, c) && grid.gridState[r] && grid.gridState[r][c]) {
                              totalCabinets++;
                              const inDataLine = grid.connections.some((conn) =>
                                conn.points.some((p) => p.row === r && p.col === c)
                              );
                              const inPowerLine = grid.selectedGroups.some((group) =>
                                group.modules.some((m) => m.row === r && m.col === c)
                              );
                              if (!(inDataLine && inPowerLine)) {
                                notConnectedCount++;
                              }
                            }
                          }
                        }

                        return (
                          <div key={gId} className="bg-[#111114] p-2 rounded-lg border border-[#1e1e24] space-y-1">
                            <div className="flex items-center justify-between text-[#c0c0d0] font-semibold text-[11px]">
                              <span>{grid.name}</span>
                              <span className="text-[#757588] text-[10px] font-normal">{grid.cols}×{grid.rows} ({totalCabinets} cabs)</span>
                            </div>
                            <div className="text-[10px] text-[#828292] leading-tight space-y-0.5 pt-0.5">
                              <div className="flex justify-between">
                                <span>Data Lines:</span>
                                <span className="text-[#a0a0b2]">{dataLinesCount} {dataLinesCount > 0 && `(avg. ${avgDataLine})`}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Power Groups:</span>
                                <span className="text-[#a0a0b2]">{powerLinesCount} {powerLinesCount > 0 && `(avg. ${avgPowerGroup})`}</span>
                              </div>
                              {notConnectedCount > 0 && (
                                <div className="flex justify-between text-amber-400/90 pt-0.5">
                                  <span>Not Connected:</span>
                                  <span>{notConnectedCount} / {totalCabinets}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Screen Positioning & Drag Mode (Accordion - if grids exist) */}
                  {gridEntries.length > 0 && (
                    <div className="collapsible-section">
                      <button
                        type="button"
                        className={`collapsible-header ${screenPositioningOpen ? '' : 'collapsed'}`}
                        onClick={() => setScreenPositioningOpen(!screenPositioningOpen)}
                      >
                        <div className="flex items-center justify-between w-full pr-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-blue-400">open_with</span>
                            <span>Screen Positioning</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeTargetGrid && (
                              <span className="text-[10px] font-mono text-[#8b8b96] bg-[#111114] px-1.5 py-0.5 rounded border border-[#23232c]">
                                [{Math.round(activeTargetGrid.offsetX)};{Math.round(activeTargetGrid.offsetY)}]
                              </span>
                            )}
                            <span className="material-symbols-outlined collapsible-toggle text-[18px]">
                              {screenPositioningOpen ? 'remove' : 'add'}
                            </span>
                          </div>
                        </div>
                      </button>

                      {screenPositioningOpen && (
                        <div className="p-3 bg-[#141418] border border-t-0 border-[#262632] rounded-b-xl space-y-2.5">
                          {/* Interactive Drag Mode Switcher */}
                          <div
                            onClick={() => onCanvasDragModeChange?.(!canvasDragMode)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between ${
                              canvasDragMode
                                ? 'bg-blue-950/30 border-blue-500/50 shadow-sm'
                                : 'bg-[#141418] border-[#272732] hover:border-[#353542]'
                            }`}
                            title={canvasDragMode ? 'Drag Mode is Active (Click and drag any screen on canvas)' : 'Drag Mode is Inactive (Click to enable)'}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                                  canvasDragMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-[#22222a] text-[#808090]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[16px]">drag_pan</span>
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11.5px] font-semibold text-[#e2e8f0]">Canvas Drag Mode</span>
                                  <span
                                    className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                      canvasDragMode
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}
                                  >
                                    {canvasDragMode ? 'Active' : 'Off'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] text-[#78788a] leading-tight">
                                  Drag screens with smart snapping & guides
                                </span>
                              </div>
                            </div>

                            <label className="panel-toggle-switch scale-75 cursor-pointer pointer-events-none">
                              <input
                                type="checkbox"
                                checked={canvasDragMode}
                                onChange={(e) => onCanvasDragModeChange?.(e.target.checked)}
                              />
                              <div className="panel-toggle-track">
                                <div className="panel-toggle-knob" />
                              </div>
                            </label>
                          </div>

                          {/* Screen Selector (if multiple grids exist) */}
                          {gridEntries.length > 1 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#707080] font-medium shrink-0">Screen:</span>
                              <div className="flex-1 min-w-0">
                                <CustomSelect
                                  value={activeTargetGridId}
                                  options={gridEntries.map(([gId, g]) => ({
                                    value: gId,
                                    label: `${g.name} (${g.cols}×${g.rows})`,
                                  }))}
                                  onChange={(val) => setCanvasTargetGridId(val)}
                                  className="!h-7 !px-2 text-[11px]"
                                />
                              </div>
                            </div>
                          )}

                          {/* Snapping Options Toggles */}
                          <div className="flex flex-col gap-1 pt-1 border-t border-[#23232c]">
                            <label className="flex items-center justify-between text-[10.5px] text-[#9a9ab0] cursor-pointer hover:text-white select-none">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-cyan-400">devices</span>
                                Snap to other screens
                              </span>
                              <input
                                type="checkbox"
                                checked={dragOptions.snapToGrids}
                                onChange={(e) => onDragOptionsChange?.({ ...dragOptions, snapToGrids: e.target.checked })}
                                className="accent-blue-500 rounded cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between text-[10.5px] text-[#9a9ab0] cursor-pointer hover:text-white select-none">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-cyan-400">crop_free</span>
                                Snap to canvas edges & center
                              </span>
                              <input
                                type="checkbox"
                                checked={dragOptions.snapToCanvas}
                                onChange={(e) => onDragOptionsChange?.({ ...dragOptions, snapToCanvas: e.target.checked })}
                                className="accent-blue-500 rounded cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between text-[10.5px] text-[#9a9ab0] cursor-pointer hover:text-white select-none">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-cyan-400">grid_on</span>
                                Snap to module grid step
                              </span>
                              <input
                                type="checkbox"
                                checked={dragOptions.snapToModuleStep}
                                onChange={(e) => onDragOptionsChange?.({ ...dragOptions, snapToModuleStep: e.target.checked })}
                                className="accent-blue-500 rounded cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. History (Accordion) */}
                  <div className="collapsible-section">
                    <button
                      type="button"
                      className={`collapsible-header ${historyOpen ? '' : 'collapsed'}`}
                      onClick={() => setHistoryOpen(!historyOpen)}
                    >
                      <div className="flex items-center justify-between w-full pr-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-blue-400">history</span>
                          <span>History</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-normal text-[#6b6b7b]">
                            {history.length} {history.length === 1 ? 'step' : 'steps'}
                          </span>
                          <span className="material-symbols-outlined collapsible-toggle text-[18px]">
                            {historyOpen ? 'remove' : 'add'}
                          </span>
                        </div>
                      </div>
                    </button>
                    {historyOpen && (
                      <div className="p-1.5 bg-[#141418] border border-t-0 border-[#262632] rounded-b-xl max-h-[220px] overflow-y-auto no-scrollbar">
                        {history.length === 0 ? (
                          <div className="text-center text-[#707078] py-2 text-[11px]">No history yet</div>
                        ) : (
                          <div className="space-y-1">
                            {[...history].reverse().map((snapshot, idx) => {
                              const actualIdx = history.length - 1 - idx;
                              const isCurrent = actualIdx === currentHistoryIndex;
                              const timeStr = new Date(snapshot.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              });
                              return (
                                <div
                                  key={actualIdx}
                                  onClick={() => onJumpToHistory(actualIdx)}
                                  className={`px-2 py-1.5 rounded-lg cursor-pointer text-[11px] transition-all flex items-center justify-between gap-2 select-none ${
                                    isCurrent
                                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-medium'
                                      : 'text-[#9494a4] hover:bg-[#1f1f28] hover:text-[#d0d0dc] border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]' : 'bg-[#404050]'}`} />
                                    <span className="truncate">
                                      {actualIdx + 1}. {snapshot.actionName}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-[#686878] shrink-0">
                                    {timeStr}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Preferences (Accordion) */}
                  <div className="collapsible-section">
                    <button
                      type="button"
                      className={`collapsible-header ${preferencesOpen ? '' : 'collapsed'}`}
                      onClick={() => setPreferencesOpen(!preferencesOpen)}
                    >
                      <div className="flex items-center justify-between w-full pr-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-blue-400">tune</span>
                          <span>Preferences</span>
                        </div>
                        <span className="material-symbols-outlined collapsible-toggle text-[18px]">
                          {preferencesOpen ? 'remove' : 'add'}
                        </span>
                      </div>
                    </button>
                    {preferencesOpen && (
                      <div className="p-3 bg-[#141418] border border-t-0 border-[#262632] rounded-b-xl space-y-3">
                        {/* 1. Render Engine (Modern / Legacy) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Render Engine</span>
                            <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">
                              {altLineStyle ? 'Modern' : 'Legacy'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#111114] rounded-lg border border-[#262632]">
                            <button
                              type="button"
                              onClick={() => onAltLineStyleChange(true)}
                              className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                altLineStyle
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-[#888899] hover:text-[#e0e0ec] hover:bg-[#202028]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">insights</span>
                              Modern
                            </button>
                            <button
                              type="button"
                              onClick={() => onAltLineStyleChange(false)}
                              className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                !altLineStyle
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-[#888899] hover:text-[#e0e0ec] hover:bg-[#202028]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
                              Legacy
                            </button>
                          </div>
                        </div>

                        {/* 2. Cable Curvature (Modern Mode only) */}
                        <div className={`space-y-1.5 transition-opacity ${altLineStyle ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Cable Curvature</span>
                            <span className="text-[11px] font-mono text-[#e0e0e0] font-semibold">
                              {Math.round(cableCurvature * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#606070] font-mono">0%</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={Math.round(cableCurvature * 100)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) / 100;
                                if (onCableCurvatureChange) onCableCurvatureChange(val);
                              }}
                              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-[#252530] rounded-lg"
                            />
                            <span className="text-[10px] text-[#606070] font-mono">100%</span>
                          </div>
                        </div>

                        {/* 3. Canvas Background (Styled in render engine UI style) */}
                        <div className="pt-2 border-t border-[#22222a] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Canvas Background</span>
                            <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold">
                              {canvasBackground === 'transparent' ? 'None' : canvasBackground}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#111114] rounded-lg border border-[#262632]">
                            {(
                              [
                                { id: 'transparent', label: 'None', icon: 'texture' },
                                { id: 'solid', label: 'Solid', icon: 'format_paint' },
                                { id: 'grid', label: 'Grid', icon: 'grid_view' },
                                { id: 'dots', label: 'Dots', icon: 'grain' }
                              ] as const
                            ).map((bg) => (
                              <button
                                key={bg.id}
                                type="button"
                                onClick={() => onCanvasBackgroundChange?.(bg.id)}
                                className={`h-7 px-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                                  canvasBackground === bg.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-[#888899] hover:text-[#e0e0ec] hover:bg-[#202028]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[13px]">{bg.icon}</span>
                                <span>{bg.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Solid Background Color Picker */}
                          {canvasBackground === 'solid' && (
                            <div className="flex flex-col gap-2 p-2.5 mt-1.5 bg-[#141418] rounded-xl border border-[#24242c]" ref={bgColorPickerRef}>
                              <div className="flex items-center justify-between">
                                <span className="panel-label mb-0 ml-0 leading-none">
                                  BACKGROUND COLOR
                                </span>
                              </div>

                              {/* Trigger Button */}
                              <button
                                type="button"
                                onClick={() => setIsBgColorPickerOpen((prev) => !prev)}
                                className={`w-full h-8 px-2 bg-[#101014] border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                                  isBgColorPickerOpen
                                    ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
                                    : 'border-[#272736] hover:border-[#3b82f6]/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-4 h-4 rounded-md border border-white/20 shrink-0 shadow-xs"
                                    style={{ backgroundColor: backgroundColor }}
                                  />
                                  <span className="text-slate-100 font-mono text-xs uppercase font-medium">
                                    {backgroundColor}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-[#8b8b98] tracking-wider uppercase">
                                    Custom
                                  </span>
                                  <span className={`material-symbols-outlined text-[14px] text-[#64748b] transition-transform duration-150 ${
                                    isBgColorPickerOpen ? 'rotate-180 text-blue-400' : ''
                                  }`}>
                                    expand_more
                                  </span>
                                </div>
                              </button>

                              {/* Custom ColorPicker Container */}
                              {isBgColorPickerOpen && (
                                <div className="mt-1">
                                  <ColorPicker
                                    color={backgroundColor}
                                    onChange={(val) => onBackgroundColorChange?.(val)}
                                    onClose={() => setIsBgColorPickerOpen(false)}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grid Background Configuration */}
                          {canvasBackground === 'grid' && (() => {
                            const patternColors = getPatternColors(patternBrightness);
                            return (
                              <div className="p-2 mt-1.5 bg-[#101014] rounded-lg border border-[#242430] space-y-2.5">
                                {/* Cell Size Slider */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] text-[#a0a0b0] font-medium">Cell Size</span>
                                    <span className="text-[11px] font-mono font-bold text-blue-400">{gridCellSize} px</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={10}
                                      max={100}
                                      step={5}
                                      value={gridCellSize}
                                      onChange={(e) => onGridCellSizeChange?.(Number(e.target.value))}
                                      className="panel-slider flex-1 cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Brightness Slider */}
                                <div className="space-y-1 pt-1.5 border-t border-[#1f1f28]">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] text-[#a0a0b0] font-medium">Background Brightness</span>
                                    <span className="text-[11px] font-mono font-bold text-cyan-400">{patternBrightness}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={patternBrightness}
                                      onChange={(e) => onPatternBrightnessChange?.(Number(e.target.value))}
                                      className="panel-slider flex-1 cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9.5px] text-[#606070] pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                        style={{ backgroundColor: patternColors.bgColor }}
                                      />
                                      <span>Bg: <strong className="text-[#9999a8] font-mono uppercase">{patternColors.bgColor}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span>Line: <strong className="text-[#9999a8] font-mono">{patternColors.fgColor === '0, 0, 0' ? 'Black' : 'White'}</strong></span>
                                      <span
                                        className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                        style={{ backgroundColor: `rgb(${patternColors.fgColor})` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Dots Background Configuration */}
                          {canvasBackground === 'dots' && (() => {
                            const patternColors = getPatternColors(patternBrightness);
                            return (
                              <div className="p-2 mt-1.5 bg-[#101014] rounded-lg border border-[#242430] space-y-2.5">
                                {/* Dot Spacing Slider */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] text-[#a0a0b0] font-medium">Dot Spacing</span>
                                    <span className="text-[11px] font-mono font-bold text-blue-400">{dotsSpacing} px</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={10}
                                      max={100}
                                      step={5}
                                      value={dotsSpacing}
                                      onChange={(e) => onDotsSpacingChange?.(Number(e.target.value))}
                                      className="panel-slider flex-1 cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* Brightness Slider */}
                                <div className="space-y-1 pt-1.5 border-t border-[#1f1f28]">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] text-[#a0a0b0] font-medium">Background Brightness</span>
                                    <span className="text-[11px] font-mono font-bold text-cyan-400">{patternBrightness}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={patternBrightness}
                                      onChange={(e) => onPatternBrightnessChange?.(Number(e.target.value))}
                                      className="panel-slider flex-1 cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9.5px] text-[#606070] pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                        style={{ backgroundColor: patternColors.bgColor }}
                                      />
                                      <span>Bg: <strong className="text-[#9999a8] font-mono uppercase">{patternColors.bgColor}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span>Dot: <strong className="text-[#9999a8] font-mono">{patternColors.fgColor === '0, 0, 0' ? 'Black' : 'White'}</strong></span>
                                      <span
                                        className="inline-block w-3 h-3 rounded-xs border border-white/20"
                                        style={{ backgroundColor: `rgb(${patternColors.fgColor})` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 4. Show Canvas Rulers */}
                        <div className="pt-2 border-t border-[#22222a] flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Canvas Rulers</span>
                            <span className="text-[9.5px] text-[#707080]">Show coordinate rulers along canvas edges</span>
                          </div>
                          <label className="panel-toggle-switch scale-75 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showRulers}
                              onChange={(e) => onShowRulersChange?.(e.target.checked)}
                            />
                            <div className="panel-toggle-track">
                              <div className="panel-toggle-knob" />
                            </div>
                          </label>
                        </div>

                        {/* 5. Auto-save to LocalStorage */}
                        <div className="pt-2 border-t border-[#22222a] flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Auto-save</span>
                            <span className="text-[9.5px] text-[#707080]">Preserve project state in LocalStorage</span>
                          </div>
                          <label className="panel-toggle-switch scale-75 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoSave}
                              onChange={(e) => onAutoSaveChange && onAutoSaveChange(e.target.checked)}
                            />
                            <div className="panel-toggle-track">
                              <div className="panel-toggle-knob" />
                            </div>
                          </label>
                        </div>

                        {/* 6. Autofocus */}
                        <div className="pt-2 border-t border-[#22222a] flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-[#a6a6b8]">Autofocus</span>
                            <span className="text-[9.5px] text-[#707080]">Auto-fit on canvas & focus screen on select</span>
                          </div>
                          <label className="panel-toggle-switch scale-75 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoFocus}
                              onChange={(e) => onAutoFocusChange && onAutoFocusChange(e.target.checked)}
                            />
                            <div className="panel-toggle-track">
                              <div className="panel-toggle-knob" />
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. LedFlow Author Note */}
                  <div className="text-[11px] font-semibold text-[#404040] pt-2 text-center">
                    LedFlow v{APP_VERSION} by {APP_AUTHOR} @ Blackout Minsk
                  </div>
                </div>
              );
            })()}

      {/* ================= INDIVIDUAL GRID TAB ================= */}
      {activeTab !== 'settings' && currentGrid && (
        <div className="tab-content active">
          {/* Grid Quick Action Buttons: Rename, Merge, Unmerge, Delete, Toggle Visible, Focus */}
          <div className="grid grid-cols-6 gap-1 mb-3">
            <button
              type="button"
              className="panel-icon-btn btn-amber h-10"
              onClick={onOpenRenameModal}
              title="Rename grid"
            >
              <span className="material-symbols-outlined text-[19px]">edit</span>
            </button>
            <button
              type="button"
              disabled={gridEntries.length < 2}
              className="panel-icon-btn btn-slate h-10 disabled:opacity-35 text-blue-400 hover:text-blue-300"
              onClick={onOpenMergeModal}
              title={gridEntries.length >= 2 ? 'Merge screens into one canvas' : 'Need at least 2 screens to merge'}
            >
              <MergeIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              disabled={!hasSubGrids}
              className="panel-icon-btn btn-slate h-10 disabled:opacity-35 text-amber-400 hover:text-amber-300"
              onClick={() => onUnmergeGrid(activeTab)}
              title={hasSubGrids ? 'Unmerge grid' : 'Grid is not merged'}
            >
              <UnmergeIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              className="panel-icon-btn btn-red h-10"
              onClick={() => onDeleteGrid(activeTab)}
              title="Delete grid"
            >
              <span className="material-symbols-outlined text-[19px]">delete</span>
            </button>
            <button
              type="button"
              className="panel-icon-btn btn-slate h-10"
              onClick={() => onToggleGridVisibility(activeTab)}
              title={currentGrid.visible ? 'Hide grid' : 'Show grid'}
            >
              <span className="material-symbols-outlined text-[19px]">
                {currentGrid.visible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
            <button
              type="button"
              className="panel-icon-btn btn-slate h-10"
              onClick={() => onFocusOnGrid(activeTab)}
              title="Focus grid"
            >
              <span className="material-symbols-outlined text-[19px]">center_focus_strong</span>
            </button>
          </div>

          {/* Mode Selector & Inline Action Control (Data, Power, Hide) */}
          <div className="mb-3">
            <span className="panel-label">Mode</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#141418] rounded-xl border border-[#272732]">
              {(
                [
                  { id: 'data-lines', label: 'Data', icon: 'alt_route', title: 'Create data lines' },
                  { id: 'power-lines', label: 'Power', icon: 'bolt', title: 'Create power groups' },
                  { id: 'visibility', label: 'Hide', icon: 'visibility_off', title: 'Show/hide modules' },
                ] as const
              ).map((m) => {
                const isActive = currentGrid.mode === m.id;
                const hasSubTools = m.id === 'data-lines' || m.id === 'power-lines';

                return (
                  <div key={m.id} className="flex flex-col gap-1 min-w-0">
                    <button
                      type="button"
                      title={m.title}
                      className={`w-full py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-transparent text-[#8b8b96] hover:text-[#e0e0e0] hover:bg-[#1e1e26]'
                      }`}
                      onClick={() => {
                        const newMode = m.id as GridMode;
                        onUpdateGrid(activeTab, (prev) => ({
                          ...prev,
                          mode: newMode,
                          rectFirstCorner: null,
                          powerFirstCorner: null,
                          selectedModules: [],
                          currentConnection: [],
                          currentColor: null,
                          currentColorIndex: null
                        }));
                        Object.keys(grids).forEach((gId) => {
                          if (gId !== activeTab) {
                            onUpdateGrid(gId, (prev) => ({
                              ...prev,
                              mode: newMode,
                              rectFirstCorner: null,
                              powerFirstCorner: null,
                              selectedModules: [],
                              currentConnection: [],
                              currentColor: null,
                              currentColorIndex: null
                            }));
                          }
                        });
                      }}
                    >
                      <span className="material-symbols-outlined text-[14px]">{m.icon}</span>
                      <span className="truncate">{m.label}</span>
                    </button>

                    {/* Compact Sub-Mode Switcher directly beneath active Data / Power mode */}
                    {isActive && hasSubTools && (
                      <div className="flex items-center bg-[#0d0d10] p-0.5 rounded-md border border-[#2b2b36] shadow-inner">
                        <button
                          type="button"
                          className={`flex-1 h-5 rounded flex items-center justify-center text-[9.5px] font-semibold transition-all cursor-pointer ${
                            (currentGrid.toolAction || 'draw') === 'draw'
                              ? 'bg-[#1e2742] text-blue-300 font-bold border border-blue-500/40 shadow-xs'
                              : 'text-[#7e7e90] hover:text-[#d0d0dc]'
                          }`}
                          onClick={() => {
                            onUpdateGrid(activeTab, (prev) => ({
                              ...prev,
                              toolAction: 'draw'
                            }));
                            Object.keys(grids).forEach((gId) => {
                              if (gId !== activeTab) {
                                onUpdateGrid(gId, (prev) => ({ ...prev, toolAction: 'draw' }));
                              }
                            });
                          }}
                          title="Draw mode"
                        >
                          Draw
                        </button>
                        <button
                          type="button"
                          className={`flex-1 h-5 rounded flex items-center justify-center text-[9.5px] font-semibold transition-all cursor-pointer ${
                            currentGrid.toolAction === 'erase'
                              ? 'bg-[#3b181e] text-red-300 font-bold border border-red-500/40 shadow-xs'
                              : 'text-[#7e7e90] hover:text-red-300'
                          }`}
                          onClick={() => {
                            onUpdateGrid(activeTab, (prev) => ({
                              ...prev,
                              toolAction: 'erase',
                              selectedModules: [],
                              currentConnection: [],
                              currentColor: null,
                              currentColorIndex: null
                            }));
                            Object.keys(grids).forEach((gId) => {
                              if (gId !== activeTab) {
                                onUpdateGrid(gId, (prev) => ({
                                  ...prev,
                                  toolAction: 'erase',
                                  selectedModules: [],
                                  currentConnection: [],
                                  currentColor: null,
                                  currentColorIndex: null
                                }));
                              }
                            });
                          }}
                          title="Remove mode"
                        >
                          Erase
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Grid Settings: Columns/Rows & Offset X/Y */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Columns & Rows Combined Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5 h-3.5 px-0.5">
                <span className="panel-label mb-0 ml-0 leading-none">Cols / Rows</span>
                {hasSubGrids && (
                  <span
                    className="text-[#64748b] flex items-center justify-center cursor-default shrink-0"
                    title="Blocked for merged"
                  >
                    <span className="material-symbols-outlined text-[6.5px] leading-none select-none">lock</span>
                  </span>
                )}
              </div>
              <div className={`flex items-center h-8 bg-[#141418] border border-[#272732] focus-within:border-blue-500/80 rounded-lg overflow-hidden transition-colors ${hasSubGrids ? 'opacity-60 pointer-events-none' : ''}`}>
                {/* Columns Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    disabled={hasSubGrids}
                    title="Decrease Columns"
                    aria-label="Decrease Columns"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    onMouseDown={() => {
                      if (hasSubGrids) return;
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => {
                          const newCols = Math.max(1, prev.cols - 1);
                          const newState = Array(prev.rows).fill(null).map((_, r) =>
                            Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                          );
                          return { ...prev, cols: newCols, gridState: newState };
                        });
                      });
                    }}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">remove</span>
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={hasSubGrids}
                    value={hasSubGrids ? effectiveCols : currentGrid.cols}
                    title={hasSubGrids ? `Merged grid total span: ${effectiveCols} columns (locked)` : 'Columns'}
                    onChange={(e) => {
                      if (hasSubGrids) return;
                      const newCols = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                      onUpdateGrid(activeTab, (prev) => {
                        const newState = Array(prev.rows).fill(null).map((_, r) =>
                          Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, cols: newCols, gridState: newState };
                      });
                    }}
                    className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                  />

                  <button
                    type="button"
                    disabled={hasSubGrids}
                    title="Increase Columns"
                    aria-label="Increase Columns"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    onMouseDown={() => {
                      if (hasSubGrids) return;
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => {
                          const newCols = Math.min(100, prev.cols + 1);
                          const newState = Array(prev.rows).fill(null).map((_, r) =>
                            Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                          );
                          return { ...prev, cols: newCols, gridState: newState };
                        });
                      });
                    }}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="w-[1px] h-3.5 bg-[#272734] shrink-0" />

                {/* Rows Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    disabled={hasSubGrids}
                    title="Decrease Rows"
                    aria-label="Decrease Rows"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    onMouseDown={() => {
                      if (hasSubGrids) return;
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => {
                          const newRows = Math.max(1, prev.rows - 1);
                          const newState = Array(newRows).fill(null).map((_, r) =>
                            Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                          );
                          return { ...prev, rows: newRows, gridState: newState };
                        });
                      });
                    }}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">remove</span>
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={hasSubGrids}
                    value={hasSubGrids ? effectiveRows : currentGrid.rows}
                    title={hasSubGrids ? `Merged grid total span: ${effectiveRows} rows (locked)` : 'Rows'}
                    onChange={(e) => {
                      if (hasSubGrids) return;
                      const newRows = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                      onUpdateGrid(activeTab, (prev) => {
                        const newState = Array(newRows).fill(null).map((_, r) =>
                          Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, rows: newRows, gridState: newState };
                      });
                    }}
                    className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                  />

                  <button
                    type="button"
                    disabled={hasSubGrids}
                    title="Increase Rows"
                    aria-label="Increase Rows"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    onMouseDown={() => {
                      if (hasSubGrids) return;
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => {
                          const newRows = Math.min(100, prev.rows + 1);
                          const newState = Array(newRows).fill(null).map((_, r) =>
                            Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                          );
                          return { ...prev, rows: newRows, gridState: newState };
                        });
                      });
                    }}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Offset X / Y Combined Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5 h-3.5 px-0.5">
                <span className="panel-label mb-0 ml-0 leading-none">Offset (X / Y)</span>
              </div>
              <div className="flex items-center h-8 bg-[#141418] border border-[#272732] focus-within:border-blue-500/80 rounded-lg overflow-hidden transition-colors">
                {/* Offset X Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    title="Decrease Offset X"
                    aria-label="Decrease Offset X"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0"
                    onMouseDown={() =>
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => ({
                          ...prev,
                          offsetX: Math.max(0, prev.offsetX - (prev.moduleWidth || 100))
                        }));
                      }, true)
                    }
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">remove</span>
                  </button>

                  <input
                    type="number"
                    min={0}
                    step={currentGrid.moduleWidth || 100}
                    value={currentGrid.offsetX}
                    title="Offset X"
                    onChange={(e) => {
                      const newOffset = Math.max(0, parseInt(e.target.value, 10) || 0);
                      onUpdateGrid(activeTab, (prev) => ({ ...prev, offsetX: newOffset }));
                    }}
                    className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    title="Increase Offset X"
                    aria-label="Increase Offset X"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0"
                    onMouseDown={() =>
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => ({
                          ...prev,
                          offsetX: prev.offsetX + (prev.moduleWidth || 100)
                        }));
                      }, true)
                    }
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="w-[1px] h-3.5 bg-[#272734] shrink-0" />

                {/* Offset Y Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    title="Decrease Offset Y"
                    aria-label="Decrease Offset Y"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0"
                    onMouseDown={() =>
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => ({
                          ...prev,
                          offsetY: Math.max(0, prev.offsetY - (prev.moduleHeight || 100))
                        }));
                      }, true)
                    }
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">remove</span>
                  </button>

                  <input
                    type="number"
                    min={0}
                    step={currentGrid.moduleHeight || 100}
                    value={currentGrid.offsetY}
                    title="Offset Y"
                    onChange={(e) => {
                      const newOffset = Math.max(0, parseInt(e.target.value, 10) || 0);
                      onUpdateGrid(activeTab, (prev) => ({ ...prev, offsetY: newOffset }));
                    }}
                    className="flex-1 min-w-0 h-full bg-transparent text-center text-[#e2e8f0] text-[11px] font-mono font-medium outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    title="Increase Offset Y"
                    aria-label="Increase Offset Y"
                    className="w-4.5 h-5 rounded flex items-center justify-center text-[#7e7e90] hover:text-white hover:bg-[#22222c] active:scale-95 transition-all cursor-pointer select-none shrink-0"
                    onMouseDown={() =>
                      startStepping(() => {
                        onUpdateGrid(activeTab, (prev) => ({
                          ...prev,
                          offsetY: prev.offsetY + (prev.moduleHeight || 100)
                        }));
                      }, true)
                    }
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Style Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${styleOpen ? '' : 'collapsed'}`}
              onClick={() => setStyleOpen(!styleOpen)}
            >
              <span className="flex-1 text-left">Grid Style</span>
              <span className="material-symbols-outlined collapsible-toggle">
                {styleOpen ? 'remove' : 'add'}
              </span>
            </button>
            {styleOpen && (() => {
              const hasSubGrids = !!(currentGrid.mergedSubGrids && currentGrid.mergedSubGrids.length > 0);
              const activeSub = hasSubGrids
                ? (currentGrid.mergedSubGrids!.find((s) => s.id === selectedSubGridId) || currentGrid.mergedSubGrids![0])
                : null;
              const activeColor = activeSub ? activeSub.color : currentGrid.moduleColor;
              const activeIdType = activeSub?.idType || currentGrid.idType;
              const activeIdFont = activeSub?.idFont || currentGrid.idFont || DEFAULT_ID_FONT;
              const activeLabelSize = activeSub?.moduleLabelSizePercent ?? currentGrid.moduleLabelSizePercent;
              const activeModuleSize = activeSub?.moduleSize || currentGrid.moduleSize;
              const activeModuleWidth = activeSub?.moduleWidth || currentGrid.moduleWidth;
              const activeModuleHeight = activeSub?.moduleHeight || currentGrid.moduleHeight;

              const handleColorChange = (c: string) => {
                const contrastColor = getMostContrastColor(c);
                if (hasSubGrids && activeSub) {
                  onUpdateGrid(
                    activeTab,
                    (prev) => {
                      const newModuleColors: Record<string, string> = { ...(prev.moduleColors || {}) };
                      const targetSub = prev.mergedSubGrids?.find((s) => s.id === activeSub.id);
                      if (targetSub) {
                        targetSub.modules.forEach((m) => {
                          newModuleColors[`${m.row},${m.col}`] = c;
                        });
                      }
                      const updatedSubGrids = prev.mergedSubGrids?.map((sub) =>
                        sub.id === activeSub.id
                          ? { ...sub, color: c, labelColor: contrastColor }
                          : sub
                      );
                      return {
                        ...prev,
                        mergedSubGrids: updatedSubGrids,
                        moduleColors: newModuleColors
                      };
                    },
                    `Changed color of section "${activeSub.name}" to ${c}`
                  );
                } else {
                  onUpdateGrid(
                    activeTab,
                    (prev) => ({
                      ...prev,
                      moduleColor: c,
                      moduleLabelColor: contrastColor
                    }),
                    `Changed module color to ${c}`
                  );
                }
              };

              const handleIdTypeChange = (val: IdType) => {
                if (hasSubGrids && activeSub) {
                  onUpdateGrid(
                    activeTab,
                    (prev) => {
                      const newModuleIds: Record<string, string> = { ...(prev.moduleIds || {}) };
                      const targetSub = prev.mergedSubGrids?.find((s) => s.id === activeSub.id);
                      if (targetSub) {
                        targetSub.modules.forEach((m) => {
                          const orig = targetSub.moduleOriginMapping?.find((om) => om.row === m.row && om.col === m.col);
                          const origRow = orig !== undefined ? orig.origRow : m.row;
                          const origCol = orig !== undefined ? orig.origCol : m.col;
                          newModuleIds[`${m.row},${m.col}`] = computeSubGridModuleId(targetSub, origRow, origCol, val);
                        });
                      }
                      const updatedSubGrids = prev.mergedSubGrids?.map((sub) =>
                        sub.id === activeSub.id ? { ...sub, idType: val } : sub
                      );
                      return {
                        ...prev,
                        mergedSubGrids: updatedSubGrids,
                        moduleIds: newModuleIds
                      };
                    },
                    `Changed ID type of section "${activeSub.name}" to ${val}`
                  );
                } else {
                  onUpdateGrid(
                    activeTab,
                    (prev) => ({ ...prev, idType: val, moduleIds: undefined }),
                    `Changed ID type to ${val}`
                  );
                }
              };

              const handleIdFontChange = (val: string) => {
                if (hasSubGrids && activeSub) {
                  onUpdateGrid(
                    activeTab,
                    (prev) => {
                      const updatedSubGrids = prev.mergedSubGrids?.map((sub) =>
                        sub.id === activeSub.id ? { ...sub, idFont: val } : sub
                      );
                      return {
                        ...prev,
                        mergedSubGrids: updatedSubGrids
                      };
                    },
                    `Changed ID font of section "${activeSub.name}" to ${val}`
                  );
                } else {
                  onUpdateGrid(
                    activeTab,
                    (prev) => ({ ...prev, idFont: val }),
                    `Changed ID font to ${val}`
                  );
                }
              };

              const handleLabelSizeChange = (val: number) => {
                if (hasSubGrids && activeSub) {
                  onUpdateGrid(
                    activeTab,
                    (prev) => {
                      const updatedSubGrids = prev.mergedSubGrids?.map((sub) =>
                        sub.id === activeSub.id ? { ...sub, moduleLabelSizePercent: val } : sub
                      );
                      return {
                        ...prev,
                        mergedSubGrids: updatedSubGrids
                      };
                    },
                    `Changed ID font size of section "${activeSub.name}" to ${val}%`
                  );
                } else {
                  onUpdateGrid(
                    activeTab,
                    (prev) => ({
                      ...prev,
                      moduleLabelSizePercent: val
                    }),
                    `Changed ID font size to ${val}%`
                  );
                }
              };

              const handleModuleSizePresetChange = (val: ModuleSizePreset) => {
                if (hasSubGrids) return; // Blocked in merged grids
                let mw = activeModuleWidth;
                let mh = activeModuleHeight;
                if (val === 'square') {
                  mw = 100;
                  mh = 100;
                } else if (val === 'horizontal') {
                  mw = 100;
                  mh = 50;
                } else if (val === 'vertical') {
                  mw = 50;
                  mh = 100;
                }

                onUpdateGrid(
                  activeTab,
                  (prev) => ({
                    ...prev,
                    moduleSize: val,
                    moduleWidth: mw,
                    moduleHeight: mh,
                    customModules: []
                  }),
                  `Changed module size to ${val}`
                );
              };

              const handleCustomDimensionChange = (newWidth?: number, newHeight?: number) => {
                if (hasSubGrids) return; // Blocked in merged grids
                const mw = newWidth !== undefined ? newWidth : activeModuleWidth;
                const mh = newHeight !== undefined ? newHeight : activeModuleHeight;

                onUpdateGrid(
                  activeTab,
                  (prev) => ({
                    ...prev,
                    moduleWidth: mw,
                    moduleHeight: mh,
                    customModules: []
                  }),
                  `Changed module dimensions to ${mw}x${mh}`
                );
              };

              return (
                <div className="collapsible-content">
                  {/* If Merged Grid, show Sub-Grids Section Tabs */}
                  {hasSubGrids && currentGrid.mergedSubGrids && (
                    <div className="mb-3.5 pb-3 border-b border-[#303030]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-semibold text-[#808080] tracking-wide">
                          Sections / Sub-Grids
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5a7fa5] font-mono">
                            {currentGrid.mergedSubGrids.length} sections
                          </span>
                          <button
                            type="button"
                            onClick={() => onUnmergeGrid(activeTab)}
                            className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/50 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Unmerge grid"
                          >
                            <UnmergeIcon className="w-3.5 h-3.5" />
                            <span>Unmerge</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {currentGrid.mergedSubGrids.map((sub) => {
                          const isSelected = activeSub?.id === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setSelectedSubGridId(sub.id)}
                              className={`px-2.5 py-1 text-[11px] rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1e293b] text-white font-medium border border-[#3b82f6] shadow-sm ring-1 ring-[#3b82f6]/40'
                                  : 'bg-[#1e1e1e] text-[#9ca3af] hover:bg-[#2a2a2a] hover:text-white border border-[#333]'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/40 shrink-0"
                                style={{ backgroundColor: sub.color }}
                              />
                              <span className="truncate max-w-[100px]">{sub.name}</span>
                              <span className="text-[9px] opacity-60">({sub.modules.length})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 py-1">
                    {/* Grid Color Section */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]" ref={gridColorPickerRef}>
                      <div className="flex items-center justify-between">
                        <span className="panel-label mb-0 ml-0 leading-none">
                          {activeSub ? `SECTION COLOR: ${activeSub.name.toUpperCase()}` : 'GRID COLOR'}
                        </span>
                      </div>

                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setIsGridColorPickerOpen((prev) => !prev)}
                        className={`w-full h-8 px-2 bg-[#101014] border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                          isGridColorPickerOpen
                            ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
                            : 'border-[#272736] hover:border-[#3b82f6]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-4 h-4 rounded-md border border-white/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: activeColor }}
                          />
                          <span className="text-slate-100 font-mono text-xs uppercase font-medium">
                            {activeColor}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-[#8b8b98] tracking-wider uppercase">
                            Custom
                          </span>
                          <span className={`material-symbols-outlined text-[14px] text-[#64748b] transition-transform duration-150 ${
                            isGridColorPickerOpen ? 'rotate-180 text-blue-400' : ''
                          }`}>
                            expand_more
                          </span>
                        </div>
                      </button>

                      {/* Custom ColorPicker Container */}
                      {isGridColorPickerOpen && (
                        <div className="mt-1">
                          <ColorPicker
                            color={activeColor}
                            onChange={handleColorChange}
                            presets={MODULE_PALETTE_16}
                            onClose={() => setIsGridColorPickerOpen(false)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Typography & ID Format */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]">
                      <div className="flex items-center justify-between">
                        <span className="panel-label mb-0 ml-0 leading-none">
                          IDENTIFICATION
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 items-start">
                        {/* ID Type Custom Dropdown */}
                        <div className="relative" ref={idTypeDropdownRef}>
                          <label className="panel-label mb-1.5 ml-0.5 block">
                            TYPE
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsIdTypeDropdownOpen((prev) => !prev)}
                            className={`w-full h-8 px-1.5 bg-[#101014] border rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isIdTypeDropdownOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-[#272736] hover:border-[#3b82f6]/50'
                            }`}
                          >
                            <div className="flex items-baseline gap-1 min-w-0 flex-1 overflow-hidden">
                              <span className="text-slate-100 text-[11px] font-normal truncate leading-none">
                                {ID_TYPE_OPTIONS.find((opt) => opt.id === activeIdType)?.label || 'Row.Col'}
                              </span>
                              <span className="text-[9.5px] font-semibold text-[#64748b] tracking-wider uppercase leading-none shrink-0">
                                {ID_TYPE_OPTIONS.find((opt) => opt.id === activeIdType)?.example || '1.1'}
                              </span>
                            </div>
                            <span className={`material-symbols-outlined text-[13px] text-[#64748b] transition-transform duration-150 shrink-0 ml-0.5 ${
                              isIdTypeDropdownOpen ? 'rotate-180 text-blue-400' : ''
                            }`}>
                              expand_more
                            </span>
                          </button>

                          {isIdTypeDropdownOpen && (
                            <div className="absolute top-full left-0 w-[135%] min-w-[130px] mt-1 bg-[#101014] border border-[#272736] rounded-lg shadow-2xl py-1 z-40 flex flex-col overflow-hidden">
                              {ID_TYPE_OPTIONS.map((opt) => {
                                const isSelected = activeIdType === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      handleIdTypeChange(opt.id);
                                      setIsIdTypeDropdownOpen(false);
                                    }}
                                    className={`w-full px-2 py-1.5 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-600/20 text-white'
                                        : 'text-slate-200 hover:bg-[#1a1a24] hover:text-white'
                                    }`}
                                  >
                                    <span className={`truncate text-xs ${isSelected ? 'font-medium text-blue-300' : ''}`}>
                                      {opt.label}
                                    </span>
                                    <span className={`text-[9.5px] uppercase font-semibold shrink-0 pl-1.5 tracking-wider ${
                                      isSelected ? 'text-blue-400' : 'text-[#64748b]'
                                    }`}>
                                      {opt.example}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* ID Font Custom Dropdown */}
                        <div className="relative" ref={idFontDropdownRef}>
                          <label className="panel-label mb-1.5 ml-0.5 block">
                            FONT
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsIdFontDropdownOpen((prev) => !prev)}
                            className={`w-full h-8 px-2 bg-[#101014] border rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isIdFontDropdownOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-[#272736] hover:border-[#3b82f6]/50'
                            }`}
                          >
                            <span
                              className="text-slate-100 text-xs font-normal truncate leading-none"
                              style={{ fontFamily: activeIdFont }}
                            >
                              {ID_FONT_OPTIONS.find((f) => f.value === activeIdFont)?.label || 'JetBrains'}
                            </span>
                            <span className={`material-symbols-outlined text-[13px] text-[#64748b] transition-transform duration-150 shrink-0 ml-0.5 ${
                              isIdFontDropdownOpen ? 'rotate-180 text-blue-400' : ''
                            }`}>
                              expand_more
                            </span>
                          </button>

                          {isIdFontDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 min-w-[120px] mt-1 bg-[#101014] border border-[#272736] rounded-lg shadow-2xl py-1 z-40 flex flex-col overflow-hidden">
                              {ID_FONT_OPTIONS.map((f) => {
                                const isSelected = activeIdFont === f.value;
                                return (
                                  <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => {
                                      handleIdFontChange(f.value);
                                      setIsIdFontDropdownOpen(false);
                                    }}
                                    className={`w-full px-2 py-1.5 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-600/20 text-white font-medium'
                                        : 'text-slate-200 hover:bg-[#1a1a24] hover:text-white'
                                    }`}
                                  >
                                    <span
                                      className={`truncate text-xs ${isSelected ? 'text-blue-300 font-semibold' : ''}`}
                                      style={{ fontFamily: f.value }}
                                    >
                                      {f.label}
                                    </span>
                                    {isSelected && (
                                      <span className="material-symbols-outlined text-[13px] text-blue-400 shrink-0 ml-1">
                                        check
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ID Font Size */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-[#22222a]">
                        <div className="flex items-center justify-between">
                          <span className="panel-label mb-0 ml-0 leading-none">
                            FONT SIZE
                          </span>
                          <span className="text-[10px] font-mono text-blue-400 font-semibold">
                            {activeLabelSize}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#101014] h-8 px-1.5 rounded-lg border border-[#272736] focus-within:border-blue-500">
                          <button
                            type="button"
                            disabled={activeLabelSize <= 10}
                            onClick={() => handleLabelSizeChange(Math.max(10, activeLabelSize - 1))}
                            className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Decrease ID font size"
                          >
                            <span className="material-symbols-outlined text-[12px]">remove</span>
                          </button>
                          <input
                            type="range"
                            min={10}
                            max={40}
                            value={activeLabelSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleLabelSizeChange(val);
                            }}
                            className="flex-1 h-1.5 accent-blue-500 bg-[#22222e] rounded-lg cursor-pointer appearance-none"
                          />
                          <button
                            type="button"
                            disabled={activeLabelSize >= 40}
                            onClick={() => handleLabelSizeChange(Math.min(40, activeLabelSize + 1))}
                            className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Increase ID font size"
                          >
                            <span className="material-symbols-outlined text-[12px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Module Geometry / Dimensions */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]">
                      <div className="flex items-center justify-between">
                        <span className="panel-label mb-0 ml-0 leading-none">
                          MODULE GEOMETRY
                        </span>
                        {hasSubGrids && (
                          <span
                            className="text-[10px] text-amber-400 font-medium flex items-center gap-0.5"
                            title="Module size is locked in merged grid"
                          >
                            <span className="material-symbols-outlined text-[13px]">lock</span>
                            Locked
                          </span>
                        )}
                      </div>

                      {/* Size Preset Segmented Control */}
                      <div className={`grid grid-cols-4 gap-0.5 p-0.5 bg-[#101014] rounded-lg border border-[#272736] h-8 items-center ${hasSubGrids ? 'opacity-55 pointer-events-none' : ''}`}>
                        {(
                          [
                            { id: 'square', label: '1:1' },
                            { id: 'horizontal', label: '2:1' },
                            { id: 'vertical', label: '1:2' },
                            { id: 'custom', label: 'Custom' }
                          ] as const
                        ).map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={hasSubGrids}
                            onClick={() => handleModuleSizePresetChange(preset.id)}
                            className={`h-6.5 rounded-md text-[10.5px] font-medium flex items-center justify-center transition-all cursor-pointer truncate ${
                              activeModuleSize === preset.id
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'text-[#88889a] hover:text-[#e0e0ec] hover:bg-[#202028]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Size Stepper */}
                      {activeModuleSize === 'custom' && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5 h-3.5 px-0.5">
                            <span className="panel-label mb-0 ml-0 leading-none">
                              CUSTOM SIZE (PX)
                            </span>
                          </div>
                          <div className={`flex items-center h-8 bg-[#101014] border border-[#272736] focus-within:border-blue-500 rounded-lg overflow-hidden ${hasSubGrids ? 'opacity-55 pointer-events-none' : ''}`}>
                            {/* Width Stepper */}
                            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                title="Decrease Width"
                                className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                onMouseDown={() => {
                                  if (hasSubGrids) return;
                                  startStepping(() => {
                                    onUpdateGrid(activeTab, (prev) => {
                                      const mw = Math.max(10, (prev.moduleWidth || 100) - 2);
                                      return { ...prev, moduleWidth: mw, customModules: [] };
                                    });
                                  }, true);
                                }}
                                onMouseUp={stopStepping}
                                onMouseLeave={stopStepping}
                              >
                                <span className="material-symbols-outlined text-[12px]">remove</span>
                              </button>
                              <input
                                type="number"
                                min={10}
                                max={9999}
                                step={2}
                                disabled={hasSubGrids}
                                value={activeModuleWidth}
                                title="Width (px)"
                                onChange={(e) => {
                                  if (hasSubGrids) return;
                                  const val = Math.max(10, Math.min(9999, parseInt(e.target.value, 10) || 100));
                                  handleCustomDimensionChange(val, undefined);
                                }}
                                className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                              />
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                title="Increase Width"
                                className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                onMouseDown={() => {
                                  if (hasSubGrids) return;
                                  startStepping(() => {
                                    onUpdateGrid(activeTab, (prev) => {
                                      const mw = Math.min(9999, (prev.moduleWidth || 100) + 2);
                                      return { ...prev, moduleWidth: mw, customModules: [] };
                                    });
                                  }, true);
                                }}
                                onMouseUp={stopStepping}
                                onMouseLeave={stopStepping}
                              >
                                <span className="material-symbols-outlined text-[12px]">add</span>
                              </button>
                            </div>

                            {/* Divider */}
                            <div className="w-[1px] h-3.5 bg-[#282838] shrink-0" />

                            {/* Height Stepper */}
                            <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                title="Decrease Height"
                                className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                onMouseDown={() => {
                                  if (hasSubGrids) return;
                                  startStepping(() => {
                                    onUpdateGrid(activeTab, (prev) => {
                                      const mh = Math.max(10, (prev.moduleHeight || 100) - 2);
                                      return { ...prev, moduleHeight: mh, customModules: [] };
                                    });
                                  }, true);
                                }}
                                onMouseUp={stopStepping}
                                onMouseLeave={stopStepping}
                              >
                                <span className="material-symbols-outlined text-[12px]">remove</span>
                              </button>
                              <input
                                type="number"
                                min={10}
                                max={9999}
                                step={2}
                                disabled={hasSubGrids}
                                value={activeModuleHeight}
                                title="Height (px)"
                                onChange={(e) => {
                                  if (hasSubGrids) return;
                                  const val = Math.max(10, Math.min(9999, parseInt(e.target.value, 10) || 100));
                                  handleCustomDimensionChange(undefined, val);
                                }}
                                className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                              />
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                title="Increase Height"
                                className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                onMouseDown={() => {
                                  if (hasSubGrids) return;
                                  startStepping(() => {
                                    onUpdateGrid(activeTab, (prev) => {
                                      const mh = Math.min(9999, (prev.moduleHeight || 100) + 2);
                                      return { ...prev, moduleHeight: mh, customModules: [] };
                                    });
                                  }, true);
                                }}
                                onMouseUp={stopStepping}
                                onMouseLeave={stopStepping}
                              >
                                <span className="material-symbols-outlined text-[12px]">add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If Merged Grid, show detailed Sections List Table */}
                  {currentGrid.mergedSubGrids && currentGrid.mergedSubGrids.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#303030] flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-semibold text-[#808080] tracking-wide">
                        Merged Sections Overview
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {currentGrid.mergedSubGrids.map((sub) => {
                          const isSelected = activeSub?.id === sub.id;
                          const subIdType = sub.idType || currentGrid.idType;
                          const subFont = sub.moduleLabelSizePercent ?? currentGrid.moduleLabelSizePercent;
                          const subW = sub.moduleWidth || currentGrid.moduleWidth;
                          const subH = sub.moduleHeight || currentGrid.moduleHeight;

                          return (
                            <div
                              key={sub.id}
                              className={`flex items-center justify-between p-2 rounded-md border transition-all ${
                                isSelected
                                  ? 'bg-[#1b2533] border-[#3b82f6]'
                                  : 'bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#404040]'
                              }`}
                            >
                              <div
                                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                onClick={() => setSelectedSubGridId(sub.id)}
                              >
                                <input
                                  type="color"
                                  value={sub.color}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    setSelectedSubGridId(sub.id);
                                    const newColor = e.target.value;
                                    const contrastColor = getMostContrastColor(newColor);
                                    onUpdateGrid(
                                      activeTab,
                                      (prev) => {
                                        const newModuleColors: Record<string, string> = { ...(prev.moduleColors || {}) };
                                        const targetSub = prev.mergedSubGrids?.find((s) => s.id === sub.id);
                                        if (targetSub) {
                                          targetSub.modules.forEach((m) => {
                                            newModuleColors[`${m.row},${m.col}`] = newColor;
                                          });
                                        }
                                        const updatedSubGrids = prev.mergedSubGrids?.map((s) =>
                                          s.id === sub.id
                                            ? { ...s, color: newColor, labelColor: contrastColor }
                                            : s
                                        );
                                        return {
                                          ...prev,
                                          mergedSubGrids: updatedSubGrids,
                                          moduleColors: newModuleColors
                                        };
                                      },
                                      `Changed color of section "${sub.name}" to ${newColor}`
                                    );
                                  }}
                                  className="w-5 h-5 rounded cursor-pointer border border-[#404040] bg-transparent shrink-0"
                                  title="Change section color"
                                />
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-[#e0e0e0] truncate">{sub.name}</span>
                                    <span className="text-[9px] font-mono px-1 py-0.2 bg-[#262626] rounded text-[#8da4c4]">
                                      {subIdType}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[#707070]">
                                    {sub.modules.length} cabinets • font {subFont}% • {subW}x{subH}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-mono text-[#808080]">{sub.color.toUpperCase()}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubGridId(sub.id)}
                                  className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                                      : 'bg-[#222] text-[#999] border-[#333] hover:text-white hover:bg-[#333]'
                                  }`}
                                >
                                  {isSelected ? 'Active' : 'Select'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Data Lines Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${dataSectionOpen ? '' : 'collapsed'}`}
              onClick={() => setDataSectionOpen(!dataSectionOpen)}
            >
              <span className="flex-1 text-left">
                Data Lines <span className="item-count font-mono">({currentGrid.connections.length})</span>
              </span>
              {/* Pagination stepper */}
              {(() => {
                const totalPages = Math.max(1, Math.ceil(Math.max(currentGrid.connections.length + 3, currentGrid.connections.length) / 16));
                if (totalPages > 1) {
                  return (
                    <div
                      className="flex items-center gap-0 mr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={currentGrid.dataLinesPage === 0}
                        onClick={() =>
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLinesPage: Math.max(0, prev.dataLinesPage - 1)
                          }))
                        }
                        className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] border border-[#404040] rounded-l text-xs disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <div className="px-2 h-6 flex items-center justify-center bg-[#1a1a1a] border-y border-[#404040] text-[10px] font-mono">
                        {currentGrid.dataLinesPage + 1}/{totalPages}
                      </div>
                      <button
                        type="button"
                        disabled={currentGrid.dataLinesPage >= totalPages - 1}
                        onClick={() =>
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLinesPage: prev.dataLinesPage + 1
                          }))
                        }
                        className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] border border-[#404040] rounded-r text-xs disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
              <span className="material-symbols-outlined collapsible-toggle">
                {dataSectionOpen ? 'remove' : 'add'}
              </span>
            </button>

            {dataSectionOpen && (
              <div className="collapsible-content">
                {/* Data Lines List (16 items per page) */}
                {(() => {
                  const ITEMS_PER_PAGE = 16;
                  const totalItems = Math.max(currentGrid.connections.length + 3, currentGrid.connections.length);
                  const startIndex = currentGrid.dataLinesPage * ITEMS_PER_PAGE;
                  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

                  const items = [];
                  for (let i = startIndex; i < endIndex; i++) {
                    const conn = currentGrid.connections[i];
                    const isFilled = conn && conn.points && conn.points.length >= 1;

                    items.push(
                      <div
                        key={i}
                        className="line-item relative"
                        onMouseEnter={() => {
                          if (isFilled) {
                            onUpdateGrid(activeTab, (prev) => ({ ...prev, hoveredLineIndex: i }));
                          }
                        }}
                        onMouseLeave={() => {
                          if (isFilled) {
                            onUpdateGrid(activeTab, (prev) => ({ ...prev, hoveredLineIndex: null }));
                          }
                        }}
                      >
                        {/* Line Number (No blue background, compact width) */}
                        <span className="shrink-0 w-5 text-center text-[11px] font-mono text-[#8b8b98] font-bold select-none">
                          {i + 1}
                        </span>

                        {/* Combined Main/Backup Inputs in one seamless container */}
                        <div className={`flex-1 min-w-0 flex items-center h-7 bg-[#16161c] border border-[#2e2e3a] focus-within:border-blue-500/80 rounded-md overflow-hidden transition-colors ${!isFilled ? 'opacity-35' : ''}`}>
                          <input
                            type="text"
                            disabled={!isFilled}
                            value={isFilled ? conn.name : ''}
                            placeholder="main"
                            title="Main name"
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateGrid(activeTab, (prev) => {
                                const newConns = [...prev.connections];
                                newConns[i] = { ...newConns[i], name: val };
                                return { ...prev, connections: newConns };
                              });
                            }}
                            className="flex-1 min-w-0 h-full px-2 bg-transparent text-[#e0e0e0] text-[11px] font-mono outline-none border-none placeholder:text-[#555566]"
                          />
                          <div className="w-[1px] h-3.5 bg-[#2e2e3a] shrink-0" />
                          <input
                            type="text"
                            disabled={!isFilled}
                            value={isFilled ? conn.endName : ''}
                            placeholder="backup"
                            title="Backup name"
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateGrid(activeTab, (prev) => {
                                const newConns = [...prev.connections];
                                newConns[i] = { ...newConns[i], endName: val };
                                return { ...prev, connections: newConns };
                              });
                            }}
                            className="flex-1 min-w-0 h-full px-2 bg-transparent text-[#e0e0e0] text-[11px] font-mono outline-none border-none placeholder:text-[#555566]"
                          />
                        </div>

                        {/* Swatch */}
                        {(() => {
                          const lineIndex = (conn && conn.colorIndex !== undefined) ? conn.colorIndex : i;
                          const legacyHatchColor = (conn && conn.color && conn.color !== '#000000')
                            ? conn.color
                            : MAIN_COLORS[lineIndex % MAIN_COLORS.length];
                          const modernColor = (conn && conn.color) ? conn.color : '#000000';
                          const activeColor = altLineStyle ? modernColor : legacyHatchColor;
                          const palette = altLineStyle ? DATA_LINE_COLORS : MAIN_COLORS;

                          return (
                            <div className="color-swatch-container shrink-0">
                              <div
                                style={{ backgroundColor: isFilled ? activeColor : '#2a2a2a' }}
                                className={`color-swatch ${isFilled ? '' : 'disabled'}`}
                                title={isFilled ? (altLineStyle ? `Data line color: ${activeColor}` : `Legacy hatch color: ${legacyHatchColor}`) : 'Empty slot'}
                                onClick={() => {
                                  if (isFilled) {
                                    setOpenDataSwatchIndex(openDataSwatchIndex === i ? null : i);
                                    setOpenPowerSwatchIndex(null);
                                  }
                                }}
                              />
                              {openDataSwatchIndex === i && isFilled && (
                                <div className="color-swatch-dropdown active">
                                  <div className="color-swatch-grid dataline-color-swatch-grid">
                                    {palette.map((c) => (
                                      <div
                                        key={c}
                                        style={{ backgroundColor: c }}
                                        className={`color-swatch-option ${activeColor.toLowerCase() === c.toLowerCase() ? 'selected' : ''}`}
                                        title={c}
                                        onClick={() => {
                                          onUpdateGrid(activeTab, (prev) => {
                                            const newConns = [...prev.connections];
                                            if (newConns[i]) {
                                              newConns[i] = { ...newConns[i], color: c };
                                            }
                                            return { ...prev, connections: newConns };
                                          });
                                          setOpenDataSwatchIndex(null);
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Remove line (No outline/border, clean icon button) */}
                        <button
                          type="button"
                          disabled={!isFilled}
                          title="Delete data line"
                          className="shrink-0 p-0 border-0 bg-transparent hover:bg-red-500/15 text-[#6c6c7d] hover:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#6c6c7d] transition-colors rounded-md flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          onClick={() => {
                            if (!isFilled) return;
                            onUpdateGrid(activeTab, (prev) => {
                              const newConns = [...prev.connections];
                              const removedConn = newConns[i];
                              if (!removedConn) return prev;
                              const newRemovedIndices = [...prev.removedIndices];
                              if (removedConn && removedConn.colorIndex !== undefined) {
                                newRemovedIndices.push(removedConn.colorIndex);
                              }
                              newConns.splice(i, 1);
                              return {
                                ...prev,
                                connections: newConns,
                                removedIndices: newRemovedIndices,
                                hoveredLineIndex: null
                              };
                            }, `Deleted data line`);
                          }}
                        >
                          <span className="material-symbols-outlined text-[17px] leading-none">delete</span>
                        </button>
                      </div>
                    );
                  }
                  return items;
                })()}

                {/* Unified Font Family & Font Size in a Single Row */}
                <div
                  className={`mt-1.5 p-1.5 bg-[#141418] rounded-xl border border-[#272732] flex flex-col gap-1 transition-all ${
                    currentGrid.connections.length === 0 ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {/* Single Header with size % indicator */}
                  <div className="flex items-center justify-between px-0.5">
                    <span className="panel-label mb-0">
                      Font and size
                    </span>
                    <span className="text-[10px] font-mono font-bold text-blue-400">
                      {currentGrid.dataLineFontSizePercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_1.1fr] gap-1.5 items-center">
                    {/* Font Family */}
                    <div className="min-w-0">
                      <CustomSelect
                        disabled={currentGrid.connections.length === 0}
                        value={currentGrid.dataLineFont}
                        options={FONT_OPTIONS.map((f) => ({
                          value: f.value,
                          label: f.label,
                          fontFamily: f.value,
                        }))}
                        onChange={(fontVal) => {
                          onUpdateGrid(activeTab, (prev) => ({ ...prev, dataLineFont: fontVal }));
                        }}
                        className="!h-7 !px-2 text-[11px]"
                      />
                    </div>

                    {/* Font Size */}
                    <div className="flex items-center h-7 bg-[#1a1a22] border border-[#2e2e3a] rounded-lg px-1 gap-1 min-w-0">
                      <button
                        type="button"
                        disabled={currentGrid.connections.length === 0 || currentGrid.dataLineFontSizePercent <= 20}
                        onClick={() => {
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLineFontSizePercent: Math.max(20, (prev.dataLineFontSizePercent || 28) - 1)
                          }));
                        }}
                        className="w-4 h-4 rounded flex items-center justify-center text-[#8e8e9c] hover:text-white hover:bg-[#272734] disabled:opacity-30 cursor-pointer transition-all active:scale-95 shrink-0"
                        title="Decrease font size"
                      >
                        <span className="material-symbols-outlined text-[11px]">remove</span>
                      </button>
                      <input
                        type="range"
                        min={20}
                        max={40}
                        disabled={currentGrid.connections.length === 0}
                        value={currentGrid.dataLineFontSizePercent}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLineFontSizePercent: val
                          }));
                        }}
                        className="flex-1 min-w-0 accent-blue-500 cursor-pointer h-1 bg-[#2b2b38] rounded appearance-none"
                      />
                      <button
                        type="button"
                        disabled={currentGrid.connections.length === 0 || currentGrid.dataLineFontSizePercent >= 40}
                        onClick={() => {
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLineFontSizePercent: Math.min(40, (prev.dataLineFontSizePercent || 28) + 1)
                          }));
                        }}
                        className="w-4 h-4 rounded flex items-center justify-center text-[#8e8e9c] hover:text-white hover:bg-[#272734] disabled:opacity-30 cursor-pointer transition-all active:scale-95 shrink-0"
                        title="Increase font size"
                      >
                        <span className="material-symbols-outlined text-[11px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Line Naming Mode Dropdown in matching card style */}
                <div className="mt-1.5 p-1.5 bg-[#141418] rounded-xl border border-[#272732] flex items-center justify-between gap-2 transition-all">
                  <span className="panel-label mb-0 px-0.5">
                    Dataline names
                  </span>
                  <div className="w-28">
                    <CustomSelect
                      value={
                        (currentGrid.dataLineNamingMode === 'p.1-p.9' || !currentGrid.dataLineNamingMode)
                          ? (currentGrid.useDefaultNames !== false ? '1.1-1.9' : 'none')
                          : currentGrid.dataLineNamingMode
                      }
                      options={[
                        { value: '1.1-1.9', label: '1.1 - 1.9' },
                        { value: '1A-1B', label: '1A - 1B' },
                        { value: 'none', label: 'none' },
                      ]}
                      onChange={(val) => {
                        const mode = val as DataLineNamingMode;
                        onUpdateGrid(activeTab, (prev) => {
                          const updatedConns = prev.connections.map((c, idx) => {
                            if (mode === 'none') {
                              return { ...c, name: '', endName: '' };
                            }
                            const { name, endName } = computeDataLineNames(mode, idx);
                            return { ...c, name, endName };
                          });
                          return {
                            ...prev,
                            dataLineNamingMode: mode,
                            useDefaultNames: mode !== 'none',
                            connections: updatedConns
                          };
                        }, `Changed naming mode to ${mode}`);
                      }}
                      className="!h-7 !px-2 text-[11px] font-mono"
                    />
                  </div>
                </div>

                {/* Hatch Density - Legacy Mode */}
                {!altLineStyle && (
                  <div className="mt-3 pt-3 border-t border-[#303030] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#808080] tracking-wide">
                        Hatch Density
                      </span>
                      <span className="text-[11px] font-mono text-[#e0e0e0] font-semibold">
                        {currentGrid.hatchDensity ?? 6}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#606060]">Sparse</span>
                      <input
                        type="range"
                        min={2}
                        max={18}
                        value={currentGrid.hatchDensity ?? 6}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onUpdateGrid(
                            activeTab,
                            (prev) => ({
                              ...prev,
                              hatchDensity: val
                            }),
                            `Changed hatch density to ${val}`
                          );
                        }}
                        className="flex-1 accent-[#3B82F6] cursor-pointer"
                      />
                      <span className="text-[10px] text-[#606060]">Dense</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Power Lines Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${powerSectionOpen ? '' : 'collapsed'}`}
              onClick={() => setPowerSectionOpen(!powerSectionOpen)}
            >
              <span className="flex-1 text-left">
                Power Lines <span className="item-count font-mono">({currentGrid.selectedGroups.length})</span>
              </span>
              {/* Pagination stepper */}
              {(() => {
                const totalPages = Math.max(1, Math.ceil(Math.max(currentGrid.selectedGroups.length + 3, currentGrid.selectedGroups.length) / 16));
                if (totalPages > 1) {
                  return (
                    <div
                      className="flex items-center gap-0 mr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={currentGrid.powerLinesPage === 0}
                        onClick={() =>
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            powerLinesPage: Math.max(0, prev.powerLinesPage - 1)
                          }))
                        }
                        className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] border border-[#404040] rounded-l text-xs disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <div className="px-2 h-6 flex items-center justify-center bg-[#1a1a1a] border-y border-[#404040] text-[10px] font-mono">
                        {currentGrid.powerLinesPage + 1}/{totalPages}
                      </div>
                      <button
                        type="button"
                        disabled={currentGrid.powerLinesPage >= totalPages - 1}
                        onClick={() =>
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            powerLinesPage: prev.powerLinesPage + 1
                          }))
                        }
                        className="w-6 h-6 flex items-center justify-center bg-[#2a2a2a] border border-[#404040] rounded-r text-xs disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
              <span className="material-symbols-outlined collapsible-toggle">
                {powerSectionOpen ? 'remove' : 'add'}
              </span>
            </button>

            {powerSectionOpen && (
              <div className="collapsible-content">
                {(() => {
                  const ITEMS_PER_PAGE = 16;
                  const totalItems = Math.max(currentGrid.selectedGroups.length + 3, currentGrid.selectedGroups.length);
                  const startIndex = currentGrid.powerLinesPage * ITEMS_PER_PAGE;
                  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

                  const items = [];
                  for (let i = startIndex; i < endIndex; i++) {
                    const group = currentGrid.selectedGroups[i];
                    const isFilled = group && group.modules && group.modules.length > 0;

                    let rangeText = '_';
                    let totalCabs = 0;
                    if (isFilled) {
                      const minRow = Math.min(...group.modules.map((m) => m.row));
                      const maxRow = Math.max(...group.modules.map((m) => m.row));
                      const minCol = Math.min(...group.modules.filter((m) => m.row === minRow).map((m) => m.col));
                      const maxCol = Math.max(...group.modules.filter((m) => m.row === maxRow).map((m) => m.col));
                      rangeText = `${minRow + 1}.${minCol + 1}-${maxRow + 1}.${maxCol + 1}`;
                      totalCabs = group.modules.length;
                    }

                    items.push(
                      <div
                        key={i}
                        className="group-item relative"
                        onMouseEnter={() => {
                          if (isFilled) {
                            onUpdateGrid(activeTab, (prev) => ({ ...prev, hoveredGroupIndex: i }));
                          }
                        }}
                        onMouseLeave={() => {
                          if (isFilled) {
                            onUpdateGrid(activeTab, (prev) => ({ ...prev, hoveredGroupIndex: null }));
                          }
                        }}
                      >
                        {/* Line Number (No background, compact width) */}
                        <span className="shrink-0 w-5 text-center text-[11px] font-mono text-[#8b8b98] font-bold select-none">
                          {i + 1}
                        </span>

                        <span className="truncate text-xs font-mono flex-1 min-w-0">
                          {isFilled ? `${rangeText} (${totalCabs} cab.)` : '_'}
                        </span>

                        {/* Power swatch */}
                        <div className="color-swatch-container shrink-0">
                          <div
                            style={{
                              backgroundColor: isFilled
                                ? GROUP_COLORS[(group.colorIndex - 1) % GROUP_COLORS.length]
                                : '#2a2a2a'
                            }}
                            className={`color-swatch ${isFilled ? '' : 'disabled'}`}
                            onClick={() => {
                              if (isFilled) {
                                setOpenPowerSwatchIndex(openPowerSwatchIndex === i ? null : i);
                                setOpenDataSwatchIndex(null);
                              }
                            }}
                          />
                          {openPowerSwatchIndex === i && isFilled && (
                            <div className="color-swatch-dropdown active">
                              <div className="color-swatch-grid">
                                {GROUP_COLORS.map((c, cIdx) => (
                                  <div
                                    key={c}
                                    style={{ backgroundColor: c }}
                                    className={`color-swatch-option ${group.colorIndex === cIdx + 1 ? 'selected' : ''}`}
                                    onClick={() => {
                                      onUpdateGrid(activeTab, (prev) => {
                                        const newGroups = [...prev.selectedGroups];
                                        newGroups[i] = { ...newGroups[i], colorIndex: cIdx + 1 };
                                        return { ...prev, selectedGroups: newGroups };
                                      });
                                      setOpenPowerSwatchIndex(null);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Remove power group (No outline/border, clean icon button) */}
                        <button
                          type="button"
                          disabled={!isFilled}
                          title="Delete power group"
                          className="shrink-0 p-0 border-0 bg-transparent hover:bg-red-500/15 text-[#6c6c7d] hover:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#6c6c7d] transition-colors rounded-md flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          onClick={() => {
                            onUpdateGrid(activeTab, (prev) => {
                              const newGroups = [...prev.selectedGroups];
                              newGroups.splice(i, 1);
                              return {
                                ...prev,
                                selectedGroups: newGroups,
                                hoveredGroupIndex: null
                              };
                            }, `Deleted power group`);
                          }}
                        >
                          <span className="material-symbols-outlined text-[17px] leading-none">delete</span>
                        </button>
                      </div>
                    );
                  }
                  return items;
                })()}

                {/* Hatch Density - Modern Mode */}
                {altLineStyle && (
                  <div className="mt-3 pt-3 border-t border-[#303030] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#808080] tracking-wide">
                        Hatch Density
                      </span>
                      <span className="text-[11px] font-mono text-[#e0e0e0] font-semibold">
                        {currentGrid.hatchDensity ?? 6}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#606060]">Sparse</span>
                      <input
                        type="range"
                        min={2}
                        max={18}
                        value={currentGrid.hatchDensity ?? 6}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onUpdateGrid(
                            activeTab,
                            (prev) => ({
                              ...prev,
                              hatchDensity: val
                            }),
                            `Changed hatch density to ${val}`
                          );
                        }}
                        className="flex-1 accent-[#3B82F6] cursor-pointer"
                      />
                      <span className="text-[10px] text-[#606060]">Dense</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

          </div>

          {/* Slide-Up Help Drawer */}
          {instructionsOpen && (
            <div className="absolute bottom-[91px] left-0 right-0 max-h-[420px] overflow-y-auto bg-[#141418] border-t border-[#262632] p-3.5 shadow-2xl z-20 text-[11px] text-[#909090] leading-relaxed space-y-3 no-scrollbar rounded-t-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#22222a]">
                <div className="flex items-center gap-1.5 text-[#e0e0ec] font-semibold text-[12px]">
                  <span className="material-symbols-outlined text-[16px] text-blue-400">help</span>
                  <span>Help & Shortcuts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInstructionsOpen(false)}
                  className="p-1 rounded hover:bg-[#252530] text-[#787888] hover:text-white transition-colors cursor-pointer"
                  title="Close Help"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Data Lines Mode (Data)</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">Draw:</strong> Click cabinets sequentially to route data cables. Double-click to complete and save the line.<br />
                  • <strong className="text-[#a6a6b8]">Erase:</strong> Switch to Erase and click any cabinet to cut the line tail from that point, or click the 1st cabinet to delete the whole line.<br />
                  • <strong className="text-[#a6a6b8]">Colors & Names:</strong> Customize line colors via table swatches and configure port naming schemes in the inspector.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Power Groups Mode (Power)</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">Draw:</strong> Click cabinets sequentially or click two distant cabinets to select a rectangular block. Double-click to create the power group.<br />
                  • <strong className="text-[#a6a6b8]">Erase:</strong> Switch to Erase and click a cabinet to remove it from its power group.<br />
                  • <strong className="text-[#a6a6b8]">Calculations:</strong> View cabinet counts, power load (Watts), and electrical current (Amps) per group and globally.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Visibility Mode (Hide)</span>
                <p className="text-[#8e8e9c]">
                  • Click any module to toggle show/hide (for custom screen shapes, windows, and cutouts).<br />
                  • <strong className="text-[#a6a6b8]">Shift + Click:</strong> Click Corner 1, then Shift + Click Corner 2 to toggle an entire rectangular area.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Screens & Merging</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">New Screen:</strong> Click "+ New Screen" in the left rail to add new display grids.<br />
                  • <strong className="text-[#a6a6b8]">Import:</strong> Click "Import" in the rail to load an existing XML project.<br />
                  • <strong className="text-[#a6a6b8]">Merge:</strong> On any screen tab, click Merge to combine multiple screens into one unified canvas.<br />
                  • <strong className="text-[#a6a6b8]">Unmerge:</strong> Click Unmerge on a merged screen to restore individual screens.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Drag Mode (Positioning)</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">Drag on Canvas:</strong> In Drag mode, click and drag any screen to reposition it with smart snapping to edges, adjacent screens, and module steps.<br />
                  • <strong className="text-[#a6a6b8]">Arrow Keys:</strong> Use ↑, ↓, ←, → to nudge the active screen by 1 module width/height. Hold <strong className="text-[#a6a6b8]">Shift</strong> for fine 10 px adjustments.<br />
                  • <strong className="text-[#a6a6b8]">D-Pad & Align:</strong> Use the on-screen directional pad or quick alignment buttons (H-Center, V-Center, Dock) in the left panel.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Shortcuts & Navigation</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">ESC:</strong> Cancel active in-progress data line, power group, or rectangular selection.<br />
                  • <strong className="text-[#a6a6b8]">Ctrl+Z / Ctrl+Y:</strong> Undo and Redo actions (also accessible via bottom-right toolbar buttons).<br />
                  • <strong className="text-[#a6a6b8]">Canvas Click:</strong> Click any screen directly on the canvas to select and inspect it.
                </p>
              </div>

              <div>
                <span className="text-[#c0c0d0] font-semibold block mb-0.5">Export Options</span>
                <p className="text-[#8e8e9c]">
                  • <strong className="text-[#a6a6b8]">PDF:</strong> Vector PDF document with custom sheet format (A4, A3, Canvas size), orientation, and summary specifications.<br />
                  • <strong className="text-[#a6a6b8]">PNG:</strong> High-resolution raster image snapshot of the canvas.<br />
                  • <strong className="text-[#a6a6b8]">SVG:</strong> Scalable vector diagram with wire style, ID badges, and dimension lines.<br />
                  • <strong className="text-[#a6a6b8]">XML:</strong> Save project file to preserve full configuration and re-edit later.
                </p>
              </div>
            </div>
          )}

          {/* Inspector Bottom Footer: Reset All Grids + Help + Import & Export (Aligned with Left Rail New Screen) */}
          <div className="shrink-0 p-1.5 bg-[#0d0d10] border-t border-[#202026] flex flex-col gap-1.5 select-none z-10">
            {/* Reset All Grids Action Button (Pinned above Help) */}
            <button
              type="button"
              className="w-full h-[32px] px-2.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-900/50 hover:border-red-600/70 text-red-400 hover:text-red-300 text-[11px] font-medium transition-all active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              onClick={onResetAllGrids}
              title="Reset all grids and canvas configuration"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset All Grids</span>
            </button>

            {/* Help Button Row (Top edge matches New Screen button top edge) */}
            <button
              type="button"
              onClick={() => setInstructionsOpen(!instructionsOpen)}
              title="Help & Shortcuts"
              className={`w-full h-[36px] px-2.5 rounded-lg flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer select-none text-[11px] font-medium border ${
                instructionsOpen
                  ? 'bg-[#22222c] text-white border-blue-500/50 shadow-xs'
                  : 'bg-[#141418] hover:bg-[#1f1f28] text-[#9a9aa8] hover:text-[#e0e0ec] border-[#262632] hover:border-[#383848]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-blue-400">help</span>
                <span className="font-semibold text-[11px]">Help</span>
              </div>
              <span className="material-symbols-outlined text-[17px] text-[#707080]">
                {instructionsOpen ? 'expand_more' : 'expand_less'}
              </span>
            </button>

            {/* Bottom Row: Import & Export */}
            <div className="h-[36px] flex items-center justify-between gap-1.5">
              {/* Import Group */}
              <div className="flex items-center gap-0.5 bg-[#141418] py-0.5 px-1 rounded-lg border border-[#262632] shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#686878] pl-0.5 pr-0.5 select-none">
                  Import
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Import XML project file"
                  className="h-[25px] px-1.5 rounded-md bg-transparent hover:bg-[#38bdf8]/20 text-[#c8c8d8] hover:text-[#7dd3fc] hover:border hover:border-[#38bdf8]/40 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  XML
                </button>
              </div>

              {/* Export Group */}
              <div className="flex items-center gap-0.5 bg-[#141418] py-0.5 px-1 rounded-lg border border-[#262632] shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#686878] pl-0.5 pr-0.5 select-none">
                  Export
                </span>
                <button
                  type="button"
                  onClick={onExportPDF}
                  title="Export Vector PDF"
                  className="h-[25px] px-1.5 rounded-md bg-transparent hover:bg-[#a855f7]/20 text-[#c8c8d8] hover:text-[#d8b4fe] hover:border hover:border-[#a855f7]/40 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={onExportPNG}
                  title="Export PNG Image"
                  className="h-[25px] px-1.5 rounded-md bg-transparent hover:bg-[#3b82f6]/20 text-[#c8c8d8] hover:text-[#93c5fd] hover:border hover:border-[#3b82f6]/40 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={onExportSVG}
                  title="Export SVG Vector"
                  className="h-[25px] px-1.5 rounded-md bg-transparent hover:bg-[#22c55e]/20 text-[#c8c8d8] hover:text-[#86efac] hover:border hover:border-[#22c55e]/40 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  SVG
                </button>
                <button
                  type="button"
                  onClick={onExportXML}
                  title="Export XML project file"
                  className="h-[25px] px-1.5 rounded-md bg-transparent hover:bg-[#f59e0b]/20 text-[#c8c8d8] hover:text-[#fde68a] hover:border hover:border-[#f59e0b]/40 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  XML
                </button>
              </div>
            </div>
          </div>
    </div>
  </div>
</div>
  );
}
