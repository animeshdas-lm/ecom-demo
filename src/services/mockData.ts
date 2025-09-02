import { Product, User, Order } from '../types';
import mixpanel from "mixpanel-browser";

export const mockProducts: Product[] = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    price: 299.99,
    originalPrice: 399.99,
    description: "High-quality wireless headphones with noise cancellation and premium sound quality.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    category: "Electronics",
    rating: 4.8,
    reviews: 324,
    inStock: true,
    featured: true
  },
  {
    id: 2,
    name: "Ergonomic Office Chair",
    price: 249.99,
    description: "Comfortable office chair with lumbar support and adjustable height.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    category: "Furniture",
    rating: 4.6,
    reviews: 156,
    inStock: true,
    featured: true
  },
  {
    id: 3,
    name: "Smart Fitness Watch",
    price: 199.99,
    originalPrice: 249.99,
    description: "Track your fitness goals with this advanced smartwatch featuring heart rate monitoring.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    category: "Electronics",
    rating: 4.7,
    reviews: 289,
    inStock: true
  },
  {
    id: 4,
    name: "Minimalist Desk Lamp",
    price: 89.99,
    description: "Modern LED desk lamp with adjustable brightness and USB charging port.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
    category: "Home",
    rating: 4.5,
    reviews: 78,
    inStock: true
  },
  {
    id: 5,
    name: "Organic Cotton T-Shirt",
    price: 29.99,
    description: "Soft, comfortable t-shirt made from 100% organic cotton.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    category: "Clothing",
    rating: 4.4,
    reviews: 234,
    inStock: true,
    featured: true
  },
  {
    id: 6,
    name: "Stainless Steel Water Bottle",
    price: 34.99,
    description: "Insulated water bottle that keeps drinks cold for 24 hours or hot for 12 hours.",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
    category: "Home",
    rating: 4.9,
    reviews: 412,
    inStock: true
  },
  {
    id: 7,
    name: "Bluetooth Speaker",
    price: 79.99,
    originalPrice: 99.99,
    description: "Portable wireless speaker with rich sound and 20-hour battery life.",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
    category: "Electronics",
    rating: 4.3,
    reviews: 167,
    inStock: true
  },
  {
    id: 8,
    name: "Leather Wallet",
    price: 59.99,
    description: "Handcrafted leather wallet with RFID protection and multiple card slots.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop",
    category: "Accessories",
    rating: 4.6,
    reviews: 89,
    inStock: false
  }
];

export const mockUser: User = {
  id: 1,
  email: "user@example.com",
  name: "John Doe",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
};

// Simulate API delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  async getProducts(): Promise<Product[]> {
    await delay(800);
    return mockProducts;
  },

  async getProduct(id: number): Promise<Product | undefined> {
    await delay(600);
    return mockProducts.find(p => p.id === id);
  },

  async getFeaturedProducts(): Promise<Product[]> {
    await delay(700);
    return mockProducts.filter(p => p.featured);
  },

  async login(email: string, password: string): Promise<User> {
    await delay(1200);
    if (email === "user@example.com" && password === "password") {
      return mockUser;
    }
    throw new Error("Invalid credentials");
  },

  async register(email: string, password: string, name: string): Promise<User> {
    await delay(1500);
    return { ...mockUser, email, name };
  },

  async createOrder(orderData: any): Promise<Order> {
    await delay(1000);
    const newOrder: Order = {
      id: `ORDER-${Date.now()}`,
      userId: mockUser.id,
      items: orderData.items,
      total: orderData.total,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      shippingAddress: orderData.shippingAddress
    };

    // Mixpanel tracking for order_placed event
    mixpanel.track("order_placed", {
      order_id: newOrder.id,
      user_id: newOrder.userId,
      total_amount: newOrder.total,
    });

    // Added Mixpanel tracking for "Order Placed" event
    mixpanel.track("Order Placed", {
      order_id: newOrder.id,
      cart_id: null, // cart_id is not available in orderData or newOrder, setting to null
      user_id: newOrder.userId,
      total_amount: newOrder.total,
      timestamp: newOrder.createdAt,
    });

    return newOrder;
  }
};