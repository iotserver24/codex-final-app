import { useMemo, useState } from "react";
import e2bQr from "../../../../assets/e2b-qr.png";

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}
import { useSharePreviewE2B } from "@/hooks/useSharePreviewE2B";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  appId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function E2BSharePreviewDialog({ appId, open, onOpenChange }: Props) {
  const { share, isLoading, useStatus, useLogs, useProgress } =
    useSharePreviewE2B(appId);
  const { data: status } = useStatus();
  const { data: logs } = useLogs();
  const { data: progress } = useProgress();

  const [reloadKey, setReloadKey] = useState<number>(Date.now());
  const [duration, setDuration] = useState<number>(15); // free defaults: 5/10/15
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [showQR, setShowQR] = useState<boolean>(false);
  const POLAR_CHECKOUT_URL =
    "https://buy.polar.sh/polar_cl_Hplhx1gf8FdFKu0ESK71GSpaLMTwTQicLTukH0bpPNi";

  // When dialog opens, if not running yet, kick off share
  // Do not auto-start on open. Wait for explicit user action.

  const url = status?.url;

  const cacheBustedUrl = useMemo(() => {
    if (!url) return undefined;
    const u = new URL(url);
    u.searchParams.set("_", String(reloadKey));
    return u.toString();
  }, [url, reloadKey]);

  const onRefresh = () => setReloadKey(Date.now());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[960px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Share Preview (E2B)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm bg-white text-black"
              value={duration}
              aria-label="Sandbox duration"
              title="Sandbox duration"
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={5}>5 mins (free)</option>
              <option value={10}>10 mins (free)</option>
              <option value={15}>15 mins (free)</option>
              <option value={30}>30 mins (paid)</option>
              <option value={60}>1 hour (paid)</option>
            </select>
            {(duration === 30 || duration === 60) && (
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm w-[200px]"
                  placeholder="Enter Polar license key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(POLAR_CHECKOUT_URL, "_blank")}
                >
                  Buy $50
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQR((v) => !v)}
                >
                  Scan QR
                </Button>
              </div>
            )}
          </div>
          {showQR && (
            <div className="rounded border p-2 w-fit bg-white">
              <img src={e2bQr} alt="Polar checkout QR" className="h-32 w-32" />
            </div>
          )}
          {status?.running && url ? (
            <div className="space-y-2">
              <div className="aspect-video w-full rounded-md border border-border overflow-hidden bg-black/5">
                {/* Use iframe for live preview; cache-bust via reloadKey */}
                <iframe
                  key={reloadKey}
                  src={cacheBustedUrl}
                  title="Live Preview"
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <a
                  className="text-sm underline truncate max-w-[70%]"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {url}
                </a>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={onRefresh}
                    disabled={isLoading}
                  >
                    Update
                  </Button>
                  <Button
                    onClick={() =>
                      url && window?.electron
                        ? window.electron.ipcRenderer.invoke(
                            "open-external-url",
                            url,
                          )
                        : window.open(url, "_blank")
                    }
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[420px] rounded-md border border-border p-3 overflow-auto text-xs whitespace-pre-wrap bg-[var(--background-lightest)]">
              {(progress?.lines || []).join("\n")}\n\n
              {(logs?.logs || "").slice(-4000)}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={() =>
                share({
                  durationMinutes: duration,
                  licenseKey: licenseKey || undefined,
                })
              }
              disabled={isLoading}
            >
              {status?.running
                ? "Copy Link Again"
                : isLoading
                  ? "Starting…"
                  : "Start & Copy Link"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
