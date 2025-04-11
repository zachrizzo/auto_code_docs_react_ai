/**
 * Central export file for styles
 *
 * This file serves as a centralized point to export all style-related utilities
 * and variables, making it easier to maintain consistent styling across the application.
 */

// Export the CSS string from styles.css.js
export { default as cssStyles } from "../styles.css.js";

// Export theme variables and utilities
export const themeColors = {
  light: {
    primary: "#3b82f6",
    secondary: "#6366f1",
    background: "#ffffff",
    text: "#1f2937",
    border: "#e5e7eb",
  },
  dark: {
    primary: "#60a5fa",
    secondary: "#818cf8",
    background: "#0f172a",
    text: "#f1f5f9",
    border: "#334155",
  },
};

// Theme conversion helpers
export function getRgbValues(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// Generate theme CSS variables
export function generateThemeVariables(theme: "light" | "dark"): string {
  const colors = theme === "light" ? themeColors.light : themeColors.dark;

  return `
    --primary-color: ${colors.primary};
    --primary-color-rgb: ${getRgbValues(colors.primary)};
    --secondary-color: ${colors.secondary};
    --secondary-color-rgb: ${getRgbValues(colors.secondary)};
    --background-color: ${colors.background};
    --background-color-rgb: ${getRgbValues(colors.background)};
    --text-color: ${colors.text};
    --text-color-rgb: ${getRgbValues(colors.text)};
    --border-color: ${colors.border};
    --border-color-rgb: ${getRgbValues(colors.border)};
  `;
}
