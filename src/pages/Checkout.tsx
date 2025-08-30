import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { mockApiService } from '../services/mockData';
import { useToast } from '../hooks/use-toast';
import mixpanel from "mixpanel-browser";

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shippingData, setShippingData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    address: '',
    city: '',
    postalCode: '',
    country: 'United States',
  });
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
  });

  // State to hold the consistent checkout session ID
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  // Ref to store the timestamp when checkout started for time_on_site calculation
  const checkoutStartTime = useRef<number | null>(null);

  const subtotal = getTotalPrice();
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  // Tracking for checkout_started event
  useEffect(() => {
    // Only track if there are items in the cart and mixpanel is available
    if (items.length > 0 && typeof mixpanel !== 'undefined') {
      const newCheckoutSessionId = crypto.randomUUID();
      setCheckoutSessionId(newCheckoutSessionId); // Store the generated ID in state
      checkoutStartTime.current = Date.now(); // Record the start time

      const properties = {
        cart_id: newCheckoutSessionId, // Use the newly generated session ID
        user_id: user?.id || 'guest',
        timestamp: checkoutStartTime.current,
        total_price: total,
        number_of_items: items.reduce((acc, item) => acc + item.quantity, 0),
        item_ids: items.map(item => item.product.id),
        item_names: items.map(item => item.product.name),
        checkout_step: 'shipping',
      };
      mixpanel.track("checkout_started", properties);
    }
  }, []); // Empty dependency array ensures this runs only once on component mount.

  // Tracking for checkout_abandoned event (cleanup on unmount)
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts.
      // We track checkout_abandoned if a session ID was set (meaning checkout started)
      // AND the cart is not empty (meaning the order was not completed successfully)
      // AND mixpanel is available.
      if (checkoutSessionId && items.length > 0 && typeof mixpanel !== 'undefined') {
        const timeOnSite = checkoutStartTime.current ? Date.now() - checkoutStartTime.current : 0;

        mixpanel.track("checkout_abandoned", {
          cart_id: checkoutSessionId,
          user_id: user?.id || 'guest',
          last_page_visited: window.location.pathname, // The path of the page being abandoned
          time_on_site: timeOnSite, // Time spent on the checkout page in milliseconds
          timestamp: Date.now(),
          // Optional additional properties for context at abandonment
          current_checkout_step: step === 1 ? 'shipping' : 'payment',
          total_amount_at_abandonment: total,
          number_of_items_at_abandonment: items.reduce((acc, item) => acc + item.quantity, 0),
        });
      }
    };
  }, [checkoutSessionId, items, user, total, step]); // Dependencies to capture latest state for abandonment event

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add Mixpanel tracking for shipping_method_selected
    if (typeof mixpanel !== 'undefined' && checkoutSessionId) { // Use consistent checkoutSessionId
      const shippingMethod = shipping === 0 ? 'Free Shipping' : 'Standard Shipping';
      mixpanel.track("shipping_method_selected", {
        cart_id: checkoutSessionId, // Use the consistent session ID
        user_id: user?.id || 'guest',
        shipping_method: shippingMethod,
        timestamp: Date.now(),
        // Optional additional properties for context
        shipping_cost: shipping,
        shipping_address_city: shippingData.city,
        shipping_address_country: shippingData.country,
      });

      // Add Mixpanel tracking for checkout_review_viewed
      mixpanel.track("checkout_review_viewed", {
        cart_id: checkoutSessionId, // Use the consistent session ID
        user_id: user?.id || 'guest',
        timestamp: Date.now(),
      });
    }
    setStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const order = await mockApiService.createOrder({
        items,
        total,
        shippingAddress: shippingData,
      });

      // Add Mixpanel tracking for payment_info_added
      if (typeof mixpanel !== 'undefined' && checkoutSessionId) { // Use consistent checkoutSessionId
        mixpanel.track("payment_info_added", {
          cart_id: checkoutSessionId, // Use the consistent session ID
          user_id: user?.id || 'guest',
          payment_type: 'credit_card', // Inferred from the payment form
          timestamp: Date.now(),
          // Optional additional properties for context
          total_amount: total,
          order_id: order.id,
          card_last_four: paymentData.cardNumber.slice(-4), // Example of extracting partial info
        });
      }

      // Add Mixpanel tracking for order_placed
      if (typeof mixpanel !== 'undefined' && checkoutSessionId) { // Use consistent checkoutSessionId
        mixpanel.track("order_placed", {
          order_id: order.id,
          user_id: user?.id || 'guest',
          cart_id: checkoutSessionId, // Use the consistent session ID
          total_amount: total,
          timestamp: Date.now(),
          // Additional context for the order
          number_of_items: items.reduce((acc, item) => acc + item.quantity, 0),
          item_ids: items.map(item => item.product.id),
          item_names: items.map(item => item.product.name),
          shipping_cost: shipping,
          tax_amount: tax,
          payment_method: 'credit_card', // Inferred from the payment form
          shipping_address_city: shippingData.city,
          shipping_address_country: shippingData.country,
        });
      }

      clearCart();
      
      toast({
        title: "Order placed successfully!",
        description: `Your order #${order.id} has been confirmed.`,
      });

      navigate('/order-confirmation', { 
        state: { orderId: order.id, orderTotal: total } 
      });
    } catch (error) {
      toast({
        title: "Payment failed",
        description: "Please check your payment details and try again.",
        variant: "destructive",
      });

      // Add Mixpanel tracking for checkout_failed
      if (typeof mixpanel !== 'undefined' && checkoutSessionId) { // Use consistent checkoutSessionId
        mixpanel.track("checkout_failed", {
          cart_id: checkoutSessionId, // Use the consistent session ID
          user_id: user?.id || 'guest',
          failure_reason: (error as Error).message || "Payment processing error", // Attempt to get error message, fallback to generic
          timestamp: Date.now(),
          // Optional additional properties for context
          total_amount: total,
          payment_type: 'credit_card', // Inferred from the payment form
          checkout_step: 'payment', // Indicate the step where the failure occurred
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Add some products to your cart before proceeding to checkout.
          </p>
          <Button onClick={() => navigate('/shop')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/cart')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </div>
            <div className="flex-1 h-px bg-border"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 2 ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={shippingData.fullName}
                          onChange={(e) => setShippingData({ ...shippingData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={shippingData.email}
                          onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={shippingData.address}
                        onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={shippingData.city}
                          onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={shippingData.postalCode}
                          onChange={(e) => setShippingData({ ...shippingData, postalCode: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country *</Label>
                        <Input
                          id="country"
                          value={shippingData.country}
                          onChange={(e) => setShippingData({ ...shippingData, country: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Continue to Payment
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="cardName">Cardholder Name *</Label>
                      <Input
                        id="cardName"
                        value={paymentData.cardName}
                        onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="cardNumber">Card Number *</Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={paymentData.cardNumber}
                          onChange={(e) => setPaymentData({ ...paymentData, cardNumber: e.target.value })}
                          required
                        />
                        <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          value={paymentData.expiryDate}
                          onChange={(e) => setPaymentData({ ...paymentData, expiryDate: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={paymentData.cvv}
                          onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? <LoadingSpinner /> : `Pay $${total.toFixed(2)}`}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-sm">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>
                      {shipping === 0 ? (
                        <Badge variant="secondary" className="text-xs">FREE</Badge>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};