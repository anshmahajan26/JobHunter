import { Job } from '../../models/Job.js';
import { Application } from '../../models/Application.js';

export class DeduplicationService {
  /**
   * Filters out already existing jobs in DB by source + sourceJobId and canonical applicationUrl
   */
  async filterNewJobs(jobs) {
    if (!jobs || jobs.length === 0) return [];

    const existingKeys = new Set();
    const sourceIds = jobs.map((j) => j.sourceJobId);

    const existingRecords = await Job.find({
      sourceJobId: { $in: sourceIds },
    }).select('source sourceJobId applicationUrl');

    existingRecords.forEach((record) => {
      existingKeys.add(`${record.source}:${record.sourceJobId}`);
      if (record.applicationUrl) {
        existingKeys.add(record.applicationUrl.toLowerCase().trim());
      }
    });

    const uniqueNewJobs = [];
    const seenInBatch = new Set();

    for (const job of jobs) {
      const sourceKey = `${job.source}:${job.sourceJobId}`;
      const urlKey = job.applicationUrl ? job.applicationUrl.toLowerCase().trim() : null;

      if (existingKeys.has(sourceKey)) continue;
      if (urlKey && existingKeys.has(urlKey)) continue;
      if (seenInBatch.has(sourceKey)) continue;
      if (urlKey && seenInBatch.has(urlKey)) continue;

      seenInBatch.add(sourceKey);
      if (urlKey) seenInBatch.add(urlKey);

      uniqueNewJobs.push(job);
    }

    return uniqueNewJobs;
  }

  /**
   * Checks if user has already applied or dismissed a job
   */
  async filterUserActiveJobs(userId, jobs) {
    const jobIds = jobs.map((j) => j._id);
    const existingApps = await Application.find({
      userId,
      jobId: { $in: jobIds },
    }).select('jobId status');

    const excludedJobIds = new Set(
      existingApps
        .filter((app) => ['APPLIED', 'DISMISSED', 'REJECTED', 'OFFER', 'INTERVIEW'].includes(app.status))
        .map((app) => app.jobId.toString())
    );

    return jobs.filter((job) => !excludedJobIds.has(job._id.toString()));
  }
}

export const deduplicationService = new DeduplicationService();

