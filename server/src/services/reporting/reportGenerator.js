import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { uploadFile } from '../../config/cloudinary.js';
import { Report } from '../../models/Report.js';
import { isGeminiQuotaExceeded } from '../ai/jobScoringService.js';

export class ReportGenerator {
  /**
   * Generates a 5-sheet comprehensive Excel report using ExcelJS
   */
  async generateRunReport({ userId, runId, summaryData, discoveredJobs, applications, pendingActions, errors }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JobPilot AI Agent';
    workbook.created = new Date();

    // -----------------------------------------------------------------
    // Sheet 1: Summary
    // -----------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: '4F46E5' } } });
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 30 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };

    const quotaDepleted = isGeminiQuotaExceeded();

    summarySheet.addRows([
      { metric: 'Run ID', value: String(runId) },
      { metric: 'Run Date', value: new Date().toLocaleString() },
      { metric: 'AI Matching Engine', value: quotaDepleted ? 'Built-in Deterministic (0 Gemini tokens remaining)' : 'Google Gemini AI' },
      { metric: 'AI Token Quota Status', value: quotaDepleted ? 'Exhausted (429 - 0 Free Tokens Remaining. Upgrade plan at ai.google.dev)' : 'Active / Operational' },
      { metric: 'Jobs Discovered Across Boards', value: summaryData.discovered || 0 },
      { metric: 'Jobs Matched Profile', value: summaryData.matched || 0 },
      { metric: 'Applications Submitted', value: summaryData.submitted || 0 },
      { metric: 'Pending Actions Requiring User', value: summaryData.pending || 0 },
      { metric: 'Failed Submissions', value: summaryData.failed || 0 },
      { metric: 'Dismissed Jobs', value: summaryData.dismissed || 0 },
    ]);

    // -----------------------------------------------------------------
    // Sheet 2: Discovered Jobs
    // -----------------------------------------------------------------
    const jobsSheet = workbook.addWorksheet('Discovered Jobs');
    jobsSheet.columns = [
      { header: 'Company', key: 'company', width: 22 },
      { header: 'Job Title', key: 'title', width: 35 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Match Score', key: 'matchScore', width: 15 },
      { header: 'Posting Date', key: 'postedAt', width: 20 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Original Application URL', key: 'applicationUrl', width: 50 },
    ];
    jobsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    jobsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };

    (discoveredJobs || []).forEach((j) => {
      jobsSheet.addRow({
        company: j.company,
        title: j.title,
        location: j.location,
        matchScore: j.matchScore || 'N/A',
        postedAt: j.postedAt ? new Date(j.postedAt).toLocaleDateString() : 'Recent',
        source: j.source,
        applicationUrl: j.applicationUrl,
      });
    });

    // -----------------------------------------------------------------
    // Sheet 3: Applications
    // -----------------------------------------------------------------
    const appsSheet = workbook.addWorksheet('Applications');
    appsSheet.columns = [
      { header: 'Company', key: 'company', width: 22 },
      { header: 'Job Title', key: 'title', width: 35 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Submission Method', key: 'method', width: 20 },
      { header: 'Submission Date', key: 'date', width: 20 },
      { header: 'Confirmation Details', key: 'confirmation', width: 40 },
    ];
    appsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    appsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '16A34A' } };

    (applications || []).forEach((a) => {
      appsSheet.addRow({
        company: a.jobId?.company || a.company || 'N/A',
        title: a.jobId?.title || a.title || 'N/A',
        status: a.status,
        method: a.submissionMethod || 'N/A',
        date: a.submissionTimestamp ? new Date(a.submissionTimestamp).toLocaleString() : 'N/A',
        confirmation: a.confirmationDetails?.confirmationText || 'N/A',
      });
    });

    // -----------------------------------------------------------------
    // Sheet 4: Pending Actions
    // -----------------------------------------------------------------
    const pendingSheet = workbook.addWorksheet('Pending Actions');
    pendingSheet.columns = [
      { header: 'Company', key: 'company', width: 22 },
      { header: 'Job Title', key: 'title', width: 35 },
      { header: 'Pending Reason', key: 'reason', width: 22 },
      { header: 'Required Action', key: 'action', width: 45 },
      { header: 'Application URL', key: 'url', width: 50 },
    ];
    pendingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    pendingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } };

    (pendingActions || []).forEach((p) => {
      pendingSheet.addRow({
        company: p.jobId?.company || 'N/A',
        title: p.jobId?.title || 'N/A',
        reason: p.reason,
        action: p.requiredAction,
        url: p.applicationUrl,
      });
    });

    // -----------------------------------------------------------------
    // Sheet 5: Errors
    // -----------------------------------------------------------------
    const errorsSheet = workbook.addWorksheet('Errors');
    errorsSheet.columns = [
      { header: 'Error Type', key: 'type', width: 22 },
      { header: 'Company / Board', key: 'entity', width: 25 },
      { header: 'Description', key: 'desc', width: 55 },
      { header: 'Timestamp', key: 'time', width: 22 },
      { header: 'Retry Status', key: 'retry', width: 18 },
    ];
    errorsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    errorsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DC2626' } };

    (errors || []).forEach((e) => {
      errorsSheet.addRow({
        type: e.errorType || 'SourceError',
        entity: e.board || e.company || 'System',
        desc: e.error || e.message || 'Error occurred',
        time: new Date().toLocaleString(),
        retry: e.retryStatus || 'Non-retriable',
      });
    });

    const reportDir = path.resolve('uploads/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const fileName = `JobPilot_Report_${userId}_${runId}_${Date.now()}.xlsx`;
    const localFilePath = path.join(reportDir, fileName);

    await workbook.xlsx.writeFile(localFilePath);

    // Upload to Cloudinary / storage
    const uploadResult = await uploadFile(localFilePath, 'reports');

    const report = await Report.create({
      userId,
      runId,
      reportUrl: uploadResult.url,
      reportType: 'excel',
      status: 'generated',
      summary: summaryData,
    });

    return {
      report,
      localFilePath,
      fileUrl: uploadResult.url,
    };
  }
}

export const reportGenerator = new ReportGenerator();

