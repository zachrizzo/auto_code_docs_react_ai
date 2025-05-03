export type CodeEntity = {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method";
  filePath: string;
  code?: string;
};

export type Relationship = {
  source: string; // ID of the source entity
  target: string; // ID of the target entity
  type: "imports" | "extends" | "implements" | "calls" | "renders" | "uses";
};
