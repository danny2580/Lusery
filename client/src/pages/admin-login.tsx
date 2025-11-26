import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Diseño\ sin\ título_20251123_230018_0000_1763956927241.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación en frontend
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa usuario y contraseña",
        variant: "destructive",
        duration: 800,
      });
      return;
    }
    
    if (username.trim().length < 3) {
      toast({
        title: "Usuario inválido",
        description: "El usuario debe tener al menos 3 caracteres",
        variant: "destructive",
        duration: 800,
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
        duration: 800,
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/admin/login", {
        username: username.trim(),
        password,
      });

      if (response.ok) {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Bienvenido al panel de administración",
          duration: 800,
        });
        setLocation("/admin/dashboard");
      } else {
        const error = await response.json();
        toast({
          title: "Error de inicio de sesión",
          description: error.message || "Credenciales inválidas",
          variant: "destructive",
          duration: 800,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
        duration: 800,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center flex flex-col items-center">
          <div className="flex justify-center mb-3 w-full">
            <img src={logoUrl} alt="LUSERY" className="h-28 w-auto" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-login-title">
            Panel de Administración
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
