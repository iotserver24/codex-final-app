import { ipcMain, app } from "electron";
import { randomUUID } from "crypto";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync } from "fs";
// axios no longer used for auth-status validation; keep imports minimal
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

  // Process authentication data from deep link callback
  ipcMain.handle("auth-login", async (event, { authData }) => {
    try {
      if (
        !authData ||
        !authData.success ||
        !authData.user ||
        !authData.apiKey
      ) {
        throw new Error("Invalid authentication data received");
      }

      // Store MACHINE ID as the API key in settings (do not expose to renderer)
      const currentSettings = readSettings();
      const machineId = getMachineId();
      writeSettings({
        ...currentSettings,
        xibeApiKey: { value: machineId },
        // Store authenticated user information for persistence
        authenticatedUser: {
          id: authData.user.id,
          email: authData.user.email,
          plan: authData.user.plan,
          machineId: authData.user.machineId,
        },
      });

      return {
        success: true,
        user: authData.user,
        // Return the machine ID as API key (server now returns machine ID)
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
      // Clear API key and authenticated user from settings
      const currentSettings = readSettings();
      writeSettings({
        ...currentSettings,
        xibeApiKey: undefined,
        authenticatedUser: undefined,
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

      // 🚀 NEW: Clear temporary API keys and force re-authentication
      if (
        apiKey &&
        (apiKey.startsWith("temp-") ||
          apiKey.includes("offline") ||
          apiKey === "Not Set" ||
          apiKey.startsWith("Invalid Key"))
      ) {
        console.log("Clearing temporary/invalid API key:", apiKey);
        // Clear the temporary API key and user data
        writeSettings({
          ...settings,
          xibeApiKey: undefined,
          authenticatedUser: undefined,
        });
        return {
          isAuthenticated: false,
          user: null,
        };
      }

      if (apiKey && apiKey !== "Not Set" && !apiKey.startsWith("Invalid Key")) {
        // Treat presence of stored key (machine ID) as authenticated without exposing it
        console.log(
          "Auth status: Found valid machine ID in settings:",
          apiKey?.substring(0, 8) + "...",
        );

        // Return stored user information if available, otherwise fallback to basic info
        const authenticatedUser = settings?.authenticatedUser;
        if (authenticatedUser) {
          return {
            isAuthenticated: true,
            user: {
              id: authenticatedUser.id,
              email: authenticatedUser.email,
              plan: authenticatedUser.plan,
              machineId: authenticatedUser.machineId,
              apiKey: apiKey,
            },
          };
        } else {
          // Fallback for users who authenticated before this update
          return {
            isAuthenticated: true,
            user: {
              id: "unknown",
              email: "unknown@example.com",
              plan: "free",
              machineId: apiKey,
              apiKey: apiKey,
            },
          };
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
  ipcMain.handle("validate-machine-id", async () => {
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
