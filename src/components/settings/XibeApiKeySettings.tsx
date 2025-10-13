import { KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Managed-only view; no settings access here
export function XibeApiKeySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Xibe AI API Key
        </CardTitle>
        <CardDescription>
          Managed automatically after login. Not visible or editable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTitle>Managed by Application</AlertTitle>
          <AlertDescription>
            Your device is linked. API access is handled securely using your
            machine ID.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
