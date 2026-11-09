export class LeverAdapter {
  constructor() {
    this.name = 'lever';
  }

  isMatchingUrl(url) {
    if (!url) return false;
    return url.includes('lever.co') || url.includes('jobs.lever.co');
  }

  async resolveTarget(page) {
    // If on job landing page without application form, look for "Apply for this job" link
    try {
      const applyBtn = await page.$(
        'a.postings-btn, a:has-text("Apply for this job"), a:has-text("Apply Now")'
      );
      if (applyBtn && (await applyBtn.isVisible())) {
        await applyBtn.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {}

    return { target: page, isIframe: false };
  }

  async fillApplication(page, candidateData, resumeFilePath) {
    const results = { filledFields: [], errors: [], target: page, formStats: {} };

    await this.resolveTarget(page);
    results.target = page;

    try {
      // Full name
      if (await page.$('input[name="name"]')) {
        await page.fill('input[name="name"]', candidateData.fullName);
        results.filledFields.push('Full Name');
      }

      // Email
      if (await page.$('input[name="email"]')) {
        await page.fill('input[name="email"]', candidateData.email);
        results.filledFields.push('Email');
      }

      // Phone
      if (await page.$('input[name="phone"]')) {
        await page.fill('input[name="phone"]', candidateData.phone || '');
        results.filledFields.push('Phone');
      }

      // Current Company / Organization
      if (candidateData.currentCompany && (await page.$('input[name="org"]'))) {
        await page.fill('input[name="org"]', candidateData.currentCompany);
        results.filledFields.push('Current Organization');
      }

      // URLs
      if (candidateData.linkedinUrl && (await page.$('input[name*="LinkedIn" i]'))) {
        await page.fill('input[name*="LinkedIn" i]', candidateData.linkedinUrl);
        results.filledFields.push('LinkedIn URL');
      }

      if (candidateData.githubUrl && (await page.$('input[name*="GitHub" i]'))) {
        await page.fill('input[name*="GitHub" i]', candidateData.githubUrl);
        results.filledFields.push('GitHub URL');
      }

      if (candidateData.portfolioUrl && (await page.$('input[name*="Portfolio" i], input[name*="Other" i]'))) {
        await page.fill('input[name*="Portfolio" i], input[name*="Other" i]', candidateData.portfolioUrl);
        results.filledFields.push('Portfolio URL');
      }

      // Attach resume
      if (resumeFilePath) {
        const fileInput = await page.$('input[type="file"][name="resume"], input[type="file"]');
        if (fileInput) {
          try {
            await fileInput.setInputFiles(resumeFilePath);
            results.filledFields.push('Resume File Upload');
          } catch (e) {
            results.errors.push(`Resume file upload failed: ${e.message}`);
          }
        }
      }

      // Scan target for remaining unfilled required fields & anti-bot gates
      results.formStats = await page.evaluate(() => {
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
    try {
      const confirmationSelector =
        '.application-confirmation, h2:has-text("Thank you"), :text("application has been submitted"), :text("Thanks for applying")';
      const el = await page.waitForSelector(confirmationSelector, { timeout: 8000 });
      if (el) {
        const text = await el.innerText();
        return {
          verified: true,
          confirmationText: text.slice(0, 200),
          confirmationUrl: page.url(),
        };
      }
    } catch (e) {}

    if (page.url().includes('thanks') || page.url().includes('confirmation') || page.url().includes('applied')) {
      return {
        verified: true,
        confirmationText: 'Confirmed via landing page URL redirection.',
        confirmationUrl: page.url(),
      };
    }

    return { verified: false };
  }
}

export const leverAdapter = new LeverAdapter();
