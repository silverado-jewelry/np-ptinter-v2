import type { JSX } from 'react'
import { normalizeTtn } from '@renderer/lib/novaposhta'

interface TtnInputProps {
  value: string
  onChange: (ttn: string) => void
}

export function TtnInput({ value, onChange }: TtnInputProps): JSX.Element {
  return (
    <label className="field">
      <span className="field-label">Номер ТТН</span>
      <input
        className="ttn-input"
        type="text"
        inputMode="numeric"
        autoFocus
        placeholder="Напр. 20450000000000"
        value={value}
        onChange={(event) => onChange(normalizeTtn(event.target.value))}
      />
    </label>
  )
}
