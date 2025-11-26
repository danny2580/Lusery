import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  AdminUser,
  InsertAdminUser,
  Category,
  InsertCategory,
  UpdateCategory,
  SubCategory,
  InsertSubCategory,
  Product,
  InsertProduct,
  UpdateProduct,
  AppSettings,
  InsertAppSettings,
  UpdateAppSettings,
  HeroBanner,
  InsertHeroBanner,
  UpdateHeroBanner,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import ws from "ws";
import type { ReturnType as SupabaseReturnType } from "@supabase/supabase-js";

// Configure Neon to use ws package
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

let supabaseAdmin: any = null;

export function setSupabaseAdmin(client: any) {
  supabaseAdmin = client;
}

export interface IStorage {
  // Admin Users
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  verifyAdminPassword(username: string, password: string): Promise<AdminUser | null>;

  // Categories
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: UpdateCategory): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // SubCategories
  getAllSubCategories(): Promise<SubCategory[]>;
  getSubCategoriesByCategory(categoryId: string): Promise<SubCategory[]>;
  getSubCategory(id: string): Promise<SubCategory | undefined>;
  createSubCategory(subCategory: InsertSubCategory): Promise<SubCategory>;
  updateSubCategory(id: string, subCategory: Partial<InsertSubCategory>): Promise<SubCategory | undefined>;
  deleteSubCategory(id: string): Promise<boolean>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: UpdateProduct): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // App Settings
  getAppSettings(): Promise<AppSettings | undefined>;
  updateAppSettings(settings: UpdateAppSettings): Promise<AppSettings | undefined>;
  ensureAppSettingsExist(): Promise<AppSettings>;

  // Hero Banners
  getHeroBanner(): Promise<any | undefined>;
  getOrCreateHeroBanner(): Promise<any>;
  addHeroSlide(slide: any): Promise<any>;
  removeHeroSlide(slideId: string): Promise<any>;
  reorderHeroSlides(slides: any[]): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Admin Users
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, id));
    return result[0];
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, username));
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await db.insert(schema.adminUsers).values({
      ...user,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
    const user = await this.getAdminUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Categories
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(schema.categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(schema.categories).where(eq(schema.categories.id, id));
    return result[0];
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(schema.categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, category: UpdateCategory): Promise<Category | undefined> {
    const result = await db.update(schema.categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(schema.categories).where(eq(schema.categories.id, id)).returning();
    return result.length > 0;
  }

  // SubCategories
  async getAllSubCategories(): Promise<SubCategory[]> {
    return await db.select().from(schema.subCategories);
  }

  async getSubCategoriesByCategory(categoryId: string): Promise<SubCategory[]> {
    return await db.select().from(schema.subCategories).where(eq(schema.subCategories.categoryId, categoryId));
  }

  async getSubCategory(id: string): Promise<SubCategory | undefined> {
    const result = await db.select().from(schema.subCategories).where(eq(schema.subCategories.id, id));
    return result[0];
  }

  async createSubCategory(subCategory: InsertSubCategory): Promise<SubCategory> {
    const result = await db.insert(schema.subCategories).values(subCategory).returning();
    return result[0];
  }

  async updateSubCategory(id: string, subCategory: Partial<InsertSubCategory>): Promise<SubCategory | undefined> {
    const result = await db.update(schema.subCategories)
      .set({ ...subCategory, updatedAt: new Date() })
      .where(eq(schema.subCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteSubCategory(id: string): Promise<boolean> {
    const result = await db.delete(schema.subCategories).where(eq(schema.subCategories.id, id)).returning();
    return result.length > 0;
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(schema.products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return result[0];
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const result = await db.select().from(schema.products).where(eq(schema.products.slug, slug));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(schema.products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: UpdateProduct): Promise<Product | undefined> {
    const result = await db.update(schema.products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      // Get product first to extract image URLs
      const product = await this.getProduct(id);
      if (!product) {
        return false;
      }

      // Delete images from Supabase if they exist
      if (supabaseAdmin && product.mediaUrls) {
        try {
          const mediaByColor = JSON.parse(product.mediaUrls);
          const filesToDelete: string[] = [];

          // Extract file paths from URLs
          Object.values(mediaByColor).forEach((urls: any) => {
            if (Array.isArray(urls)) {
              urls.forEach((url: string) => {
                // Extract filename from Supabase URL
                // URL format: https://[project].supabase.co/storage/v1/object/public/Lusery/filename
                const match = url.match(/\/Lusery\/(.+)/);
                if (match) {
                  filesToDelete.push(match[1]);
                }
              });
            }
          });

          // Delete files from Supabase
          if (filesToDelete.length > 0) {
            await supabaseAdmin.storage.from("Lusery").remove(filesToDelete);
            console.log(`Deleted ${filesToDelete.length} images from Supabase`);
          }
        } catch (storageError) {
          console.error("Error deleting images from Supabase:", storageError);
          // Continue with database deletion even if Supabase deletion fails
        }
      }

      // Delete from database
      const result = await db.delete(schema.products).where(eq(schema.products.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error in deleteProduct:", error);
      throw error;
    }
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | undefined> {
    const result = await db.select().from(schema.appSettings).limit(1);
    return result[0];
  }

  async updateAppSettings(settings: UpdateAppSettings): Promise<AppSettings | undefined> {
    const result = await db.update(schema.appSettings)
      .set({ ...settings, updatedAt: new Date() })
      .returning();
    return result[0];
  }

  async ensureAppSettingsExist(): Promise<AppSettings> {
    let settings = await this.getAppSettings();
    if (!settings) {
      const result = await db.insert(schema.appSettings).values({
        whatsappNumber: "+593979079064",
      }).returning();
      settings = result[0];
    }
    return settings;
  }

  // Hero Banners
  async getHeroBanner(): Promise<any | undefined> {
    const result = await db.select().from(schema.heroBanners).limit(1);
    if (result[0]) {
      return {
        ...result[0],
        slides: JSON.parse(result[0].slides || "[]"),
      };
    }
    return undefined;
  }

  async getOrCreateHeroBanner(): Promise<any> {
    let banner = await this.getHeroBanner();
    if (!banner) {
      const result = await db.insert(schema.heroBanners).values({
        slides: JSON.stringify([]),
      }).returning();
      banner = {
        ...result[0],
        slides: [],
      };
    }
    return banner;
  }

  async addHeroSlide(slide: any): Promise<any> {
    const banner = await this.getOrCreateHeroBanner();
    const slides = banner.slides || [];
    slides.push(slide);
    
    const result = await db.update(schema.heroBanners)
      .set({ 
        slides: JSON.stringify(slides),
        updatedAt: new Date()
      })
      .where(eq(schema.heroBanners.id, banner.id))
      .returning();
    
    return {
      ...result[0],
      slides: JSON.parse(result[0].slides || "[]"),
    };
  }

  async removeHeroSlide(slideId: string): Promise<any> {
    const banner = await this.getOrCreateHeroBanner();
    const slides = (banner.slides || []).filter((s: any) => s.id !== slideId);
    
    const result = await db.update(schema.heroBanners)
      .set({ 
        slides: JSON.stringify(slides),
        updatedAt: new Date()
      })
      .where(eq(schema.heroBanners.id, banner.id))
      .returning();
    
    return {
      ...result[0],
      slides: JSON.parse(result[0].slides || "[]"),
    };
  }

  async reorderHeroSlides(slides: any[]): Promise<any> {
    const banner = await this.getOrCreateHeroBanner();
    
    const result = await db.update(schema.heroBanners)
      .set({ 
        slides: JSON.stringify(slides),
        updatedAt: new Date()
      })
      .where(eq(schema.heroBanners.id, banner.id))
      .returning();
    
    return {
      ...result[0],
      slides: JSON.parse(result[0].slides || "[]"),
    };
  }
}

export const storage = new DatabaseStorage();
