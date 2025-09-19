import { useMutation, useQuery } from "@tanstack/react-query";
import { showError, showSuccess } from "@/lib/toast";
import { IpcClient } from "@/ipc/ipc_client";

export function useSharePreviewE2B(appId: number | null) {
  const mutation = useMutation({
    mutationFn: async (options?: {
      durationMinutes?: number;
      licenseKey?: string;
      port?: number;
    }) => {
      if (!appId) throw new Error("No app selected");
      const ipc = IpcClient.getInstance();
      // Force new sandbox by stopping any existing one first
      try {
        await ipc.stopE2B({ appId });
      } catch {
        // ignore if not running
      }
      const { url } = await ipc.sharePreviewE2B({
        appId,
        port: options?.port ?? 3000,
        durationMinutes: options?.durationMinutes,
        licenseKey: options?.licenseKey,
      });
      // Use main-process clipboard to avoid focus restrictions
      await ipc.clipboardWriteText(url);
      return url;
    },
    onSuccess: (_url) => {
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
    }) => mutation.mutateAsync(options),
    isLoading: mutation.isPending,
    error: mutation.error as unknown,
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
