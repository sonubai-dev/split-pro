import { useState, useCallback, useEffect, useMemo } from 'react';
import { LoadedImage } from '../types';
import { estimateMemoryUsageMB } from '../lib/imageEngine';

export interface UseImageLoaderReturn {
  images: LoadedImage[];
  activeImageIndex: number;
  image: LoadedImage | null;
  isLoading: boolean;
  error: string | null;
  isLargeImageWarning: boolean;
  pendingLargeFile: File | null;
  pendingLargeUrl: string | null;
  pendingDimensions: { width: number; height: number; memoryMB: number } | null;
  loadImageFromFile: (file: File) => Promise<void>;
  loadImagesFromFiles: (files: File[] | FileList, append?: boolean) => Promise<void>;
  loadImageFromUrl: (url: string, name: string) => Promise<void>;
  acceptLargeImage: () => Promise<void>;
  resizeAndAcceptLargeImage: (maxDimension?: number) => Promise<void>;
  setActiveImageIndex: (index: number) => void;
  removeImageAtIndex: (index: number) => void;
  clearImage: () => void;
  clearAllImages: () => void;
  setError: (err: string | null) => void;
}

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif'];
const VALID_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function isValidImageFile(file: File): boolean {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  return VALID_TYPES.includes(file.type) || VALID_EXTS.includes(fileExt);
}

function decodeFileToLoadedImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const tempImg = new Image();

    tempImg.onload = () => {
      const width = tempImg.naturalWidth || tempImg.width;
      const height = tempImg.naturalHeight || tempImg.height;

      if (!width || !height || width <= 0 || height <= 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`"${file.name}" has invalid dimensions (0×0).`));
        return;
      }

      resolve({
        file,
        name: file.name,
        url: objectUrl,
        width,
        height,
        size: file.size,
        type: file.type || 'image/png',
        imgElement: tempImg,
      });
    };

    tempImg.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image "${file.name}". File might be corrupted.`));
    };

    tempImg.src = objectUrl;
  });
}

export function useImageLoader(onImageLoaded?: (img: LoadedImage, totalCount?: number) => void): UseImageLoaderReturn {
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Large image warning state
  const [isLargeImageWarning, setIsLargeImageWarning] = useState<boolean>(false);
  const [pendingLargeFile, setPendingLargeFile] = useState<File | null>(null);
  const [pendingLargeUrl, setPendingLargeUrl] = useState<string | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{
    width: number;
    height: number;
    memoryMB: number;
  } | null>(null);

  // Current active image
  const image = useMemo(() => {
    if (images.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(images.length - 1, activeImageIndex));
    return images[safeIndex] || null;
  }, [images, activeImageIndex]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      if (pendingLargeUrl && pendingLargeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pendingLargeUrl);
      }
    };
  }, []);

  const loadImagesFromFiles = useCallback(
    async (filesInput: File[] | FileList, append = false) => {
      setError(null);
      const rawFiles = Array.from(filesInput);
      if (rawFiles.length === 0) return;

      const validFiles = rawFiles.filter(isValidImageFile);
      if (validFiles.length === 0) {
        setError('Unsupported file format. Please upload JPG, PNG, WebP, or AVIF images.');
        return;
      }

      setIsLoading(true);

      const loadedList: LoadedImage[] = [];
      const failures: string[] = [];

      for (const file of validFiles) {
        try {
          const loaded = await decodeFileToLoadedImage(file);
          loadedList.push(loaded);
        } catch (err: any) {
          failures.push(err?.message || file.name);
        }
      }

      setIsLoading(false);

      if (loadedList.length === 0) {
        setError(`Failed to load images: ${failures.join(', ')}`);
        return;
      }

      if (append) {
        setImages((prev) => [...prev, ...loadedList]);
      } else {
        // Clean up previous image URLs
        images.forEach((img) => {
          if (img.url && img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
        });
        setImages(loadedList);
        setActiveImageIndex(0);
      }

      if (onImageLoaded && loadedList[0]) {
        onImageLoaded(loadedList[0], loadedList.length);
      }

      if (failures.length > 0) {
        setError(`Loaded ${loadedList.length} image(s). Note: ${failures.length} file(s) could not be read.`);
      }
    },
    [images, onImageLoaded]
  );

  const loadImageFromFile = useCallback(
    async (file: File) => {
      await loadImagesFromFiles([file], false);
    },
    [loadImagesFromFiles]
  );

  const loadImageFromUrl = useCallback(
    async (url: string, name: string) => {
      setError(null);
      setIsLoading(true);

      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';

      tempImg.onload = () => {
        const width = tempImg.naturalWidth || tempImg.width;
        const height = tempImg.naturalHeight || tempImg.height;

        const loaded: LoadedImage = {
          file: null,
          name,
          url,
          width,
          height,
          size: 0,
          type: 'image/jpeg',
          imgElement: tempImg,
        };

        // Revoke prior
        images.forEach((img) => {
          if (img.url && img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
        });

        setImages([loaded]);
        setActiveImageIndex(0);
        setIsLoading(false);

        if (onImageLoaded) {
          onImageLoaded(loaded);
        }
      };

      tempImg.onerror = () => {
        setIsLoading(false);
        setError('Failed to load sample image.');
      };

      tempImg.src = url;
    },
    [images, onImageLoaded]
  );

  const acceptLargeImage = useCallback(async () => {
    if (!pendingLargeUrl || !pendingLargeFile) return;
    setIsLoading(true);
    setIsLargeImageWarning(false);

    try {
      const loaded = await decodeFileToLoadedImage(pendingLargeFile);
      setImages([loaded]);
      setActiveImageIndex(0);
      if (onImageLoaded) onImageLoaded(loaded);
    } catch (e: any) {
      setError(e?.message || 'Failed to load large image.');
    } finally {
      setIsLoading(false);
      setPendingLargeFile(null);
      setPendingLargeUrl(null);
      setPendingDimensions(null);
    }
  }, [pendingLargeFile, pendingLargeUrl, onImageLoaded]);

  const resizeAndAcceptLargeImage = useCallback(
    async (maxDimension = 4096) => {
      if (!pendingLargeUrl || !pendingLargeFile || !pendingDimensions) return;
      setIsLoading(true);
      setIsLargeImageWarning(false);

      const tempImg = new Image();
      tempImg.onload = async () => {
        let { width, height } = pendingDimensions;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempImg, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedUrl = URL.createObjectURL(blob);
                const resizedImg = new Image();
                resizedImg.onload = () => {
                  const loaded: LoadedImage = {
                    file: pendingLargeFile,
                    name: `${pendingLargeFile.name.replace(/\.[^/.]+$/, '')}_optimized.png`,
                    url: resizedUrl,
                    width,
                    height,
                    size: blob.size,
                    type: 'image/png',
                    imgElement: resizedImg,
                  };

                  setImages([loaded]);
                  setActiveImageIndex(0);
                  if (onImageLoaded) onImageLoaded(loaded);

                  URL.revokeObjectURL(pendingLargeUrl);
                  setPendingLargeFile(null);
                  setPendingLargeUrl(null);
                  setPendingDimensions(null);
                  setIsLoading(false);
                };
                resizedImg.src = resizedUrl;
              }
            },
            'image/png',
            1.0
          );
        }
      };
      tempImg.src = pendingLargeUrl;
    },
    [pendingDimensions, pendingLargeFile, pendingLargeUrl, onImageLoaded]
  );

  const removeImageAtIndex = useCallback(
    (index: number) => {
      setImages((prev) => {
        const target = prev[index];
        if (target?.url && target.url.startsWith('blob:')) {
          URL.revokeObjectURL(target.url);
        }
        const updated = prev.filter((_, i) => i !== index);
        return updated;
      });

      setActiveImageIndex((prevIndex) => {
        if (index <= prevIndex) {
          return Math.max(0, prevIndex - 1);
        }
        return prevIndex;
      });
    },
    []
  );

  const clearAllImages = useCallback(() => {
    images.forEach((img) => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    if (pendingLargeUrl && pendingLargeUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingLargeUrl);
    }
    setImages([]);
    setActiveImageIndex(0);
    setPendingLargeFile(null);
    setPendingLargeUrl(null);
    setPendingDimensions(null);
    setError(null);
    setIsLargeImageWarning(false);
  }, [images, pendingLargeUrl]);

  return {
    images,
    activeImageIndex,
    image,
    isLoading,
    error,
    isLargeImageWarning,
    pendingLargeFile,
    pendingLargeUrl,
    pendingDimensions,
    loadImageFromFile,
    loadImagesFromFiles,
    loadImageFromUrl,
    acceptLargeImage,
    resizeAndAcceptLargeImage,
    setActiveImageIndex,
    removeImageAtIndex,
    clearImage: clearAllImages,
    clearAllImages,
    setError,
  };
}
