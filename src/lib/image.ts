/** Turns a raw image (any size/format) into a ≤1000px JPEG. */
export async function prepareCover(img: Blob, max = 1000): Promise<Blob> {
  const bmp = await createImageBitmap(img)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode cover'))), 'image/jpeg', 0.88),
  )
}
