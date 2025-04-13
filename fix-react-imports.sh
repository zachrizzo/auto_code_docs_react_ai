#!/bin/bash

echo "Adding React imports to fix UMD global errors..."

# Add React imports to all TSX files
find src/ui -type f -name "*.tsx" | while read file; do
  # Check if file already has React import
  if ! grep -q "import \* as React from \"react\"" "$file" && ! grep -q "import React from \"react\"" "$file"; then
    echo "Adding React import to $file"
    # Add import at the top of the file, after the "use client" directive if present
    if grep -q "\"use client\"" "$file"; then
      # After "use client", add blank line then React import
      sed -i '' '/"use client"/a\
\
import * as React from "react"' "$file"
    else
      # Otherwise add to the first line
      sed -i '' '1s/^/import * as React from "react"\n/' "$file"
    fi
  fi
done

# Fix remaining problems in command.tsx
if [ -f "src/ui/components/ui/command.tsx" ]; then
  echo "Fixing command.tsx imports"
  sed -i '' 's|import .* from "@/components/ui/dialog"|import { Dialog, DialogContent, DialogTitle } from "./dialog"|g' src/ui/components/ui/command.tsx
fi

# Fix mode-toggle imports
if [ -f "src/ui/components/mode-toggle.tsx" ]; then
  echo "Fixing mode-toggle.tsx imports"
  sed -i '' 's|import { Button } from "@/components/ui/button"|import { Button } from "./ui/button"|g' src/ui/components/mode-toggle.tsx
  sed -i '' 's|import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"|import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"|g' src/ui/components/mode-toggle.tsx
fi

echo "React imports fixed!"
