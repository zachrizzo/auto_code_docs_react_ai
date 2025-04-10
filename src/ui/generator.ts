import path from "path";
import fs from "fs-extra";
import { ComponentDefinition, DocumentationConfig } from "../core/types";

/**
 * Deduplicate components by name to prevent multiple entries of the same component
 * @param components List of components to deduplicate
 * @returns Deduplicated list of components
 */
function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  // Keep track of processed component names
  const processedNames = new Set<string>();
  const result: ComponentDefinition[] = [];

  // Helper function to find all unique components in the tree
  function processComponent(
    component: ComponentDefinition
  ): ComponentDefinition {
    // Process child components recursively and deduplicate them
    if (component.childComponents && component.childComponents.length > 0) {
      const uniqueChildren: ComponentDefinition[] = [];

      for (const child of component.childComponents) {
        // Only process this child if we haven't already seen a component with this name
        if (!processedNames.has(child.name)) {
          processedNames.add(child.name);
          uniqueChildren.push(processComponent(child));
        }
      }

      // Replace the children with the unique set
      component.childComponents = uniqueChildren;
    }

    return component;
  }

  // Process all top-level components
  for (const component of components) {
    if (!processedNames.has(component.name)) {
      processedNames.add(component.name);
      result.push(processComponent(component));
    }
  }

  console.log(`Found components before deduplication: ${components.length}`);
  console.log(`Components after deduplication: ${result.length}`);

  return result;
}

export async function generateDocumentation(
  components: ComponentDefinition[],
  config: DocumentationConfig = {}
): Promise<string> {
  const {
    title = "React Component Documentation",
    description = "Auto-generated documentation for React components",
    theme = "light",
    outputDir = "docs",
  } = config;

  // Deduplicate components before generating UI
  const uniqueComponents = deduplicateComponents(components);

  // Create output directory
  const outputPath = path.resolve(process.cwd(), outputDir);
  await fs.ensureDir(outputPath);

  // Generate data.js file with component data
  await generateDataFile(uniqueComponents, outputPath);

  // Generate index.html
  const indexHtmlPath = path.join(outputPath, "index.html");
  await generateIndexHtml(indexHtmlPath, title, description, theme);

  // Generate styles.css
  const stylesPath = path.join(outputPath, "styles.css");
  await generateStyles(stylesPath, theme);

  // Generate main.js
  const mainJsPath = path.join(outputPath, "main.js");
  await generateMainJs(mainJsPath);

  // Return the path to the generated documentation
  return outputPath;
}

/**
 * Generate data.js file with component data
 */
async function generateDataFile(
  components: ComponentDefinition[],
  outputPath: string
): Promise<void> {
  const dataJsPath = path.join(outputPath, "data.js");

  // Ensure the data is serializable and handle circular references
  const safeComponents = components.map((comp) => {
    // Create a clean copy without circular references
    const cleanComp = { ...comp };

    // Remove potential circular references from any object properties
    Object.keys(cleanComp).forEach((key) => {
      const value = (cleanComp as any)[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Convert complex objects to strings to avoid circular references
        if (value.fileName) {
          (cleanComp as any)[key] = value.fileName;
        } else {
          try {
            // Try to convert to string representation
            (cleanComp as any)[key] = JSON.stringify(value);
          } catch (e) {
            // If it fails, use a placeholder
            (cleanComp as any)[key] = `[Object ${key}]`;
          }
        }
      }
    });

    return cleanComp;
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

/**
 * Generate index.html file
 */
async function generateIndexHtml(
  indexHtmlPath: string,
  title: string,
  description: string,
  theme: string
): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}" class="${theme === "dark" ? "dark" : ""}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
  <!-- Marked library for markdown rendering -->
  <script src="https://cdn.jsdelivr.net/npm/marked@4.0.0/marked.min.js"></script>
  <!-- Add TailwindCSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Global error handler
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Global error caught:', message, 'at', source, lineno, colno);
      console.error('Error object:', error);
      document.getElementById('app').innerHTML =
        '<div style="color:red; padding:20px;">' +
        '<h2>Error Occurred</h2>' +
        '<p><strong>Message:</strong> ' + message + '</p>' +
        '<p><strong>Location:</strong> ' + source + ' line ' + lineno + ', col ' + colno + '</p>' +
        '</div>';
      return true;
    };

    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: "rgb(var(--border-color-rgb) / <alpha-value>)",
            input: "rgb(var(--border-color-rgb) / <alpha-value>)",
            ring: "rgb(var(--primary-color-rgb) / <alpha-value>)",
            background: "rgb(var(--background-color-rgb) / <alpha-value>)",
            foreground: "rgb(var(--text-color-rgb) / <alpha-value>)",
            primary: {
              DEFAULT: "rgb(var(--primary-color-rgb) / <alpha-value>)",
              foreground: "white",
            },
            secondary: {
              DEFAULT: "rgb(var(--secondary-color-rgb) / <alpha-value>)",
              foreground: "white",
            },
            destructive: {
              DEFAULT: "rgb(220 38 38 / <alpha-value>)",
              foreground: "white",
            },
            muted: {
              DEFAULT: "rgb(var(--border-color-rgb) / <alpha-value>)",
              foreground: "rgb(var(--text-color-rgb) / 0.7)",
            },
            accent: {
              DEFAULT: "rgb(var(--border-color-rgb) / <alpha-value>)",
              foreground: "rgb(var(--text-color-rgb) / <alpha-value>)",
            },
            card: {
              DEFAULT: "rgb(var(--background-color-rgb) / <alpha-value>)",
              foreground: "rgb(var(--text-color-rgb) / <alpha-value>)",
            },
            popover: {
              DEFAULT: "rgb(var(--background-color-rgb) / <alpha-value>)",
              foreground: "rgb(var(--text-color-rgb) / <alpha-value>)",
            },
          },
          borderRadius: {
            lg: "0.5rem",
            md: "calc(0.5rem - 2px)",
            sm: "calc(0.5rem - 4px)",
          },
        }
      }
    }
  </script>
