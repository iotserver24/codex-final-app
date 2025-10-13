import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { loginDialogOpenAtom, authAtom } from "@/atoms/appAtoms";
import { useAuth } from "@/hooks/useAuth";
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
  const { login: _login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Close dialog when user becomes authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      setIsOpen(false);
    }
  }, [authState.isAuthenticated, setIsOpen]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Redirect to browser authentication instead of offline login
      await handleOpenWebsite();
      setIsOpen(false);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenWebsite = async () => {
    try {
      // Get machine ID before opening browser
      const { machineId } = await IpcClient.getInstance().getMachineId();
      IpcClient.getInstance().openExternalUrl(
        `http://localhost:8080/auth?desktop=true&machine_id=${machineId}`,
      );
    } catch (error) {
      console.error("Failed to get machine ID:", error);
      // Fallback without machine ID
      IpcClient.getInstance().openExternalUrl(
        "http://localhost:8080/auth?desktop=true",
      );
    }
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          title="Close login dialog"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex h-full">
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
          <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-md space-y-8">
              {/* Mobile/Compact Header */}
              <div className="lg:hidden text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold">Xibe AI</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign in with GitHub to access your account
                </p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block text-center space-y-2">
                <h2 className="text-3xl font-bold">Welcome Back</h2>
                <p className="text-muted-foreground">
                  Sign in with GitHub to access your account
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
                      Opening Browser...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-3" />
                      Sign in with GitHub
                    </>
                  )}
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
                    You'll be redirected to GitHub to complete authentication
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
