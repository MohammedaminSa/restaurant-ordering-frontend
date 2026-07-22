import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// ============================================
// AUTH Types
// ============================================

export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'restaurant_admin' | 'kitchen_staff' | 'waiter' | 'cashier';
  restaurant_id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export const ROLE_LABELS: Record<User['role'], string> = {
  super_admin: 'Super Admin',
  restaurant_admin: 'Restaurant Admin',
  kitchen_staff: 'Kitchen Staff',
  waiter: 'Waiter',
  cashier: 'Cashier',
};

export const ROLE_DASHBOARD: Record<User['role'], string> = {
  super_admin: '/dashboard/admin',
  restaurant_admin: '/dashboard/admin',
  kitchen_staff: '/dashboard/kitchen',
  waiter: '/dashboard/waiter',
  cashier: '/dashboard/cashier',
};

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // Try auth store first, then fallback to legacy localStorage keys
    const stored = localStorage.getItem('bistro-auth-v1');
    let token: string | null = null;
    if (stored) {
      try { token = JSON.parse(stored).state?.accessToken; } catch {}
    }
    if (!token) token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try auth store first, then fallback to legacy
        const stored = localStorage.getItem('bistro-auth-v1');
        let refreshToken: string | null = null;
        if (stored) {
          try { refreshToken = JSON.parse(stored).state?.refreshToken; } catch {}
        }
        if (!refreshToken) refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;

          // Update both auth store and legacy keys
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.state.accessToken = accessToken;
              localStorage.setItem('bistro-auth-v1', JSON.stringify(parsed));
            } catch {}
          }
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('bistro-auth-v1');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    // Extract backend error message for better error reporting
    if (error.response?.data) {
      const backendMessage = (error.response.data as any).message || (error.response.data as any).error;
      if (backendMessage) {
        const enhancedError = new Error(backendMessage);
        // Preserve original error properties
        Object.assign(enhancedError, error);
        enhancedError.message = backendMessage;
        return Promise.reject(enhancedError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// TABLE & QR CODE APIs
// ============================================

export interface TableInfo {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  location: string;
  status: string;
  restaurant_name: string;
  restaurant_logo?: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  payment_details?: PaymentDetails;
  active_session?: {
    session_token: string;
    customer_name: string;
    started_at: string;
  } | null;
}

/**
 * Get table information by QR code (Public)
 */
export const getTableByQRCode = async (qrCode: string): Promise<ApiResponse<TableInfo>> => {
  const response = await api.get(`/tables/scan/${qrCode}`);
  return response.data;
};

// ============================================
// SESSION APIs
// ============================================

export interface CreateSessionRequest {
  table_id: string;
  customer_name: string;
  customer_phone?: string;
}

export interface SessionData {
  session_id: string;
  session_token: string;
  table_id: string;
  restaurant_id: string;
  customer_name: string;
  status: string;
  started_at: string;
  payment_details?: PaymentDetails;
  currency?: string;
}

export interface SessionDetail {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_token: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  table_number: string;
  capacity: number;
  location: string;
  restaurant_name: string;
  restaurant_logo?: string;
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
  payment_details?: PaymentDetails;
  orders: any[];
}

/**
 * Create a new dining session (Public)
 */
export const createSession = async (data: CreateSessionRequest): Promise<ApiResponse<SessionData>> => {
  const response = await api.post('/sessions', data);
  return response.data;
};

/**
 * Get session details by token (Public)
 */
export const getSessionByToken = async (sessionToken: string): Promise<ApiResponse<SessionDetail>> => {
  const response = await api.get(`/sessions/${sessionToken}`);
  return response.data;
};

/**
 * Complete a dining session (Public)
 */
export const completeSession = async (sessionToken: string): Promise<ApiResponse<null>> => {
  const response = await api.patch(`/sessions/${sessionToken}/complete`);
  return response.data;
};

// ============================================
// MENU APIs
// ============================================

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price: string;
  preparation_time?: number;
  is_available: boolean;
  is_featured: boolean;
  dietary_info?: Record<string, boolean>;
  allergens?: string[];
  display_order: number;
}

export interface MenuItemsQuery {
  categoryId?: string;
  search?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  restaurantId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCategoryRequest {
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

/**
 * Get all categories (Public)
 */
export const getCategories = async (restaurantId?: string): Promise<ApiResponse<Category[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/menu/categories', { params });
  return response.data;
};

/**
 * Create a category (Admin only)
 */
export const createCategory = async (data: CreateCategoryRequest): Promise<ApiResponse<Category>> => {
  const response = await api.post('/menu/categories', data);
  return response.data;
};

/**
 * Update a category (Admin only)
 */
export const updateCategory = async (id: string, data: UpdateCategoryRequest): Promise<ApiResponse<Category>> => {
  const response = await api.put(`/menu/categories/${id}`, data);
  return response.data;
};

/**
 * Delete a category (Admin only)
 */
export const deleteCategory = async (id: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/menu/categories/${id}`);
  return response.data;
};

/**
 * Get menu items with filters (Public)
 */
export const getMenuItems = async (query: MenuItemsQuery = {}): Promise<ApiResponse<MenuItem[]>> => {
  const response = await api.get('/menu/items', { params: query });
  return response.data;
};

/**
 * Get menu item by ID (Public)
 */
export const getMenuItemById = async (itemId: string): Promise<ApiResponse<any>> => {
  const response = await api.get(`/menu/items/${itemId}`);
  return response.data;
};

/**
 * Toggle menu item availability (Protected)
 */
export const toggleMenuItemAvailability = async (itemId: string): Promise<ApiResponse<{ id: string; name: string; is_available: boolean }>> => {
  const response = await api.patch(`/menu/items/${itemId}/toggle`);
  return response.data;
};

// ============================================
// ORDER APIs
// ============================================

export interface PlaceOrderRequest {
  session_token: string;
  order_type?: 'dine_in' | 'takeaway' | 'delivery';
  items: {
    menu_item_id: string;
    quantity: number;
    selected_variants?: Record<string, any>;
    special_instructions?: string;
  }[];
  special_instructions?: string;
  payment_method?: 'cash' | 'card' | 'digital_wallet' | 'online' | 'telebirr' | 'bank_transfer';
  transaction_id?: string;
  payment_account?: Record<string, any>;
}

export interface PlacedOrder {
  id: string;
  order_number: number;
  restaurant_id: string;
  session_id: string;
  session_token?: string;
  status: string;
  order_type: string;
  subtotal: string;
  tax_amount: string;
  service_charge: string;
  discount_amount: string;
  total_amount: string;
  payment_method?: string;
  payment_status?: string;
  transaction_id?: string;
  payment_account?: Record<string, any>;
  special_instructions?: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name?: string; // Frontend expected name
  item_name?: string; // Backend returned name
  quantity: number;
  unit_price: string;
  selected_variants?: Record<string, any>;
  special_instructions?: string;
  status: string;
  total_price: string;
  image_url?: string;
}

/**
 * Place a new order (Public)
 */
export const placeOrder = async (data: PlaceOrderRequest): Promise<ApiResponse<PlacedOrder>> => {
  const response = await api.post('/orders', data);
  return response.data;
};

/**
 * Get order by ID (Public)
 */
export const getOrderById = async (orderId: string): Promise<ApiResponse<PlacedOrder>> => {
  const response = await api.get(`/orders/${orderId}`);
  return response.data;
};

/**
 * Get all orders for a session (Public)
 */
export const getSessionOrders = async (sessionToken: string): Promise<ApiResponse<PlacedOrder[]>> => {
  const response = await api.get(`/sessions/${sessionToken}/orders`);
  return response.data;
};

// ============================================
// KITCHEN APIs
// ============================================

export interface KitchenOrdersQuery {
  status?: 'pending' | 'preparing' | 'ready';
  restaurantId?: string;
}

/**
 * Get kitchen orders (Protected - kitchen_staff)
 */
export const getKitchenOrders = async (query: KitchenOrdersQuery = {}): Promise<ApiResponse<PlacedOrder[]>> => {
  const response = await api.get('/kitchen/orders', { params: query });
  return response.data;
};

/**
 * Update order status in kitchen (Protected - kitchen_staff)
 */
export const updateKitchenOrderStatus = async (orderId: string, status: string): Promise<ApiResponse<PlacedOrder>> => {
  const response = await api.patch(`/kitchen/orders/${orderId}/status`, { status });
  return response.data;
};

// ============================================
// WAITER APIs
// ============================================

export interface WaiterTable {
  id: string;
  table_number: string;
  capacity: number;
  location: string;
  status: string;
  current_session_id?: string;
  session_token?: string;
  customer_name?: string;
  customer_phone?: string;
  started_at?: string;
}

/**
 * Get all tables for waiter (Protected - waiter)
 */
export const getWaiterTables = async (restaurantId?: string): Promise<ApiResponse<WaiterTable[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/waiter/tables', { params });
  return response.data;
};

/**
 * Get waiter orders (Protected - waiter)
 */
export const getWaiterOrders = async (restaurantId?: string): Promise<ApiResponse<PlacedOrder[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/waiter/orders', { params });
  return response.data;
};

/**
 * Mark order as served (Protected - waiter)
 */
export const serveOrder = async (orderId: string): Promise<ApiResponse<PlacedOrder>> => {
  const response = await api.patch(`/waiter/orders/${orderId}/serve`);
  return response.data;
};

export interface CreateWaiterOrderRequest {
  session_token?: string;
  table_id?: string;
  customer_name?: string;
  customer_phone?: string;
  items: {
    menu_item_id: string;
    quantity: number;
    selected_variants?: Record<string, any>;
    special_instructions?: string;
  }[];
  special_instructions?: string;
  payment_method?: 'cash' | 'card' | 'digital_wallet' | 'online' | 'telebirr' | 'bank_transfer';
  transaction_id?: string;
  payment_account?: Record<string, any>;
}

/**
 * Create an order on behalf of a customer (Protected - waiter)
 */
export const createWaiterOrder = async (data: CreateWaiterOrderRequest): Promise<ApiResponse<PlacedOrder>> => {
  const response = await api.post('/waiter/orders', data);
  return response.data;
};

// ============================================
// CASHIER APIs
// ============================================

export interface SessionBill {
  session: {
    session_token: string;
    customer_name: string;
    customer_phone?: string;
    table_number: string;
    location?: string;
    restaurant_name?: string;
    started_at: string;
    currency?: string;
  };
  orders: PlacedOrder[];
  bill: {
    subtotal: string;
    tax_amount: string;
    service_charge: string;
    discount_amount: string;
    total_amount: string;
    tax_rate?: number;
    service_charge_rate?: number;
  };
}

export interface PaymentRequest {
  session_token: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'digital_wallet' | 'telebirr' | 'bank_transfer';
  tip_amount?: number;
  notes?: string;
}

export interface PaymentResponse {
  id: string;
  session_id: string;
  amount: string;
  payment_method: string;
  tip_amount?: string;
  total_paid: string;
  bill_total?: string;
  status: string;
  transaction_id?: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Get session bill (Protected - cashier)
 */
export const getSessionBill = async (sessionToken: string): Promise<ApiResponse<SessionBill>> => {
  const response = await api.get(`/cashier/sessions/${sessionToken}/bill`);
  return response.data;
};

/**
 * Record payment (Protected - cashier)
 */
export const recordPayment = async (data: PaymentRequest): Promise<ApiResponse<PaymentResponse>> => {
  const response = await api.post('/cashier/payments', data);
  return response.data;
};

/**
 * Get all pending (awaiting_payment) orders (Protected - cashier)
 */
export const getPendingPayments = async (restaurantId?: string): Promise<ApiResponse<any[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/cashier/payments/pending', { params });
  return response.data;
};

/**
 * Get all rejected payments (Protected - cashier)
 */
export const getRejectedPayments = async (restaurantId?: string): Promise<ApiResponse<any[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/cashier/payments/rejected', { params });
  return response.data;
};

/**
 * Approve a single pending order (Protected - cashier)
 */
export const approvePayment = async (orderId: string): Promise<ApiResponse<PaymentResponse>> => {
  const response = await api.post('/cashier/payments/approve', { order_id: orderId });
  return response.data;
};

/**
 * Reject a single pending order (Protected - cashier)
 */
export const rejectPayment = async (orderId: string): Promise<ApiResponse<null>> => {
  const response = await api.post('/cashier/payments/reject', { order_id: orderId });
  return response.data;
};

/**
 * Delete (cancel) a rejected payment (Protected - cashier)
 */
export const deleteRejectedPayment = async (orderId: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/cashier/payments/rejected/${orderId}`);
  return response.data;
};

/**
 * Get notifications for a session (Public - customer)
 */
export const getSessionNotifications = async (sessionToken: string): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`/sessions/${sessionToken}/notifications`);
  return response.data;
};

/**
 * Get all active sessions (Protected - cashier)
 */
export const getActiveSessions = async (restaurantId?: string): Promise<ApiResponse<any[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/cashier/sessions/active', { params });
  return response.data;
};

// ============================================
// AUTH APIs
// ============================================

/**
 * Login with email and password (Public)
 */
export const login = async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Refresh access token (Public)
 */
export const refreshToken = async (token: string): Promise<ApiResponse<RefreshResponse>> => {
  const response = await api.post('/auth/refresh', { refreshToken: token });
  return response.data;
};

/**
 * Get current user profile (Protected)
 */
export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Logout (Protected)
 */
export const logout = async (): Promise<ApiResponse<null>> => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * Get today's transactions (Protected - cashier)
 */
export const getTodayTransactions = async (restaurantId?: string): Promise<ApiResponse<{
  transactions: any[];
  summary: {
    total_amount: string;
    transaction_count: number;
    by_payment_method: Record<string, number>;
  };
}>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/cashier/transactions/today', { params });
  return response.data;
};

