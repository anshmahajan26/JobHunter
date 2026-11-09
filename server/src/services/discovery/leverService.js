import axios from 'axios';
import { JobSourceAdapter } from './jobSourceAdapter.js';

export class LeverService extends JobSourceAdapter {
  constructor() {
    super('lever');
    this.baseUrl = 'https://api.lever.co/v0/postings';
    this.client = axios.create({
      timeout: 25000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobPilot-AI-Agent/1.0',
      },
    });
  }

  async fetchJobs(companyIdentifier) {
    try {
      const url = `${this.baseUrl}/${companyIdentifier}?mode=json`;
      const response = await this.client.get(url);

      if (!Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((item) => this.normalizeJob(item, companyIdentifier));
    } catch (error) {
      console.error(`[Lever Adapter Error] Failed for company '${companyIdentifier}': ${error.message}`);
      throw error;
    }
  }

  normalizeJob(item, companyIdentifier) {
    const locationName = item.categories?.location || item.workplaceType || 'Remote / Unspecified';
    const workplaceType = (item.workplaceType || locationName).toLowerCase().includes('remote')
      ? 'remote'
      : (item.workplaceType || locationName).toLowerCase().includes('hybrid')
      ? 'hybrid'
      : 'onsite';

    const fullDescription = [item.description, item.additional]
      .filter(Boolean)
      .join('\n\n') || item.descriptionPlain || 'No description provided.';

    return {
      source: 'lever',
      sourceJobId: String(item.id),
      company: companyIdentifier.charAt(0).toUpperCase() + companyIdentifier.slice(1),
      companyIdentifier,
      title: item.text?.trim() || 'Untitled Position',
      // PRESERVE ORIGINAL verbatim job description without rewriting
      originalDescription: fullDescription,
      originalSourceData: item,
      location: locationName,
      workplaceType,
      employmentType: item.categories?.commitment || 'Full-time',
      applicationUrl: item.applyUrl || item.hostedUrl,
      postedAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      discoveredAt: new Date(),
    };
  }

  async checkHealth(companyIdentifier) {
    try {
      const res = await this.client.get(`${this.baseUrl}/${companyIdentifier}?mode=json`);
      return { healthy: res.status === 200, count: res.data.length };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export const leverService = new LeverService();

