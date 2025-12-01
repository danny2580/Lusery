import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Category, SubCategory } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { X, Save, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];

export default function AdminProductForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const productId = new URLSearchParams(window.location.search).get("id");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("");
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [newCustomSize, setNewCustomSize] = useState("");

  // Media state - simple structure
  const [mediaItems, setMediaItems] = useState<Array<{
    id: string;
    color: string;
    url: string;
    size: string;
    quantity: number;
  }>>([]);

  // Track size and quantity PER COLOR (not per photo)
  const [colorSizeQuantity, setColorSizeQuantity] = useState<Record<string, { size: string; quantity: number }>>({});

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["/api/sub-categories"],
  });

  const { data: product } = useQuery({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      return res.json();
    },
  });

  // Load product
  useEffect(() => {
    if (product && productId) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price);
      setCategoryId(product.categoryId || "");
      setSubCategoryId(product.subCategoryId || "");
      
      let parsedColors: string[] = [];
      try {
        if (!product.colors || product.colors === '' || product.colors === 'undefined') {
          parsedColors = [];
        } else if (typeof product.colors === 'string') {
          parsedColors = JSON.parse(product.colors);
          if (!Array.isArray(parsedColors)) parsedColors = [];
        } else if (Array.isArray(product.colors)) {
          parsedColors = product.colors;
        }
      } catch (e) {
        console.error("Error parsing colors:", e, "value:", product.colors);
        parsedColors = [];
      }
      setColors(parsedColors);

      // Parse media
      let media: any[] = [];
      const colorSQ: Record<string, { size: string; quantity: number }> = {};
      
      if (product.mediaUrls) {
        try {
          const parsed = typeof product.mediaUrls === 'string' ? JSON.parse(product.mediaUrls) : product.mediaUrls;
          if (Array.isArray(parsed)) {
            parsed.forEach((colorGroup: any) => {
              // Store the first photo's size and quantity as the color's size/quantity
              if (colorGroup.photos && colorGroup.photos.length > 0) {
                const firstPhoto = colorGroup.photos[0];
                colorSQ[colorGroup.color] = {
                  size: firstPhoto.size || "",
                  quantity: firstPhoto.quantity || 0,
                };
              }
              
              if (colorGroup.photos) {
                colorGroup.photos.forEach((photo: any, idx: number) => {
                  media.push({
                    id: `${colorGroup.color}-${idx}`,
                    color: colorGroup.color,
                    url: photo.url,
                    size: photo.size || "",
                    quantity: photo.quantity || 0,
                  });
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing mediaUrls:", e);
        }
      }
      setMediaItems(media);
      setColorSizeQuantity(colorSQ);

      // Extract custom sizes
      const existingSizes = new Set<string>();
      media.forEach(m => {
        if (m.size && !DEFAULT_SIZES.includes(m.size)) {
          existingSizes.add(m.size);
        }
      });
      setCustomSizes(Array.from(existingSizes));
    }
  }, [product, productId]);

  // Calculate stock
  const totalStock = mediaItems.reduce((sum, item) => sum + item.quantity, 0);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Group media by color - INCLUDE ALL PHOTOS (new and existing)
      const mediaByColor: any[] = [];
      colors.forEach(color => {
        const colorPhotos = mediaItems.filter(m => m.color === color);
        if (colorPhotos.length > 0) {
          mediaByColor.push({
            color,
            photos: colorPhotos.map(p => ({
              url: p.url,
              size: p.size,
              quantity: p.quantity,
            })),
          });
        }
      });

      // Prepare FormData
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("price", price);
      fd.append("stock", String(totalStock));
      fd.append("categoryId", categoryId || "");
      fd.append("subCategoryId", subCategoryId || "");
      fd.append("colors", JSON.stringify(colors));
      fd.append("mediaUrls", JSON.stringify(mediaByColor));

      if (!productId) {
        fd.append("slug", name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      }

      // Upload new media files
      for (const item of mediaItems) {
        if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
          try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            fd.append("media", blob, `photo-${Date.now()}.${blob.type.split('/')[1]}`);
          } catch (e) {
            console.error("Error converting media:", e);
          }
        }
      }

      if (productId) {
        return apiRequest("PUT", `/api/products/${productId}`, fd);
      }
      return apiRequest("POST", "/api/products", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: productId ? "Producto actualizado" : "Producto creado" });
      navigate("/admin/dashboard");
    },
    onError: (e: any) => {
      console.error("Error:", e);
      toast({ title: "Error al guardar", variant: "destructive" });
    },
  });

  // Handlers
  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor)) {
      const updatedColors = [...colors, newColor];
      setColors(updatedColors);
      setColorSizeQuantity(prev => ({
        ...prev,
        [newColor]: { size: "", quantity: 0 }
      }));
      setNewColor("");
      toast({ title: `Color "${newColor}" agregado` });
    }
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
    setMediaItems(mediaItems.filter(m => m.color !== color));
    setColorSizeQuantity(prev => {
      const newState = { ...prev };
      delete newState[color];
      return newState;
    });
    if (selectedColor === color) setSelectedColor(null);
  };

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedColor) {
      toast({ title: "Selecciona un color primero", variant: "destructive" });
      return;
    }

    const files = Array.from(e.target.files || []);
    let loadedCount = 0;
    const colorData = colorSizeQuantity[selectedColor] || { size: "", quantity: 0 };

    files.forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newItem = {
          id: `${selectedColor}-${Date.now()}-${fileIdx}`,
          color: selectedColor,
          url: reader.result as string,
          size: colorData.size,
          quantity: colorData.quantity,
        };
        console.log("Adding photo:", newItem.id, "URL length:", (reader.result as string).length);
        setMediaItems(prev => [...prev, newItem]);
        loadedCount++;
        if (loadedCount === files.length) {
          toast({ title: `${files.length} foto(s) agregada(s)` });
        }
      };
      reader.onerror = () => {
        toast({ title: `Error al cargar ${file.name}`, variant: "destructive" });
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = "";
  };

  const handleRemoveMedia = async (id: string) => {
    const itemToRemove = mediaItems.find(m => m.id === id);
    
    // Si es URL de Supabase, eliminarla del storage
    if (itemToRemove && itemToRemove.url.includes('supabase')) {
      try {
        await apiRequest("DELETE", `/api/media/delete`, {
          url: itemToRemove.url
        });
      } catch (error) {
        console.error("Error deleting from Supabase:", error);
        toast({ title: "Error al eliminar foto de Supabase", variant: "destructive" });
      }
    }
    
    // Eliminar del estado local
    setMediaItems(mediaItems.filter(m => m.id !== id));
  };

  const updateMedia = (id: string, updates: any) => {
    setMediaItems(
      mediaItems.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  };

  const moveMediaUp = (id: string) => {
    const idx = mediaItems.findIndex(m => m.id === id);
    if (idx > 0) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]];
      setMediaItems(newItems);
    }
  };

  const moveMediaDown = (id: string) => {
    const idx = mediaItems.findIndex(m => m.id === id);
    if (idx < mediaItems.length - 1) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      setMediaItems(newItems);
    }
  };

  const handleAddCustomSize = () => {
    if (newCustomSize.trim() && !customSizes.includes(newCustomSize) && !DEFAULT_SIZES.includes(newCustomSize)) {
      setCustomSizes([...customSizes, newCustomSize]);
      setNewCustomSize("");
      toast({ title: `Talla "${newCustomSize}" agregada` });
    }
  };

  const allSizes = [...DEFAULT_SIZES, ...customSizes];
  const colorGroups = colors.map(color => ({
    color,
    photos: mediaItems.filter(m => m.color === color),
  }));

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center gap-4 pb-2">
        <h1 className="text-2xl font-bold">{productId ? "Editar Producto" : "Crear Producto"}</h1>
      </div>

      {/* Información Básica */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-3 px-4">
          <div>
            <Label className="text-xs">Nombre*</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del producto" className="text-sm min-h-16" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Precio*</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(""); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subcategoría</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryId ? subCategories
                    .filter(sc => sc.categoryId === categoryId)
                    .map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                    )) : <SelectItem value="none" disabled>Elige categoría primero</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tallas y Colores */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-base">Tallas</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Por defecto: S, M, L, XL</p>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex flex-wrap gap-1">
              {customSizes.map((size) => (
                <Badge key={size} className="gap-1 text-xs" variant="secondary">
                  {size}
                  <button onClick={() => setCustomSizes(customSizes.filter(s => s !== size))}><X className="h-2 w-2" /></button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-1">
              <Input
                value={newCustomSize}
                onChange={(e) => setNewCustomSize(e.target.value)}
                placeholder="Ej: 10, Niño, XXL"
                onKeyPress={(e) => { if (e.key === "Enter") handleAddCustomSize(); }}
                className="h-8 text-sm"
              />
              <Button onClick={handleAddCustomSize} size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-base">Colores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex gap-1">
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Ej: Rosado, Negro, Azul"
                onKeyPress={(e) => { if (e.key === "Enter") handleAddColor(); }}
                className="h-8 text-sm"
              />
              <Button onClick={handleAddColor} size="sm" className="h-8">Agregar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleAddMedia}
        className="hidden"
      />

      {/* Fotos y Stock por Color */}
      {colors.length > 0 && (
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Fotos y Stock por Color</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3 px-4">

          {colorGroups.map((group) => (
            <div key={group.color} className="border rounded p-2 space-y-2">
              <div className="flex items-center gap-2 justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{group.color}</h3>
                  <Button 
                    size="icon" 
                    variant="outline"
                    className="h-6 w-6"
                    onClick={() => { setSelectedColor(group.color); fileInputRef.current?.click(); }}
                    title="Agregar fotos para este color"
                    data-testid="button-add-photos"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={() => handleRemoveColor(group.color)}
                    title="Eliminar color"
                    data-testid="button-delete-color"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {group.photos.length > 0 && (
                <div className="flex gap-2 items-end mb-2 pb-2 border-b">
                  <div className="flex-1">
                    <Label className="text-xs">Talla</Label>
                    <Select
                      value={colorSizeQuantity[group.color]?.size || "none"}
                      onValueChange={(v) => setColorSizeQuantity(prev => ({
                        ...prev,
                        [group.color]: { ...prev[group.color], size: v === "none" ? "" : v }
                      }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin talla</SelectItem>
                        {allSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Cantidad</Label>
                    <div className="flex items-center gap-0.5 border rounded px-1 bg-background h-7">
                      <button
                        className="text-xs hover:bg-muted rounded px-0.5"
                        onClick={() => setColorSizeQuantity(prev => ({
                          ...prev,
                          [group.color]: { ...prev[group.color], quantity: Math.max(0, (prev[group.color]?.quantity || 0) - 1) }
                        }))}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs font-medium">{colorSizeQuantity[group.color]?.quantity || 0}</span>
                      <button
                        className="text-xs hover:bg-muted rounded px-0.5"
                        onClick={() => setColorSizeQuantity(prev => ({
                          ...prev,
                          [group.color]: { ...prev[group.color], quantity: (prev[group.color]?.quantity || 0) + 1 }
                        }))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {group.photos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin fotos</p>
              ) : (
                <div className="space-y-2">
                  {group.photos.map((photo, idx) => (
                    <div key={photo.id} className="bg-muted p-2 rounded flex gap-2 items-start relative">
                      {idx === 0 && <Badge className="absolute top-1 left-1 bg-blue-500 text-white text-xs">Principal</Badge>}
                      {photo.url && (
                        <div className="relative h-16 w-16 flex-shrink-0 bg-background rounded overflow-hidden flex items-center justify-center border">
                          <img
                            src={photo.url}
                            alt="preview"
                            className="h-full w-full object-cover"
                            onLoad={() => console.log("Image loaded:", photo.id)}
                            onError={() => console.error("Image error:", photo.id, photo.url)}
                          />
                        </div>
                      )}

                      <div className="flex-1" />

                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMediaUp(photo.id)}
                          disabled={idx === 0}
                          title="Mover arriba"
                        >
                          <ChevronUp className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMediaDown(photo.id)}
                          disabled={idx === group.photos.length - 1}
                          title="Mover abajo"
                        >
                          <ChevronDown className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={() => handleRemoveMedia(photo.id)}
                          title="Eliminar foto"
                          data-testid="button-delete-photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {group.photos.length > 0 && (
                <div className="text-xs font-medium border-t pt-1 text-muted-foreground">
                  Subtotal {group.color}: {group.photos.reduce((sum, p) => sum + p.quantity, 0)} un.
                </div>
              )}
            </div>
          ))}

          {mediaItems.length > 0 && (
            <div className="border-t pt-2 text-sm font-bold bg-primary/10 p-2 rounded">
              STOCK: {totalStock} un.
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Botones */}
      <div className="flex gap-2 justify-between pt-1">
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} size="sm">
          Cancelar
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name || !price}
          className="gap-2 text-sm"
          size="sm"
        >
          <Save className="h-3 w-3" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
    color: string;
    url: string;
    size: string;
    quantity: number;
  }>>([]);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["/api/sub-categories"],
  });

  const { data: product } = useQuery({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetch(`/api/products/${productId}`);
      return res.json();
    },
  });

  // Load product
  useEffect(() => {
    if (product && productId) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price);
      setCategoryId(product.categoryId || "");
      setSubCategoryId(product.subCategoryId || "");
      
      let parsedColors: string[] = [];
      try {
        if (!product.colors || product.colors === '' || product.colors === 'undefined') {
          parsedColors = [];
        } else if (typeof product.colors === 'string') {
          parsedColors = JSON.parse(product.colors);
          if (!Array.isArray(parsedColors)) parsedColors = [];
        } else if (Array.isArray(product.colors)) {
          parsedColors = product.colors;
        }
      } catch (e) {
        console.error("Error parsing colors:", e, "value:", product.colors);
        parsedColors = [];
      }
      setColors(parsedColors);

      // Parse media
      let media: any[] = [];
      if (product.mediaUrls) {
        try {
          const parsed = typeof product.mediaUrls === 'string' ? JSON.parse(product.mediaUrls) : product.mediaUrls;
          if (Array.isArray(parsed)) {
            parsed.forEach((colorGroup: any) => {
              if (colorGroup.photos) {
                colorGroup.photos.forEach((photo: any, idx: number) => {
                  media.push({
                    id: `${colorGroup.color}-${idx}`,
                    color: colorGroup.color,
                    url: photo.url,
                    size: photo.size || "",
                    quantity: photo.quantity || 0,
                  });
                });
              }
            });
          }
        } catch (e) {
          console.error("Error parsing mediaUrls:", e);
        }
      }
      setMediaItems(media);

      // Extract custom sizes
      const existingSizes = new Set<string>();
      media.forEach(m => {
        if (m.size && !DEFAULT_SIZES.includes(m.size)) {
          existingSizes.add(m.size);
        }
      });
      setCustomSizes(Array.from(existingSizes));
    }
  }, [product, productId]);

  // Calculate stock
  const totalStock = mediaItems.reduce((sum, item) => sum + item.quantity, 0);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Group media by color - INCLUDE ALL PHOTOS (new and existing)
      const mediaByColor: any[] = [];
      colors.forEach(color => {
        const colorPhotos = mediaItems.filter(m => m.color === color);
        if (colorPhotos.length > 0) {
          mediaByColor.push({
            color,
            photos: colorPhotos.map(p => ({
              url: p.url,
              size: p.size,
              quantity: p.quantity,
            })),
          });
        }
      });

      // Prepare FormData
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("price", price);
      fd.append("stock", String(totalStock));
      fd.append("categoryId", categoryId || "");
      fd.append("subCategoryId", subCategoryId || "");
      fd.append("colors", JSON.stringify(colors));
      fd.append("mediaUrls", JSON.stringify(mediaByColor));

      if (!productId) {
        fd.append("slug", name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      }

      // Upload new media files
      for (const item of mediaItems) {
        if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
          try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            fd.append("media", blob, `photo-${Date.now()}.${blob.type.split('/')[1]}`);
          } catch (e) {
            console.error("Error converting media:", e);
          }
        }
      }

      if (productId) {
        return apiRequest("PUT", `/api/products/${productId}`, fd);
      }
      return apiRequest("POST", "/api/products", fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: productId ? "Producto actualizado" : "Producto creado" });
      navigate("/admin/dashboard");
    },
    onError: (e: any) => {
      console.error("Error:", e);
      toast({ title: "Error al guardar", variant: "destructive" });
    },
  });

  // Handlers
  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor)) {
      const updatedColors = [...colors, newColor];
      setColors(updatedColors);
      setNewColor("");
      toast({ title: `Color "${newColor}" agregado` });
    }
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
    setMediaItems(mediaItems.filter(m => m.color !== color));
    if (selectedColor === color) setSelectedColor(null);
  };

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedColor) {
      toast({ title: "Selecciona un color primero", variant: "destructive" });
      return;
    }

    const files = Array.from(e.target.files || []);
    let loadedCount = 0;

    files.forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newItem = {
          id: `${selectedColor}-${Date.now()}-${fileIdx}`,
          color: selectedColor,
          url: reader.result as string,
          size: "",
          quantity: 0,
        };
        console.log("Adding photo:", newItem.id, "URL length:", (reader.result as string).length);
        setMediaItems(prev => [...prev, newItem]);
        loadedCount++;
        if (loadedCount === files.length) {
          toast({ title: `${files.length} foto(s) agregada(s)` });
        }
      };
      reader.onerror = () => {
        toast({ title: `Error al cargar ${file.name}`, variant: "destructive" });
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = "";
  };

  const handleRemoveMedia = async (id: string) => {
    const itemToRemove = mediaItems.find(m => m.id === id);
    
    // Si es URL de Supabase, eliminarla del storage
    if (itemToRemove && itemToRemove.url.includes('supabase')) {
      try {
        await apiRequest("DELETE", `/api/media/delete`, {
          url: itemToRemove.url
        });
      } catch (error) {
        console.error("Error deleting from Supabase:", error);
        toast({ title: "Error al eliminar foto de Supabase", variant: "destructive" });
      }
    }
    
    // Eliminar del estado local
    setMediaItems(mediaItems.filter(m => m.id !== id));
  };

  const updateMedia = (id: string, updates: any) => {
    setMediaItems(
      mediaItems.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  };

  const moveMediaUp = (id: string) => {
    const idx = mediaItems.findIndex(m => m.id === id);
    if (idx > 0) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]];
      setMediaItems(newItems);
    }
  };

  const moveMediaDown = (id: string) => {
    const idx = mediaItems.findIndex(m => m.id === id);
    if (idx < mediaItems.length - 1) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      setMediaItems(newItems);
    }
  };

  const handleAddCustomSize = () => {
    if (newCustomSize.trim() && !customSizes.includes(newCustomSize) && !DEFAULT_SIZES.includes(newCustomSize)) {
      setCustomSizes([...customSizes, newCustomSize]);
      setNewCustomSize("");
      toast({ title: `Talla "${newCustomSize}" agregada` });
    }
  };

  const allSizes = [...DEFAULT_SIZES, ...customSizes];
  const colorGroups = colors.map(color => ({
    color,
    photos: mediaItems.filter(m => m.color === color),
  }));

  return (
    <div className="space-y-3 max-w-5xl">
      <div className="flex items-center gap-4 pb-2">
        <h1 className="text-2xl font-bold">{productId ? "Editar Producto" : "Crear Producto"}</h1>
      </div>

      {/* Información Básica */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-3 px-4">
          <div>
            <Label className="text-xs">Nombre*</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción del producto" className="text-sm min-h-16" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Precio*</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(""); }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subcategoría</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryId ? subCategories
                    .filter(sc => sc.categoryId === categoryId)
                    .map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                    )) : <SelectItem value="none" disabled>Elige categoría primero</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tallas y Colores */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-base">Tallas</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Por defecto: S, M, L, XL</p>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex flex-wrap gap-1">
              {customSizes.map((size) => (
                <Badge key={size} className="gap-1 text-xs" variant="secondary">
                  {size}
                  <button onClick={() => setCustomSizes(customSizes.filter(s => s !== size))}><X className="h-2 w-2" /></button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-1">
              <Input
                value={newCustomSize}
                onChange={(e) => setNewCustomSize(e.target.value)}
                placeholder="Ej: 10, Niño, XXL"
                onKeyPress={(e) => { if (e.key === "Enter") handleAddCustomSize(); }}
                className="h-8 text-sm"
              />
              <Button onClick={handleAddCustomSize} size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-base">Colores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-3 px-4">
            <div className="flex gap-1">
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Ej: Rosado, Negro, Azul"
                onKeyPress={(e) => { if (e.key === "Enter") handleAddColor(); }}
                className="h-8 text-sm"
              />
              <Button onClick={handleAddColor} size="sm" className="h-8">Agregar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleAddMedia}
        className="hidden"
      />

      {/* Fotos y Stock por Color */}
      {colors.length > 0 && (
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-base">Fotos y Stock por Color</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3 px-4">

          {colorGroups.map((group) => (
            <div key={group.color} className="border rounded p-2 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">{group.color}</h3>
                <Button 
                  size="icon" 
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => { setSelectedColor(group.color); fileInputRef.current?.click(); }}
                  title="Agregar fotos para este color"
                  data-testid="button-add-photos"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 hover:text-destructive"
                  onClick={() => handleRemoveColor(group.color)}
                  title="Eliminar color"
                  data-testid="button-delete-color"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {group.photos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin fotos</p>
              ) : (
                <div className="space-y-2">
                  {group.photos.map((photo, idx) => (
                    <div key={photo.id} className="bg-muted p-2 rounded flex gap-2 items-start relative">
                      {idx === 0 && <Badge className="absolute top-1 left-1 bg-blue-500 text-white text-xs">Principal</Badge>}
                      {photo.url && (
                        <div className="relative h-16 w-16 flex-shrink-0 bg-background rounded overflow-hidden flex items-center justify-center border">
                          <img
                            src={photo.url}
                            alt="preview"
                            className="h-full w-full object-cover"
                            onLoad={() => console.log("Image loaded:", photo.id)}
                            onError={() => console.error("Image error:", photo.id, photo.url)}
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex gap-1">
                          <Select
                            value={photo.size || "none"}
                            onValueChange={(v) => updateMedia(photo.id, { size: v === "none" ? "" : v })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin talla</SelectItem>
                              {allSizes.map((size) => (
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-0.5 border rounded px-1 bg-background">
                            <button
                              className="text-xs hover:bg-muted rounded px-0.5"
                              onClick={() => updateMedia(photo.id, { quantity: Math.max(0, photo.quantity - 1) })}
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-xs font-medium">{photo.quantity}</span>
                            <button
                              className="text-xs hover:bg-muted rounded px-0.5"
                              onClick={() => updateMedia(photo.id, { quantity: photo.quantity + 1 })}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMediaUp(photo.id)}
                          disabled={idx === 0}
                          title="Mover arriba"
                        >
                          <ChevronUp className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveMediaDown(photo.id)}
                          disabled={idx === group.photos.length - 1}
                          title="Mover abajo"
                        >
                          <ChevronDown className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={() => handleRemoveMedia(photo.id)}
                          title="Eliminar foto"
                          data-testid="button-delete-photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {group.photos.length > 0 && (
                <div className="text-xs font-medium border-t pt-1 text-muted-foreground">
                  Subtotal {group.color}: {group.photos.reduce((sum, p) => sum + p.quantity, 0)} un.
                </div>
              )}
            </div>
          ))}

          {mediaItems.length > 0 && (
            <div className="border-t pt-2 text-sm font-bold bg-primary/10 p-2 rounded">
              STOCK: {totalStock} un.
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Botones */}
      <div className="flex gap-2 justify-between pt-1">
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")} size="sm">
          Cancelar
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name || !price}
          className="gap-2 text-sm"
          size="sm"
        >
          <Save className="h-3 w-3" />
          {saveMutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
