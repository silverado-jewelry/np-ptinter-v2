'use strict'

const fs = require('fs')
const path = require('path')

// Позначаємо Windows .exe як Terminal-Server-Aware (PE-прапор 0x8000).
// На Windows Server 2008 R2 без цього прапора tsappcmp.dll (RDS App Compatibility)
// ініціалізується зарано і валить багатопотокові застосунки на кшталт Electron
// з APPCRASH. Деталі: Microsoft KB2279689.
const IMAGE_DLLCHARACTERISTICS_TERMINAL_SERVER_AWARE = 0x8000

function setTerminalServerAware(exePath) {
  const buf = fs.readFileSync(exePath)

  // DOS header → e_lfanew (offset на PE-сигнатуру) лежить за зміщенням 0x3C.
  const peOffset = buf.readUInt32LE(0x3c)
  if (buf.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
    throw new Error(`Не знайдено PE-сигнатуру у ${exePath}`)
  }

  // Optional header починається після 4 байтів сигнатури + 20 байтів COFF-заголовка.
  const optionalHeaderOffset = peOffset + 24
  const magic = buf.readUInt16LE(optionalHeaderOffset)
  // 0x10b = PE32, 0x20b = PE32+. DllCharacteristics в обох за зміщенням 0x46.
  if (magic !== 0x10b && magic !== 0x20b) {
    throw new Error(`Неочікуваний Optional Header Magic 0x${magic.toString(16)} у ${exePath}`)
  }

  const dllCharOffset = optionalHeaderOffset + 0x46
  const flags = buf.readUInt16LE(dllCharOffset)
  if (flags & IMAGE_DLLCHARACTERISTICS_TERMINAL_SERVER_AWARE) {
    console.log(`[afterPack] ${path.basename(exePath)} вже Terminal-Server-Aware`)
    return
  }

  buf.writeUInt16LE(flags | IMAGE_DLLCHARACTERISTICS_TERMINAL_SERVER_AWARE, dllCharOffset)
  fs.writeFileSync(exePath, buf)
  console.log(`[afterPack] Виставлено TERMINAL_SERVER_AWARE для ${path.basename(exePath)}`)
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const executableName =
    context.packager.platformSpecificBuildOptions.executableName ||
    context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${executableName}.exe`)

  if (!fs.existsSync(exePath)) {
    throw new Error(`afterPack: не знайдено ${exePath}`)
  }
  setTerminalServerAware(exePath)
}
