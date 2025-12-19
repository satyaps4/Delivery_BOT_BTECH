import { useState } from 'react';
import { ShoppingCart, Plus, Minus, X, ArrowLeft, CheckCircle, User, MapPin, Mail } from 'lucide-react';

// Types
interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface CustomerDetails {
  name: string;
  location: string;
  email: string;
}

interface Cart {
  [key: number]: number;
}

type View = 'customer-details' | 'menu' | 'cart' | 'qr';

// Constants
const MENU_ITEMS: MenuItem[] = [
  { id: 1, name: 'Aloo Paratha', price: 40, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=600&fit=crop' },
  { id: 2, name: 'Amritsari Naan', price: 50, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { id: 3, name: 'Veg Noodles', price: 70, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop' },
  { id: 4, name: 'Burger', price: 60, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
  { id: 5, name: 'Coke', price: 30, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop' },
  { id: 6, name: 'Chips', price: 25, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=300&fit=crop' },
  { id: 7, name: 'Fries', price: 60, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop' }
];

const LOCATION_OPTIONS = [
  'MBH A', 'MBH B', 'MBH F', "Children's Park",
  'NITJ Temple', 'ICE Building', 'MGH'
];

const DELIVERY_CHARGE = 20;
const DELIVERY_TIME_MINUTES = 20;

// Supabase configuration


// QR Code Component
interface QRCodeProps {
  value: string;
  size?: number;
}

function QRCode({ value, size = 280 }: QRCodeProps) {
  if (!value) return null;
 
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${value}`;
  const backupUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(value)}&chs=${size}x${size}`;
 3
  return (
    <div className="flex flex-col items-center">
      <img
        src={qrUrl}
        alt="QR Code"
        className="border-4 border-gray-300 rounded-lg shadow-lg"
        width={size}
        height={size}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = backupUrl;
        }}
      />
      <p className="text-xs text-gray-500 mt-2">Scan with any QR code reader</p>
    </div>
  );
}

// Utility Functions
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateOrderNumber = (): string => {
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) +
                  String(date.getMonth() + 1).padStart(2, '0') +
                  String(date.getDate()).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ORD${dateStr}${randomNum}`;
};

const calculateDeliveryTime = (minutes: number): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Main App Component
function App() {
  const [cart, setCart] = useState<Cart>({});
  const [view, setView] = useState<View>('customer-details');
  const [accessCode, setAccessCode] = useState('');
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [orderNumber, setOrderNumber] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    location: '',
    email: ''
  });

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartItems = (): CartItem[] => {
    return Object.entries(cart).map(([id, quantity]) => {
      const item = MENU_ITEMS.find(i => i.id === parseInt(id));
      return { ...item!, quantity };
    });
  };

  const getCartTotal = (): number => {
    return getCartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getFinalTotal = (): number => {
    return getCartTotal() + DELIVERY_CHARGE;
  };

  const getCartCount = (): number => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  // Customer details handling
  const handleCustomerDetailChange = (field: keyof CustomerDetails, value: string) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleStartOrder = () => {
    if (!customerDetails.name || !customerDetails.location || !customerDetails.email) {
      alert('Please fill in all customer details');
      return;
    }
   
    if (!validateEmail(customerDetails.email)) {
      alert('Please enter a valid email address');
      return;
    }
   
    setView('menu');
  };

  // Checkout handling
  const handleCheckout = async () => {
  const items = getCartItems();
  const total = getFinalTotal();
  const uuid = generateUUID();          // ACCESS CODE
  const orderNum = generateOrderNumber();
  const deliveryETA = calculateDeliveryTime(DELIVERY_TIME_MINUTES);

  try {
    // 🔴 POST ACCESS CODE TO NODE BACKEND
    console.log("sending req to backend")
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/token/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: uuid,
        customerDetails 
      }),
    });

    console.log(response)

    if (!response.ok) {
      throw new Error('Failed to store access code');
    }

    // ✅ Proceed only if backend succeeds
    setAccessCode(uuid);
    setOrderNumber(orderNum);
    setDeliveryTime(deliveryETA);
    setOrderItems(items);
    setTotalAmount(total);
    setView('qr');

  } catch (error) {
    console.error('Backend error:', error);
    alert('Unable to generate QR. Please try again.');
  }
};


  const resetOrder = () => {
    setCart({});
    setView('customer-details');
    setAccessCode('');
    setOrderNumber('');
    setDeliveryTime('');
    setOrderItems([]);
    setTotalAmount(0);
    setCustomerDetails({ name: '', location: '', email: '' });
  };

  // Customer Details View
  if (view === 'customer-details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍔</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">NITJ Autonomous Food</h1>
            <p className="text-gray-600">Enter customer details to start order</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User size={18} className="inline mr-2" />
                Customer Name
              </label>
              <input
                type="text"
                value={customerDetails.name}
                onChange={(e) => handleCustomerDetailChange('name', e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={18} className="inline mr-2" />
                Delivery Location
              </label>
              <select
                value={customerDetails.location}
                onChange={(e) => handleCustomerDetailChange('location', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
              >
                <option value="">Select delivery location</option>
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail size={18} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={customerDetails.email}
                onChange={(e) => handleCustomerDetailChange('email', e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleStartOrder}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
            >
              Start Order →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Menu View
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🍔</div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">NITJ Autonomous Food</h1>
                  <p className="text-gray-600">
                    Order for: <span className="font-semibold text-blue-600">{customerDetails.name}</span> ({customerDetails.location})
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-24">
            {MENU_ITEMS.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1">
                <div className="relative h-48 overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full font-bold">
                    ₹{item.price}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    {cart[item.id] ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="!bg-red-400 hover:!bg-red-600 text-black w-20 h-10 rounded-full flex items-center justify-center transition-colors"
                          aria-label="Remove one"
                        >
                          <Minus size={16} className="text-black"/>
                        </button>
                        <span className="font-bold text-lg text-gray-800 min-w-[2rem] text-center">{cart[item.id]}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="!bg-green-400 hover:!bg-green-600 text-black w-20 h-10 rounded-full flex items-center justify-center transition-colors"
                          aria-label="Add one"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Plus size={18} /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getCartCount() > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-4">
              <button
                onClick={() => setView('cart')}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 rounded-full shadow-2xl font-bold text-lg flex items-center gap-3 transition-all"
              >
                <ShoppingCart size={24} />
                View Cart ({getCartCount()}) · ₹{getCartTotal()}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cart View
  if (view === 'cart') {
    const items = getCartItems();
    const subtotal = getCartTotal();

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('menu')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                aria-label="Back to menu"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-3xl font-bold text-gray-800">Cart</h2>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Customer Details</h3>
              <p className="text-sm text-gray-700">
                <strong>Name:</strong> {customerDetails.name}<br />
                <strong>Location:</strong> {customerDetails.location}<br />
                <strong>Email:</strong> {customerDetails.email}
              </p>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                          <p className="text-gray-600">₹{item.price} × {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-lg text-gray-800">₹{item.price * item.quantity}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          aria-label="Remove item"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Subtotal</span>
                      <span className="font-semibold">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Delivery Charge</span>
                      <span className="font-semibold">₹{DELIVERY_CHARGE}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-4 border-t">
                    <span className="text-2xl font-bold text-gray-800">Total</span>
                    <span className="text-3xl font-bold text-green-600">₹{getFinalTotal()}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle size={24} />
                    Generate QR Code
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // QR Code View
  if (view === 'qr') {
    const subtotal = totalAmount - DELIVERY_CHARGE;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h2>
            <p className="text-gray-600">Your order has been placed successfully</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-semibold mb-1">Order Number</p>
              <p className="text-xl font-bold text-blue-800">{orderNumber}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-semibold mb-1">Expected Delivery</p>
              <p className="text-xl font-bold text-orange-800">{deliveryTime}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Customer Details</h3>
            <p className="text-sm text-gray-700">
              <strong>Name:</strong> {customerDetails.name}<br />
              <strong>Location:</strong> {customerDetails.location}<br />
              <strong>Email:</strong> {customerDetails.email}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-2 mb-4">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-gray-700">
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mb-3">
              <div className="flex justify-between text-gray-700 mb-2">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-700 mb-2">
                <span>Delivery Charge</span>
                <span>₹{DELIVERY_CHARGE}</span>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-green-600">₹{totalAmount}</span>
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Scan QR Code at Pickup Location</p>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-4 border-gray-300 rounded-2xl p-8 inline-block shadow-lg">
              <QRCode value={accessCode} size={280} />
            </div>
            <p className="text-xs text-gray-500 mt-3">Scannable with any QR code reader app</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-green-800 font-medium flex items-center justify-center gap-2">
              <span className="text-xl">🔔</span>
              Order will arrive with a notification on your device.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-blue-700 font-medium break-all">
              Access Code: <span className="font-mono text-sm">{accessCode}</span>
            </p>
          </div>

          <button
            onClick={resetOrder}
            className="w-full !bg-gray-600 hover: !bg-gray-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Take New Order
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;