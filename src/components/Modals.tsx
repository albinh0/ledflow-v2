import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowDown, Layers, X, Plus, Minus, Grid, Sparkles, Check } from 'lucide-react';
import { ModuleSizePreset, AnchorPoint, GridModel, Point, GridPlacementOption } from '../types';
import { getModuleId, calculateModuleGeometry, getModuleGeometry, isValidModuleCell } from '../utils/geometry';
import {
  ShiftDirection,
  checkGridsOverlap,
  calculateShiftedOffsets
} from '../utils/mergeGrids';
import { MergeIcon } from './CustomIcons';

interface RenameModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#181820] border border-[#2c2c3a] rounded-2xl p-5 sm:p-6 w-full max-w-[420px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#242430] mb-3.5">
          <div className="flex items-center gap-2.5 text-red-400 font-semibold text-sm">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
            </div>
            <span className="text-white font-semibold text-sm">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#88889a] hover:text-white hover:bg-[#262634] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#a0a0b2] mb-5 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="h-8.5 px-4 border border-[#2e2e3e] bg-[#1a1a24] hover:bg-[#252535] rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-8.5 px-4 bg-red-600 border border-red-500 rounded-lg text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RenameModal({ isOpen, initialName, onClose, onConfirm }: RenameModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#181820] border border-[#2c2c3a] rounded-2xl p-5 sm:p-6 w-full max-w-[400px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#242430] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Rename Screen</h2>
              <p className="text-[11px] text-[#8e8ea0]">Enter a new label for this screen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#88889a] hover:text-white hover:bg-[#262634] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          className="w-full h-8.5 px-3 bg-[#101014] border border-[#282838] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-100 text-xs mb-5 outline-none font-mono"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (name.trim()) onConfirm(name.trim());
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="h-8.5 px-4 border border-[#2e2e3e] bg-[#1a1a24] hover:bg-[#252535] rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-8.5 px-4 bg-blue-600 border border-blue-500 rounded-lg text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-1"
            onClick={() => {
              if (name.trim()) onConfirm(name.trim());
            }}
          >
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewGridModalProps {
  isOpen: boolean;
  defaultName: string;
  onClose: () => void;
  onConfirm: (
    cols: number,
    rows: number,
    name: string,
    moduleSize: ModuleSizePreset,
    moduleWidth: number,
    moduleHeight: number,
    placement: GridPlacementOption
  ) => void;
}

