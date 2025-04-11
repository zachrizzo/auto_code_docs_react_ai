"use client";

/**
 * Component Documentation Generator
 *
 * This module generates interactive documentation for React components.
 *
 * REFACTORING: This file has been refactored into multiple modules for better maintainability:
 *
 * 1. `/src/ui/generators/index.ts` - Main export file that orchestrates the generation process
 * 2. `/src/ui/generators/utilities.ts` - Utility functions like deduplicateComponents
 * 3. `/src/ui/generators/data.ts` - Logic for generating data.js file
 * 4. `/src/ui/generators/config.ts` - Logic for generating config.js file
 * 5. `/src/ui/generators/html.ts` - Logic for generating index.html
 * 6. `/src/ui/generators/styles.ts` - Logic for generating styles.css
 * 7. `/src/ui/generators/script.ts` - Logic for generating main.js
 *
 * Each file follows a clean, consistent API pattern, exporting specific generation functions.
 */

// Re-export from refactored modules
export { generateDocumentation } from "./generators";
export { deduplicateComponents } from "./generators/utilities";
