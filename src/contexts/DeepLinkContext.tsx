import React, { createContext, useContext, useEffect, useState } from "react";
import { IpcClient, DeepLinkData } from "../ipc/ipc_client";
import { useAuth } from "../hooks/useAuth";
import { useAtom } from "jotai";
import { loginDialogOpenAtom } from "../atoms/appAtoms";

type DeepLinkContextType = {
  lastDeepLink: (DeepLinkData & { timestamp: number }) | null;
};

const DeepLinkContext = createContext<DeepLinkContextType>({
  lastDeepLink: null,
});

export function DeepLinkProvider({ children }: { children: React.ReactNode }) {
  const [lastDeepLink, setLastDeepLink] = useState<
    (DeepLinkData & { timestamp: number }) | null
  >(null);
  const { login } = useAuth();
  const [, setLoginDialogOpen] = useAtom(loginDialogOpenAtom);

  useEffect(() => {
    const ipcClient = IpcClient.getInstance();
    const unsubscribe = ipcClient.onDeepLinkReceived((data) => {
      // Update with timestamp to ensure state change even if same type comes twice
      setLastDeepLink({ ...data, timestamp: Date.now() });

      // Handle auth callback specifically
      if (data.type === "auth-callback" && data.data) {
        const authData = data.data;
        if (authData.success) {
          // Authentication successful - the auth state will be updated by the login handler
          console.log("Authentication successful via deep link");
          setLoginDialogOpen(false);
        } else {
          // Authentication failed
          console.error("Authentication failed via deep link:", authData.error);
          // The error will be handled by the auth state
        }
      }
    });

    return unsubscribe;
  }, [login, setLoginDialogOpen]);

  return (
    <DeepLinkContext.Provider value={{ lastDeepLink }}>
      {children}
    </DeepLinkContext.Provider>
  );
}

export const useDeepLink = () => useContext(DeepLinkContext);
