// Configuración centralizada de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export { API_URL };

// Helper para hacer fetch con manejo de errores
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Para enviar cookies de sesión
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: 'Error de red' 
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
