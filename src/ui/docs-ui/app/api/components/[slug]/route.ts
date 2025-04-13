import { NextRequest, NextResponse } from "next/server";
import { parseComponents } from "../../../../../../core/parser";
import path from "path";
import slugify from "slugify";
import {
  ComponentDefinition as ParsedComponentDefinition,
  PropDefinition as ParsedPropDefinition,
  MethodDefinition as ParsedMethodDefinition,
  SimilarityWarning as ParsedSimilarityWarning,
} from "../../../../../../core/types";
import {
  ComponentDefinition as UIComponentDefinition,
  PropDefinition as UIPropDefinition,
  MethodDefinition as UIMethodDefinition,
  SimilarityWarning as UISimilarityWarning,
} from "../../../../lib/docs-data";
import { getDefaultParserConfig } from "../../../../lib/parser-config";

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

// Convert a component to UI format
function convertComponentToUIFormat(
  component: ParsedComponentDefinition,
  slug: string
): UIComponentDefinition {
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
  return {
    name: component.name,
    description: component.description || "",
    filePath: component.filePath,
    props: (component.props || []).map(convertPropDefinition),
    sourceCode: component.sourceCode || "",
    methods: methods,
    slug: slug,
  };
}

// Helper function to find a component by slug (recursive search)
function findComponentBySlug(
  components: ParsedComponentDefinition[],
  slug: string
): UIComponentDefinition | null {
  // Check each component
  for (const component of components) {
    // Generate a slug for comparison
    const componentSlug = slugify(component.name, { lower: true });

    // If this is the component we're looking for, return it
    if (componentSlug === slug) {
      return convertComponentToUIFormat(component, componentSlug);
    }

    // Check child components if any
    if (component.childComponents && component.childComponents.length > 0) {
      const found = findComponentBySlug(component.childComponents, slug);
      if (found) return found;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get the parser configuration
    const parserConfig = getDefaultParserConfig();

    // Parse the components directly
    const parsedComponents = await parseComponents(parserConfig);

    // Find the requested component
    const component = findComponentBySlug(parsedComponents, slug);

    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 }
      );
    }

    // Return the component data
    return NextResponse.json(component);
  } catch (error) {
    console.error("Error getting component:", error);
    return NextResponse.json(
      { error: "Failed to get component data" },
      { status: 500 }
    );
  }
}
