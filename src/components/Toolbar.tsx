interface ToolbarProps {
  onExportXML?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onExportPDF?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentScale: number;
  showZoom?: boolean;
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  leftPanelWidth: number;
}

export function Toolbar({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentScale,
  showZoom = true,
  isLeftPanelCollapsed,
  onToggleLeftPanel,
  leftPanelWidth
}: ToolbarProps) {
  return (
    <>
      {/* Bottom Right Controls (Undo/Redo + Zoom) */}
      <div className="fixed bottom-5 right-5 flex items-center gap-2 z-10">
        {/* Undo / Redo Group */}
        {(canUndo || canRedo || showZoom) && (
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
        )}

        {/* Zoom Controls */}
        {showZoom && (
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
        )}
      </div>

      {/* Smoothly Gliding Frosted Blur Bar (active when expanded) & Collapse Button */}
      <div
        style={{
          top: 0,
          left: isLeftPanelCollapsed ? '0px' : '98px',
          width: isLeftPanelCollapsed ? '54px' : `${leftPanelWidth - 98}px`,
          height: '54px',
          transition: 'left 350ms cubic-bezier(0.2, 0.8, 0.2, 1), width 350ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 350ms ease, box-shadow 350ms ease, backdrop-filter 350ms ease'
        }}
        className={`fixed z-30 flex items-center rounded-none border-none pointer-events-none overflow-hidden ${
          isLeftPanelCollapsed
            ? 'bg-transparent shadow-none backdrop-blur-none'
            : 'backdrop-blur-xl bg-[#0e0e13]/32 shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
        }`}
      >
        <button
          type="button"
          onClick={onToggleLeftPanel}
          aria-label={isLeftPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isLeftPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar (hide panel)'}
          style={{
            transform: isLeftPanelCollapsed ? 'translateX(6.5px)' : 'translateX(14px)',
            transition: 'transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 150ms ease, border-color 150ms ease, color 150ms ease'
          }}
          className="w-[41px] h-[32px] rounded-md bg-[#16161b]/80 hover:bg-[#262632] hover:text-white border border-[#272733]/80 hover:border-[#3b3b4a] text-[#8e8e9c] flex items-center justify-center shadow-sm active:scale-95 cursor-pointer select-none shrink-0 group pointer-events-auto"
        >
          <span className="material-symbols-outlined text-[17px] text-blue-400">
            {isLeftPanelCollapsed ? 'dock_to_right' : 'dock_to_left'}
          </span>
        </button>
      </div>
    </>
  );
}
