import { Report } from '../models/Report.js';
import { emailService } from '../services/email/emailService.js';

export const getReports = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reports = await Report.find({ userId }).populate('runId').sort({ createdAt: -1 });

    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const report = await Report.findOne({ _id: req.params.id, userId }).populate('runId');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
};

export const retryEmailReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const report = await Report.findOne({ _id: req.params.id, userId });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const emailRes = await emailService.sendRunSummaryEmail({
      toEmail: req.user.email,
      userName: req.user.name,
      summaryData: report.summary,
      reportUrl: report.reportUrl,
    });

    if (emailRes.sent) {
      report.status = 'emailed';
      report.emailError = null;
      await report.save();

      return res.json({
        success: true,
        message: 'Report emailed successfully.',
      });
    } else {
      report.status = 'email_failed';
      report.emailError = emailRes.error || 'Failed to send';
      await report.save();

      return res.status(500).json({
        success: false,
        message: `Failed to deliver email: ${emailRes.error || emailRes.reason}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

