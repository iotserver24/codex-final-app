import { useEffect } from "react";
import { useAtom } from "jotai";
import { authAtom, loginDialogOpenAtom } from "@/atoms/appAtoms";
import { useAuth } from "@/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [authState] = useAtom(authAtom);
  const [, setLoginDialogOpen] = useAtom(loginDialogOpenAtom);
  const { isInitialized } = useAuth();

  useEffect(() => {
    // Only show login dialog if auth is initialized and user is not authenticated
    if (isInitialized && !authState.isAuthenticated && !authState.isLoading) {
      setLoginDialogOpen(true);
    }
  }, [
    isInitialized,
    authState.isAuthenticated,
    authState.isLoading,
    setLoginDialogOpen,
  ]);

  // Show loading state while checking authentication
  if (!isInitialized || authState.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, the LoginDialog will be shown by the AuthGuard
  // The children will still be rendered but the dialog will overlay them
  return <>{children}</>;
}
