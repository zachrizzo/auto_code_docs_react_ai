export interface CodeEntity {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method" | string;
  filePath?: string;
  methods?: any[];
  props?: any[];
  dependencies: string[]
  devDependencies: string[]
}

export interface Relationship {
  source: string;
  target: string;
  type: 'uses' | 'calls' | 'instantiates' | 'contains' | 'imports' | 'exports';
  weight?: number;
  context?: string;
}