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
  const componentData = JSON.stringify(components, null, 2);

  const dataJs = `// Auto-generated component data
window.COMPONENT_DATA = ${componentData};`;

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
<html lang="en" data-theme="${theme}">
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
  <!-- React 18 script tags - using production version -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="app"></div>

  <script src="data.js"></script>
  <script src="main.js"></script>
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
const { useState, useEffect, Fragment, useMemo, useRef } = React;

// Component to visualize similarity between functions
function SimilarityGraph(props) {
  const components = props.components;
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);
  const allSimilarities = useMemo(() => {
    // Collect all similarity warnings
    const similarities = [];

    components.forEach(component => {
      if (component.methods) {
        component.methods.forEach(method => {
          if (method.similarityWarnings && method.similarityWarnings.length > 0) {
            method.similarityWarnings.forEach(warning => {
              similarities.push({
                sourceComponent: component.name,
                sourceMethod: method.name,
                sourceCode: method.code || '',
                targetName: warning.similarTo,
                targetCode: warning.code || '',
                filePath: warning.filePath,
                score: warning.score,
                reason: warning.reason
              });
            });
          }
        });
      }
    });

    // Sort by similarity score (highest first)
    return similarities.sort((a, b) => b.score - a.score);
  }, [components]);

  // Filter to show only similarities above the threshold
  const displayedSimilarities = allSimilarities.filter(sim => sim.score >= similarityThreshold);

  const handleThresholdChange = (e) => {
    setSimilarityThreshold(parseFloat(e.target.value));
  };

  if (allSimilarities.length === 0) {
    return React.createElement("div", { className: "no-similarities" }, "No similar methods found");
  }

  return React.createElement(
    "div",
    { className: "similarity-graph-container" },
    React.createElement("h3", null, "Method Similarity Analysis"),
    React.createElement(
      "div",
      { className: "similarity-controls" },
      React.createElement(
        "label",
        { htmlFor: "similarity-threshold" },
        "Similarity Threshold: ", Math.round(similarityThreshold * 100) + "%"
      ),
      React.createElement("input", {
        id: "similarity-threshold",
        type: "range",
        min: "0.5",
        max: "1",
        step: "0.05",
        value: similarityThreshold,
        onChange: handleThresholdChange,
        className: "similarity-slider"
      })
    ),
    React.createElement("p", null, "Showing ", displayedSimilarities.length, " of ", allSimilarities.length, " method similarities"),
    React.createElement(
      "div",
      { className: "similarity-list" },
      displayedSimilarities.map((similarity, index) =>
        React.createElement(
          "div",
          {
            key: "sim-" + index,
            className: "similarity-card",
            onClick: () => props.onSelectSimilarity && props.onSelectSimilarity(similarity)
          },
          React.createElement(
            "div",
            { className: "similarity-header" },
            React.createElement(
              "span",
              { className: "similarity-score" },
              Math.round(similarity.score * 100) + "%"
            ),
            React.createElement(
              "span",
              { className: "similarity-title" },
              similarity.sourceComponent + "." + similarity.sourceMethod + " ↔ " + similarity.targetName
            )
          ),
          React.createElement(
            "div",
            { className: "similarity-details" },
            React.createElement(
              "div",
              { className: "similarity-source" },
              "From: " + similarity.filePath
            ),
            React.createElement(
              "div",
              { className: "similarity-reason" },
              similarity.reason
            )
          )
        )
      )
    )
  );
}

