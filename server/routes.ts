import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, setSupabaseAdmin } from "./storage";
import { insertProductSchema, insertCategorySchema, insertAdminUserSchema, insertSubCategorySchema, updateAppSettingsSchema, insertHeroBannerSchema } from "@shared/schema";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import cookieParser from "cookie-parser";
import { searchEngine } from "./search";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 10 * 1024 * 1024 // 10MB para soportar URLs largas
  }
});

// Initialize Supabase clients
let supabase: ReturnType<typeof createClient> | null = null;
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// Initialize admin client for Storage uploads (requires SERVICE_ROLE_KEY)
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // Pass Supabase admin client to storage for file deletion
  setSupabaseAdmin(supabaseAdmin);
}

// Admin authentication middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  const adminSession = req.cookies?.["admin-session"];
  if (!adminSession) {
    return res.status(401).json({ message: "No autorizado" });
  }
  
  // Verify the session ID exists in the database
  try {
    const user = await storage.getAdminUser(adminSession);
    if (!user) {
      res.clearCookie("admin-session");
      return res.status(401).json({ message: "Sesión inválida" });
    }
    req.adminUserId = adminSession;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error de autenticación" });
  }
};

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_RESET_TIME = 15 * 60 * 1000; // 15 minutes

const checkLoginAttempts = (ip: string): boolean => {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(ip, { count: 0, resetTime: now + ATTEMPT_RESET_TIME });
    return true;
  }
  
  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  return true;
};

const recordFailedAttempt = (ip: string) => {
  const attempt = loginAttempts.get(ip);
  if (attempt) {
    attempt.count++;
  }
};

// Supabase buckets for storage rotation
const SUPABASE_BUCKETS = ["Lusery", "LuseryV2", "LuseryFotos", "LuseryFt", "LuseryFots", "LuseryPhoto"];

