import type {
  NpCheckResult,
  NpRequestBody,
  NpResponse,
  NpStatusDocument,
  VerifyKeyResult
} from '@shared/types'
import { describeError, getApiKey } from './settings'

const NP_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/'
const REQUEST_TIMEOUT_MS = 10_000

async function npRequest<T>(body: NpRequestBody): Promise<NpResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(NP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (response.status === 429) {
      throw new Error('Забагато запитів до API НП — спробуйте за хвилину')
    }
    if (!response.ok) {
      throw new Error(`API НП повернуло HTTP ${response.status}`)
    }
    const json: unknown = await response.json()
    if (typeof json !== 'object' || json === null || !('success' in json)) {
      throw new Error('Неочікувана відповідь API НП')
    }
    const parsed = json as { success: unknown; data?: unknown; errors?: unknown }
    return {
      success: parsed.success === true,
      data: Array.isArray(parsed.data) ? (parsed.data as T[]) : [],
      errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : []
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Час очікування відповіді НП вичерпано — перевірте інтернет-зʼєднання')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkDocument(ttn: string): Promise<NpCheckResult> {
  const body: NpRequestBody = {
    modelName: 'TrackingDocument',
    calledMethod: 'getStatusDocuments',
    methodProperties: { Documents: [{ DocumentNumber: ttn }] }
  }
  const apiKey = await getApiKey()
  if (apiKey !== null) body.apiKey = apiKey

  try {
    const response = await npRequest<NpStatusDocument>(body)
    if (!response.success && response.errors.length > 0) {
      return { kind: 'error', message: `НП: ${response.errors.join('; ')}` }
    }
    const document = response.data[0]
    if (!document) {
      return { kind: 'error', message: 'API НП повернуло порожню відповідь' }
    }
    if (document.StatusCode === '0000') {
      return { kind: 'not-found' }
    }
    return {
      kind: 'found',
      document: {
        ttn,
        status: document.Status ?? '',
        statusCode: document.StatusCode ?? '',
        cityRecipient: document.CityRecipient ?? ''
      }
    }
  } catch (error) {
    return { kind: 'error', message: describeError(error) }
  }
}

export async function verifyApiKey(): Promise<VerifyKeyResult> {
  const apiKey = await getApiKey()
  if (apiKey === null) {
    return { ok: false, message: 'Ключ не задано' }
  }
  try {
    const response = await npRequest<unknown>({
      apiKey,
      modelName: 'Counterparty',
      calledMethod: 'getCounterparties',
      methodProperties: { CounterpartyProperty: 'Sender', Page: '1' }
    })
    if (response.success) {
      return { ok: true, message: 'Ключ дійсний' }
    }
    const details = response.errors.length > 0 ? response.errors.join('; ') : 'невідома помилка'
    return { ok: false, message: `Ключ не пройшов перевірку: ${details}` }
  } catch (error) {
    return { ok: false, message: describeError(error) }
  }
}
