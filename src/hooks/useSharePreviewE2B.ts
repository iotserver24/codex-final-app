import { useMutation, useQuery } from "@tanstack/react-query";
import { showError, showSuccess } from "@/lib/toast";
import { IpcClient } from "@/ipc/ipc_client";
import { useSettings } from "@/hooks/useSettings";

export function useSharePreviewE2B(appId: number | null) {
  const { settings } = useSettings();

  const mutation = useMutation({
    mutationFn: async (options?: {
      durationMinutes?: number;
      licenseKey?: string;
      port?: number;
      enableCustomDomain?: boolean;
      enableBadge?: boolean;
      customSubdomain?: string;
    }) => {
      if (!appId) throw new Error("No app selected");
      const ipc = IpcClient.getInstance();

      console.log("Share options:", options);

      // Force new sandbox by stopping any existing one first
      try {
        await ipc.stopE2B({ appId });
      } catch {
        // ignore if not running
      }

      // Create E2B sandbox
      const { url: e2bUrl } = await ipc.sharePreviewE2B({
        appId,
        port: options?.port ?? 3000,
        durationMinutes: options?.durationMinutes,
        licenseKey: options?.licenseKey,
      });

      // Wait for E2B sandbox to be fully ready (important for subdomain registration)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Always register subdomain mapping - never show E2B URL to users
      // Custom subdomain is now mandatory
      const subdomain = options?.customSubdomain;

      // Validate subdomain
      if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
        throw new Error("Invalid subdomain length (3-63 characters)");
      }

      // Determine badge setting based on user type and explicit setting
      const isPaidUser =
        options?.durationMinutes && options.durationMinutes > 15;
      const enableBadge =
        options?.enableBadge !== undefined ? options.enableBadge : !isPaidUser; // Use explicit setting if provided, otherwise default based on user type

      // Register subdomain mapping with the now-ready E2B URL
      console.log("Registering subdomain with payload:", {
        password: "add@123",
        subdomain,
        target: e2bUrl,
        ttl_seconds:
          (options?.durationMinutes || settings?.defaultShareDuration || 15) *
          60,
        badge: enableBadge,
      });

      let subdomainResponse;
      try {
        subdomainResponse = await fetch("https://kitoryd.cc/_register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: "add@123",
            subdomain,
            target: e2bUrl,
            ttl_seconds:
              (options?.durationMinutes ||
                settings?.defaultShareDuration ||
                15) * 60, // Convert minutes to seconds
            badge: enableBadge,
          }),
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
      } catch (fetchError) {
        console.error(
          "Network error during subdomain registration:",
          fetchError,
        );
        console.error("Error details:", {
          name: fetchError instanceof Error ? fetchError.name : "Unknown",
          message:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          cause: fetchError instanceof Error ? fetchError.cause : undefined,
        });
        throw new Error(
          `Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        );
      }

      console.log(
        "Subdomain registration response status:",
        subdomainResponse.status,
      );

      if (!subdomainResponse.ok) {
        const errorData = await subdomainResponse.json();
        console.error("Subdomain registration failed:", errorData);
        throw new Error(errorData.error || "Failed to register subdomain");
      }

      const result = await subdomainResponse.json();
      console.log("Subdomain registration response:", result);

      // Ensure the subdomain URL has https:// protocol
      const rawSubdomainUrl = result.subdomain_url;
      const subdomainUrl = rawSubdomainUrl.startsWith("http")
        ? rawSubdomainUrl
        : `https://${rawSubdomainUrl}`;
      console.log("Subdomain registration successful:", {
        subdomain,
        subdomainUrl,
        e2bUrl,
        rawSubdomainUrl,
      });

      // Copy the subdomain URL to clipboard (not the direct E2B URL)
      await ipc.clipboardWriteText(subdomainUrl);
      console.log("Final result:", { subdomainUrl, e2bUrl });
      return { subdomainUrl, e2bUrl };
    },
    onSuccess: () => {
      showSuccess(`Share link copied`);
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  return {
    share: (options?: {
      durationMinutes?: number;
      licenseKey?: string;
      port?: number;
      enableCustomDomain?: boolean;
      enableBadge?: boolean;
      customSubdomain?: string;
    }) => mutation.mutateAsync(options),
    isLoading: mutation.isPending,
    error: mutation.error as unknown,
    // Helper to determine if user can disable badge
    canDisableBadge: (durationMinutes?: number) => {
      // Paid users (>15 minutes) can disable badge, free users cannot
      return (durationMinutes || settings?.defaultShareDuration || 15) > 15;
    },
    // Live status
    useStatus: () =>
      useQuery({
        queryKey: ["e2b-status", appId],
        queryFn: async () => {
          if (!appId) return { running: false } as any;
          return IpcClient.getInstance().getE2BStatus({ appId });
        },
        refetchInterval: 2000,
        enabled: !!appId,
      }),
    useLogs: () =>
      useQuery({
        queryKey: ["e2b-logs", appId],
        queryFn: async () => {
          if (!appId) return { logs: "" };
          return IpcClient.getInstance().getE2BLogs({ appId });
        },
        refetchInterval: 2000,
        enabled: !!appId,
      }),
    useProgress: () =>
      useQuery({
        queryKey: ["e2b-progress", appId],
        queryFn: async () => {
          if (!appId) return { lines: [] as string[] } as any;
          return IpcClient.getInstance().getE2BProgress({ appId });
        },
        refetchInterval: 1000,
        enabled: !!appId,
      }),
    useVersions: () =>
      useQuery({
        queryKey: ["e2b-versions", appId],
        queryFn: async () => {
          if (!appId) return { versions: [] } as any;
          return IpcClient.getInstance().listE2BVersions({ appId });
        },
        refetchInterval: 2000,
        enabled: !!appId,
      }),
  };
}
