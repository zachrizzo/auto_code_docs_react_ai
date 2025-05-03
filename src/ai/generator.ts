import { OpenAI } from "openai";
import { ComponentDefinition, PropDefinition } from "../core/types";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";
import axios from "axios";

interface AiOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cachePath?: string; // Path to store documentation cache
  useOllama?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
}

interface DocumentationCache {
  [key: string]: {
    componentHash: string;
    description: string;
    props: {
      [propName: string]: {
        propHash: string;
        description: string;
      };
    };
    lastUpdated: string;
  };
}

export class AiDescriptionGenerator {
  private openai: OpenAI | null = null;
  private model: string = "gpt-3.5-turbo";
  private temperature: number = 0.7;
  private maxTokens: number = 500;
  private cachePath: string = path.join(process.cwd(), ".docs-cache.json");
  private cache: DocumentationCache = {};
  private useOllama: boolean = false;
  private ollamaUrl: string =
    process.env.OLLAMA_URL || "http://localhost:11434";
  private ollamaModel: string = process.env.OLLAMA_MODEL || "gemma3:27b";

  constructor(options: AiOptions) {
    this.useOllama = options.useOllama || false;

    if (this.useOllama) {
      // Initialize Ollama settings
      this.ollamaUrl = options.ollamaUrl || this.ollamaUrl;
      this.ollamaModel = options.ollamaModel || this.ollamaModel;
      this.model = "ollama";
      console.log(
        `Using Ollama for descriptions at ${this.ollamaUrl} with model ${this.ollamaModel}`
      );
    } else {
      // Initialize OpenAI
      if (!options.apiKey && !process.env.OPENAI_API_KEY) {
        throw new Error("API key is required when using OpenAI");
      }

      this.openai = new OpenAI({
        apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      });
      this.model = options.model || this.model;
    }

    this.temperature = options.temperature || this.temperature;
    this.maxTokens = options.maxTokens || this.maxTokens;
    this.cachePath = options.cachePath || this.cachePath;

    // Load cache if it exists
    this.loadCache();
  }

