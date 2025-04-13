import { NextResponse } from "next/server";
import { parseComponents } from "../../../../../core/parser";
import path from "path";
import slugify from "slugify";
import {
  ComponentDefinition as ParsedComponentDefinition,
  PropDefinition as ParsedPropDefinition,
  MethodDefinition as ParsedMethodDefinition,
  SimilarityWarning as ParsedSimilarityWarning,
} from "../../../../../core/types";
import {
  ComponentDefinition as UIComponentDefinition,
  PropDefinition as UIPropDefinition,
  MethodDefinition as UIMethodDefinition,
  SimilarityWarning as UISimilarityWarning,
} from "../../../lib/docs-data";
import { getDefaultParserConfig } from "../../../lib/parser-config";

// Convert a parser similarity warning to UI similarity warning
function convertSimilarityWarning(
  warning: ParsedSimilarityWarning
): UISimilarityWarning {
  return {
    similarTo: warning.similarTo || "",
    score: warning.score || 0,
    reason: warning.reason || "",
    filePath: warning.filePath || "",
    code: warning.code || "",
  };
}

// Convert a parser method param to UI method param
function convertMethodParam(param: {
  name: string;
  type: string;
  description?: string;
}): { name: string; type: string } {
  return {
    name: param.name,
    type: param.type,
  };
}

// Convert a parser prop definition to UI prop definition
function convertPropDefinition(prop: ParsedPropDefinition): UIPropDefinition {
  return {
    name: prop.name,
    type: prop.type || "any",
    defaultValue: prop.defaultValue,
    required: prop.required || false,
    description: prop.description || "",
  };
}

// Helper function to convert parser component format to UI component format
function convertToUIFormat(
  parsedComponents: ParsedComponentDefinition[]
): UIComponentDefinition[] {
  return parsedComponents.map((component) => {
    const slug = slugify(component.name, { lower: true });

    // Convert methods to the expected format
    const methods: UIMethodDefinition[] = (component.methods || []).map(
      (method) => ({
        name: method.name,
        params: (method.params || []).map(convertMethodParam),
        returnType: method.returnType || "void",
        code: method.code || "",
        similarityWarnings: (method.similarityWarnings || []).map(
          convertSimilarityWarning
        ),
      })
    );

    // Create a component in the format expected by the UI
    const uiComponent: UIComponentDefinition = {
      name: component.name,
      description: component.description || "",
      filePath: component.filePath,
      props: (component.props || []).map(convertPropDefinition),
      sourceCode: component.sourceCode || "",
      methods: methods,
      slug: slug,
    };

    return uiComponent;
  });
}

// Helper function to add slugs to components recursively and convert to UI format
function processComponents(
  components: ParsedComponentDefinition[]
): UIComponentDefinition[] {
  const uiComponents = convertToUIFormat(components);

  // Process any child components and add them to the main list
  let allComponents: UIComponentDefinition[] = [...uiComponents];

  for (const component of components) {
    if (component.childComponents && component.childComponents.length > 0) {
      const childUIComponents = processComponents(component.childComponents);
      allComponents = [...allComponents, ...childUIComponents];
    }
  }

  return allComponents;
}

export async function GET() {
  try {
    // Get the parser configuration
    const parserConfig = getDefaultParserConfig();

    // Parse the components directly
    const parsedComponents = await parseComponents(parserConfig);

    // Process the components to make them compatible with the UI
    const uiComponents = processComponents(parsedComponents);

    // Return the components as JSON
    return NextResponse.json(uiComponents);
  } catch (error) {
    console.error("Error parsing components:", error);
    return NextResponse.json(
      { error: "Failed to parse components" },
      { status: 500 }
    );
  }
}