// ============================================
// ADMIN CRUD APIs
// ============================================

/**
 * Get all users (Protected - admin)
 */
export const getUsers = async (restaurantId?: string, role?: string): Promise<ApiResponse<User[]>> => {
  const params: any = {};
  if (restaurantId) params.restaurantId = restaurantId;
  if (role) params.role = role;
  const response = await api.get('/users', { params });
  return response.data;
};

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: User['role'];
  restaurant_id?: string;
  phone?: string;
}

/**
 * Create a new user (Protected - admin)
 */
export const createUser = async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
  const response = await api.post('/users', data);
  return response.data;
};

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: User['role'];
  phone?: string;
  is_active?: boolean;
}

/**
 * Update a user (Protected - admin)
 */
export const updateUser = async (userId: string, data: UpdateUserRequest): Promise<ApiResponse<User>> => {
  const response = await api.put(`/users/${userId}`, data);
  return response.data;
};

/**
 * Delete a user (Protected - admin)
 */
export const deleteUser = async (userId: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export interface CreateTableRequest {
  restaurant_id: string;
  table_number: string;
  capacity: number;
  location?: string;
}

export interface UpdateTableRequest {
  table_number?: string;
  capacity?: number;
  location?: string;
  status?: string;
}

/**
 * Create a new table (Protected - admin)
 */
export const createTable = async (data: CreateTableRequest): Promise<ApiResponse<WaiterTable>> => {
  const response = await api.post('/tables', data);
  return response.data;
};

/**
 * Update a table (Protected - admin)
 */
export const updateTable = async (tableId: string, data: UpdateTableRequest): Promise<ApiResponse<WaiterTable>> => {
  const response = await api.put(`/tables/${tableId}`, data);
  return response.data;
};

/**
 * Delete a table (Protected - admin)
 */
export const deleteTable = async (tableId: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/tables/${tableId}`);
  return response.data;
};

/**
 * Generate QR code for a table (Protected - admin)
 */
export const generateTableQR = async (tableId: string): Promise<ApiResponse<{ qr_code_image: string; qr_code_url: string; table_number: string }>> => {
  const response = await api.get(`/tables/${tableId}/qr`);
  return response.data;
};

/**
 * Get all tables (Protected - admin)
 */
export const getTables = async (restaurantId?: string): Promise<ApiResponse<WaiterTable[]>> => {
  const params = restaurantId ? { restaurantId } : {};
  const response = await api.get('/tables', { params });
  return response.data;
};

/**
 * Assign a table to a waiter (Protected - admin)
 */
export const assignTableToWaiter = async (tableId: string, waiterId: string): Promise<ApiResponse<any>> => {
  const response = await api.post(`/tables/${tableId}/assign-waiter`, { waiter_id: waiterId });
  return response.data;
};

/**
 * Get tables assigned to current waiter (Protected - waiter)
 */
export const getMyAssignedTables = async (): Promise<ApiResponse<WaiterTable[]>> => {
  const response = await api.get('/tables/assigned/me');
  return response.data;
};

export interface CreateMenuItemRequest {
  name: string;
  base_price: number;
  category_id: string;
  restaurant_id?: string;
  description?: string;
  image_url?: string;
  preparation_time?: number;
  is_available?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  base_price?: number;
  category_id?: string;
  description?: string;
  image_url?: string;
  preparation_time?: number;
  is_available?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

/**
 * Create a new menu item (Protected - admin)
 */
export const createMenuItem = async (data: CreateMenuItemRequest): Promise<ApiResponse<MenuItem>> => {
  const response = await api.post('/menu/items', data);
  return response.data;
};

/**
 * Update a menu item (Protected - admin)
 */
export const updateMenuItem = async (itemId: string, data: UpdateMenuItemRequest): Promise<ApiResponse<MenuItem>> => {
  const response = await api.put(`/menu/items/${itemId}`, data);
  return response.data;
};

/**
 * Delete a menu item (Protected - admin)
 */
export const deleteMenuItem = async (itemId: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/menu/items/${itemId}`);
  return response.data;
};

