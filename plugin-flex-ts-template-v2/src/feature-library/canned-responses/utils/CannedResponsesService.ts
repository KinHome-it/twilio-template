import ApiService from '../../../utils/serverless/ApiService';
import { EncodedParams } from '../../../types/serverless';
import { CannedResponseCategories } from '../types/CannedResponses';
import logger from '../../../utils/logger';

export interface CannedResponsesReponse {
  data: CannedResponseCategories;
}

const RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;

class CannedResponsesService extends ApiService {
  cannedResponseCache: CannedResponsesReponse | null = null;

  fetchCannedResponses = async (): Promise<CannedResponsesReponse> => {
    if (this.cannedResponseCache) {
      return this.cannedResponseCache;
    }

    // Wait for firstName before proceeding
    await this.waitForFirstName();

    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
    };

    try {
      const response = await this.fetchJsonWithReject<CannedResponsesReponse>(
        `${this.serverlessProtocol}://${this.serverlessDomain}/features/canned-responses/flex/chat-responses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildBody(encodedParams),
        },
      );
      this.cannedResponseCache = response;
      return response;
    } catch (error: any) {
      logger.error(`[canned-responses] Error fetching canned responses\r\n`, error);
      throw error;
    }
  };

  private waitForFirstName = async (retryCount = 0): Promise<void> => {
    if (retryCount >= MAX_RETRIES) {
      logger.warn('[canned-responses] Max retries reached waiting for firstName');
      return;
    }

    const tasks = this.manager.store.getState().flex.worker.tasks;
    const firstTask = Array.from(tasks.values())[0];

    if (!firstTask?.attributes?.firstName) {
      logger.info(`[canned-responses] firstName not found, retry ${retryCount + 1} of ${MAX_RETRIES}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      await this.waitForFirstName(retryCount + 1);
    }
  };
}

export default new CannedResponsesService();
