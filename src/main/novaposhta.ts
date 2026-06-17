import { net } from 'electron'
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
const TIMEOUT_MESSAGE = 'Час очікування відповіді НП вичерпано — перевірте інтернет-зʼєднання'

// Глобального fetch у Node 16 (Electron 22) немає, тож йдемо через Chromium-стек (net.request).
function npRequest<T>(body: NpRequestBody): Promise<NpResponse<T>> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'POST', url: NP_ENDPOINT })
    request.setHeader('Content-Type', 'application/json')

    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      request.abort()
    }, REQUEST_TIMEOUT_MS)

    request.on('response', (response) => {
      const status = response.statusCode
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => {
        clearTimeout(timeout)
        try {
          if (status === 429) {
            throw new Error('Забагато запитів до API НП — спробуйте за хвилину')
          }
          if (status < 200 || status >= 300) {
            throw new Error(`API НП повернуло HTTP ${status}`)
          }
          const json: unknown = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          if (typeof json !== 'object' || json === null || !('success' in json)) {
            throw new Error('Неочікувана відповідь API НП')
          }
          const parsed = json as { success: unknown; data?: unknown; errors?: unknown }
          resolve({
            success: parsed.success === true,
            data: Array.isArray(parsed.data) ? (parsed.data as T[]) : [],
            errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : []
          })
        } catch (error) {
          reject(error)
        }
      })
    })

    request.on('abort', () => {
      clearTimeout(timeout)
      reject(new Error(TIMEOUT_MESSAGE))
    })

    request.on('error', (error) => {
      clearTimeout(timeout)
      reject(timedOut ? new Error(TIMEOUT_MESSAGE) : error)
    })

    request.write(JSON.stringify(body))
    request.end()
  })
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
