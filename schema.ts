import { 
  pgTable, text, timestamp, boolean, uuid, pgEnum, 
  integer, numeric, decimal, index ,
   foreignKey, real
} from "drizzle-orm/pg-core";
// 1. Roles Enum (Marketplace wide)
export const roleEnum = pgEnum('user_role', ['admin', 'seller', 'deliverer', 'customer']);

// 2. CORE AUTH TABLES (Required for Better Auth + Phone OTP)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  
  // Phone OTP specific fields
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified").default(false),

  // Marketplace & Ecosystem fields
  role: roleEnum('role').default('customer'),
  onesignalPlayerId: text('onesignal_player_id'),
  isNewUser: boolean('is_new_user').default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add this to your schema.ts if not present
export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});

// 3. MARKETPLACE TABLES (SHEIN-style)


// 3. CATEGORIES (With SHEIN-style nesting)
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. SIMPLIFIED PRODUCTS (Variants merged into arrays for ease of use)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  usdPrice: numeric('usd_price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  
  // Stored as arrays for simple selectors
  availableSizes: text("available_sizes").array(), // ['S', 'M', 'L']
  availableColors: text("available_colors").array(), // ['Black', 'White']
  
  stockQuantity: integer('stock_quantity').default(0),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id),
  sku: text('sku').unique(), // For warehouse tracking
  color: text('color'),
  size: text('size'),
  stockQuantity: integer('stock_quantity').default(0),
  additionalPrice: numeric('additional_price', { precision: 10, scale: 2 }).default('0.00'),
});

// 4. SETTINGS & DISCOUNTS
export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey().default('app-settings'),
  // New User Discounts
  newUserDiscountActive: boolean('new_user_discount_active').default(false),
  newUserDiscountType: text('new_user_discount_type'), // 'percentage' | 'fixed'
  newUserDiscountValue: numeric('new_user_discount_value'),
  
  // Delivery/Legacy logic from your restaurant SQL
  baseDeliveryFee: numeric('base_delivery_fee').default('3.00'),
  freeDeliveryThreshold: numeric('free_delivery_threshold').default('500.00'),
  managerNumber: text('manager_number'),

  // Currency and Profit Settings
  usdToAfnRate: numeric('usd_to_afn_rate', { precision: 10, scale: 2 }).default('65.00'), // 1 USD = X AFN
  profitPercentage: numeric('profit_percentage', { precision: 5, scale: 2 }).default('20.00'), // Profit margin in %


  // --- NEW: PREPAYMENT LOGIC ---
  // If order total > threshold, user MUST pay some % upfront (e.g. via Moneta/Transfer)
  prepaymentThreshold: numeric('prepayment_threshold', { precision: 10, scale: 2 }).default('2500.00'),
  prepaymentPercentage: numeric('prepayment_percentage', { precision: 5, scale: 2 }).default('30.00'), // e.g., pay 30% upfront

  // --- NEW: REWARD/GIFT LOGIC ---
  // Level 1: Free Gift or Discount
  rewardThreshold: numeric('reward_threshold', { precision: 10, scale: 2 }).default('5000.00'),
  rewardType: text('reward_type').default('discount'), // 'discount' | 'gift'
  rewardValue: numeric('reward_value', { precision: 10, scale: 2 }).default('500.00'), // 500 AFN off or "Free Watch"
    warehouseAddress: text("warehouse_address"),
  warehouseLat: decimal("warehouse_lat"),
  warehouseLng: decimal("warehouse_lng"),
  updatedAt: timestamp('updated_at').defaultNow(),
});// ... (Previous Auth & Product tables remain the same)

// 1. Chat Conversations
// This table persists longer so users can see their active tickets
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  adminId: text("admin_id").references(() => user.id), 
  status: text("status").default("active"), // active, archived
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. The 7-Day Message Buffer
// We add an index on 'createdAt' to make the cleanup job (TTL) extremely fast
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: text("sender_id").notNull().references(() => user.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isRead: boolean("is_read").default(false),
  
  // Local Sync Flag: Helps the app know what it has already saved to SQLite
  isSyncedToLocal: boolean("is_synced_to_local").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table :any) => ({
  // Index for the 7-day deletion query
  createdAtIndex: index("msg_created_at_idx").on(table.createdAt),
}));

// 3. Notification Logs (For OneSignal tracking)
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: text("recipient_id").references(() => user.id),
  oneSignalId: text("onesignal_id"), // The ID returned by OneSignal API
  title: text("title"),
  body: text("body"),
  status: text("status"), // sent, failed, opened
  createdAt: timestamp("created_at").defaultNow(),
});

// Add 'awaiting_prepayment' to this list in schema.ts and run 'npx drizzle-kit push'
export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'awaiting_prepayment','picked_up',  'confirmed', 'rejected', 'out_for_delivery', 'delivered'
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  delivererId: uuid("deliverer_id").references(() => deliverers.id),
   driverLat: text("driver_lat"),
  driverLng: text("driver_lng"),
  lastGpsUpdate: timestamp("last_gps_update"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  // ADD THESE IF MISSING:
  selectedSize: text("selected_size"),
  selectedColor: text("selected_color"),
});

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // e.g., 'EID2024'
  discountType: text("discount_type").notNull(), // 'percentage' | 'fixed'
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount").default('0'),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

//delivers table

// 1. Deliverer Profile Table
export const deliverers = pgTable("deliverers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Admin sets this
  phoneNumber: text("phone_number"),
  status: text("status").default("idle"), // idle, busy, offline
  currentLat: decimal("current_lat"),
  currentLng: decimal("current_lng"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Update the user table if you want to track total reviews (optional)

// 2. Update Orders Table (Ensure this matches your existing orders table)
// Add: delivererId: uuid("deliverer_id").references(() => deliverers.id),


export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(), // Match SQLite Client generated UUID
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  category: text("category").default("General"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});