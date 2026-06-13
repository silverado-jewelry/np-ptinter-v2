import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { TTN_DEBOUNCE_MS } from '@shared/constants'
import type { AppSettings, NpDocumentInfo } from '@shared/types'
import { TtnInput } from '@renderer/components/TtnInput'
import { LabelPreview } from '@renderer/components/LabelPreview'
import { Settings } from '@renderer/components/Settings'
import { generateBarcodePngDataUrl } from '@renderer/lib/label'
import { isCheckableTtn } from '@renderer/lib/novaposhta'

type Screen = 'main' | 'settings'

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; document: NpDocumentInfo }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('main')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const [ttn, setTtn] = useState('')
  const [check, setCheck] = useState<CheckState>({ status: 'idle' })
  const requestSeq = useRef(0)
  const debounceTimer = useRef<number | undefined>(undefined)

  const [printing, setPrinting] = useState(false)
  const [printNotice, setPrintNotice] = useState<string | null>(null)

  const loadSettings = useCallback((): void => {
    window.api
      .getSettings()
      .then((loaded) => {
        setSettings(loaded)
        setSettingsError(null)
      })
      .catch(() => setSettingsError('Не вдалося завантажити налаштування'))
  }, [])

  useEffect(() => {
    loadSettings()
    return (): void => window.clearTimeout(debounceTimer.current)
  }, [loadSettings])

  function handleTtnChange(next: string): void {
    setTtn(next)
    setPrintNotice(null)
    window.clearTimeout(debounceTimer.current)
    const seq = ++requestSeq.current
    if (!isCheckableTtn(next)) {
      setCheck({ status: 'idle' })
      return
    }
    setCheck({ status: 'loading' })
    debounceTimer.current = window.setTimeout(async () => {
      try {
        const result = await window.api.checkTtn(next)
        if (seq !== requestSeq.current) return
        if (result.kind === 'found') setCheck({ status: 'valid', document: result.document })
        else if (result.kind === 'not-found') setCheck({ status: 'not-found' })
        else setCheck({ status: 'error', message: result.message })
      } catch {
        if (seq === requestSeq.current) {
          setCheck({ status: 'error', message: 'Помилка звʼязку з застосунком' })
        }
      }
    }, TTN_DEBOUNCE_MS)
  }

  const barcode = useMemo((): string | null => {
    if (check.status !== 'valid') return null
    try {
      return generateBarcodePngDataUrl(check.document.ttn)
    } catch {
      return null
    }
  }, [check])

  async function handlePrint(): Promise<void> {
    if (barcode === null) return
    setPrinting(true)
    setPrintNotice(null)
    try {
      const result = await window.api.printLabel(barcode)
      setPrintNotice(result.ok ? 'Відкрито системний діалог друку' : result.message)
    } catch {
      setPrintNotice('Не вдалося запустити друк')
    } finally {
      setPrinting(false)
    }
  }

  const hasApiKey = settings?.hasApiKey ?? false
  const canPrint = check.status === 'valid' && barcode !== null && hasApiKey && !printing

  return (
    <div className="app">
      <header className="topbar">
        <h1>Друк етикеток НП</h1>
        <nav className="tabs">
          <button
            className={screen === 'main' ? 'tab active' : 'tab'}
            onClick={() => setScreen('main')}
          >
            Друк
          </button>
          <button
            className={screen === 'settings' ? 'tab active' : 'tab'}
            onClick={() => setScreen('settings')}
          >
            Налаштування
          </button>
        </nav>
      </header>

      {settingsError && <div className="banner banner-error">{settingsError}</div>}

      {screen === 'settings' && settings !== null && (
        <Settings settings={settings} onSettingsChanged={loadSettings} />
      )}

      {screen === 'main' && (
        <main className="main-screen">
          {settings !== null && !hasApiKey && (
            <div className="banner banner-warn">
              API-ключ НП не задано — друк заблоковано.{' '}
              <button className="link" onClick={() => setScreen('settings')}>
                Перейти в Налаштування
              </button>
            </div>
          )}

          <TtnInput value={ttn} onChange={handleTtnChange} />

          {check.status === 'loading' && <p className="status-muted">Перевіряємо накладну…</p>}
          {check.status === 'not-found' && (
            <p className="status-error">Накладну не знайдено — друк заблоковано</p>
          )}
          {check.status === 'error' && <p className="status-error">{check.message}</p>}

          {check.status === 'valid' && settings !== null && (
            <div className="result">
              <div className="doc-info">
                <p className="status-ok">Накладну знайдено</p>
                <p>
                  <strong>Статус:</strong> {check.document.status || '—'}
                </p>
                <p>
                  <strong>Місто отримувача:</strong> {check.document.cityRecipient || '—'}
                </p>
              </div>
              {barcode !== null ? (
                <LabelPreview pngDataUrl={barcode} label={settings.label} />
              ) : (
                <p className="status-error">Не вдалося згенерувати штрих-код</p>
              )}
              <button className="print-button" onClick={handlePrint} disabled={!canPrint}>
                {printing ? 'Готуємо друк…' : 'Друкувати'}
              </button>
              {printNotice && <p className="status-muted">{printNotice}</p>}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

export default App
