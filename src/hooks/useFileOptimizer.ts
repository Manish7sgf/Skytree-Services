import imageCompression from 'browser-image-compression';
import { useState } from 'react';

export interface ProcessedFile {
  originalFile: File;
  compressedFile: File | Blob;
  originalSize: number;
  compressedSize: number;
  percentageReduced: number;
  name: string;
  type: string;
}

export const useFileOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const optimizeFile = async (file: File): Promise<ProcessedFile> => {
    setIsOptimizing(true);
    setProgress(0);

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isImage) {
      const options = {
        maxSizeMB: 2.9, // Strictly under 3MB
        maxWidthOrHeight: 1920, // High quality, low resolution combo
        useWebWorker: true,
        onProgress: (p: number) => setProgress(p),
      };

      try {
        const compressedBlob = await imageCompression(file, options);
        setIsOptimizing(false);
        const reduction = ((file.size - compressedBlob.size) / file.size) * 100;

        return {
          originalFile: file,
          compressedFile: compressedBlob,
          originalSize: file.size,
          compressedSize: compressedBlob.size,
          percentageReduced: Math.round(reduction),
          name: file.name,
          type: file.type,
        };
      } catch (error) {
        console.error("Compression failed:", error);
        setIsOptimizing(false);
        return createIdentityProcessedFile(file);
      }
    } else if (isPDF) {
      // Simulated PDF Optimization Flow
      return new Promise((resolve) => {
        let p = 0;
        const interval = setInterval(() => {
          p += 10;
          setProgress(p);
          if (p >= 100) {
            clearInterval(interval);
            setIsOptimizing(false);
            // Since we can't easily compress PDF client-side without heavy libs, 
            // we return the original but provide the UI experience.
            resolve(createIdentityProcessedFile(file));
          }
        }, 100);
      });
    }

    setIsOptimizing(false);
    return createIdentityProcessedFile(file);
  };

  const createIdentityProcessedFile = (file: File): ProcessedFile => ({
    originalFile: file,
    compressedFile: file,
    originalSize: file.size,
    compressedSize: file.size,
    percentageReduced: 0,
    name: file.name,
    type: file.type,
  });

  return { optimizeFile, isOptimizing, progress };
};
