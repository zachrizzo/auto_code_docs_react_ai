"use client";

/**
 * Generator for data.js file which contains component information
 */

import path from "path";
import fs from "fs-extra";
import type { ComponentDefinition } from "../../core/types";

/**
 * Generate data.js file with component data
 * @param components Components to include in data file
 * @param outputPath Output directory path
 */
export async function generateDataFile(
  components: ComponentDefinition[],
  outputPath: string
): Promise<void> {
  const dataJsPath = path.join(outputPath, "data.js");

  // Process components to avoid circular references
  const safeComponents = components.map((comp) => {
    // Create a deep copy to avoid mutating the original
    const cleanComp = { ...comp } as ComponentDefinition & {
      fileName?: string;
    };

    // Convert FilePaths to just the filename for display
    if (cleanComp.filePath) {
      cleanComp.fileName = path.basename(cleanComp.filePath);
    }

    // Function to replace circular references
    const replacer = (key: string, value: any) => {
      if (key === "parent" || key === "parentNode") {
        return undefined; // Skip circular references
      }
      return value;
    };

    // Convert to JSON and back to safely remove circular references
    try {
      return JSON.parse(JSON.stringify(cleanComp, replacer));
    } catch (error) {
      // Fallback for objects that can't be stringified
      const simplified: any = { name: cleanComp.name };

      // Copy safe properties
      const safeProps = [
        "type",
        "description",
        "fileName",
        "filePath",
        "sourceCode",
        "methods",
        "similarityWarnings",
      ];
      for (const prop of safeProps) {
        if (prop in cleanComp) {
          simplified[prop] = cleanComp[prop as keyof typeof cleanComp];
        }
      }

      // Handle arrays safely
      if (Array.isArray(cleanComp.props)) {
        simplified.props = cleanComp.props.map((p) => ({
          name: p.name,
          type: String(p.type || ""),
          required: !!p.required,
          description: p.description || "",
        }));
      }

      if (Array.isArray(cleanComp.childComponents)) {
        simplified.childComponents = cleanComp.childComponents.map((c) => ({
          name: c.name,
        }));
      }

      if (Array.isArray(cleanComp.methods)) {
        simplified.methods = cleanComp.methods.map((m) => ({
          name: m.name,
          description: m.description || "",
          params: m.params || [],
          returnType: m.returnType || "void",
          code: m.code || "",
          similarityWarnings: m.similarityWarnings || [],
        }));
      }

      return simplified;
    }
  });

  // Safely stringify the component data
  let componentData;
  try {
    componentData = JSON.stringify(safeComponents, null, 2);
    console.log(`Successfully serialized ${safeComponents.length} components`);
  } catch (error) {
    console.error("Error serializing components:", error);
    componentData = "[]"; // Fallback to empty array if serialization fails
  }

  const dataJs = `// Auto-generated component data
try {
  console.log("Loading component data...");
  window.COMPONENT_DATA = ${componentData};
  console.log("Loaded ${safeComponents.length} components");
} catch (error) {
  console.error("Error setting component data:", error);
  window.COMPONENT_DATA = [];
}`;

  await fs.writeFile(dataJsPath, dataJs);
}
