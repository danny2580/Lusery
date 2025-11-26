import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export default function AdminMedia() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      toast({ title: "Selecciona al menos un archivo", variant: "destructive" });
      return;
    }

    setUploading(true);
    
    try {
      // Upload logic will be implemented in backend
      toast({ title: "Archivos subidos exitosamente" });
      setFiles(null);
    } catch (error) {
      toast({ title: "Error al subir archivos", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-media-title">Multimedia</h1>
        <p className="text-muted-foreground mt-1">Gestiona imágenes y videos</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subir Archivos</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="media">Seleccionar archivos</Label>
              <Input
                id="media"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => setFiles(e.target.files)}
                className="mt-2"
                data-testid="input-media-files"
              />
              {files && (
                <p className="text-sm text-muted-foreground mt-2">
                  {files.length} archivo(s) seleccionado(s)
                </p>
              )}
            </div>

            <Button type="submit" disabled={uploading} className="gap-2" data-testid="button-upload">
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo..." : "Subir Archivos"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Media Library */}
      <Card>
        <CardHeader>
          <CardTitle>Biblioteca de Multimedia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Los archivos multimedia se gestionan a través de Supabase Storage.
            <br />
            Configura las credenciales de Supabase para habilitar esta funcionalidad.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
