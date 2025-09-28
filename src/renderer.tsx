import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./router";
import { RouterProvider } from "@tanstack/react-router";

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { showError, showMcpConsentToast } from "./lib/toast";
import { IpcClient } from "./ipc/ipc_client";
import { UpdatePopup, useUpdatePopup } from "./components/UpdatePopup";

// @ts-ignore
console.log("Running in mode:", import.meta.env.MODE);

interface MyMeta extends Record<string, unknown> {
  showErrorToast: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: MyMeta;
    mutationMeta: MyMeta;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
});

// Telemetry disabled - PostHog initialization commented out
// const posthogClient = posthog.init(
//   "phc_5Vxx0XT8Ug3eWROhP6mm4D6D2DgIIKT232q4AKxC2ab",
//   {
//     api_host: "https://us.i.posthog.com",
//     // @ts-ignore
//     debug: import.meta.env.MODE === "development",
//     autocapture: false,
//     capture_exceptions: true,
//     capture_pageview: false,
//     before_send: (event) => {
//       if (!isTelemetryOptedIn()) {
//         console.debug("Telemetry not opted in, skipping event");
//         return null;
//       }
//       const telemetryUserId = getTelemetryUserId();
//       if (telemetryUserId) {
//         posthogClient.identify(telemetryUserId);
//       }

//       if (event?.properties["$ip"]) {
//         event.properties["$ip"] = null;
//       }

//       console.debug(
//         "Telemetry opted in - UUID:",
//         telemetryUserId,
//         "sending event",
//         event,
//       );
//       return event;
//     },
//     persistence: "localStorage",
//   },
// );

function App() {
  const updatePopup = useUpdatePopup();

  // Navigation tracking disabled - telemetry removed
  useEffect(() => {
    // Subscribe to navigation state changes
    const unsubscribe = router.subscribe("onResolved", (_navigation) => {
      // Navigation tracking disabled - telemetry removed
      // posthog.capture("navigation", {
      //   toPath: navigation.toLocation.pathname,
      //   fromPath: navigation.fromLocation?.pathname,
      // });
      // posthog.capture("$pageview", {
      //   path: navigation.toLocation.pathname,
      // });
    });

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const ipc = IpcClient.getInstance();
    const unsubscribe = ipc.onMcpToolConsentRequest((payload) => {
      showMcpConsentToast({
        serverName: payload.serverName,
        toolName: payload.toolName,
        toolDescription: payload.toolDescription,
        inputPreview: payload.inputPreview,
        onDecision: (d) => ipc.respondToMcpConsentRequest(payload.requestId, d),
      });
    });
    return () => unsubscribe();
  }, []);

  // Listen for update notifications from main process
  useEffect(() => {
    const handleUpdateAvailable = (updateData: any) => {
      console.log("Update available event received:", updateData);
      updatePopup.showUpdate({
        version: updateData.version,
        date: updateData.date,
        description: updateData.description,
        isBeta: updateData.isBeta,
        downloadUrl: updateData.downloadUrl,
        changelogUrl: updateData.changelogUrl,
      });
    };

    // Listen for update-available events from main process
    const ipcRenderer = (window as any).electron.ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on("update-available", handleUpdateAvailable);

      return () => {
        ipcRenderer.removeListener("update-available", handleUpdateAvailable);
      };
    }
  }, [updatePopup]);

  // Note: Automatic update checking is handled by the main process
  // No need for fallback check here to avoid loops

  return (
    <>
      <RouterProvider router={router} />
      <UpdatePopup
        isOpen={updatePopup.isOpen}
        onClose={updatePopup.hideUpdate}
        updateInfo={updatePopup.updateInfo}
        onDismissForSession={updatePopup.dismissForSession}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
