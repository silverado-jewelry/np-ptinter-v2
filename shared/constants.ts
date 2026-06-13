import type { LabelSize } from './types'

/** Розмір етикетки за замовчуванням, мм. Єдине джерело правди для превʼю, CSS @page і pageSize друку. */
export const LABEL: LabelSize = { width: 60, height: 40 }

/** Допустимі межі розміру етикетки, мм. */
export const LABEL_LIMITS = { minMm: 20, maxMm: 200 } as const

/** Мінімальний розмір сторінки для Chromium pageSize, мікрони (на кожну сторону). */
export const MIN_PAGE_MICRONS = 353

/** Номер ТТН: лише цифри, типово 14 знаків. */
export const TTN_MIN_LENGTH = 10
export const TTN_MAX_LENGTH = 20
export const TTN_PATTERN = /^\d{10,20}$/

export const TTN_DEBOUNCE_MS = 500

export const IPC = {
  npCheck: 'np-check',
  npVerifyKey: 'np-verify-key',
  settingsGet: 'settings-get',
  settingsSetApiKey: 'settings-set-api-key',
  settingsSetLabelSize: 'settings-set-label-size',
  printLabel: 'print-label'
} as const
