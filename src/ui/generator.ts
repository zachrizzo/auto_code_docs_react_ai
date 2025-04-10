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
  --secondary-color: #0366d6;
  --background-color: #ffffff;
  --text-color: #333333;
  --border-color: #e1e4e8;
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
  --secondary-color: #1f6feb;
  --background-color: #0d1117;
  --text-color: #c9d1d9;
  --border-color: #30363d;
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.similarity-modal-content {
  background-color: var(--card-bg);
  padding: 20px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.close-button {
  float: right;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-color);
}

.similarity-modal-score {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 10px 0 20px;
  color: var(--accent-color);
}

.similarity-modal-methods {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.similarity-source-method, .similarity-target-method {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.similarity-file-path {
  font-size: 12px;
  color: var(--muted-text);
  margin-top: 5px;
}

.similarity-modal-reason {
  padding: 10px;
  background-color: var(--background-color);
  border-radius: 4px;
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
`;

  await fs.writeFile(stylesPath, css);
}

/**
 * Generate main.js file
 */
async function generateMainJs(mainJsPath: string): Promise<void> {
  const jsContent = `
// Main React application for documentation
const { useState, useEffect, Fragment, useMemo } = React;

// Component to visualize similarity between functions
function SimilarityGraph(props) {
  const components = props.components;
  const [selectedSimilarity, setSelectedSimilarity] = useState(null);
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
                targetName: warning.similarTo,
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

  // Filter to show only similarities above 60%
  const displayedSimilarities = allSimilarities.filter(sim => sim.score >= 0.6);

  if (displayedSimilarities.length === 0) {
    return React.createElement("div", { className: "no-similarities" }, "No similar methods found");
  }

  return React.createElement(
    "div",
    { className: "similarity-graph-container" },
    React.createElement("h3", null, "Method Similarity Analysis"),
    React.createElement("p", null, "Showing ", displayedSimilarities.length, " method similarities with 60%+ similarity score"),
    React.createElement(
      "div",
      { className: "similarity-list" },
      displayedSimilarities.map((similarity, index) =>
        React.createElement(
          "div",
          {
            key: "sim-" + index,
            className: "similarity-card",
            onClick: () => setSelectedSimilarity(similarity)
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
    ),
    selectedSimilarity && React.createElement(
      "div",
      { className: "similarity-modal" },
      React.createElement(
        "div",
        { className: "similarity-modal-content" },
        React.createElement(
          "button",
          {
            className: "close-button",
            onClick: () => setSelectedSimilarity(null)
          },
          "✕"
        ),
        React.createElement("h3", null, "Similarity Details"),
        React.createElement(
          "div",
          { className: "similarity-modal-score" },
          Math.round(selectedSimilarity.score * 100) + "% Similar"
        ),
        React.createElement(
          "div",
          { className: "similarity-modal-methods" },
          React.createElement(
            "div",
            { className: "similarity-source-method" },
            React.createElement(
              "h4",
              null,
              selectedSimilarity.sourceComponent + "." + selectedSimilarity.sourceMethod
            ),
            React.createElement(
              "div",
              { className: "similarity-file-path" },
              selectedSimilarity.filePath
            )
          ),
          React.createElement(
            "div",
            { className: "similarity-target-method" },
            React.createElement("h4", null, selectedSimilarity.targetName)
          )
        ),
        React.createElement(
          "div",
          { className: "similarity-modal-reason" },
          React.createElement("strong", null, "Reason:"),
          " " + selectedSimilarity.reason
        )
      )
    )
  );
}

function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('components');

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

  // Filter components based on search term
  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to render a similarity warning
  const renderSimilarityWarning = (warning) => React.createElement(
    "div",
    { className: "similarity-warning" },
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
    React.createElement("div", { className: "similarity-file" }, warning.filePath)
  );

  // Function to render a method with similarity warnings
  const renderMethod = (method, componentName) => {
    const hasSimilarities = method.similarityWarnings && method.similarityWarnings.length > 0;

    return React.createElement(
      "div",
      {
        className: "method " + (hasSimilarities ? "has-similarities" : ""),
        key: method.name
      },
      React.createElement(
        "div",
        { className: "method-header" },
        React.createElement(
          "h4",
          { className: "method-name" },
          method.name,
          hasSimilarities && React.createElement(
            "span",
            {
              className: "method-similarity-badge",
              title: "Has similar methods"
            },
            method.similarityWarnings.length
          )
        ),
        React.createElement(
          "div",
          { className: "method-signature" },
          "(" + method.params.map(p => p.name + ": " + p.type).join(", ") + ")",
          method && method.returnType && ": " + method.returnType
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
          renderSimilarityWarning(warning)
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
      React.createElement("h3", null, "Methods"),
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
          React.createElement(SimilarityGraph, { components: components })
        )
      )
    ),
    React.createElement(
      "footer",
      { className: "app-footer" },
      React.createElement("p", null, "Generated with Recursive React Docs AI")
    )
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
