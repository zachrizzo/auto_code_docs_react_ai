/**
 * CSS styles for the documentation UI
 * Stored as a string to be written to styles.css
 */

const css = `
:root {
  --primary-color: #3b82f6;
  --primary-color-rgb: 59, 130, 246;
  --secondary-color: #6366f1;
  --secondary-color-rgb: 99, 102, 241;
  --background-color: #ffffff;
  --background-color-rgb: 255, 255, 255;
  --text-color: #1f2937;
  --text-color-rgb: 31, 41, 55;
  --border-color: #e5e7eb;
  --border-color-rgb: 229, 231, 235;
  --sidebar-bg: #f9fafb;
  --code-bg: #f3f4f6;
  --header-bg: #ffffff;
  --hover-color: #f3f4f6;
  --warning-bg: #fef9c3;
  --warning-border: #fde047;
  --warning-text: #854d0e;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

[data-theme="dark"] {
  --primary-color: #60a5fa;
  --primary-color-rgb: 96, 165, 250;
  --secondary-color: #818cf8;
  --secondary-color-rgb: 129, 140, 248;
  --background-color: #0f172a;
  --background-color-rgb: 15, 23, 42;
  --text-color: #f1f5f9;
  --text-color-rgb: 241, 245, 249;
  --border-color: #334155;
  --border-color-rgb: 51, 65, 85;
  --sidebar-bg: #1e293b;
  --code-bg: #1e293b;
  --header-bg: #0f172a;
  --hover-color: #1e293b;
  --warning-bg: #422006;
  --warning-border: #713f12;
  --warning-text: #fef08a;
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
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.app-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box input {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  width: 250px;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.theme-toggle button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle button:hover {
  background-color: var(--hover-color);
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
  transition: all 0.2s ease;
}

.tab-button.active {
  border-bottom: 2px solid var(--primary-color);
  opacity: 1;
  font-weight: 600;
}

.tab-button:hover:not(.active) {
  opacity: 0.9;
  background-color: var(--hover-color);
}

/* Component Grid */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.component-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  background-color: var(--background-color);
  transition: all 0.3s;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.component-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.component-card.has-similarities {
  border-left: 3px solid var(--primary-color);
}

.component-name {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--text-color);
}

.similarity-indicator {
  color: var(--primary-color);
  font-weight: bold;
}

.component-description {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-color);
  opacity: 0.8;
  flex-grow: 1;
}

.component-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-color);
  opacity: 0.7;
}

.meta-item.warning {
  color: var(--warning-text);
  font-weight: 500;
}

/* Component Details */
.component-details {
  background-color: var(--background-color);
  border-radius: 12px;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 9999px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: var(--hover-color);
}

.component-title {
  font-size: 2rem;
  font-weight: 700;
}

.component-filepath {
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-color);
  opacity: 0.7;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Props Table */
.props-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9rem;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.props-table th,
.props-table td {
  padding: 0.75rem 1rem;
  text-align: left;
}

.props-table tr:not(:last-child) td {
  border-bottom: 1px solid var(--border-color);
}

.props-table th {
  font-weight: 600;
  background-color: var(--sidebar-bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.props-table tr:hover td {
  background-color: var(--hover-color);
}

.prop-name {
  font-weight: 600;
  font-family: monospace;
}

.prop-type code {
  font-family: monospace;
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.prop-default code {
  font-family: monospace;
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.required-badge {
  display: inline-block;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  background-color: var(--warning-bg);
  color: var(--warning-text);
  vertical-align: middle;
  margin-left: 0.5rem;
}

/* Methods */
.methods-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.method {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  background-color: var(--background-color);
  transition: all 0.2s ease;
}

.method:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.method.has-similarities {
  border-left: 3px solid var(--primary-color);
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
  font-family: monospace;
  color: var(--primary-color);
}

.method-similarity-badge {
  background-color: var(--primary-color);
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
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  overflow-x: auto;
  white-space: pre;
  margin-bottom: 1rem;
}

.method-description {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.method-code {
  margin-top: 1rem;
  background-color: var(--code-bg);
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.9rem;
  overflow-x: auto;
  position: relative;
}

.method-code pre {
  font-family: monospace;
  tab-size: 2;
}

.copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.method-code:hover .copy-button {
  opacity: 1;
}

.copy-button:hover {
  background-color: var(--hover-color);
}

/* Similarity Warnings */
.method-similarities {
  background-color: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.method-similarities h5 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--warning-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.similarity-item {
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.similarity-item:last-child {
  margin-bottom: 0;
}

.similarity-warning {
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
}

.similarity-warning:hover {
  transform: translateY(-2px);
}

.similarity-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.similarity-badge {
  background-color: var(--primary-color);
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
  border-radius: 8px;
  padding: 1rem;
  max-height: 500px;
  overflow: auto;
  font-size: 0.9rem;
  line-height: 1.5;
  position: relative;
}

.source-code pre {
  font-family: monospace;
  tab-size: 2;
}

.source-code:hover .copy-button {
  opacity: 1;
}

/* Similarity Graph */
.similarity-graph {
  margin-top: 1rem;
}

.graph-container {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  height: 600px;
  overflow: hidden;
}

.graph-legend {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem;
  background-color: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-color {
  width: 24px;
  height: 4px;
  border-radius: 2px;
}

.node circle {
  stroke: var(--background-color);
  stroke-width: 2px;
  transition: all 0.3s ease;
}

.node text {
  pointer-events: none;
  user-select: none;
  font-family: var(--font-family);
  font-size: 12px;
  fill: var(--text-color);
}

.node:hover circle {
  stroke-width: 3px;
  stroke: var(--primary-color);
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(2px);
}

/* Empty states */
.no-results, .no-data, .empty-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-color);
  opacity: 0.7;
  font-size: 1.1rem;
  background-color: var(--hover-color);
  border-radius: 12px;
  border: 1px dashed var(--border-color);
  min-height: 200px;
}

.empty-state-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state-message {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.empty-state-suggestion {
  font-size: 0.9rem;
  max-width: 400px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }

  .app-actions {
    width: 100%;
  }

  .search-box input {
    width: 100%;
  }

  .components-grid {
    grid-template-columns: 1fr;
  }

  .component-details {
    padding: 1.5rem 1rem;
  }

  .component-title {
    font-size: 1.5rem;
  }

  .props-table {
    display: block;
    overflow-x: auto;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .components-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

/* Beautiful transitions and animations */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-in {
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Beautiful scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--background-color);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-color);
  opacity: 0.5;
}

/* Similarity Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease-out;
}

.similarity-modal {
  background-color: var(--background-color);
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.modal-close {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.modal-close:hover {
  background-color: var(--hover-color);
}

.modal-action {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.modal-action:hover {
  filter: brightness(110%);
}

.similarity-score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

/* Code comparison */
.code-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .code-comparison {
    grid-template-columns: 1fr;
  }
}

.code-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 450px;
}

.code-panel-header {
  padding: 0.75rem 1rem;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-panel-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.code-panel pre {
  margin: 0;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  tab-size: 2;
  min-height: 100%;
}

.code-panel pre code {
  display: block;
}

/* Lines with differences */
.diff-highlight {
  background-color: rgba(var(--primary-color-rgb), 0.1);
}

/* Sidebar styling */
.sidebar {
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  height: 100%;
  overflow-y: auto;
  width: 250px;
  padding: 1rem;
}

.sidebar-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-menu-item {
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.sidebar-menu-item:hover {
  background-color: var(--hover-color);
}

.sidebar-menu-item.active {
  background-color: var(--primary-color);
  color: white;
}

.sidebar-submenu {
  margin-left: 1rem;
  border-left: 1px solid var(--border-color);
  padding-left: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.sidebar-submenu-item {
  padding: 0.35rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sidebar-submenu-item:hover {
  background-color: var(--hover-color);
}

.sidebar-submenu-item.active {
  color: var(--primary-color);
  font-weight: 500;
}

.sidebar-category {
  margin-bottom: 0.75rem;
}

.sidebar-category-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  opacity: 0.8;
}
`;

export default css;
