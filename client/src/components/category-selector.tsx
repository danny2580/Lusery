import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { Category, SubCategory } from "@shared/schema";

interface CategorySelectorProps {
  categories: Category[];
  subCategories: SubCategory[];
  selectedCategoryId?: string;
  selectedSubCategoryId?: string | null;
  onCategorySelect: (categoryId: string) => void;
}

export function CategorySelector({
  categories,
  subCategories,
  selectedCategoryId,
  selectedSubCategoryId,
  onCategorySelect,
}: CategorySelectorProps) {
  const [openSubcategories, setOpenSubcategories] = useState(false);
  
  const selectedCategory = selectedCategoryId 
    ? categories.find(c => c.id === selectedCategoryId)
    : null;
  
  const filteredSubcategories = selectedCategoryId
    ? subCategories.filter(s => s.categoryId === selectedCategoryId)
    : [];
  
  const selectedSubCategory = selectedSubCategoryId
    ? subCategories.find(s => s.id === selectedSubCategoryId)
    : null;

  // Get first 4 categories for 2x2 grid (or arrange as desired)
  const gridCategories = categories.slice(0, 4);
  const hasMoreCategories = categories.length > 4;

  return (
    <div className="space-y-3">
      {/* Categories Grid 2x2 */}
      <div>
        <h4 className="font-bold text-xs text-foreground mb-2">Categorías</h4>
        <div className="grid grid-cols-2 gap-2">
          {gridCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={`text-xs font-medium h-auto py-2 px-3 rounded-md transition-all ${
                  isSelected ? "" : "bg-accent text-accent-foreground border-accent"
                }`}
                onClick={() => onCategorySelect(category.id)}
                data-testid={`button-category-${category.id}`}
              >
                {category.name}
              </Button>
            );
          })}
          
          {hasMoreCategories && (
            <Button
              variant="outline"
              className="text-xs font-medium h-auto py-2 px-3 rounded-md col-span-2 bg-accent text-accent-foreground border-accent"
              disabled
            >
              +{categories.length - 4} más
            </Button>
          )}
        </div>
      </div>

      {/* Subcategories Dropdown - Only shows when category is selected */}
      {selectedCategory && filteredSubcategories.length > 0 && (
        <div>
          <h4 className="font-bold text-xs text-foreground mb-2">Tipo de Prenda</h4>
          <Popover open={openSubcategories} onOpenChange={setOpenSubcategories}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedSubCategoryId ? "default" : "outline"}
                className="w-full justify-between text-xs font-medium h-9 rounded-md"
                data-testid="button-subcategories-dropdown"
              >
                <span className="truncate">{selectedSubCategory ? selectedSubCategory.name : "Seleccionar tipo de prenda"}</span>
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start" data-testid="popover-subcategories">
              <div className="space-y-0.5">
                {filteredSubcategories.map((sub) => (
                  <Button
                    key={sub.id}
                    variant={selectedSubCategoryId === sub.id ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => {
                      if (selectedSubCategoryId === sub.id) {
                        // Deselect if already selected
                        onCategorySelect(selectedCategoryId);
                      } else {
                        // Select the subcategory
                        onCategorySelect(`${selectedCategoryId}:${sub.id}`);
                      }
                      setOpenSubcategories(false);
                    }}
                    data-testid={`button-subcategory-${sub.id}`}
                  >
                    {sub.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
