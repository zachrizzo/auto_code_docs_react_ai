import { OpenAI } from "openai";
import { ComponentDefinition, PropDefinition } from "../core/types";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";

interface AiOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cachePath?: string; // Path to store documentation cache
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
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private cachePath: string;
  private cache: DocumentationCache = {};

  constructor(options: AiOptions) {
    this.openai = new OpenAI({
      apiKey: options.apiKey,
    });
    this.model = options.model || "gpt-3.5-turbo";
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 500;
    this.cachePath =
      options.cachePath || path.join(process.cwd(), ".docs-cache.json");

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
      props: component.props.map((prop) => ({
        name: prop.name,
        type: prop.type,
        required: prop.required,
        defaultValue: prop.defaultValue,
      })),
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
    const dataToHash = {
      componentName,
      propName: prop.name,
      type: prop.type,
      required: prop.required,
      defaultValue: prop.defaultValue,
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
      const componentHash = this.calculateComponentHash(component);
      const cacheKey = `${component.name}:${component.filePath}`;
      const cachedComponent = this.cache[cacheKey];

      // Check if we have a valid cached description for this component
      if (cachedComponent && cachedComponent.componentHash === componentHash) {
        // Component hasn't changed, use cached description
        component.description = cachedComponent.description;
        cachedCount++;

        // Check and apply cached prop descriptions
        for (const prop of component.props) {
          const cachedProp = cachedComponent.props[prop.name];
          if (cachedProp) {
            const propHash = this.calculatePropHash(component.name, prop);
            if (cachedProp.propHash === propHash) {
              prop.description = cachedProp.description;
            } else {
              // Prop has changed, generate new description
              prop.description = await this.generatePropDescription(
                component.name,
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
            // No cached description for this prop
            if (!prop.description || prop.description.trim() === "") {
              prop.description = await this.generatePropDescription(
                component.name,
                prop
              );
              generatedCount++;

              // Cache the newly generated description
              if (!this.cache[cacheKey]) {
                this.cache[cacheKey] = {
                  componentHash,
                  description: component.description,
                  props: {},
                  lastUpdated: new Date().toISOString(),
                };
              }

              this.cache[cacheKey].props[prop.name] = {
                propHash: this.calculatePropHash(component.name, prop),
                description: prop.description,
              };
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
        for (const prop of component.props) {
          if (!prop.description || prop.description.trim() === "") {
            prop.description = await this.generatePropDescription(
              component.name,
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
   * Generate a description for a component based on its name and props
   */
  private async generateComponentDescription(
    component: ComponentDefinition
  ): Promise<string> {
    const propList = component.props
      .map(
        (prop) =>
          `${prop.name}${prop.required ? " (required)" : ""}: ${prop.type}`
      )
      .join(", ");

    const prompt = `
You are a React documentation expert. Write a concise and informative description for a React component named "${
      component.name
    }".
Here are the props it accepts: ${propList || "No props."}
File path: ${component.filePath}

Provide a 1-2 sentence description explaining what this component does, based on its name and props. Be specific and professional.
Don't include phrases like "Based on the name and props" or "It seems that". Just provide direct information.
`;

    try {
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

  /**
   * Generate a description for a prop based on its name, type, and parent component
   */
  private async generatePropDescription(
    componentName: string,
    prop: PropDefinition
  ): Promise<string> {
    const prompt = `
You are a React documentation expert. Write a concise and informative description for a prop named "${
      prop.name
    }" of type "${prop.type}" for a React component called "${componentName}".
${prop.required ? "This prop is required." : "This prop is optional."}
${prop.defaultValue ? `The default value is: ${prop.defaultValue}` : ""}

Provide a concise one-sentence description of what this prop does, based on its name, type, and the component it belongs to. Be professional and direct.
Don't include phrases like "Based on the name" or "It seems that". Just provide direct information.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        temperature: this.temperature,
        max_tokens: 100,
      });

      return (
        completion.choices[0]?.message?.content?.trim() ||
        `Controls the ${prop.name} of the ${componentName} component.`
      );
    } catch (error) {
      console.error(
        `Error generating description for prop ${prop.name}:`,
        error
      );
      return `Controls the ${prop.name} of the ${componentName} component.`;
    }
  }
}
