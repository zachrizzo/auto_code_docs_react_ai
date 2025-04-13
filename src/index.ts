import { generateDocumentation } from "./ai/generator";
import { parseComponents } from "./core/parser";
import fs from "fs-extra";
import path from "path";

export { generateDocumentation, parseComponents };

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

  // Ensure the output directory exists
  await fs.ensureDir(outputDir);

  // Generate the docs data directory
  const docsDataDir = path.join(outputDir, "docs-data");
  await fs.ensureDir(docsDataDir);

  // Create component index file
  const componentIndex = components.map((comp) => ({
    name: comp.name,
    description: comp.description || "",
    filePath: comp.filePath || "",
    methodCount: comp.methods ? comp.methods.length : 0,
    slug: comp.name.toLowerCase().replace(/\s+/g, "-"),
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
      slug: component.name.toLowerCase().replace(/\s+/g, "-"),
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
