import path from "path";
import fs from "fs-extra";
import { parseComponents } from "../core/parser";

// Mock dependencies
jest.mock("fs-extra");
jest.mock("react-docgen-typescript", () => ({
  withCustomConfig: jest.fn().mockReturnValue({
    parse: jest.fn().mockImplementation((filePath) => {
      if (filePath.includes("App.tsx")) {
        return [
          {
            displayName: "App",
            description: "App component",
            props: {
              title: {
                type: { name: "string" },
                required: false,
                description: "Title of the app",
                defaultValue: { value: "My App" },
              },
            },
          },
        ];
      } else if (filePath.includes("ComplexComponent.tsx")) {
        return [
          {
            displayName: "ComplexComponent",
            description: "A complex component with various features",
            props: {
              name: {
                type: { name: "string" },
                required: true,
                description: "Name of the component",
              },
              count: {
                type: { name: "number" },
                required: false,
                description: "Count value",
                defaultValue: { value: 0 },
              },
              items: {
                type: { name: "Array<{id: string, value: string}>" },
                required: false,
                description: "List of items",
              },
              callback: {
                type: { name: "(value: string) => void" },
                required: false,
                description: "Callback function",
              },
              config: {
                type: { name: "{ enabled: boolean, timeout: number }" },
                required: false,
                description: "Configuration object",
              },
            },
            methods: [
              {
                name: "handleClick",
                docblock: "Handles click events",
                params: [
                  {
                    name: "event",
                    type: { name: "React.MouseEvent" },
                    description: "The click event",
                  },
                ],
                returns: { type: { name: "void" } },
              },
              {
                name: "calculateValues",
                docblock: "Calculates values based on input",
                params: [
                  {
                    name: "input",
                    type: { name: "number[]" },
                    description: "Array of numbers",
                  },
                ],
                returns: { type: { name: "number" } },
              },
            ],
          },
        ];
      }
      return [];
    }),
  }),
}));

describe("Component Parser", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file existence checks and content
    (fs.existsSync as jest.Mock).mockImplementation((path) => {
      return (
        path.includes(".tsx") ||
        path.includes(".jsx") ||
        path.includes("tsconfig.json")
      );
    });

    (fs.readFile as jest.Mock).mockImplementation((path) => {
      if (path.includes("App.tsx")) {
        return Promise.resolve(`
          import React from 'react';
          import Todo from './Todo';

          const App = ({ title = 'My App' }) => {
            return (
              <div>
                <h1>{title}</h1>
                <Todo />
              </div>
            );
          };

          export default App;
        `);
      } else if (path.includes("ComplexComponent.tsx")) {
        return Promise.resolve(`
          import React from 'react';

          interface ItemType {
            id: string;
            value: string;
          }

          interface ComplexComponentProps {
            name: string;
            count?: number;
            items?: ItemType[];
            callback?: (value: string) => void;
            config?: {
              enabled: boolean;
              timeout: number;
            };
          }

          class ComplexComponent extends React.Component<ComplexComponentProps> {
            static defaultProps = {
              count: 0
            };

            constructor(props: ComplexComponentProps) {
              super(props);
              this.state = {
                internalCount: props.count || 0
              };
            }

            /**
             * Handles click events
             * @param event The click event
             */
            handleClick = (event: React.MouseEvent) => {
              this.setState({ internalCount: this.state.internalCount + 1 });
              if (this.props.callback) {
                this.props.callback(this.props.name);
              }
            };

            /**
             * Calculates values based on input
             * @param input Array of numbers
             * @returns The calculated sum
             */
            calculateValues(input: number[]): number {
              return input.reduce((sum, val) => sum + val, 0);
            }

            render() {
              return (
                <div>
                  <h2>{this.props.name}</h2>
                  <p>Count: {this.state.internalCount}</p>
                  <button onClick={this.handleClick}>Increment</button>
                  {this.props.items && (
                    <ul>
                      {this.props.items.map(item => (
                        <li key={item.id}>{item.value}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }
          }

          export default ComplexComponent;
        `);
      }
      return Promise.resolve("");
    });
  });

  it("should parse a component and its props", async () => {
    const components = await parseComponents({
      rootDir: "/test",
      componentPath: "App.tsx",
    });

    expect(components.length).toBe(1);
    expect(components[0].name).toBe("App");
    expect(components[0].props.length).toBe(1);
    expect(components[0].props[0].name).toBe("title");
    expect(components[0].props[0].type).toBe("string");
    expect(components[0].props[0].defaultValue).toBe("My App");
  });

  it("should parse complex components with various TypeScript features", async () => {
    const components = await parseComponents({
      rootDir: "/test",
      componentPath: "ComplexComponent.tsx",
    });

    expect(components.length).toBe(1);
    expect(components[0].name).toBe("ComplexComponent");
    expect(components[0].props.length).toBe(5);

    // Check props
    const nameProps = components[0].props.find((p) => p.name === "name");
    expect(nameProps).toBeDefined();
    expect(nameProps?.type).toBe("string");
    expect(nameProps?.required).toBe(true);

    const itemsProps = components[0].props.find((p) => p.name === "items");
    expect(itemsProps).toBeDefined();
    expect(itemsProps?.type).toContain("Array");

    const callbackProps = components[0].props.find(
      (p) => p.name === "callback"
    );
    expect(callbackProps).toBeDefined();
    expect(callbackProps?.type).toContain("=>");

    // Check methods
    expect(components[0].methods.length).toBe(2);

    const handleClickMethod = components[0].methods.find(
      (m) => m.name === "handleClick"
    );
    expect(handleClickMethod).toBeDefined();
    if (handleClickMethod) {
      expect(handleClickMethod.params.length).toBe(1);
      expect(handleClickMethod.params[0].type).toBe("React.MouseEvent");
    }

    const calculateValuesMethod = components[0].methods.find(
      (m) => m.name === "calculateValues"
    );
    expect(calculateValuesMethod).toBeDefined();
    if (calculateValuesMethod) {
      expect(calculateValuesMethod.returnType).toBe("number");
    }
  });

  it("should return an empty array if no components are found", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const components = await parseComponents({
      rootDir: "/test",
      componentPath: "NonExistentComponent.tsx",
    });

    expect(components.length).toBe(0);
  });
});