// Upload file with automatic bucket rotation
const uploadToSupabase = async (file: Express.Multer.File, fileName: string): Promise<{ url: string | null; bucket: string | null; error?: string }> => {
  if (!supabaseAdmin) {
    return { url: null, bucket: null, error: "Supabase not configured" };
  }

  for (const bucket of SUPABASE_BUCKETS) {
    try {
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(fileName);
        console.log(`File uploaded to bucket: ${bucket}`);
        return { url: publicUrlData.publicUrl, bucket };
      } else if (uploadError && uploadError.message && uploadError.message.includes('quota')) {
        console.log(`Bucket ${bucket} is full, trying next...`);
        continue;
      } else {
        console.error(`Upload error in bucket ${bucket}:`, uploadError);
        continue;
      }
    } catch (e) {
      console.error(`Error uploading to bucket ${bucket}:`, e);
      continue;
    }
  }

  return { url: null, bucket: null, error: "All buckets full or unavailable" };
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  const httpServer = createServer(app);

  // WebSocket Server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Admin Authentication
  app.get("/api/admin/check", (req, res) => {
    const adminSession = req.cookies?.["admin-session"];
    if (adminSession) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      
      // Check rate limiting
      if (!checkLoginAttempts(clientIp)) {
        return res.status(429).json({ 
          message: "Demasiados intentos fallidos. Intenta más tarde." 
        });
      }
      
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        recordFailedAttempt(clientIp);
        return res.status(400).json({ message: "Usuario y contraseña requeridos" });
      }
      
      const user = await storage.verifyAdminPassword(username, password);

      if (!user) {
        recordFailedAttempt(clientIp);
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // Reset attempts on successful login
      loginAttempts.delete(clientIp);

      // Set session cookie (httpOnly = no acceso desde F12)
      res.cookie("admin-session", user.id, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin-session", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ success: true });
  });

  // Initialize admin user if doesn't exist
  app.post("/api/admin/init", async (req, res) => {
    try {
      const existingUser = await storage.getAdminUserByUsername("LUSERY");
      if (existingUser) {
        return res.json({ message: "Admin user already exists" });
      }

      const result = insertAdminUserSchema.safeParse({
        username: "LUSERY",
        password: "Lusery2517",
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const adminUser = await storage.createAdminUser(result.data);
      res.json(adminUser);
    } catch (error) {
      res.status(500).json({ message: "Error creating admin user" });
    }
  });

  // Categories Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  app.post("/api/categories", requireAdmin, async (req, res) => {
    try {
      const result = insertCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const category = await storage.createCategory(result.data);
      broadcast({ type: "category-created", data: category });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Error creating category" });
    }
  });

  app.put("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const result = insertCategorySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const category = await storage.updateCategory(req.params.id, result.data);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      broadcast({ type: "category-updated", data: category });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Error updating category" });
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      broadcast({ type: "category-deleted", data: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // SubCategories Routes
  app.get("/api/sub-categories", async (req, res) => {
    try {
      const subCategories = await storage.getAllSubCategories();
      res.json(subCategories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sub-categories" });
    }
  });

  app.get("/api/categories/:categoryId/sub-categories", async (req, res) => {
    try {
      const subCategories = await storage.getSubCategoriesByCategory(req.params.categoryId);
      res.json(subCategories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sub-categories" });
    }
  });

  app.post("/api/sub-categories", requireAdmin, async (req, res) => {
    try {
      const result = insertSubCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const subCategory = await storage.createSubCategory(result.data);
      broadcast({ type: "sub-category-created", data: subCategory });
      res.json(subCategory);
    } catch (error) {
      res.status(500).json({ message: "Error creating sub-category" });
    }
  });

  app.put("/api/sub-categories/:id", requireAdmin, async (req, res) => {
    try {
      const result = insertSubCategorySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const subCategory = await storage.updateSubCategory(req.params.id, result.data);
      if (!subCategory) {
        return res.status(404).json({ message: "Sub-category not found" });
      }
      broadcast({ type: "sub-category-updated", data: subCategory });
      res.json(subCategory);
    } catch (error) {
      res.status(500).json({ message: "Error updating sub-category" });
    }
  });

  app.delete("/api/sub-categories/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteSubCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Sub-category not found" });
      }
      broadcast({ type: "sub-category-deleted", data: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting sub-category" });
    }
  });

  // Products Routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      // Initialize search index
      searchEngine.initialize(products);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.post("/api/products", requireAdmin, upload.array("media"), async (req, res) => {
    try {
      const name = req.body.name || "";
      const slug = req.body.slug || "";
      const description = req.body.description || "";
      const price = req.body.price || "0";
      const stock = parseInt(req.body.stock || "0");
      const categoryId = req.body.categoryId || null;
      const subCategoryId = req.body.subCategoryId || null;
      const featured = req.body.featured === 'true';
      
      let colors: string[] = [];
      try {
        colors = JSON.parse(req.body.colors || "[]");
      } catch {
        colors = [];
      }

      let mediaByColor: any[] = [];
      try {
        mediaByColor = JSON.parse(req.body.mediaUrls || "[]");
      } catch {
        mediaByColor = [];
      }

      const files = req.files as Express.Multer.File[];

      // Upload files and update URLs with automatic bucket rotation
      if (supabaseAdmin && files && files.length > 0) {
        let fileIndex = 0;
        for (const colorGroup of mediaByColor) {
          if (colorGroup.photos) {
            for (const photo of colorGroup.photos) {
              if (fileIndex < files.length && (!photo.url || photo.url.startsWith('data:') || photo.url.startsWith('blob:'))) {
                const file = files[fileIndex];
                const fileName = `${Date.now()}-${fileIndex}-${file.originalname}`;
                
                const result = await uploadToSupabase(file, fileName);
                if (result.url) {
                  photo.url = result.url;
                  photo.bucket = result.bucket;
                  fileIndex++;
                } else {
                  console.error("Failed to upload file:", result.error);
                  fileIndex++;
                }
              }
            }
          }
        }
      }

      const productData = {
        name,
        slug,
        description,
        price: String(price),
        stock,
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        featured,
        colors: req.body.colors,
        mediaUrls: JSON.stringify(mediaByColor),
        sizes: JSON.stringify([]),
      };

      const result = insertProductSchema.safeParse(productData);
      if (!result.success) {
        console.error("Validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      const product = await storage.createProduct(result.data);
      searchEngine.indexProduct(product);
      broadcast({ type: "product-created", data: product });
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Error creating product" });
    }
  });

  app.put("/api/products/:id", requireAdmin, upload.array("media"), async (req, res) => {
    try {
      const name = req.body.name || "";
      const description = req.body.description || "";
      const price = req.body.price || "0";
      const stock = parseInt(req.body.stock || "0");
      const categoryId = req.body.categoryId || null;
      const subCategoryId = req.body.subCategoryId || null;
      const featured = req.body.featured === 'true';
      
      let colors: string[] = [];
      try {
        colors = JSON.parse(req.body.colors || "[]");
      } catch {
        colors = [];
      }

      let mediaByColor: any[] = [];
      try {
        mediaByColor = JSON.parse(req.body.mediaUrls || "[]");
      } catch {
        mediaByColor = [];
      }

      const files = req.files as Express.Multer.File[];

      // Upload files and update URLs with automatic bucket rotation
      if (supabaseAdmin && files && files.length > 0) {
        let fileIndex = 0;
        for (const colorGroup of mediaByColor) {
          if (colorGroup.photos) {
            for (const photo of colorGroup.photos) {
              if (fileIndex < files.length && (!photo.url || photo.url.startsWith('data:') || photo.url.startsWith('blob:'))) {
                const file = files[fileIndex];
                const fileName = `${Date.now()}-${fileIndex}-${file.originalname}`;
                
                const result = await uploadToSupabase(file, fileName);
                if (result.url) {
                  photo.url = result.url;
                  photo.bucket = result.bucket;
                  fileIndex++;
                } else {
                  console.error("Failed to upload file:", result.error);
                  fileIndex++;
                }
              }
            }
          }
        }
      }

      const productData = {
        name,
        description,
        price: String(price),
        stock,
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        featured,
        colors: req.body.colors,
        mediaUrls: JSON.stringify(mediaByColor),
        sizes: JSON.stringify([]),
      };

      const result = insertProductSchema.partial().safeParse(productData);
      if (!result.success) {
        console.error("Validation error:", result.error);
        return res.status(400).json({ error: result.error });
      }

      const product = await storage.updateProduct(req.params.id, result.data);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      searchEngine.updateProduct(product);
      broadcast({ type: "product-updated", data: product });
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      searchEngine.removeProduct(req.params.id);
      broadcast({ type: "product-deleted", data: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // Delete individual media file from Supabase
  app.delete("/api/media/delete", requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || !url.includes('supabase')) {
        return res.status(400).json({ message: "Invalid URL" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      // Extract bucket and filename from Supabase URL
      let bucket = "Lusery";
      let filename = "";
      
      for (const b of SUPABASE_BUCKETS) {
        const match = url.match(new RegExp(`/${b}/(.+)`));
        if (match) {
          bucket = b;
          filename = match[1];
          break;
        }
      }
      
      if (!filename) {
        return res.status(400).json({ message: "Could not extract filename" });
      }

      const { error } = await supabaseAdmin.storage.from(bucket).remove([filename]);

      if (error) {
        console.error("Supabase delete error:", error);
        return res.status(500).json({ message: "Error deleting file from Supabase" });
      }

      res.json({ success: true, deleted: filename });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({ message: "Error deleting media" });
    }
  });

  // Search Routes
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const categoryId = req.query.categoryId as string;
      const color = req.query.color as string;
      const size = req.query.size as string;

      const results = searchEngine.search(query, {
        categoryId,
        color,
        size,
        maxResults: 50,
      });

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Error searching products" });
    }
  });

  app.get("/api/search/autocomplete", async (req, res) => {
    try {
      const prefix = req.query.q as string || "";
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

      const suggestions = searchEngine.getAutocomplete(prefix, limit);

      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ message: "Error getting suggestions" });
    }
  });

  // App Settings
  app.get("/api/settings", async (req, res) => {
    try {
      let settings = await storage.getAppSettings();
      if (!settings) {
        settings = await storage.ensureAppSettingsExist();
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  app.patch("/api/settings", requireAdmin, async (req, res) => {
    try {
      const validatedData = updateAppSettingsSchema.parse(req.body);
      const settings = await storage.updateAppSettings(validatedData);
      
      if (!settings) {
        return res.status(400).json({ message: "Could not update settings" });
      }
      
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Validation error" });
    }
  });

  // Hero Banners - Multiple slides carousel
  app.get("/api/hero-banner", async (req, res) => {
    try {
      const banner = await storage.getHeroBanner();
      res.json(banner || null);
    } catch (error) {
      res.status(500).json({ message: "Error fetching hero banner" });
    }
  });

  app.post("/api/hero-banner", requireAdmin, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      const fileName = `hero-slide-${Date.now()}-${req.file.originalname}`;
      const uploadResult = await uploadToSupabase(req.file, fileName);

      if (!uploadResult.url) {
        return res.status(500).json({ message: "Failed to upload image" });
      }

      const slide = {
        id: `slide-${Date.now()}`,
        imageUrl: uploadResult.url,
        fileName: fileName,
        bucket: uploadResult.bucket || "Lusery",
        position: 0,
      };

      const banner = await storage.addHeroSlide(slide);
      broadcast({ type: "hero-banner-updated", data: banner });
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Validation error" });
    }
  });

  app.delete("/api/hero-banner/:slideId", requireAdmin, async (req, res) => {
    try {
      const banner = await storage.getHeroBanner();
      if (!banner) {
        return res.status(404).json({ message: "Hero banner not found" });
      }

      // Delete from Supabase if file exists
      const slide = banner.slides?.find((s: any) => s.id === req.params.slideId);
      if (slide && supabaseAdmin && slide.fileName && slide.bucket) {
        try {
          await supabaseAdmin.storage.from(slide.bucket).remove([slide.fileName]);
        } catch (storageError) {
          console.error("Error deleting hero slide from Supabase:", storageError);
        }
      }

      const updated = await storage.removeHeroSlide(req.params.slideId);
      broadcast({ type: "hero-banner-updated", data: updated });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting hero slide" });
    }
  });

  app.patch("/api/hero-banner/reorder", requireAdmin, async (req, res) => {
    try {
      const { slides } = req.body;
      if (!Array.isArray(slides)) {
        return res.status(400).json({ message: "Slides must be an array" });
      }

      const updated = await storage.reorderHeroSlides(slides);
      broadcast({ type: "hero-banner-updated", data: updated });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error reordering hero slides" });
    }
  });

  return httpServer;
}
