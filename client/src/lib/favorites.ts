// LocalStorage-based favorites management
const FAVORITES_KEY = "lusery-favorites-v2";
const OLD_FAVORITES_KEY = "lusery-favorites";

// Clean up old corrupted data on startup
function migrateOldData(): void {
  try {
    // Remove old key if it exists
    const oldData = localStorage.getItem(OLD_FAVORITES_KEY);
    if (oldData) {
      console.log("Removing old favorites key");
      localStorage.removeItem(OLD_FAVORITES_KEY);
    }
  } catch (error) {
    console.warn("Error during migration:", error);
  }
}

export function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn("Invalid favorites data, clearing corrupted localStorage");
      localStorage.removeItem(FAVORITES_KEY);
      return [];
    }
    
    console.log("getFavorites returning:", parsed);
    return parsed;
  } catch (error) {
    console.warn("Error parsing favorites, clearing corrupted data:", error);
    localStorage.removeItem(FAVORITES_KEY);
    return [];
  }
}

// Initialize favorites on app startup
export function initializeFavorites(): void {
  migrateOldData();
  const favorites = getFavorites();
  console.log("initializeFavorites: loaded", favorites.length, "favorites");
}

export function saveFavorites(favorites: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  console.log("saveFavorites saved:", favorites);
}

export function addToFavorites(productId: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(productId)) {
    favorites.push(productId);
    saveFavorites(favorites);
  }
  return favorites;
}

export function removeFromFavorites(productId: string): string[] {
  const favorites = getFavorites();
  const filtered = favorites.filter(id => id !== productId);
  saveFavorites(filtered);
  return filtered;
}

export function isFavorite(productId: string): boolean {
  return getFavorites().includes(productId);
}

export function toggleFavorite(productId: string): { favorites: string[]; isNowFavorite: boolean } {
  const favorites = getFavorites();
  const isCurrentlyFavorite = favorites.includes(productId);
  
  let result;
  if (isCurrentlyFavorite) {
    result = {
      favorites: removeFromFavorites(productId),
      isNowFavorite: false
    };
  } else {
    result = {
      favorites: addToFavorites(productId),
      isNowFavorite: true
    };
  }
  
  // Dispatch event to sync across pages
  window.dispatchEvent(new CustomEvent("favorites-updated", { detail: result.favorites }));
  return result;
}
