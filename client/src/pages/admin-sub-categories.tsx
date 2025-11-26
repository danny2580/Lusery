import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Category, SubCategory, InsertSubCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function AdminSubCategories() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [formData, setFormData] = useState<Partial<InsertSubCategory>>({
    name: "",
    slug: "",
    categoryId: "",
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subCategories = [], isLoading } = useQuery<SubCategory[]>({
    queryKey: ["/api/sub-categories"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSubCategory) => apiRequest("POST", "/api/sub-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-categories"] });
      toast({ title: "Subcategoría creada", duration: 800 });
      setDialogOpen(false);
      setFormData({ name: "", slug: "", categoryId: "" });
    },
    onError: () => {
      toast({ title: "Error al crear subcategoría", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; subCategory: Partial<InsertSubCategory> }) =>
      apiRequest("PUT", `/api/sub-categories/${data.id}`, data.subCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-categories"] });
      toast({ title: "Subcategoría actualizada", duration: 800 });
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ name: "", slug: "", categoryId: "" });
    },
    onError: () => {
      toast({ title: "Error al actualizar subcategoría", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sub-categories/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sub-categories"] });
      toast({ title: "Subcategoría eliminada", duration: 800 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId) return;

    const slug = formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (editingId) {
      updateMutation.mutate({ id: editingId, subCategory: { ...formData as InsertSubCategory, slug } });
    } else {
      createMutation.mutate({ ...formData as InsertSubCategory, slug });
    }
  };

  const handleEdit = (subCategory: SubCategory) => {
    setEditingId(subCategory.id);
    setFormData({
      name: subCategory.name,
      slug: subCategory.slug,
      categoryId: subCategory.categoryId,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta subcategoría?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({ name: "", slug: "", categoryId: "" });
  };

  const filteredSubs = selectedCategoryId && selectedCategoryId !== "all"
    ? subCategories.filter(s => s.categoryId === selectedCategoryId)
    : subCategories;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subcategorías</h1>
          <p className="text-muted-foreground mt-1">Gestiona subcategorías de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
            Volver
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Crear"} Subcategoría</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Categoría Padre</Label>
                  <Select value={formData.categoryId || ""} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre</Label>
                  <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Guardar</Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Subcategorías</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSubs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay subcategorías</p>
          ) : (
            <div className="space-y-3">
              {filteredSubs.map((sub) => {
                const cat = categories.find(c => c.id === sub.categoryId);
                return (
                  <div key={sub.id} className="flex items-center gap-4 p-4 border rounded-lg hover-elevate">
                    <div className="flex-1">
                      <h3 className="font-semibold">{sub.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(sub)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(sub.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
