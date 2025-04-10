import { OpenAI } from "openai";
import { ComponentDefinition, PropDefinition } from "../core/types";

interface AiOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AiDescriptionGenerator {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(options: AiOptions) {
    this.openai = new OpenAI({
      apiKey: options.apiKey,
    });
    this.model = options.model || "gpt-3.5-turbo";
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 500;
  }

  /**
   * Generate descriptions for components and their props
   */
  async enhanceComponentsWithDescriptions(
    components: ComponentDefinition[]
  ): Promise<ComponentDefinition[]> {
    const enhancedComponents: ComponentDefinition[] = [];

    for (const component of components) {
      // Generate component description if not already present
      if (!component.description || component.description.trim() === "") {
        component.description = await this.generateComponentDescription(
          component
        );
      }

      // Generate prop descriptions if not already present
      for (const prop of component.props) {
        if (!prop.description || prop.description.trim() === "") {
          prop.description = await this.generatePropDescription(
            component.name,
            prop
          );
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
