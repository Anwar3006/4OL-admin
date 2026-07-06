import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const createPaginationHandlers = (
  currentPage: number,
  setPage: React.Dispatch<React.SetStateAction<number>>,
  totalPages: number = 1,
) => ({
  next: () => {
    if (currentPage < totalPages) setPage((prev) => prev + 1);
  },
  previous: () => {
    if (currentPage > 1) setPage((prev) => prev - 1);
  },
  goTo: (page: number) => {
    if (page >= 1 && page <= totalPages) setPage(page);
  },
});

export const getDeepestNodes = (selectedIds: string[], allData: any[]) => {
  // 1. Create a set for O(1) lookups
  const selectedSet = new Set(selectedIds);

  // 2. Filter the selected IDs
  return selectedIds.filter((id) => {
    // Check if any OTHER selected ID has this ID as its parent
    const hasSelectedChild = allData.some(
      (item) => item.parentId === id && selectedSet.has(item.id),
    );

    // If it has a selected child, it's a parent/ancestor; discard it.
    // If it has NO selected children, it is the 'deepest' node in this branch.
    return !hasSelectedChild;
  });
};

/**
 * Takes leaf IDs from the DB and returns an array including all ancestors
 * so the Tree UI shows the full path as selected.
 */
export const rehydrateHierarchy = (junctionData: any[], allData: any[]) => {
  if (!junctionData || !allData) return [];

  const expandedIds = new Set<string>();

  // Extract the actual IDs from the nested junction structure
  // This handles condition_body_parts[i].body_parts.id
  // and condition_categories[i].categories.id
  const leafIds = junctionData
    .map((item) => {
      return (
        item.body_parts?.id ||
        item.categories?.id ||
        item.id ||
        item.body_part_id ||
        item.category_id
      );
    })
    .filter(Boolean);

  const addAncestors = (id: string) => {
    if (expandedIds.has(id)) return; // Prevent infinite loops or redundant work

    const item = allData.find((d) => d.id === id);
    if (!item) return;

    expandedIds.add(item.id);

    // Support both snake_case and camelCase parent references
    const parentId = item.parent_id || item.parentId;
    if (parentId) {
      addAncestors(parentId);
    }
  };

  leafIds.forEach(addAncestors);
  return Array.from(expandedIds);
};

export const hasLexicalContent = (json: any): boolean => {
  if (!json?.root?.children) return false;

  // Check if there's more than one paragraph, or if the first paragraph isn't empty
  return json.root.children.some((child: any) => {
    // If the node itself has text (uncommon for root children, but safe)
    if (child.text?.trim()) return true;

    // Check nested children (the standard Lexical structure)
    if (child.children?.length > 0) {
      return child.children.some(
        (textNode: any) =>
          textNode.text?.trim() !== "" || textNode.type !== "text",
      );
    }

    // If it's a non-text node (like an Image or Horizontal Rule), it counts as content
    return child.type !== "paragraph" && child.type !== "text";
  });
};

export const toUppercaseFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getPublicImageUrl = (url: string) => {
  // If URL is already absolute (starts with http:// or https://), return as-is
  // if (url.startsWith("http://") || url.startsWith("https://")) {
  //   return url;
  // }
  if (url.includes("blob.core.windows.net")) {
    return "";
  }
  // Otherwise, prepend the Supabase storage URL
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bucket4ol/${url}`;
};

/**
 * Generates a consistent, high-contrast color for a given UUID.
 * This avoids the need to store colors in the database.
 */
export const getColorForId = (id: string): string => {
  // Simple hashing algorithm to turn string into a number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Define a set of 10-12 high-contrast professional colors
  const highContrastColors = [
    "#EF4444", // Red
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#6366F1", // Indigo
  ];

  // Pick a color based on the hash
  const index = Math.abs(hash) % highContrastColors.length;
  return highContrastColors[index];
};

/**
 * Normalizes location names for fuzzy matching.
 * Handles common variations in Ghana region and district names.
 */
export const normalizeLocationName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\bregion\b/g, "") // Remove "region"
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};
