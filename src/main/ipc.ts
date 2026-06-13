import { ipcMain } from 'electron'
import { IPC, LABEL_LIMITS, TTN_PATTERN } from '@shared/constants'
import type { AppSettings, NpCheckResult, OpResult, VerifyKeyResult } from '@shared/types'
import { checkDocument, verifyApiKey } from './novaposhta'
import { getLabelSize, getSettings, setApiKey, setLabelSize } from './settings'
import { printLabel } from './print'

const MAX_PNG_DATA_URL_LENGTH = 5_000_000

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.npCheck, async (_event, ttn: unknown): Promise<NpCheckResult> => {
    if (typeof ttn !== 'string' || !TTN_PATTERN.test(ttn)) {
      return { kind: 'error', message: 'Некоректний номер ТТН' }
    }
    return checkDocument(ttn)
  })

  ipcMain.handle(IPC.npVerifyKey, (): Promise<VerifyKeyResult> => verifyApiKey())

  ipcMain.handle(IPC.settingsGet, (): Promise<AppSettings> => getSettings())

  ipcMain.handle(IPC.settingsSetApiKey, async (_event, key: unknown): Promise<OpResult> => {
    if (typeof key !== 'string') {
      return { ok: false, message: 'Некоректний формат ключа' }
    }
    return setApiKey(key)
  })

  ipcMain.handle(
    IPC.settingsSetLabelSize,
    async (_event, width: unknown, height: unknown): Promise<OpResult> => {
      if (
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        return {
          ok: false,
          message: `Розмір етикетки має бути числом у межах ${LABEL_LIMITS.minMm}–${LABEL_LIMITS.maxMm} мм`
        }
      }
      return setLabelSize(width, height)
    }
  )

  ipcMain.handle(IPC.printLabel, async (_event, pngDataUrl: unknown): Promise<OpResult> => {
    if (
      typeof pngDataUrl !== 'string' ||
      !pngDataUrl.startsWith('data:image/png;base64,') ||
      pngDataUrl.length > MAX_PNG_DATA_URL_LENGTH
    ) {
      return { ok: false, message: 'Некоректні дані етикетки для друку' }
    }
    const label = await getLabelSize()
    return printLabel(pngDataUrl, label)
  })
}
