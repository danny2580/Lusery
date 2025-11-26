import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, ShoppingCart, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toggleFavorite, isFavorite } from "@/lib/favorites";
import { addToCart } from "@/lib/cart";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<string>();
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products/slug", params?.slug],
    enabled: !!params?.slug,
  });

  // Check if product is favorite
  useState(() => {
    if (product) {
      setFavorite(isFavorite(product.id));
    }
  });

  // Toggle color selection and auto-change image
  const handleColorSelect = (color: string) => {
    if (selectedColor === color) {
      // Deselect if already selected
      setSelectedColor(undefined);
      setCurrentImageIndex(0);
    } else {
      // Select and show corresponding image
      setSelectedColor(color);
      setCurrentImageIndex(0);
    }
  };

  // Toggle size selection
  const handleSizeSelect = (size: string) => {
    if (selectedSize === size) {
      setSelectedSize(undefined);
    } else {
      setSelectedSize(size);
    }
  };

  // Scroll thumbnails carousel
  const handleThumbnailScroll = (direction: "left" | "right") => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = 120;
      if (direction === "left") {
        thumbnailContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        thumbnailContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 md:px-6">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  const parseMediaUrls = () => {
    if (!product.mediaUrls) return [];
    if (typeof product.mediaUrls === 'string') {
      try { 
        const parsed = JSON.parse(product.mediaUrls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.photos) {
            // Si hay color seleccionado, mostrar solo las fotos de ese color
            if (selectedColor) {
              const colorGroup = parsed.find((cg: any) => cg.color === selectedColor);
              if (colorGroup?.photos) {
                return colorGroup.photos.map((p: any) => p.url);
              }
              return [];
            }
            // Si no hay color seleccionado, mostrar todas las fotos de todos los colores
            return parsed.flatMap((cg: any) => (cg.photos || []).map((p: any) => p.url));
          }
          return parsed.map((m: any) => m.url);
        }
        return []; 
      }
      catch { return []; }
    }
    const arr = product.mediaUrls as any;
    if (Array.isArray(arr) && arr[0]?.photos) {
      if (selectedColor) {
        const colorGroup = arr.find((cg: any) => cg.color === selectedColor);
        if (colorGroup?.photos) {
          return colorGroup.photos.map((p: any) => p.url);
        }
        return [];
      }
      return arr.flatMap((cg: any) => (cg.photos || []).map((p: any) => p.url));
    }
    return arr.map((m: any) => typeof m === 'string' ? m : m.url);
  };

  const parseColors = () => {
    if (!product.colors) return [];
    if (typeof product.colors === 'string') {
      try {
        const parsed = JSON.parse(product.colors);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(product.colors) ? product.colors : [];
  };

  const parseSizes = () => {
    // Extract sizes from mediaUrls (where they're actually stored)
    const sizesSet = new Map<string, number>();
    
    if (product.mediaUrls) {
      try {
        const mediaUrls = typeof product.mediaUrls === 'string' ? JSON.parse(product.mediaUrls) : product.mediaUrls;
        if (Array.isArray(mediaUrls)) {
          mediaUrls.forEach((colorGroup: any) => {
            if (colorGroup.photos && Array.isArray(colorGroup.photos)) {
              colorGroup.photos.forEach((photo: any) => {
                if (photo.size) {
                  const current = sizesSet.get(photo.size) || 0;
                  sizesSet.set(photo.size, current + (photo.quantity || 0));
                }
              });
            }
          });
        }
      } catch (e) {
        console.error("Error parsing sizes from mediaUrls:", e);
      }
    }
    
    // Convert to array format and sort
    const sizeOrder = ["S", "M", "L", "XL"];
    const sizes = Array.from(sizesSet.entries())
      .map(([size, quantity]) => ({ size, quantity }))
      .sort((a, b) => {
        const aIndex = sizeOrder.indexOf(a.size);
        const bIndex = sizeOrder.indexOf(b.size);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    
    return sizes;
  };

  const images = parseMediaUrls();
  const sizeList = parseSizes();
  const colors = parseColors();
  const hasImages = images.length > 0;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleToggleFavorite = () => {
    const result = toggleFavorite(product.id);
    setFavorite(result.isNowFavorite);
    toast({
      title: result.isNowFavorite ? "Agregado a favoritos" : "Eliminado de favoritos",
      duration: 1200,
    });
  };

  const handleAddToCart = () => {
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
    
    addToCart(product, selectedSize, selectedColor);
    
    let description = product.name;
    if (selectedColor) description += ` - ${selectedColor}`;
    if (selectedSize) description += ` - Talla ${selectedSize}`;
    
    toast({
      title: "Agregado al carrito",
      description: description,
      duration: 1200,
    });
    window.dispatchEvent(new Event("cart-updated"));
  };

  const handleWhatsAppOrder = () => {
    let message = `Hola, me interesa el producto: *${product.name.trim()}*\nPrecio: $${parseFloat(product.price).toFixed(2)}`;
    if (selectedSize) message += `\nTalla: ${selectedSize}`;
    if (selectedColor) message += `\nColor: ${selectedColor}`;
    const whatsappUrl = `https://wa.me/593979079064?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen py-8 md:py-12 text-[15px] font-normal">
      <div className="container mx-auto px-4 md:px-6">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        {/* Product Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <Card className="relative aspect-square overflow-hidden group">
              {hasImages ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    data-testid="img-product-main"
                  />
                  
                  {images.length > 1 && (
                    <>
                      {/* Navigation Arrows */}
                      <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full shadow-lg"
                          onClick={handlePrevImage}
                          data-testid="button-prev-image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full shadow-lg"
                          onClick={handleNextImage}
                          data-testid="button-next-image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Badge variant="secondary" data-testid="badge-image-counter">
                          {currentImageIndex + 1} / {images.length}
                        </Badge>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                  Sin imagen disponible
                </div>
              )}
            </Card>

            {/* Thumbnail Gallery Carousel */}
            {images.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleThumbnailScroll("left")}
                    data-testid="button-thumbnail-prev"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div
                    ref={thumbnailContainerRef}
                    className="flex gap-2 overflow-x-auto scroll-smooth flex-1"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                          index === currentImageIndex ? "border-primary" : "border-transparent hover:border-muted-foreground"
                        }`}
                        data-testid={`button-thumbnail-${index}`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleThumbnailScroll("right")}
                    data-testid="button-thumbnail-next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div>
              <h1 className="text-lg md:text-xl font-bold mb-1 line-clamp-2" data-testid="text-product-name">
                {product.name}
              </h1>
              {product.featured && (
                <Badge className="mb-2 w-fit" data-testid="badge-featured">
                  Destacado
                </Badge>
              )}
              <p className="text-xl md:text-2xl font-bold" data-testid="text-product-price">
                ${parseFloat(product.price).toFixed(2)}
              </p>
            </div>

            {product.description && (
              <div>
                <h3 className="font-semibold mb-1 text-sm">Descripción</h3>
                <p className="text-muted-foreground text-sm" data-testid="text-product-description">
                  {product.description}
                </p>
              </div>
            )}

            {/* Colors */}
            {colors && colors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <Button
                      key={color}
                      variant={selectedColor === color ? "default" : "outline"}
                      onClick={() => handleColorSelect(color)}
                      data-testid={`button-color-${color}`}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizeList && sizeList.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Talla {selectedColor && `(${selectedColor})`} - Stock</h3>
                <div className="flex flex-wrap gap-2">
                  {sizeList.map((item: any) => (
                    <Button
                      key={item.size}
                      variant={selectedSize === item.size ? "default" : "outline"}
                      onClick={() => handleSizeSelect(item.size)}
                      disabled={item.quantity === 0}
                      data-testid={`button-size-${item.size}`}
                    >
                      {item.size} ({item.quantity})
                    </Button>
                  ))}
                </div>
                {selectedSize && selectedColor && (
                  <p className="text-sm text-muted-foreground mt-2" data-testid="text-size-color-selected">
                    Seleccionado: {selectedColor} - Talla {selectedSize}
                  </p>
                )}
              </div>
            )}

            {/* Stock Info */}
            <div>
              {product.stock === 0 ? (
                <Badge variant="secondary" className="text-xs py-1" data-testid="badge-out-of-stock">
                  Agotado
                </Badge>
              ) : product.stock <= 5 ? (
                <p className="text-xs text-destructive" data-testid="text-low-stock">
                  ¡Solo quedan {product.stock} en stock!
                </p>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-in-stock">
                  En stock
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  onClick={handleWhatsAppOrder}
                  disabled={parseInt(String(product.stock), 10) <= 0}
                  data-testid="button-whatsapp-order"
                >
                  <MessageCircle className="h-5 w-5" />
                  Hacer Pedido vía WhatsApp
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={parseInt(String(product.stock), 10) <= 0}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Agregar al Carrito
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleToggleFavorite}
                  data-testid="button-toggle-favorite"
                >
                  <Heart className={`h-5 w-5 ${favorite ? "fill-current text-destructive" : ""}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
