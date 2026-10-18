// Shrinks photos in the browser before upload: faster pages and less storage used.

export class ImageError extends Error {}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageError('That photo type can’t be opened here. Try a JPG or PNG.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** Returns a resized image (longest side <= maxSide) as WebP, or JPEG where WebP isn't supported. */
export async function resizeImage(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new ImageError('Please choose a photo (JPG, PNG or WebP).')
  if (file.size > 25 * 1024 * 1024) throw new ImageError('That photo is too big (over 25 MB).')
  if (file.type === 'image/gif') return file // keep animations
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.86)
  if (!jpeg) throw new ImageError('Couldn’t process that photo. Try another one.')
  return jpeg
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new ImageError('Couldn’t read that photo.'))
    r.readAsDataURL(blob)
  })
}
