"use client";

/**
 * Generator for styles.css file with shadcn component compatibility
 */

import fs from "fs-extra";

/**
 * Generate styles.css file with improved styling compatible with shadcn
 * @param stylesPath Path to write the CSS file
 * @param theme Theme (light/dark)
 */
export async function generateStyles(
  stylesPath: string,
  theme: string
): Promise<void> {
  // CSS with variables aligned with shadcn expectations
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
  --success-color: #22c55e;
  --success-color-rgb: 34, 197, 94;
  --danger-color: #ef4444;
  --danger-color-rgb: 239, 68, 68;
  --similarity-color: #fb923c;
  --similarity-color-rgb: 251, 146, 60;
  --chat-bg: #ffffff;
  --chat-user-bg: #f3f4f6;
  --chat-assistant-bg: #dbeafe;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace;

  /* shadcn compatibility vars */
  --background: var(--background-color);
  --foreground: var(--text-color);
  --card: var(--background-color);
  --card-foreground: var(--text-color);
  --popover: var(--background-color);
  --popover-foreground: var(--text-color);
  --primary: var(--primary-color);
  --primary-foreground: white;
  --secondary: var(--secondary-color);
  --secondary-foreground: white;
  --muted: var(--border-color);
  --muted-foreground: rgba(var(--text-color-rgb), 0.7);
  --accent: var(--border-color);
  --accent-foreground: var(--text-color);
  --destructive: var(--danger-color);
  --destructive-foreground: white;
  --border: var(--border-color);
  --input: var(--border-color);
  --ring: var(--primary-color);

  /* shadcn radius */
  --radius: 0.5rem;

  /* shadcn animations */
  --transition-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --transition-duration: 150ms;
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
  --success-color: #4ade80;
  --success-color-rgb: 74, 222, 128;
  --danger-color: #f87171;
  --danger-color-rgb: 248, 113, 113;
  --similarity-color: #fb923c;
  --similarity-color-rgb: 251, 146, 60;
  --chat-bg: #0f172a;
  --chat-user-bg: #1e293b;
  --chat-assistant-bg: #1e3a8a;
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

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color);
  opacity: 0.5;
  z-index: 1;
}

.search-box input {
  padding: 0.75rem 1.25rem;
  padding-left: 2.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 0.95rem;
  width: 300px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
  width: 350px;
}

.chat-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.chat-button:hover {
  background-color: rgba(var(--primary-color-rgb), 0.85);
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
  background: none;
  border: none;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-color);
  opacity: 0.7;
  cursor: pointer;
  border-radius: var(--radius);
  transition: opacity 0.2s, background-color 0.2s;
}

.tab-button:hover {
  background-color: var(--hover-color);
  opacity: 0.9;
}

.tab-button.active {
  color: var(--primary-color);
  opacity: 1;
  background-color: rgba(var(--primary-color-rgb), 0.1);
}

/* Component Grid */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.component-card {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.component-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
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

/* Component Details */
.component-details {
  max-width: 1000px;
  margin: 0 auto;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-button {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: var(--radius);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-button:hover {
  background-color: var(--hover-color);
}

.component-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.component-filepath {
  font-family: var(--font-family-mono);
  background-color: var(--code-bg);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 2rem;
  font-size: 0.875rem;
}

.component-section {
  margin-bottom: 2.5rem;
}

.component-section h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

code {
  font-family: var(--font-family-mono);
  font-size: 0.9em;
  background-color: var(--code-bg);
  padding: 0.2em 0.4em;
  border-radius: calc(var(--radius) / 2);
}

pre {
  background-color: var(--code-bg);
  padding: 1rem;
  border-radius: var(--radius);
  overflow-x: auto;
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
}

.code-container {
  position: relative;
  margin-bottom: 1rem;
}

.code-container pre {
  max-height: 400px;
  overflow-y: auto;
}

.props-table {
  width: 100%;
  border-collapse: collapse;
}

.props-table th,
.props-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.props-table th {
  font-weight: 600;
  background-color: var(--code-bg);
}

.prop-name {
  font-weight: 600;
}

.prop-type {
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
}

/* Methods Section */
.methods-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.method-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 1.5rem;
  background-color: var(--background-color);
}

.method-card.has-similarity-warnings {
  border-left: 4px solid var(--similarity-color);
}

.method-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.method-description {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-color);
  opacity: 0.8;
}

.method-signature {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--code-bg);
  border-radius: var(--radius);
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
}