</head>
<body class="bg-background text-foreground min-h-screen">
  <div id="app">
    <div style="padding: 20px; text-align: center;">
      <h2>Loading Documentation...</h2>
      <p>If this message persists, check the browser console for errors.</p>
    </div>
  </div>

  <!-- React 18 script tags - using development version for better error messages -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

  <script>
    // Verify React is loaded correctly before loading app scripts
    if (!window.React || !window.ReactDOM) {
      console.error('React or ReactDOM failed to load');
      document.getElementById('app').innerHTML = '<div style="color:red; padding:20px;"><h2>Error: React libraries not loaded</h2><p>Check your network connection and try again.</p></div>';
    } else {
      console.log('React loaded successfully, version:', React.version);
      console.log('ReactDOM loaded successfully');

      // Load app scripts only if React loaded properly
      const dataScript = document.createElement('script');
      dataScript.src = 'data.js';
      dataScript.onload = function() {
        console.log('data.js loaded');
        const mainScript = document.createElement('script');
        mainScript.src = 'main.js';
        mainScript.onload = function() {
          console.log('main.js loaded');
        };
        mainScript.onerror = function() {
          console.error('Failed to load main.js');
          document.getElementById('app').innerHTML = '<div style="color:red; padding:20px;"><h2>Error: Failed to load application code</h2><p>The main.js file could not be loaded. Try refreshing the page.</p></div>';
        };
        document.body.appendChild(mainScript);
      };
      dataScript.onerror = function() {
        console.error('Failed to load data.js');
        document.getElementById('app').innerHTML = '<div style="color:red; padding:20px;"><h2>Error: Failed to load component data</h2><p>The data.js file could not be loaded. Try refreshing the page.</p></div>';
      };
      document.body.appendChild(dataScript);
    }
  </script>
</body>
</html>`;

  await fs.writeFile(indexHtmlPath, html);
}

/**
 * Generate styles.css file
 */
async function generateStyles(
  stylesPath: string,
  theme: string
): Promise<void> {
  const css = `
:root {
  --primary-color: #0070f3;
  --primary-color-rgb: 0, 112, 243;
  --secondary-color: #0366d6;
  --secondary-color-rgb: 3, 102, 214;
  --background-color: #ffffff;
  --background-color-rgb: 255, 255, 255;
  --text-color: #333333;
  --text-color-rgb: 51, 51, 51;
  --border-color: #e1e4e8;
  --border-color-rgb: 225, 228, 232;
  --sidebar-bg: #f6f8fa;
  --code-bg: #f6f8fa;
  --header-bg: #ffffff;
  --hover-color: #f6f8fa;
  --warning-bg: #fff8e6;
  --warning-border: #f0d58c;
  --warning-text: #735c0f;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

[data-theme="dark"] {
  --primary-color: #58a6ff;
  --primary-color-rgb: 88, 166, 255;
  --secondary-color: #1f6feb;
  --secondary-color-rgb: 31, 111, 235;
  --background-color: #0d1117;
  --background-color-rgb: 13, 17, 23;
  --text-color: #c9d1d9;
  --text-color-rgb: 201, 209, 217;
  --border-color: #30363d;
  --border-color-rgb: 48, 54, 61;
  --sidebar-bg: #161b22;
  --code-bg: #161b22;
  --header-bg: #161b22;
  --hover-color: #1f2937;
  --warning-bg: #3d2e08;
  --warning-border: #5b4708;
  --warning-text: #e5c55b;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: var(--font-family);
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-color);
  background-color: var(--background-color);
  height: 100%;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* App Layout */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: var(--header-bg);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.app-actions {
  display: flex;
  gap: 1rem;
}

.search-box input {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  width: 250px;
}

.theme-toggle button {
  padding: 0.5rem 1rem;
  background-color: var(--code-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
}

.app-content {
  flex: 1;
  padding: 2rem;
}

.app-footer {
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--text-color);
  opacity: 0.8;
}

/* Tabs */
.tabs {
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 1rem;
  opacity: 0.7;
}

.tab-button.active {
  border-bottom: 2px solid var(--primary-color);
  opacity: 1;
  font-weight: 600;
}

/* Component Grid */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.component-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: var(--background-color);
  transition: all 0.2s;
  cursor: pointer;
}

