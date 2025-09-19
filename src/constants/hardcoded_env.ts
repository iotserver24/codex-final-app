/**
 * Hardcoded environment variables for the application
 * These values are embedded in the build and not exposed in .env files
 */

export const HARDCODED_ENV = {
  // Polar Billing Configuration
  POLAR_API_KEY: "polar_oat_YGk5dvMoPm8hxRAkgavUkfPaLOvOSUiYNNe1C3zhdpy",
  VITE_POLAR_CHECKOUT_URL:
    "https://buy.polar.sh/polar_cl_Hplhx1gf8FdFKu0ESK71GSpaLMTwTQicLTukH0bpPNi",

  // E2B Configuration
  E2B_API_KEY: "e2b_d7f8f5cdbfadfcb93b2e9ffcc47b35e3b140b6c5",
} as const;

/**
 * Get hardcoded environment variable value
 * @param key - The environment variable key
 * @returns The hardcoded value or undefined if not found
 */
export function getHardcodedEnvVar(key: string): string | undefined {
  return HARDCODED_ENV[key as keyof typeof HARDCODED_ENV];
}
