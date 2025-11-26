import { ShoppingCart, Heart, Search, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "./theme-provider";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  cartCount: number;
  favoritesCount: number;
  onCartClick: () => void;
  onSearch: (query: string) => void;
}

export function Header({ cartCount, favoritesCount, onCartClick, onSearch }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const handleSearchChange = (value: string) => {
    onSearch(value);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-black">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-11 w-11" data-testid="button-mobile-menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/">
                  <Button variant={location === "/" ? "secondary" : "ghost"} className="w-full justify-start" data-testid="link-home-mobile">
                    Inicio
                  </Button>
                </Link>
                <Link href="/favorites">
                  <Button variant={location === "/favorites" ? "secondary" : "ghost"} className="w-full justify-start" data-testid="link-favorites-mobile">
                    Favoritos
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button variant={location.startsWith("/admin") ? "secondary" : "ghost"} className="w-full justify-start" data-testid="link-admin-mobile">
                    Admin
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/">
            <img src="/lusery-logo.png" alt="LUSERY Logo" className="h-20 w-auto cursor-pointer hover-elevate" data-testid="link-logo" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/">
              <Button variant={location === "/" ? "secondary" : "ghost"} data-testid="link-home">
                Inicio
              </Button>
            </Link>
            <Link href="/favorites">
              <Button variant={location === "/favorites" ? "secondary" : "ghost"} data-testid="link-favorites">
                Favoritos
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button variant={location.startsWith("/admin") ? "secondary" : "ghost"} data-testid="link-admin">
                Admin
              </Button>
            </Link>
          </nav>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                className="pl-9"
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-11 w-11"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="h-6 w-6" />
              ) : (
                <Sun className="h-6 w-6" />
              )}
            </Button>

            {/* Favorites */}
            <Link href="/favorites">
              <Button variant="ghost" size="icon" className="relative h-11 w-11" data-testid="button-favorites">
                <Heart className="h-6 w-6" />
                {favoritesCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    data-testid="badge-favorites-count"
                  >
                    {favoritesCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11"
              onClick={onCartClick}
              data-testid="button-cart"
              aria-label={`Carrito de compras${cartCount > 0 ? ` con ${cartCount} producto${cartCount !== 1 ? 's' : ''}` : ''}`}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  data-testid="badge-cart-count"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

      </div>
    </header>
  );
}
// Netlify build cache buster v2
