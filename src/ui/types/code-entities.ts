export type CodeEntity = {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method";
  filePath: string;
  code?: string;
};

export type RelationshipType = "imports" | "extends" | "implements" | "calls" | "renders" | "uses";

export interface BaseRelationship {
  source: string; // ID of the source entity (slug)
  target: string; // ID of the target entity (slug)
  type: RelationshipType;
}

export interface CallRelationship extends BaseRelationship {
  type: "calls";
  sourceFile: string;    // File path of the source entity making the call
  sourceLine: number;      // Line number in the source file where the call occurs
  targetFunction?: string; // Name of the specific function/method being called in the target
}

// General relationship can be a BaseRelationship or a more specific one like CallRelationship
export type Relationship = BaseRelationship | CallRelationship;

// Helper type guard to narrow down to CallRelationship
export function isCallRelationship(relationship: Relationship): relationship is CallRelationship {
  return relationship.type === "calls";
}
