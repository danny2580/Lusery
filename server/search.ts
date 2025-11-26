import { Product } from "@shared/schema";

// Synonyms and color variations
const colorSynonyms: Record<string, string[]> = {
  "azul": ["azul marino", "azul oscuro", "azul claro", "azul cielo", "turquesa"],
  "rojo": ["rojo oscuro", "bordo", "vino", "carmesí"],
  "verde": ["verde oscuro", "verde claro", "verde militar", "verde oliva"],
  "blanco": ["crema", "hueso", "ivory"],
  "negro": ["negro profundo", "carbón"],
  "gris": ["gris claro", "gris oscuro", "plateado", "antracita"],
  "amarillo": ["dorado", "oro", "amarillo oscuro"],
  "rosa": ["rosado", "magenta", "fucsia", "coral"],
  "naranja": ["naranja oscuro", "salmón"],
  "marrón": ["café", "chocolate", "castaño", "tan", "beige"],
  "morado": ["púrpura", "violeta", "lavanda"],
};

// Size variations
const sizeMappings: Record<string, string[]> = {
  "xs": ["xsmall", "extra small", "xs", "muy pequeño"],
  "s": ["small", "s", "pequeño"],
  "m": ["medium", "m", "mediano"],
  "l": ["large", "l", "grande"],
  "xl": ["xlarge", "extra large", "xl", "muy grande"],
  "xxl": ["xxlarge", "2xl", "xxl"],
  "32": ["32", "28", "xs"],
  "34": ["34", "30", "s"],
  "36": ["36", "32", "m"],
  "38": ["38", "34", "l"],
  "40": ["40", "36", "xl"],
  "42": ["42", "38", "xxl"],
};

interface IndexedProduct {
  product: Product;
  normalizedName: string;
  normalizedDescription: string;
  normalizedColors: string[];
  normalizedSizes: string[];
  normalizedCategory: string;
  tags: string[];
  popularity: number;
}

class SearchEngine {
  private index: Map<string, IndexedProduct> = new Map();
  private allTokens: Set<string> = new Set();

  // Normalize text for comparison
  private normalizeText(text: string): string {
    if (!text) return "";
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove accents
  }

  // Parse colors from product
  private parseColors(product: Product): string[] {
    if (!product.colors) return [];
    try {
      let colors: string[] = [];
      if (typeof product.colors === "string") {
        colors = JSON.parse(product.colors);
      } else if (Array.isArray(product.colors)) {
        colors = product.colors as string[];
      }

      return colors.map((c) => this.normalizeText(c));
    } catch {
      return [];
    }
  }

  // Parse sizes from product
  private parseSizes(product: Product): string[] {
    if (!product.sizes) return [];
    try {
      let sizes: any[] = [];
      if (typeof product.sizes === "string") {
        sizes = JSON.parse(product.sizes);
      } else if (Array.isArray(product.sizes)) {
        sizes = product.sizes;
      }

      return sizes
        .map((s: any) => {
          if (typeof s === "string") return this.normalizeText(s);
          if (s.size) return this.normalizeText(s.size);
          return "";
        })
        .filter((s: string) => s);
    } catch {
      return [];
    }
  }

  // Normalize color with synonyms
  private normalizeColor(color: string): string {
    const normalized = this.normalizeText(color);

    for (const [key, variants] of Object.entries(colorSynonyms)) {
      if (key === normalized) return key;
      for (const variant of variants) {
        if (this.normalizeText(variant) === normalized) return key;
      }
    }

    return normalized;
  }

  // Normalize size with mappings
  private normalizeSize(size: string): string {
    const normalized = this.normalizeText(size);

    for (const [key, variants] of Object.entries(sizeMappings)) {
      if (key === normalized) return key;
      for (const variant of variants) {
        if (this.normalizeText(variant) === normalized) return key;
      }
    }

    return normalized;
  }

