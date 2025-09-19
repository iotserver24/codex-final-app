import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";
import { showError, showSuccess } from "@/lib/toast";

export function E2BIntegration() {
  const { settings, updateSettings } = useSettings();
  const [e2bKey, setE2BKey] = useState("");
  const [polarKey, setPolarKey] = useState("");
  const [saving, setSaving] = useState(false);
  const hasE2B = !!settings?.e2bApiKey;
  const hasPolar = !!settings?.polarApiKey;

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        e2bApiKey: e2bKey ? ({ value: e2bKey } as any) : undefined,
        polarApiKey: polarKey ? ({ value: polarKey } as any) : undefined,
      });
      showSuccess("Saved E2B/Polar keys");
      setE2BKey("");
      setPolarKey("");
    } catch (e: any) {
      showError(e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await updateSettings({ e2bApiKey: undefined, polarApiKey: undefined });
      showSuccess("Removed E2B/Polar keys");
    } catch (e: any) {
      showError(e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            E2B Share Preview
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Configure E2B API key and Polar API key for paid durations.
          </p>
        </div>
        {(hasE2B || hasPolar) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={disconnect}
            disabled={saving}
          >
            {saving ? "Removing..." : "Remove Keys"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">E2B API Key</label>
          <Input
            value={e2bKey}
            onChange={(e) => setE2BKey(e.target.value)}
            placeholder={hasE2B ? "••••••••" : "e2b_..."}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Polar API Key
          </label>
          <Input
            value={polarKey}
            onChange={(e) => setPolarKey(e.target.value)}
            placeholder={hasPolar ? "••••••••" : "polar_..."}
          />
        </div>
      </div>

      <div>
        <Button onClick={save} disabled={saving || (!e2bKey && !polarKey)}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
