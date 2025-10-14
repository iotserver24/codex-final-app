import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { authAtom, loginDialogOpenAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { showError, showSuccess } from "@/lib/toast";

// Deep link auth data type
interface DeepLinkAuthData {
  success: boolean;
  user?: {
    id: string;
    email: string;
    plan: string;
    machineId: string;
  };
  apiKey?: string;
  error?: string;
}

export function useAuth() {
  const [authState, setAuthState] = useAtom(authAtom);
  const [, setLoginDialogOpen] = useAtom(loginDialogOpenAtom);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const status = await IpcClient.getInstance().authStatus();
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: status.isAuthenticated,
          user: status.user || null,
        }));
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        showError("Failed to check authentication status");
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [setAuthState]);

  // Listen for deep link auth events
  useEffect(() => {
    const ipcClient = IpcClient.getInstance();
    const unsubscribe = ipcClient.onDeepLinkReceived(async (data) => {
      if (data.type === "auth-callback" && data.data) {
        const authData = data.data as DeepLinkAuthData;
        if (authData.success && authData.user && authData.apiKey) {
          try {
            // Process authentication data through IPC
            const result = await IpcClient.getInstance().authLogin({
              authData,
            });

            if (result.success) {
              // Update auth state with successful authentication
              setAuthState((prev) => ({
                ...prev,
                isAuthenticated: true,
                user: {
                  id: authData.user.id,
                  email: authData.user.email,
                  plan: authData.user.plan,
                  machineId: authData.user.machineId,
                  // Server now returns machine ID as API key
                  apiKey: authData.apiKey,
                },
                isLoading: false,
                error: null,
              }));

              showSuccess("Successfully logged in!");
              setLoginDialogOpen(false);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Authentication failed";
            setAuthState((prev) => ({
              ...prev,
              isLoading: false,
              error: errorMessage,
            }));
            showError(errorMessage);
          }
        } else if (authData.error) {
          // Handle authentication error
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            error: authData.error,
          }));
          showError(authData.error);
        }
      }
    });

    return unsubscribe;
  }, [setAuthState, setLoginDialogOpen]);

  const login = useCallback(
    async (_callbackUrl: string = "https://api.xibe.app/auth/callback") => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Get machine ID
        const { machineId } = await IpcClient.getInstance().getMachineId();

        // Open browser for authentication instead of direct login
        await IpcClient.getInstance().openExternalUrl(
          `https://xibe.app/auth?desktop=true&machine_id=${machineId}`,
        );

        // Reset loading state since we're redirecting to browser
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to open authentication page";
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        showError(errorMessage);
        return false;
      }
    },
    [setAuthState, setLoginDialogOpen],
  );

  const logout = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const result = await IpcClient.getInstance().authLogout();

      if (result.success) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });

        showSuccess("Successfully logged out");
        return true;
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Logout failed";
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      showError(errorMessage);
      return false;
    }
  }, [setAuthState]);

  const validateMachineId = useCallback(
    async (machineId: string, userId: string) => {
      try {
        const result = await IpcClient.getInstance().validateMachineId({
          machineId,
          userId,
        });

        return result;
      } catch (error) {
        console.error("Failed to validate machine ID:", error);
        return { valid: false, plan: "free" as const, maxMachines: 1 };
      }
    },
    [],
  );

  const refreshAuthStatus = useCallback(async () => {
    try {
      const status = await IpcClient.getInstance().authStatus();
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: status.isAuthenticated,
        user: status.user
          ? {
              ...status.user,
              // Server now returns machine ID as API key
              apiKey: status.user.apiKey || "",
            }
          : null,
      }));
    } catch (error) {
      console.error("Failed to refresh auth status:", error);
    }
  }, [setAuthState]);

  return {
    authState,
    isInitialized,
    login,
    logout,
    validateMachineId,
    refreshAuthStatus,
  };
}