// ============================================
// RESTAURANT APIs (Super Admin)
// ============================================

export interface WalletConfig {
  type: string;
  account_name: string;
  phone: string;
}

export interface BankConfig {
  bank_name: string;
  account_holder: string;
  account_number: string;
}

export interface PaymentDetails {
  wallets: WalletConfig[];
  banks: BankConfig[];
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  tax_rate: number;
  service_charge_rate: number;
  created_at: string;
  updated_at: string;
  admin_count?: number;
  total_staff?: number;
  payment_details?: PaymentDetails;
  settings?: Record<string, any>;
}

export interface CreateRestaurantRequest {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  payment_details?: PaymentDetails;
}

export interface UpdateRestaurantRequest {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  is_active?: boolean;
  payment_details?: PaymentDetails;
}

/**
 * Get all restaurants (Super Admin only)
 */
export const getRestaurants = async (search?: string, status?: string): Promise<ApiResponse<Restaurant[]>> => {
  const params: any = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await api.get('/restaurants', { params });
  return response.data;
};

/**
 * Get restaurant by ID (Super Admin only)
 */
export const getRestaurantById = async (id: string): Promise<ApiResponse<Restaurant>> => {
  const response = await api.get(`/restaurants/${id}`);
  return response.data;
};

/**
 * Get own restaurant info (any authenticated staff)
 */
