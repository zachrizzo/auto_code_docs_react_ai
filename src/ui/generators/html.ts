"use client";

/**
 * Generator for index.html file
 */

import fs from "fs-extra";

/**
 * Generate index.html file using shadcn components
 * @param indexHtmlPath Path to write the index.html file
 * @param title Documentation title
 * @param description Documentation description
 * @param theme Theme (light/dark)
 */
export async function generateIndexHtml(
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
  <meta name="description" content="${description}">
  <meta name="theme-color" content="${
    theme === "dark" ? "#0f172a" : "#ffffff"
  }">
  <meta name="color-scheme" content="${theme === "dark" ? "dark" : "light"}">
  <title>${title}</title>

  <!-- Stylesheets -->
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${
    theme === "dark" ? "atom-one-dark" : "github"
  }.min.css">

  <!-- Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@8.0.0/marked.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>">

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
      darkMode: ['class', '[data-theme="dark"]'],
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
              DEFAULT: "rgb(var(--danger-color-rgb) / <alpha-value>)",
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
          boxShadow: {
            card: "0 2px 8px rgba(0, 0, 0, 0.05)",
            "card-hover": "0 10px 25px rgba(0, 0, 0, 0.08)",
          },
          animation: {
            "fade-in": "fadeIn 0.3s ease-in-out",
            "slide-in": "slideIn 0.3s ease-in-out",
          },
          keyframes: {
            fadeIn: {
              "0%": { opacity: 0 },
              "100%": { opacity: 1 },
            },
            slideIn: {
              "0%": { transform: "translateY(10px)", opacity: 0 },
              "100%": { transform: "translateY(0)", opacity: 1 },
            },
          },
        }
      }
    }
  </script>
</head>
<body class="bg-background text-foreground min-h-screen">
  <div id="app">
    <div class="flex items-center justify-center h-screen">
      <div class="text-center p-6 rounded-lg shadow-card animate-fade-in">
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        </div>
        <h2 class="text-xl font-semibold mb-2">Loading Documentation...</h2>
        <p class="text-muted-foreground">Please wait while we initialize the component viewer.</p>
        <div class="mt-6 text-xs text-muted-foreground opacity-70">This may take a few moments depending on the size of your component library.</div>
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
      const configScript = document.createElement('script');
      configScript.src = 'config.js';
      configScript.onload = function() {
        console.log('config.js loaded');

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
      };

      configScript.onerror = function() {
        console.error('Failed to load config.js');
        document.getElementById('app').innerHTML =
          '<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-6 m-4 shadow-md">' +
          '<h2 class="text-xl font-semibold mb-2">Error: Failed to load configuration</h2>' +
          '<p>The config.js file could not be loaded. Try refreshing the page.</p>' +
          '<button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-md transition-colors">Refresh</button>' +
          '</div>';
      };
      document.body.appendChild(configScript);
    }
  </script>
</body>
</html>`;

  await fs.writeFile(indexHtmlPath, html);
}
