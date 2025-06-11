import { generateDocumentation, AiDescriptionGenerator } from "./ai/generator";
import { parseComponents, parseAllCodeItems } from "./core/parser/";
import fs from "fs-extra";
import path from "path";

/**
 * Generate a unique slug for a component based on its file path and name
 * to avoid collisions when multiple components have the same name
 */
function generateUniqueSlug(componentName: string, filePath: string): string {
  // For generateDocUI, we need to extract root directory from the file path
  // This is a simplified version since we don't have rootDir readily available
  const relativePath = filePath.replace(/^.*[\/\\](src[\/\\].*?)$/, '$1') || filePath;
  return `${relativePath.replace(/[\/\\]/g, '_').replace(/\.(tsx?|jsx?)$/, '')}_${componentName}`.toLowerCase().replace(/\s+/g, "-");
}

export { generateDocumentation, parseComponents, parseAllCodeItems, AiDescriptionGenerator };

// Generate the documentation UI
export async function generateDocUI(components: any[], options: any = {}) {
  const {
    title = "React Component Documentation",
    description = "Auto-generated documentation for React components",
    theme = "light",
    outputDir = path.join(process.cwd(), "docs"),
    showCode = true,
    showMethods = true,
    showSimilarity = true,
  } = options;

  // Write component data directly to the specified outputDir
  // rather than creating a nested docs-data folder
  const docsDataDir = outputDir;

  // Clear the output directory to prevent duplicates from previous runs
  if (await fs.pathExists(docsDataDir)) {
    await fs.remove(docsDataDir);
  }
  // Ensure the output directory exists (it will be recreated if removed)
  await fs.ensureDir(docsDataDir);

  // Create component index file
  const componentIndex = components.map((comp) => ({
    name: comp.name,
    description: comp.description || "",
    filePath: comp.filePath || "",
    methodCount: comp.methods ? comp.methods.length : 0,
    slug: comp.slug || generateUniqueSlug(comp.name, comp.filePath || ""),
  }));

  await fs.writeJson(
    path.join(docsDataDir, "component-index.json"),
    componentIndex,
    { spaces: 2 }
  );

  // Write individual component files
  for (const component of components) {
    const componentData = {
      ...component,
      slug: component.slug || generateUniqueSlug(component.name, component.filePath || ""),
    };

    await fs.writeJson(
      path.join(docsDataDir, `${componentData.slug}.json`),
      componentData,
      { spaces: 2 }
    );
  }

  // Create config file
  const configData = {
    title,
    description,
    theme,
    showCode,
    showMethods,
    showSimilarity,
    generatedAt: new Date().toISOString(),
  };

  await fs.writeJson(path.join(docsDataDir, "config.json"), configData, {
    spaces: 2,
  });

  // Create a URL file that points to the documentation
  const docsUrl = `http://localhost:3000/docs`;
  await fs.writeFile(path.join(process.cwd(), "docs-url.txt"), docsUrl);

  console.log(`Documentation data generated at: ${outputDir}`);
  return outputDir;
}

export default generateDocumentation;
