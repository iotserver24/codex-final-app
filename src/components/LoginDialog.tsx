import { useState } from "react";
import { useAtom } from "jotai";
import { loginDialogOpenAtom, authAtom } from "@/atoms/appAtoms";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LogIn,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";

export function LoginDialog() {
  const [isOpen, setIsOpen] = useAtom(loginDialogOpenAtom);
  const [authState] = useAtom(authAtom);
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const success = await login();
      if (success) {
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenWebsite = () => {
    IpcClient.getInstance().openExternalUrl(
      "https://xibe.app/auth?desktop=true",
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="fixed inset-0 h-screen w-screen max-w-none max-h-none m-0 p-0 border-0 rounded-none">
        <div className="flex h-full w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Left side - Branding */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 text-white p-12 flex-col justify-center items-center">
            <div className="max-w-md text-center space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <Shield className="h-12 w-12 text-blue-200" />
                <h1 className="text-4xl font-bold">Xibe AI</h1>
              </div>
              <p className="text-xl text-blue-100 leading-relaxed">
                Your intelligent coding companion with advanced AI capabilities
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-center space-x-3 text-blue-100">
                  <Zap className="h-5 w-5" />
                  <span>Powerful AI models for code generation</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-100">
                  <Shield className="h-5 w-5" />
                  <span>Secure and private machine ID validation</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-100">
                  <Star className="h-5 w-5" />
                  <span>Pro features for advanced users</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
            <div className="w-full max-w-md space-y-8">
              {/* Mobile/Compact Header */}
              <div className="lg:hidden text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold">Xibe AI</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign in to access AI features
                </p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block text-center space-y-2">
                <h2 className="text-3xl font-bold">Welcome Back</h2>
                <p className="text-muted-foreground">
                  Sign in to your Xibe AI account to continue
                </p>
              </div>

              {authState.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{authState.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <Button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-3" />
                      Sign In with GitHub
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleOpenWebsite}
                  variant="outline"
                  className="w-full h-12 text-lg"
                  size="lg"
                  disabled={isLoggingIn}
                >
                  <ExternalLink className="w-5 h-5 mr-3" />
                  Open in Browser
                </Button>
              </div>

              <div className="text-center space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    🔐 Your machine ID will be automatically sent for secure
                    account association
                  </p>
                  <p>📱 Free users: 1 machine • Pro users: up to 5 machines</p>
                  <p>
                    🚀 Sign up for free at xibe.app if you don't have an account
                  </p>
                </div>

                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    You'll be redirected to complete authentication in your
                    browser
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