// Chat interface component
function CodebaseChat({ components }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Format the history for the API call
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Make API call to the chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: messageHistory,
          query: userMessage.content
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      const data = await response.json();

      // Add assistant message with the response
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: data.response }
      ]);

      // Update search results
      setSearchResults(data.searchResults || []);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message, index) => {
    return React.createElement(
      'div',
      {
        key: index,
        className: \`chat-message \${message.role === 'user' ? 'user-message' : 'assistant-message'}\`
      },
      React.createElement(
        'div',
        { className: 'message-content' },
        message.role === 'assistant'
          ? React.createElement('div', { dangerouslySetInnerHTML: { __html: marked.parse(message.content) } })
          : message.content
      )
    );
  };

  const renderSearchResult = (result, index) => {
    return React.createElement(
      'div',
      { key: index, className: 'search-result' },
      React.createElement(
        'div',
        { className: 'result-header' },
        React.createElement('h4', null,
          result.componentName + (result.methodName ? \`.\${result.methodName}\` : '')
        ),
        React.createElement('span', { className: 'similarity-score' },
          Math.round(result.similarity * 100) + '% Match'
        )
      ),
      React.createElement('div', { className: 'result-path' }, result.filePath),
      React.createElement(
        'pre',
        { className: 'result-code' },
        React.createElement('code', null, result.code)
      )
    );
  };

  // Render the chat bubble button when closed
  if (!isOpen) {
    return React.createElement(
      'div',
      { className: 'chat-bubble', onClick: () => setIsOpen(true) },
      React.createElement('span', { className: 'chat-bubble-icon' }, '💬'),
      React.createElement('span', { className: 'chat-bubble-text' }, 'Ask AI')
    );
  }

  // Render the chat interface when open
  return React.createElement(
    'div',
    { className: 'chat-widget' },
    React.createElement(
      'div',
      { className: 'chat-header' },
      React.createElement('h3', null, 'AI Code Assistant'),
      React.createElement(
        'button',
        { className: 'close-button', onClick: () => setIsOpen(false) },
        '✕'
      )
    ),
    React.createElement(
      'div',
      { className: 'chat-messages' },
      messages.length === 0 && React.createElement(
        'div',
        { className: 'welcome-message' },
        'Ask me anything about the codebase!'
      ),
      messages.map(renderMessage),
      isLoading && React.createElement(
        'div',
        { className: 'chat-message assistant-message' },
        React.createElement('div', { className: 'message-content loading' }, 'Thinking...')
      ),
      React.createElement('div', { ref: messagesEndRef })
    ),
    React.createElement(
      'form',
      { className: 'chat-input', onSubmit: handleSubmit },
      React.createElement('input', {
        type: 'text',
        placeholder: 'Ask a question about the codebase...',
        value: inputValue,
        onChange: (e) => setInputValue(e.target.value),
        disabled: isLoading
      }),
      React.createElement(
        'button',
        { type: 'submit', disabled: isLoading },
        'Send'
      )
    ),
    searchResults.length > 0 && React.createElement(
      'div',
      { className: 'search-results' },
      React.createElement('h3', null, 'Relevant Code'),
      searchResults.map(renderSearchResult)
    )
  );
}

function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('components');
  const [selectedSimilarity, setSelectedSimilarity] = useState(null);
  const [expandedView, setExpandedView] = useState(false);

  useEffect(() => {
    // Initialize with component data
    console.log("Mounting App component");
    if (window.COMPONENT_DATA) {
      console.log("Found component data:", window.COMPONENT_DATA.length, "components");
      setComponents(window.COMPONENT_DATA);
    } else {
      console.error("No component data found - window.COMPONENT_DATA is undefined");
    }
  }, []);

  // Function to render similarity modal for both views
  const renderSimilarityModal = (similarityData) => {
    return React.createElement(
      "div",
      { className: "similarity-modal" },
      React.createElement(
        "div",
        {
          className: "similarity-modal-content" + (expandedView ? " expanded" : "")
        },
        React.createElement(
          "div",
          { className: "similarity-modal-header" },
          React.createElement(
            "button",
            {
              className: "expand-button",
              onClick: () => setExpandedView(!expandedView)
            },
            expandedView ? "Collapse" : "Expand"
          ),
          React.createElement(
            "button",
            {
              className: "close-button",
              onClick: () => {
                setSelectedSimilarity(null);
                setExpandedView(false);
              }
            },
            "✕"
          )
        ),
        React.createElement("h3", null, "Similarity Details"),
        React.createElement(
          "div",
          { className: "similarity-modal-score" },
          Math.round(similarityData.score * 100) + "% Similar"
        ),
        React.createElement(
          "div",
          { className: "similarity-code-comparison" },
          React.createElement(
            "div",
            { className: "code-panel" },
            React.createElement(
              "h4",
              null,
              similarityData.sourceComponent + "." + similarityData.sourceMethod
            ),
            React.createElement(
              "pre",
              { className: "code-block" },
              similarityData.sourceCode
            )
          ),
          React.createElement(
            "div",
            { className: "code-panel" },
            React.createElement(
              "h4",
              null,
              similarityData.targetName
            ),
            React.createElement(
              "pre",
              { className: "code-block" },
              similarityData.targetCode
            )
          )
        )
      )
    );
  }

  // Filter components based on search term
  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to render a similarity warning with enhanced functionality
  const renderSimilarityWarning = (warning, sourceComponent, sourceMethod, sourceCode) => {
    const similarityData = {
      sourceComponent: sourceComponent,
      sourceMethod: sourceMethod,
      sourceCode: sourceCode || "",
      targetName: warning.similarTo,
      targetCode: warning.code || "",
      filePath: warning.filePath,
      score: warning.score,
      reason: warning.reason
    };

    return React.createElement(
      "div",
      {
        className: "similarity-warning",
        onClick: (e) => {
          e.stopPropagation();
          setSelectedSimilarity(similarityData);
        }
      },
      React.createElement(
        "div",
        { className: "similarity-header" },
        React.createElement(
          "span",
          { className: "similarity-badge" },
          Math.round(warning.score * 100) + "% Similar"
        ),
        React.createElement(
          "span",
          { className: "similarity-name" },
          warning.similarTo
        )
      ),
      React.createElement("div", { className: "similarity-reason" }, warning.reason),
      React.createElement("div", { className: "similarity-file" }, warning.filePath),
      React.createElement(
        "div",
        { className: "compare-button-container" },
        React.createElement(
          "button",
          {
            className: "compare-button",
            onClick: (e) => {
              e.stopPropagation();
              setSelectedSimilarity(similarityData);
            }
          },
          "Compare Code"
        )
      )
    );
  };

  // Function to render a method
  const renderMethod = (method, componentName) => {
    // Skip methods with no code
    if (!method.code || method.code.trim() === '') {
      return null;
    }

    const hasSimilarities = method.similarityWarnings && method.similarityWarnings.length > 0;

    return React.createElement(
      'div',
      {
        className: 'method-card' + (hasSimilarities ? ' has-warnings' : ''),
        'data-method': method.name,
        'data-component': componentName
      },
      React.createElement(
        'div',
        { className: 'method-header' },
        React.createElement('h3', null, method.name),
        React.createElement(
          'div',
          { className: 'method-controls' },
          React.createElement(
            'button',
            {
              className: 'generate-description-btn',
              onClick: (e) => {
                e.preventDefault();
                // Define an inner function that has access to the correct component and method
                (async () => {
                  try {
                    // Show a loading indicator
                    const methodElement = e.currentTarget.closest('.method-card');
                    let descriptionEl = methodElement.querySelector('.method-ai-description');

                    if (!descriptionEl) {
                      descriptionEl = document.createElement('div');
                      descriptionEl.className = 'method-ai-description';
                      methodElement.querySelector('.method-header').after(descriptionEl);
                    }

                    descriptionEl.innerHTML = 'Generating description...';

                    const response = await fetch('/api/chat', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        history: [],
                        query: "Generate a concise, technical description of this " + componentName + "." + method.name + " method: \\n\\n" + method.code
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to generate description');
                    }

                    const data = await response.json();

                    // Use the marked library to parse markdown
                    descriptionEl.innerHTML = window.marked.parse(data.response);
                  } catch (error) {
                    console.error('Error generating description:', error);
                    alert('Failed to generate description. Please try again later.');
                  }
                })();
              }
            },
            '✨ Generate Description'
          )
        )
      ),
      method.description && React.createElement(
        "div",
        { className: "method-description" },
        method.description
      ),
      hasSimilarities && React.createElement(
        "div",
        { className: "method-similarities" },
        React.createElement("h5", null, "Similar Methods:"),
        method.similarityWarnings.map((warning, i) => React.createElement(
          "div",
          { key: "similarity-" + i, className: "similarity-item" },
          renderSimilarityWarning(warning, componentName, method.name, method.code)
        ))
      ),
      method.code && React.createElement(
        "pre",
        { className: "method-code" },
        React.createElement("code", { className: "language-javascript" }, method.code)
      )
    );
  };

  // Function to render a component
  const renderComponent = (component) => {
    const hasMethodsWithSimilarities = component.methods &&
      component.methods.some(m => m.similarityWarnings && m.similarityWarnings.length > 0);

    return React.createElement(
      "div",
      {
        className: "component-card " + (hasMethodsWithSimilarities ? "has-similarities" : ""),
        key: component.name,
        onClick: () => setSelectedComponent(component)
      },
      React.createElement(
        "h3",
        { className: "component-name" },
        component.name,
        hasMethodsWithSimilarities && React.createElement(
          "span",
          {
            className: "similarity-indicator",
            title: "Contains similar methods"
          },
          "⚠"
        )
      ),
      component.description && React.createElement(
        "p",
        { className: "component-description" },
        component.description
      ),
      React.createElement(
        "div",
        { className: "component-meta" },
        React.createElement(
          "span",
          { className: "meta-item" },
          "Props: ",
          React.createElement("strong", null, component.props.length)
        ),
        React.createElement(
          "span",
          { className: "meta-item" },
          "Methods: ",
          React.createElement("strong", null, component.methods ? component.methods.length : 0)
        ),
        hasMethodsWithSimilarities && React.createElement(
          "span",
          { className: "meta-item warning" },
          "Similar Methods Found"
        )
      )
    );
  };

  // Render component details
  const renderComponentDetails = (component) => React.createElement(
    "div",
    { className: "component-details" },
    React.createElement(
      "div",
      { className: "details-header" },
      React.createElement(
        "button",
        {
          className: "back-button",
          onClick: () => setSelectedComponent(null)
        },
        "← Back to Components"
      ),
      React.createElement("h2", { className: "component-title" }, component.name)
    ),
    component.description && React.createElement(
      "div",
      { className: "component-description" },
      React.createElement("p", null, component.description)
    ),
    React.createElement(
      "div",
      { className: "component-filepath" },
      React.createElement("strong", null, "File:"),
      " " + component.filePath
    ),
    component.props.length > 0 && React.createElement(
      "div",
      { className: "component-section" },
      React.createElement("h3", null, "Props"),
      React.createElement(
        "table",
        { className: "props-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", null, "Name"),
            React.createElement("th", null, "Type"),
            React.createElement("th", null, "Required"),
            React.createElement("th", null, "Default"),
            React.createElement("th", null, "Description")
          )
        ),
        React.createElement(
          "tbody",
          null,
          component.props.map(prop => React.createElement(
            "tr",
            { key: prop.name },
            React.createElement("td", { className: "prop-name" }, prop.name),
            React.createElement(
              "td",
              { className: "prop-type" },
              React.createElement("code", null, prop.type)
            ),
            React.createElement("td", { className: "prop-required" }, prop.required ? "✓" : ""),
            React.createElement(
              "td",
              { className: "prop-default" },
              prop.defaultValue !== undefined ? React.createElement("code", null, String(prop.defaultValue)) : ""
            ),
            React.createElement("td", { className: "prop-description" }, prop.description || "")
          ))
        )
      )
    ),
    component.methods && component.methods.length > 0 && React.createElement(
      "div",
      { className: "component-section" },
      React.createElement(
        "div",
        { className: "methods-header" },
        React.createElement("h3", null, "Methods"),
        React.createElement(
          "button",
          {
            className: "generate-all-btn",
            onClick: async () => {
              if (!component.methods || component.methods.length === 0) return;

              // Get all method elements
              const methodCards = document.querySelectorAll('.method-card');

              for (const methodCard of methodCards) {
                // Extract method name and component name from data attributes
                const methodName = methodCard.getAttribute('data-method');
                const componentName = methodCard.getAttribute('data-component');

                if (!methodName || !componentName) continue;

                // Find the method in the component's methods array
                const method = component.methods.find(m => m.name === methodName);
                if (!method || !method.code) continue;

                try {
                  // Show a loading indicator
                  let descriptionEl = methodCard.querySelector('.method-ai-description');
                  if (!descriptionEl) {
                    descriptionEl = document.createElement('div');
                    descriptionEl.className = 'method-ai-description';
                    methodCard.querySelector('.method-header').after(descriptionEl);
                  }
                  descriptionEl.innerHTML = 'Generating description...';

                  // Make API call
                  const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      history: [],
                      query: "Generate a concise, technical description of this " + componentName + "." + methodName + " method: \\n\\n" + method.code
                    }),
                  });

                  if (!response.ok) {
                    throw new Error('Failed to generate description');
                  }

                  const data = await response.json();

                  // Update the description with the result
                  descriptionEl.innerHTML = window.marked.parse(data.response);
                } catch (error) {
                  console.error("Error generating description for " + methodName + ":", error);
                  // Show error in the description element if it exists
                  const descriptionEl = methodCard.querySelector('.method-ai-description');
                  if (descriptionEl) {
                    descriptionEl.innerHTML = 'Error generating description. Please try again.';
                  }
                }

                // Add a small delay between requests to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          },
          "✨ Generate All Descriptions"
        )
      ),
      React.createElement(
        "div",
        { className: "methods-list" },
        component.methods.map(method => renderMethod(method, component.name))
      )
    ),
    component.sourceCode && React.createElement(
      "div",
      { className: "component-section" },
      React.createElement("h3", null, "Source Code"),
      React.createElement(
        "pre",
        { className: "source-code" },
        React.createElement("code", { className: "language-javascript" }, component.sourceCode)
      )
    )
  );

  // Render the main app
  return React.createElement(
    "div",
    { className: "app-container" },
    React.createElement(
      "header",
      { className: "app-header" },
      React.createElement("h1", { className: "app-title" }, "React Component Documentation"),
      React.createElement(
        "div",
        { className: "app-actions" },
        React.createElement(
          "div",
          { className: "search-box" },
          React.createElement("input", {
            type: "text",
            placeholder: "Search components...",
            value: searchTerm,
            onChange: e => setSearchTerm(e.target.value)
          })
        ),
        React.createElement(
          "div",
          { className: "theme-toggle" },
          React.createElement(
            "button",
            {
              onClick: () => document.documentElement.setAttribute(
                'data-theme',
                document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
              )
            },
            "Toggle Theme"
          )
        )
      )
    ),
    React.createElement(
      "div",
      { className: "app-content" },
      selectedComponent ? renderComponentDetails(selectedComponent) : React.createElement(
        Fragment,
        null,
        React.createElement(
          "div",
          { className: "tabs" },
          React.createElement(
            "button",
            {
              className: "tab-button " + (activeTab === 'components' ? 'active' : ''),
              onClick: () => setActiveTab('components')
            },
            "Components"
          ),
          React.createElement(
            "button",
            {
              className: "tab-button " + (activeTab === 'similarities' ? 'active' : ''),
              onClick: () => setActiveTab('similarities')
            },
            "Function Similarities"
          )
        ),
        activeTab === 'components' ? React.createElement(
          "div",
          { className: "components-grid" },
          filteredComponents.length > 0 ? filteredComponents.map(component => renderComponent(component)) :
            React.createElement("div", { className: "no-results" }, "No components found")
        ) : React.createElement(
          "div",
          { className: "similarities-view" },
          React.createElement(SimilarityGraph, { components: components, onSelectSimilarity: setSelectedSimilarity })
        )
      )
    ),
    // Show modal if a similarity is selected
    selectedSimilarity && renderSimilarityModal(selectedSimilarity),
    React.createElement(
      "footer",
      { className: "app-footer" },
      React.createElement("p", null, "Generated with Recursive React Docs AI")
    ),
    // Add the floating chat bubble
    React.createElement(CodebaseChat, { components: components })
  );
}

// Wait for DOM to be ready before rendering
document.addEventListener('DOMContentLoaded', function() {
  // For React 18
  try {
    const root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(
      React.createElement(React.StrictMode, null,
        React.createElement(App, null)
      )
    );
    console.log("React app mounted with createRoot");
  } catch (e) {
    console.error("Error using createRoot:", e);

    // Fallback to React 17 method
    try {
      ReactDOM.render(
        React.createElement(React.StrictMode, null,
          React.createElement(App, null)
        ),
        document.getElementById('app')
      );
      console.log("React app mounted with ReactDOM.render");
    } catch (e) {
      console.error("React rendering failed:", e);
      document.getElementById('app').innerHTML = '<div class="error"><h1>Error Loading Documentation</h1><p>Check the console for details.</p></div>';
    }
  }

  // Initialize syntax highlighting
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });

  // Add tooltip functionality
  const addTooltips = () => {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      element.addEventListener('mouseenter', function() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = this.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);

        const rect = this.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';

        this.addEventListener('mouseleave', function() {
          document.body.removeChild(tooltip);
        }, { once: true });
      });
    });
  };

  // Initial setup
  setTimeout(addTooltips, 1000);

  // Refresh tooltips when tab changes or component is selected
  const observer = new MutationObserver(function(mutations) {
    setTimeout(addTooltips, 500);
  });

  observer.observe(document.getElementById('app'), {
    childList: true,
    subtree: true
  });
});
`;

  await fs.writeFile(mainJsPath, jsContent);
}
