import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Create admin user if it doesn't exist
    const existingAdmin = await storage.getAdminUserByUsername("LUSERY");
    if (!existingAdmin) {
      await storage.createAdminUser({
        username: "LUSERY",
        password: "Lusery2517",
      });
      console.log("✓ Admin user created: LUSERY / Lusery2517");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Create sample categories if none exist
    const categories = await storage.getAllCategories();
    let womenCategoryId = "";
    let menCategoryId = "";
    
    if (categories.length === 0) {
      const catData = [
        { name: "Ropa de Mujer", slug: "ropa-de-mujer" },
        { name: "Ropa de Hombre", slug: "ropa-de-hombre" },
        { name: "Accesorios", slug: "accesorios" },
        { name: "Calzado", slug: "calzado" },
      ];
      
      for (const cat of catData) {
        const created = await storage.createCategory({
          name: cat.name,
          slug: cat.slug,
          description: `Descubre nuestra colección de ${cat.name.toLowerCase()}`,
        });
        
        if (cat.slug === "ropa-de-mujer") womenCategoryId = created.id;
        if (cat.slug === "ropa-de-hombre") menCategoryId = created.id;
      }
      console.log("✓ Sample categories created");
    } else {
      const womenCat = categories.find(c => c.slug === "ropa-de-mujer");
      const menCat = categories.find(c => c.slug === "ropa-de-hombre");
      womenCategoryId = womenCat?.id || categories[0]?.id || "";
      menCategoryId = menCat?.id || categories[1]?.id || "";
    }

    // Create sample subcategories if none exist
    const subCategories = await storage.getAllSubCategories();
    let blouseSubCategoryId = "";
    let dressSubCategoryId = "";
    let pantsSubCategoryId = "";
    let jacketSubCategoryId = "";
    
    if (subCategories.length === 0 && womenCategoryId && menCategoryId) {
      const subCatData = [
        { categoryId: womenCategoryId, name: "Blusas", slug: "blusas" },
        { categoryId: womenCategoryId, name: "Vestidos", slug: "vestidos" },
        { categoryId: menCategoryId, name: "Pantalones", slug: "pantalones" },
        { categoryId: menCategoryId, name: "Chaquetas", slug: "chaquetas" },
      ];
      
      for (const subCat of subCatData) {
        const created = await storage.createSubCategory({
          categoryId: subCat.categoryId,
          name: subCat.name,
          slug: subCat.slug,
        });
        
        if (subCat.slug === "blusas") blouseSubCategoryId = created.id;
        if (subCat.slug === "vestidos") dressSubCategoryId = created.id;
        if (subCat.slug === "pantalones") pantsSubCategoryId = created.id;
        if (subCat.slug === "chaquetas") jacketSubCategoryId = created.id;
      }
      console.log("✓ Sample subcategories created");
    } else if (subCategories.length > 0) {
      const blouse = subCategories.find(s => s.slug === "blusas");
      const dress = subCategories.find(s => s.slug === "vestidos");
      const pants = subCategories.find(s => s.slug === "pantalones");
      const jacket = subCategories.find(s => s.slug === "chaquetas");
      
      blouseSubCategoryId = blouse?.id || "";
      dressSubCategoryId = dress?.id || "";
      pantsSubCategoryId = pants?.id || "";
      jacketSubCategoryId = jacket?.id || "";
    }

    // Create sample products if none exist
    const products = await storage.getAllProducts();
    if (products.length === 0 && womenCategoryId && menCategoryId) {
      const sampleProducts = [
        {
          name: "Licra Corta",
          slug: "licra-corta",
          description: "Licra corta cómoda y versátil.",
          price: "3.00",
          categoryId: womenCategoryId,
          subCategoryId: blouseSubCategoryId || null,
          colors: JSON.stringify(["Blanco", "Negro", "Rojo"]),
          stock: 50,
          featured: true,
          mediaUrls: JSON.stringify([
            { 
              color: "Blanco", 
              photos: [{ url: "https://via.placeholder.com/300?text=Licra+Blanca", size: "S", quantity: 10 }] 
            },
            { 
              color: "Negro", 
              photos: [{ url: "https://via.placeholder.com/300?text=Licra+Negra", size: "M", quantity: 15 }] 
            },
          ]),
          sizes: JSON.stringify([]),
        },
        {
          name: "Vestido Negro Elegante",
          slug: "vestido-negro-elegante",
          description: "Vestido negro sofisticado ideal para ocasiones especiales.",
          price: "89.99",
          categoryId: womenCategoryId,
          subCategoryId: dressSubCategoryId || null,
          colors: JSON.stringify(["Negro"]),
          stock: 25,
          featured: true,
          mediaUrls: JSON.stringify([
            { 
              color: "Negro", 
              photos: [{ url: "https://via.placeholder.com/300?text=Vestido+Negro", size: "S", quantity: 5 }] 
            },
          ]),
          sizes: JSON.stringify([]),
        },
        {
          name: "Jeans Clásicos",
          slug: "jeans-clasicos",
          description: "Jeans de mezclilla de corte moderno y cómodo.",
          price: "79.99",
          categoryId: menCategoryId,
          subCategoryId: pantsSubCategoryId || null,
          colors: JSON.stringify(["Azul", "Negro"]),
          stock: 40,
          featured: false,
          mediaUrls: JSON.stringify([
            { 
              color: "Azul", 
              photos: [{ url: "https://via.placeholder.com/300?text=Jeans+Azul", size: "32", quantity: 20 }] 
            },
          ]),
          sizes: JSON.stringify([]),
        },
        {
          name: "Blazer Beige",
          slug: "blazer-beige",
          description: "Blazer elegante de corte moderno, perfecto para el trabajo.",
          price: "149.99",
          categoryId: menCategoryId,
          subCategoryId: jacketSubCategoryId || null,
          colors: JSON.stringify(["Beige", "Negro", "Azul Marino"]),
          stock: 20,
          featured: true,
          mediaUrls: JSON.stringify([
            { 
              color: "Beige", 
              photos: [{ url: "https://via.placeholder.com/300?text=Blazer+Beige", size: "M", quantity: 8 }] 
            },
          ]),
          sizes: JSON.stringify([]),
        },
      ];

      for (const product of sampleProducts) {
        await storage.createProduct(product as any);
      }
      console.log("✓ Sample products created");
    }

    console.log("✓ Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
