// This file is meant to be used only on the server side
// Import necessary types
import { ComponentDefinition } from "./docs-data";
import { nameToSlug } from "./load-generated-docs";

// Empty implementations that will be replaced at runtime on the server
// These functions will not be bundled with client code
export async function getComponentsFromFile(): Promise<ComponentDefinition[]> {
  console.warn("getComponentsFromFile called in browser environment");
  return [];
}

export async function getAllComponentSlugs(): Promise<string[]> {
  console.warn("getAllComponentSlugs called in browser environment");
  return [];
}

export async function getComponentBySlugServer(
  slug: string
): Promise<ComponentDefinition | null> {
  console.warn("getComponentBySlugServer called in browser environment");
  return null;
}
