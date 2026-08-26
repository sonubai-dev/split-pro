import { useState, useCallback, useEffect } from 'react';
import { LoadedImage } from '../types';
import { estimateMemoryUsageMB } from '../lib/imageEngine';

export interface UseImageLoaderReturn {
  image: LoadedImage | null;
  isLoading: boolean;
  error: string | null;
  isLargeImageWarning: boolean;
  pendingLargeFile: File | null;
  pendingLargeUrl: string | null;
  pendingDimensions: { width: number; height: number; memoryMB: number } | null;
  loadImageFromFile: (file: File) => Promise<void>;
  loadImageFromUrl: (url: string, name: string) => Promise<void>;
  acceptLargeImage: () => Promise<void>;
  resizeAndAcceptLargeImage: (maxDimension?: number) => Promise<void>;
  clearImage: () => void;
  setError: (err: string | null) => void;
}

export function useImageLoader(onImageLoaded?: (img: LoadedImage) => void): UseImageLoaderReturn {
  const [image, setImage] = useState<LoadedImage | null>(null);
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

  // Clean up object URLs on unmount or replace
  useEffect(() => {
    return () => {
      if (image?.url && image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
      if (pendingLargeUrl && pendingLargeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pendingLargeUrl);
      }
    };
  }, [image, pendingLargeUrl]);

  const processLoadedElement = useCallback(
    (
      img: HTMLImageElement,
      file: File | null,
      name: string,
      url: string,
      size: number,
      type: string
    ) => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Revoke previous active image blob URL if replacing
      setImage((prev) => {
        if (prev?.url && prev.url.startsWith('blob:') && prev.url !== url) {
          URL.revokeObjectURL(prev.url);
        }
        return {
          file,
          name,
          url,
          width,
          height,
          size,
          type,
          imgElement: img,
        };
      });

      setIsLoading(false);
      setError(null);
      if (onImageLoaded) {
        onImageLoaded({
          file,
          name,
          url,
          width,
          height,
          size,
          type,
          imgElement: img,
        });
      }
    },
    [onImageLoaded]
  );

  const loadImageFromFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate format
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif'];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const validExts = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

      if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
        setError('Unsupported image format. Please upload a standard JPG, PNG, WebP, or AVIF image.');
        return;
      }

      setIsLoading(true);

      // Clean any existing pending large URL
      if (pendingLargeUrl && pendingLargeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pendingLargeUrl);
      }

      const objectUrl = URL.createObjectURL(file);
      const tempImg = new Image();

      tempImg.onload = () => {
        const width = tempImg.naturalWidth;
        const height = tempImg.naturalHeight;

        if (!width || !height || width <= 0 || height <= 0) {
          setIsLoading(false);
          URL.revokeObjectURL(objectUrl);
          setError('Image has invalid dimensions (0×0). Please choose another file.');
          return;
        }

        const totalPixels = width * height;
        const memoryMB = estimateMemoryUsageMB(width, height);

        // If pixels > 25 million (~5000x5000), prompt safe option
        if (totalPixels > 25000000) {
          setIsLoading(false);
          setPendingLargeFile(file);
          setPendingLargeUrl(objectUrl);
          setPendingDimensions({ width, height, memoryMB });
          setIsLargeImageWarning(true);
          return;
        }

        processLoadedElement(tempImg, file, file.name, objectUrl, file.size, file.type);
      };

      tempImg.onerror = () => {
        setIsLoading(false);
        URL.revokeObjectURL(objectUrl);
        setError('Unable to decode this image. The file may be damaged or incomplete.');
      };

      tempImg.src = objectUrl;
    },
    [pendingLargeUrl, processLoadedElement]
  );

  const loadImageFromUrl = useCallback(
    async (url: string, name: string) => {
      setError(null);
      setIsLoading(true);

      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';

      tempImg.onload = () => {
        const width = tempImg.naturalWidth;
        const height = tempImg.naturalHeight;
        processLoadedElement(tempImg, null, name, url, 0, 'image/jpeg');
      };

      tempImg.onerror = () => {
        setIsLoading(false);
        setError('Failed to load sample image.');
      };

      tempImg.src = url;
    },
    [processLoadedElement]
  );

  const acceptLargeImage = useCallback(async () => {
    if (!pendingLargeUrl || !pendingLargeFile) return;
    setIsLoading(true);
    setIsLargeImageWarning(false);

    const tempImg = new Image();
    tempImg.onload = () => {
      processLoadedElement(
        tempImg,
        pendingLargeFile,
        pendingLargeFile.name,
        pendingLargeUrl,
        pendingLargeFile.size,
        pendingLargeFile.type
      );
      setPendingLargeFile(null);
      setPendingLargeUrl(null);
      setPendingDimensions(null);
    };
    tempImg.src = pendingLargeUrl;
  }, [pendingLargeFile, pendingLargeUrl, processLoadedElement]);

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
                  processLoadedElement(
                    resizedImg,
                    pendingLargeFile,
                    `${pendingLargeFile.name.replace(/\.[^/.]+$/, '')}_optimized.png`,
                    resizedUrl,
                    blob.size,
                    'image/png'
                  );
                  URL.revokeObjectURL(pendingLargeUrl);
                  setPendingLargeFile(null);
                  setPendingLargeUrl(null);
                  setPendingDimensions(null);
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
    [pendingDimensions, pendingLargeFile, pendingLargeUrl, processLoadedElement]
  );

  const clearImage = useCallback(() => {
    if (image?.url && image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    if (pendingLargeUrl && pendingLargeUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingLargeUrl);
    }
    setImage(null);
    setPendingLargeFile(null);
    setPendingLargeUrl(null);
    setPendingDimensions(null);
    setError(null);
    setIsLargeImageWarning(false);
  }, [image, pendingLargeUrl]);

  return {
    image,
    isLoading,
    error,
    isLargeImageWarning,
    pendingLargeFile,
    pendingLargeUrl,
    pendingDimensions,
    loadImageFromFile,
    loadImageFromUrl,
    acceptLargeImage,
    resizeAndAcceptLargeImage,
    clearImage,
    setError,
  };
}
