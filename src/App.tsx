import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GridModel,
  Point,
  ModuleSizePreset,
  AnchorPoint,
  HistoryItem,
  AppStateSnapshot,
  GridPlacementOption,
  DragOptions,
  CanvasBackgroundStyle
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
import { QuickStartScreen } from './components/QuickStartScreen';
import { Toolbar } from './components/Toolbar';
import { RenameModal, NewGridModal, MergeGridsModal, ToastTooltip, ConfirmDeleteModal, ExportPdfModal } from './components/Modals';

const AUTOSAVE_STORAGE_KEY = 'ledflow_project_state_v1';
const PREFERENCES_STORAGE_KEY = 'ledflow_preferences_v1';

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
  const [altLineStyle, setAltLineStyle] = useState<boolean>(true);
  const [cableCurvature, setCableCurvature] = useState<number>(0.2);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [autoFocus, setAutoFocus] = useState<boolean>(true);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackgroundStyle>('transparent');
  const [backgroundColor, setBackgroundColor] = useState<string>('#151518');
  const [gridCellSize, setGridCellSize] = useState<number>(25);
  const [dotsSpacing, setDotsSpacing] = useState<number>(25);
  const [patternBrightness, setPatternBrightness] = useState<number>(29);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [canvasDragMode, setCanvasDragMode] = useState<boolean>(true);
  const [dragOptions, setDragOptions] = useState<DragOptions>({
    snapToGrids: true,
    snapToCanvas: true,
    snapToModuleStep: true
  });

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
  const latestGridsRef = useRef<Record<string, GridModel>>(grids);

  useEffect(() => {
    latestGridsRef.current = grids;
  }, [grids]);

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

  // Load preferences and autosave on initial mount
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        if (typeof parsed.altLineStyle === 'boolean') setAltLineStyle(parsed.altLineStyle);
        if (typeof parsed.cableCurvature === 'number') setCableCurvature(parsed.cableCurvature);
        if (typeof parsed.autoSave === 'boolean') setAutoSave(parsed.autoSave);
        if (typeof parsed.autoFocus === 'boolean') setAutoFocus(parsed.autoFocus);
        if (parsed.canvasBackground) setCanvasBackground(parsed.canvasBackground);
        if (typeof parsed.backgroundColor === 'string') setBackgroundColor(parsed.backgroundColor);
        if (typeof parsed.gridCellSize === 'number') setGridCellSize(parsed.gridCellSize);
        if (typeof parsed.dotsSpacing === 'number') setDotsSpacing(parsed.dotsSpacing);
        if (typeof parsed.patternBrightness === 'number') setPatternBrightness(parsed.patternBrightness);
        if (typeof parsed.showRulers === 'boolean') setShowRulers(parsed.showRulers);
        if (typeof parsed.canvasDragMode === 'boolean') setCanvasDragMode(parsed.canvasDragMode);
        if (parsed.dragOptions) setDragOptions(parsed.dragOptions);
      }

      const storedProject = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (storedProject) {
        const parsedProj = JSON.parse(storedProject);
        if (parsedProj && parsedProj.grids && Object.keys(parsedProj.grids).length > 0) {
          setGrids(parsedProj.grids);
          if (typeof parsedProj.gridCounter === 'number') setGridCounter(parsedProj.gridCounter);
          if (typeof parsedProj.outputWidth === 'number') setOutputWidth(parsedProj.outputWidth);
          if (typeof parsedProj.outputHeight === 'number') setOutputHeight(parsedProj.outputHeight);
          if (typeof parsedProj.fitToGrids === 'boolean') setFitToGrids(parsedProj.fitToGrids);
          if (parsedProj.activeTab && (parsedProj.activeTab === 'settings' || parsedProj.grids[parsedProj.activeTab])) {
            setActiveTab(parsedProj.activeTab);
          } else {
            const firstId = Object.keys(parsedProj.grids)[0];
            setActiveTab(firstId || 'settings');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load autosaved state:', e);
    }
  }, []);

  // Persist preferences and project to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          altLineStyle,
          cableCurvature,
          autoSave,
          autoFocus,
          canvasBackground,
          backgroundColor,
          gridCellSize,
          dotsSpacing,
          patternBrightness,
          showRulers,
          canvasDragMode,
          dragOptions
        })
      );

      if (autoSave) {
        localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          JSON.stringify({
            grids,
            gridCounter,
            outputWidth,
            outputHeight,
            fitToGrids,
            activeTab
          })
        );
      } else {
        localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [
    altLineStyle,
    cableCurvature,
    autoSave,
    autoFocus,
    canvasBackground,
    backgroundColor,
    gridCellSize,
    dotsSpacing,
    patternBrightness,
    showRulers,
    canvasDragMode,
    dragOptions,
    grids,
    gridCounter,
    outputWidth,
    outputHeight,
    fitToGrids,
    activeTab
  ]);

  // Reset to Defaults (Preferences & Canvas)
  const handleResetDefaults = () => {
    setConfirmDeleteState({
      isOpen: true,
      title: 'Reset to Defaults?',
      message: 'This will reset all preferences (Render engine, Cable curvature, Background style, Rulers, Snapping, Autofocus) to standard default settings.',
      onConfirm: () => {
        setAltLineStyle(true);
        setCableCurvature(0.2);
        setCanvasBackground('transparent');
        setBackgroundColor('#151518');
        setGridCellSize(25);
        setDotsSpacing(25);
        setPatternBrightness(29);
        setShowRulers(false);
        setAutoSave(false);
        setAutoFocus(true);
        setDragOptions({
          snapToGrids: true,
          snapToCanvas: true,
          snapToModuleStep: true
        });
        showToast('Preferences reset to defaults', 'success');
      }
    });
  };

  // Measure left panel width (only update when stably expanded to avoid layout jitter during CSS transitions)
  useEffect(() => {
    if (!panelRef.current) return;
    const updateWidth = () => {
      if (panelRef.current && !isLeftPanelCollapsed) {
        const width = panelRef.current.offsetWidth;
        if (width >= 400) {
          setLeftPanelWidth(width);
        }
      }
    };
    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [isLeftPanelCollapsed]);

  // Snapshot creation
  const createSnapshot = useCallback((
    actionName: string,
    gridsOverride?: Record<string, GridModel>,
    stateOverrides?: Partial<AppStateSnapshot>
  ): HistoryItem => {
    const targetGrids = gridsOverride || latestGridsRef.current;
    return {
      actionName,
      timestamp: Date.now(),
      state: {
        grids: JSON.parse(JSON.stringify(targetGrids)),
        activeTab: stateOverrides?.activeTab ?? activeTab,
        currentGridId: stateOverrides?.currentGridId ?? (activeTab !== 'settings' ? activeTab : 'LED_1'),
        gridCounter: stateOverrides?.gridCounter ?? gridCounter,
        currentScale: stateOverrides?.currentScale ?? currentScale,
        outputWidth: stateOverrides?.outputWidth ?? outputWidth,
        outputHeight: stateOverrides?.outputHeight ?? outputHeight,
        fitToGrids: stateOverrides?.fitToGrids ?? fitToGrids
      }
    };
  }, [activeTab, gridCounter, currentScale, outputWidth, outputHeight, fitToGrids]);

  // Add state to history
  const addToHistory = useCallback((
    actionName: string,
    targetGridId: string | null = null,
    gridsOverride?: Record<string, GridModel>,
    stateOverrides?: Partial<AppStateSnapshot>
  ) => {
    if (isRestoringHistoryRef.current) return;

    const currentGrids = gridsOverride || latestGridsRef.current;
    let finalActionName = actionName;
    const gridCount = Object.keys(currentGrids).length;
    if (targetGridId && gridCount > 1 && currentGrids[targetGridId]) {
      finalActionName = `[${currentGrids[targetGridId].name}] ${actionName}`;
    }

    const snapshot = createSnapshot(finalActionName, currentGrids, stateOverrides);

    setHistory((prev) => {
      const sliced = prev.slice(0, currentHistoryIndex + 1);
      sliced.push(snapshot);
      if (sliced.length > MAX_HISTORY_STEPS) {
        sliced.shift();
      }
      return sliced;
    });

    setCurrentHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_STEPS - 1));
  }, [createSnapshot, currentHistoryIndex]);

  // Restore snapshot
  const restoreSnapshot = useCallback((snapshot: AppStateSnapshot) => {
    isRestoringHistoryRef.current = true;
    const clonedGrids = JSON.parse(JSON.stringify(snapshot.grids));
    latestGridsRef.current = clonedGrids;
    setGrids(clonedGrids);
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
    if (currentHistoryIndex >= 0 && currentHistoryIndex < history.length - 1) {
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
    const current = latestGridsRef.current;
    if (!current[gridId]) return;
    const updated = updater(current[gridId]);
    const nextGrids = { ...current, [gridId]: updated };
    latestGridsRef.current = nextGrids;
    setGrids(nextGrids);

    if (actionDescription) {
      addToHistory(actionDescription, gridId, nextGrids);
    }
  }, [addToHistory]);

  // Camera animation & Viewport helpers
  const cameraAnimRef = useRef<number | null>(null);

  // Smooth camera animation interpolating scale and scroll position simultaneously
  const animateCameraTo = useCallback((targetCenterX: number, targetCenterY: number, targetScale: number, duration = 300) => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }

    const container = containerRef.current;
    if (!container) {
      setCurrentScale(targetScale);
      return;
    }

    const rulerSize = showRulers ? 28 : 0;
    const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
    const containerHeight = container.clientHeight || container.getBoundingClientRect().height;

    const startScale = currentScale;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;

    const targetScrollLeft = Math.max(0, (targetCenterX * targetScale + rulerSize) - containerWidth / 2);
    const targetScrollTop = Math.max(0, (targetCenterY * targetScale + rulerSize) - containerHeight / 2);

    if (
      Math.abs(startScale - targetScale) < 0.002 &&
      Math.abs(startScrollLeft - targetScrollLeft) < 2 &&
      Math.abs(startScrollTop - targetScrollTop) < 2
    ) {
      setCurrentScale(targetScale);
      container.scrollLeft = targetScrollLeft;
      container.scrollTop = targetScrollTop;
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      const s = startScale + (targetScale - startScale) * ease;
      const x = startScrollLeft + (targetScrollLeft - startScrollLeft) * ease;
      const y = startScrollTop + (targetScrollTop - startScrollTop) * ease;

      setCurrentScale(s);
      container.scrollLeft = x;
      container.scrollTop = y;

      if (progress < 1) {
        cameraAnimRef.current = requestAnimationFrame(step);
      } else {
        cameraAnimRef.current = null;
        setCurrentScale(targetScale);
        container.scrollLeft = targetScrollLeft;
        container.scrollTop = targetScrollTop;
      }
    };

    cameraAnimRef.current = requestAnimationFrame(step);
  }, [currentScale, showRulers]);

  const executeCenterScroll = useCallback((centerX: number, centerY: number, scale: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      animateCameraTo(centerX, centerY, scale, 300);
    } else {
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      setCurrentScale(scale);
      const rulerSize = showRulers ? 28 : 0;
      const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
      const containerHeight = container.clientHeight || container.getBoundingClientRect().height;
      container.scrollLeft = Math.max(0, (centerX * scale + rulerSize) - containerWidth / 2);
      container.scrollTop = Math.max(0, (centerY * scale + rulerSize) - containerHeight / 2);
    }
  }, [showRulers, animateCameraTo]);

  // Fit whole canvas to screen
  const handleFitToScreen = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
    const containerHeight = container.clientHeight || container.getBoundingClientRect().height;
    const availableWidth = Math.max(50, containerWidth - 40);
    const availableHeight = Math.max(50, containerHeight - 40);
    const scaleX = availableWidth / outputWidth;
    const scaleY = availableHeight / outputHeight;
    const fitScale = Math.max(0.1, Math.min(scaleX, scaleY, 2.5));

    const centerX = outputWidth / 2;
    const centerY = outputHeight / 2;

    if (smooth) {
      animateCameraTo(centerX, centerY, fitScale, 320);
    } else {
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      setCurrentScale(fitScale);
      const rulerSize = showRulers ? 28 : 0;
      container.scrollLeft = Math.max(0, (centerX * fitScale + rulerSize) - containerWidth / 2);
      container.scrollTop = Math.max(0, (centerY * fitScale + rulerSize) - containerHeight / 2);
    }
  }, [outputWidth, outputHeight, showRulers, animateCameraTo]);

  // Focus on specific grid
  const handleFocusOnGrid = useCallback((gridId: string, smooth = true) => {
    const grid = grids[gridId];
    const container = containerRef.current;
    if (!grid || !container) return;

    if (!grid.visible) {
      handleUpdateGrid(gridId, (prev) => ({ ...prev, visible: true }));
    }

    if (activeTab !== gridId) {
      setActiveTab(gridId);
    }
    setHighlightedGridId(gridId);

    const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
    const containerHeight = container.clientHeight || container.getBoundingClientRect().height;

    // Compute exact physical bounding box including custom modules & sub-grids
    let minX = grid.offsetX;
    let minY = grid.offsetY;
    let maxX = grid.offsetX + grid.cols * (grid.moduleWidth || 100);
    let maxY = grid.offsetY + grid.rows * (grid.moduleHeight || 100);

    if (grid.customModules && grid.customModules.length > 0) {
      grid.customModules.forEach((cm) => {
        const geom = getModuleGeometry(grid, cm.row, cm.col);
        minX = Math.min(minX, grid.offsetX + geom.x);
        minY = Math.min(minY, grid.offsetX + geom.y);
        maxX = Math.max(maxX, grid.offsetX + geom.x + geom.width);
        maxY = Math.max(maxY, grid.offsetY + geom.y + geom.height);
      });
    }

    const gridWidth = Math.max(1, maxX - minX);
    const gridHeight = Math.max(1, maxY - minY);
    const gridCenterX = (minX + maxX) / 2;
    const gridCenterY = (minY + maxY) / 2;

    const availableWidth = Math.max(50, containerWidth - 80);
    const availableHeight = Math.max(50, containerHeight - 80);

    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;
    const fitScale = Math.max(0.1, Math.min(scaleX, scaleY, 2.5));

    if (smooth) {
      animateCameraTo(gridCenterX, gridCenterY, fitScale, 320);
    } else {
      if (cameraAnimRef.current) {
        cancelAnimationFrame(cameraAnimRef.current);
        cameraAnimRef.current = null;
      }
      setCurrentScale(fitScale);
      const rulerSize = showRulers ? 28 : 0;
      container.scrollLeft = Math.max(0, (gridCenterX * fitScale + rulerSize) - containerWidth / 2);
      container.scrollTop = Math.max(0, (gridCenterY * fitScale + rulerSize) - containerHeight / 2);
    }
  }, [grids, activeTab, handleUpdateGrid, showRulers, animateCameraTo]);

  // Switch Active Tab with optional autofocus
  const handleSwitchTab = useCallback((tab: string) => {
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
      if (autoFocus) {
        handleFocusOnGrid(tab, true);
      }
    } else {
      setHighlightedGridId(null);
      if (autoFocus) {
        handleFitToScreen(true);
      }
    }
  }, [activeTab, grids, handleUpdateGrid, autoFocus, handleFocusOnGrid, handleFitToScreen]);

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
      dataLineNamingMode: '1.1-1.9',
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

    const nextGrids = { ...grids, [newGridId]: newGrid };
    latestGridsRef.current = nextGrids;
    setGrids(nextGrids);
    setGridCounter(nextCounter);
    setHighlightedGridId(newGridId);
    setNewGridModalOpen(false);

    addToHistory(`Created grid "${newGrid.name}"`, newGridId, nextGrids, {
      gridCounter: nextCounter,
      activeTab: newGridId,
      currentGridId: newGridId
    });
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

      latestGridsRef.current = result.newGridsMap;
      setGrids(result.newGridsMap);
      setGridCounter((prev) => prev + 1);
      setActiveTab(result.mergedGridId);
      setHighlightedGridId(result.mergedGridId);
      setMergeModalOpen(false);

      showToast(`Merged ${selectedGridIds.length} screens into "${mergedName}"!`, 'success');
      addToHistory(
        `Merged screens [${selectedGridIds.map((id) => grids[id]?.name || id).join(', ')}] into "${mergedName}"`,
        result.mergedGridId,
        result.newGridsMap,
        {
          activeTab: result.mergedGridId,
          currentGridId: result.mergedGridId
        }
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

          latestGridsRef.current = result.newGridsMap;
          setGrids(result.newGridsMap);
          const firstRestored = result.restoredGridIds[0] || 'settings';
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
          addToHistory(
            `Unmerged screen "${grid.name}" back into separate screens`,
            null,
            result.newGridsMap,
            {
              activeTab: firstRestored,
              currentGridId: firstRestored
            }
          );
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

        latestGridsRef.current = remainingGrids;
        setGrids(remainingGrids);

        const remainingKeys = Object.keys(remainingGrids);
        let nextActive = 'settings';
        if (remainingKeys.length === 0) {
          setActiveTab('settings');
          setHighlightedGridId(null);
        } else {
          nextActive = remainingKeys[0];
          setActiveTab(nextActive);
          setHighlightedGridId(nextActive);
        }

        addToHistory(`Deleted grid "${gridName}"`, null, remainingGrids, {
          activeTab: nextActive,
          currentGridId: nextActive
        });
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
        latestGridsRef.current = {};
        setGrids({});
        setGridCounter(0);
        setActiveTab('settings');
        setHighlightedGridId(null);
        setOutputWidth(1920);
        setOutputHeight(1080);
        setHistory([]);
        setCurrentHistoryIndex(-1);
        showToast('All grids reset', 'success');
      }
    });
  };

  // Auto-fit canvas to screen when canvas dimensions or grid count changes on canvas tab with autofocus enabled
  const prevCanvasDimsRef = useRef<{ w: number; h: number; gridCount: number }>({
    w: outputWidth,
    h: outputHeight,
    gridCount: Object.keys(grids).length
  });

  useEffect(() => {
    const currentGridCount = Object.keys(grids).length;
    const dimsChanged =
      prevCanvasDimsRef.current.w !== outputWidth ||
      prevCanvasDimsRef.current.h !== outputHeight ||
      prevCanvasDimsRef.current.gridCount !== currentGridCount;

    prevCanvasDimsRef.current = {
      w: outputWidth,
      h: outputHeight,
      gridCount: currentGridCount
    };

    if (dimsChanged && activeTab === 'settings' && autoFocus) {
      const timer = setTimeout(() => {
        handleFitToScreen(true);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [outputWidth, outputHeight, grids, activeTab, autoFocus, handleFitToScreen]);

  // Toggle grid visibility
  const handleToggleGridVisibility = (gridId: string) => {
    handleUpdateGrid(gridId, (prev) => ({ ...prev, visible: !prev.visible }));
  };

  // Zoom helpers
  const handleZoomIn = () => {
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
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
    if (cameraAnimRef.current) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }
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

  // Process imported project file (XML)
  const processImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseXmlProject(text);

        latestGridsRef.current = parsed.grids;
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
        addToHistory('Imported XML Project', null, parsed.grids, {
          outputWidth: parsed.outputWidth,
          outputHeight: parsed.outputHeight,
          gridCounter: keys.length,
          activeTab: keys[0] || 'settings',
          currentGridId: keys[0] || 'settings'
        });
      } catch (err: any) {
        showToast(`Error loading XML: ${err?.message || 'Invalid format'}`, 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast, addToHistory]);

  // Import XML handler
  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
    e.target.value = '';
  };

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (!isInput && (e.key.toLowerCase() === 'g' || e.key === '+') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setNewGridModalOpen(true);
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
        onExportXML={() => exportToXML(grids, outputWidth, outputHeight)}
        onExportPNG={() => {
          if (canvasRef.current) {
            exportToPNG(canvasRef.current, outputWidth, outputHeight);
          }
        }}
        onExportSVG={() => exportToSVG(grids, outputWidth, outputHeight, altLineStyle)}
        onExportPDF={() => setPdfModalOpen(true)}
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
        cableCurvature={cableCurvature}
        onCableCurvatureChange={setCableCurvature}
        autoSave={autoSave}
        onAutoSaveChange={setAutoSave}
        autoFocus={autoFocus}
        onAutoFocusChange={setAutoFocus}
        canvasBackground={canvasBackground}
        onCanvasBackgroundChange={setCanvasBackground}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        gridCellSize={gridCellSize}
        onGridCellSizeChange={setGridCellSize}
        dotsSpacing={dotsSpacing}
        onDotsSpacingChange={setDotsSpacing}
        patternBrightness={patternBrightness}
        onPatternBrightnessChange={setPatternBrightness}
        showRulers={showRulers}
        onShowRulersChange={setShowRulers}
        canvasDragMode={canvasDragMode}
        onCanvasDragModeChange={setCanvasDragMode}
        onUpdateGrid={handleUpdateGrid}
        onUnmergeGrid={handleUnmergeGrid}
        isCollapsed={isLeftPanelCollapsed}
        onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
        history={history}
        currentHistoryIndex={currentHistoryIndex}
        onJumpToHistory={handleJumpToHistory}
        panelRef={panelRef}
        dragOptions={dragOptions}
        onDragOptionsChange={setDragOptions}
      />

      {/* Main Canvas Area */}
      <div className={`flex flex-col flex-1 h-full relative min-w-0 min-h-0 overflow-hidden ${isLeftPanelCollapsed ? 'ml-0' : 'ml-0'}`}>
        {Object.keys(grids).length > 0 ? (
          <CanvasStage
            grids={grids}
            activeTab={activeTab}
            outputWidth={outputWidth}
            outputHeight={outputHeight}
            currentScale={currentScale}
            highlightedGridId={highlightedGridId}
            altLineStyle={altLineStyle}
            cableCurvature={cableCurvature}
            canvasBackground={canvasBackground}
            backgroundColor={backgroundColor}
            gridCellSize={gridCellSize}
            dotsSpacing={dotsSpacing}
            patternBrightness={patternBrightness}
            showRulers={showRulers}
            canvasDragMode={canvasDragMode}
            dragOptions={dragOptions}
            onSelectGrid={handleSwitchTab}
            onUpdateGrid={handleUpdateGrid}
            onShowTooltip={showToast}
            containerRef={containerRef}
            canvasRef={canvasRef}
          />
        ) : (
          <QuickStartScreen
            onOpenNewGridModal={() => setNewGridModalOpen(true)}
            onImportXML={handleImportXML}
            onImportFile={processImportFile}
          />
        )}
      </div>

      {/* Overlays & Toolbars */}
      <Toolbar
        onExportXML={() => exportToXML(grids, outputWidth, outputHeight)}
        onExportPNG={() => {
          if (canvasRef.current) {
            exportToPNG(canvasRef.current, outputWidth, outputHeight);
          }
        }}
        onExportSVG={() =>
          exportToSVG(grids, outputWidth, outputHeight, altLineStyle, {
            canvasBackground,
            backgroundColor,
            gridCellSize,
            dotsSpacing,
            patternBrightness
          })
        }
        onExportPDF={() => setPdfModalOpen(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={currentHistoryIndex > 0}
        canRedo={currentHistoryIndex < history.length - 1}
        currentScale={currentScale}
        showZoom={Object.keys(grids).length > 0}
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
            altLineStyle,
            canvasBackground,
            backgroundColor,
            gridCellSize,
            dotsSpacing,
            patternBrightness
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
