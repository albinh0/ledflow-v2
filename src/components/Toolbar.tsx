interface ToolbarProps {
  onExportXML: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentScale: number;
  cursorCoords: { x: number; y: number } | null;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  leftPanelWidth: number;
}

export function Toolbar({
  onExportXML,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentScale,
  cursorCoords,
  isLeftPanelCollapsed,
  onToggleLeftPanel,
  leftPanelWidth
}: ToolbarProps) {
  return (
    <>
      {/* Top Right Export Controls */}
      <div className="fixed top-5 right-5 flex items-center bg-[#232323] border border-[#404040] rounded-lg p-0 z-10">
        <button
          type="button"
          onClick={onExportXML}
          title="Export XML"
          className="w-10 h-10 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center text-[10px] font-semibold transition-all border-r border-[#404040] rounded-l-lg hover:bg-[#ff8c1a] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
        >
          XML
        </button>
        <button
          type="button"
          onClick={onExportPNG}
          title="Export PNG"
          className="w-10 h-10 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center text-[10px] font-semibold transition-all border-r border-[#404040] hover:bg-[#4a9eff] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
        >
          PNG
        </button>
        <button
          type="button"
          onClick={onExportSVG}
          title="Export SVG"
          className="w-10 h-10 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center text-[10px] font-semibold transition-all border-r border-[#404040] hover:bg-[#4ade80] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
        >
          SVG
        </button>
        <button
          type="button"
          onClick={onExportPDF}
          title="Export Vector PDF"
          className="w-10 h-10 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center text-[10px] font-semibold transition-all rounded-r-lg hover:bg-[#a855f7] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
        >
          PDF
        </button>
      </div>

      {/* Cursor coordinates display */}
      <div
        className={`fixed top-[70px] right-5 bg-[#232323] border border-[#404040] rounded-lg px-3 py-2 text-[11px] font-semibold text-[#e0e0e0] font-mono z-10 min-w-[120px] transition-opacity ${
          cursorCoords ? 'block' : 'hidden'
        }`}
      >
        <div className="flex justify-between gap-3 mb-1">
          <span className="text-[#909090] font-normal">X:</span>
          <span className="text-[#4a9b5f] text-right">
            {cursorCoords ? `${Math.round(cursorCoords.x)}px` : '—'}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#909090] font-normal">Y:</span>
          <span className="text-[#4a9b5f] text-right">
            {cursorCoords ? `${Math.round(cursorCoords.y)}px` : '—'}
          </span>
        </div>
      </div>

      {/* Bottom Right Controls (Undo/Redo + Zoom) */}
      <div className="fixed bottom-5 right-5 flex items-center gap-2 z-10">
        {/* Undo / Redo Group */}
        <div className="flex items-center bg-[#232323] border border-[#404040] rounded-lg p-0 shadow-lg">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="w-8 h-8 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center transition-all border-r border-[#404040] rounded-l-lg hover:bg-[#3b82f6] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#e0e0e0] active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="w-8 h-8 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center transition-all rounded-r-lg hover:bg-[#3b82f6] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#e0e0e0] active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#232323] border border-[#404040] rounded-lg p-0 shadow-lg">
          <button
            type="button"
            onClick={onFitToScreen}
            title="Fit canvas to screen"
            className="w-8 h-8 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center transition-all border-r border-[#404040] rounded-l-lg hover:bg-[#4a9eff] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">crop_free</span>
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom out"
            className="w-8 h-8 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center transition-all border-r border-[#404040] hover:bg-[#ff4444] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>
          <div className="w-[58px] h-8 flex items-center justify-center text-[#e0e0e0] font-mono text-xs font-medium border-r border-[#404040] px-1 select-none">
            {Math.round(currentScale * 100)}%
          </div>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom in"
            className="w-8 h-8 bg-transparent border-none text-[#e0e0e0] flex items-center justify-center transition-all rounded-r-lg hover:bg-[#44ff88] hover:text-[#1a1a1a] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>
        </div>
      </div>

      {/* Collapse Panel Button */}
      <button
        type="button"
        onClick={onToggleLeftPanel}
        title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
        className="w-10 h-10 bg-[#2a2a2a] text-[#e0e0e0] border border-[#404040] rounded-lg fixed bottom-5 z-20 flex items-center justify-center transition-all hover:bg-[#333] hover:border-[#505050] active:scale-95"
        style={{
          left: isLeftPanelCollapsed ? '20px' : `${Math.max(20, leftPanelWidth - 60)}px`
        }}
      >
        <span className="text-xl font-light">
          {isLeftPanelCollapsed ? '›' : '‹'}
        </span>
      </button>
    </>
  );
}
