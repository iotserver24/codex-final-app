import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { authAtom, loginDialogOpenAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { showError, showSuccess } from "@/lib/toast";

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

  const login = useCallback(
    async (callbackUrl: string = "https://xibe.app/api/auth/callback") => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Get machine ID
        const { machineId } = await IpcClient.getInstance().getMachineId();

        // Perform authentication
        const result = await IpcClient.getInstance().authLogin({
          machineId,
          callbackUrl,
        });

        if (result.success && result.user && result.apiKey) {
          // Update auth state
          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: true,
            user: {
              id: result.user?.id || "",
              email: result.user?.email || "",
              plan: result.user?.plan || "free",
              machineId: result.user?.machineId || "",
              apiKey: result.apiKey || "",
            },
            isLoading: false,
            error: null,
          }));

          // Update API key in settings if needed
          // This could be handled by updating the settings atom

          showSuccess("Successfully logged in!");
          setLoginDialogOpen(false);
          return true;
        } else {
          throw new Error(result.error || "Login failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";
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
              apiKey: status.user.apiKey || "", // Provide default empty string if missing
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
