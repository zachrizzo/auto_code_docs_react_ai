import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "component";

    // Read the component index data first, then try to enhance with detailed descriptions
    const dataPath = path.join(process.cwd(), "docs-data", "component-index.json");
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: "Component data not found" }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    
    // Filter by type if specified
    let filteredData = data;
    if (type !== "all") {
      // Use the 'kind' field to filter, with fallback to name patterns
      filteredData = data.filter((item: any) => {
        const itemKind = item.kind || 'function';
        
        if (type === "component") {
          return itemKind === "component" || 
                 (item.name && /^[A-Z]/.test(item.name) && 
                  (item.filePath?.includes("/components/") || item.filePath?.includes("/ui/")));
        } else if (type === "function") {
          return itemKind === "function" || 
                 (item.name && /^[a-z]/.test(item.name));
        } else if (type === "class") {
          return itemKind === "class" || 
                 (item.name && /^[A-Z]/.test(item.name) && 
                  (item.name.includes("Service") || item.name.includes("Manager")));
        }
        return true;
      });
    }

    return NextResponse.json(filteredData);
  } catch (error) {
    console.error("Error reading component stats:", error);
    return NextResponse.json({ error: "Failed to read component data" }, { status: 500 });
  }
}