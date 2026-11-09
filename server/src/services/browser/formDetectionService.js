export class FormDetectionService {
  /**
   * Scans the active page for anti-bot / challenge protection gates
   */
  async detectAntiBotOrCaptcha(page) {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="turnstile"]',
      '.g-recaptcha',
      '.h-captcha',
      '#cf-turnstile',
      '[data-sitekey]',
      'input[name*="captcha" i]',
      'div[class*="captcha" i]',
    ];

    for (const selector of captchaSelectors) {
      try {
        const el = await page.$(selector);
        if (el && (await el.isVisible())) {
          return {
            detected: true,
            type: 'captcha',
            selector,
          };
        }
      } catch (e) {
        // Continue checking others
      }
    }

    // Check for OTP fields
    try {
      const otpEl = await page.$(
        'input[name*="otp" i], input[placeholder*="verification code" i], input[id*="otp" i]'
      );
      if (otpEl && (await otpEl.isVisible())) {
        return {
          detected: true,
          type: 'otp',
          selector: 'otp_input',
        };
      }
    } catch (e) {}

    return { detected: false };
  }

  /**
   * Identifies form fields semantically using labels, aria tags, names, and placeholders
   */
  async inspectFormFields(page) {
    return await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll('input:not([type="hidden"]), textarea, select')
      );

      return inputs.map((input) => {
        const id = input.id || '';
        const name = input.name || '';
        const type = input.type || input.tagName.toLowerCase();
        const placeholder = input.placeholder || '';
        const required = input.required || input.getAttribute('aria-required') === 'true';

        // Find associated label text
        let labelText = '';
        if (id) {
          const labelEl = document.querySelector(`label[for="${id}"]`);
          if (labelEl) labelText = labelEl.innerText.trim();
        }
        if (!labelText) {
          const parentLabel = input.closest('label');
          if (parentLabel) labelText = parentLabel.innerText.trim();
        }
        if (!labelText && input.getAttribute('aria-label')) {
          labelText = input.getAttribute('aria-label').trim();
        }

        return {
          id,
          name,
          type,
          placeholder,
          required,
          labelText,
        };
      });
    });
  }
}

export const formDetectionService = new FormDetectionService();

