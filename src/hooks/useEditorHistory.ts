import { useState, useCallback, useRef } from 'react';
import { EditorSettings } from '../types';

export const DEFAULT_SETTINGS: EditorSettings = {
  splitMode: 'grid',
  autoPartsCount: 10,
  autoOrientation: 'balanced',
  rows: 3,
  columns: 3,
  verticalCount: 3,
  horizontalCount: 3,
  customVLines: [],
  customHLines: [],
  outerMargin: 0,
  horizontalGap: 0,
  verticalGap: 0,
  gapBehavior: 'spacing',
  panelOrder: 'row-by-row',
  outputFormat: 'png',
  quality: 100,
  contrast: 100,
  resolutionMode: '4k',
  enhanceTo8K: false,
  enhanceTo4K: true,
  sharpnessBoost: true,
  sharpnessLevel: 'ultra',
  clarityBoost: true,
  customScalePercent: 100,
  namingPrefix: 'panel',
  includeGridCoordsInName: false,
  fitMode: 'original',
};

export function useEditorHistory(initialSettings: EditorSettings = DEFAULT_SETTINGS) {
  const [settings, setSettingsState] = useState<EditorSettings>(initialSettings);
  const [past, setPast] = useState<EditorSettings[]>([]);
  const [future, setFuture] = useState<EditorSettings[]>([]);

  // Debounce ref to prevent dragging split lines from flooding history stack with 100 states
  const lastPushedStateRef = useRef<EditorSettings>(initialSettings);

  const updateSettings = useCallback((updater: Partial<EditorSettings> | ((prev: EditorSettings) => EditorSettings), recordHistory = true) => {
    setSettingsState((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      
      if (recordHistory) {
        // Only push if something genuinely changed
        const currentStr = JSON.stringify(current);
        const nextStr = JSON.stringify(next);
        if (currentStr !== nextStr) {
          setPast((prevPast) => [...prevPast.slice(-25), current]);
          setFuture([]);
          lastPushedStateRef.current = next;
        }
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);
      setSettingsState((current) => {
        setFuture((prevFuture) => [current, ...prevFuture]);
        return previous;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      setSettingsState((current) => {
        setPast((prevPast) => [...prevPast, current]);
        return next;
      });
      return newFuture;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState((current) => {
      setPast((prevPast) => [...prevPast, current]);
      setFuture([]);
      return { ...DEFAULT_SETTINGS };
    });
  }, []);

  return {
    settings,
    updateSettings,
    undo,
    redo,
    resetSettings,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
