"use client";

import path from "path";
import fs from "fs-extra";
import type { ComponentDefinition, DocumentationConfig } from "../core/types";

/**
 * Deduplicate components by name to prevent multiple entries of the same component
 * @param components List of components to deduplicate
 * @returns Deduplicated list of components
 */
function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  // Create a Map to track processed components by name for O(1) lookups
  const processedComponentsMap = new Map<string, ComponentDefinition>();

  // Helper function to find all unique components in the tree
  function processComponent(
    component: ComponentDefinition
  ): ComponentDefinition {
    // Create a deep clone of the component to avoid mutation issues
    const processedComponent = { ...component };

    // Process child components recursively and deduplicate them
    if (
      processedComponent.childComponents &&
      processedComponent.childComponents.length > 0
    ) {
      const uniqueChildren: ComponentDefinition[] = [];
      const childNameSet = new Set<string>();

      for (const child of processedComponent.childComponents) {
        // Only process this child if we haven't already seen a component with this name in this subtree
        if (!childNameSet.has(child.name)) {
          childNameSet.add(child.name);

          // Check if we've processed this component name globally
          if (processedComponentsMap.has(child.name)) {
            // Use the already processed version
            uniqueChildren.push(processedComponentsMap.get(child.name)!);
          } else {
            // Process the component and store it
            const processedChild = processComponent(child);
            processedComponentsMap.set(child.name, processedChild);
            uniqueChildren.push(processedChild);
          }
        }
      }

      // Replace the children with the unique set
      processedComponent.childComponents = uniqueChildren;
    }

    return processedComponent;
  }

  // Process all top-level components
  const result: ComponentDefinition[] = [];
  for (const component of components) {
    if (!processedComponentsMap.has(component.name)) {
      const processedComponent = processComponent(component);
      processedComponentsMap.set(component.name, processedComponent);
      result.push(processedComponent);
    } else {
      // Component already processed, use the existing one
      result.push(processedComponentsMap.get(component.name)!);
    }
  }

  console.log(`Found ${components.length} components before deduplication`);
  console.log(`${result.length} components after deduplication`);

  return result;
}

/**
 * Generate documentation for a set of React components
 * @param components List of components to document
 * @param config Documentation configuration
 * @returns Path to the generated documentation
 */
