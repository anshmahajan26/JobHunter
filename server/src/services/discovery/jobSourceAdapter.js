/**
 * Base Abstract Adapter for Job Sources
 */
export class JobSourceAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Fetch jobs from the provider for a given board identifier
   * @param {string} boardIdentifier 
   * @returns {Promise<Array<NormalizedJob>>}
   */
  async fetchJobs(boardIdentifier) {
    throw new Error('fetchJobs() must be implemented by subclass');
  }

  /**
   * Health check for the source
   */
  async checkHealth(boardIdentifier) {
    throw new Error('checkHealth() must be implemented by subclass');
  }
}

