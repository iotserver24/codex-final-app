import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";
import { showError, showSuccess } from "@/lib/toast";

export function PolarLicenseSettings() {
  const { settings, updateSettings } = useSettings();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const hasSaved = !!settings?.polarLicenseKey;

  const onSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        polarLicenseKey: value ? ({ value } as any) : undefined,
      });
      setValue("");
      showSuccess("License key saved");
    } catch (e: any) {
      showError(e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setSaving(true);
    try {
      await updateSettings({ polarLicenseKey: undefined });
      showSuccess("License key removed");
    } catch (e: any) {
      showError(e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
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