export async function generateDocumentation(
  components: ComponentDefinition[],
  config: DocumentationConfig = {}
): Promise<string> {
  try {
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

    console.log(`Documentation generated successfully at ${outputPath}`);

    // Return the path to the generated documentation
    return outputPath;
  } catch (error) {
    console.error("Error generating documentation:", error);
    throw new Error(
      `Failed to generate documentation: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Generate data.js file with component data
 * @param components Components to include in data file
 * @param outputPath Output directory path
 */
async function generateDataFile(
  components: ComponentDefinition[],
  outputPath: string
): Promise<void> {
  const dataJsPath = path.join(outputPath, "data.js");

  // Convert components to a serializable format
  const safeComponents = components.map((comp) => {
    // Create a deep copy to avoid mutating the original
    const cleanComp = structuredClone(comp);

    // Safely handle circular references
    function replacer(key: string, value: any): any {
      // Handle circular references and complex objects
      if (key !== "" && typeof value === "object" && value !== null) {
        // Convert non-serializable objects to a string representation
        if (
          value.constructor.name !== "Object" &&
          value.constructor.name !== "Array"
        ) {
          return `[${value.constructor.name}]`;
        }

        // Handle circular references
        const seen = new WeakSet();
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    }

    // Convert to JSON and back to safely remove circular references
    try {
      return JSON.parse(JSON.stringify(cleanComp, replacer));
    } catch (error) {
      // Fallback for objects that can't be stringified
      const simplified: any = { name: cleanComp.name };

      // Copy safe properties
      const safeProps = ["type", "description", "fileName"];
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

/**
 * Generate index.html file
 * @param indexHtmlPath Path to write the index.html file
 * @param title Documentation title
 * @param description Documentation description
 * @param theme Theme (light/dark)
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
        '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-6 m-4 shadow-md">' +
        '<h2 class="text-xl font-semibold mb-2">Error Occurred</h2>' +
        '<p><strong>Message:</strong> ' + message + '</p>' +
        '<p><strong>Location:</strong> ' + source + ' line ' + lineno + ', col ' + colno + '</p>' +
        '<p class="mt-4">Please check the browser console for more details.</p>' +
        '</div>';
      return true;
    };

    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
          },
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
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold">Loading Documentation...</h2>
        <p class="text-muted-foreground mt-2">Please wait while we initialize the component viewer.</p>
      </div>
    </div>
  </div>

  <!-- React 18 script tags -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <script>
    // Verify React is loaded correctly before loading app scripts
    if (!window.React || !window.ReactDOM) {
      console.error('React or ReactDOM failed to load');
      document.getElementById('app').innerHTML =
        '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-6 m-4 shadow-md">' +
        '<h2 class="text-xl font-semibold mb-2">Error: React libraries not loaded</h2>' +
        '<p>Check your network connection and try again.</p>' +
        '<button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-md transition-colors">Retry</button>' +
        '</div>';
    } else {
      console.log('React loaded successfully, version:', React.version);

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
          document.getElementById('app').innerHTML =
            '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-6 m-4 shadow-md">' +
            '<h2 class="text-xl font-semibold mb-2">Error: Failed to load application code</h2>' +
            '<p>The main.js file could not be loaded. Try refreshing the page.</p>' +
            '<button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-md transition-colors">Refresh</button>' +
            '</div>';
        };
        document.body.appendChild(mainScript);
      };
      dataScript.onerror = function() {
        console.error('Failed to load data.js');
        document.getElementById('app').innerHTML =
          '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-6 m-4 shadow-md">' +
          '<h2 class="text-xl font-semibold mb-2">Error: Failed to load component data</h2>' +
          '<p>The data.js file could not be loaded. Try refreshing the page.</p>' +
          '<button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-md transition-colors">Refresh</button>' +
          '</div>';
      };
      document.body.appendChild(dataScript);
    }
  </script>
</body>
</html>`;

  await fs.writeFile(indexHtmlPath, html);
}

/**
 * Generate styles.css file with improved styling
 * @param stylesPath Path to write the CSS file
 * @param theme Theme (light/dark)
 */
async function generateStyles(
  stylesPath: string,
  theme: string
): Promise<void> {
  // CSS content moved to a separate file for readability
  // Import the CSS content from the styles module
  const css = await import("./styles.css.js").then((module) => module.default);
  await fs.writeFile(stylesPath, css);
}

/**
 * Generate main.js file with improved React components
 * @param mainJsPath Path to write the JavaScript file
 */
async function generateMainJs(mainJsPath: string): Promise<void> {
  // Instead of importing from a non-existent file, generate the JS content directly
  const jsContent = `// Auto-generated React components for documentation
try {
  console.log("Initializing documentation UI...");

  // Main App component rendering
  const App = () => {
    const [components, setComponents] = React.useState([]);
    const [filteredComponents, setFilteredComponents] = React.useState([]);
    const [selectedComponent, setSelectedComponent] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all');
    const [activeCategory, setActiveCategory] = React.useState(null);

    // Load components data
    React.useEffect(() => {
      try {
        if (window.COMPONENT_DATA && Array.isArray(window.COMPONENT_DATA)) {
          setComponents(window.COMPONENT_DATA);
          setFilteredComponents(window.COMPONENT_DATA);

          // Set initial active category if components exist
          if (window.COMPONENT_DATA.length > 0) {
            const categories = [...new Set(window.COMPONENT_DATA.map(c => c.category || 'Uncategorized'))];
            setActiveCategory(categories[0]);
          }
        }
      } catch (error) {
        console.error('Error loading component data:', error);
      }
    }, []);

    // Filter components based on search query and active tab
    const filterComponents = () => {
      let filtered = [...components];

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(comp =>
          comp.name.toLowerCase().includes(query) ||
          (comp.description && comp.description.toLowerCase().includes(query))
        );
      }

      // Filter by tab
      if (activeTab === 'components') {
        filtered = filtered.filter(comp => comp.type !== 'function');
      } else if (activeTab === 'functions') {
        filtered = filtered.filter(comp => comp.type === 'function');
      }

      // Filter by category
      if (activeCategory) {
        filtered = filtered.filter(comp => (comp.category || 'Uncategorized') === activeCategory);
      }

      return filtered;
    };

    // Handle search input
    const handleSearch = (query) => {
      setSearchQuery(query);
      setFilteredComponents(filterComponents());
    };

    // Handle tab change
    const handleTabChange = (tab) => {
      setActiveTab(tab);
      setFilteredComponents(filterComponents());
    };

    // Handle category change
    const handleCategoryChange = (category) => {
      setActiveCategory(category);
      setFilteredComponents(filterComponents());
    };

    // Handle component selection
    const handleComponentClick = (component) => {
      setSelectedComponent(component);
    };

    // Handle back button click
    const handleBackClick = () => {
      setSelectedComponent(null);
    };

    // Get unique categories from components
    const categories = React.useMemo(() => {
      if (!components.length) return [];
      return [...new Set(components.map(c => c.category || 'Uncategorized'))];
    }, [components]);

    // Render component detail view or component list
    return (
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">React Component Documentation</h1>
          <div className="app-actions">
            {!selectedComponent && (
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </header>

        <div className="app-content">
          {selectedComponent ? (
            <div className="component-details">
              <div className="details-header">
                <button className="back-button" onClick={handleBackClick}>
                  ← Back to Components
                </button>
                <h2 className="component-title">{selectedComponent.name}</h2>
              </div>

              {selectedComponent.fileName && (
                <div className="component-filepath">
                  File: {selectedComponent.fileName}
                </div>
              )}

              {selectedComponent.description && (
                <div className="component-section">
                  <h3>Description</h3>
                  <p>{selectedComponent.description}</p>
                </div>
              )}

              {selectedComponent.props && selectedComponent.props.length > 0 && (
                <div className="component-section">
                  <h3>Props</h3>
                  <table className="props-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedComponent.props.map((prop, index) => (
                        <tr key={index}>
                          <td className="prop-name">{prop.name}</td>
                          <td className="prop-type">
                            <code>{prop.type || 'any'}</code>
                          </td>
                          <td>{prop.required ? 'Yes' : 'No'}</td>
                          <td>{prop.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedComponent.childComponents && selectedComponent.childComponents.length > 0 && (
                <div className="component-section">
                  <h3>Child Components</h3>
                  <div className="components-grid">
                    {selectedComponent.childComponents.map((child, index) => (
                      <div
                        key={index}
                        className="component-card"
                        onClick={() => {
                          const fullChild = components.find(c => c.name === child.name);
                          if (fullChild) {
                            handleComponentClick(fullChild);
                          }
                        }}
                      >
                        <div className="component-name">{child.name}</div>
                        {child.description && (
                          <div className="component-description">{child.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="tabs">
                <button
                  className={\`tab-button \${activeTab === 'all' ? 'active' : ''}\`}
                  onClick={() => handleTabChange('all')}
                >
                  All
                </button>
                <button
                  className={\`tab-button \${activeTab === 'components' ? 'active' : ''}\`}
                  onClick={() => handleTabChange('components')}
                >
                  Components
                </button>
                <button
                  className={\`tab-button \${activeTab === 'functions' ? 'active' : ''}\`}
                  onClick={() => handleTabChange('functions')}
                >
                  Functions
                </button>
              </div>

              {categories.length > 0 && (
                <div className="categories">
                  <select
                    value={activeCategory || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="category-select"
                  >
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filteredComponents.length > 0 ? (
                <div className="components-grid">
                  {filteredComponents.map((component, index) => (
                    <div
                      key={index}
                      className="component-card"
                      onClick={() => handleComponentClick(component)}
                    >
                      <div className="component-name">{component.name}</div>
                      {component.description && (
                        <div className="component-description">{component.description}</div>
                      )}
                      <div className="component-meta">
                        <div className="meta-item">
                          Type: {component.type || 'Component'}
                        </div>
                        {component.props && (
                          <div className="meta-item">
                            Props: {component.props.length}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-message">No components found</div>
                  <div className="empty-state-suggestion">
                    Try adjusting your search or filters
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="app-footer">
          Generated by React Component Documentation Tool
        </footer>
      </div>
    );
  };

  // Render the App to the DOM
  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(<App />);
} catch (error) {
  console.error("Error rendering documentation UI:", error);
  document.getElementById('app').innerHTML =
    '<div class="error-message">' +
    '<h2>Error Rendering UI</h2>' +
    '<p>' + error.message + '</p>' +
    '</div>';
}`;

  await fs.writeFile(mainJsPath, jsContent);
}

export { deduplicateComponents };
