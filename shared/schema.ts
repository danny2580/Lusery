import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// SubCategories table
export const subCategories = pgTable("sub_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  subCategoryId: varchar("sub_category_id").references(() => subCategories.id),
  sizes: text("sizes"), // JSON: { size: string, quantity: number }[]
  colors: text("colors"), // JSON: string[]
  stock: integer("stock").notNull().default(0),
  mediaUrls: text("media_urls"), // JSON: { url: string, description: string }[]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// App Settings table
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whatsappNumber: text("whatsapp_number").notNull().default("+593979079064"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Hero Banners table
export const heroBanners = pgTable("hero_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slides: text("slides").notNull().default("[]"), // JSON: { id, imageUrl, fileName, bucket, position }[]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubCategorySchema = createInsertSchema(subCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.string().or(z.number()),
});

export const updateProductSchema = insertProductSchema.partial();
export const updateCategorySchema = insertCategorySchema.partial();

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAppSettingsSchema = insertAppSettingsSchema.partial();

export const insertHeroBannerSchema = createInsertSchema(heroBanners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateHeroBannerSchema = insertHeroBannerSchema.partial();

// Hero Slide type
export interface HeroSlide {
  id: string;
  imageUrl: string;
  fileName: string;
  bucket: string;
  position: number;
}

// Select types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type SubCategory = typeof subCategories.$inferSelect;
export type InsertSubCategory = z.infer<typeof insertSubCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type UpdateAppSettings = z.infer<typeof updateAppSettingsSchema>;

export type HeroBanner = typeof heroBanners.$inferSelect;
export type InsertHeroBanner = z.infer<typeof insertHeroBannerSchema>;
export type UpdateHeroBanner = z.infer<typeof updateHeroBannerSchema>;

export interface HeroBannerWithSlides extends HeroBanner {
  slides: HeroSlide[];
}