export function NewGridModal({ isOpen, defaultName, onClose, onConfirm }: NewGridModalProps) {
  const [name, setName] = useState(defaultName);
  const [cols, setCols] = useState(16);
  const [rows, setRows] = useState(9);
  const [moduleSize, setModuleSize] = useState<ModuleSizePreset>('square');
  const [moduleWidth, setModuleWidth] = useState(100);
  const [moduleHeight, setModuleHeight] = useState(100);
  const [placement, setPlacement] = useState<GridPlacementOption>('right');

  const steppingRef = useMemo(() => ({ current: null as { timer: any; interval: any } | null }), []);

  const startStepping = (action: () => void, isFast = false) => {
    action();
    const intervalTime = isFast ? 20 : 60;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        action();
      }, intervalTime);
      steppingRef.current = { timer, interval };
    }, 350);
    steppingRef.current = { timer, interval: null };
  };

  const stopStepping = () => {
    if (steppingRef.current) {
      if (steppingRef.current.timer) clearTimeout(steppingRef.current.timer);
      if (steppingRef.current.interval) clearInterval(steppingRef.current.interval);
      steppingRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopStepping();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setCols(16);
      setRows(9);
      setModuleSize('square');
      setModuleWidth(100);
      setModuleHeight(100);
      setPlacement('right');
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSizePresetChange = (preset: ModuleSizePreset) => {
    setModuleSize(preset);
    if (preset === 'square') {
      setModuleWidth(100);
      setModuleHeight(100);
    } else if (preset === 'horizontal') {
      setModuleWidth(100);
      setModuleHeight(50);
    } else if (preset === 'vertical') {
      setModuleWidth(50);
      setModuleHeight(100);
    }
  };

  const handleCreate = () => {
    const finalCols = Math.max(1, Math.min(100, cols || 16));
    const finalRows = Math.max(1, Math.min(100, rows || 9));
    const finalName = name.trim() || defaultName;
    onConfirm(finalCols, finalRows, finalName, moduleSize, moduleWidth || 100, moduleHeight || 100, placement);
  };

  // Calculate aspect ratio string
  const getAspectRatioString = (w: number, h: number) => {
    if (!w || !h) return '';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h));
    const rW = Math.round(w) / divisor;
    const rH = Math.round(h) / divisor;
    if (rW > 50 || rH > 50) {
      return `${(w / h).toFixed(2)}:1`;
    }
    return `${rW}:${rH}`;
  };

  const totalWidth = cols * moduleWidth;
  const totalHeight = rows * moduleHeight;
  const totalModules = cols * rows;
  const aspectRatio = getAspectRatioString(totalWidth, totalHeight);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none" onClick={onClose}>
      <div
        className="bg-[#181820] border border-[#2c2c3a] rounded-2xl p-5 w-full max-w-[420px] shadow-2xl font-sans text-[#e0e0ea]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#242430] mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">Create New Grid</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#88889a] hover:text-white hover:bg-[#262634] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3 mb-3.5">
          {/* Row 1: Screen Name & Module Preset (with Custom Size nested directly under preset) */}
          <div className="grid grid-cols-2 gap-2.5 items-start">
            {/* Screen Name */}
            <div>
              <label className="panel-label mb-1.5 ml-0.5">
                SCREEN NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="LED_1"
                className="w-full h-8 px-2.5 text-xs bg-[#101014] border border-[#272736] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-100 font-mono outline-none transition-colors"
              />
            </div>

            {/* Size Preset & Nested Custom Size */}
            <div className="space-y-2.5">
              <div>
                <label className="panel-label mb-1.5 ml-0.5">
                  SIZE PRESET
                </label>
                <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-[#101014] rounded-lg border border-[#272736] h-8 items-center">
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
                      onClick={() => handleSizePresetChange(preset.id)}
                      className={`h-6.5 rounded-md text-[10.5px] font-medium flex items-center justify-center transition-all cursor-pointer truncate ${
                        moduleSize === preset.id
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-[#88889a] hover:text-[#e0e0ec] hover:bg-[#202028]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Module Dimensions (compact, exactly under Size Preset) */}
              {moduleSize === 'custom' && (
                <div>
                  <label className="panel-label mb-1.5 ml-0.5">
                    CUSTOM SIZE (PX)
                  </label>
                  <div className="flex items-center h-8 bg-[#101014] border border-[#272736] focus-within:border-blue-500 rounded-lg overflow-hidden">
                    {/* Width Stepper */}
                    <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                      <button
                        type="button"
                        title="Decrease Width"
                        className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                        onMouseDown={() => startStepping(() => setModuleWidth((prev) => Math.max(10, prev - 2)), true)}
                        onMouseUp={stopStepping}
                        onMouseLeave={stopStepping}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={10}
                        max={9999}
                        step={2}
                        value={moduleWidth}
                        title="Width (px)"
                        onChange={(e) => setModuleWidth(Math.max(10, parseInt(e.target.value, 10) || 100))}
                        className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        title="Increase Width"
                        className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                        onMouseDown={() => startStepping(() => setModuleWidth((prev) => Math.min(9999, prev + 2)), true)}
                        onMouseUp={stopStepping}
                        onMouseLeave={stopStepping}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] h-3.5 bg-[#282838] shrink-0" />

                    {/* Height Stepper */}
                    <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                      <button
                        type="button"
                        title="Decrease Height"
                        className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                        onMouseDown={() => startStepping(() => setModuleHeight((prev) => Math.max(10, prev - 2)), true)}
                        onMouseUp={stopStepping}
                        onMouseLeave={stopStepping}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={10}
                        max={9999}
                        step={2}
                        value={moduleHeight}
                        title="Height (px)"
                        onChange={(e) => setModuleHeight(Math.max(10, parseInt(e.target.value, 10) || 100))}
                        className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        title="Increase Height"
                        className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                        onMouseDown={() => startStepping(() => setModuleHeight((prev) => Math.min(9999, prev + 2)), true)}
                        onMouseUp={stopStepping}
                        onMouseLeave={stopStepping}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Cols / Rows & Placement */}
          <div className="grid grid-cols-2 gap-2.5 items-start">
            {/* Columns & Rows Dual Stepper */}
            <div>
              <label className="panel-label mb-1.5 ml-0.5">
                COLS / ROWS
              </label>
              <div className="flex items-center h-8 bg-[#101014] border border-[#272736] focus-within:border-blue-500 rounded-lg overflow-hidden">
                {/* Columns Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    title="Decrease Columns"
                    className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                    onMouseDown={() => startStepping(() => setCols((prev) => Math.max(1, prev - 1)), false)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={cols}
                    title="Columns"
                    onChange={(e) => setCols(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                    className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    title="Increase Columns"
                    className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                    onMouseDown={() => startStepping(() => setCols((prev) => Math.min(100, prev + 1)), false)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Divider */}
                <div className="w-[1px] h-3.5 bg-[#282838] shrink-0" />

                {/* Rows Half */}
                <div className="flex-1 min-w-0 flex items-center h-full px-0.5">
                  <button
                    type="button"
                    title="Decrease Rows"
                    className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                    onMouseDown={() => startStepping(() => setRows((prev) => Math.max(1, prev - 1)), false)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rows}
                    title="Rows"
                    onChange={(e) => setRows(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                    className="flex-1 min-w-0 h-full bg-transparent text-center font-mono text-xs text-slate-100 outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    title="Increase Rows"
                    className="w-5 h-6 rounded flex items-center justify-center text-[#88889a] hover:text-white hover:bg-[#20202a] active:scale-95 transition-all cursor-pointer shrink-0"
                    onMouseDown={() => startStepping(() => setRows((prev) => Math.min(100, prev + 1)), false)}
                    onMouseUp={stopStepping}
                    onMouseLeave={stopStepping}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Placement Selector */}
            <div>
              <label className="panel-label mb-1.5 ml-0.5">
                PLACEMENT
              </label>
              <div className="flex items-center h-8 bg-[#101014] border border-[#272736] rounded-lg p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setPlacement('right')}
                  className={`flex-1 h-full rounded-md flex items-center justify-center gap-1 text-xs transition-all cursor-pointer select-none ${
                    placement === 'right'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-[#88889a] hover:text-[#e0e0ec] hover:bg-[#202028]'
                  }`}
                  title="Place to the right of existing screens"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement('bottom')}
                  className={`flex-1 h-full rounded-md flex items-center justify-center gap-1 text-xs transition-all cursor-pointer select-none ${
                    placement === 'bottom'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-[#88889a] hover:text-[#e0e0ec] hover:bg-[#202028]'
                  }`}
                  title="Place below existing screens"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Bottom</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Resolution & Count Summary */}
        <div className="px-3 py-2 bg-[#111116] rounded-xl border border-[#242432] mb-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-semibold text-white">
              {totalWidth} × {totalHeight} px
            </span>
            <span className="text-[#68687a]">•</span>
            <span className="text-[#8e8ea2]">
              {totalModules} modules
            </span>
          </div>
          {aspectRatio && (
            <span className="text-[#88889c] font-mono text-[11px]">
              {aspectRatio}
            </span>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="h-8 px-3.5 border border-[#2e2e3e] bg-[#1a1a24] hover:bg-[#252535] rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-8 px-4 bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg text-xs font-semibold text-white transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            onClick={handleCreate}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastTooltipProps {
  message: string | null;
  type: 'error' | 'success';
}

export function ToastTooltip({ message, type }: ToastTooltipProps) {
  if (!message) return null;

  const bg = type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(220, 53, 69, 0.95)';

  return (
    <div
      className="fixed left-5 bottom-5 text-white px-3 py-2 rounded-lg text-sm z-[10000] pointer-events-none shadow-lg flex items-center animate-fade-in"
      style={{ backgroundColor: bg }}
    >
      {message}
    </div>
  );
}

interface MergeGridsModalProps {
  isOpen: boolean;
  grids: Record<string, GridModel>;
  onClose: () => void;
  onConfirm: (
    selectedGridIds: string[],
    mergedName: string,
    keepOriginals: boolean,
    customOffsets?: Record<string, { offsetX: number; offsetY: number }>
  ) => void;
}

export function MergeGridsModal({ isOpen, grids, onClose, onConfirm }: MergeGridsModalProps) {
  const [selectedGridIds, setSelectedGridIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState('LED_Unified');
  const [keepOriginals, setKeepOriginals] = useState(false);
  const [shiftDirection, setShiftDirection] = useState<ShiftDirection>('none');

  const gridEntries = Object.entries(grids);

  useEffect(() => {
    if (isOpen) {
      // By default select all available grids
      const allIds = Object.keys(grids);
      setSelectedGridIds(allIds);
      setMergedName(`LED_Merged_${allIds.length}`);
      setKeepOriginals(false);
      setShiftDirection('none');
    }
  }, [isOpen, grids]);

  // Check initial overlap (at original offsets)
  const initialOverlapInfo = useMemo(() => {
    return checkGridsOverlap(selectedGridIds, grids);
  }, [selectedGridIds, grids]);

  // Calculate shifts if requested
  const customOffsets = useMemo(() => {
    return calculateShiftedOffsets(selectedGridIds, grids, shiftDirection);
  }, [selectedGridIds, grids, shiftDirection]);

  // Check active overlap (with custom offsets if applied)
  const activeOverlapInfo = useMemo(() => {
    return checkGridsOverlap(selectedGridIds, grids, customOffsets);
  }, [selectedGridIds, grids, customOffsets]);

  if (!isOpen) return null;

  const toggleSelectGrid = (id: string) => {
    setSelectedGridIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedGridIds.length === gridEntries.length) {
      setSelectedGridIds([]);
    } else {
      setSelectedGridIds(gridEntries.map(([id]) => id));
    }
  };

  // Calculate totals for selected grids
  let totalCabinets = 0;
  let totalDataLines = 0;
  let totalPowerGroups = 0;

  selectedGridIds.forEach((id) => {
    const g = grids[id];
    if (g) {
      let activeMods = 0;
      for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
          if (isValidModuleCell(g, r, c) && g.gridState[r] && g.gridState[r][c]) activeMods++;
        }
      }
      totalCabinets += activeMods;
      totalDataLines += g.connections.length;
      totalPowerGroups += g.selectedGroups.length;
    }
  });

  const canMerge = selectedGridIds.length >= 2;

  const handleSubmit = () => {
    if (!canMerge) return;
    const finalName = mergedName.trim() || 'LED_Unified';
    onConfirm(
      selectedGridIds,
      finalName,
      keepOriginals,
      shiftDirection !== 'none' ? customOffsets : undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#181820] border border-[#2c2c3a] rounded-2xl p-5 sm:p-6 max-w-xl w-full shadow-2xl font-sans text-[#e0e0ea]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[#242430] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <MergeIcon className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Merge Screens into One Canvas</h2>
              <p className="text-[11px] text-[#8e8ea0]">
                Route continuous Data and Power lines across multiple screens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#88889a] hover:text-white hover:bg-[#262634] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[#a6a6b8] mb-1.5">
            Merged Screen Name
          </label>
          <input
            type="text"
            className="w-full h-8 px-2.5 bg-[#101014] border border-[#272736] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-100 text-xs outline-none font-mono transition-colors"
            value={mergedName}
            onChange={(e) => setMergedName(e.target.value)}
            placeholder="e.g. LED_Main_Stage"
          />
        </div>

        {/* Overlap Warning & Shift Recommendation */}
        {initialOverlapInfo.hasOverlap && (
          <div
            className={`mb-4 p-3 rounded-xl border transition-all ${
              shiftDirection !== 'none' && !activeOverlapInfo.hasOverlap
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/30 border-amber-500/50 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`p-1 rounded-md shrink-0 ${
                  shiftDirection !== 'none' && !activeOverlapInfo.hasOverlap
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {shiftDirection !== 'none' && !activeOverlapInfo.hasOverlap ? 'check_circle' : 'warning'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {shiftDirection !== 'none' && !activeOverlapInfo.hasOverlap
                      ? 'Intersection Avoided'
                      : 'Overlapping Screens Detected'}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                    {initialOverlapInfo.overlappingPairs.length} conflict
                    {initialOverlapInfo.overlappingPairs.length > 1 ? 's' : ''}
                  </span>
                </div>

                <p className="text-[11px] mt-1 leading-relaxed text-slate-300">
                  {shiftDirection !== 'none' && !activeOverlapInfo.hasOverlap
                    ? `Screens will be shifted ${
                        shiftDirection === 'right'
                          ? 'to the right (→)'
                          : shiftDirection === 'bottom'
                          ? 'to the bottom (↓)'
                          : 'automatically'
                      } during merge to prevent cabinets overlapping.`
                    : `Screens (${initialOverlapInfo.overlappingPairs
                        .map((p) => `"${p.gridName1}" & "${p.gridName2}"`)
                        .join(', ')}) intersect on canvas. Shift screens to avoid overlap:`}
                </p>

                {/* Shift Options */}
                <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShiftDirection((prev) => (prev === 'right' ? 'none' : 'right'))}
                    className={`h-7.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      shiftDirection === 'right'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm font-semibold'
                        : 'bg-[#101014] border-[#272736] text-slate-300 hover:bg-[#22222c] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    <span>Shift Right</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftDirection((prev) => (prev === 'bottom' ? 'none' : 'bottom'))}
                    className={`h-7.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      shiftDirection === 'bottom'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm font-semibold'
                        : 'bg-[#101014] border-[#272736] text-slate-300 hover:bg-[#22222c] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                    <span>Shift Down</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftDirection((prev) => (prev === 'auto' ? 'none' : 'auto'))}
                    className={`h-7.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      shiftDirection === 'auto'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm font-semibold'
                        : 'bg-[#101014] border-[#272736] text-slate-300 hover:bg-[#22222c] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                    <span>Auto-Shift</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid selector header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#a6a6b8]">
            Select Screens to Combine ({selectedGridIds.length}/{gridEntries.length})
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
          >
            {selectedGridIds.length === gridEntries.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Grids list */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 mb-4 pr-1">
          {gridEntries.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No screens available</div>
          ) : (
            gridEntries.map(([gId, grid]) => {
              const isSelected = selectedGridIds.includes(gId);
              let activeMods = 0;
              for (let r = 0; r < grid.rows; r++) {
                for (let c = 0; c < grid.cols; c++) {
                  if (isValidModuleCell(grid, r, c) && grid.gridState[r] && grid.gridState[r][c]) activeMods++;
                }
              }

              const isShifted =
                shiftDirection !== 'none' &&
                customOffsets[gId] &&
                (customOffsets[gId].offsetX !== grid.offsetX || customOffsets[gId].offsetY !== grid.offsetY);
              const currentPosX = isShifted ? customOffsets[gId].offsetX : grid.offsetX;
              const currentPosY = isShifted ? customOffsets[gId].offsetY : grid.offsetY;

              return (
                <div
                  key={gId}
                  onClick={() => toggleSelectGrid(gId)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/50 shadow-xs'
                      : 'bg-[#121217] border-[#252533] hover:border-[#383848]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectGrid(gId)}
                      className="w-4 h-4 rounded text-blue-600 bg-[#222] border-[#444] focus:ring-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: grid.moduleColor }}
                        />
                        <span className="font-semibold text-xs text-white">{grid.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
                          {grid.cols}×{grid.rows} ({grid.moduleWidth}×{grid.moduleHeight}px)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>
                          Pos: X={currentPosX}, Y={currentPosY}
                        </span>
                        {isShifted && (
                          <span className="text-[9px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded">
                            Shifted
                          </span>
                        )}
                        <span>• {activeMods} cabinets</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono text-slate-400">
                    <div>{grid.connections.length} Data lines</div>
                    <div>{grid.selectedGroups.length} Power groups</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keep originals toggle */}
        <div className="flex items-center justify-between p-2.5 bg-[#121217] border border-[#252533] rounded-xl mb-4">
          <div>
            <div className="text-xs font-semibold text-slate-200">Keep original screens</div>
            <div className="text-[10px] text-[#808092]">If unchecked, source screens will be replaced</div>
          </div>
          <label className="panel-toggle-switch scale-90">
            <input
              type="checkbox"
              checked={keepOriginals}
              onChange={(e) => setKeepOriginals(e.target.checked)}
            />
            <div className="panel-toggle-track">
              <div className="panel-toggle-knob" />
            </div>
          </label>
        </div>

        {/* Combined summary footer */}
        <div className="flex items-center justify-between bg-[#111116] border border-[#242432] p-2.5 rounded-xl mb-4 text-[11px] text-[#a0a0b2]">
          <span>
            Combined: <strong className="text-white font-mono">{totalCabinets}</strong> cabinets
          </span>
          <span>•</span>
          <span>
            <strong className="text-white font-mono">{totalDataLines}</strong> data lines
          </span>
          <span>•</span>
          <span>
            <strong className="text-white font-mono">{totalPowerGroups}</strong> power groups
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            className="h-8.5 px-4 border border-[#2e2e3e] bg-[#1a1a24] hover:bg-[#252535] rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canMerge}
            className={`h-8.5 px-5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 ${
              canMerge
                ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-[0.98]'
                : 'bg-slate-800 opacity-40 cursor-not-allowed text-slate-400'
            }`}
            onClick={handleSubmit}
          >
            <MergeIcon className="w-4 h-4" />
            <span>Merge {selectedGridIds.length} Screens</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ExportPdfModalProps {
  isOpen: boolean;
  outputWidth: number;
  outputHeight: number;
  grids: Record<string, GridModel>;
  onClose: () => void;
  onConfirm: (options: {
    includeSummary: boolean;
    includeCanvasBorder: boolean;
  }) => Promise<void> | void;
}

export function ExportPdfModal({
  isOpen,
  outputWidth,
  outputHeight,
  grids,
  onClose,
  onConfirm
}: ExportPdfModalProps) {
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeCanvasBorder, setIncludeCanvasBorder] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onConfirm({
        includeSummary,
        includeCanvasBorder
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#202024] border border-[#383842] rounded-xl p-6 w-full max-w-[460px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#303038]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Export to PDF</h3>
              <p className="text-[11px] text-slate-400">Export canvas and hardware specification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center text-base cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Paper Size Preset - Always Canvas / Auto */}
        <div className="mb-4 p-3 bg-[#141416] border border-[#2c2c34] rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-400">aspect_ratio</span>
            <div>
              <div className="text-xs font-semibold text-slate-200">Page Format: 1:1 Canvas</div>
              <div className="text-[10px] text-slate-400">Summary table placed directly under canvas</div>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">
            {outputWidth} × {outputHeight} px
          </span>
        </div>

        {/* Options Toggles */}
        <div className="space-y-2 mb-5">
          <div className="p-2.5 bg-[#141416] border border-[#2c2c34] rounded-lg flex items-center justify-between">
            <div className="text-xs font-medium text-slate-200">
              Display summary table under canvas
            </div>
            <label className="panel-toggle-switch shrink-0">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
              />
              <div className="panel-toggle-track">
                <div className="panel-toggle-knob" />
              </div>
            </label>
          </div>

          <div className="p-2.5 bg-[#141416] border border-[#2c2c34] rounded-lg flex items-center justify-between">
            <div className="text-xs font-medium text-slate-200">
              Canvas border
            </div>
            <label className="panel-toggle-switch shrink-0">
              <input
                type="checkbox"
                checked={includeCanvasBorder}
                onChange={(e) => setIncludeCanvasBorder(e.target.checked)}
              />
              <div className="panel-toggle-track">
                <div className="panel-toggle-knob" />
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="h-[38px] px-4 border border-[#383842] rounded-md text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            className="h-[38px] px-4 bg-purple-600 hover:bg-purple-500 active:scale-95 border border-purple-500 rounded-md text-xs font-semibold text-white transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            onClick={handleExport}
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Generating PDF...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