  private loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        this.cache = fs.readJSONSync(this.cachePath);
        console.log(`Documentation cache loaded from ${this.cachePath}`);
      }
    } catch (error) {
      console.warn(`Failed to load documentation cache: ${error}`);
      this.cache = {};
    }
  }

  private saveCache() {
    try {
      // Ensure the directory exists
      const cacheDir = path.dirname(this.cachePath);
      fs.ensureDirSync(cacheDir);

      // Save the cache file
      fs.writeJSONSync(this.cachePath, this.cache, { spaces: 2 });
    } catch (error) {
      console.warn(`Failed to save documentation cache: ${error}`);
    }
  }

  private calculateComponentHash(component: ComponentDefinition): string {
    const dataToHash = {
      name: component.name,
      filePath: component.filePath,
      props:
        component.props && Array.isArray(component.props)
          ? component.props.map((prop) => ({
              name: prop.name,
              type: prop.type,
              required: prop.required,
              defaultValue: prop.defaultValue,
            }))
          : [],
      sourceCode: component.sourceCode || "",
    };

    return crypto
      .createHash("md5")
      .update(JSON.stringify(dataToHash))
      .digest("hex");
  }

  private calculatePropHash(
    componentName: string,
    prop: PropDefinition
  ): string {
    // Ensure prop is defined
    if (!prop) {
      console.warn("Prop is undefined in calculatePropHash");
      return crypto
        .createHash("md5")
        .update(JSON.stringify({ componentName }))
        .digest("hex");
    }

    const dataToHash = {
      componentName,
      propName: prop.name || "unnamed",
      type: prop.type || "unknown",
      required: prop.required || false,
      defaultValue: prop.defaultValue || null,
    };

    return crypto
      .createHash("md5")
      .update(JSON.stringify(dataToHash))
      .digest("hex");
  }

  /**
   * Generate descriptions for components and their props
   */
  async enhanceComponentsWithDescriptions(
    components: ComponentDefinition[]
  ): Promise<ComponentDefinition[]> {
    const enhancedComponents: ComponentDefinition[] = [];
    let cachedCount = 0;
    let generatedCount = 0;

    for (const component of components) {
      // Handle case where component might be undefined or missing properties
      if (!component) {
        console.warn("Encountered undefined component, skipping");
        continue;
      }

      const componentHash = this.calculateComponentHash(component);
      const cacheKey = `${component.name}:${component.filePath}`;
      const cachedComponent = this.cache[cacheKey];

      // Check if we have a valid cached description for this component
      if (cachedComponent && cachedComponent.componentHash === componentHash) {
        // Component hasn't changed, use cached description
        component.description = cachedComponent.description;
        cachedCount++;

        // Check and apply cached prop descriptions
        if (component.props && Array.isArray(component.props)) {
          for (const prop of component.props) {
            // Skip if prop is undefined
            if (!prop) continue;

            // Ensure cachedComponent.props exists before accessing it
            const cachedProp =
              cachedComponent.props && cachedComponent.props[prop.name];
            if (cachedProp) {
              const propHash = this.calculatePropHash(component.name, prop);
              if (cachedProp.propHash === propHash) {
                prop.description = cachedProp.description;
              } else {
                // Prop has changed, generate new description
                prop.description = await this.generatePropDescription(
                  component,
                  prop
                );
                generatedCount++;

                // Update cache for this prop
                if (!this.cache[cacheKey]) {
                  this.cache[cacheKey] = {
                    componentHash,
                    description: component.description,
                    props: {},
                    lastUpdated: new Date().toISOString(),
                  };
                }

                this.cache[cacheKey].props[prop.name] = {
                  propHash,
                  description: prop.description,
                };
              }
            } else {
              // No cached description for this prop, or cachedComponent.props didn't exist
              if (!prop.description || prop.description.trim() === "") {
                prop.description = await this.generatePropDescription(
                  component,
                  prop
                );
                generatedCount++;

                // Cache the newly generated description
                // Ensure the cache entry and its props object exist
                if (!this.cache[cacheKey]) {
                  this.cache[cacheKey] = {
                    componentHash,
                    description: component.description || "", // Use current/default description
                    props: {},
                    lastUpdated: new Date().toISOString(),
                  };
                } else if (!this.cache[cacheKey].props) {
                  this.cache[cacheKey].props = {}; // Initialize props if missing
                }

                this.cache[cacheKey].props[prop.name] = {
                  propHash: this.calculatePropHash(component.name, prop),
                  description: prop.description,
                };
              }
            }
          }
        }
      } else {
        // Generate component description if not already present
        if (!component.description || component.description.trim() === "") {
          component.description = await this.generateComponentDescription(
            component
          );
          generatedCount++;

          // Create cache entry for this component
          this.cache[cacheKey] = {
            componentHash,
            description: component.description,
            props: {},
            lastUpdated: new Date().toISOString(),
          };
        }

        // Generate prop descriptions if not already present
        if (component.props && Array.isArray(component.props)) {
          for (const prop of component.props) {
            if (!prop) continue; // Skip undefined props

            if (!prop.description || prop.description.trim() === "") {
              prop.description = await this.generatePropDescription(
                component,
                prop
              );
              generatedCount++;

              // Cache the prop description
              if (!this.cache[cacheKey].props) {
                this.cache[cacheKey].props = {};
              }

              this.cache[cacheKey].props[prop.name] = {
                propHash: this.calculatePropHash(component.name, prop),
                description: prop.description,
              };
            }
          }
        }
      }

      // Recursively process child components
      if (component.childComponents && component.childComponents.length > 0) {
        component.childComponents =
          await this.enhanceComponentsWithDescriptions(
            component.childComponents
          );
      }

      enhancedComponents.push(component);
    }

    // Save the updated cache
    this.saveCache();

    console.log(
      `Documentation generation: ${cachedCount} components used from cache, ${generatedCount} items generated`
    );

    return enhancedComponents;
  }

  /**
   * Generate a description for a component using either OpenAI or Ollama
   */
  private async generateComponentDescription(
    component: ComponentDefinition
  ): Promise<string> {
    // Add null check for component itself as well as component.props before trying to map over it
    if (!component) {
      console.warn("Component is undefined in generateComponentDescription");
      return "A React component.";
    }

    const propList =
      component.props && Array.isArray(component.props)
        ? component.props
            .filter((prop) => prop) // Additional filter to ensure no undefined props
            .map(
              (prop) =>
                `${prop.name}${prop.required ? " (required)" : ""}: ${
                  prop.type || "unknown"
                }`
            )
            .join(", ")
        : "No props.";

    const prompt = `
You are a React documentation expert. Write a concise and informative description for a React component named "${
      component.name || "Unknown"
    }".
Here are the props it accepts: ${propList}
File path: ${component.filePath || "Unknown"}

Provide a 1-2 sentence description explaining what this component does, based on its name and props. Be specific and professional.
Don't include phrases like "Based on the name and props" or "It seems that". Just provide direct information.
`;

    if (this.useOllama) {
      try {
        const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
          model: this.ollamaModel,
          prompt: prompt,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
        });

        if (response.data && response.data.response) {
          return (
            response.data.response.trim() ||
            `A React component that renders a ${component.name} element.`
          );
        } else {
          console.error(
            "Unexpected response format from Ollama:",
            response.data
          );
          return `A React component that renders a ${component.name} element.`;
        }
      } catch (error) {
        console.error(
          `Error generating description with Ollama for component ${component.name}:`,
          error
        );
        return `A React component that renders a ${component.name} element.`;
      }
    } else {
      try {
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }

        const completion = await this.openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        });

        return (
          completion.choices[0]?.message?.content?.trim() ||
          `A React component that renders a ${component.name} element.`
        );
      } catch (error) {
        console.error(
          `Error generating description for component ${component.name}:`,
          error
        );
        return `A React component that renders a ${component.name} element.`;
      }
    }
  }

  /**
   * Generate a description for a prop based on its name, type, and parent component
   */
  private async generatePropDescription(
    component: ComponentDefinition,
    prop: PropDefinition
  ): Promise<string> {
    // Add null checks
    if (!component) {
      console.warn("Component is undefined in generatePropDescription");
      return "A prop for a React component.";
    }

    if (!prop) {
      console.warn("Prop is undefined in generatePropDescription");
      return "A prop for a React component.";
    }

    const isRequired = prop.required ? "required" : "optional";
    const defaultValue = prop.defaultValue
      ? `It has a default value of \`${prop.defaultValue}\`.`
      : "";

    const prompt = `
You are a React documentation expert. Write a concise and informative description for a React prop named "${
      prop.name || "Unknown"
    }" for the component "${component.name || "Unknown"}".
Type: ${prop.type || "unknown"}
Required: ${isRequired}
${defaultValue}
File path: ${component.filePath || "Unknown"}

Provide a 1-2 sentence description explaining what this prop does and how it affects the component. Be specific and professional.
Don't include phrases like "Based on the name" or "It seems that". Just provide direct information.
`;

    if (this.useOllama) {
      try {
        const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
          model: this.ollamaModel,
          prompt: prompt,
          temperature: this.temperature,
          max_tokens: 100,
          stream: false,
        });

        if (response.data && response.data.response) {
          return (
            response.data.response.trim() ||
            `Controls the ${prop.name} of the ${component.name} component.`
          );
        } else {
          console.error(
            "Unexpected response format from Ollama:",
            response.data
          );
          return `Controls the ${prop.name} of the ${component.name} component.`;
        }
      } catch (error) {
        console.error(
          `Error generating description with Ollama for prop ${prop.name}:`,
          error
        );
        return `Controls the ${prop.name} of the ${component.name} component.`;
      }
    } else {
      try {
        if (!this.openai) {
          throw new Error("OpenAI client not initialized");
        }

        const completion = await this.openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: this.model,
          temperature: this.temperature,
          max_tokens: 100,
        });

        return (
          completion.choices[0]?.message?.content?.trim() ||
          `Controls the ${prop.name} of the ${component.name} component.`
        );
      } catch (error) {
        console.error(
          `Error generating description for prop ${prop.name}:`,
          error
        );
        return `Controls the ${prop.name} of the ${component.name} component.`;
      }
    }
  }
}

export interface GenerateDocumentationOptions {
  output?: string;
  openAIApiKey?: string;
  useOllama?: boolean;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export async function generateDocumentation(
  components: any[],
  options: GenerateDocumentationOptions = {}
) {
  console.log("Generating documentation...");
  return components;
}

export default generateDocumentation;
