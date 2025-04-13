// This file is no longer needed as its functionality has been moved to server-utils.ts
// Keeping this stub to avoid breaking imports in case there are references elsewhere
export function nameToSlug(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function loadGeneratedDocs() {
  console.warn("loadGeneratedDocs is deprecated, use server-utils.ts instead");
  return [];
}
