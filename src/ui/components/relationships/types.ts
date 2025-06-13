export interface CodeEntity {
  id: string;
  name: string;
  type: "component" | "class" | "function" | "method" | string;
  filePath?: string;
  methods?: any[];
  props?: any[];
}

export interface Relationship {
  source: string;
  target: string;
  type: "uses" | "inherits" | "contains";
  weight?: number;
  context?: string;
}

export interface RelationshipStatsData {
  total: number;
  byType: Record<Relationship['type'], number>;
  mostConnected: { name: string; connections: number };
}