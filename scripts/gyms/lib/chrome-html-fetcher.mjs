import path from "node:path";
import { assertNotChallengeHtml } from "./importer-output-validation.mjs";

export async function createChromeHtmlFetcher({
  sourceLabel,
  defaultProfilePath,
  cwd = process.cwd(),
  profilePath,
  log = console.log,
  env = process.env,
} = {}) {
  const { chromium } = await import("playwright-core");
  const executablePath =
    env.GOOGLE_CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const userDataDir = path.resolve(cwd, profilePath ?? defaultProfilePath);

  log(`Opening Google Chrome for ${sourceLabel} with profile ${userDataDir}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: false,
    viewport: null,
  });
  const existingPages = context.pages();
  const page = existingPages[0] ?? (await context.newPage());

  return {
    async fetchHtml(url) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      let html = await readStablePageContent(page);
      if (isChallengeHtml(html)) {
        log(
          `${sourceLabel} is waiting for browser verification. Complete it in the opened Chrome window.`
        );
        await page.waitForFunction(
          () =>
            !document.documentElement.innerHTML.match(
              /\.well-known\/sgcaptcha|cf-chl-|challenge-platform|<title[^>]*>\s*captcha|verify you are human/i
            ),
          undefined,
          { timeout: 180000 }
        );
        await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
        html = await readStablePageContent(page);
      }
      assertNotChallengeHtml(html, `${sourceLabel} response from ${url}`);
      return html;
    },
    async close() {
      await context.close();
    },
  };
}

async function readStablePageContent(page) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
      return await page.content();
    } catch (error) {
      lastError = error;
      if (!/navigating|navigation/i.test(String(error)) || attempt === 3) {
        throw error;
      }
    }
  }
  throw lastError;
}

function isChallengeHtml(html) {
  return /\.well-known\/sgcaptcha|cf-chl-|challenge-platform|<title[^>]*>\s*captcha|verify you are human/i.test(
    html
  );
}
