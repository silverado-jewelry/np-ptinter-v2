import { BrowserWindow } from 'electron'
import { MIN_PAGE_MICRONS } from '@shared/constants'
import type { LabelSize, OpResult } from '@shared/types'
import { describeError } from './settings'

const RENDER_SETTLE_MS = 150
const PRINT_WINDOW_TTL_MS = 5 * 60_000

let activePrintWindow: BrowserWindow | null = null

function buildLabelHtml(pngDataUrl: string, label: LabelSize): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: ${label.width}mm ${label.height}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .label {
    width: ${label.width}mm;
    height: ${label.height}mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  img { max-width: 94%; max-height: 94%; }
</style>
</head>
<body><div class="label"><img src="${pngDataUrl}" alt=""></div></body>
</html>`
}

export async function printLabel(pngDataUrl: string, label: LabelSize): Promise<OpResult> {
  const widthMicrons = Math.round(label.width * 1000)
  const heightMicrons = Math.round(label.height * 1000)
  if (widthMicrons < MIN_PAGE_MICRONS || heightMicrons < MIN_PAGE_MICRONS) {
    return {
      ok: false,
      message: `Розмір сторінки замалий для друку (мінімум ${MIN_PAGE_MICRONS} мкм на сторону)`
    }
  }
  if (activePrintWindow !== null) {
    return { ok: false, message: 'Друк уже триває — закрийте попередній діалог друку' }
  }

  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  activePrintWindow = win

  const cleanup = (): void => {
    if (activePrintWindow === win) activePrintWindow = null
    if (!win.isDestroyed()) win.destroy()
  }

  try {
    const printers = await win.webContents.getPrintersAsync()
    if (printers.length === 0) {
      cleanup()
      return {
        ok: false,
        message:
          'Принтерів не знайдено. Перевірте, чи встановлено драйвер XP-365B і чи увімкнено принтер.'
      }
    }

    const html = buildLabelHtml(pngDataUrl, label)
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await win.webContents.executeJavaScript(
      'document.images[0] ? document.images[0].decode() : Promise.resolve()',
      true
    )
    await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS))

    // Callback ненадійний при скасуванні діалогу — лише прибираємо вікно, без критичної логіки.
    win.webContents.print(
      {
        silent: false,
        margins: { marginType: 'none' },
        pageSize: { width: widthMicrons, height: heightMicrons }
      },
      () => cleanup()
    )
    // Запобіжник, щоб приховане вікно не зависло, якщо callback так і не прийде.
    setTimeout(cleanup, PRINT_WINDOW_TTL_MS)
    return { ok: true }
  } catch (error) {
    cleanup()
    return { ok: false, message: `Не вдалося підготувати друк: ${describeError(error)}` }
  }
}
