import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Category, InsertCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function AdminCategories() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InsertCategory>>({
    name: "",
    slug: "",
  });

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCategory) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría creada exitosamente" });
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ name: "", slug: "" });
    },
    onError: () => {
      toast({ title: "Error al crear categoría", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; category: Partial<InsertCategory> }) =>
      apiRequest("PUT", `/api/categories/${data.id}`, data.category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría actualizada exitosamente" });
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ name: "", slug: "" });
    },
    onError: () => {
      toast({ title: "Error al actualizar categoría", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Categoría eliminada" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const slug = formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, category: { ...formData as InsertCategory, slug } });
    } else {
      createMutation.mutate({ ...formData as InsertCategory, slug });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta categoría?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setFormData({ name: "", slug: "" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-categories-title">Categorías</h1>
          <p className="text-muted-foreground mt-1">Organiza tus productos por categorías</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/dashboard")} data-testid="button-back-dashboard">
            Volver al Dashboard
          </Button>
          <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-add-category">
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Categoría" : "Crear Categoría"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Modifica los datos de la categoría" : "Crea una nueva categoría para organizar tus productos"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre de la categoría"
                    required
                    autoFocus
                    data-testid="input-category-name"
                  />
                </div>

                <div className="flex gap-1">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={editingId ? updateMutation.isPending : createMutation.isPending} 
                    data-testid="button-save-category"
                  >
                    {editingId 
                      ? (updateMutation.isPending ? "Actualizando..." : "Actualizar")
                      : (createMutation.isPending ? "Guardando..." : "Guardar")
                    }
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="flex-1">
                      Cancelar
                    </Button>
                  </DialogClose>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-4" data-testid="text-no-categories">
              No hay categorías aún. Crea tu primera categoría.
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 p-2 rounded-lg border hover-elevate cursor-pointer transition-all" onClick={() => handleEdit(category)} data-testid={`category-row-${category.id}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{category.name}</h3>
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-${category.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(category.id)} 
                      data-testid={`button-delete-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
