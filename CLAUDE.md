# CLAUDE.md

Контекст для Claude Code. **Повні вимоги — у `SPEC.md`, читай його перед стартом.** Цей файл — про конвенції, команди й жорсткі правила проєкту.

## Проєкт
Кросплатформний десктоп-додаток (Windows + macOS) на Electron для друку етикеток **Code 128** на термопринтері **Xprinter XP-365B**. Користувач вводить номер ТТН Нової Пошти → перевірка існування накладної через API НП → друк штрих-коду через **системний діалог**.

## Стек
- **electron-vite** (шаблон `react-ts`), **Electron** + **TypeScript** (strict)
- **React + Vite** (renderer)
- **bwip-js** (Code 128), **electron-builder** (пакетування)
- **safeStorage** для секретів

## Команди
- `npm run dev` — запуск у dev (electron-vite)
- `npm run typecheck` — перевірка типів (`tsc --noEmit`); **запускай після кожної суттєвої зміни**
- `npm run lint` — ESLint (якщо налаштовано)
- `npm run build` — продакшн-збірка
- `npm run build:win` — інсталятор `.exe` (NSIS)
- `npm run build:mac` — `.dmg`

Якщо скрипта ще нема — додай його в `package.json`.

## Архітектура
- `src/main/` — main process: вікно, IPC-хендлери (`np-check`, `settings-get/set`, `print-label`), друк
- `src/preload/` — contextBridge, єдиний місток renderer ↔ main
- `src/renderer/` — React: `components/`, `lib/` (`novaposhta.ts`, `label.ts`), `App.tsx`
- `shared/` — спільні типи, назви IPC-каналів, константа `LABEL`

**Інваріант:** `LABEL` (розмір етикетки в мм) живе лише в `shared/` і використовується і в CSS `@page`, і в `pageSize` друку. Ніколи не дублюй розмір в іншому місці.

## Конвенції коду
- TypeScript strict, без `any` (де неминуче — `unknown` + звуження типу)
- IPC: лише типізовані канали через preload; назви каналів беруться зі `shared/`
- Кожен async-шлях має обробку помилок і відображення стану в UI
- Renderer не імпортує Node/Electron напряму — тільки `window.api` з preload
- Без нових залежностей без потреби — спершу перевір, чи задача не вирішується наявним стеком

## Жорсткі правила (НІКОЛИ)
- НЕ зберігати API-ключ НП у renderer / localStorage / репозиторії. Тільки `safeStorage` у main, у `app.getPath('userData')`.
- НЕ вимикати `contextIsolation` / `sandbox` і НЕ вмикати `nodeIntegration`.
- НЕ реалізовувати raw TSPL/ESC-POS друк у цій ітерації — лише системний діалог (`silent: false`).
- НЕ комітити секрети, токени, `.env`.

## Підводні камені друку (деталі — у `SPEC.md`)
- `pageSize` — у мікронах (мм × 1000), мінімум 353 мкм на сторону; валідуй перед друком.
- Приховане вікно друкуй лише після завантаження й відмалювання.
- callback `webContents.print` ненадійний при скасуванні діалогу — не зав'язуй на нього критичну логіку.
- НП «не існує» = `data[0].StatusCode === "0000"`.

## Робочий процес
1. Перед змінами звірся зі `SPEC.md`.
2. Працюй пошарово: `shared` → preload → main → `lib` → React-компоненти → `App`. Після кожного шару — `npm run typecheck` і запуск `dev`.
3. Перед великими змінами дай короткий план.
4. Тримай цей файл актуальним, якщо змінюються команди чи структура.
