#!/bin/bash

echo "Fixing duplicate code issues..."

# Fix the unused variable in mode-toggle.tsx
sed -i '' 's/const { setTheme, theme } = useTheme()/const { setTheme } = useTheme()/' src/ui/components/mode-toggle.tsx

# Create backup directories
mkdir -p backup/src/ui

# Remove duplicate directories (but first back them up)
if [ -d "src/ui/src" ]; then
  echo "Backing up and removing duplicate src/ui/src directory..."
  cp -R src/ui/src backup/src/ui/
  rm -rf src/ui/src
fi

# First pass: Fix imports in command.tsx which is specially causing issues
if [ -f "src/ui/components/ui/command.tsx" ]; then
  echo "Fixing imports in command.tsx"
  sed -i '' 's|import .* from "@/components/ui/dialog"|import { Dialog, DialogContent, DialogTitle } from "../ui/dialog"|g' src/ui/components/ui/command.tsx
fi

# Add React imports to all TSX files that don't have them
find src/ui -type f -name "*.tsx" | while read file; do
  if ! grep -q "import \* as React from \"react\"" "$file" && ! grep -q "import React from \"react\"" "$file"; then
    echo "Adding React import to $file"
    # Add import at the top of the file, after the "use client" directive if present
    if grep -q "\"use client\"" "$file"; then
      sed -i '' '/"use client"/a\'$'\n''import * as React from "react"' "$file"
    else
      sed -i '' '1s/^/import * as React from "react"\n/' "$file"
    fi
  fi
done

# Find any @/lib/utils imports and replace with correct path
find src/ui -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/lib/utils" 2>/dev/null | while read file; do
  echo "Fixing utils imports in $file"
  # Different replacements based on file depth
  if [[ "$file" == */components/ui/* ]]; then
    sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../../lib/utils"|g' "$file"
  else
    sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../lib/utils"|g' "$file"
  fi
done

# Find any @/components imports and replace with correct paths
find src/ui -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "@/components/" 2>/dev/null | while read file; do
  echo "Fixing component imports in $file"
  # If file is in components directory, use relative imports
  if [[ "$file" == *"/components/"* ]]; then
    if [[ "$file" == *"/components/ui/"* ]]; then
      sed -i '' 's|import \(.*\) from "@/components/ui/\(.*\)"|import \1 from "../../components/ui/\2"|g' "$file"
    else
      sed -i '' 's|import \(.*\) from "@/components/ui/\(.*\)"|import \1 from "./ui/\2"|g' "$file"
      sed -i '' 's|import \(.*\) from "@/components/\(.*\)"|import \1 from "./\2"|g' "$file"
    fi
  else
    # If outside components directory, use path from src/ui root
    sed -i '' 's|import \(.*\) from "@/components/\(.*\)"|import \1 from "@/components/\2"|g' "$file"
  fi
done

# Second pass: Fix special case in search.tsx
if [ -f "src/ui/components/search.tsx" ]; then
  echo "Fixing imports in search.tsx"
  sed -i '' 's|import {|import {|g; s|} from "@/components/ui/command"|} from "./ui/command"|g' src/ui/components/search.tsx
fi

# Fix specific Button imports in mode-toggle.tsx (remove redundant path)
sed -i '' 's|import { Button } from "@/components/ui/button"|import { Button } from "./ui/button"|g' src/ui/components/mode-toggle.tsx
sed -i '' 's|import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"|import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"|g' src/ui/components/mode-toggle.tsx

echo "Duplicate code cleanup complete!"
