import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Package, FolderTree, Image, LogOut, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoUrl from "@assets/file_00000000b16c71f5ab7a8039afa27aca_1763943356526.png";
import { Button } from "./ui/button";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    url: "/admin/products",
    icon: Package,
  },
  {
    title: "Categorías",
    url: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Multimedia",
    url: "/admin/media",
    icon: Image,
  },
];

export function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    onLogout();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="LUSERY" className="h-8 w-auto" />
          <div>
            <p className="text-sm font-semibold">LUSERY</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
