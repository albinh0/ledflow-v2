import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GridModel, GridMode, HistoryItem, ModuleSizePreset, IdType, DataLineNamingMode } from '../types';
import { MAIN_COLORS, DATA_LINE_COLORS, GROUP_COLORS, MODULE_PALETTE_25, FONT_OPTIONS, ID_FONT_OPTIONS, DEFAULT_ID_FONT, APP_VERSION, APP_AUTHOR } from '../constants';
import { getMostContrastColor, isValidModuleCell, computeSubGridModuleId, computeDataLineNames } from '../utils/geometry';
import { MergeIcon, UnmergeIcon, CanvasIcon } from './CustomIcons';

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
  isCollapsed: boolean;
  history: HistoryItem[];
  currentHistoryIndex: number;
  onJumpToHistory: (index: number) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

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
  isCollapsed,
  history,
  currentHistoryIndex,
  onJumpToHistory,
  panelRef
}: LeftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [dataSectionOpen, setDataSectionOpen] = useState(false);
  const [powerSectionOpen, setPowerSectionOpen] = useState(false);

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

  const currentGrid = activeTab !== 'settings' ? grids[activeTab] : null;
  const hasSubGrids = !!(currentGrid?.mergedSubGrids && currentGrid.mergedSubGrids.length > 0);

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
      className={`left-panel transition-all duration-300 ${isCollapsed ? 'collapsed !hidden' : ''}`}
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
      <div className="flex flex-1 min-h-0 w-full">
        {/* ================= SCREENS VERTICAL SIDEBAR RAIL ================= */}
        <div className="w-[98px] shrink-0 flex flex-col bg-[#111114] border-r border-[#24242a] select-none">
          {/* Rail Header: Global Canvas Tab */}
          <div className="p-1.5 border-b border-[#202026]">
            <button
              type="button"
              title="Canvas Settings (Global)"
              className={`w-full h-[34px] px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                activeTab === 'settings'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 shadow-xs'
                  : 'bg-[#18181d] hover:bg-[#202028] text-[#8e8e9c] hover:text-white border border-[#272730]'
              }`}
              onClick={() => onSwitchTab('settings')}
            >
              <CanvasIcon className="w-[15px] h-[15px] shrink-0" />
              <span className="text-[11px] font-bold tracking-tight">CANVAS</span>
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

          {/* Rail Footer: Prominent Tall New Screen CTA */}
          <div className="p-1.5 border-t border-[#202026] bg-[#0e0e11]">
            <button
              type="button"
              onClick={onOpenNewGridModal}
              title="Create new screen grid"
              className="w-full h-[46px] px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.15)] group"
            >
              <span className="material-symbols-outlined text-[17px] leading-none transition-transform group-hover:rotate-90">
                add
              </span>
              <span className="font-bold text-[10.5px] leading-tight">New Screen</span>
            </button>
          </div>
        </div>

        {/* ================= RIGHT INSPECTOR / TAB CONTENT ================= */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3.5">


      {/* ================= CANVAS / SETTINGS TAB ================= */}
      {activeTab === 'settings' && (
        <div className="tab-content active">
          {/* Top Actions: Import XML & Merge Screens */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#202024] hover:bg-[#2c2c34] border border-[#33333b] hover:border-[#4b4b56] text-[#e0e0e0] text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import XML configuration"
            >
              <span className="material-symbols-outlined text-[18px] text-[#94a3b8]">file_upload</span>
              <span>Import XML</span>
            </button>

            <button
              type="button"
              disabled={gridEntries.length < 2}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#202024] hover:bg-[#2c2c34] border border-[#33333b] hover:border-[#4b4b56] text-blue-400 hover:text-blue-300 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
              onClick={onOpenMergeModal}
              title={gridEntries.length < 2 ? 'Need at least 2 screens to merge' : 'Merge multiple screens'}
            >
              <MergeIcon className="w-[17px] h-[17px]" />
              <span>Merge</span>
            </button>
          </div>

          {/* Width / Height / Autofit in a single row (only if at least one grid exists) */}
          {gridEntries.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mb-3">
              <div>
                <span className="panel-label">Width</span>
                <div className="panel-stepper">
                  <button
                    type="button"
                    disabled={fitToGrids}
                    className="panel-stepper-btn"
                    onMouseDown={() => startStepping(() => onOutputSizeChange(Math.max(1, outputWidth - 10), outputHeight), true)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input
                    type="number"
                    disabled={fitToGrids}
                    value={outputWidth}
                    min={1}
                    onChange={(e) => onOutputSizeChange(parseInt(e.target.value, 10) || 1, outputHeight)}
                    className="panel-stepper-input stepper-input disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={fitToGrids}
                    className="panel-stepper-btn"
                    onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth + 10, outputHeight), true)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
              <div>
                <span className="panel-label">Height</span>
                <div className="panel-stepper">
                  <button
                    type="button"
                    disabled={fitToGrids}
                    className="panel-stepper-btn"
                    onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth, Math.max(1, outputHeight - 10)), true)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input
                    type="number"
                    disabled={fitToGrids}
                    value={outputHeight}
                    min={1}
                    onChange={(e) => onOutputSizeChange(outputWidth, parseInt(e.target.value, 10) || 1)}
                    className="panel-stepper-input stepper-input disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={fitToGrids}
                    className="panel-stepper-btn"
                    onMouseDown={() => startStepping(() => onOutputSizeChange(outputWidth, outputHeight + 10), true)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="panel-label text-center whitespace-nowrap">Autofit</span>
                <div
                  onClick={() => onFitToGridsChange(!fitToGrids)}
                  title={fitToGrids ? 'Autofit is ON (Canvas auto-fits screens)' : 'Autofit is OFF (Custom canvas size)'}
                  className="h-[38px] px-2.5 bg-[#1E1E1E] border border-[#333] hover:border-[#444] rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                >
                  <label className="panel-toggle-switch scale-90 cursor-pointer pointer-events-none">
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

          {/* Line Visual Style - Inline Segmented Control */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="panel-label mb-0">Style</span>
              <div className="inline-flex p-0.5 bg-[#161619] rounded-md border border-[#27272f]">
                <button
                  type="button"
                  title="Modern visual style with hatched power groups"
                  className={`py-1 px-2 rounded flex items-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    altLineStyle
                      ? 'bg-[#2b2b36] text-white shadow-xs border border-white/10'
                      : 'text-[#8b8b96] hover:text-[#e0e0e0] border border-transparent'
                  }`}
                  onClick={() => onAltLineStyleChange(true)}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="1.5" />
                    <path d="M4 12L12 4M3.5 7.5L7.5 3.5M8.5 12.5L12.5 8.5" />
                  </svg>
                  <span>Modern</span>
                </button>
                <button
                  type="button"
                  title="Legacy visual style with dashed perimeter outline"
                  className={`py-1 px-2 rounded flex items-center gap-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    !altLineStyle
                      ? 'bg-[#2b2b36] text-white shadow-xs border border-white/10'
                      : 'text-[#8b8b96] hover:text-[#e0e0e0] border border-transparent'
                  }`}
                  onClick={() => onAltLineStyleChange(false)}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="1.5" strokeDasharray="2.5 2" />
                  </svg>
                  <span>Legacy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${summaryOpen ? '' : 'collapsed'}`}
              onClick={() => setSummaryOpen(!summaryOpen)}
            >
              <span>Summary</span>
              <span className="material-symbols-outlined collapsible-toggle">
                {summaryOpen ? 'remove' : 'add'}
              </span>
            </button>
            {summaryOpen && (
              <div className="collapsible-content font-mono text-[11px] text-[#64748b]">
                <div className="summary-header">Summary</div>
                <div className="summary-item">Output: {outputWidth}×{outputHeight}px</div>
                <div className="summary-item">Total Grids: {totalGridsCount}</div>

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
                    <div key={gId} className="summary-grid">
                      <div className="summary-grid-name">
                        {grid.name} ({grid.cols}×{grid.rows})
                      </div>
                      <div className="summary-grid-details">
                        Data Lines: {dataLinesCount}
                        {dataLinesCount > 0 && ` (avg. ${avgDataLine} cabinets)`}
                        <br />
                        Power Groups: {powerLinesCount}
                        {powerLinesCount > 0 && ` (avg. ${avgPowerGroup} cabinets)`}
                        <br />
                        {notConnectedCount > 0 && (
                          <span>Not Connected: {notConnectedCount} of {totalCabinets}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* History Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${historyOpen ? '' : 'collapsed'}`}
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <span>History</span>
              <span className="material-symbols-outlined collapsible-toggle">
                {historyOpen ? 'remove' : 'add'}
              </span>
            </button>
            {historyOpen && (
              <div className="collapsible-content">
                {history.length === 0 ? (
                  <div className="text-center text-[#707070] py-2 text-xs">No history yet</div>
                ) : (
                  <div className="flex flex-col">
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
                          className={`p-2.5 cursor-pointer text-xs transition-colors border-b border-[#333] last:border-none ${
                            isCurrent ? 'bg-[#3a4a5a] text-[#8ab4f8]' : 'hover:bg-[#333]'
                          }`}
                        >
                          <div className="font-semibold mb-0.5">
                            {actualIdx + 1}. {snapshot.actionName}
                          </div>
                          <div className="text-[#909090] text-[11px]">{timeStr}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions Accordion */}
          <div className="collapsible-section">
            <button
              type="button"
              className={`collapsible-header ${instructionsOpen ? '' : 'collapsed'}`}
              onClick={() => setInstructionsOpen(!instructionsOpen)}
            >
              <span>Instructions</span>
              <span className="material-symbols-outlined collapsible-toggle">
                {instructionsOpen ? 'remove' : 'add'}
              </span>
            </button>
            {instructionsOpen && (
              <div className="collapsible-content text-[11px] text-[#909090] leading-relaxed">
                <strong>Quick Mode (default):</strong><br />
                • Click to add to Data Line<br />
                • Double-click to complete Data Line<br />
                • ALT + click to add to Power Group<br />
                • ALT + double-click to complete Power Group<br />
                • SHIFT + click for visibility rectangle<br />
                • CTRL + click to remove from lines<br /><br />

                <strong>Data Lines Mode:</strong><br />
                • <strong>Draw:</strong> Click to add LED cabinets, double-click to finish<br />
                • <strong>Remove:</strong> Click cabinet to cut tail (click 1st to delete whole line)<br /><br />

                <strong>Power Lines Mode:</strong><br />
                • <strong>Draw:</strong> Click to add LED cabinets, double-click to finish<br />
                • <strong>Remove:</strong> Click cabinet to remove (disconnected components auto-handled)<br /><br />

                <strong>Hide Mode:</strong><br />
                • Click to toggle single module<br />
                • SHIFT + click to start rectangle selection<br />
                • Second SHIFT + click to complete<br /><br />

                <strong>Resize Mode:</strong><br />
                • Click to set size for single module<br />
                • ALT + click twice to select row/column batch<br /><br />

                <strong>Cancel:</strong><br />
                • ESC to cancel any incomplete operation
              </div>
            )}
          </div>

          {/* Reset All Action Button */}
          <div className="mt-4 pt-3 border-t border-[#26262a]">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 hover:border-red-700/60 text-red-400 hover:text-red-300 text-xs font-medium transition-all active:scale-98 cursor-pointer shadow-sm"
              onClick={onResetAllGrids}
              title="Reset all grids and canvas configuration"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Reset All Grids</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-[#404040] mt-3 p-3 text-center">
            LedFlow v{APP_VERSION} by {APP_AUTHOR} @ Blackout Minsk
          </div>
        </div>
      )}

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

          {/* Mode Selector & Inline Tool Action */}
          <div className="mb-3">
            {/* Primary Mode Tabs: Data / Power / Hide */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#161619] rounded-lg border border-[#27272f] mb-1.5">
              {(
                [
                  { id: 'data-lines', label: 'Data', icon: 'alt_route', title: 'Create data lines' },
                  { id: 'power-lines', label: 'Power', icon: 'bolt', title: 'Create power groups' },
                  { id: 'visibility', label: 'Hide', icon: 'visibility_off', title: 'Show/hide modules' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.title}
                  className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    currentGrid.mode === m.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-[#8b8b96] hover:text-[#e0e0e0] hover:bg-[#202026]'
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
                  <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Mode Sub-row: Mode label on the left, Draw / Remove toggle on the right */}
            <div className="flex items-center justify-between min-h-[24px] px-0.5">
              <span className="panel-label mb-0">Mode</span>

              {/* Sub-mode inline action toggle: Draw vs Remove */}
              {(currentGrid.mode === 'data-lines' || currentGrid.mode === 'power-lines') ? (
                <div className="inline-flex p-0.5 bg-[#161619] rounded-md border border-[#27272f]">
                  <button
                    type="button"
                    className={`py-0.5 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      (currentGrid.toolAction || 'draw') === 'draw'
                        ? 'bg-[#232738] text-blue-400 border border-blue-500/30 shadow-xs'
                        : 'text-[#8b8b96] hover:text-[#e0e0e0] border border-transparent'
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
                    title="Draw / Connect cabinets"
                  >
                    <span className="material-symbols-outlined text-[13px]">edit</span>
                    <span>Draw</span>
                  </button>

                  <button
                    type="button"
                    className={`py-0.5 px-2 rounded flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      currentGrid.toolAction === 'erase'
                        ? 'bg-[#332024] text-red-400 border border-red-500/30 shadow-xs'
                        : 'text-[#8b8b96] hover:text-red-300 border border-transparent'
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
                    title="Remove cabinets from lines / groups"
                  >
                    <span className="material-symbols-outlined text-[13px]">backspace</span>
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-[#555562]">Click cell to toggle</span>
              )}
            </div>
          </div>

          {/* 2x2 Grid Settings: Columns / OffsetX / Rows / OffsetY */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="panel-label">Columns</span>
              <div className="panel-stepper">
                <button
                  type="button"
                  className="panel-stepper-btn"
                  onMouseDown={() =>
                    startStepping(() => {
                      onUpdateGrid(activeTab, (prev) => {
                        const newCols = Math.max(1, prev.cols - 1);
                        const newState = Array(prev.rows).fill(null).map((_, r) =>
                          Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, cols: newCols, gridState: newState };
                      });
                    })
                  }
                  onMouseUp={stopStepping}
                  onMouseLeave={stopStepping}
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={currentGrid.cols}
                  onChange={(e) => {
                    const newCols = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                    onUpdateGrid(activeTab, (prev) => {
                      const newState = Array(prev.rows).fill(null).map((_, r) =>
                        Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                      );
                      return { ...prev, cols: newCols, gridState: newState };
                    });
                  }}
                  className="panel-stepper-input stepper-input"
                />
                <button
                  type="button"
                  className="panel-stepper-btn"
                  onMouseDown={() =>
                    startStepping(() => {
                      onUpdateGrid(activeTab, (prev) => {
                        const newCols = Math.min(100, prev.cols + 1);
                        const newState = Array(prev.rows).fill(null).map((_, r) =>
                          Array(newCols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, cols: newCols, gridState: newState };
                      });
                    })
                  }
                  onMouseUp={stopStepping}
                  onMouseLeave={stopStepping}
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div>
              <span className="panel-label">Offset X</span>
              <div className="panel-stepper">
                <button
                  type="button"
                  className="panel-stepper-btn"
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
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <input
                  type="number"
                  min={0}
                  step={currentGrid.moduleWidth || 100}
                  value={currentGrid.offsetX}
                  onChange={(e) => {
                    const newOffset = Math.max(0, parseInt(e.target.value, 10) || 0);
                    onUpdateGrid(activeTab, (prev) => ({ ...prev, offsetX: newOffset }));
                  }}
                  className="panel-stepper-input stepper-input"
                />
                <button
                  type="button"
                  className="panel-stepper-btn"
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
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div>
              <span className="panel-label">Rows</span>
              <div className="panel-stepper">
                <button
                  type="button"
                  className="panel-stepper-btn"
                  onMouseDown={() =>
                    startStepping(() => {
                      onUpdateGrid(activeTab, (prev) => {
                        const newRows = Math.max(1, prev.rows - 1);
                        const newState = Array(newRows).fill(null).map((_, r) =>
                          Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, rows: newRows, gridState: newState };
                      });
                    })
                  }
                  onMouseUp={stopStepping}
                  onMouseLeave={stopStepping}
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={currentGrid.rows}
                  onChange={(e) => {
                    const newRows = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                    onUpdateGrid(activeTab, (prev) => {
                      const newState = Array(newRows).fill(null).map((_, r) =>
                        Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                      );
                      return { ...prev, rows: newRows, gridState: newState };
                    });
                  }}
                  className="panel-stepper-input stepper-input"
                />
                <button
                  type="button"
                  className="panel-stepper-btn"
                  onMouseDown={() =>
                    startStepping(() => {
                      onUpdateGrid(activeTab, (prev) => {
                        const newRows = Math.min(100, prev.rows + 1);
                        const newState = Array(newRows).fill(null).map((_, r) =>
                          Array(prev.cols).fill(null).map((__, c) => (prev.gridState[r] && prev.gridState[r][c] !== undefined ? prev.gridState[r][c] : true))
                        );
                        return { ...prev, rows: newRows, gridState: newState };
                      });
                    })
                  }
                  onMouseUp={stopStepping}
                  onMouseLeave={stopStepping}
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            <div>
              <span className="panel-label">Offset Y</span>
              <div className="panel-stepper">
                <button
                  type="button"
                  className="panel-stepper-btn"
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
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <input
                  type="number"
                  min={0}
                  step={currentGrid.moduleHeight || 100}
                  value={currentGrid.offsetY}
                  onChange={(e) => {
                    const newOffset = Math.max(0, parseInt(e.target.value, 10) || 0);
                    onUpdateGrid(activeTab, (prev) => ({ ...prev, offsetY: newOffset }));
                  }}
                  className="panel-stepper-input stepper-input"
                />
                <button
                  type="button"
                  className="panel-stepper-btn"
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
                  <span className="material-symbols-outlined">add</span>
                </button>
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
                    {/* Color Section: 5x5 Palette + Custom HEX */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: activeColor }}
                          />
                          <span className="text-[10px] uppercase font-semibold text-[#8b8b98] tracking-wider truncate">
                            {activeSub ? `Section: ${activeSub.name}` : 'Grid Color'}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-mono font-semibold text-blue-400">
                          {activeColor.toUpperCase()}
                        </span>
                      </div>

                      {/* 5x5 Palette Grid */}
                      <div className="grid grid-cols-5 gap-1.5 w-full">
                        {MODULE_PALETTE_25.map((c) => {
                          const isSelected = c.toLowerCase() === activeColor.toLowerCase();
                          return (
                            <button
                              key={c}
                              type="button"
                              style={{ backgroundColor: c }}
                              className={`h-6 rounded-md cursor-pointer transition-all border ${
                                isSelected
                                  ? 'border-white ring-2 ring-blue-500/80 scale-105 shadow-sm'
                                  : 'border-white/10 hover:border-white/40 hover:scale-105'
                              }`}
                              onClick={() => handleColorChange(c)}
                              title={c}
                            />
                          );
                        })}
                      </div>

                      {/* Custom color picker & HEX input */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#22222a]">
                        <span className="text-[10px] text-[#70707c]">Custom HEX</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={activeColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border border-[#3f3f4d] bg-transparent p-0"
                            title="Pick custom color"
                          />
                          <input
                            type="text"
                            value={activeColor.toUpperCase()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                handleColorChange(val);
                              }
                            }}
                            placeholder="#282828"
                            maxLength={7}
                            className="w-20 px-2 py-0.5 text-[11px] font-mono bg-[#1b1b22] border border-[#353542] rounded-md text-[#e0e0e0] uppercase text-center outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Typography & ID Format */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]">
                      <span className="text-[10px] uppercase font-semibold text-[#8b8b98] tracking-wider">
                        Identification
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        {/* ID Type */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#70707c]">Type</span>
                          <select
                            value={activeIdType}
                            onChange={(e) => handleIdTypeChange(e.target.value as IdType)}
                            className="w-full px-2 py-1.5 bg-[#1b1b22] border border-[#353542] rounded-md text-[#e0e0e0] text-xs outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="row.col">Row.Col (1.1)</option>
                            <option value="col.row">Col.Row (1.1)</option>
                            <option value="row-letter">Row+Letter (1A)</option>
                            <option value="letter-col">Letter+Col (A1)</option>
                            <option value="sequential">Sequential (1)</option>
                          </select>
                        </div>

                        {/* ID Font */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#70707c]">Font</span>
                            <span
                              className="px-1 py-0.2 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 text-[9px] leading-none select-none font-mono"
                              style={{ fontFamily: activeIdFont }}
                            >
                              1.1
                            </span>
                          </div>
                          <select
                            value={activeIdFont}
                            onChange={(e) => handleIdFontChange(e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#1b1b22] border border-[#353542] rounded-md text-[#e0e0e0] text-xs outline-none focus:border-blue-500 cursor-pointer"
                            style={{ fontFamily: activeIdFont }}
                          >
                            {ID_FONT_OPTIONS.map((f) => (
                              <option
                                key={f.value}
                                value={f.value}
                                style={{ fontFamily: f.value, background: '#1e1e1e', color: '#f1f5f9' }}
                              >
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* ID Font Size */}
                      <div className="flex flex-col gap-1 pt-1 border-t border-[#22222a]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#70707c]">Font Size</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 font-mono text-[10px] font-semibold">
                            {activeLabelSize}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#101014] p-1 rounded-lg border border-[#2b2b36]">
                          <button
                            type="button"
                            disabled={activeLabelSize <= 10}
                            onClick={() => handleLabelSizeChange(Math.max(10, activeLabelSize - 1))}
                            className="w-5 h-5 flex items-center justify-center bg-[#202028] hover:bg-[#2c2c36] border border-[#363644] rounded text-[#e0e0e0] text-[10px] disabled:opacity-30 cursor-pointer transition-colors"
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
                            className="flex-1 accent-blue-500 cursor-pointer"
                          />
                          <button
                            type="button"
                            disabled={activeLabelSize >= 40}
                            onClick={() => handleLabelSizeChange(Math.min(40, activeLabelSize + 1))}
                            className="w-5 h-5 flex items-center justify-center bg-[#202028] hover:bg-[#2c2c36] border border-[#363644] rounded text-[#e0e0e0] text-[10px] disabled:opacity-30 cursor-pointer transition-colors"
                            title="Increase ID font size"
                          >
                            <span className="material-symbols-outlined text-[12px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Module Dimensions */}
                    <div className="flex flex-col gap-2 p-2.5 bg-[#141418] rounded-xl border border-[#24242c]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-[#8b8b98] tracking-wider">
                          Module Geometry
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

                      <select
                        value={activeModuleSize}
                        disabled={hasSubGrids}
                        onChange={(e) => handleModuleSizePresetChange(e.target.value as ModuleSizePreset)}
                        className={`w-full px-2 py-1.5 bg-[#1b1b22] border border-[#353542] rounded-md text-[#e0e0e0] text-xs outline-none focus:border-blue-500 cursor-pointer ${
                          hasSubGrids ? 'opacity-55 cursor-not-allowed bg-[#151515]' : ''
                        }`}
                        title={hasSubGrids ? 'Module size is locked inside merged grids' : 'Select module size preset'}
                      >
                        <option value="square">Square 1:1 (100×100)</option>
                        <option value="horizontal">Horizontal 2:1 (100×50)</option>
                        <option value="vertical">Vertical 1:2 (50×100)</option>
                        <option value="custom">Custom Dimensions</option>
                      </select>

                      {activeModuleSize === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#22222a]">
                          <div>
                            <span className="panel-label">Width (px)</span>
                            <div className="panel-stepper">
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                className="panel-stepper-btn disabled:opacity-30 disabled:cursor-not-allowed"
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
                                title="Decrease width by 2px"
                              >
                                <span className="material-symbols-outlined">remove</span>
                              </button>
                              <input
                                type="number"
                                min={10}
                                max={9999}
                                step={2}
                                disabled={hasSubGrids}
                                value={activeModuleWidth}
                                onChange={(e) => {
                                  if (hasSubGrids) return;
                                  const val = Math.max(10, Math.min(9999, parseInt(e.target.value, 10) || 100));
                                  handleCustomDimensionChange(val, undefined);
                                }}
                                className={`panel-stepper-input stepper-input ${
                                  hasSubGrids ? 'opacity-55 cursor-not-allowed' : ''
                                }`}
                                title={hasSubGrids ? 'Module size is locked inside merged grids' : 'Module width in pixels'}
                              />
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                className="panel-stepper-btn disabled:opacity-30 disabled:cursor-not-allowed"
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
                                title="Increase width by 2px"
                              >
                                <span className="material-symbols-outlined">add</span>
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="panel-label">Height (px)</span>
                            <div className="panel-stepper">
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                className="panel-stepper-btn disabled:opacity-30 disabled:cursor-not-allowed"
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
                                title="Decrease height by 2px"
                              >
                                <span className="material-symbols-outlined">remove</span>
                              </button>
                              <input
                                type="number"
                                min={10}
                                max={9999}
                                step={2}
                                disabled={hasSubGrids}
                                value={activeModuleHeight}
                                onChange={(e) => {
                                  if (hasSubGrids) return;
                                  const val = Math.max(10, Math.min(9999, parseInt(e.target.value, 10) || 100));
                                  handleCustomDimensionChange(undefined, val);
                                }}
                                className={`panel-stepper-input stepper-input ${
                                  hasSubGrids ? 'opacity-55 cursor-not-allowed' : ''
                                }`}
                                title={hasSubGrids ? 'Module size is locked inside merged grids' : 'Module height in pixels'}
                              />
                              <button
                                type="button"
                                disabled={hasSubGrids}
                                className="panel-stepper-btn disabled:opacity-30 disabled:cursor-not-allowed"
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
                                title="Increase height by 2px"
                              >
                                <span className="material-symbols-outlined">add</span>
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
                  const currentNamingMode: DataLineNamingMode =
                    currentGrid.dataLineNamingMode || (currentGrid.useDefaultNames ? 'p.1-p.9' : 'none');
                  const isPrefixMode = currentNamingMode === 'p.1-p.9';

                  const items = [];
                  for (let i = startIndex; i < endIndex; i++) {
                    const conn = currentGrid.connections[i];
                    const isFilled = conn && conn.points && conn.points.length >= 1;
                    const totalCabs = isFilled ? conn.points.length : 0;

                    items.push(
                      <div
                        key={i}
                        className={`line-item relative ${isPrefixMode ? 'with-prefix' : ''}`}
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

                        {isPrefixMode && (
                          <input
                            type="text"
                            disabled={!isFilled}
                            value={isFilled ? (conn.prefix !== undefined ? conn.prefix : '') : ''}
                            placeholder={currentGrid.dataLinePrefix || '1'}
                            title="Prefix"
                            onChange={(e) => {
                              const pVal = e.target.value;
                              onUpdateGrid(activeTab, (prev) => {
                                const newConns = [...prev.connections];
                                const effectiveP = pVal !== '' ? pVal : (prev.dataLinePrefix || '1');
                                const { name, endName } = computeDataLineNames('p.1-p.9', i, effectiveP);
                                newConns[i] = {
                                  ...newConns[i],
                                  prefix: pVal,
                                  name,
                                  endName
                                };
                                return { ...prev, connections: newConns };
                              });
                            }}
                            className="w-[28px] h-7 px-1 bg-[#1a1a22] border border-[#343442] rounded text-center text-[11px] font-mono text-[#e0e0e0] outline-none focus:border-blue-500 disabled:opacity-30"
                          />
                        )}

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
                        <div className="color-swatch-container shrink-0">
                          <div
                            style={{ backgroundColor: isFilled ? (conn.color || '#000000') : '#2a2a2a' }}
                            className={`color-swatch ${isFilled ? '' : 'disabled'}`}
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
                                {DATA_LINE_COLORS.map((c, cIdx) => (
                                  <div
                                    key={c}
                                    style={{ backgroundColor: c }}
                                    className={`color-swatch-option ${(conn.color || '#000000') === c ? 'selected' : ''}`}
                                    onClick={() => {
                                      onUpdateGrid(activeTab, (prev) => {
                                        const newConns = [...prev.connections];
                                        newConns[i] = { ...newConns[i], color: c };
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

                        {/* Remove line (No outline/border, clean icon button) */}
                        <button
                          type="button"
                          disabled={!isFilled}
                          title="Delete data line"
                          className="shrink-0 p-0 border-0 bg-transparent hover:bg-red-500/15 text-[#6c6c7d] hover:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-[#6c6c7d] transition-colors rounded-md flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          onClick={() => {
                            onUpdateGrid(activeTab, (prev) => {
                              const newConns = [...prev.connections];
                              const removedConn = newConns[i];
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

                {/* Unified Font Controls */}
                <div
                  className={`mt-3.5 p-3 bg-[#1c1c1c] rounded-xl border border-[#333] flex flex-col gap-3 transition-all ${
                    currentGrid.connections.length === 0 ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {/* Font Family Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#808080] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">text_fields</span>
                      Font Family
                    </span>
                    <div className="relative">
                      <select
                        disabled={currentGrid.connections.length === 0}
                        value={currentGrid.dataLineFont}
                        onChange={(e) => {
                          const fontVal = e.target.value;
                          onUpdateGrid(activeTab, (prev) => ({ ...prev, dataLineFont: fontVal }));
                        }}
                        style={{ fontFamily: currentGrid.dataLineFont }}
                        className="w-full h-9 pl-3 pr-8 bg-[#141414] border border-[#3c3c3c] hover:border-[#555] focus:border-[#38bdf8] rounded-lg text-xs text-[#f1f5f9] outline-none cursor-pointer transition-colors appearance-none"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.value, background: '#1c1c1c', color: '#f1f5f9' }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#808080] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Font Size Controller */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#808080] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">format_size</span>
                        Font Size
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0f172a] text-[#38bdf8] border border-[#38bdf8]/40 font-mono text-[11px] font-bold shadow-sm">
                        {currentGrid.dataLineFontSizePercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#141414] p-1.5 rounded-lg border border-[#3c3c3c]">
                      <button
                        type="button"
                        disabled={currentGrid.connections.length === 0 || currentGrid.dataLineFontSizePercent <= 20}
                        onClick={() => {
                          onUpdateGrid(activeTab, (prev) => ({
                            ...prev,
                            dataLineFontSizePercent: Math.max(20, (prev.dataLineFontSizePercent || 28) - 1)
                          }));
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-[#242424] hover:bg-[#323232] border border-[#404040] rounded-md text-[#e0e0e0] disabled:opacity-30 cursor-pointer transition-colors"
                        title="Decrease font size"
                      >
                        <span className="material-symbols-outlined text-[14px]">remove</span>
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
                        className="flex-1"
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
                        className="w-6 h-6 flex items-center justify-center bg-[#242424] hover:bg-[#323232] border border-[#404040] rounded-md text-[#e0e0e0] disabled:opacity-30 cursor-pointer transition-colors"
                        title="Increase font size"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Line Naming Mode Dropdown and Prefix Input */}
                <div className="naming-mode-container mt-3 pt-3 border-t border-[#303030] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#a0a0a0] shrink-0 font-medium">Data Line Names:</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      id={`dataLineNamingMode-${activeTab}`}
                      value={currentGrid.dataLineNamingMode || (currentGrid.useDefaultNames ? 'p.1-p.9' : 'none')}
                      onChange={(e) => {
                        const mode = e.target.value as DataLineNamingMode;
                        onUpdateGrid(activeTab, (prev) => {
                          const globalPrefix = prev.dataLinePrefix || '1';
                          const updatedConns = prev.connections.map((c, idx) => {
                            if (mode === 'none') {
                              return { ...c, name: '', endName: '' };
                            }
                            if (mode === '1A-1B') {
                              return { ...c, name: `${idx + 1}A`, endName: `${idx + 1}B` };
                            }
                            if (mode === 'p.1-p.9') {
                              const effectiveP = c.prefix !== undefined && c.prefix !== '' ? c.prefix : globalPrefix;
                              const { name, endName } = computeDataLineNames('p.1-p.9', idx, effectiveP);
                              return { ...c, name, endName };
                            }
                            return c;
                          });
                          return {
                            ...prev,
                            dataLineNamingMode: mode,
                            useDefaultNames: mode !== 'none',
                            connections: updatedConns
                          };
                        }, `Changed naming mode to ${mode}`);
                      }}
                      className="px-2 py-1 bg-[#141414] border border-[#3c3c3c] hover:border-[#555] focus:border-[#38bdf8] rounded-lg text-xs text-[#f1f5f9] outline-none font-mono cursor-pointer transition-colors"
                    >
                      <option value="p.1-p.9">p.1-p.9</option>
                      <option value="1A-1B">1A-1B</option>
                      <option value="none">none</option>
                    </select>

                    {(currentGrid.dataLineNamingMode || (currentGrid.useDefaultNames ? 'p.1-p.9' : 'none')) === 'p.1-p.9' && (
                      <div className="flex items-center gap-1 bg-[#141414] border border-[#3c3c3c] focus-within:border-[#38bdf8] rounded-lg px-2 py-1 transition-colors" title="Global Data Line Prefix (p)">
                        <span className="text-[11px] text-[#808080] font-mono select-none">p:</span>
                        <input
                          type="text"
                          value={currentGrid.dataLinePrefix ?? '1'}
                          placeholder="1"
                          onChange={(e) => {
                            const newPrefix = e.target.value;
                            onUpdateGrid(activeTab, (prev) => {
                              const updatedConns = prev.connections.map((c, idx) => {
                                const effectiveP = c.prefix !== undefined && c.prefix !== '' ? c.prefix : newPrefix;
                                const { name, endName } = computeDataLineNames('p.1-p.9', idx, effectiveP);
                                return { ...c, name, endName };
                              });
                              return {
                                ...prev,
                                dataLinePrefix: newPrefix,
                                connections: updatedConns
                              };
                            });
                          }}
                          className="w-8 bg-transparent text-xs font-mono text-center text-white outline-none"
                        />
                      </div>
                    )}
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
      </div>
    </div>
  );
}
