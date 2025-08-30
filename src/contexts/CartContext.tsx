import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { useToast } from '../hooks/use-toast';
import mixpanel from "mixpanel-browser";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        toast({
          title: "Updated cart",
          description: `${product.name} quantity updated.`,
        });
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        toast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
        });
        return [...prev, { product, quantity }];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setItems(prev => {
      const item = prev.find(item => item.product.id === productId);
      if (item) {
        toast({
          title: "Removed from cart",
          description: `${item.product.name} has been removed.`,
        });
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    const totalPrice = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

    // Add Mixpanel tracking for 'coupon_applied' event
    // Note: This event is tracked inside getTotalPrice as per instructions.
    // As the current getTotalPrice method does not include coupon application logic,
    // 'coupon_code' is set to null and 'discount_amount' is set to 0.
    // A more robust implementation would track this event where a coupon is actually applied.
    if (items.length > 0) { // Only track if there are items in the cart
      mixpanel.track("coupon_applied", {
        cart_id: `cart_${Date.now()}`, // A unique ID for this specific event instance
        user_id: mixpanel.get_distinct_id(), // Get the current distinct user ID from Mixpanel
        coupon_code: null, // No coupon code is managed or applied within this method
        discount_amount: 0, // No discount is calculated or applied within this method
        timestamp: new Date().toISOString(),
      });
    }

    return totalPrice;
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};