import { useState } from 'react'
import type { JSX } from 'react'
import { LABEL_LIMITS } from '@shared/constants'
import type { AppSettings } from '@shared/types'

interface SettingsProps {
  settings: AppSettings
  onSettingsChanged: () => void
}

type Notice = { tone: 'ok' | 'error'; text: string } | null

export function Settings({ settings, onSettingsChanged }: SettingsProps): JSX.Element {
  const [keyInput, setKeyInput] = useState('')
  const [keyNotice, setKeyNotice] = useState<Notice>(null)
  const [keyBusy, setKeyBusy] = useState(false)

  const [widthInput, setWidthInput] = useState(String(settings.label.width))
  const [heightInput, setHeightInput] = useState(String(settings.label.height))
  const [sizeNotice, setSizeNotice] = useState<Notice>(null)
  const [sizeBusy, setSizeBusy] = useState(false)

  async function saveKey(): Promise<void> {
    setKeyBusy(true)
    setKeyNotice(null)
    try {
      const result = await window.api.setApiKey(keyInput)
      if (result.ok) {
        setKeyInput('')
        setKeyNotice({ tone: 'ok', text: 'Ключ збережено (зашифровано)' })
        onSettingsChanged()
      } else {
        setKeyNotice({ tone: 'error', text: result.message })
      }
    } catch {
      setKeyNotice({ tone: 'error', text: 'Не вдалося зберегти ключ' })
    } finally {
      setKeyBusy(false)
    }
  }

  async function verifyKey(): Promise<void> {
    setKeyBusy(true)
    setKeyNotice(null)
    try {
      const result = await window.api.verifyApiKey()
      setKeyNotice({ tone: result.ok ? 'ok' : 'error', text: result.message })
    } catch {
      setKeyNotice({ tone: 'error', text: 'Не вдалося перевірити ключ' })
    } finally {
      setKeyBusy(false)
    }
  }

  async function saveSize(): Promise<void> {
    setSizeBusy(true)
    setSizeNotice(null)
    const width = Number(widthInput)
    const height = Number(heightInput)
    try {
      const result = await window.api.setLabelSize(width, height)
      if (result.ok) {
        setSizeNotice({ tone: 'ok', text: 'Розмір збережено' })
        onSettingsChanged()
      } else {
        setSizeNotice({ tone: 'error', text: result.message })
      }
    } catch {
      setSizeNotice({ tone: 'error', text: 'Не вдалося зберегти розмір' })
    } finally {
      setSizeBusy(false)
    }
  }

  return (
    <div className="settings">
      <section className="card">
        <h2>API-ключ Нової Пошти</h2>
        <p className="hint">
          Статус:{' '}
          {settings.hasApiKey ? (
            <span className="status-ok">ключ збережено ••••••••</span>
          ) : (
            <span className="status-warn">ключ не задано</span>
          )}
        </p>
        <label className="field">
          <span className="field-label">Новий ключ</span>
          <input
            type="password"
            value={keyInput}
            placeholder="Вставте API-ключ із кабінету НП"
            onChange={(event) => setKeyInput(event.target.value)}
          />
        </label>
        <div className="row">
          <button onClick={saveKey} disabled={keyBusy || keyInput.trim().length === 0}>
            Зберегти
          </button>
          <button onClick={verifyKey} disabled={keyBusy || !settings.hasApiKey}>
            Перевірити ключ
          </button>
        </div>
        {keyNotice && (
          <p className={keyNotice.tone === 'ok' ? 'status-ok' : 'status-error'}>{keyNotice.text}</p>
        )}
      </section>

      <section className="card">
        <h2>Розмір етикетки, мм</h2>
        <div className="row">
          <label className="field field-small">
            <span className="field-label">Ширина</span>
            <input
              type="number"
              min={LABEL_LIMITS.minMm}
              max={LABEL_LIMITS.maxMm}
              value={widthInput}
              onChange={(event) => setWidthInput(event.target.value)}
            />
          </label>
          <label className="field field-small">
            <span className="field-label">Висота</span>
            <input
              type="number"
              min={LABEL_LIMITS.minMm}
              max={LABEL_LIMITS.maxMm}
              value={heightInput}
              onChange={(event) => setHeightInput(event.target.value)}
            />
          </label>
          <button onClick={saveSize} disabled={sizeBusy}>
            Зберегти розмір
          </button>
        </div>
        <p className="hint">
          Допустимо {LABEL_LIMITS.minMm}–{LABEL_LIMITS.maxMm} мм. За замовчуванням 60×40.
        </p>
        {sizeNotice && (
          <p className={sizeNotice.tone === 'ok' ? 'status-ok' : 'status-error'}>
            {sizeNotice.text}
          </p>
        )}
      </section>
    </div>
  )
}
