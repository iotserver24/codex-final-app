import log from "electron-log";

export interface XibeUsageInfo {
  valid: boolean;
  userId?: string;
  usage: number;
  limit: number;
  remaining: number;
  resetTime: string;
  planType: string;
  planName: string;
}

export interface XibeApiResponse {
  valid: boolean;
  success?: boolean;
  message?: string;
  userId?: string;
  usage: number;
  limit: number;
  remaining: number;
  resetTime: string;
  planType: string;
  planName: string;
  error?: string;
}

export class XibeApiClient {
  private baseUrl = "https://api.xibe.app/api";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error("Xibe API key is required");
    }
    return {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Check if API key is valid and get usage info (doesn't consume usage)
   */
  async verifyApiKeyInfo(): Promise<XibeUsageInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/verifyApiKeyInfo`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error("Xibe API verification failed:", data);
        throw new Error(data.error || "API verification failed");
      }

      return data;
    } catch (error) {
      log.error("Error verifying Xibe API key:", error);
      throw error;
    }
  }

  /**
   * Get current usage count (doesn't consume usage)
   */
  async getUsageCount(): Promise<XibeUsageInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/getUsageCount`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error("Xibe API usage check failed:", data);
        throw new Error(data.error || "Usage check failed");
      }

      return data;
    } catch (error) {
      log.error("Error getting Xibe usage count:", error);
      throw error;
    }
  }

  /**
   * Decrement usage count by 1 (use after successful API call)
   */
  async decrementUsage(): Promise<XibeApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/decrementUsage`, {
        method: "POST",
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error("Xibe API usage decrement failed:", data);
        throw new Error(data.error || "Usage decrement failed");
      }

      return data;
    } catch (error) {
      log.error("Error decrementing Xibe usage:", error);
      throw error;
    }
  }

  /**
   * Check if user has remaining usage
   */
  async hasRemainingUsage(): Promise<boolean> {
    try {
      const usage = await this.getUsageCount();
      return usage.valid && usage.remaining > 0;
    } catch (error) {
      log.error("Error checking remaining usage:", error);
      return false;
    }
  }

  /**
   * Get usage info and throw error if no remaining usage
   */
  async ensureUsageAvailable(): Promise<XibeUsageInfo> {
    const usage = await this.getUsageCount();

    if (!usage.valid) {
      throw new Error("Invalid API key");
    }

    if (usage.remaining <= 0) {
      throw new Error(`Daily limit exceeded. Plan: ${usage.planName}`);
    }

    return usage;
  }
}
