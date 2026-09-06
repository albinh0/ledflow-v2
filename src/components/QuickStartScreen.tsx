import React, { useState, useRef } from 'react';
import { Plus, Upload, HelpCircle, Layers, ChevronRight, Cable, Zap, EyeOff, Move, FileSpreadsheet, Keyboard } from 'lucide-react';

interface QuickStartScreenProps {
  onOpenNewGridModal: () => void;
  onImportXML: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportFile?: (file: File) => void;
}

export function QuickStartScreen({
  onOpenNewGridModal,
  onImportXML,
  onImportFile
}: QuickStartScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (onImportFile) {
        onImportFile(file);
      } else if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
        const changeEvent = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(changeEvent);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      id="quickStartContainer"
      className="flex-1 w-full h-full flex items-center justify-center bg-[#141417] text-[#e0e0e0] p-6 overflow-y-auto select-none relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for XML project import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={onImportXML}
      />

      {/* Main Container */}
      <div className="w-full max-w-[880px] flex flex-col items-center gap-6 py-4 my-auto">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/5 mb-1">
            <Layers className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Quick Start Project
          </h1>
          <p className="text-sm text-[#9090a2] max-w-md">
            Create your first LED screen configuration or import an existing project file.
          </p>
        </div>

        {/* Primary Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Card 1: Create First Grid */}
          <div
            onClick={onOpenNewGridModal}
            className="group relative flex flex-col p-6 rounded-xl bg-[#1c1c24] hover:bg-[#23232e] border border-[#2b2b38] hover:border-blue-500/60 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-blue-500/10 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-200">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Start from scratch
              </span>
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors mb-1.5 flex items-center gap-1.5">
              Create First Grid
            </h3>
            <p className="text-xs text-[#9090a2] leading-relaxed mb-4">
              Configure grid columns and rows, module resolution presets, and initial canvas placement.
            </p>
            <div className="mt-auto pt-2 flex items-center text-xs font-medium text-blue-400 group-hover:text-blue-300">
              <span className="flex items-center gap-1">
                Open grid configurator <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>

          {/* Card 2: Import Project */}
          <div
            onClick={handleUploadClick}
            className={`group relative flex flex-col p-6 rounded-xl transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] border ${
              isDraggingOver
                ? 'bg-emerald-950/30 border-emerald-500 border-dashed ring-2 ring-emerald-500/40'
                : 'bg-[#1c1c24] hover:bg-[#23232e] border-[#2b2b38] hover:border-emerald-500/60 hover:shadow-emerald-500/10'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isDraggingOver
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500'
                }`}
              >
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                .XML project
              </span>
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors mb-1.5">
              {isDraggingOver ? 'Drop XML file to import' : 'Import Project'}
            </h3>
            <p className="text-xs text-[#9090a2] leading-relaxed mb-4">
              Drag and drop an XML configuration file here or click to browse from your device.
            </p>
            <div className="mt-auto pt-2 flex items-center text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
              <span className="flex items-center gap-1">
                Browse project file <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

        {/* Full Help & Reference Section (Exact duplicate of Help content) */}
        <div className="w-full rounded-xl bg-[#181820] border border-[#262632] p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#242430] text-xs font-semibold uppercase tracking-wider text-[#a0a0b8]">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Help & Reference</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-[#9090a2]">
            {/* 1. Data Lines */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Cable className="w-3.5 h-3.5 text-blue-400" />
                <span>Data Lines Mode (Data)</span>
              </div>
              <p>
                • <strong className="text-slate-300">Draw:</strong> Click cabinets sequentially to route data cables. Double-click to complete and save the line.<br />
                • <strong className="text-slate-300">Erase:</strong> Switch to Erase and click any cabinet to cut the line tail from that point, or click the 1st cabinet to delete the whole line.<br />
                • <strong className="text-slate-300">Colors & Names:</strong> Customize line colors via table swatches and configure port naming schemes in the inspector.
              </p>
            </div>

            {/* 2. Power Groups */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Power Groups Mode (Power)</span>
              </div>
              <p>
                • <strong className="text-slate-300">Draw:</strong> Click cabinets sequentially or click two distant cabinets to select a rectangular block. Double-click to create the power group.<br />
                • <strong className="text-slate-300">Erase:</strong> Switch to Erase and click a cabinet to remove it from its power group.<br />
                • <strong className="text-slate-300">Calculations:</strong> View cabinet counts, power load (Watts), and electrical current (Amps) per group and globally.
              </p>
            </div>

            {/* 3. Visibility Mode */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Visibility Mode (Hide)</span>
              </div>
              <p>
                • Click any module to toggle show/hide (for custom screen shapes, windows, and cutouts).<br />
                • <strong className="text-slate-300">Shift + Click:</strong> Click Corner 1, then Shift + Click Corner 2 to toggle an entire rectangular area.
              </p>
            </div>

            {/* 4. Screens & Merging */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Screens & Merging</span>
              </div>
              <p>
                • <strong className="text-slate-300">New Screen:</strong> Click "+ New Screen" in the left rail to add new display grids.<br />
                • <strong className="text-slate-300">Import:</strong> Click "Import" in the rail to load an existing XML project.<br />
                • <strong className="text-slate-300">Merge:</strong> On any screen tab, click Merge to combine multiple screens into one unified canvas.<br />
                • <strong className="text-slate-300">Unmerge:</strong> Click Unmerge on a merged screen to restore individual screens.
              </p>
            </div>

            {/* 5. Drag Mode (Positioning) */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Move className="w-3.5 h-3.5 text-cyan-400" />
                <span>Drag Mode (Positioning)</span>
              </div>
              <p>
                • <strong className="text-slate-300">Drag on Canvas:</strong> In Drag mode, click and drag any screen to reposition it with smart snapping to edges, adjacent screens, and module steps.<br />
                • <strong className="text-slate-300">Arrow Keys:</strong> Use ↑, ↓, ←, → to nudge active screen by 1 module width/height. Hold <strong className="text-slate-300">Shift</strong> for fine 10 px adjustments.<br />
                • <strong className="text-slate-300">D-Pad & Align:</strong> Use the on-screen directional pad or quick alignment buttons (H-Center, V-Center, Dock) in the left panel.
              </p>
            </div>

            {/* 6. Shortcuts & Navigation */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shortcuts & Navigation</span>
              </div>
              <p>
                • <strong className="text-slate-300">ESC:</strong> Cancel active in-progress data line, power group, or rectangular selection.<br />
                • <strong className="text-slate-300">Space + Drag:</strong> Pan and scroll canvas freely.<br />
                • <strong className="text-slate-300">Ctrl+Z / Ctrl+Y:</strong> Undo and Redo actions.<br />
                • <strong className="text-slate-300">G / +:</strong> Quick open New Screen dialog.<br />
                • <strong className="text-slate-300">Canvas Click:</strong> Click any screen directly on the canvas to select and inspect it.
              </p>
            </div>

            {/* 7. Export Options */}
            <div className="p-3 bg-[#121217] rounded-lg border border-[#202028] space-y-1.5 md:col-span-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
                <span>Export Options</span>
              </div>
              <p className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                <span>• <strong className="text-slate-300">PDF:</strong> Vector PDF document with custom page formatting and summary specifications.</span>
                <span>• <strong className="text-slate-300">PNG:</strong> High-resolution raster image snapshot of the canvas.</span>
                <span>• <strong className="text-slate-300">SVG:</strong> Scalable vector diagram with wire style and dimension lines.</span>
                <span>• <strong className="text-slate-300">XML:</strong> Save project file to preserve full configuration and re-edit later.</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
