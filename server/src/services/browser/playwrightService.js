import { chromium } from 'playwright';
import { env } from '../../config/environment.js';

export class PlaywrightService {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      try {
        this.browser = await chromium.launch({
          headless: env.HEADLESS_BROWSER,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
          ],
        });
      } catch (err) {
        console.error(`[Playwright Launch Error] ${err.message}`);
        throw err;
      }
    }
    return this.browser;
  }

  async createPage() {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(env.BROWSER_TIMEOUT_MS);
    return { page, context };
  }

  async closeBrowser() {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const playwrightService = new PlaywrightService();

