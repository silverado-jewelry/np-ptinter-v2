import { toCanvas } from 'bwip-js/browser'

/**
 * Генерує Code 128 у PNG data URL. Той самий PNG іде і в превʼю, і в HTML для друку,
 * тому превʼю завжди дорівнює надрукованому. scale: 4 — для чіткості на 203 dpi.
 */
export function generateBarcodePngDataUrl(ttn: string): string {
  const canvas = document.createElement('canvas')
  toCanvas(canvas, {
    bcid: 'code128',
    text: ttn,
    scale: 4,
    height: 12,
    includetext: true,
    textxalign: 'center'
  })
  return canvas.toDataURL('image/png')
}
