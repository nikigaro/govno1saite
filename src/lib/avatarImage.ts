export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const AVATAR_SIZE = 256;

export async function cropAvatarToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const offsetX = (bitmap.width - side) / 2;
  const offsetY = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas is not available');
  }
  context.drawImage(bitmap, offsetX, offsetY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob?.type === 'image/webp' ? resolve(blob) : reject(new Error('Browser cannot encode WebP')),
      'image/webp',
      0.9,
    );
  });
}
