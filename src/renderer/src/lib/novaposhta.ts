import { TTN_MAX_LENGTH, TTN_MIN_LENGTH } from '@shared/constants'

/** Прибирає все, крім цифр (пробіли, дефіси тощо), і обрізає до максимальної довжини. */
export function normalizeTtn(input: string): string {
  return input.replace(/\D/g, '').slice(0, TTN_MAX_LENGTH)
}

export function isCheckableTtn(ttn: string): boolean {
  return ttn.length >= TTN_MIN_LENGTH && ttn.length <= TTN_MAX_LENGTH
}