.method-code {
  margin-bottom: 1rem;
}

.similarity-warnings {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color);
}

.similarity-warnings h5 {
  color: var(--similarity-color);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.warnings-list {
  list-style: none;
}

.warning-item {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: var(--radius);
  background-color: rgba(var(--similarity-color-rgb), 0.1);
}

.warning-score {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: calc(var(--radius) / 2);
  background-color: var(--similarity-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

.warning-component {
  display: block;
  margin-top: 0.5rem;
  font-weight: 600;
}

.warning-reason {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.warning-code {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.warning-code pre {
  max-height: 200px;
  overflow-y: auto;
}

/* Loading Spinner */
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  font-style: italic;
  color: var(--text-color);
  opacity: 0.7;
}

/* Chat UI */
.chat-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 350px;
  max-width: calc(100vw - 4rem);
  height: 500px;
  max-height: calc(100vh - 8rem);
  background-color: var(--chat-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 1rem;
}

.chat-close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.chat-close-button:hover {
  opacity: 1;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-welcome {
  background-color: rgba(var(--primary-color-rgb), 0.1);
  padding: 1.25rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.chat-welcome h4 {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.chat-welcome p {
  font-size: 0.95rem;
  opacity: 0.9;
}

.chat-message {
  max-width: 85%;
  padding: 1rem 1.25rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.user-message {
  align-self: flex-end;
  background-color: var(--chat-user-bg);
}

.assistant-message {
  align-self: flex-start;
  background-color: var(--chat-assistant-bg);
}

.loading-dots {
  display: inline-block;
  width: 20px;
  height: 20px;
  position: relative;
}

.loading-dots::after {
  content: '...';
  font-size: 20px;
  font-weight: bold;
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.chat-input-form {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.5rem;
}

.chat-input {
  flex: 1;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 0.95rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.chat-send-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.chat-send-button:hover {
  background-color: rgba(var(--primary-color-rgb), 0.8);
}

.chat-send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.theme-toggle-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius);
}

.theme-toggle-button:hover {
  opacity: 1;
  background-color: var(--hover-color);
}

.copy-button {
  padding: 0.5rem 1rem;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background-color: var(--hover-color);
  border-color: var(--primary-color);
}

.copied-toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--success-color);
  color: white;
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(10px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.code-section {
  position: relative;
}

.code-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
}

.filepath-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.filepath-value {
  font-family: var(--font-family-mono);
  background-color: var(--code-bg);
  padding: 0.2rem 0.4rem;
  border-radius: calc(var(--radius) / 2);
  font-size: 0.9rem;
}

.header-left {
  display: flex;
  align-items: center;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  text-align: center;
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state-message {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-state-suggestion {
  color: var(--text-color);
  opacity: 0.7;
}

.error-message {
  background-color: var(--warning-bg);
  border: 1px solid var(--warning-border);
  color: var(--warning-text);
  padding: 1.25rem;
  border-radius: var(--radius);
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* Categories */
.categories {
  margin-bottom: 2rem;
}

.category-select {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 0.95rem;
  width: 100%;
  max-width: 300px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.category-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

/* Smooth transitions between dark/light mode */
html.transition,
html.transition *,
html.transition *:before,
html.transition *:after {
  transition: all 750ms !important;
  transition-delay: 0 !important;
}

/* Responsive */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }

  .app-content {
    padding: 1rem;
  }

  .components-grid {
    grid-template-columns: 1fr;
  }

  .search-box input {
    width: 100%;
  }

  .tab-button {
    padding: 0.5rem 1rem;
  }

  .chat-container {
    width: calc(100vw - 2rem);
    height: 400px;
    bottom: 1rem;
    right: 1rem;
  }
}
`;

  await fs.writeFile(stylesPath, css);
}
