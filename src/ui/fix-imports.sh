#!/bin/bash

# Fix imports in all components
find . -name "*.tsx" -type f -exec sed -i '' 's/from "src\/components/from "@\/components/g' {} \;

# Add "use client" directive to components that use React hooks
for file in components/*.tsx components/**/*.tsx; do
  if grep -q "useState\|useEffect\|useRef\|useCallback" "$file"; then
    if ! grep -q "\"use client\"" "$file"; then
      echo "Adding 'use client' to $file"
      sed -i '' '1s/^/"use client"\n\n/' "$file"
    fi
  fi
done

echo "Fixed imports and added 'use client' directives"
