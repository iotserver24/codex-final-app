import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";
import { showError, showSuccess } from "@/lib/toast";
import { getHardcodedEnvVar } from "@/constants/hardcoded_env";
import { ExternalLink, QrCode } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";

export function PolarLicenseSettings() {
  const { settings, updateSettings } = useSettings();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const hasSaved = !!settings?.polarLicenseKey;

  const onSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        polarLicenseKey: value ? ({ value } as { value: string }) : undefined,
      });
      setValue("");
      showSuccess("License key saved");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setSaving(true);
    try {
      await updateSettings({ polarLicenseKey: undefined });
      showSuccess("License key removed");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const checkoutUrl = getHardcodedEnvVar("VITE_POLAR_CHECKOUT_URL");

  const handleBuyLicense = async () => {
    if (checkoutUrl) {
      try {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.openExternalUrl(checkoutUrl);
      } catch (error) {
        console.error("Failed to open external URL:", error);
        // Fallback to window.open if IPC fails
        window.open(checkoutUrl, "_blank");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Polar License</h3>
          <p className="text-xs text-muted-foreground">
            Used for 30m/60m Share durations.
          </p>
        </div>
        {hasSaved && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemove}
            disabled={saving}
          >
            {saving ? "Removing..." : "Remove"}
          </Button>
        )}
      </div>

      {/* License Purchase Section */}
      {!hasSaved && checkoutUrl && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Support & License
              </h4>
              <p className="text-xs text-muted-foreground">
                One-time support to unlock 30m/60m Share durations
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBuyLicense}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Support (One-time)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create a modal or popover to show QR code
                  const modal = document.createElement("div");
                  modal.className =
                    "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
                  modal.innerHTML = `
                    <div class="bg-background rounded-lg p-6 max-w-sm mx-4">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">Scan QR Code</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-muted-foreground hover:text-foreground">
                          ✕
                        </button>
                      </div>
                      <div class="text-center">
                        <img src="../../assets/e2b-qr.png" alt="E2B License QR Code" class="mx-auto mb-4 rounded-lg max-w-48" />
                        <p class="text-sm text-muted-foreground">
                          Scan to make a one-time support donation and get your license
                        </p>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(modal);
                  modal.addEventListener("click", (e) => {
                    if (e.target === modal) modal.remove();
                  });
                }}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasSaved ? "••••••••" : "Enter license key"}
        />
        <Button onClick={onSave} disabled={saving || !value}>
          Save
        </Button>
      </div>
    </div>
  );
}
