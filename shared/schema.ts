import { 
  pgTable, text, timestamp, boolean, uuid, pgEnum, 
  integer, numeric, decimal, index ,
   foreignKey
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

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // Stores phone number or email
  value: text("value").notNull(),           // Stores the OTP code
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. MARKETPLACE TABLES (SHEIN-style)


// 3. CATEGORIES (With SHEIN-style nesting)
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  
  // Recursive link: NULL means it's a Top-Level category (like 'Women' or 'Men')
  parentId: uuid('parent_id'), 
  
  sortOrder: integer('sort_order').default(0),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).default('0.00'),
  isActive: boolean('is_active').default(true),
}, (table) => {
  return {
    // Explicit self-reference foreign key for the hierarchy
    parentReference: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "category_hierarchy_fk"
    })
  };
});

// 4. PRODUCTS (Linked to the specific leaf category)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: text('seller_id').references(() => user.id),
  categoryId: uuid('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  usdPrice: numeric('usd_price', { precision: 10, scale: 2 }).notNull(), // Price in USD set by admin
  imageUrl: text('image_url'),
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
}, (table) => ({
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