  // Calculate Levenshtein distance for fuzzy matching
  private levenshteinDistance(a: string, b: string): number {
    const len1 = a.length;
    const len2 = b.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  // Check if strings are similar (fuzzy match)
  private isSimilar(a: string, b: string, threshold: number = 2): boolean {
    if (a === b) return true;
    const distance = this.levenshteinDistance(a, b);
    return distance <= threshold;
  }

  // Index a product
  indexProduct(product: Product): void {
    const colors = this.parseColors(product);
    const sizes = this.parseSizes(product);
    const normalizedName = this.normalizeText(product.name);
    const normalizedDescription = this.normalizeText(product.description || "");

    const indexed: IndexedProduct = {
      product,
      normalizedName,
      normalizedDescription,
      normalizedColors: colors.map((c) => this.normalizeColor(c)),
      normalizedSizes: sizes.map((s) => this.normalizeSize(s)),
      normalizedCategory: this.normalizeText(product.categoryId || ""),
      tags: this.extractTags(product),
      popularity: product.featured ? 1 : 0,
    };

    this.index.set(product.id, indexed);

    // Add tokens for autocomplete
    [...normalizedName.split(/\s+/), ...normalizedDescription.split(/\s+/)].forEach(
      (token) => {
        if (token.length > 2) this.allTokens.add(token);
      }
    );
  }

  // Extract tags from product
  private extractTags(product: Product): string[] {
    const tags: string[] = [];
    if (product.featured) tags.push("destacado");
    if (product.stock === 0) tags.push("agotado");
    if (product.stock && product.stock <= 5) tags.push("bajo stock");
    return tags;
  }

  // Search products
  search(
    query: string,
    filters?: {
      categoryId?: string;
      color?: string;
      size?: string;
      maxResults?: number;
    }
  ): Product[] {
    if (!query.trim()) return [];

    const maxResults = filters?.maxResults || 50;
    const normalizedQuery = this.normalizeText(query);
    const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t);

    const results: Array<{
      product: Product;
      score: number;
    }> = [];

    for (const indexed of this.index.values()) {
      // Check if active
      if (!indexed.product.stock && indexed.popularity === 0) continue;

      let score = 0;

      // Exact name match (highest score)
      if (indexed.normalizedName === normalizedQuery) {
        score += 1000;
      }

      // Name contains query (high score)
      if (indexed.normalizedName.includes(normalizedQuery)) {
        score += 500;
      }

      // Partial name matches
      for (const token of queryTokens) {
        if (indexed.normalizedName.includes(token)) {
          score += 100;
        }

        // Fuzzy match on name
        if (this.isSimilar(token, indexed.normalizedName, 2)) {
          score += 50;
        }

        // Token in description
        if (indexed.normalizedDescription.includes(token)) {
          score += 30;
        }
      }

      // Color match
      if (filters?.color) {
        const normalizedFilterColor = this.normalizeColor(filters.color);
        if (
          indexed.normalizedColors.some(
            (c) => c === normalizedFilterColor || this.isSimilar(c, normalizedFilterColor)
          )
        ) {
          score += 150;
        }
      }

      // Size match
      if (filters?.size) {
        const normalizedFilterSize = this.normalizeSize(filters.size);
        if (
          indexed.normalizedSizes.some(
            (s) => s === normalizedFilterSize || this.isSimilar(s, normalizedFilterSize)
          )
        ) {
          score += 100;
        }
      }

      // Category match
      if (filters?.categoryId) {
        if (indexed.product.categoryId === filters.categoryId) {
          score += 200;
        }
      }

      // Boost featured products
      if (indexed.popularity > 0) {
        score *= 1.2;
      }

      if (score > 0) {
        results.push({
          product: indexed.product,
          score,
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults).map((r) => r.product);
  }

  // Get autocomplete suggestions
  getAutocomplete(prefix: string, limit: number = 10): string[] {
    const normalizedPrefix = this.normalizeText(prefix);
    const suggestions = new Set<string>();

    for (const token of this.allTokens) {
      if (token.startsWith(normalizedPrefix)) {
        suggestions.add(token);
        if (suggestions.size >= limit) break;
      }
    }

    return Array.from(suggestions);
  }

  // Update product in index
  updateProduct(product: Product): void {
    this.index.delete(product.id);
    this.indexProduct(product);
  }

  // Remove product from index
  removeProduct(productId: string): void {
    this.index.delete(productId);
  }

  // Initialize index with products
  initialize(products: Product[]): void {
    this.index.clear();
    this.allTokens.clear();
    for (const product of products) {
      this.indexProduct(product);
    }
  }

  // Get index statistics
  getStats() {
    return {
      indexedProducts: this.index.size,
      totalTokens: this.allTokens.size,
    };
  }
}

export const searchEngine = new SearchEngine();
