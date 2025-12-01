});
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
