import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { CartItem, getCartTotal, generateWhatsAppMessage, getWhatsAppLink } from "@/lib/cart";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@shared/schema";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  onRemove: (productId: string, size?: string, color?: string) => void;
}

export function CartSidebar({ open, onClose, items, onUpdateQuantity, onRemove }: CartSidebarProps) {
  const total = getCartTotal(items);
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle data-testid="text-cart-title">Carrito de Compras</SheetTitle>
        </SheetHeader>

        <div className="mt-8 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground" data-testid="text-empty-cart">
                Tu carrito está vacío
              </p>
              <Button onClick={onClose} className="mt-4" data-testid="button-continue-shopping">
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4">
                {items.map((item, index) => {
                  // Parse mediaUrls to get the first image
                  let imageUrl: string | null = null;
                  
                  if (item.product.mediaUrls) {
                    try {
                      let media = item.product.mediaUrls;
                      if (typeof media === 'string') {
                        media = JSON.parse(media);
                      }
                      
                      if (Array.isArray(media) && media.length > 0) {
                        // If it's an array of URLs
                        if (typeof media[0] === 'string') {
                          imageUrl = media[0];
                        }
                        // If it's an array of color groups with photos
                        else if (media[0].photos && media[0].photos.length > 0) {
                          imageUrl = media[0].photos[0].url;
                        }
                      }
                    } catch (e) {
                      // If parsing fails, continue without image
                    }
                  }

                  return (
                  <div key={`${item.product.id}-${item.size}-${item.color}-${index}`} className="flex gap-4" data-testid={`cart-item-${item.product.id}`}>
                    {/* Product Image */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" data-testid={`text-cart-product-name-${item.product.id}`}>
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {item.size && <span>Talla: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                      <p className="font-semibold text-sm mt-1" data-testid={`text-cart-product-price-${item.product.id}`}>
                        ${parseFloat(item.product.price).toFixed(2)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.size, item.color)}
                          data-testid={`button-decrease-${item.product.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm" data-testid={`text-quantity-${item.product.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.size, item.color)}
                          disabled={item.quantity >= parseInt(String(item.product.stock), 10)}
                          data-testid={`button-increase-${item.product.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto"
                          onClick={() => onRemove(item.product.id, item.size, item.color)}
                          data-testid={`button-remove-${item.product.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <Separator />

              {/* Total */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total:</span>
                  <span data-testid="text-cart-total">${total.toFixed(2)}</span>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={() => {
                    const message = generateWhatsAppMessage(items);
                    const whatsappLink = getWhatsAppLink(message, settings?.whatsappNumber);
                    window.open(whatsappLink, '_blank');
                  }}
                  data-testid="button-checkout"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Enviar pedido por WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
