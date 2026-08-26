import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#242424] border border-[#3a3a3a] rounded-2xl p-6 min-w-[380px] max-w-[440px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3 text-red-400 font-semibold text-sm">
          <span className="material-symbols-outlined text-[24px]">delete_forever</span>
          <span>{title}</span>
        </div>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            className="px-4 py-2 border border-[#404040] rounded-xl text-xs font-medium text-[#a0a0a0] hover:bg-[#333] hover:text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-5 py-2 bg-red-600 border border-red-500 rounded-xl text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-600/30"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] border border-[#404040] rounded-xl p-6 min-w-[400px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold mb-4 pb-3 border-b border-[#303030] text-[#e0e0e0]">
          Rename Grid
        </div>
        <input
          type="text"
          className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#404040] rounded text-[#e0e0e0] text-xs mb-5 outline-none focus:border-[#5a7fa5] focus:ring-2 focus:ring-[#5a7fa5]/20 font-mono"
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
        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            className="px-5 py-2 border border-[#404040] rounded-md text-sm font-medium text-[#909090] hover:bg-[#333] hover:text-[#b0b0b0] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-5 py-2 bg-[#5a7fa5] border border-[#5a7fa5] rounded-md text-sm font-medium text-white hover:bg-[#6a8fb5] transition-colors"
            onClick={() => {
              if (name.trim()) onConfirm(name.trim());
            }}
          >
            OK
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] border border-[#404040] rounded-xl p-6 min-w-[420px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold mb-4 pb-3 border-b border-[#303030] text-[#e0e0e0]">
          Create New Grid
        </div>

        {/* Row 1: Name + Size */}
        <div className="flex gap-4 my-3 items-start">
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Grid Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="LED_1"
              className="w-full h-10 px-3 text-sm bg-[#1E1E1E] border border-[#333] rounded-xl text-[#f1f5f9] font-mono outline-none focus:border-[#3B82F6]"
            />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Size
            </span>
            <select
              value={moduleSize}
              onChange={(e) => handleSizePresetChange(e.target.value as ModuleSizePreset)}
              className="w-full h-10 px-3 bg-[#1E1E1E] border border-[#333] rounded-xl text-[#f1f5f9] text-sm outline-none focus:border-[#3B82F6]"
            >
              <option value="square">Square 1:1</option>
              <option value="horizontal">Horizontal 2:1</option>
              <option value="vertical">Vertical 1:2</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Row 2: Columns + Width */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Columns
            </span>
            <div className="flex items-center bg-[#1E1E1E] border border-[#333] rounded-xl overflow-hidden">
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setCols((prev) => Math.max(1, prev - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-transparent border-none text-center font-mono text-sm text-[#f1f5f9] py-2 px-1 outline-none stepper-input [appearance:textfield]"
              />
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setCols((prev) => Math.min(100, prev + 1))}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>

          <div style={{ visibility: moduleSize === 'custom' ? 'visible' : 'hidden' }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Width
            </span>
            <div className="flex items-center bg-[#1E1E1E] border border-[#333] rounded-xl overflow-hidden">
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setModuleWidth((prev) => Math.max(10, prev - 2))}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min={10}
                max={9999}
                step={2}
                value={moduleWidth}
                onChange={(e) => setModuleWidth(parseInt(e.target.value, 10) || 100)}
                className="w-full bg-transparent border-none text-center font-mono text-sm text-[#f1f5f9] py-2 px-1 outline-none stepper-input [appearance:textfield]"
              />
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setModuleWidth((prev) => Math.min(9999, prev + 2))}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Rows + Height */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Rows
            </span>
            <div className="flex items-center bg-[#1E1E1E] border border-[#333] rounded-xl overflow-hidden">
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setRows((prev) => Math.max(1, prev - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-transparent border-none text-center font-mono text-sm text-[#f1f5f9] py-2 px-1 outline-none stepper-input [appearance:textfield]"
              />
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setRows((prev) => Math.min(100, prev + 1))}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>

          <div style={{ visibility: moduleSize === 'custom' ? 'visible' : 'hidden' }}>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-1.5 block">
              Height
            </span>
            <div className="flex items-center bg-[#1E1E1E] border border-[#333] rounded-xl overflow-hidden">
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setModuleHeight((prev) => Math.max(10, prev - 2))}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min={10}
                max={9999}
                step={2}
                value={moduleHeight}
                onChange={(e) => setModuleHeight(parseInt(e.target.value, 10) || 100)}
                className="w-full bg-transparent border-none text-center font-mono text-sm text-[#f1f5f9] py-2 px-1 outline-none stepper-input [appearance:textfield]"
              />
              <button
                type="button"
                className="p-2 text-[#94a3b8] hover:bg-[#2D2D2D] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => setModuleHeight((prev) => Math.min(9999, prev + 2))}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 4: Placement relative to existing grids */}
        <div className="mb-5 pt-3 border-t border-[#383838]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b] ml-0.5 mb-2 block">
            Placement Relative to Existing Grids
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlacement('right')}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                placement === 'right'
                  ? 'bg-[#1e293b] border-[#3B82F6] text-white ring-1 ring-[#3B82F6]'
                  : 'bg-[#1E1E1E] border-[#333] text-[#94a3b8] hover:bg-[#262626] hover:text-[#e2e8f0]'
              }`}
            >
              <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
                placement === 'right' ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#94a3b8]'
              }`}>
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#f1f5f9] truncate">Right of All</div>
                <div className="text-[10px] text-[#64748b] truncate">To the right of all grids</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPlacement('bottom')}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                placement === 'bottom'
                  ? 'bg-[#1e293b] border-[#3B82F6] text-white ring-1 ring-[#3B82F6]'
                  : 'bg-[#1E1E1E] border-[#333] text-[#94a3b8] hover:bg-[#262626] hover:text-[#e2e8f0]'
              }`}
            >
              <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
                placement === 'bottom' ? 'bg-[#3B82F6] text-white' : 'bg-[#2A2A2A] text-[#94a3b8]'
              }`}>
                <ArrowDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#f1f5f9] truncate">Below All</div>
                <div className="text-[10px] text-[#64748b] truncate">Below all existing grids</div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 justify-end">
          <button
            type="button"
            className="px-5 py-2 border border-[#404040] rounded-md text-sm font-medium text-[#909090] hover:bg-[#333] hover:text-[#b0b0b0] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-5 py-2 bg-[#5a7fa5] border border-[#5a7fa5] rounded-md text-sm font-medium text-white hover:bg-[#6a8fb5] transition-colors"
            onClick={handleCreate}
          >
            Create
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
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 max-w-lg w-full shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#333] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MergeIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Merge Screens into One Canvas</h2>
              <p className="text-[11px] text-slate-400">
                Route continuous Data and Power lines across multiple screens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Merged Screen Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-xl text-[#f1f5f9] text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
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
                className={`p-1 rounded-lg shrink-0 ${
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
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                      shiftDirection === 'right'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-[#181818] border-[#383838] text-slate-300 hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    <span>Shift Right</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftDirection((prev) => (prev === 'bottom' ? 'none' : 'bottom'))}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                      shiftDirection === 'bottom'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-[#181818] border-[#383838] text-slate-300 hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    <span>Shift Down</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftDirection((prev) => (prev === 'auto' ? 'none' : 'auto'))}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                      shiftDirection === 'auto'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                        : 'bg-[#181818] border-[#383838] text-slate-300 hover:bg-[#252525] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                    <span>Auto-Shift</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid selector header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Select Screens to Combine ({selectedGridIds.length}/{gridEntries.length})
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {selectedGridIds.length === gridEntries.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Grids list */}
        <div className="max-h-52 overflow-y-auto space-y-2 mb-4 pr-1">
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
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/50 shadow-sm'
                      : 'bg-[#141414] border-[#2a2a2a] hover:border-[#383838]'
                  }`}
                >
                  <div className="flex items-center gap-3">
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
                          {grid.cols}×{grid.rows} ({grid.moduleWidth}×{grid.moduleHeight}mm)
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
        <div className="flex items-center justify-between p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl mb-4">
          <div>
            <div className="text-xs font-medium text-slate-200">Keep original screens</div>
            <div className="text-[10px] text-slate-400">If unchecked, source screens will be replaced</div>
          </div>
          <label className="panel-toggle-switch">
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
        <div className="flex items-center justify-between bg-blue-950/20 border border-blue-900/30 p-2.5 rounded-xl mb-5 text-[11px] text-slate-300">
          <span>
            Combined: <strong className="text-white">{totalCabinets}</strong> cabinets
          </span>
          <span>•</span>
          <span>
            <strong className="text-white">{totalDataLines}</strong> data lines
          </span>
          <span>•</span>
          <span>
            <strong className="text-white">{totalPowerGroups}</strong> power groups
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 border border-[#333] rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canMerge}
            className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 ${
              canMerge
                ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 cursor-pointer'
                : 'bg-slate-700 opacity-40 cursor-not-allowed'
            }`}
            onClick={handleSubmit}
          >
            <MergeIcon className="w-4 h-4" />
            Merge {selectedGridIds.length} Screens
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
    orientation: 'landscape' | 'portrait';
    format: 'a4' | 'a3' | 'auto';
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
  const defaultOrientation = outputWidth >= outputHeight ? 'landscape' : 'portrait';
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(defaultOrientation);
  const [format, setFormat] = useState<'a4' | 'a3' | 'auto'>('a4');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeCanvasBorder, setIncludeCanvasBorder] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOrientation(outputWidth >= outputHeight ? 'landscape' : 'portrait');
      setIsExporting(false);
    }
  }, [isOpen, outputWidth, outputHeight]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onConfirm({
        orientation,
        format,
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#202024] border border-[#383842] rounded-2xl p-6 w-full max-w-[460px] shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#303038]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Export to PDF</h3>
              <p className="text-[11px] text-slate-400">Page orientation and layout settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center text-base"
          >
            ×
          </button>
        </div>

        {/* Orientation selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-200 mb-2">
            Page Orientation
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-purple-950/30 border-purple-500/60 shadow-sm text-white'
                  : 'bg-[#141416] border-[#2c2c34] text-slate-400 hover:border-[#444450] hover:text-slate-200'
              }`}
            >
              <div className="w-10 h-7 border-2 border-current rounded-sm mb-2 flex items-center justify-center">
                <span className="w-6 h-1.5 bg-current/40 rounded-[1px]" />
              </div>
              <span className="text-xs font-semibold">Landscape</span>
            </button>

            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-purple-950/30 border-purple-500/60 shadow-sm text-white'
                  : 'bg-[#141416] border-[#2c2c34] text-slate-400 hover:border-[#444450] hover:text-slate-200'
              }`}
            >
              <div className="w-7 h-10 border-2 border-current rounded-sm mb-2 flex items-center justify-center">
                <span className="w-4 h-1.5 bg-current/40 rounded-[1px]" />
              </div>
              <span className="text-xs font-semibold">Portrait</span>
            </button>
          </div>
        </div>

        {/* Paper Size Preset */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Page Size
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              {format === 'a4'
                ? orientation === 'landscape' ? '297 × 210 mm' : '210 × 297 mm'
                : format === 'a3'
                ? orientation === 'landscape' ? '420 × 297 mm' : '297 × 420 mm'
                : `${outputWidth} × ${outputHeight} px`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                format === 'a4'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-[#141416] border-[#2c2c34] text-slate-300 hover:border-[#444]'
              }`}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setFormat('a3')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                format === 'a3'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-[#141416] border-[#2c2c34] text-slate-300 hover:border-[#444]'
              }`}
            >
              A3
            </button>
            <button
              type="button"
              onClick={() => setFormat('auto')}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                format === 'auto'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-[#141416] border-[#2c2c34] text-slate-300 hover:border-[#444]'
              }`}
            >
              Auto / Canvas
            </button>
          </div>
        </div>

        {/* Options Toggles */}
        <div className="space-y-2 mb-4">
          <div className="p-3 bg-[#141416] border border-[#2c2c34] rounded-xl flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">
              Display summary on page
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

          <div className="p-3 bg-[#141416] border border-[#2c2c34] rounded-xl flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">
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
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            className="px-4 py-2 border border-[#333] rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 border border-purple-500 rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
