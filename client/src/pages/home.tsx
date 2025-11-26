import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, Category, SubCategory } from "@shared/schema";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { toggleFavorite, getFavorites } from "@/lib/favorites";
import { addToCart } from "@/lib/cart";
import { wsClient } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { searchProducts } from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("all");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Load favorites on mount and sync across pages
  useEffect(() => {
    setFavorites(getFavorites());

    const handleFavoritesUpdate = (e: CustomEvent) => {
      setFavorites(e.detail);
    };

    window.addEventListener("favorites-updated", handleFavoritesUpdate as EventListener);
    return () => window.removeEventListener("favorites-updated", handleFavoritesUpdate as EventListener);
  }, []);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    wsClient.connect();

    const handleProductUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    };

    const handleCategoryUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    };

    wsClient.on("product-created", handleProductUpdate);
    wsClient.on("product-updated", handleProductUpdate);
    wsClient.on("product-deleted", handleProductUpdate);
    wsClient.on("category-created", handleCategoryUpdate);
    wsClient.on("category-deleted", handleCategoryUpdate);

    return () => {
      wsClient.off("product-created", handleProductUpdate);
      wsClient.off("product-updated", handleProductUpdate);
      wsClient.off("product-deleted", handleProductUpdate);
      wsClient.off("category-created", handleCategoryUpdate);
      wsClient.off("category-deleted", handleCategoryUpdate);
    };
  }, []);

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch subcategories
  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["/api/sub-categories"],
  });

  // Extract unique colors and sizes from all products
  const extractColors = (): string[] => {
    const colorsSet = new Set<string>();
    products.forEach(product => {
      if (product.mediaUrls) {
        try {
          let media = product.mediaUrls;
          if (typeof media === 'string') {
            media = JSON.parse(media);
          }
          if (Array.isArray(media)) {
            media.forEach((item: any) => {
              if (typeof item === 'object' && item.color) {
                colorsSet.add(item.color);
              }
            });
          }
        } catch (e) {
          // Skip parsing errors
        }
      }
    });
    return Array.from(colorsSet).sort();
  };

  const extractSizes = (): string[] => {
    const sizesSet = new Set<string>();
    products.forEach(product => {
      if (product.mediaUrls) {
        try {
          let media = product.mediaUrls;
          if (typeof media === 'string') {
            media = JSON.parse(media);
          }
          if (Array.isArray(media)) {
            media.forEach((item: any) => {
              if (typeof item === 'object' && item.photos && Array.isArray(item.photos)) {
                item.photos.forEach((photo: any) => {
                  if (photo.size) {
                    sizesSet.add(photo.size);
                  }
                });
              }
            });
          }
        } catch (e) {
          // Skip parsing errors
        }
      }
    });
    return Array.from(sizesSet).sort();
  };

  const colors = extractColors();
  const sizes = extractSizes();

  // Helper function to check if product has color
  const productHasColor = (product: Product, color: string): boolean => {
    if (!product.mediaUrls) return false;
    try {
      let media = product.mediaUrls;
      if (typeof media === 'string') {
        media = JSON.parse(media);
      }
      if (Array.isArray(media)) {
        return media.some((item: any) => typeof item === 'object' && item.color === color);
      }
    } catch (e) {
      // Skip parsing errors
    }
    return false;
  };

  // Helper function to check if product has size
  const productHasSize = (product: Product, size: string): boolean => {
    if (!product.mediaUrls) return false;
    try {
      let media = product.mediaUrls;
      if (typeof media === 'string') {
        media = JSON.parse(media);
      }
      if (Array.isArray(media)) {
        return media.some((item: any) => {
          if (typeof item === 'object' && item.photos && Array.isArray(item.photos)) {
            return item.photos.some((photo: any) => photo.size === size);
          }
          return false;
        });
      }
    } catch (e) {
      // Skip parsing errors
    }
    return false;
  };

  // Filter products using advanced search
  let filteredProducts = products;
  
  if (searchQuery) {
    const categoryId = selectedCategories.length > 0 ? selectedCategories[0] : undefined;
    // Use the advanced search engine results
    filteredProducts = products.filter(p => 
      searchQuery === "" || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else if (selectedSubCategoryId) {
    // If subcategory is selected, filter by subcategory
    filteredProducts = products.filter(product => 
      product.subCategoryId === selectedSubCategoryId
    );
  } else if (selectedCategories.length > 0) {
    // If only category is selected, filter by category
    filteredProducts = products.filter(product => 
      product.categoryId && selectedCategories.includes(product.categoryId)
    );
  }

  // Apply color filter
  if (selectedColor) {
    filteredProducts = filteredProducts.filter(p => productHasColor(p, selectedColor));
  }

  // Apply size filter
  if (selectedSize) {
    filteredProducts = filteredProducts.filter(p => productHasSize(p, selectedSize));
  }

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    // Priority: Products with stock first
    const aStock = parseInt(String(a.stock), 10) || 0;
    const bStock = parseInt(String(b.stock), 10) || 0;
    
    const aAvailable = aStock > 0 ? 1 : 0;
    const bAvailable = bStock > 0 ? 1 : 0;
    
    if (aAvailable !== bAvailable) {
      return bAvailable - aAvailable; // Available products first
    }
    
    // Then apply sort preference
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "all":
      default:
        return 0; // No specific sort order
    }
  });

  const handleToggleFavorite = (productId: string) => {
    const result = toggleFavorite(productId);
    setFavorites(result.favorites);
    
    toast({
      title: result.isNowFavorite ? "Agregado a favoritos" : "Eliminado de favoritos",
      duration: 1200,
    });
  };

  const handleAddToCart = (product: Product) => {
    const stock = parseInt(String(product.stock), 10);
    if (stock <= 0) {
      toast({
        title: "Producto agotado",
        description: "No hay stock disponible",
        variant: "destructive",
        duration: 1200,
      });
      return;
    }
    addToCart(product);
    toast({
      title: "Agregado al carrito",
      description: product.name,
      duration: 1200,
    });
    // Dispatch event to update cart count
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleCategoryChange = (input: string) => {
    // Check if this is a combined category:subcategory ID
    if (input.includes(":")) {
      const [categoryId, subCategoryId] = input.split(":");
      setSelectedCategories([categoryId]);
      setSelectedSubCategoryId(subCategoryId);
      return;
    }
    
    // This is just a category ID
    if (selectedCategories.includes(input)) {
      // Deselect if already selected
      setSelectedCategories([]);
      setSelectedSubCategoryId(null);
    } else {
      // Select new category, clear subcategory
      setSelectedCategories([input]);
      setSelectedSubCategoryId(null);
    }
  };

  const handleColorChange = (color: string | null) => {
    setSelectedColor(color);
    if (color && productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleSizeChange = (size: string | null) => {
    setSelectedSize(size);
    if (size && productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleClearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubCategoryId(null);
    setSearchQuery("");
    setSelectedColor(null);
    setSelectedSize(null);
  };

  // Expose search handler for header
  useEffect(() => {
    const handleSearch = ((e: CustomEvent) => {
      setSearchQuery(e.detail);
    }) as EventListener;

    window.addEventListener("search-query", handleSearch);
    return () => window.removeEventListener("search-query", handleSearch);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />

      {/* Search Section */}
      <section className="py-6 md:py-8 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar producto..."
                className="pl-12 pr-4 h-11 text-base rounded-lg border-2 border-primary/30 focus-visible:border-primary bg-white dark:bg-black/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-categories"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-4 md:py-6 bg-muted/30" ref={categoriesRef}>
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-categories-title">Categorías</h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay categorías disponibles</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-3 py-2 rounded-lg border transition-all hover-elevate cursor-pointer flex flex-col items-center justify-center ${
                    selectedCategories.includes(category.id)
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/60"
                      : "bg-card border-border hover:border-foreground"
                  }`}
                  data-testid={`button-category-${category.id}`}
                >
                  <h3 className="font-semibold text-xs md:text-sm text-center">{category.name}</h3>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Products Section */}
      <section className="py-4 md:py-6" id="productos" ref={productsRef}>
        <div className="container mx-auto px-4 md:px-6">
          {/* Filters Bar */}
          <div className="mb-4 space-y-3">
            {/* Type of Garment Filter */}
            {selectedCategories.length > 0 && subCategories.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Tipo de Prenda</h3>
                <div className="flex flex-wrap gap-2">
                  {subCategories
                    .filter((sub) => sub.categoryId === selectedCategories[0])
                    .map((subCategory) => (
                      <button
                        key={subCategory.id}
                        onClick={() => {
                          if (selectedSubCategoryId === subCategory.id) {
                            setSelectedSubCategoryId(null);
                          } else {
                            setSelectedSubCategoryId(subCategory.id);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          selectedSubCategoryId === subCategory.id
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/60"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                        data-testid={`button-subcategory-${subCategory.id}`}
                      >
                        {subCategory.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Sort Filter */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Ordenar</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSortBy("all")}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    sortBy === "all" ? "bg-primary text-primary-foreground shadow-md shadow-primary/60" : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  data-testid="button-sort-all"
                >
                  Todos
                </button>
                <button
                  onClick={() => setSortBy("newest")}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    sortBy === "newest" ? "bg-primary text-primary-foreground shadow-md shadow-primary/60" : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  data-testid="button-sort-newest"
                >
                  Nuevos
                </button>
                <button
                  onClick={() => setSortBy("price-low")}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    sortBy === "price-low" ? "bg-primary text-primary-foreground shadow-md shadow-primary/60" : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  data-testid="button-sort-price-low"
                >
                  Menor Precio
                </button>
                <button
                  onClick={() => setSortBy("price-high")}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    sortBy === "price-high" ? "bg-primary text-primary-foreground shadow-md shadow-primary/60" : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  data-testid="button-sort-price-high"
                >
                  Mayor Precio
                </button>
              </div>
            </div>
          </div>

              {/* Products */}
              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-square w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground" data-testid="text-no-products">
                    No se encontraron productos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="grid-products">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={favorites.includes(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}
        </div>
      </section>
    </div>
  );
}
