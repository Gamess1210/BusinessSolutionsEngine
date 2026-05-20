import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function generatePdf(html) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[BSE] generatePdf: skipping in local dev (NODE_ENV !== production)')
    return null
  }
  let browser
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  } catch (err) {
    console.warn('[BSE] generatePdf: chromium failed to launch, skipping PDF generation:', err.message)
    return null
  }
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return page.pdf({ format: 'A4', printBackground: true })
  } finally {
    await browser.close()
  }
}
