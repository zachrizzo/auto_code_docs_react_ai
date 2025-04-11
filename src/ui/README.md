# UI Directory

This directory contains all UI components, styles, generators and utilities for the React Component Documentation generator.

## Directory Structure

- **components/**: UI components used for displaying documentation
  - **ui/**: shadcn UI components (base components)
  - Other component files for the documentation UI
- **generators/**: Code for generating documentation HTML, JS, and CSS
  - **index.ts**: Main export file for the generator
  - **utilities.ts**: Utility functions for the generator
  - **data.ts**: Code for generating data.js
  - **config.ts**: Code for generating config.js
  - **html.ts**: Code for generating index.html
  - **styles.ts**: Code for generating styles.css
  - **script.ts**: Code for generating main.js
- **styles/**: Style utilities and theme variables
  - **index.ts**: Centralized export of style utilities and variables
- **context/**: React context providers for the application
- **utils/**: Utility functions used by the UI components
- **lib/**: Common libraries used throughout the UI
- **styles.css.js**: CSS styles for the documentation UI
- **generator.ts**: Main re-export file for the generator

## How to Use

### Documentation Generation

To generate documentation for a set of React components:

```typescript
import { generateDocumentation } from "./ui/generator";

const components = [
  /* your component definitions */
];
const outputPath = await generateDocumentation(components, {
  title: "My Component Documentation",
  theme: "dark",
  showCode: true,
  showMethods: true,
});
```

### Using UI Components

The components in this directory can be imported and used directly in your React application:

```tsx
import { DocumentationCard } from "./ui/components/DocumentationCard";

function MyComponent() {
  return (
    <DocumentationCard
      title="ButtonComponent"
      description="A reusable button component"
      metadata={{
        type: "Component",
        propsCount: 5,
        methodsCount: 2,
      }}
      onClick={() => console.log("Clicked")}
    />
  );
}
```

## Styling

This project uses a combination of CSS variables and Tailwind CSS for styling. The theme can be toggled between light and dark modes.

For consistency, use the theme variables defined in `styles/index.ts` when adding new styles.
