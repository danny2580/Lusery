import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown, ArrowUp, Sparkles, Grid, Palette, Ruler } from "lucide-react";
import { Category, SubCategory } from "@shared/schema";
import { CategorySelector } from "./category-selector";

interface ProductFiltersProps {
  categories: Category[];
  selectedCategories: string[];
  selectedSubCategoryId?: string | null;
  onCategoryChange: (categoryId: string) => void;
  sortBy?: string;
  selectedColor?: string | null;
  selectedSize?: string | null;
  colors?: string[];
  sizes?: string[];
  onSortChange?: (sort: string) => void;
  onColorChange?: (color: string | null) => void;
  onSizeChange?: (size: string | null) => void;
  onClearAllFilters?: () => void;
  subCategories?: SubCategory[];
}

export function ProductFilters({
  categories,
  selectedCategories,
  selectedSubCategoryId = null,
  onCategoryChange,
  sortBy = "all",
  selectedColor = null,
  selectedSize = null,
  colors = [],
  sizes = [],
  onSortChange = () => {},
  onColorChange = () => {},
  onSizeChange = () => {},
  onClearAllFilters = () => {},
  subCategories = []
}: ProductFiltersProps) {
  const [openSort, setOpenSort] = useState(false);
  const [openColorSubmenu, setOpenColorSubmenu] = useState(false);
  const [openSizeSubmenu, setOpenSizeSubmenu] = useState(false);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const [showSizeSubmenu, setShowSizeSubmenu] = useState(false);

  const sortOptions = [
    { value: "all", label: "Todos", icon: Grid },
    { value: "newest", label: "Nuevos", icon: Sparkles },
    { value: "price-low", label: "Menor Precio", icon: ArrowDown },
    { value: "price-high", label: "Mayor Precio", icon: ArrowUp },
  ];

  const filterOptions = [
    { value: "color", label: "Color", icon: Palette },
    { value: "size", label: "Talla", icon: Ruler },
  ];

  const handleSortSelect = (value: string) => {
    if (value === "color") {
      setShowColorSubmenu(true);
      return;
    }
    if (value === "size") {
      setShowSizeSubmenu(true);
      return;
    }
    
    // Handle "all" option - clear all filters
    if (value === "all") {
      onClearAllFilters();
      onSortChange("all");
      setOpenSort(false);
      return;
    }
    
    if (sortBy === value) {
      onSortChange("all");
    } else {
      onSortChange(value);
    }
    
    // Clear color and size filters when selecting a sort option
    if (value !== "color") onColorChange(null);
    if (value !== "size") onSizeChange(null);
    
    setOpenSort(false);
  };

  const handleColorSelect = (color: string) => {
    if (selectedColor === color) {
      onColorChange(null);
    } else {
      onColorChange(color);
      onSortChange("all"); // Reset sort when filtering by color
      onSizeChange(null); // Clear size filter
    }
    setOpenColorSubmenu(false);
    setOpenSort(false);
  };

  const handleSizeSelect = (size: string) => {
    if (selectedSize === size) {
      onSizeChange(null);
    } else {
      onSizeChange(size);
      onSortChange("all"); // Reset sort when filtering by size
      onColorChange(null); // Clear color filter
    }
    setOpenSizeSubmenu(false);
    setOpenSort(false);
  };

  const getActiveSortLabel = () => {
    if (selectedColor) return `Color: ${selectedColor}`;
    if (selectedSize) return `Talla: ${selectedSize}`;
    
    const option = sortOptions.find(o => o.value === sortBy && !o.hasSubmenu);
    return option?.label || "Todos";
  };

  // Handle color selection with submenus
  const handleColorClick = (color: string) => {
    if (selectedColor === color) {
      onColorChange(null);
    } else {
      onColorChange(color);
      onSortChange("all");
      onSizeChange(null);
    }
    setShowColorSubmenu(false);
    setOpenSort(false);
  };

  // Handle size selection with submenus
  const handleSizeClick = (size: string) => {
    if (selectedSize === size) {
      onSizeChange(null);
    } else {
      onSizeChange(size);
      onSortChange("all");
      onColorChange(null);
    }
    setShowSizeSubmenu(false);
    setOpenSort(false);
  };

  return (
    <div className="space-y-2 sticky top-16" data-testid="card-filters">
      {/* Categories & Sorting Section */}
      <Card className="p-3 bg-gradient-to-br from-background to-background/80" data-testid="card-categories">
        {/* Category Selector with 2x2 Grid and Subcategories */}
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground w-full mb-3">No hay categorías</p>
        ) : (
          <div className="mb-3">
            <CategorySelector
              categories={categories}
              subCategories={subCategories}
              selectedCategoryId={selectedCategories[0]}
              selectedSubCategoryId={selectedSubCategoryId}
              onCategorySelect={onCategoryChange}
            />
          </div>
        )}

        {/* Sorting Options - Horizontal Line */}
        <div className="mb-2">
          <h4 className="font-bold text-xs text-foreground">Ordenar</h4>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {sortOptions.slice(0, 5).map((option) => {
            const Icon = option.icon;
            const isActive = sortBy === option.value;

            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleSortSelect(option.value)}
                className={`rounded-md font-medium text-xs transition-all duration-200 ${
                  isActive ? "" : "bg-accent text-accent-foreground border-accent"
                }`}
                data-testid={`button-sort-${option.value}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                <span>{option.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Color & Talla Filters - Horizontal */}
        <div className="flex flex-wrap gap-1">
          {/* Color Popover */}
          <Popover open={showColorSubmenu} onOpenChange={setShowColorSubmenu}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedColor ? "default" : "outline"}
                size="sm"
                className={`rounded-md font-medium text-xs ${
                  selectedColor ? "" : "bg-accent text-accent-foreground border-accent"
                }`}
                data-testid="button-sort-color"
              >
                <Palette className="h-3 w-3 mr-1" />
                <span>Color</span>
                {selectedColor && <span className="ml-1 font-bold">({selectedColor})</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start" data-testid="popover-colors">
              <div className="space-y-0.5">
                {colors.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sin colores</p>
                ) : (
                  colors.map((color) => (
                    <Button
                      key={color}
                      variant={selectedColor === color ? "default" : "outline"}
                      size="sm"
                      className={`w-full justify-start text-xs h-8 ${
                        selectedColor === color ? "" : "bg-accent text-accent-foreground border-accent"
                      }`}
                      onClick={() => handleColorClick(color)}
                      data-testid={`button-color-${color}`}
                    >
                      {color}
                    </Button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Size Popover */}
          <Popover open={showSizeSubmenu} onOpenChange={setShowSizeSubmenu}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedSize ? "default" : "outline"}
                size="sm"
                className={`rounded-md font-medium text-xs ${
                  selectedSize ? "" : "bg-accent text-accent-foreground border-accent"
                }`}
                data-testid="button-sort-size"
              >
                <Ruler className="h-3 w-3 mr-1" />
                <span>Talla</span>
                {selectedSize && <span className="ml-1 font-bold">({selectedSize})</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="start" data-testid="popover-sizes">
              <div className="space-y-0.5">
                {sizes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sin tallas</p>
                ) : (
                  sizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      className={`w-full justify-start text-xs h-8 ${
                        selectedSize === size ? "" : "bg-accent text-accent-foreground border-accent"
                      }`}
                      onClick={() => handleSizeClick(size)}
                      data-testid={`button-size-${size}`}
                    >
                      {size}
                    </Button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>
    </div>
  );
}
