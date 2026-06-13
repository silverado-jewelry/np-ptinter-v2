import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { LABEL, LABEL_LIMITS } from '@shared/constants'
import type { AppSettings, LabelSize, OpResult } from '@shared/types'

const configPath = (): string => join(app.getPath('userData'), 'config.json')
const apiKeyPath = (): string => join(app.getPath('userData'), 'np-api-key.bin')

function isValidLabelSize(value: unknown): value is LabelSize {
  if (typeof value !== 'object' || value === null) return false
  const { width, height } = value as Record<string, unknown>
  return (
    typeof width === 'number' &&
    typeof height === 'number' &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= LABEL_LIMITS.minMm &&
    width <= LABEL_LIMITS.maxMm &&
    height >= LABEL_LIMITS.minMm &&
    height <= LABEL_LIMITS.maxMm
  )
}

export async function getLabelSize(): Promise<LabelSize> {
  try {
    const raw = await fs.readFile(configPath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const label = (parsed as Record<string, unknown>).label
      if (isValidLabelSize(label)) return label
    }
  } catch {
    // файлу немає або він пошкоджений — повертаємо дефолт
  }
  return { ...LABEL }
}

export async function setLabelSize(width: number, height: number): Promise<OpResult> {
  const label = { width, height }
  if (!isValidLabelSize(label)) {
    return {
      ok: false,
      message: `Розмір етикетки має бути в межах ${LABEL_LIMITS.minMm}–${LABEL_LIMITS.maxMm} мм`
    }
  }
  try {
    await fs.writeFile(configPath(), JSON.stringify({ label }, null, 2), 'utf-8')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: `Не вдалося зберегти налаштування: ${describeError(error)}` }
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    const encrypted = await fs.readFile(apiKeyPath())
    if (!safeStorage.isEncryptionAvailable()) return null
    const key = safeStorage.decryptString(encrypted).trim()
    return key.length > 0 ? key : null
  } catch {
    return null
  }
}

export async function setApiKey(key: string): Promise<OpResult> {
  const trimmed = key.trim()
  if (trimmed.length === 0) {
    return { ok: false, message: 'Ключ не може бути порожнім' }
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return {
      ok: false,
      message: 'Шифрування недоступне в цій системі — ключ не збережено (потрібен Keychain/DPAPI)'
    }
  }
  try {
    await fs.writeFile(apiKeyPath(), safeStorage.encryptString(trimmed))
    return { ok: true }
  } catch (error) {
    return { ok: false, message: `Не вдалося зберегти ключ: ${describeError(error)}` }
  }
}

export async function getSettings(): Promise<AppSettings> {
  const [label, apiKey] = await Promise.all([getLabelSize(), getApiKey()])
  return { label, hasApiKey: apiKey !== null }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
