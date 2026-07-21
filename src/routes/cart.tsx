import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCart, fmt } from "@/lib/cart";
import { placeOrder, createSession, getSessionByToken, type PaymentDetails } from "@/lib/api";
import { toast } from "sonner";
import { ShoppingBag, ArrowLeft, CheckCircle, Loader2, MapPin, User, Table as TableIcon, Trash2, Plus, Minus, Smartphone, Building2, Banknote, Wallet, CreditCard } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { items, count, total, clear, updateQuantity, remove } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [orderInstructions, setOrderInstructions] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [pendingTableInfo, setPendingTableInfo] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [fetchingSession, setFetchingSession] = useState(false);

  // Payment form state (inside dialog)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');

  const sessionToken = localStorage.getItem("sessionToken");
  const sessionDataStr = localStorage.getItem("sessionData");
  
  // Initialize state with localStorage data on mount
  const [currentSessionData, setCurrentSessionData] = useState<any>(() => {
    return sessionDataStr ? JSON.parse(sessionDataStr) : null;
  });
  
  // Use currentSessionData as sessionData
  const sessionData = currentSessionData;

  // Check if we have pending table info (scanned QR but no session yet)
  useEffect(() => {
    if (!sessionToken) {
      const stored = localStorage.getItem("pendingTableInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        setPendingTableInfo(parsed);
        setPaymentDetails(parsed.payment_details || null);
      }
    } else {
      // Sync currentSessionData with localStorage when component mounts
      const sessionDataStr = localStorage.getItem("sessionData");
      if (sessionDataStr) {
        const parsed = JSON.parse(sessionDataStr);
        setCurrentSessionData(parsed);
        if (parsed.payment_details) {
          setPaymentDetails(parsed.payment_details);
        }
      }
      // Fetch fresh session data to get payment_details
      if (sessionToken) {
        setFetchingSession(true);
        getSessionByToken(sessionToken)
          .then((res) => {
            const session = res.data;
            if (session.payment_details) {
              setPaymentDetails(session.payment_details);
            }
            // Enrich localStorage with payment_details
            const existing = localStorage.getItem("sessionData");
            if (existing) {
              const enriched = { ...JSON.parse(existing), payment_details: session.payment_details, currency: session.currency };
              localStorage.setItem("sessionData", JSON.stringify(enriched));
              setCurrentSessionData(enriched);
            }
          })
          .catch(() => {})
          .finally(() => setFetchingSession(false));
      }
    }
  }, [sessionToken]);

  // Calculate tax and service charge
  const restaurantInfo = sessionData || pendingTableInfo;
  const taxRate = restaurantInfo?.tax_rate || 8.5;
  const serviceChargeRate = restaurantInfo?.service_charge_rate || 10;
  const currency = restaurantInfo?.currency;
  
  const subtotal = total;
  const tax = (subtotal * taxRate) / 100;
  const serviceCharge = (subtotal * serviceChargeRate) / 100;
  const grandTotal = subtotal + tax + serviceCharge;

  const handleStartOrdering = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // If no session, show customer form to create session
    if (!sessionToken) {
      if (!pendingTableInfo) {
        toast.error("Please scan a QR code to start a session");
        return;
      }
      setShowCustomerForm(true);
      return;
    }

    // Initialize payment form with session data
    setSelectedPaymentMethod('cash');
    setTransactionId('');
    setPayerName(sessionData?.customer_name || '');

    // Show payment form dialog
    setShowPaymentDialog(true);
  };

  const handleConfirmOrder = async () => {
    if (!sessionToken) {
      toast.error("Session not found");
      return;
    }

    // Validate non-cash payment requires transaction ID
    if (selectedPaymentMethod !== 'cash' && !transactionId.trim()) {
      toast.error("Please enter the transaction ID");
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        selected_variants: item.selectedVariants.length > 0 ? item.selectedVariants : undefined,
        special_instructions: item.specialInstructions,
      }));

      const response = await placeOrder({
        session_token: sessionToken,
        items: orderItems,
        special_instructions: orderInstructions.trim() || undefined,
        payment_method: selectedPaymentMethod as any,
        transaction_id: selectedPaymentMethod !== 'cash' ? transactionId.trim() : undefined,
      });

      setShowPaymentDialog(false);
      setOrderNumber(response.data.order_number);
      setShowSuccessDialog(true);
      clear();
      setOrderInstructions("");
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate({ to: "/orders" });
  };

  const handleSessionCreated = () => {
    setShowCustomerForm(false);
    setPendingTableInfo(null);
    
    // Reload session data from localStorage and merge with pending table info
    const newSessionDataStr = localStorage.getItem("sessionData");
    const newSessionToken = localStorage.getItem("sessionToken");
    
    if (newSessionDataStr && newSessionToken) {
      const newSession = JSON.parse(newSessionDataStr);
      
      // If the session doesn't have table details, get them from pendingTableInfo
      if (pendingTableInfo && !newSession.table_number) {
        newSession.table_number = pendingTableInfo.table_number;
        newSession.location = pendingTableInfo.location;
        newSession.capacity = pendingTableInfo.capacity;
        newSession.restaurant_name = pendingTableInfo.restaurant_name;
        newSession.tax_rate = pendingTableInfo.tax_rate;
        newSession.service_charge_rate = pendingTableInfo.service_charge_rate;
        
        // Save the enriched session data back to localStorage
        localStorage.setItem("sessionData", JSON.stringify(newSession));
      }
      
      setCurrentSessionData(newSession);
      setPaymentDetails(newSession.payment_details || pendingTableInfo?.payment_details || null);
      
      toast.success("Session started! Select your payment method to place order.");
    }
  };

  // Show customer form if needed
  if (showCustomerForm && pendingTableInfo) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
            <p className="text-sm text-blue-800">
              Please provide your information to start ordering
            </p>
          </div>
          <CustomerInfoForm onSuccess={handleSessionCreated} onCancel={() => setShowCustomerForm(false)} />
        </div>
      </div>
    );
  }

  // Redirect if cart is empty (but NOT if showing success dialog)
  if (items.length === 0 && !showSuccessDialog) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <ShoppingBag className="mx-auto h-20 w-20 text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add items from the menu to place an order
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Browse Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no session AND no pending table info (but NOT if showing success dialog)
  if (!sessionData && !pendingTableInfo && !showSuccessDialog) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">
              No active session found. Please scan a QR code to start a session.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </button>
          <h1 className="font-serif text-3xl font-bold text-foreground flex-1">Checkout</h1>
        </div>

        {/* Session Info */}
        {sessionData && sessionData.table_number && (
          <div className="rounded-xl border border-border bg-card p-6 mb-4">
            <h2 className="font-semibold text-lg text-foreground mb-4">Dining Information</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TableIcon className="h-4 w-4" />
                  <span className="text-sm">Table</span>
                </div>
                <span className="font-semibold text-foreground">{sessionData.table_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Customer</span>
                </div>
                <span className="font-semibold text-foreground">{sessionData.customer_name}</span>
              </div>
              {sessionData.location && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Location</span>
                  </div>
                  <span className="font-semibold text-foreground">{sessionData.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-4">
            Order Summary ({count} {count === 1 ? 'item' : 'items'})
          </h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-3 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{fmt(item.price, currency)} each</p>
                    
                    {/* Variants */}
                    {item.selectedVariants && item.selectedVariants.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.selectedVariants.map((variant: any, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {variant.variant_name}: {variant.option_name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Special Instructions */}
                    {item.specialInstructions && (
                      <p className="text-xs italic text-muted-foreground mt-2 bg-muted px-2 py-1 rounded">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>

                  {/* Price and Controls */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-between gap-3 sm:gap-0">
                    <p className="font-serif text-lg font-semibold text-foreground">{fmt(item.itemTotal, currency)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            remove(item.id);
                            toast.success("Item removed from cart");
                          }
                        }}
                        className="flex items-center justify-center rounded-full border border-border bg-background h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex items-center justify-center rounded-full border border-border bg-background h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          remove(item.id);
                          toast.success("Item removed from cart");
                        }}
                        className="flex items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 h-9 w-9 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Instructions */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-3">
            Special Instructions (Optional)
          </h2>
          <textarea
            value={orderInstructions}
            onChange={(e) => setOrderInstructions(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Any special requests for your order? (e.g., allergies, preferences)"
          />
        </div>

        {/* Price Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <h2 className="font-semibold text-lg text-foreground mb-4">Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground">Subtotal</span>
              <span className="font-semibold">{fmt(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span className="text-muted-foreground">{fmt(tax, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Charge ({serviceChargeRate}%)</span>
              <span className="text-muted-foreground">{fmt(serviceCharge, currency)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-xl font-bold text-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{fmt(grandTotal, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Place Order / Start Order Button */}
        <button
          onClick={handleStartOrdering}
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </span>
          ) : sessionToken ? (
            "Place Order"
          ) : (
            "Start Order"
          )}
        </button>
        
        {!sessionToken && pendingTableInfo && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            You'll provide your information before starting your order
          </p>
        )}
      </div>

      {/* Payment Form Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border border-border p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Complete Payment</h2>

            {/* Step 1: Select Payment Method */}
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setSelectedPaymentMethod('cash'); setTransactionId(''); }}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Banknote className="h-6 w-6 mx-auto mb-1 text-foreground" />
                  <span className="text-sm font-semibold text-foreground block">Cash</span>
                  <span className="text-xs text-muted-foreground">Pay at counter</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('telebirr')}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    selectedPaymentMethod === 'telebirr'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Smartphone className="h-6 w-6 mx-auto mb-1 text-foreground" />
                  <span className="text-sm font-semibold text-foreground block">Telebirr</span>
                  <span className="text-xs text-muted-foreground">Mobile money</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('bank_transfer')}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    selectedPaymentMethod === 'bank_transfer'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building2 className="h-6 w-6 mx-auto mb-1 text-foreground" />
                  <span className="text-sm font-semibold text-foreground block">Bank Transfer</span>
                  <span className="text-xs text-muted-foreground">Direct deposit</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('chapa')}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    selectedPaymentMethod === 'chapa'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Wallet className="h-6 w-6 mx-auto mb-1 text-foreground" />
                  <span className="text-sm font-semibold text-foreground block">Chapa</span>
                  <span className="text-xs text-muted-foreground">Online gateway</span>
                </button>
              </div>
            </div>

            {/* Payment Instructions for non-cash */}
            {selectedPaymentMethod !== 'cash' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Transfer to {selectedPaymentMethod === 'telebirr' ? 'Telebirr' : selectedPaymentMethod === 'bank_transfer' ? 'Bank Account' : 'Chapa'}
                </h4>
                {selectedPaymentMethod === 'telebirr' && paymentDetails?.telebirr ? (
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>Account: <strong>{paymentDetails.telebirr.account_name}</strong></p>
                    <p>Phone: <strong>{paymentDetails.telebirr.phone}</strong></p>
                  </div>
                ) : selectedPaymentMethod === 'bank_transfer' && paymentDetails?.bank_transfer ? (
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>Bank: <strong>{paymentDetails.bank_transfer.bank_name}</strong></p>
                    <p>Holder: <strong>{paymentDetails.bank_transfer.account_holder}</strong></p>
                    <p>Account: <strong>{paymentDetails.bank_transfer.account_number}</strong></p>
                  </div>
                ) : selectedPaymentMethod === 'chapa' && paymentDetails?.chapa ? (
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>Merchant: <strong>{paymentDetails.chapa.merchant_name}</strong></p>
                    <p>ID: <strong>{paymentDetails.chapa.merchant_id}</strong></p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">Payment details not configured. Please contact the restaurant.</p>
                )}
              </div>
            )}

            {/* Step 2: Payment Completion Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Payment Details</h3>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your Name</label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Payment Method</label>
                <input
                  type="text"
                  value={selectedPaymentMethod === 'cash' ? 'Cash' : selectedPaymentMethod === 'telebirr' ? 'Telebirr' : selectedPaymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Chapa'}
                  disabled
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount ({currency || 'ETB'})</label>
                <input
                  type="number"
                  value={grandTotal.toFixed(2)}
                  disabled
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Total menu price — must match exactly</p>
              </div>
              {selectedPaymentMethod !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Transaction ID / Reference *</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your transaction reference number"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 font-semibold text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={submitting || !payerName.trim() || (selectedPaymentMethod !== 'cash' && !transactionId.trim())}
                className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border border-border p-8 max-w-md w-full mx-4 text-center">
            <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed Successfully!</h2>
            <p className="text-muted-foreground mb-2">Your order number is</p>
            <p className="text-4xl font-bold text-primary mb-2">#{orderNumber}</p>
            <p className="text-sm text-muted-foreground mb-1">
              {selectedPaymentMethod !== 'cash'
                ? `Payment via ${selectedPaymentMethod} completed`
                : 'Pay with cash at the counter'}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              We'll notify you when your order is ready
            </p>
            <button
              onClick={handleSuccessClose}
              className="w-full rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Track My Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomerInfoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function CustomerInfoForm({ onSuccess, onCancel }: CustomerInfoFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingTableInfoStr = localStorage.getItem("pendingTableInfo");
    if (!pendingTableInfoStr) return;

    setSubmitting(true);
    try {
      const tableInfo = JSON.parse(pendingTableInfoStr);
      
      const response = await createSession({
        table_id: tableInfo.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
      });

      const sessionData = response.data;
      
      // Enrich session data with table information
      const enrichedSessionData = {
        ...sessionData,
        table_number: tableInfo.table_number,
        location: tableInfo.location,
        capacity: tableInfo.capacity,
        restaurant_name: tableInfo.restaurant_name,
        restaurant_logo: tableInfo.restaurant_logo,
        tax_rate: tableInfo.tax_rate,
        service_charge_rate: tableInfo.service_charge_rate,
        currency: tableInfo.currency || 'ETB',
        payment_details: tableInfo.payment_details || sessionData.payment_details,
        orders: [],
      };
      
      localStorage.setItem("sessionToken", sessionData.session_token);
      localStorage.setItem("sessionData", JSON.stringify(enrichedSessionData));
      localStorage.removeItem("pendingTableInfo");

      toast.success("Order session started!");
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create session:", error);
      toast.error(error.message || "Failed to start session");
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Start Your Order</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Please provide your information to begin ordering
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Your Name *
          </label>
          <input
            id="name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Phone Number (Optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your phone number"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !customerName.trim()}
            className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Start Ordering"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
