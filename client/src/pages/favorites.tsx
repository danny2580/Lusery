import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { toggleFavorite, getFavorites } from "@/lib/favorites";
import { addToCart } from "@/lib/cart";
import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function Favorites() {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());

    const handleFavoritesUpdate = (e: CustomEvent) => {
      setFavorites(e.detail);
    };

    window.addEventListener("favorites-updated", handleFavoritesUpdate as EventListener);
    return () => window.removeEventListener("favorites-updated", handleFavoritesUpdate as EventListener);
  }, []);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  const handleToggleFavorite = (productId: string) => {
    const result = toggleFavorite(productId);
    setFavorites(result.favorites);
    toast({
      title: "Eliminado de favoritos",
      duration: 1200,
    });
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    toast({
      title: "Agregado al carrito",
      description: product.name,
      duration: 1200,
    });
    window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-favorites-title">
            Mis Favoritos
          </h1>
          <p className="text-muted-foreground">
            {favoriteProducts.length} {favoriteProducts.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-no-favorites">
              No tienes favoritos aún
            </h2>
            <p className="text-muted-foreground mb-6">
              Explora nuestra colección y guarda tus productos favoritos
            </p>
            <Link href="/">
              <Button data-testid="button-browse-products">
                Explorar Productos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" data-testid="grid-favorites">
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
