import { ipcMain } from "electron";
import { app } from "electron";
import { randomUUID } from "crypto";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync } from "fs";
import axios from "axios";
import { readSettings, writeSettings } from "../../main/settings";

// Machine ID generation and storage
const MACHINE_ID_FILE = join(app.getPath("userData"), "machine-id.json");

interface MachineIdData {
  machineId: string;
  createdAt: string;
}

function getMachineId(): string {
  try {
    if (existsSync(MACHINE_ID_FILE)) {
      const data = JSON.parse(
        readFileSync(MACHINE_ID_FILE, "utf-8"),
      ) as MachineIdData;
      return data.machineId;
    }

    // Generate new machine ID
    const machineId = randomUUID();
    const data: MachineIdData = {
      machineId,
      createdAt: new Date().toISOString(),
    };

    writeFileSync(MACHINE_ID_FILE, JSON.stringify(data, null, 2));
    return machineId;
  } catch (error) {
    console.error("Failed to get machine ID:", error);
    // Fallback to a random UUID if file operations fail
    return randomUUID();
  }
}

// Authentication handlers
export function registerAuthHandlers() {
  // Get machine ID
  ipcMain.handle("get-machine-id", async () => {
    try {
      return { machineId: getMachineId() };
    } catch (error) {
      console.error("Error getting machine ID:", error);
      throw new Error("Failed to get machine ID");
    }
  });

  // Login with website callback
  ipcMain.handle("auth-login", async (event, { machineId, _callbackUrl }) => {
    try {
      let authData;

      // For desktop authentication, we should open the browser to the auth page
      // and wait for the deep link callback. The actual authentication happens
      // on the website, which then sends the result back via deep link.

      // For now, create a temporary authentication for offline mode
      // This allows the app to work without requiring the full OAuth flow
      console.log("Creating temporary authentication for offline mode");
      const tempApiKey = `temp-${machineId}-${Date.now()}`;
      authData = {
        success: true,
        user: {
          id: `temp-user-${machineId}`,
          email: "user@offline.local",
          plan: "free",
          machineId: machineId,
        },
        apiKey: tempApiKey,
      };
      console.log("Created temporary authentication for offline mode");

      // Store API key in settings
      const currentSettings = readSettings();
      writeSettings({
        ...currentSettings,
        xibeApiKey: { value: authData.apiKey },
      });

      return {
        success: true,
        user: authData.user,
        apiKey: authData.apiKey,
      };
    } catch (error) {
      console.error("Error during authentication:", error);
      throw new Error(
        error instanceof Error ? error.message : "Authentication failed",
      );
    }
  });

  // Logout
  ipcMain.handle("auth-logout", async () => {
    try {
      // Clear API key from settings
      const currentSettings = readSettings();
      writeSettings({
        ...currentSettings,
        xibeApiKey: undefined,
      });
      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Logout failed");
    }
  });

  // Check authentication status
  ipcMain.handle("auth-status", async () => {
    try {
      // Check if user has a valid API key in settings
      const settings = readSettings();
      const apiKey = settings?.xibeApiKey?.value;

      if (apiKey && apiKey !== "Not Set" && !apiKey.startsWith("Invalid Key")) {
        // In a real implementation, you would validate this API key with your backend
        // For now, assume if an API key exists, the user is authenticated
        // This is a placeholder for actual backend validation
        try {
          const response = await axios.get(
            `http://localhost:3000/api/keyStatus`,
            {
              headers: { "x-api-key": apiKey },
              timeout: 5000, // 5 second timeout
            },
          );

          if (response.data.valid) {
            const keyData = response.data.keyData;
            return {
              isAuthenticated: true,
              user: {
                id: keyData.userId,
                email: keyData.email || "unknown@example.com",
                plan: keyData.planType,
                machineId: keyData.machineId || "unknown",
                apiKey: apiKey,
              },
            };
          }
        } catch (error) {
          console.error("API key validation failed:", error);
          // If API key validation fails due to network/server issues,
          // still allow authentication if we have a valid-looking API key
          if (apiKey && apiKey.length > 10 && !apiKey.startsWith("Invalid")) {
            console.log(
              "Backend server unavailable, but API key looks valid - allowing authentication",
            );
            return {
              isAuthenticated: true,
              user: {
                id: "offline-user",
                email: "user@offline.local",
                plan: "free",
                machineId: "offline",
                apiKey: apiKey,
              },
            };
          }
          // If API key validation fails, treat as not authenticated
        }
      }

      return {
        isAuthenticated: false,
        user: null,
      };
    } catch (error) {
      console.error("Error checking auth status:", error);
      throw new Error("Failed to check authentication status");
    }
  });

  // Validate machine ID against user's account
  ipcMain.handle("validate-machine-id", async (_event, _params) => {
    try {
      // This would validate that the machine ID is associated with the user account
      // For now, we'll simulate this validation
      return {
        valid: true,
        plan: "free", // or "pro"
        maxMachines: 1, // or 5 for pro users
      };
    } catch (error) {
      console.error("Error validating machine ID:", error);
      throw new Error("Failed to validate machine ID");
    }
  });
}
