export async function searchProducts(
  query: string,
  filters?: {
    categoryId?: string;
    color?: string;
    size?: string;
  }
) {
  const params = new URLSearchParams();
  params.append("q", query);
  if (filters?.categoryId) params.append("categoryId", filters.categoryId);
  if (filters?.color) params.append("color", filters.color);
  if (filters?.size) params.append("size", filters.size);

  const response = await fetch(`/api/search?${params.toString()}`);
  if (!response.ok) throw new Error("Search failed");
  return response.json();
}

export async function getSearchSuggestions(prefix: string, limit: number = 10) {
  const params = new URLSearchParams();
  params.append("q", prefix);
  params.append("limit", String(limit));

  const response = await fetch(`/api/search/autocomplete?${params.toString()}`);
  if (!response.ok) throw new Error("Autocomplete failed");
  const data = await response.json();
  return data.suggestions;
}
