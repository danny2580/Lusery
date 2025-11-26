import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/check");
        const data = await response.json();
        
        if (!data.authenticated) {
          setLocation("/admin/login");
        }
      } catch (error) {
        setLocation("/admin/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
