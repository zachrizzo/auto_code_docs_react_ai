import path from "path";
import fs from "fs";
import {
  parseComponents,
  AiDescriptionGenerator,
  generateDocumentation,
  ParserOptions,
  ComponentDefinition,
} from "../src/index";

async function generateExampleDocs() {
  try {
    console.log("Starting documentation generation...");

    const examplesDir = __dirname;
    console.log(`Examples directory: ${examplesDir}`);

    // List the files in the examples directory
    console.log("Files in examples directory:");
    const files = fs.readdirSync(examplesDir);
    files.forEach((file: string) => {
      console.log(`- ${file}`);
    });

    // Parse components from DocumentAll component
    const parserOptions: ParserOptions = {
      rootDir: examplesDir,
      componentPath: "DocumentAll.tsx",
      maxDepth: 5,
    };

    console.log(`Parsing components from ${examplesDir}...`);
    let components = await parseComponents(parserOptions);

    // Also parse Fibonacci component directly
    const fibonacciParserOptions: ParserOptions = {
      rootDir: examplesDir,
      componentPath: "Fibonacci.tsx",
      maxDepth: 2,
    };

    console.log(`Parsing Fibonacci component from ${examplesDir}...`);
    const fibonacciComponents = await parseComponents(fibonacciParserOptions);

    // Combine all components
    const allComponents = [...components, ...fibonacciComponents];
    console.log(
      `Found components before deduplication: ${allComponents.length}`
    );

    // Find similar functions and add similarity warnings
    const similarityResults = detectSimilarFunctions(allComponents);

    // Add similarity warnings to components
    applySimilarityWarnings(allComponents, similarityResults);

    // Deduplicate components by name
    components = deduplicateComponents(allComponents);
    console.log(`Components after deduplication: ${components.length}`);

    // Log the component hierarchy
    console.log("Component hierarchy:");
    logComponentHierarchy(components);

    // Log similarity warnings
    logSimilarityWarnings(similarityResults);

    // Optional: Enhance with AI descriptions if API key is available
    let enhancedComponents = components;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      console.log("Generating AI descriptions...");

      const aiGenerator = new AiDescriptionGenerator({
        apiKey,
      });

      enhancedComponents = await aiGenerator.enhanceComponentsWithDescriptions(
        components
      );
      console.log("AI descriptions generated");
    } else {
      console.log(
        "No OpenAI API key found. Skipping AI description generation."
      );
    }

    // Generate documentation
    console.log("Generating documentation...");

    const outputPath = await generateDocumentation(enhancedComponents, {
      title: "Todo App with Recursive Examples",
      description:
        "Documentation for a simple Todo app and recursive functions/components built with React",
      theme: "light",
      outputDir: path.resolve(__dirname, "../example-docs"),
    });

    console.log(`Documentation generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error("Error generating documentation:", error);
  }
}

// Helper function to log component hierarchy
function logComponentHierarchy(components: ComponentDefinition[], indent = 0) {
  if (!components || components.length === 0) return;

  components.forEach((component) => {
    console.log(
      `${"  ".repeat(indent)}${component.name} (${component.filePath})`
    );
    if (component.childComponents && component.childComponents.length > 0) {
      console.log(`${"  ".repeat(indent)}Children:`);
      logComponentHierarchy(component.childComponents, indent + 1);
    }
  });
}

// Helper function to deduplicate components by name
function deduplicateComponents(
  components: ComponentDefinition[]
): ComponentDefinition[] {
  const uniqueComponents = new Map<string, ComponentDefinition>();

  // First pass: collect all components by name
  components.forEach((component) => {
    if (!uniqueComponents.has(component.name)) {
      uniqueComponents.set(component.name, {
        ...component,
        childComponents: [], // Clear child components for now
      });
    }
  });

  // Second pass: deduplicate child components recursively
  uniqueComponents.forEach((component, name) => {
    const allChildComponents: ComponentDefinition[] = [];

    // Collect all child components from all instances of this component
    components.forEach((origComponent) => {
      if (origComponent.name === name && origComponent.childComponents) {
        allChildComponents.push(...origComponent.childComponents);
      }
    });

    // Deduplicate the child components
    if (allChildComponents.length > 0) {
      component.childComponents = deduplicateComponents(allChildComponents);
    }
  });

  return Array.from(uniqueComponents.values());
}

interface SimilarityResult {
  component1: string;
  component2: string;
  filePath1: string;
  filePath2: string;
  similarityScore: number;
  reason: string;
}

// Detect similar functions by analyzing their code
function detectSimilarFunctions(
  components: ComponentDefinition[]
): SimilarityResult[] {
  const results: SimilarityResult[] = [];
  const processedPairs = new Set<string>();

  // Function to normalize code for comparison
  const normalizeCode = (code: string): string => {
    return code
      .replace(/\/\/.*$/gm, "") // Remove comments
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  };

  // Get all functions from components
  const allFunctions = components.flatMap((component) => {
    if (!component.methods) return [];
    return component.methods.map((method) => ({
      name: method.name,
      code: method.code || "",
      component: component.name,
      filePath: component.filePath,
    }));
  });

  // Also include functional components themselves
  components.forEach((component) => {
    if (component.sourceCode) {
      allFunctions.push({
        name: component.name,
        code: component.sourceCode,
        component: component.name,
        filePath: component.filePath,
      });
    }
  });

  // Compare each function with others
  for (let i = 0; i < allFunctions.length; i++) {
    const func1 = allFunctions[i];
    if (!func1.code) continue;

    const normalizedCode1 = normalizeCode(func1.code);

    for (let j = i + 1; j < allFunctions.length; j++) {
      const func2 = allFunctions[j];
      if (!func2.code) continue;

      // Skip if we've already compared this pair
      const pairKey = `${func1.name}|${func1.component}|${func2.name}|${func2.component}`;
      const reversePairKey = `${func2.name}|${func2.component}|${func1.name}|${func1.component}`;

      if (processedPairs.has(pairKey) || processedPairs.has(reversePairKey)) {
        continue;
      }

      processedPairs.add(pairKey);

      // Skip comparing function with itself in different places
      if (func1.name === func2.name && func1.component === func2.component) {
        continue;
      }

      const normalizedCode2 = normalizeCode(func2.code);

      // Calculate similarity score
      let similarityScore = calculateSimilarity(
        normalizedCode1,
        normalizedCode2
      );

      // If names are similar but code is different, slightly increase score
      if (
        func1.name.toLowerCase().includes(func2.name.toLowerCase()) ||
        func2.name.toLowerCase().includes(func1.name.toLowerCase())
      ) {
        similarityScore = Math.min(1, similarityScore + 0.1);
      }

      // If similarity is high enough, record it
      if (similarityScore > 0.7) {
        let reason = "";
        if (similarityScore > 0.95) {
          reason = "Nearly identical implementation";
        } else if (similarityScore > 0.8) {
          reason = "Very similar implementation";
        } else {
          reason = "Similar functionality";
        }

        results.push({
          component1: `${func1.component}.${func1.name}`,
          component2: `${func2.component}.${func2.name}`,
          filePath1: func1.filePath,
          filePath2: func2.filePath,
          similarityScore,
          reason,
        });
      }
    }
  }

  return results;
}

// Calculate similarity between two code strings
function calculateSimilarity(code1: string, code2: string): number {
  // Exact match check
  if (code1 === code2) return 1.0;

  // If one is contained in the other
  if (code1.includes(code2)) return 0.9;
  if (code2.includes(code1)) return 0.9;

  // Simple Jaccard similarity for a basic approach
  const tokens1 = new Set(code1.split(/[\s;{}()[\],.<>:=+\-*/&|!?]+/));
  const tokens2 = new Set(code2.split(/[\s;{}()[\],.<>:=+\-*/&|!?]+/));

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  // Remove empty strings
  intersection.delete("");
  union.delete("");

  return intersection.size / union.size;
}

// Apply similarity warnings to the components
function applySimilarityWarnings(
  components: ComponentDefinition[],
  similarities: SimilarityResult[]
) {
  // Create a map for easy component lookup
  const componentMap = new Map<string, ComponentDefinition>();

  components.forEach((component) => {
    componentMap.set(component.name, component);

    // Also map component methods
    if (component.methods) {
      component.methods.forEach((method) => {
        componentMap.set(`${component.name}.${method.name}`, component);
      });
    }
  });

  // Add warnings to components
  similarities.forEach((similarity) => {
    const [comp1, method1] = similarity.component1.split(".");
    const [comp2, method2] = similarity.component2.split(".");

    // Add warning to first component
    const component1 = componentMap.get(comp1);
    if (component1) {
      component1.similarityWarnings = component1.similarityWarnings || [];
      component1.similarityWarnings.push({
        similarTo: similarity.component2,
        score: similarity.similarityScore,
        reason: similarity.reason,
        filePath: similarity.filePath2,
      });
    }

    // Add warning to second component
    const component2 = componentMap.get(comp2);
    if (component2) {
      component2.similarityWarnings = component2.similarityWarnings || [];
      component2.similarityWarnings.push({
        similarTo: similarity.component1,
        score: similarity.similarityScore,
        reason: similarity.reason,
        filePath: similarity.filePath1,
      });
    }
  });
}

// Log similarity warnings to console
function logSimilarityWarnings(similarities: SimilarityResult[]) {
  if (similarities.length === 0) {
    console.log("No similar functions detected");
    return;
  }

  console.log("\n=== Similar Function Warnings ===");
  similarities.forEach((similarity) => {
    console.log(`
⚠️ Similar Functions Detected (${Math.round(
      similarity.similarityScore * 100
    )}% similar):
  - ${similarity.component1} in ${similarity.filePath1}
  - ${similarity.component2} in ${similarity.filePath2}
  Reason: ${similarity.reason}
`);
  });
  console.log("================================\n");
}

// Run the example
generateExampleDocs();
