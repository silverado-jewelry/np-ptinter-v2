import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/constants'
import type {
  AppSettings,
  NpCheckResult,
  OpResult,
  RendererApi,
  VerifyKeyResult
} from '@shared/types'

const api: RendererApi = {
  checkTtn: (ttn: string): Promise<NpCheckResult> => ipcRenderer.invoke(IPC.npCheck, ttn),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
  setApiKey: (key: string): Promise<OpResult> => ipcRenderer.invoke(IPC.settingsSetApiKey, key),
  verifyApiKey: (): Promise<VerifyKeyResult> => ipcRenderer.invoke(IPC.npVerifyKey),
  setLabelSize: (width: number, height: number): Promise<OpResult> =>
    ipcRenderer.invoke(IPC.settingsSetLabelSize, width, height),
  printLabel: (pngDataUrl: string): Promise<OpResult> =>
    ipcRenderer.invoke(IPC.printLabel, pngDataUrl)
}

contextBridge.exposeInMainWorld('api', api)
