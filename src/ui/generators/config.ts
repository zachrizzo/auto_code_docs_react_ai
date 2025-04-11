"use client";

/**
 * Generator for config.js file which contains documentation configuration
 */

import path from "path";
import fs from "fs-extra";

/**
 * Generate config.js file with docs configuration
 * @param config Docs configuration
 * @param outputPath Output directory path
 */
export async function generateConfigFile(
  config: {
    showCode: boolean;
    showMethods: boolean;
    showSimilarity: boolean;
  },
  outputPath: string
): Promise<void> {
  const configJsPath = path.join(outputPath, "config.js");

  const configJs = `// Auto-generated docs configuration
window.docsConfig = ${JSON.stringify(config)};`;

  await fs.writeFile(configJsPath, configJs);
}
