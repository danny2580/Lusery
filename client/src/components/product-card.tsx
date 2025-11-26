import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart } from "lucide-react";
import { Product } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, isFavorite, onToggleFavorite, onAddToCart }: ProductCardProps) {
  const [imageIndex, setImageIndex] = useState(0);
  
  const parseSizes = () => {
    if (!product.sizes) return [];
    if (typeof product.sizes === 'string') {
      try { return JSON.parse(product.sizes); }
      catch { return []; }
    }
    return Array.isArray(product.sizes) ? product.sizes : [];
  };

  const sizeList = parseSizes();
  const availableSizes = sizeList.filter((item: any) => item.quantity > 0).map((item: any) => item.size);
  
  const parseMediaUrls = () => {
    if (!product.mediaUrls) return [];
    if (typeof product.mediaUrls === 'string') {
      try { 
        const parsed = JSON.parse(product.mediaUrls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed[0]?.photos) {
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
      return arr.flatMap((cg: any) => (cg.photos || []).map((p: any) => p.url));
    }
    return arr.map((m: any) => typeof m === 'string' ? m : m.url);
  };

  const images = parseMediaUrls();
  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[imageIndex] : null;

  return (
    <Card className="group overflow-hidden border hover-elevate transition-all duration-200" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div 
          className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
          onMouseEnter={() => {
            if (hasImages && images.length > 1) {
              setImageIndex(1);
            }
          }}
          onMouseLeave={() => setImageIndex(0)}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-testid={`img-product-${product.id}`}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
          
          {/* Quick Actions - Hidden on mobile for better UX */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(product.id);
              }}
              data-testid={`button-favorite-${product.id}`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-destructive" : ""}`} />
            </Button>
          </div>

          {product.featured && (
            <Badge className="absolute top-2 left-2" data-testid={`badge-featured-${product.id}`}>
              Destacado
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/product/${product.slug}`}>
              <h3 className="font-semibold text-base line-clamp-2 hover:text-primary transition-colors cursor-pointer" data-testid={`text-product-name-${product.id}`}>
                {product.name}
              </h3>
            </Link>
          </div>
          
          {/* Mobile favorite button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 sm:hidden"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            data-testid={`button-favorite-mobile-${product.id}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current text-destructive" : ""}`} />
          </Button>
        </div>

        {availableSizes.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Tallas: {availableSizes.join(", ")}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Link href={`/product/${product.slug}`}>
            <p className="text-lg font-bold hover:text-primary transition-colors cursor-pointer" data-testid={`text-product-price-${product.id}`}>
              ${parseFloat(product.price).toFixed(2)}
            </p>
          </Link>

          <Button
            size="sm"
            variant="default"
            className="gap-2"
            disabled={parseInt(String(product.stock), 10) <= 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        </div>

        {parseInt(String(product.stock), 10) <= 5 && parseInt(String(product.stock), 10) > 0 && (
          <p className="text-xs text-destructive" data-testid={`text-low-stock-${product.id}`}>
            ¡Solo quedan {product.stock}!
          </p>
        )}

        {parseInt(String(product.stock), 10) <= 0 && (
          <Badge variant="secondary" className="w-full justify-center" data-testid={`badge-out-of-stock-${product.id}`}>
            Agotado
          </Badge>
        )}
      </div>
    </Card>
  );
}
