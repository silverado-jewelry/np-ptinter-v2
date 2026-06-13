/** Розмір етикетки в міліметрах. */
export interface LabelSize {
  width: number
  height: number
}

/** Налаштування, які бачить renderer. Сам API-ключ ніколи не виходить за межі main. */
export interface AppSettings {
  label: LabelSize
  hasApiKey: boolean
}

export interface NpDocumentInfo {
  ttn: string
  status: string
  statusCode: string
  cityRecipient: string
}

export type NpCheckResult =
  | { kind: 'found'; document: NpDocumentInfo }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

export type OpResult = { ok: true } | { ok: false; message: string }

export interface VerifyKeyResult {
  ok: boolean
  message: string
}

/** Типізований API, який preload відкриває в renderer як window.api. */
export interface RendererApi {
  checkTtn(ttn: string): Promise<NpCheckResult>
  getSettings(): Promise<AppSettings>
  setApiKey(key: string): Promise<OpResult>
  verifyApiKey(): Promise<VerifyKeyResult>
  setLabelSize(width: number, height: number): Promise<OpResult>
  printLabel(pngDataUrl: string): Promise<OpResult>
}

/** Контракти API Нової Пошти. */
export interface NpRequestBody {
  apiKey?: string
  modelName: string
  calledMethod: string
  methodProperties: Record<string, unknown>
}

export interface NpResponse<T> {
  success: boolean
  data: T[]
  errors: string[]
}

export interface NpStatusDocument {
  Number?: string
  Status?: string
  StatusCode?: string
  CityRecipient?: string
}
