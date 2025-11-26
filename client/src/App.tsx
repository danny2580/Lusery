import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./components/admin-sidebar";
import { Header } from "./components/header";
import { CartSidebar } from "./components/cart-sidebar";
import { ProtectedRoute } from "./components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "./pages/home";
import ProductDetail from "./pages/product-detail";
import Favorites from "./pages/favorites";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import AdminProductForm from "./pages/admin-product-form";
import AdminCategories from "./pages/admin-categories";
import AdminSubCategories from "./pages/admin-sub-categories";
import AdminMedia from "./pages/admin-media";
import { useState, useEffect } from "react";
import { getCart, updateCartQuantity, removeFromCart, getCartCount } from "./lib/cart";
import { getFavorites, initializeFavorites } from "./lib/favorites";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    setLocation("/admin/login");
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const isAdminLogin = location === "/admin/login";

  if (isAdminRoute && !isAdminLogin) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <Switch>
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/product-form" component={AdminProductForm} />
            <Route path="/admin/categories" component={AdminCategories} />
            <Route path="/admin/sub-categories" component={AdminSubCategories} />
            <Route path="/admin/media" component={AdminMedia} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location] = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(getCart());
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdminRoute = location.startsWith("/admin");

  useEffect(() => {
    initializeFavorites();
    const favorites = getFavorites();
    console.log("App mount: favorites count =", favorites.length);
    setFavoritesCount(favorites.length);
  }, []);

  useEffect(() => {
    const updateCart = () => {
      setCart(getCart());
    };

    const updateFavorites = () => {
      setFavoritesCount(getFavorites().length);
    };

    window.addEventListener("cart-updated", updateCart);
    window.addEventListener("favorites-updated", updateFavorites);
    return () => {
      window.removeEventListener("cart-updated", updateCart);
      window.removeEventListener("favorites-updated", updateFavorites);
    };
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    window.dispatchEvent(new CustomEvent("search-query", { detail: query }));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen">
            {!isAdminRoute && (
              <Header
                cartCount={getCartCount(cart)}
                favoritesCount={favoritesCount}
                onCartClick={() => setCartOpen(true)}
                onSearch={handleSearch}
              />
            )}
            <Router />
            {!isAdminRoute && (
              <CartSidebar
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                items={cart}
                onUpdateQuantity={(id, qty, size, color) => {
                  setCart(updateCartQuantity(id, qty, size, color));
                }}
                onRemove={(id, size, color) => {
                  setCart(removeFromCart(id, size, color));
                }}
              />
            )}
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
