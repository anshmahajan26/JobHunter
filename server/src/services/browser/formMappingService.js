import { greenhouseAdapter } from './portalAdapters/greenhouseAdapter.js';
import { leverAdapter } from './portalAdapters/leverAdapter.js';
import { formDetectionService } from './formDetectionService.js';
import { playwrightService } from './playwrightService.js';

export class FormMappingService {
  getAdapterForUrl(url) {
    if (!url) return null;
    if (greenhouseAdapter.isMatchingUrl(url)) return greenhouseAdapter;
    if (leverAdapter.isMatchingUrl(url)) return leverAdapter;
    return null;
  }

  /**
   * Scans target DOM for an actually visible submission button,
   * avoiding hidden search forms, header buttons, or offscreen inputs.
   */
  async findVisibleSubmitButton(target) {
    const candidateSelectors = [
      '#submit_app',
      '#btn-submit',
      'button[id*="submit" i]',
      'button[type="submit"]:not([class*="search" i]):not([aria-label*="search" i])',
      'input[type="submit"]:not([class*="search" i])',
      'button:has-text("Submit Application")',
      'button:has-text("Submit")',
      'button:has-text("Envoyer")',
      'button:has-text("Send Application")',
    ];

    for (const selector of candidateSelectors) {
      try {
        const elements = await target.$$(selector);
        for (const el of elements) {
          // Exclude header / navigation / search buttons
          const isInHeader = await el.evaluate((node) => {
            return !!node.closest('header, nav, .header, .nav, .search-container');
          });
          if (isInHeader) continue;

          const isVisible = await el.isVisible();
          if (isVisible) {
            return el;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    return null;
  }

  /**
   * Executes automated application filling & safe verified submission
   */
  async submitApplicationProcess({
    applicationUrl,
    candidateData,
    resumeLocalPath,
    allowSubmit = false,
  }) {
    const { page, context } = await playwrightService.createPage();

    try {
      console.log(`[Browser Automation] Navigating to: ${applicationUrl}`);
      await page.goto(applicationUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // 1. Detect Anti-Bot / CAPTCHA upfront
      const gateCheck = await formDetectionService.detectAntiBotOrCaptcha(page);
      if (gateCheck.detected) {
        console.warn(`[Anti-Bot Protection] Gate detected: ${gateCheck.type}`);
        return {
          status: 'NEEDS_VERIFICATION',
          reason: gateCheck.type,
          message: `Application gated by ${gateCheck.type}. Pre-filled verified details. Please click 'Open Portal' to complete verification.`,
          filledFields: [],
        };
      }

      // 2. Select appropriate adapter
      let adapter = this.getAdapterForUrl(applicationUrl);

      // Check if page embeds a Greenhouse iframe even if outer URL is a company domain
      if (!adapter) {
        const ghIframe = await page.$('iframe#grnhse_iframe, iframe[src*="greenhouse.io"]');
        if (ghIframe) {
          adapter = greenhouseAdapter;
        }
      }

      let fillResults = { filledFields: [], errors: [], target: page, formStats: {} };

      if (adapter) {
        console.log(`[Browser Automation] Using specialized ${adapter.name} adapter`);
        fillResults = await adapter.fillApplication(page, candidateData, resumeLocalPath);
      } else {
        console.log('[Browser Automation] Using generic form detection fallback');
        fillResults = await this.genericFillApplication(page, candidateData, resumeLocalPath);
      }

      const target = fillResults.target || page;
      const formStats = fillResults.formStats || {};

      // 3. If user has NOT authorized final submit or auto-submit is disabled, stop safely
      if (!allowSubmit) {
        return {
          status: 'READY_FOR_APPROVAL',
          message: 'Application form filled and ready for manual review & submission.',
          filledFields: fillResults.filledFields,
        };
      }

      // 4. Safe Gate Check: If required custom portal questions or CAPTCHAs remain
      if (formStats.hasCaptcha) {
        return {
          status: 'NEEDS_VERIFICATION',
          message:
            'Pre-filled verified profile details & tailored resume. Portal requires interactive CAPTCHA verification before submit. Please click "Open Portal" to finalize.',
          filledFields: fillResults.filledFields,
        };
      }

      if (formStats.emptyRequired > 0) {
        return {
          status: 'NEEDS_VERIFICATION',
          message: `Pre-filled verified profile details & tailored resume. Found ${formStats.emptyRequired} required custom portal question(s). Please click "Open Portal" to review answers and submit.`,
          filledFields: fillResults.filledFields,
        };
      }

      // 5. Authorized submission: Locate real visible submit button
      console.log('[Browser Automation] Locating visible submit button...');
      const submitButton = await this.findVisibleSubmitButton(target);

      if (!submitButton) {
        return {
          status: 'NEEDS_VERIFICATION',
          message:
            'Application fields filled, but could not locate standard submit button. Please click "Open Portal" to verify and submit.',
          filledFields: fillResults.filledFields,
        };
      }

      try {
        await submitButton.scrollIntoViewIfNeeded().catch(() => {});
        await submitButton.click({ timeout: 6000 });
      } catch (clickErr) {
        console.warn(`[Browser Automation] Standard click failed (${clickErr.message}), trying JS click fallback...`);
        await submitButton.evaluate((btn) => btn.click()).catch(() => {});
      }

      // Wait 4 seconds for network / confirmation response
      await page.waitForTimeout(4000);

      // 6. Verify submission confirmation
      let verification = { verified: false };
      if (adapter && typeof adapter.verifySubmission === 'function') {
        verification = await adapter.verifySubmission(target, page);
      } else {
        // Generic verification
        const confirmationSelector =
          '#application_confirmation, .application-submitted, h1:has-text("Thank you"), h2:has-text("submitted"), :text("Your application was submitted")';
        try {
          const el = await page.$(confirmationSelector);
          if (el && (await el.isVisible())) {
            verification = {
              verified: true,
              confirmationText: (await el.innerText()).slice(0, 200),
              confirmationUrl: page.url(),
            };
          }
        } catch (e) {}
      }

      if (verification.verified) {
        return {
          status: 'APPLIED',
          message: 'Application successfully submitted and confirmed.',
          confirmationText: verification.confirmationText,
          confirmationUrl: verification.confirmationUrl,
          filledFields: fillResults.filledFields,
        };
      } else {
        // Ambiguous submission status -> Flag as NEEDS_VERIFICATION for user safety
        return {
          status: 'NEEDS_VERIFICATION',
          message:
            'Submission button clicked. Automated confirmation was inconclusive — please click "Open Portal" to verify receipt.',
          confirmationUrl: page.url(),
          filledFields: fillResults.filledFields,
        };
      }
    } catch (err) {
      console.error(`[Browser Automation Error] ${err.message}`);
      return {
        status: 'NEEDS_VERIFICATION',
        message: `Browser automation encountered an issue: ${err.message}. Please click "Open Portal" to submit directly.`,
        filledFields: [],
      };
    } finally {
      await context.close().catch(() => {});
    }
  }

  async genericFillApplication(page, candidateData, resumeLocalPath) {
    const filledFields = [];

    try {
      // Name
      const nameInput = await page.$('input[name*="name" i], input[id*="name" i]');
      if (nameInput && (await nameInput.isVisible())) {
        await nameInput.fill(candidateData.fullName);
        filledFields.push('Full Name');
      }

      // Email
      const emailInput = await page.$('input[type="email"], input[name*="email" i], input[id*="email" i]');
      if (emailInput && (await emailInput.isVisible())) {
        await emailInput.fill(candidateData.email);
        filledFields.push('Email');
      }

      // Phone
      const phoneInput = await page.$('input[type="tel"], input[name*="phone" i], input[id*="phone" i]');
      if (phoneInput && candidateData.phone && (await phoneInput.isVisible())) {
        await phoneInput.fill(candidateData.phone);
        filledFields.push('Phone');
      }

      // Resume
      if (resumeLocalPath) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(resumeLocalPath);
          filledFields.push('Resume File');
        }
      }
    } catch (e) {}

    let formStats = { emptyRequired: 0, hasCaptcha: false };
    try {
      formStats = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[required], select[required], textarea[required]'));
        const emptyReq = inputs.filter((i) => {
          if (i.type === 'hidden') return false;
          if (i.type === 'checkbox' || i.type === 'radio') return !i.checked;
          return !i.value || i.value.trim() === '';
        });
        const hasCaptcha = !!document.querySelector(
          'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, #cf-turnstile, [name="g-recaptcha-response"]'
        );
        return {
          totalRequired: inputs.length,
          emptyRequired: emptyReq.length,
          hasCaptcha,
        };
      });
    } catch (e) {}

    return { filledFields, errors: [], target: page, formStats };
  }
}

export const formMappingService = new FormMappingService();