.component-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.component-card.has-similarities {
  border-left: 3px solid #ff9900;
}

.component-name {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.similarity-indicator {
  color: #ff9900;
  font-weight: bold;
}

.component-description {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.component-meta {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-item.warning {
  color: #ff9900;
  font-weight: 500;
}

/* Component Details */
.component-details {
  background-color: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 2rem;
}

.details-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.back-button {
  padding: 0.5rem 1rem;
  background-color: var(--code-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.component-title {
  font-size: 1.75rem;
  font-weight: 600;
}

.component-filepath {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-color);
  opacity: 0.8;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.component-section {
  margin-bottom: 2.5rem;
}

.component-section h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}

/* Props Table */
.props-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.props-table th,
.props-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.props-table th {
  font-weight: 600;
  background-color: var(--sidebar-bg);
}

.prop-name {
  font-weight: 600;
}

.prop-type code {
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.prop-default code {
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

/* Methods */
.methods-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.method {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1.25rem;
  background-color: var(--background-color);
}

.method.has-similarities {
  border-left: 3px solid #ff9900;
}

.method-header {
  margin-bottom: 1rem;
}

.method-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.method-similarity-badge {
  background-color: #ff9900;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.method-signature {
  font-family: monospace;
  background-color: var(--code-bg);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.method-description {
  margin-bottom: 1rem;
}

.method-code {
  margin-top: 1rem;
  background-color: var(--code-bg);
  border-radius: 4px;
  padding: 1rem;
  font-size: 0.9rem;
  overflow-x: auto;
}

/* Similarity Warnings */
.method-similarities {
  background-color: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: 4px;
  padding: 1rem;
  margin: 1rem 0;
}

.method-similarities h5 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--warning-text);
}

.similarity-item {
  margin-bottom: 0.75rem;
}

.similarity-warning {
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 0.75rem;
}

.similarity-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.similarity-badge {
  background-color: #ff9900;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.similarity-name {
  font-weight: 600;
  font-family: monospace;
}

.similarity-reason {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.similarity-file {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Source Code */
.source-code {
  background-color: var(--code-bg);
  border-radius: 4px;
  padding: 1rem;
  max-height: 500px;
  overflow: auto;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Similarity Graph */
.similarity-graph {
  margin-top: 1rem;
}

.graph-container {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  height: 600px;
  overflow: hidden;
}

.graph-legend {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-color {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.node circle {
  stroke: #fff;
  stroke-width: 1.5px;
}

.node text {
  pointer-events: none;
  user-select: none;
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
}

/* Empty states */
.no-results, .no-data, .empty-graph {
  text-align: center;
  padding: 3rem;
  color: var(--text-color);
  opacity: 0.7;
  font-size: 1.1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .app-actions {
    width: 100%;
  }

  .search-box input {
    width: 100%;
  }

  .components-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .component-details {
    padding: 1.5rem;
  }
}

/* Similarity Modal */
.similarity-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.similarity-modal-content {
  background-color: var(--background-color);
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  position: relative;
  padding: 2rem;
  transition: all 0.3s ease;
}

.similarity-modal-content.expanded {
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
}

.similarity-modal-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.expand-button {
  margin-right: 0.5rem;
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.close-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
}

.similarity-modal-score {
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  font-weight: bold;
}

.similarity-code-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.code-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.code-panel h4 {
  margin: 0;
  padding: 0.75rem 1rem;
  background-color: var(--code-bg);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.code-block {
  margin: 0;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
  font-size: 0.85rem;
  background-color: var(--code-bg);
  white-space: pre-wrap;
  font-family: monospace;
}

.similarity-modal-content.expanded .code-block {
  max-height: 600px;
}

/* Similarity List */
.similarity-graph-container {
  padding: 20px;
}

.similarity-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.similarity-card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.similarity-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.similarity-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.similarity-score {
  background-color: var(--accent-color);
  color: white;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 12px;
  margin-right: 10px;
  font-size: 14px;
}

.similarity-title {
  font-weight: bold;
  flex: 1;
}

.similarity-details {
  font-size: 14px;
  color: var(--muted-text);
}

.similarity-source {
  margin-bottom: 5px;
  font-style: italic;
}

.similarity-reason {
  padding-top: 5px;
}

/* Chat UI Styles */
.chat-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

/* Chat Bubble */
.chat-bubble {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: linear-gradient(135deg, var(--primary-color), #4361ee);
  color: white;
  border-radius: 50px;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  z-index: 9999;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  font-weight: bold;
  font-size: 17px;
}

.chat-bubble:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.chat-bubble-icon {
  font-size: 24px;
}

/* Chat Widget */
.chat-widget {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 450px;
  height: 650px;
  background-color: var(--background-color);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--primary-color), #4361ee);
  color: white;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 5px 8px;
  line-height: 1;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.welcome-message {
  text-align: center;
  padding: 20px;
  opacity: 0.7;
  font-style: italic;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--background-color);
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background-color: rgba(var(--background-color-rgb), 0.98);
}

.chat-message {
  max-width: 85%;
  padding: 0.9rem 1.2rem;
  border-radius: 12px;
  line-height: 1.5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.chat-message:hover {
  transform: translateY(-2px);
}

.user-message {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--primary-color), #4361ee);
  color: white;
}

.assistant-message {
  align-self: flex-start;
  background-color: var(--code-bg);
  border: 1px solid var(--border-color);
}

.message-content {
  word-break: break-word;
}

.message-content.loading {
  opacity: 0.6;
  font-style: italic;
}

.message-content p {
  margin: 0 0 0.5rem 0;
}

.message-content p:last-child {
  margin-bottom: 0;
}

.message-content code {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.message-content pre {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.chat-input {
  display: flex;
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-color);
}

.chat-input input {
  flex: 1;
  padding: 14px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--background-color);
  color: var(--text-color);
  margin-right: 10px;
  font-size: 15px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.chat-input input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.25);
}

.chat-input button {
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--primary-color), #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.chat-input button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.chat-input button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-results {
  margin-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.search-result {
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--code-bg);
  border-bottom: 1px solid var(--border-color);
}

.result-header h4 {
  margin: 0;
  font-size: 1rem;
}

.similarity-score {
  font-size: 0.8rem;
  background-color: var(--primary-color);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
}

.result-path {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  opacity: 0.7;
  background-color: var(--code-bg);
  border-bottom: 1px solid var(--border-color);
}

.result-code {
  margin: 0;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.9rem;
  background-color: var(--background-color);
}

.similarity-controls {
  background-color: var(--code-bg);
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.similarity-slider {
  width: 100%;
  height: 10px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  outline: none;
  border-radius: 5px;
}

.similarity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.similarity-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

/* Resolve button conflict issue */
.similarity-modal .close-button,
.similarity-modal .expand-button {
  position: static; /* Override any absolute positioning */
  float: none;
  display: inline-block;
  margin-left: 0.5rem;
  z-index: 10;
}

.similarity-modal .close-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
}

.compare-button-container {
  margin-top: 0.75rem;
  text-align: right;
}

.compare-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.compare-button:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.similarity-warning {
  cursor: pointer;
  transition: all 0.2s;
}

.similarity-warning:hover {
  background-color: rgba(255, 255, 255, 0.7);
}

/* Method cards and details */
.method-card {
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.method-card.has-warnings {
  border-color: var(--warning-border);
}

.method-header {
  padding: 1rem;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.method-controls {
  display: flex;
  gap: 0.5rem;
}

.methods-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.generate-all-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s, transform 0.2s;
}

.generate-all-btn:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.generate-description-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}

.generate-description-btn:hover {
  background-color: var(--secondary-color);
}

.method-ai-description {
  padding: 1rem;
  background-color: rgba(var(--primary-color-rgb), 0.05);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.95rem;
  line-height: 1.5;
}

.method-ai-description p {
  margin: 0.5rem 0;
}

.method-ai-description h1,
.method-ai-description h2,
.method-ai-description h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.method-ai-description code {
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.9em;
}

.method-ai-description pre code {
  display: block;
  padding: 0.75rem;
  overflow: auto;
}
`;

  await fs.writeFile(stylesPath, css);
}

/**
 * Generate main.js file
 */
async function generateMainJs(mainJsPath: string): Promise<void> {
  const jsContent = `
// Main React application for documentation
console.log('Initializing React application...');

// Ensure React and ReactDOM are loaded
if (!window.React || !window.ReactDOM) {
  const errorMessage = !window.React ? 'React not loaded' : 'ReactDOM not loaded';
  console.error(errorMessage + '. Cannot initialize application.');
  document.getElementById('app').innerHTML = '<div style="color:red; padding:20px;"><h2>Error: ' + errorMessage + '</h2><p>Check your network connection and reload the page.</p></div>';
  throw new Error(errorMessage);
}

// Access React hooks and features
const { useState, useEffect, Fragment, useMemo, useRef, createContext, useContext } = React;
const ReactDOM = window.ReactDOM;

// Common utility for merging classNames
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Import shadcn components
const { Button, buttonVariants } = (() => {
  // Implementation from button.tsx
  const buttonVariants = (options) => {
    const { variant = 'default', size = 'default', className = '' } = options || {};

    // Base classes
    let classes = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    // Variant classes
    if (variant === 'default') classes += " bg-primary text-primary-foreground hover:bg-primary/90";
    else if (variant === 'destructive') classes += " bg-destructive text-destructive-foreground hover:bg-destructive/90";
    else if (variant === 'outline') classes += " border border-input bg-background hover:bg-accent hover:text-accent-foreground";
    else if (variant === 'secondary') classes += " bg-secondary text-secondary-foreground hover:bg-secondary/80";
    else if (variant === 'ghost') classes += " hover:bg-accent hover:text-accent-foreground";
    else if (variant === 'link') classes += " text-primary underline-offset-4 hover:underline";

    // Size classes
    if (size === 'default') classes += " h-10 px-4 py-2";
    else if (size === 'sm') classes += " h-9 rounded-md px-3";
    else if (size === 'lg') classes += " h-11 rounded-md px-8";
    else if (size === 'icon') classes += " h-10 w-10";

    return cn(classes, className);
  };

  const Button = ({ children, className, variant, size, onClick, ...props }) => {
    return React.createElement(
      'button',
      {
        className: buttonVariants({ variant, size, className }),
        onClick,
        ...props
      },
      children
    );
  };

  return { Button, buttonVariants };
})();

// Import shadcn card components
const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = (() => {
  const Card = ({ children, className, ...props }) =>
    React.createElement('div', {
      className: cn("rounded-lg border bg-card text-card-foreground shadow-sm", className),
      ...props
    }, children);

  const CardHeader = ({ children, className, ...props }) =>
    React.createElement('div', {
      className: cn("flex flex-col space-y-1.5 p-6", className),
      ...props
    }, children);

  const CardTitle = ({ children, className, ...props }) =>
    React.createElement('h3', {
      className: cn("text-2xl font-semibold leading-none tracking-tight", className),
      ...props
    }, children);

  const CardDescription = ({ children, className, ...props }) =>
    React.createElement('p', {
      className: cn("text-sm text-muted-foreground", className),
      ...props
    }, children);

  const CardContent = ({ children, className, ...props }) =>
    React.createElement('div', {
      className: cn("p-6 pt-0", className),
      ...props
    }, children);

  const CardFooter = ({ children, className, ...props }) =>
    React.createElement('div', {
      className: cn("flex items-center p-6 pt-0", className),
      ...props
    }, children);

  return { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
})();

// Import shadcn tabs components
const { Tabs, TabsList, TabsTrigger, TabsContent } = (() => {
  const Tabs = ({ children, value, onValueChange, defaultValue, className, ...props }) => {
    const [activeTab, setActiveTab] = useState(defaultValue || value);

    useEffect(() => {
      if (value !== undefined) {
        setActiveTab(value);
      }
    }, [value]);

    const handleValueChange = (newValue) => {
      setActiveTab(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    return React.createElement(
      'div',
      { className: cn("data-[state=active]:bg-muted", className), ...props },
      React.Children.map(children, child => {
        // Clone TabsList and TabsContent with needed props
        if (child.type === TabsList || child.type === TabsContent) {
          return React.cloneElement(child, { activeTab, onSelect: handleValueChange });
        }
        return child;
      })
    );
  };

  const TabsList = ({ children, activeTab, onSelect, className, ...props }) => {
    return React.createElement(
      'div',
      { className: cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className), ...props },
      React.Children.map(children, child => {
        if (child.type === TabsTrigger) {
          return React.cloneElement(child, { active: activeTab === child.props.value, onSelect });
        }
        return child;
      })
    );
  };

  const TabsTrigger = ({ children, value, active, onSelect, className, ...props }) => {
    return React.createElement(
      'button',
      {
        className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          active ? "bg-background text-foreground shadow-sm" : "hover:bg-background/30",
          className
        ),
        onClick: () => onSelect(value),
        ...props
      },
      children
    );
  };

  const TabsContent = ({ children, value, activeTab, className, ...props }) => {
    const isActive = activeTab === value;

    return React.createElement(
      'div',
      {
        className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isActive ? "block" : "hidden",
          className
        ),
        ...props
      },
      children
    );
  };

  return { Tabs, TabsList, TabsTrigger, TabsContent };
})();

// Import shadcn separator component
const Separator = ({ className, orientation = "horizontal", ...props }) => {
  return React.createElement(
    'div',
    {
      className: cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      ),
      ...props
    }
  );
};

// Import shadcn ScrollArea component
const { ScrollArea, ScrollBar } = (() => {
  const ScrollArea = ({ children, className, ...props }) => {
    return React.createElement(
      'div',
      {
        className: cn("relative overflow-hidden", className),
        ...props
      },
      [
        React.createElement('div', { className: "h-full w-full rounded-[inherit] overflow-y-auto", key: "viewport" }, children),
        React.createElement(ScrollBar, { orientation: "vertical", key: "scrollbar" })
      ]
    );
  };

  const ScrollBar = ({ orientation = "vertical", className, ...props }) => {
    return React.createElement(
      'div',
      {
        className: cn(
          "flex touch-none select-none transition-colors",
          orientation === "vertical" ? "h-full w-2.5 border-l border-l-transparent p-[1px]" : "h-2.5 flex-col border-t border-t-transparent p-[1px]",
          className
        ),
        ...props
      },
      React.createElement('div', { className: "relative flex-1 rounded-full bg-border" })
    );
  };

  return { ScrollArea, ScrollBar };
})();

// Import shadcn Avatar component
const { Avatar, AvatarImage, AvatarFallback } = (() => {
  const Avatar = ({ children, className, ...props }) => {
    return React.createElement(
      'div',
      {
        className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className),
        ...props
      },
      children
    );
  };

  const AvatarImage = ({ src, alt = "", className, ...props }) => {
    return React.createElement(
      'img',
      {
        src,
        alt,
        className: cn("aspect-square h-full w-full", className),
        ...props
      }
    );
  };

  const AvatarFallback = ({ children, className, ...props }) => {
    return React.createElement(
      'div',
      {
        className: cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className),
        ...props
      },
      children
    );
  };

  return { Avatar, AvatarImage, AvatarFallback };
})();

// Import shadcn Badge component
const Badge = ({ children, variant = "default", className, ...props }) => {
  return React.createElement(
    'div',
    {
      className: cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        variant === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
        variant === "outline" && "text-foreground",
        className
      ),
      ...props
    },
    children
  );
};

// Define custom components using the shadcn components
const ComponentCard = ({ component, onClick }) => {
  return React.createElement(
    Card,
    { className: 'w-full mb-4 hover:shadow-md transition-shadow' },
    [
      React.createElement(
        CardHeader,
        { className: 'pb-2', key: 'header' },
        [
          React.createElement(
            CardTitle,
            {
              className: 'text-xl flex items-center justify-between',
              key: 'title'
            },
            [
              component.name,
              React.createElement(
                Badge,
                {
                  variant: 'secondary',
                  key: 'badge'
                },
                component.type || 'Component'
              )
            ]
          ),
          component.description && React.createElement(
            CardDescription,
            { key: 'desc' },
            component.description
          )
        ]
      ),
      React.createElement(
        CardContent,
        { key: 'content' },
        component.props && component.props.length > 0 && React.createElement(
          'div',
          { className: 'mb-3', key: 'props' },
          [
            React.createElement('h4', { className: 'text-sm font-medium mb-1', key: 'props-title' },
              \`Props (\${component.props.length})\`
            ),
            React.createElement(
              'ul',
              { className: 'text-sm list-disc pl-5', key: 'props-list' },
              component.props.length > 0 ? [
                ...component.props.slice(0, 3).map((prop, index) =>
                  React.createElement(
                    'li',
                    { key: index, className: 'text-muted-foreground' },
                    prop.name + (prop.required ? ' *' : '')
                  )
                ),
                component.props.length > 3 && React.createElement(
                  'li',
                  { className: 'text-muted-foreground', key: 'more' },
                  \`+ \${component.props.length - 3} more\`
                )
              ] : []
            )
          ]
        )
      ),
      React.createElement(
        CardFooter,
        { key: 'footer' },
        React.createElement(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => onClick(component)
          },
          'View Details'
        )
      )
    ]
  );
};

// SidebarNav component
const SidebarNav = ({ components, onSelect, selectedComponent }) => {
  return React.createElement(
    ScrollArea,
    { className: 'h-[calc(100vh-8rem)]' },
    React.createElement(
      'div',
      { className: 'space-y-1 p-2' },
      components.map(component =>
        React.createElement(
          Button,
          {
            key: component.name,
            variant: selectedComponent?.name === component.name ? "secondary" : "ghost",
            className: "w-full justify-start text-left",
            onClick: () => onSelect(component)
          },
          component.name
        )
      )
    )
  );
};

// PropertyTable component
const PropertyTable = ({ properties }) => {
  if (!properties || properties.length === 0) {
    return React.createElement('p', { className: 'text-muted-foreground text-sm' }, 'No properties available');
  }

  return React.createElement(
    'div',
    { className: 'border rounded-md overflow-hidden' },
    React.createElement(
      'table',
      { className: 'min-w-full divide-y divide-border' },
      [
        React.createElement(
          'thead',
          { className: 'bg-muted/50', key: 'thead' },
          React.createElement(
            'tr',
            {},
            [
              React.createElement('th', { className: 'px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider', key: 'th-name' }, 'Name'),
              React.createElement('th', { className: 'px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider', key: 'th-type' }, 'Type'),
              React.createElement('th', { className: 'px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider', key: 'th-default' }, 'Default'),
              React.createElement('th', { className: 'px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider', key: 'th-desc' }, 'Description')
            ]
          )
        ),
        React.createElement(
          'tbody',
          { className: 'bg-card divide-y divide-border', key: 'tbody' },
          properties.map((prop, index) =>
            React.createElement(
              'tr',
              { key: index, className: index % 2 === 0 ? 'bg-muted/20' : 'bg-card' },
              [
                React.createElement(
                  'td',
                  { className: 'px-4 py-2 text-sm font-mono whitespace-nowrap', key: 'td-name' },
                  [
                    prop.name,
                    prop.required && React.createElement('span', { className: 'text-destructive ml-1', key: 'required' }, '*')
                  ]
                ),
                React.createElement('td', { className: 'px-4 py-2 text-sm font-mono', key: 'td-type' }, prop.type),
                React.createElement('td', { className: 'px-4 py-2 text-sm font-mono', key: 'td-default' }, prop.defaultValue || '-'),
                React.createElement('td', { className: 'px-4 py-2 text-sm', key: 'td-desc' }, prop.description || '-')
              ]
            )
          )
        )
      ]
    )
  );
};

// MethodDisplay component
const MethodDisplay = ({ method }) => {
  return React.createElement(
    Card,
    { className: 'mb-4' },
    [
      React.createElement(
        CardHeader,
        { className: 'pb-2', key: 'header' },
        [
          React.createElement(
            CardTitle,
            { className: 'text-lg font-mono', key: 'title' },
            \`\${method.name}()\`
          ),
          method.ai?.description && React.createElement(
            CardDescription,
            { key: 'desc' },
            method.ai.description
          )
        ]
      ),
      React.createElement(
        CardContent,
        { key: 'content' },
        method.code && React.createElement(
          'div',
          { className: 'rounded-md bg-muted p-4 my-2 overflow-auto' },
          React.createElement(
            'pre',
            { className: 'text-sm font-mono' },
            React.createElement('code', {}, method.code)
          )
        )
      )
    ]
  );
};

// ComponentDetail component
const ComponentDetail = ({ component }) => {
  return React.createElement(
    'div',
    { className: 'space-y-6' },
    [
      React.createElement(
        'div',
        { key: 'header' },
        [
          React.createElement('h1', { className: 'text-2xl font-bold', key: 'title' }, component.name),
          component.description && React.createElement('p', { className: 'text-muted-foreground mt-1', key: 'desc' }, component.description)
        ]
      ),
      component.ai?.summary && React.createElement(
        Card,
        { key: 'ai-summary' },
        [
          React.createElement(
            CardHeader,
            { key: 'ai-header' },
            React.createElement(CardTitle, {}, 'AI Summary')
          ),
          React.createElement(
            CardContent,
            { key: 'ai-content' },
            React.createElement('p', {}, component.ai.summary)
          )
        ]
      ),
      React.createElement(
        Tabs,
        { defaultValue: 'props', className: 'w-full', key: 'tabs' },
        [
          React.createElement(
            TabsList,
            { className: 'mb-4', key: 'tabs-list' },
            [
              React.createElement(TabsTrigger, { value: 'props', key: 'tab-props' }, 'Props'),
              React.createElement(TabsTrigger, { value: 'methods', key: 'tab-methods' }, 'Methods'),
              React.createElement(TabsTrigger, { value: 'children', key: 'tab-children' }, 'Child Components')
            ]
          ),
          React.createElement(
            TabsContent,
            { value: 'props', key: 'tab-content-props' },
            component.props && component.props.length > 0
              ? React.createElement(PropertyTable, { properties: component.props })
              : React.createElement('p', { className: 'text-muted-foreground' }, 'No props available')
          ),
          React.createElement(
            TabsContent,
            { value: 'methods', key: 'tab-content-methods' },
            component.methods && component.methods.length > 0
              ? React.createElement(
                  'div',
                  {},
                  component.methods.map((method, index) => React.createElement(MethodDisplay, { key: index, method }))
                )
              : React.createElement('p', { className: 'text-muted-foreground' }, 'No methods available')
          ),
          React.createElement(
            TabsContent,
            { value: 'children', key: 'tab-content-children' },
            component.childComponents && component.childComponents.length > 0
              ? React.createElement(
                  'div',
                  { className: 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
                  component.childComponents.map((child, index) => React.createElement(ComponentCard, { key: index, component: child, onClick: () => {} }))
                )
              : React.createElement('p', { className: 'text-muted-foreground' }, 'No child components available')
          )
        ]
      )
    ]
  );
};

// Main App component
function App() {
  const [components, setComponents] = useState(window.COMPONENT_DATA || []);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Highlight.js initialization
    if (window.hljs) {
      document.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  }, [selectedComponent]);

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components;
    const lowerQuery = searchQuery.toLowerCase();
    return components.filter(
      component =>
        component.name.toLowerCase().includes(lowerQuery) ||
        (component.description && component.description.toLowerCase().includes(lowerQuery))
    );
  }, [components, searchQuery]);

  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const handleSelectComponent = (component) => {
    setSelectedComponent(component);
    // On mobile, scroll to top when selecting a component
    if (window.innerWidth < 768) {
      window.scrollTo(0, 0);
    }
  };

  return React.createElement(
    'div',
    { className: 'flex flex-col min-h-screen' },
    [
      // Header
      React.createElement(
        'header',
        { className: 'border-b sticky top-0 z-40 bg-background', key: 'header' },
        React.createElement(
          'div',
          { className: 'container flex h-16 items-center justify-between py-4' },
          [
            React.createElement('h1', { className: 'text-2xl font-bold', key: 'title' }, 'React Component Documentation'),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2', key: 'controls' },
              [
                React.createElement(
                  'div',
                  { className: 'relative w-full md:w-60', key: 'search' },
                  React.createElement(
                    'input',
                    {
                      type: 'text',
                      placeholder: 'Search components...',
                      className: 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      value: searchQuery,
                      onChange: (e) => setSearchQuery(e.target.value)
                    }
                  )
                ),
                React.createElement(
                  Button,
                  {
                    variant: 'outline',
                    size: 'icon',
                    onClick: toggleDarkMode,
                    key: 'theme-toggle'
                  },
                  React.createElement(
                    'span',
                    { className: 'sr-only' },
                    'Toggle theme'
                  )
                )
              ]
            )
          ]
        )
      ),

      // Main content
      React.createElement(
        'div',
        { className: 'container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 py-6', key: 'main' },
        [
          // Sidebar
          React.createElement(
            'aside',
            { className: 'fixed top-20 z-30 -ml-2 hidden h-[calc(100vh-5rem)] w-full shrink-0 md:sticky md:block', key: 'sidebar' },
            [
              React.createElement('h2', { className: 'mb-2 px-4 text-lg font-semibold tracking-tight', key: 'sidebar-title' }, 'Components'),
              React.createElement(
                SidebarNav,
                {
                  components: filteredComponents,
                  onSelect: handleSelectComponent,
                  selectedComponent
                }
              )
            ]
          ),

          // Main content area
          React.createElement(
            'main',
            { className: 'relative', key: 'content' },
            selectedComponent
              ? React.createElement(ComponentDetail, { component: selectedComponent })
              : React.createElement(
                  'div',
                  { className: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' },
                  filteredComponents.map((component) =>
                    React.createElement(ComponentCard, {
                      key: component.name,
                      component,
                      onClick: handleSelectComponent
                    })
                  )
                )
          )
        ]
      ),

      // Footer
      React.createElement(
        'footer',
        { className: 'border-t py-6 md:py-0', key: 'footer' },
        React.createElement(
          'div',
          { className: 'container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row' },
          [
            React.createElement(
              'p',
              { className: 'text-center text-sm leading-loose text-muted-foreground md:text-left', key: 'copyright' },
              'Built with Recursive React Docs AI. © ' + new Date().getFullYear()
            ),
            React.createElement(
              'div',
              { className: 'flex items-center gap-4', key: 'links' },
              React.createElement(
                'a',
                { href: 'https://github.com', className: 'text-sm text-muted-foreground underline-offset-4 hover:underline' },
                'GitHub'
              )
            )
          ]
        )
      )
    ]
  );
}

// Render the application
try {
  const rootElement = document.getElementById('app');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(React.createElement(App));
  } else {
    console.error('Root element #app not found');
  }
} catch (error) {
  console.error('Error rendering application:', error);
  document.getElementById('app').innerHTML =
    '<div style="color:red; padding:20px;">' +
    '<h2>Error Rendering Application</h2>' +
    '<p>' + (error.message || 'Unknown error') + '</p>' +
    '</div>';
}
`;

  await fs.writeFile(mainJsPath, jsContent);
}
