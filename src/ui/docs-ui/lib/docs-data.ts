// Interface definitions
export interface PropDefinition {
  name: string;
  type: string;
  defaultValue?: string;
  required: boolean;
  description: string;
}

export interface MethodParameter {
  name: string;
  type: string;
}

export interface SimilarityWarning {
  similarTo: string;
  score: number;
  reason: string;
  filePath: string;
  code: string;
}

export interface MethodDefinition {
  name: string;
  params: MethodParameter[];
  returnType: string;
  code: string;
  similarityWarnings?: SimilarityWarning[];
}

export interface ComponentDefinition {
  name: string;
  description: string;
  filePath: string;
  props: PropDefinition[];
  sourceCode: string;
  methods: MethodDefinition[];
  slug: string;
}

// Mock data with the right shape for development
export const mockComponents: ComponentDefinition[] = [
  {
    name: "DocumentAll",
    description:
      "This component brings together all the components, functions and examples for documentation generation purposes.",
    filePath: "examples/DocumentAll.tsx",
    slug: "document-all",
    props: [],
    sourceCode:
      "import React from 'react';\nimport App from './App';\nimport Todo, { TodoItem as TodoItemType } from './Todo';\n// More code would be here...",
    methods: [
      {
        name: "fibonacci",
        params: [
          { name: "n", type: "number" },
          { name: "memo", type: "Record<number, number> = {}" },
        ],
        returnType: "number",
        code: "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}",
        similarityWarnings: [
          {
            similarTo: "Fibonacci.fibonacci",
            score: 0.9936767154008945,
            reason:
              "Function appears to have similar functionality (99% similar)",
            filePath: "examples/Fibonacci.tsx",
            code: "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}",
          },
        ],
      },
    ],
  },
  {
    name: "Todo",
    description:
      "A Todo component that manages a list of todo items with various features.",
    filePath: "examples/Todo.tsx",
    slug: "todo",
    props: [],
    sourceCode: "// Todo component code here",
    methods: [],
  },
  {
    name: "HealthcareDashboard",
    description:
      "Dashboard for healthcare professionals to manage patient data.",
    filePath: "examples/HealthcareDashboard.tsx",
    slug: "healthcare-dashboard",
    props: [],
    sourceCode: "// HealthcareDashboard component code here",
    methods: [],
  },
  {
    name: "Fibonacci",
    description: "Component demonstrating Fibonacci sequence calculation.",
    filePath: "examples/Fibonacci.tsx",
    slug: "fibonacci",
    props: [],
    sourceCode: "// Fibonacci component code",
    methods: [
      {
        name: "fibonacci",
        params: [
          { name: "n", type: "number" },
          { name: "memo", type: "Record<number, number> = {}" },
        ],
        returnType: "number",
        code: "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}",
        similarityWarnings: [],
      },
    ],
  },
];

// Function to load the real component data from API
export async function loadComponentData(): Promise<ComponentDefinition[]> {
  try {
    // Try to load component data from our API endpoint
    console.log("Attempting to load component data from API");
    let response;

    try {
      response = await fetch("/api/components", {
        cache: "no-store",
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      console.warn(
        "Could not fetch component data from API, falling back to mock data"
      );
      return mockComponents;
    }

    if (!response.ok) {
      console.warn(
        `Could not load component data (status: ${response.status}), falling back to mock data`
      );
      return mockComponents;
    }

    let components;
    try {
      components = await response.json();
      console.log(
        "Successfully loaded component data with",
        components.length,
        "components"
      );
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      console.warn(
        "Could not parse component data JSON, falling back to mock data"
      );
      return mockComponents;
    }

    if (!Array.isArray(components) || components.length === 0) {
      console.warn(
        "Component data is empty or not an array, falling back to mock data"
      );
      return mockComponents;
    }

    return components;
  } catch (error) {
    console.error("Failed to load component data:", error);
    console.log("Using mock component data");
    return mockComponents;
  }
}

// Function to get component by slug
export async function getComponentBySlug(
  slug: string
): Promise<ComponentDefinition | null> {
  try {
    // Try to load component data from API endpoint
    console.log(`Attempting to load component data for slug: ${slug}`);
    const response = await fetch(`/api/components/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `Could not load component data for slug: ${slug} (status: ${response.status}), falling back to other methods`
      );
      // Fall back to searching in all components
      const components = await loadComponentData();
      return components.find((c) => c.slug === slug) || null;
    }

    const component = await response.json();
    return component;
  } catch (error) {
    console.error(`Error loading component data for slug: ${slug}:`, error);
    // Fall back to searching in all components
    const components = await loadComponentData();
    return components.find((c) => c.slug === slug) || null;
  }
}

// Function to get all components
export async function getAllComponents(): Promise<ComponentDefinition[]> {
  return loadComponentData();
}
