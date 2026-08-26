import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { EditorWorkspace } from './components/EditorWorkspace';
import { ProcessingModal } from './components/ProcessingModal';
import { LargeImageModal } from './components/LargeImageModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ToastContainer } from './components/ToastContainer';
import { useImageLoader } from './hooks/useImageLoader';
import { useEditorHistory, DEFAULT_SETTINGS } from './hooks/useEditorHistory';
import { useToast } from './hooks/useToast';
import { ProcessingProgress } from './types';

export default function App() {
  // Theme management with localStorage persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('precision_split_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Keep dark class synced on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('precision_split_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Toast system
  const { toasts, addToast, removeToast } = useToast();

  // Modal states
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    active: false,
    current: 0,
    total: 0,
    percentage: 0,
    stage: '',
    cancellable: true,
  });

  // Image loading hook
  const {
    image,
    isLoading,
    error,
    isLargeImageWarning,
    pendingDimensions,
    loadImageFromFile,
    loadImageFromUrl,
    acceptLargeImage,
    resizeAndAcceptLargeImage,
    clearImage,
    setError,
  } = useImageLoader((loaded) => {
    addToast('Image Loaded', `${loaded.name} (${loaded.width} × ${loaded.height} px)`, 'success');
  });

  // Show error toast if any occurs during upload
  useEffect(() => {
    if (error) {
      addToast('Upload Failed', error, 'error');
    }
  }, [error, addToast]);

  // Editor settings & history
  const {
    settings,
    updateSettings,
    undo,
    redo,
    resetSettings,
    canUndo,
    canRedo,
  } = useEditorHistory(DEFAULT_SETTINGS);

  // Global Clipboard paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          loadImageFromFile(file);
          addToast('Pasted Image', file.name || 'Clipboard image', 'info');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImageFromFile, addToast]);

  // Hidden file input for header "New Image" trigger or keyboard shortcuts
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = () => {
    hiddenFileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadImageFromFile(e.target.files[0]);
    }
  };

  const handlePasteRequested = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted_image.png', { type: imageType });
            loadImageFromFile(file);
            addToast('Pasted from Clipboard', 'Image loaded successfully.', 'success');
            return;
          }
        }
        addToast('No Image Found', 'No image data detected in your clipboard.', 'warning');
      } else {
        addToast('Use Shortcut', 'Press Ctrl+V / Cmd+V to paste your image.', 'info');
      }
    } catch (e) {
      addToast('Paste Shortcut', 'Press Ctrl+V or Cmd+V anywhere to paste.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Hidden file input for programmatically opening file picker */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/jpg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Header */}
      <AppHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        hasImage={!!image}
        onNewImage={handleTriggerUpload}
        hasPanels={false}
        onGoHome={clearImage}
      />

      {/* Main Content View */}
      <main className="flex-1 flex flex-col">
        {!image ? (
          <LandingPage
            onImageSelected={loadImageFromFile}
            onSampleSelected={loadImageFromUrl}
            onPasteRequested={handlePasteRequested}
          />
        ) : (
          <EditorWorkspace
            image={image}
            settings={settings}
            canUndo={canUndo}
            canRedo={canRedo}
            onUpdateSettings={updateSettings}
            onUndo={undo}
            onRedo={redo}
            onReset={() => {
              resetSettings();
              addToast('Reset', 'Settings restored to defaults.', 'info');
            }}
            onReplaceImage={handleTriggerUpload}
            onRemoveImage={clearImage}
            onToast={addToast}
            progress={progress}
            setProgress={setProgress}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <ProcessingModal
        progress={progress}
        onCancel={() => {
          setProgress((prev) => ({ ...prev, active: false }));
        }}
      />

      <LargeImageModal
        isOpen={isLargeImageWarning}
        dimensions={pendingDimensions}
        onAcceptFull={acceptLargeImage}
        onResizeSafe={() => resizeAndAcceptLargeImage(4096)}
        onCancel={() => {
          clearImage();
          setError(null);
        }}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
