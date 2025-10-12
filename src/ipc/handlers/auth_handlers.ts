import { ipcMain } from "electron";
import { app } from "electron";
import { randomUUID } from "crypto";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync } from "fs";

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
  ipcMain.handle("auth-login", async (event, { machineId, callbackUrl }) => {
    try {
      // This would integrate with the website authentication
      // For now, we'll simulate the authentication flow
      const response = await fetch(
        `${callbackUrl}?machineId=${machineId}&app=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            machineId,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const authData = await response.json();

      if (!authData.success) {
        throw new Error(authData.error || "Authentication failed");
      }

      // Store API key in settings
      // This would be handled by the settings system
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
      // Clear any stored authentication data
      // This would be handled by the settings system
      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Logout failed");
    }
  });

  // Check authentication status
  ipcMain.handle("auth-status", async () => {
    try {
      // This would check if user is authenticated and return current status
      // For now, return basic structure - in a real implementation,
      // this would read from settings or check stored auth data
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
