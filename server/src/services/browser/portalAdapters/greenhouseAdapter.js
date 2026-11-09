export class GreenhouseAdapter {
  constructor() {
    this.name = 'greenhouse';
  }

  isMatchingUrl(url) {
    if (!url) return false;
    return (
      url.includes('greenhouse.io') ||
      url.includes('boards.greenhouse.io') ||
      url.includes('job-boards.greenhouse.io') ||
      url.includes('gh_jid=')
    );
  }

  /**
   * Resolves the target execution context (top page or greenhouse iframe)
   * and expands the application form if collapsed behind an 'Apply Now' button.
   */
  async resolveTarget(page) {
    // 1. If an "Apply Now" button exists on the landing page, click it to reveal the form
    try {
      const applyBtn = await page.$(
        'button.apply-btn, button:has-text("Apply Now"), a:has-text("Apply Now"), a[href*="#app"], button:has-text("Apply for this job")'
      );
      if (applyBtn && (await applyBtn.isVisible())) {
        await applyBtn.click();
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      // Continue even if button click fails
    }

    // 2. Check for embedded Greenhouse iframe
    try {
      const iframeEl = await page.$(
        'iframe#grnhse_iframe, iframe[src*="greenhouse.io"], iframe[src*="job-boards.greenhouse.io"]'
      );
      if (iframeEl) {
        const frame = await iframeEl.contentFrame();
        if (frame) {
          return { target: frame, isIframe: true };
        }
      }
    } catch (e) {}

    return { target: page, isIframe: false };
  }

  async fillApplication(page, candidateData, resumeFilePath) {
    const results = { filledFields: [], errors: [], target: page, formStats: {} };

    const { target, isIframe } = await this.resolveTarget(page);
    results.target = target;

    // Fill First Name & Last Name
    const firstName = candidateData.fullName?.split(' ')[0] || '';
    const lastName = candidateData.fullName?.split(' ').slice(1).join(' ') || 'Applicant';

    try {
      const fNameInput = await target.$('#first_name, input[name*="first_name" i]');
      if (fNameInput) {
        await fNameInput.fill(firstName);
        results.filledFields.push('First Name');
      }

      const lNameInput = await target.$('#last_name, input[name*="last_name" i]');
      if (lNameInput) {
        await lNameInput.fill(lastName);
        results.filledFields.push('Last Name');
      }

      const emailInput = await target.$('#email, input[type="email"]');
      if (emailInput) {
        await emailInput.fill(candidateData.email);
        results.filledFields.push('Email');
      }

      const phoneInput = await target.$('#phone, input[type="tel"]');
      if (phoneInput && candidateData.phone) {
        await phoneInput.fill(candidateData.phone);
        results.filledFields.push('Phone');
      }

      // Attach resume file if file input exists and path is valid
      if (resumeFilePath) {
        const fileInput = await target.$('input[type="file"]#resume, input[type="file"][name*="resume" i], input[type="file"]');
        if (fileInput) {
          try {
            await fileInput.setInputFiles(resumeFilePath);
            results.filledFields.push('Resume File Upload');
          } catch (e) {
            results.errors.push(`Resume file upload failed: ${e.message}`);
          }
        }
      }

      // Fill LinkedIn URL
      if (candidateData.linkedinUrl) {
        const linkedinInput = await target.$('input[name*="linkedin" i], input[id*="linkedin" i]');
        if (linkedinInput) {
          await linkedinInput.fill(candidateData.linkedinUrl);
          results.filledFields.push('LinkedIn URL');
        }
      }

      // Fill GitHub / Website URL
      if (candidateData.githubUrl) {
        const ghInput = await target.$('input[name*="github" i], input[id*="github" i], input[name*="website" i]');
        if (ghInput) {
          await ghInput.fill(candidateData.githubUrl);
          results.filledFields.push('GitHub / Website URL');
        }
      }

      // Scan target for remaining unfilled required fields & anti-bot gates
      results.formStats = await target.evaluate(() => {
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
    } catch (err) {
      results.errors.push(`Form filling error: ${err.message}`);
    }

    return results;
  }

  async verifySubmission(target, page) {
    const confirmationSelector =
      '#application_confirmation, .application-submitted, h1:has-text("Thank you"), h2:has-text("submitted"), :text("Your application was submitted"), :text("Merci pour votre candidature"), :text("Application submitted")';

    try {
      // Check target (frame or page)
      const el = await target.waitForSelector(confirmationSelector, { timeout: 8000 });
      if (el) {
        const text = await el.innerText();
        return {
          verified: true,
          confirmationText: text.slice(0, 200),
          confirmationUrl: page.url(),
        };
      }
    } catch (e) {}

    // Check main page URL change
    if (
      page.url().includes('confirmation') ||
      page.url().includes('thank_you') ||
      page.url().includes('applied') ||
      page.url().includes('success')
    ) {
      return {
        verified: true,
        confirmationText: 'Confirmation URL redirection verified.',
        confirmationUrl: page.url(),
      };
    }

    return { verified: false };
  }
}

export const greenhouseAdapter = new GreenhouseAdapter();
