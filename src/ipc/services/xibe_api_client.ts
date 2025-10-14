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
  // Production API server at https://api.xibe.app
  public readonly baseUrl = "https://api.xibe.app";
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
    console.log(
      "XibeApiClient: Using API key:",
      this.apiKey?.substring(0, 8) + "...",
    );
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
      console.log("XibeApiClient: Checking API key validity...");
      const response = await fetch(`${this.baseUrl}/api/verifyApiKeyInfo`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = await response.json();
      console.log(
        "XibeApiClient: API key check response:",
        response.status,
        data,
      );

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
      const response = await fetch(`${this.baseUrl}/api/getUsageCount`, {
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
      console.log("XibeApiClient: Decrementing usage...");
      const response = await fetch(`${this.baseUrl}/api/decrementUsage`, {
        method: "POST",
        headers: this.getHeaders(),
      });

      const data = await response.json();
      console.log(
        "XibeApiClient: Usage decrement response:",
        response.status,
        data,
      );

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
    console.log("XibeApiClient: Ensuring usage is available...");
    const usage = await this.getUsageCount();
    console.log("XibeApiClient: Usage check result:", usage);

    if (!usage.valid) {
      console.error("XibeApiClient: Invalid API key detected");
      throw new Error("Invalid API key");
    }

    if (usage.remaining <= 0) {
      console.error("XibeApiClient: Daily limit exceeded");
      throw new Error(`Daily limit exceeded. Plan: ${usage.planName}`);
    }

    console.log("XibeApiClient: Usage available, proceeding with AI request");
    return usage;
  }
}
