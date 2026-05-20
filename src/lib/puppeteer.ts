import puppeteer, { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Finds the local Chrome or Edge executable on Windows/Mac/Linux.
 */
function findChromeExecutable(): string | undefined {
  const platform = os.platform()

  if (platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      path.join(os.homedir(), 'AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'),
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p
      }
    }
  } else if (platform === 'darwin') {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p
      }
    }
  } else {
    // Linux
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p
      }
    }
  }

  return undefined
}

/**
 * Launches Puppeteer browser using a system-installed browser if Chromium wasn't downloaded.
 */
export async function getPuppeteerBrowser(): Promise<Browser> {
  const executablePath = findChromeExecutable()
  
  if (executablePath) {
    console.log(`Using system browser at: ${executablePath}`)
    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }

  // Fallback to standard launch
  console.log('Using default Puppeteer browser launch')
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}
