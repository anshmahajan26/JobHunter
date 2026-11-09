import axios from 'axios';
import { JobSourceAdapter } from './jobSourceAdapter.js';

export class GreenhouseService extends JobSourceAdapter {
  constructor() {
    super('greenhouse');
    this.baseUrl = 'https://boards-api.greenhouse.io/v1/boards';
    this.client = axios.create({
      timeout: 25000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobPilot-AI-Agent/1.0',
      },
    });
  }

  async fetchJobs(boardToken) {
    try {
      // First attempt with content=true for full rich job details
      let url = `${this.baseUrl}/${boardToken}/jobs?content=true`;
      let response;
      try {
        response = await this.client.get(url);
      } catch (err) {
        // If timed out due to massive payload, fallback to lightweight jobs feed
        url = `${this.baseUrl}/${boardToken}/jobs`;
        response = await this.client.get(url);
      }

      if (!response.data || !Array.isArray(response.data.jobs)) {
        return [];
      }

      return response.data.jobs.map((item) => this.normalizeJob(item, boardToken));
    } catch (error) {
      console.error(`[Greenhouse Adapter Error] Failed for board '${boardToken}': ${error.message}`);
      throw error;
    }
  }

  normalizeJob(item, boardToken) {
    const locationName = item.location?.name || 'Remote / Unspecified';
    const workplaceType = locationName.toLowerCase().includes('remote')
      ? 'remote'
      : locationName.toLowerCase().includes('hybrid')
      ? 'hybrid'
      : 'onsite';

    return {
      source: 'greenhouse',
      sourceJobId: String(item.id),
      company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
      companyIdentifier: boardToken,
      title: item.title?.trim() || 'Untitled Position',
      // PRESERVE ORIGINAL verbatim job description without rewriting
      originalDescription: item.content || 'No description provided.',
      originalSourceData: item,
      location: locationName,
      workplaceType,
      employmentType: 'Full-time',
      applicationUrl: item.absolute_url,
      postedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
      discoveredAt: new Date(),
    };
  }

  async checkHealth(boardToken) {
    try {
      const res = await this.client.get(`${this.baseUrl}/${boardToken}`);
      return { healthy: res.status === 200, status: res.status };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export const greenhouseService = new GreenhouseService();

