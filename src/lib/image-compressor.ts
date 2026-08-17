/**
 * Client-side image compression utility.
 * Resizes images to max 1600px on the long edge and compresses JPEG quality to 0.8.
 */
export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  savingsPercent: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function compressImage(
  file: File,
  maxLongEdge = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions (max long edge = 1600px)
        if (width > height) {
          if (width > maxLongEdge) {
            height = Math.round((height * maxLongEdge) / width);
            width = maxLongEdge;
          }
        } else {
          if (height > maxLongEdge) {
            width = Math.round((width * maxLongEdge) / height);
            height = maxLongEdge;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context.'));
          return;
        }

        // Draw and compress to JPEG at 0.8 quality
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas image conversion to Blob failed.'));
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.jpg',
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const originalSize = file.size;
            const compressedSize = blob.size;
            const savingsPercent = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              originalSize,
              compressedSize,
              width,
              height,
              savingsPercent,
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