export const getMyRestaurant = async (): Promise<ApiResponse<Restaurant>> => {
  const response = await api.get('/restaurants/my');
  return response.data;
};

/**
 * Update own restaurant settings (restaurant_admin)
 */
export const updateMyRestaurant = async (data: {
  name?: string;
  description?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  payment_details?: PaymentDetails;
  settings?: Record<string, any>;
}): Promise<ApiResponse<Restaurant>> => {
  const response = await api.patch('/restaurants/my', data);
  return response.data;
};

/**
 * Create a new restaurant (Super Admin only)
 */
export const createRestaurant = async (data: CreateRestaurantRequest): Promise<ApiResponse<Restaurant>> => {
  const response = await api.post('/restaurants', data);
  return response.data;
};

/**
 * Update a restaurant (Super Admin only)
 */
export const updateRestaurant = async (id: string, data: UpdateRestaurantRequest): Promise<ApiResponse<Restaurant>> => {
  const response = await api.put(`/restaurants/${id}`, data);
  return response.data;
};

/**
 * Delete a restaurant (Super Admin only)
 */
export const deleteRestaurant = async (id: string): Promise<ApiResponse<null>> => {
  const response = await api.delete(`/restaurants/${id}`);
  return response.data;
};

/**
 * Toggle restaurant active status (Super Admin only)
 */
export const toggleRestaurantStatus = async (id: string): Promise<ApiResponse<Restaurant>> => {
  const response = await api.patch(`/restaurants/${id}/toggle`);
  return response.data;
};

export interface UpdateMyProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Update own profile (any authenticated user)
 */
export const updateMyProfile = async (data: UpdateMyProfileRequest): Promise<ApiResponse<User>> => {
  const response = await api.patch('/auth/me', data);
  return response.data;
};

/**
 * Update user password (Admin - can set new password without current)
 * For self-service, pass currentPassword
 */
export const updateUserPassword = async (userId: string, newPassword: string, currentPassword?: string): Promise<ApiResponse<null>> => {
  const response = await api.patch(`/users/${userId}/password`, { newPassword, currentPassword });
  return response.data;
};

export interface HeroSettings {
  tagline?: string;
  heading?: string;
  subtitle?: string;
  background_image?: string;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  currency: string;
  tax_rate: number;
  service_charge_rate: number;
  settings?: Record<string, any>;
}

export const getRestaurantInfo = async (): Promise<ApiResponse<RestaurantInfo>> => {
  const response = await api.get('/restaurants/public/info');
  return response.data;
};

export default api;
