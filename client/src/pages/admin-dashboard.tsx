import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FolderTree, Plus, Edit, Trash2, ChevronRight, MessageCircle, Box, Image } from "lucide-react";
import { Product, Category, SubCategory, AppSettings, HeroBanner } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [editingHeroBanner, setEditingHeroBanner] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string>("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["/api/sub-categories"],
  });

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: heroBanner, refetch: refetchHeroBanner } = useQuery<any | null>({
    queryKey: ["/api/hero-banner"],
  });

  const updateWhatsappMutation = useMutation({
    mutationFn: (whatsappNumber: string) =>
      apiRequest("PATCH", "/api/settings", { whatsappNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Número de WhatsApp actualizado", duration: 800 });
      setEditingWhatsapp(false);
    },
    onError: () => {
      toast({ title: "Error al actualizar número", variant: "destructive", duration: 800 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Producto eliminado", duration: 800 });
    },
  });

  const uploadHeroSlideMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/hero-banner", {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw new Error("Error al subir imagen");
      return response.json();
    },
    onSuccess: () => {
      refetchHeroBanner();
      toast({ title: "Imagen subida", duration: 800 });
      setEditingHeroBanner(false);
      setHeroImageFile(null);
      setHeroPreview("");
    },
    onError: () => {
      toast({ title: "Error al subir imagen", variant: "destructive", duration: 800 });
    },
  });

  const deleteHeroSlideMutation = useMutation({
    mutationFn: (slideId: string) => apiRequest("DELETE", `/api/hero-banner/${slideId}`, {}),
    onSuccess: () => {
      refetchHeroBanner();
      toast({ title: "Imagen eliminada", duration: 800 });
    },
    onError: () => {
      toast({ title: "Error al eliminar imagen", variant: "destructive", duration: 800 });
    },
  });

  const reorderSlidesMutation = useMutation({
    mutationFn: (slides: any[]) => apiRequest("PATCH", "/api/hero-banner/reorder", { slides }),
    onSuccess: () => {
      refetchHeroBanner();
      toast({ title: "Orden guardado", duration: 800 });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleHeroBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setHeroPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHeroSlide = () => {
    if (!heroImageFile) {
      toast({ title: "Selecciona una imagen", variant: "destructive", duration: 800 });
      return;
    }

    const formData = new FormData();
    formData.append("image", heroImageFile);
    uploadHeroSlideMutation.mutate(formData);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const slides = [...(heroBanner?.slides || [])];
    const [draggedSlide] = slides.splice(draggedIndex, 1);
    slides.splice(dropIndex, 0, draggedSlide);
    
    // Update positions
    slides.forEach((slide, idx) => {
      slide.position = idx;
    });

    reorderSlidesMutation.mutate(slides);
    setDraggedIndex(null);
  };

  const countProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId).length;
  };

  const countProductsBySubCategory = (subCategoryId: string) => {
    return products.filter(p => p.subCategoryId === subCategoryId).length;
  };

  const getSubCategoriesForCategory = (categoryId: string) => {
    return subCategories.filter(s => s.categoryId === categoryId);
  };

  const totalStock = products.reduce((sum, product) => sum + (parseInt(String(product.stock), 10) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen general de la tienda</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Volver a Tienda
        </Button>
      </div>

      {/* Hero Banner Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            <CardTitle>Portada Principal</CardTitle>
          </div>
          <Dialog open={editingHeroBanner} onOpenChange={setEditingHeroBanner}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setHeroImageFile(null);
                setHeroPreview("");
              }} data-testid="button-add-hero-slide">
                <Plus className="h-3 w-3 mr-1" />
                Agregar Imagen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Imagen a Portada</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hero-image">Imagen</Label>
                  <Input
                    id="hero-image"
                    type="file"
                    accept="image/*"
                    onChange={handleHeroBannerImageChange}
                    data-testid="input-hero-image"
                  />
                  {heroPreview && (
                    <div className="mt-2 rounded-lg overflow-hidden">
                      <img src={heroPreview} alt="Preview" className="h-32 w-full object-cover" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSaveHeroSlide}
                  disabled={uploadHeroSlideMutation.isPending}
                  className="w-full"
                  data-testid="button-save-hero-slide"
                >
                  {uploadHeroSlideMutation.isPending ? "Subiendo..." : "Subir"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {heroBanner?.slides && heroBanner.slides.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Arrastra para reordenar</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {heroBanner.slides.map((slide: any, idx: number) => (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-move transition-all ${
                      draggedIndex === idx ? "opacity-50 bg-muted" : "hover:bg-muted/50"
                    }`}
                    data-testid={`hero-slide-${slide.id}`}
                  >
                    <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                      <img src={slide.imageUrl} alt={`Slide ${idx + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Slide {idx + 1}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => {
                        if (confirm("¿Eliminar esta imagen?")) {
                          deleteHeroSlideMutation.mutate(slide.id);
                        }
                      }}
                      disabled={deleteHeroSlideMutation.isPending}
                      data-testid={`button-delete-slide-${slide.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin imágenes aún</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="flex gap-3 w-fit">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
            <CardTitle className="text-xs font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1 px-4">
            {productsLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <div className="text-lg font-bold" data-testid="text-total-products">{products.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
            <CardTitle className="text-xs font-medium">Stock Total</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1 px-4">
            {productsLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <div className="text-lg font-bold" data-testid="text-total-stock">{totalStock}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
            <CardTitle className="text-xs font-medium">Número WhatsApp</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1 px-4 flex items-center justify-between gap-2">
            <div className="text-sm font-mono" data-testid="text-whatsapp-number">
              {settings?.whatsappNumber || "+593979079064"}
            </div>
            <Dialog open={editingWhatsapp} onOpenChange={setEditingWhatsapp}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setWhatsappInput(settings?.whatsappNumber || "+593979079064")}
                  data-testid="button-edit-whatsapp"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Número WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="whatsapp">Número WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="+593979079064"
                      data-testid="input-whatsapp"
                    />
                  </div>
                  <Button
                    onClick={() => updateWhatsappMutation.mutate(whatsappInput)}
                    disabled={updateWhatsappMutation.isPending}
                    data-testid="button-save-whatsapp"
                  >
                    {updateWhatsappMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Products Editor Panel */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/admin/categories")}
          data-testid="button-manage-categories"
        >
          <FolderTree className="h-4 w-4" />
          Categorías
        </Button>
        <Button 
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/admin/sub-categories")}
          data-testid="button-manage-subcategories"
        >
          <FolderTree className="h-4 w-4" />
          Subcategorías
        </Button>
        <Button className="gap-2 ml-auto" onClick={() => navigate("/admin/product-form")}>
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Gestión de Productos */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Gestión de Productos</h2>
        
        {/* Categorías - Botones horizontales */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const productCount = countProductsByCategory(category.id);
              const isSelected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategoryId(isSelected ? null : category.id);
                    setSelectedSubCategoryId(null);
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/50"
                      : "bg-muted hover:bg-muted/80 border-border hover-elevate"
                  }`}
                  data-testid={`button-category-${category.id}`}
                >
                  {category.name} ({productCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategorías - Botones horizontales (aparecen si hay categoría seleccionada) */}
        {selectedCategoryId && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {getSubCategoriesForCategory(selectedCategoryId).map((subCat) => {
                const subProductCount = countProductsBySubCategory(subCat.id);
                const isSubCatSelected = selectedSubCategoryId === subCat.id;
                return (
                  <button
                    key={subCat.id}
                    onClick={() => setSelectedSubCategoryId(isSubCatSelected ? null : subCat.id)}
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
                      isSubCatSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/50"
                        : "bg-card hover:bg-card/80 border-border hover-elevate"
                    }`}
                    data-testid={`button-subcategory-${subCat.id}`}
                  >
                    {subCat.name} ({subProductCount})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Productos filtrados */}
        {productsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (() => {
          let filteredProds = products;
          
          if (selectedSubCategoryId) {
            filteredProds = products.filter(p => p.subCategoryId === selectedSubCategoryId);
          } else if (selectedCategoryId) {
            filteredProds = products.filter(p => p.categoryId === selectedCategoryId);
          }

          return filteredProds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">{selectedCategoryId ? "No hay productos en esta categoría" : "No hay productos aún"}</p>
                <Button onClick={() => navigate("/admin/product-form")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedCategoryId ? "Nuevo Producto" : "Crear primer producto"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {filteredProds.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center gap-2 p-2 border rounded-lg hover-elevate cursor-pointer transition-all"
                  onClick={() => navigate(`/admin/product-form?id=${product.id}`)}
                >
                  <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {(() => {
                      try {
                        let mediaUrls = product.mediaUrls;
                        if (typeof mediaUrls === 'string') {
                          mediaUrls = JSON.parse(mediaUrls);
                        }
                        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
                          const firstColorGroup = mediaUrls[0];
                          const firstPhoto = firstColorGroup.photos?.[0];
                          if (firstPhoto?.url) {
                            return <img src={firstPhoto.url} alt={product.name} className="h-full w-full object-cover" />;
                          }
                        }
                      } catch (e) {
                        // Continue to placeholder
                      }
                      return <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">-</div>;
                    })()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">${parseFloat(product.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
