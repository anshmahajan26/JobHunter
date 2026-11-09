import { greenhouseService } from './greenhouseService.js';
import { leverService } from './leverService.js';
import { deduplicationService } from './deduplicationService.js';
import { Job } from '../../models/Job.js';
import { CompanyBoard } from '../../models/CompanyBoard.js';

export const DEFAULT_COMPANY_BOARDS = [
  // Greenhouse boards
  { name: 'Elastic', platform: 'greenhouse', boardIdentifier: 'elastic' },
  { name: 'Figma', platform: 'greenhouse', boardIdentifier: 'figma' },
  { name: 'Stripe', platform: 'greenhouse', boardIdentifier: 'stripe' },
  { name: 'Airbnb', platform: 'greenhouse', boardIdentifier: 'airbnb' },
  { name: 'Discord', platform: 'greenhouse', boardIdentifier: 'discord' },
  { name: 'Datadog', platform: 'greenhouse', boardIdentifier: 'datadog' },
  // Lever boards
  { name: 'Spotify', platform: 'lever', boardIdentifier: 'spotify' },
  { name: 'Palantir', platform: 'lever', boardIdentifier: 'palantir' },
  { name: 'Wealthsimple', platform: 'lever', boardIdentifier: 'wealthsimple' },
];

export class JobDiscoveryService {
  /**
   * Ensures default company boards exist in database
   */
  async seedDefaultBoards() {
    for (const board of DEFAULT_COMPANY_BOARDS) {
      await CompanyBoard.findOneAndUpdate(
        { platform: board.platform, boardIdentifier: board.boardIdentifier },
        { $setOnInsert: board },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Discovers jobs across all active company boards
   * @param {Object} options { maxPostingAgeDays: 7, filterKeywords: [] }
   */
  async runDiscovery(options = {}) {
    const maxAgeDays = options.maxPostingAgeDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    await this.seedDefaultBoards();
    const activeBoards = await CompanyBoard.find({ isActive: true });

    const allDiscovered = [];
    const sourceErrors = [];

    for (const board of activeBoards) {
      try {
        let boardJobs = [];
        if (board.platform === 'greenhouse') {
          boardJobs = await greenhouseService.fetchJobs(board.boardIdentifier);
        } else if (board.platform === 'lever') {
          boardJobs = await leverService.fetchJobs(board.boardIdentifier);
        }

        // Update board sync stats
        board.lastSyncedAt = new Date();
        board.lastJobCount = boardJobs.length;
        board.syncStatus = 'success';
        board.lastError = null;
        await board.save();

        allDiscovered.push(...boardJobs);
      } catch (err) {
        // Record error for specific board but DO NOT halt discovery of other boards
        board.syncStatus = 'error';
        board.lastError = err.message;
        await board.save().catch(() => {});
        sourceErrors.push({
          board: board.name,
          platform: board.platform,
          error: err.message,
        });
        console.warn(`[Discovery Warning] Board ${board.name} (${board.platform}) failed: ${err.message}`);
      }
    }

    // Filter jobs by posting age
    const ageFiltered = allDiscovered.filter((job) => {
      if (!job.postedAt) return true;
      return new Date(job.postedAt) >= cutoffDate;
    });

    // Deduplicate against existing jobs in database
    const newJobsToInsert = await deduplicationService.filterNewJobs(ageFiltered);

    let insertedCount = 0;
    if (newJobsToInsert.length > 0) {
      try {
        const result = await Job.insertMany(newJobsToInsert, { ordered: false });
        insertedCount = result.length;
      } catch (insertErr) {
        // If some duplicates collided on unique compound index, count successfully inserted
        if (insertErr.insertedDocs) {
          insertedCount = insertErr.insertedDocs.length;
        }
      }
    }

    // Retrieve recent active jobs from database
    const availableJobs = await Job.find({
      isActive: true,
      postedAt: { $gte: cutoffDate },
    }).sort({ postedAt: -1 }).limit(100);

    return {
      discoveredCount: allDiscovered.length,
      ageFilteredCount: ageFiltered.length,
      newInsertedCount: insertedCount,
      totalActiveAvailable: availableJobs.length,
      errors: sourceErrors,
      jobs: availableJobs,
    };
  }
}

export const jobDiscoveryService = new JobDiscoveryService();
