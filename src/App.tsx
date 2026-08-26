import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GridModel,
  Point,
  ModuleSizePreset,
  AnchorPoint,
  HistoryItem,
  AppStateSnapshot,
  GridPlacementOption
} from './types';
import {
  COLOR_COMBINATIONS,
  SCALES,
  MAX_HISTORY_STEPS,
  MODULE_BATCH_TIMEOUT,
  DEFAULT_ID_FONT,
  APP_VERSION,
  APP_AUTHOR
} from './constants';
import {
  calculateGridsBounds,
  getModuleGeometry
} from './utils/geometry';
import {
  exportToXML,
  exportToPNG,
  exportToSVG,
  exportToPDF,
  parseXmlProject
} from './utils/exportImport';
import { mergeGrids, unmergeGrids } from './utils/mergeGrids';
import { LeftPanel } from './components/LeftPanel';
import { CanvasStage } from './components/CanvasStage';
import { Toolbar } from './components/Toolbar';
import { RenameModal, NewGridModal, MergeGridsModal, ToastTooltip, ConfirmDeleteModal, ExportPdfModal } from './components/Modals';

export default function App() {
  // State: Grids collection
  const [grids, setGrids] = useState<Record<string, GridModel>>({});
  const [activeTab, setActiveTab] = useState<string>('settings');
  const [gridCounter, setGridCounter] = useState<number>(0);

  // State: Canvas Output & View
  const [outputWidth, setOutputWidth] = useState<number>(1920);
  const [outputHeight, setOutputHeight] = useState<number>(1080);
  const [fitToGrids, setFitToGrids] = useState<boolean>(true);
  const [currentScale, setCurrentScale] = useState<number>(0.6);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [altLineStyle, setAltLineStyle] = useState<boolean>(true);

  // UI state
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [highlightedGridId, setHighlightedGridId] = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(420);

  // Modals state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newGridModalOpen, setNewGridModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Toast tooltip
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const isRestoringHistoryRef = useRef(false);

  // Module batching for history
  const visibilityBatchRef = useRef<{
    gridId: string;
    hiddenCount: number;
    shownCount: number;
    operations: { action: 'hidden' | 'shown'; count: number }[];
    timer: any;
  } | null>(null);

  // Refs for DOM
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Dynamic document title
  useEffect(() => {
    document.title = `LedFlow v${APP_VERSION}`;
  }, []);

  // Measure left panel width
  useEffect(() => {
    if (panelRef.current && !isLeftPanelCollapsed) {
      setLeftPanelWidth(panelRef.current.offsetWidth || 420);
    }
  }, [isLeftPanelCollapsed]);

  // Snapshot creation
  const createSnapshot = useCallback((actionName: string): HistoryItem => {
    return {
      actionName,
      timestamp: Date.now(),
      state: {
        grids: JSON.parse(JSON.stringify(grids)),
        activeTab,
        currentGridId: activeTab !== 'settings' ? activeTab : 'LED_1',
        gridCounter,
        currentScale,
        outputWidth,
        outputHeight,
        fitToGrids
      }
    };
  }, [grids, activeTab, gridCounter, currentScale, outputWidth, outputHeight, fitToGrids]);

  // Add state to history
  const addToHistory = useCallback((actionName: string, targetGridId: string | null = null) => {
    if (isRestoringHistoryRef.current) return;

    let finalActionName = actionName;
    const gridCount = Object.keys(grids).length;
    if (targetGridId && gridCount > 1 && grids[targetGridId]) {
      finalActionName = `[${grids[targetGridId].name}] ${actionName}`;
    }

    const snapshot = createSnapshot(finalActionName);

    setHistory((prev) => {
      const sliced = prev.slice(0, currentHistoryIndex + 1);
      sliced.push(snapshot);
      if (sliced.length > MAX_HISTORY_STEPS) {
        sliced.shift();
      }
      return sliced;
    });

    setCurrentHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_STEPS - 1));
  }, [createSnapshot, currentHistoryIndex, grids]);

  // Restore snapshot
  const restoreSnapshot = useCallback((snapshot: AppStateSnapshot) => {
    isRestoringHistoryRef.current = true;
    setGrids(JSON.parse(JSON.stringify(snapshot.grids)));
    setGridCounter(snapshot.gridCounter);
    setCurrentScale(snapshot.currentScale);
    setOutputWidth(snapshot.outputWidth);
    setOutputHeight(snapshot.outputHeight);
    setFitToGrids(snapshot.fitToGrids);

    if (snapshot.activeTab === 'settings' || snapshot.grids[snapshot.activeTab]) {
      setActiveTab(snapshot.activeTab);
    } else {
      const firstId = Object.keys(snapshot.grids)[0];
      setActiveTab(firstId || 'settings');
    }

    setTimeout(() => {
      isRestoringHistoryRef.current = false;
    }, 50);
  }, []);

  const handleUndo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const targetIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(targetIndex);
      restoreSnapshot(history[targetIndex].state);
    }
  }, [currentHistoryIndex, history, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      const targetIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(targetIndex);
      restoreSnapshot(history[targetIndex].state);
    }
  }, [currentHistoryIndex, history, restoreSnapshot]);

  const handleJumpToHistory = (index: number) => {
    if (index >= 0 && index < history.length) {
      setCurrentHistoryIndex(index);
      restoreSnapshot(history[index].state);
    }
  };

  // Recalculate auto-fit when grids or fitToGrids change
  useEffect(() => {
    if (fitToGrids) {
      const bounds = calculateGridsBounds(grids);
      const w = Math.max(1, Math.ceil(bounds.maxX));
      const h = Math.max(1, Math.ceil(bounds.maxY));
      setOutputWidth(w);
      setOutputHeight(h);
    }
  }, [grids, fitToGrids]);

  // Helper to update grid with optional history log
  const handleUpdateGrid = useCallback((
    gridId: string,
    updater: (prev: GridModel) => GridModel,
    actionDescription?: string
  ) => {
    setGrids((prev) => {
      if (!prev[gridId]) return prev;
      const updated = updater(prev[gridId]);
      return { ...prev, [gridId]: updated };
    });

    if (actionDescription) {
      addToHistory(actionDescription, gridId);
    }
  }, [addToHistory]);

  // Switch Active Tab
  const handleSwitchTab = (tab: string) => {
    let currentActiveMode: GridModel['mode'] | null = null;

    if (activeTab !== 'settings' && grids[activeTab]) {
      currentActiveMode = grids[activeTab].mode;
      const cur = grids[activeTab];
      if (cur.currentConnection.length > 0) {
        handleUpdateGrid(activeTab, (prev) => {
          const newRemoved = [...prev.removedIndices];
          if (prev.currentColorIndex !== null) newRemoved.push(prev.currentColorIndex);
          return {
            ...prev,
            currentConnection: [],
            currentColor: null,
            currentColorIndex: null,
            removedIndices: newRemoved
          };
        });
      }
    } else {
      const anyGrid = (Object.values(grids) as GridModel[])[0];
      if (anyGrid) currentActiveMode = anyGrid.mode;
    }

    if (tab !== 'settings' && currentActiveMode && grids[tab]) {
      handleUpdateGrid(tab, (prev) => ({
        ...prev,
        mode: currentActiveMode!
      }));
    }

    setActiveTab(tab);
    if (tab !== 'settings') {
      setHighlightedGridId(tab);
    } else {
      setHighlightedGridId(null);
    }
  };

  // Create new grid
  const handleCreateNewGrid = (
    cols: number,
    rows: number,
    name: string,
    moduleSize: ModuleSizePreset = 'square',
    moduleWidth = 100,
    moduleHeight = 100,
    placement: GridPlacementOption = 'right'
  ) => {
    const nextCounter = gridCounter + 1;
    const newGridId = `LED_${nextCounter}`;
    const colorCombo = COLOR_COMBINATIONS[(nextCounter - 1) % COLOR_COMBINATIONS.length];
    const currentActiveMode = (activeTab !== 'settings' && grids[activeTab]?.mode)
      ? grids[activeTab].mode
      : ((Object.values(grids) as GridModel[])[0]?.mode || 'data-lines');

    let newOffsetX = 0;
    let newOffsetY = 0;
    const existingGrids: GridModel[] = Object.values(grids);
    if (existingGrids.length > 0) {
      if (placement === 'bottom') {
        let maxBottomY = 0;
        existingGrids.forEach((g: GridModel) => {
          let bottomY = g.offsetY + g.rows * g.moduleHeight;
          if (g.customModules && g.customModules.length > 0) {
            g.customModules.forEach((cm) => {
              const geom = getModuleGeometry(g, cm.row, cm.col);
              bottomY = Math.max(bottomY, g.offsetY + geom.y + geom.height);
            });
          }
          if (bottomY > maxBottomY) maxBottomY = bottomY;
        });
        newOffsetX = 0;
        newOffsetY = maxBottomY;
      } else {
        // 'right' (default)
        let maxRightX = 0;
        existingGrids.forEach((g: GridModel) => {
          let rightX = g.offsetX + g.cols * g.moduleWidth;
          if (g.customModules && g.customModules.length > 0) {
            g.customModules.forEach((cm) => {
              const geom = getModuleGeometry(g, cm.row, cm.col);
              rightX = Math.max(rightX, g.offsetX + geom.x + geom.width);
            });
          }
          if (rightX > maxRightX) maxRightX = rightX;
        });
        newOffsetX = maxRightX;
        newOffsetY = 0;
      }
    }

    const newGrid: GridModel = {
      name: name || `LED_${nextCounter}`,
      cols,
      rows,
      moduleSize,
      moduleWidth,
      moduleHeight,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      moduleColor: colorCombo.fill,
      moduleLabelColor: colorCombo.label,
      moduleLabelSizePercent: 20,
      dataLineFontSizePercent: 35,
      dataLineFont: 'Merriweather, serif',
      hatchDensity: 10,
      connectionFont: 'Merriweather, serif',
      connectionFontSize: 21,
      useDefaultNames: true,
      dataLineNamingMode: 'p.1-p.9',
      dataLinePrefix: '1',
      idType: 'row.col',
      idFont: DEFAULT_ID_FONT,
      visible: true,
      showAllLines: false,
      showAllGroups: false,
      dataLinesPage: 0,
      powerLinesPage: 0,
      hoveredLineIndex: null,
      hoveredGroupIndex: null,
      mode: currentActiveMode,
      toolAction: 'draw',
      batchSelection: { firstModule: null, isActive: false },
      customModules: [],
      overlappedModules: [],
      hideOverlapped: true,
      showingModules: [],
      hidingModules: [],
      gridState: Array(rows).fill(null).map(() => Array(cols).fill(true)),
      connections: [],
      selectedGroups: [],
      lineCounter: 1,
      groupCounter: 1,
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

    setGrids((prev) => ({ ...prev, [newGridId]: newGrid }));
    setGridCounter(nextCounter);
    setActiveTab(newGridId);
    setHighlightedGridId(newGridId);
    setNewGridModalOpen(false);

    addToHistory(`Created grid "${newGrid.name}"`);
  };

  // Merge grids into a single unified canvas
  const handleMergeGrids = (
    selectedGridIds: string[],
    mergedName: string,
    keepOriginals: boolean,
    customOffsets?: Record<string, { offsetX: number; offsetY: number }>
  ) => {
    try {
      const result = mergeGrids({
        gridIdsToMerge: selectedGridIds,
        allGrids: grids,
        mergedName,
        keepOriginals,
        customOffsets
      });

      setGrids(result.newGridsMap);
      setGridCounter((prev) => prev + 1);
      setActiveTab(result.mergedGridId);
      setHighlightedGridId(result.mergedGridId);
      setMergeModalOpen(false);

      showToast(`Merged ${selectedGridIds.length} screens into "${mergedName}"!`, 'success');
      addToHistory(
        `Merged screens [${selectedGridIds.map((id) => grids[id]?.name || id).join(', ')}] into "${mergedName}"`
      );
    } catch (err: any) {
      showToast(`Error merging screens: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  // Unmerge unified grid back into individual constituent grids
  const handleUnmergeGrid = (gridId: string) => {
    const grid = grids[gridId];
    if (!grid || !grid.mergedSubGrids || grid.mergedSubGrids.length === 0) return;

    setConfirmDeleteState({
      isOpen: true,
      title: `Unmerge Grid "${grid.name}"?`,
      message: `Are you sure you want to unmerge "${grid.name}" back into ${grid.mergedSubGrids.length} separate grids?\n\nNote: Any data and power lines that cross between different sections will be automatically removed.`,
      onConfirm: () => {
        try {
          const result = unmergeGrids({
            mergedGridId: gridId,
            allGrids: grids
          });

          setGrids(result.newGridsMap);
          if (result.restoredGridIds.length > 0) {
            setActiveTab(result.restoredGridIds[0]);
            setHighlightedGridId(result.restoredGridIds[0]);
          } else {
            setActiveTab('settings');
            setHighlightedGridId(null);
          }

          let toastMsg = `Unmerged into ${result.restoredGridIds.length} screens!`;
          if (result.removedCrossLineCount > 0 || result.removedCrossPowerGroupCount > 0) {
            const parts = [];
            if (result.removedCrossLineCount > 0) parts.push(`${result.removedCrossLineCount} cross data line${result.removedCrossLineCount > 1 ? 's' : ''}`);
            if (result.removedCrossPowerGroupCount > 0) parts.push(`${result.removedCrossPowerGroupCount} cross power line${result.removedCrossPowerGroupCount > 1 ? 's' : ''}`);
            toastMsg += ` (${parts.join(', ')} removed)`;
          }
          showToast(toastMsg, 'success');
          addToHistory(`Unmerged screen "${grid.name}" back into separate screens`);
        } catch (err: any) {
          showToast(`Error unmerging screen: ${err?.message || 'Unknown error'}`, 'error');
        }
      }
    });
  };

  // Delete grid
  const handleDeleteGrid = (gridId: string) => {
    const grid = grids[gridId];
    if (!grid) return;

    setConfirmDeleteState({
      isOpen: true,
      title: `Delete Grid "${grid.name}"?`,
      message: `Are you sure you want to delete "${grid.name}"? All associated data lines and power groups for this grid will be permanently removed.`,
      onConfirm: () => {
        const gridName = grid.name;
        const remainingGrids = { ...grids };
        delete remainingGrids[gridId];

        setGrids(remainingGrids);

        const remainingKeys = Object.keys(remainingGrids);
        if (remainingKeys.length === 0) {
          setActiveTab('settings');
          setHighlightedGridId(null);
        } else {
          const nextActive = remainingKeys[0];
          setActiveTab(nextActive);
          setHighlightedGridId(nextActive);
        }

        addToHistory(`Deleted grid "${gridName}"`);
        showToast(`Grid "${gridName}" deleted`, 'success');
      }
    });
  };

  // Reset all grids
  const handleResetAllGrids = () => {
    setConfirmDeleteState({
      isOpen: true,
      title: 'Reset All Grids?',
      message: 'This will delete all grids, data lines, and power groups from the canvas. This action cannot be undone.',
      onConfirm: () => {
        setGrids({});
        setGridCounter(0);
        setActiveTab('settings');
        setHighlightedGridId(null);
        setOutputWidth(1920);
        setOutputHeight(1080);
        addToHistory('Reset all grids');
        showToast('All grids reset', 'success');
      }
    });
  };

  // Toggle grid visibility
  const handleToggleGridVisibility = (gridId: string) => {
    handleUpdateGrid(gridId, (prev) => ({ ...prev, visible: !prev.visible }));
  };

  // Focus on specific grid
  const handleFocusOnGrid = (gridId: string) => {
    const grid = grids[gridId];
    if (!grid || !containerRef.current) return;

    const gridWidth = grid.cols * grid.moduleWidth;
    const gridHeight = grid.rows * grid.moduleHeight;
    const containerRect = containerRef.current.getBoundingClientRect();

    const availableWidth = containerRect.width - 80;
    const availableHeight = containerRect.height - 80;

    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;
    const fitScale = Math.min(scaleX, scaleY);

    setCurrentScale(fitScale);

    const gridCenterX = grid.offsetX + gridWidth / 2;
    const gridCenterY = grid.offsetY + gridHeight / 2;
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;

    containerRef.current.scrollLeft = gridCenterX * fitScale - viewportCenterX;
    containerRef.current.scrollTop = gridCenterY * fitScale - viewportCenterY;
  };

  // Zoom helpers
  const handleZoomIn = () => {
    const minScale = SCALES[0];
    const maxScale = SCALES[SCALES.length - 1];

    setCurrentScale((prev) => {
      if (prev < minScale) return minScale;
      if (prev >= maxScale) return maxScale;
      const idx = SCALES.indexOf(prev);
      if (idx === -1) {
        return SCALES.find((s) => s > prev) || maxScale;
      }
      return SCALES[Math.min(idx + 1, SCALES.length - 1)];
    });
  };

  const handleZoomOut = () => {
    const minScale = SCALES[0];
    const maxScale = SCALES[SCALES.length - 1];

    setCurrentScale((prev) => {
      if (prev <= minScale) return minScale;
      if (prev > maxScale) return maxScale;
      const idx = SCALES.indexOf(prev);
      if (idx === -1) {
        const lower = [...SCALES].reverse().find((s) => s < prev);
        return lower || minScale;
      }
      return SCALES[Math.max(idx - 1, 0)];
    });
  };

  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const availableWidth = containerRect.width - 40;
    const availableHeight = containerRect.height - 40;
    const scaleX = availableWidth / outputWidth;
    const scaleY = availableHeight / outputHeight;
    const fitScale = Math.min(scaleX, scaleY);
    setCurrentScale(fitScale);
  };

  // Import XML handler
  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseXmlProject(text);

        setGrids(parsed.grids);
        setOutputWidth(parsed.outputWidth);
        setOutputHeight(parsed.outputHeight);

        const keys = Object.keys(parsed.grids);
        if (keys.length > 0) {
          setGridCounter(keys.length);
          setActiveTab(keys[0]);
          setHighlightedGridId(keys[0]);
        } else {
          setGridCounter(0);
          setActiveTab('settings');
          setHighlightedGridId(null);
        }

        showToast('Project loaded successfully!', 'success');
        addToHistory('Imported XML Project');
      } catch (err: any) {
        showToast(`Error loading XML: ${err?.message || 'Invalid format'}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Initial history snapshot on load
  useEffect(() => {
    if (history.length === 0) {
      const initSnap = createSnapshot('Initial state');
      setHistory([initSnap]);
      setCurrentHistoryIndex(0);
    }
  }, []);

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsLeftPanelCollapsed(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsLeftPanelCollapsed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden bg-[#1a1a1a] text-[#e0e0e0] font-sans select-none relative">
      {/* Left Sidebar Panel */}
      <LeftPanel
        grids={grids}
        activeTab={activeTab}
        onSwitchTab={handleSwitchTab}
        onOpenNewGridModal={() => setNewGridModalOpen(true)}
        onOpenRenameModal={() => setRenameModalOpen(true)}
        onOpenMergeModal={() => setMergeModalOpen(true)}
        onDeleteGrid={handleDeleteGrid}
        onToggleGridVisibility={handleToggleGridVisibility}
        onFocusOnGrid={handleFocusOnGrid}
        onResetAllGrids={handleResetAllGrids}
        onImportXML={handleImportXML}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={currentHistoryIndex > 0}
        canRedo={currentHistoryIndex < history.length - 1}
        outputWidth={outputWidth}
        outputHeight={outputHeight}
        fitToGrids={fitToGrids}
        onOutputSizeChange={(w, h) => {
          setOutputWidth(w);
          setOutputHeight(h);
          setFitToGrids(false);
        }}
        onFitToGridsChange={(fit) => {
          setFitToGrids(fit);
          if (fit) {
            const bounds = calculateGridsBounds(grids);
            setOutputWidth(Math.max(1, Math.ceil(bounds.maxX)));
            setOutputHeight(Math.max(1, Math.ceil(bounds.maxY)));
          }
        }}
        altLineStyle={altLineStyle}
        onAltLineStyleChange={setAltLineStyle}
        onUpdateGrid={handleUpdateGrid}
        onUnmergeGrid={handleUnmergeGrid}
        isCollapsed={isLeftPanelCollapsed}
        history={history}
        currentHistoryIndex={currentHistoryIndex}
        onJumpToHistory={handleJumpToHistory}
        panelRef={panelRef}
      />

      {/* Main Canvas Area */}
      <div className={`flex flex-col flex-1 h-full relative ${isLeftPanelCollapsed ? 'ml-0' : 'ml-0'}`}>
        <CanvasStage
          grids={grids}
          activeTab={activeTab}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          currentScale={currentScale}
          highlightedGridId={highlightedGridId}
          altLineStyle={altLineStyle}
          onSelectGrid={handleSwitchTab}
          onCursorMove={setCursorCoords}
          onUpdateGrid={handleUpdateGrid}
          onShowTooltip={showToast}
          containerRef={containerRef}
          canvasRef={canvasRef}
        />
      </div>

      {/* Overlays & Toolbars */}
      <Toolbar
        onExportXML={() => exportToXML(grids, outputWidth, outputHeight)}
        onExportPNG={() => {
          if (canvasRef.current) {
            exportToPNG(canvasRef.current, outputWidth, outputHeight);
          }
        }}
        onExportSVG={() => exportToSVG(grids, outputWidth, outputHeight, altLineStyle)}
        onExportPDF={() => setPdfModalOpen(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={currentHistoryIndex > 0}
        canRedo={currentHistoryIndex < history.length - 1}
        currentScale={currentScale}
        cursorCoords={cursorCoords}
        isLeftPanelCollapsed={isLeftPanelCollapsed}
        onToggleLeftPanel={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        leftPanelWidth={leftPanelWidth}
      />

      {/* Modals */}
      <ExportPdfModal
        isOpen={pdfModalOpen}
        outputWidth={outputWidth}
        outputHeight={outputHeight}
        grids={grids}
        onClose={() => setPdfModalOpen(false)}
        onConfirm={async (options) => {
          await exportToPDF(grids, outputWidth, outputHeight, {
            ...options,
            altLineStyle
          });
          setPdfModalOpen(false);
          showToast('PDF exported successfully!', 'success');
        }}
      />

      <RenameModal
        isOpen={renameModalOpen}
        initialName={grids[activeTab]?.name || ''}
        onClose={() => setRenameModalOpen(false)}
        onConfirm={(newName) => {
          handleUpdateGrid(activeTab, (prev) => ({ ...prev, name: newName }), `Renamed grid to "${newName}"`);
          setRenameModalOpen(false);
        }}
      />

      <NewGridModal
        isOpen={newGridModalOpen}
        defaultName={`LED_${gridCounter + 1}`}
        onClose={() => setNewGridModalOpen(false)}
        onConfirm={handleCreateNewGrid}
      />

      <MergeGridsModal
        isOpen={mergeModalOpen}
        grids={grids}
        onClose={() => setMergeModalOpen(false)}
        onConfirm={handleMergeGrids}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteState.isOpen}
        title={confirmDeleteState.title}
        message={confirmDeleteState.message}
        onClose={() => setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteState.onConfirm}
      />

      <ToastTooltip message={toast?.message || null} type={toast?.type || 'error'} />
    </div>
  );
}
