import nodemailer from 'nodemailer';
import { env } from '../../config/environment.js';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;

    if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        },
      });
      this.isConfigured = true;
    }
  }

  /**
   * Sends the Job-Hunt Run summary email
   */
  async sendRunSummaryEmail({ toEmail, userName, summaryData, reportUrl }) {
    if (!this.isConfigured || !this.transporter) {
      console.warn('[Email Service] SMTP credentials not set. Email dispatch skipped.');
      return { sent: false, reason: 'SMTP not configured' };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #4f46e5;">JobPilot AI — Run Summary</h2>
        <p>Hello ${userName},</p>
        <p>Your autonomous job hunt run has completed. Here is the operational summary:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Jobs Discovered</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${summaryData.discovered || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Jobs Matched</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${summaryData.matched || 0}</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Applications Submitted</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #16a34a;">${summaryData.submitted || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">Pending Actions Requiring You</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #d97706;">${summaryData.pending || 0}</td>
          </tr>
        </table>

        ${
          reportUrl
            ? `<p><a href="${reportUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Full Excel Report</a></p>`
            : ''
        }

        <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
          JobPilot AI Autonomous System • Confidential & Scoped to your profile
        </p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: `JobPilot AI: Job Hunt Summary — ${summaryData.submitted || 0} Applied, ${summaryData.pending || 0} Action Needed`,
        html: htmlContent,
      });

      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Dispatch Error] ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  /**
   * Sends an immediate alert when human action is required (e.g. CAPTCHA, OTP, personal experience)
   */
  async sendActionRequiredAlert({ toEmail, userName, company, reason, question, linkUrl }) {
    if (!this.isConfigured || !this.transporter) return { sent: false };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #d97706;">Action Required: Job Application for ${company}</h2>
        <p>Hello ${userName},</p>
        <p>The JobPilot AI agent encountered a step requiring your direct input:</p>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p><strong>Reason:</strong> ${reason}</p>
          ${question ? `<p><strong>Question:</strong> "${question}"</p>` : ''}
        </div>
        <p><a href="${linkUrl || env.CLIENT_URL}" style="background-color: #d97706; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Resolve on Dashboard</a></p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: `JobPilot Action Required: ${company} Application`,
        html: htmlContent,
      });
      return { sent: true };
    } catch (e) {
      return { sent: false, error: e.message };
    }
  }
}

export const emailService = new EmailService();

