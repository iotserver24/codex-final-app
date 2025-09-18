import {
  fetchPollinationsModels,
  convertPollinationsModelToModelOption,
  type ModelOption,
} from "./language_model_constants";

let cachedModels: ModelOption[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getPollinationsModels(): Promise<ModelOption[]> {
  const now = Date.now();

  // Return cached models if they exist and are not expired
  if (cachedModels && now - lastFetchTime < CACHE_DURATION) {
    return cachedModels;
  }

  try {
    const pollinationsModels = await fetchPollinationsModels();
    cachedModels = pollinationsModels.map(
      convertPollinationsModelToModelOption,
    );
    lastFetchTime = now;
    return cachedModels;
  } catch (error) {
    console.error("Failed to fetch Pollinations models:", error);

    // Return cached models if available, even if expired
    if (cachedModels) {
      return cachedModels;
    }

    // Return empty array if no cached models and fetch failed
    return [];
  }
}

export function clearPollinationsCache(): void {
  cachedModels = null;
  lastFetchTime = 0;
}
