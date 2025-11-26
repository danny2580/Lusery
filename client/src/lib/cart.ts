import { Product } from "@shared/schema";

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

const CART_KEY = "lusery-cart";

export function getCart(): CartItem[] {
  const stored = localStorage.getItem(CART_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(product: Product, size?: string, color?: string): CartItem[] {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    item => item.product.id === product.id && item.size === size && item.color === color
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({ product, quantity: 1, size, color });
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string, size?: string, color?: string): CartItem[] {
  const cart = getCart();
  const filtered = cart.filter(
    item => !(item.product.id === productId && item.size === size && item.color === color)
  );
  saveCart(filtered);
  return filtered;
}

export function updateCartQuantity(productId: string, quantity: number, size?: string, color?: string): CartItem[] {
  const cart = getCart();
  const item = cart.find(
    item => item.product.id === productId && item.size === size && item.color === color
  );

  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId, size, color);
    }
    item.quantity = quantity;
    saveCart(cart);
  }

  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => {
    return total + (parseFloat(item.product.price) * item.quantity);
  }, 0);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function generateWhatsAppMessage(cart: CartItem[]): string {
  const total = getCartTotal(cart);
  
  let message = "Hola, este es mi pedido\n\n";
  
  cart.forEach((item, index) => {
    message += `Producto ${index + 1}:\n`;
    message += `Nombre: ${item.product.name}\n`;
    message += `Cantidad: ${item.quantity}\n`;
    if (item.size) message += `Talla: ${item.size}\n`;
    if (item.color) message += `Color: ${item.color}\n`;
    message += `Precio: $${parseFloat(item.product.price).toFixed(2)} x ${item.quantity} = $${(parseFloat(item.product.price) * item.quantity).toFixed(2)}\n\n`;
  });
  
  message += `Total: $${total.toFixed(2)}`;
  
  return message;
}

export function getWhatsAppLink(message: string, phoneNumber?: string): string {
  // Use environment variable or default placeholder
  const number = phoneNumber || import.meta.env.VITE_WHATSAPP_NUMBER || "593979079064";
  // Remove any non-digit characters
  const cleanNumber = number.replace(/\D/g, "");
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}
