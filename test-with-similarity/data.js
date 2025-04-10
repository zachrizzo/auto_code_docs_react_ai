// Auto-generated component data
window.COMPONENT_DATA = [
  {
    "name": "RecursiveExamples",
    "description": "Default export from RecursiveExamples.tsx",
    "props": [],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": []
  },
  {
    "name": "factorial",
    "description": "Recursive functions in TypeScript",
    "props": [],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": [],
    "methods": [
      {
        "name": "fibonacci",
        "params": [
          {
            "name": "n",
            "type": "number"
          },
          {
            "name": "memo",
            "type": "Record<number"
          },
          {
            "name": "number> = {}",
            "type": "any"
          }
        ],
        "returnType": "number",
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      },
      {
        "name": "sumNestedArray",
        "params": [
          {
            "name": "arr",
            "type": "any[]"
          }
        ],
        "returnType": "number",
        "code": "function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "item of arr",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "typeof item === 'number'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (typeof item === 'number') {\n            sum += item;\n        }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }"
      },
      {
        "name": "constructor",
        "params": [
          {
            "name": "root",
            "type": "TreeNode<T>"
          }
        ],
        "returnType": "void",
        "code": "constructor(root: TreeNode<T>) {\n        this.root = root;\n    }"
      },
      {
        "name": "findNodeByValue",
        "params": [
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }"
      },
      {
        "name": "findNodeRecursive",
        "params": [
          {
            "name": "node",
            "type": "TreeNode<T>"
          },
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }"
      },
      {
        "name": "renderComment",
        "params": [
          {
            "name": "comment",
            "type": "Comment"
          }
        ],
        "returnType": "void",
        "code": "const renderComment = (comment: Comment) => ("
      },
      {
        "name": "if",
        "params": [
          {
            "name": "obj === null || typeof obj !== 'object'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "key in obj",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }"
      },
      {
        "name": "traverseDOM",
        "params": [
          {
            "name": "element",
            "type": "Element"
          },
          {
            "name": "callback",
            "type": "(el"
          }
        ],
        "returnType": "void",
        "code": "function traverseDOM(element: Element, callback: (el: Element) => void): void {"
      },
      {
        "name": "forEach",
        "params": [
          {
            "name": "child => {\n        if (child.nodeType === Node.ELEMENT_NODE",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }"
      },
      {
        "name": "recursivePromiseChain",
        "params": [
          {
            "name": "actions",
            "type": "(("
          }
        ],
        "returnType": "void",
        "code": "function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "index >= actions.length",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (index >= actions.length) {\n        return Promise.resolve();\n    }"
      },
      {
        "name": "runRecursiveExample",
        "params": [],
        "returnType": "void",
        "code": "const runRecursiveExample = () => {\n        // Calculate factorial of 5\n        const fact5 = factorial(5);\n\n        // Calculate 10th Fibonacci number\n        const fib10 = fibonacci(10);\n\n        // Sum the nested array\n        const sum = sumNestedArray(nestedArray);\n\n        // Process the tree\n        const treeProcessor = new RecursiveTreeProcessor(sampleTree);\n        const values: string[] = [];\n        depthFirstTraversal(sampleTree, (val) => values.push(val));\n\n        setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}\n      Sum of nested array: ${sum}\n      Tree values: ${values.join(', ')}\n    `);\n    }"
      },
      {
        "name": "setResult",
        "params": [
          {
            "name": "`\n      Factorial of 5",
            "type": "${fact5}\n      Fibonacci(10"
          }
        ],
        "returnType": "$",
        "code": "setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}"
      }
    ]
  },
  {
    "name": "sumNestedArray",
    "description": "",
    "props": [],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": [],
    "methods": [
      {
        "name": "factorial",
        "params": [
          {
            "name": "n",
            "type": "number"
          }
        ],
        "returnType": "number",
        "code": "function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}"
      },
      {
        "name": "fibonacci",
        "params": [
          {
            "name": "n",
            "type": "number"
          },
          {
            "name": "memo",
            "type": "Record<number"
          },
          {
            "name": "number> = {}",
            "type": "any"
          }
        ],
        "returnType": "number",
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "item of arr",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "typeof item === 'number'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (typeof item === 'number') {\n            sum += item;\n        }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }"
      },
      {
        "name": "constructor",
        "params": [
          {
            "name": "root",
            "type": "TreeNode<T>"
          }
        ],
        "returnType": "void",
        "code": "constructor(root: TreeNode<T>) {\n        this.root = root;\n    }"
      },
      {
        "name": "findNodeByValue",
        "params": [
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }"
      },
      {
        "name": "findNodeRecursive",
        "params": [
          {
            "name": "node",
            "type": "TreeNode<T>"
          },
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }"
      },
      {
        "name": "renderComment",
        "params": [
          {
            "name": "comment",
            "type": "Comment"
          }
        ],
        "returnType": "void",
        "code": "const renderComment = (comment: Comment) => ("
      },
      {
        "name": "if",
        "params": [
          {
            "name": "obj === null || typeof obj !== 'object'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "key in obj",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }"
      },
      {
        "name": "traverseDOM",
        "params": [
          {
            "name": "element",
            "type": "Element"
          },
          {
            "name": "callback",
            "type": "(el"
          }
        ],
        "returnType": "void",
        "code": "function traverseDOM(element: Element, callback: (el: Element) => void): void {"
      },
      {
        "name": "forEach",
        "params": [
          {
            "name": "child => {\n        if (child.nodeType === Node.ELEMENT_NODE",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }"
      },
      {
        "name": "recursivePromiseChain",
        "params": [
          {
            "name": "actions",
            "type": "(("
          }
        ],
        "returnType": "void",
        "code": "function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "index >= actions.length",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (index >= actions.length) {\n        return Promise.resolve();\n    }"
      },
      {
        "name": "runRecursiveExample",
        "params": [],
        "returnType": "void",
        "code": "const runRecursiveExample = () => {\n        // Calculate factorial of 5\n        const fact5 = factorial(5);\n\n        // Calculate 10th Fibonacci number\n        const fib10 = fibonacci(10);\n\n        // Sum the nested array\n        const sum = sumNestedArray(nestedArray);\n\n        // Process the tree\n        const treeProcessor = new RecursiveTreeProcessor(sampleTree);\n        const values: string[] = [];\n        depthFirstTraversal(sampleTree, (val) => values.push(val));\n\n        setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}\n      Sum of nested array: ${sum}\n      Tree values: ${values.join(', ')}\n    `);\n    }"
      },
      {
        "name": "setResult",
        "params": [
          {
            "name": "`\n      Factorial of 5",
            "type": "${fact5}\n      Fibonacci(10"
          }
        ],
        "returnType": "$",
        "code": "setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}"
      }
    ]
  },
  {
    "name": "deepClone",
    "description": "JavaScript examples with recursion (using JS syntax, no types)",
    "props": [],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": [],
    "methods": [
      {
        "name": "factorial",
        "params": [
          {
            "name": "n",
            "type": "number"
          }
        ],
        "returnType": "number",
        "code": "function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}"
      },
      {
        "name": "fibonacci",
        "params": [
          {
            "name": "n",
            "type": "number"
          },
          {
            "name": "memo",
            "type": "Record<number"
          },
          {
            "name": "number> = {}",
            "type": "any"
          }
        ],
        "returnType": "number",
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      },
      {
        "name": "sumNestedArray",
        "params": [
          {
            "name": "arr",
            "type": "any[]"
          }
        ],
        "returnType": "number",
        "code": "function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "item of arr",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "typeof item === 'number'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (typeof item === 'number') {\n            sum += item;\n        }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }"
      },
      {
        "name": "constructor",
        "params": [
          {
            "name": "root",
            "type": "TreeNode<T>"
          }
        ],
        "returnType": "void",
        "code": "constructor(root: TreeNode<T>) {\n        this.root = root;\n    }"
      },
      {
        "name": "findNodeByValue",
        "params": [
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }"
      },
      {
        "name": "findNodeRecursive",
        "params": [
          {
            "name": "node",
            "type": "TreeNode<T>"
          },
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }"
      },
      {
        "name": "renderComment",
        "params": [
          {
            "name": "comment",
            "type": "Comment"
          }
        ],
        "returnType": "void",
        "code": "const renderComment = (comment: Comment) => ("
      },
      {
        "name": "if",
        "params": [
          {
            "name": "obj === null || typeof obj !== 'object'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "key in obj",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }"
      },
      {
        "name": "traverseDOM",
        "params": [
          {
            "name": "element",
            "type": "Element"
          },
          {
            "name": "callback",
            "type": "(el"
          }
        ],
        "returnType": "void",
        "code": "function traverseDOM(element: Element, callback: (el: Element) => void): void {"
      },
      {
        "name": "forEach",
        "params": [
          {
            "name": "child => {\n        if (child.nodeType === Node.ELEMENT_NODE",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }"
      },
      {
        "name": "recursivePromiseChain",
        "params": [
          {
            "name": "actions",
            "type": "(("
          }
        ],
        "returnType": "void",
        "code": "function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "index >= actions.length",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (index >= actions.length) {\n        return Promise.resolve();\n    }"
      },
      {
        "name": "runRecursiveExample",
        "params": [],
        "returnType": "void",
        "code": "const runRecursiveExample = () => {\n        // Calculate factorial of 5\n        const fact5 = factorial(5);\n\n        // Calculate 10th Fibonacci number\n        const fib10 = fibonacci(10);\n\n        // Sum the nested array\n        const sum = sumNestedArray(nestedArray);\n\n        // Process the tree\n        const treeProcessor = new RecursiveTreeProcessor(sampleTree);\n        const values: string[] = [];\n        depthFirstTraversal(sampleTree, (val) => values.push(val));\n\n        setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}\n      Sum of nested array: ${sum}\n      Tree values: ${values.join(', ')}\n    `);\n    }"
      },
      {
        "name": "setResult",
        "params": [
          {
            "name": "`\n      Factorial of 5",
            "type": "${fact5}\n      Fibonacci(10"
          }
        ],
        "returnType": "$",
        "code": "setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}"
      }
    ]
  },
  {
    "name": "RecursiveTreeProcessor",
    "description": "Recursive class implementation in TypeScript",
    "props": [],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": [],
    "methods": [
      {
        "name": "factorial",
        "params": [
          {
            "name": "n",
            "type": "number"
          }
        ],
        "returnType": "number",
        "code": "function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}"
      },
      {
        "name": "fibonacci",
        "params": [
          {
            "name": "n",
            "type": "number"
          },
          {
            "name": "memo",
            "type": "Record<number"
          },
          {
            "name": "number> = {}",
            "type": "any"
          }
        ],
        "returnType": "number",
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      },
      {
        "name": "sumNestedArray",
        "params": [
          {
            "name": "arr",
            "type": "any[]"
          }
        ],
        "returnType": "number",
        "code": "function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "item of arr",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "typeof item === 'number'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (typeof item === 'number') {\n            sum += item;\n        }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }"
      },
      {
        "name": "constructor",
        "params": [
          {
            "name": "root",
            "type": "TreeNode<T>"
          }
        ],
        "returnType": "void",
        "code": "constructor(root: TreeNode<T>) {\n        this.root = root;\n    }"
      },
      {
        "name": "findNodeByValue",
        "params": [
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }"
      },
      {
        "name": "findNodeRecursive",
        "params": [
          {
            "name": "node",
            "type": "TreeNode<T>"
          },
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }"
      },
      {
        "name": "renderComment",
        "params": [
          {
            "name": "comment",
            "type": "Comment"
          }
        ],
        "returnType": "void",
        "code": "const renderComment = (comment: Comment) => ("
      },
      {
        "name": "if",
        "params": [
          {
            "name": "obj === null || typeof obj !== 'object'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "key in obj",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }"
      },
      {
        "name": "traverseDOM",
        "params": [
          {
            "name": "element",
            "type": "Element"
          },
          {
            "name": "callback",
            "type": "(el"
          }
        ],
        "returnType": "void",
        "code": "function traverseDOM(element: Element, callback: (el: Element) => void): void {"
      },
      {
        "name": "forEach",
        "params": [
          {
            "name": "child => {\n        if (child.nodeType === Node.ELEMENT_NODE",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }"
      },
      {
        "name": "recursivePromiseChain",
        "params": [
          {
            "name": "actions",
            "type": "(("
          }
        ],
        "returnType": "void",
        "code": "function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "index >= actions.length",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (index >= actions.length) {\n        return Promise.resolve();\n    }"
      },
      {
        "name": "runRecursiveExample",
        "params": [],
        "returnType": "void",
        "code": "const runRecursiveExample = () => {\n        // Calculate factorial of 5\n        const fact5 = factorial(5);\n\n        // Calculate 10th Fibonacci number\n        const fib10 = fibonacci(10);\n\n        // Sum the nested array\n        const sum = sumNestedArray(nestedArray);\n\n        // Process the tree\n        const treeProcessor = new RecursiveTreeProcessor(sampleTree);\n        const values: string[] = [];\n        depthFirstTraversal(sampleTree, (val) => values.push(val));\n\n        setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}\n      Sum of nested array: ${sum}\n      Tree values: ${values.join(', ')}\n    `);\n    }"
      },
      {
        "name": "setResult",
        "params": [
          {
            "name": "`\n      Factorial of 5",
            "type": "${fact5}\n      Fibonacci(10"
          }
        ],
        "returnType": "$",
        "code": "setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}"
      }
    ]
  },
  {
    "name": "CommentThread",
    "description": "React component that demonstrates recursive rendering",
    "props": [
      {
        "name": "comments",
        "type": "Comment[]",
        "required": true,
        "description": ""
      }
    ],
    "filePath": "examples/RecursiveExamples.tsx",
    "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
    "childComponents": [],
    "methods": [
      {
        "name": "factorial",
        "params": [
          {
            "name": "n",
            "type": "number"
          }
        ],
        "returnType": "number",
        "code": "function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}"
      },
      {
        "name": "fibonacci",
        "params": [
          {
            "name": "n",
            "type": "number"
          },
          {
            "name": "memo",
            "type": "Record<number"
          },
          {
            "name": "number> = {}",
            "type": "any"
          }
        ],
        "returnType": "number",
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      },
      {
        "name": "sumNestedArray",
        "params": [
          {
            "name": "arr",
            "type": "any[]"
          }
        ],
        "returnType": "number",
        "code": "function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "item of arr",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "typeof item === 'number'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (typeof item === 'number') {\n            sum += item;\n        }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }"
      },
      {
        "name": "constructor",
        "params": [
          {
            "name": "root",
            "type": "TreeNode<T>"
          }
        ],
        "returnType": "void",
        "code": "constructor(root: TreeNode<T>) {\n        this.root = root;\n    }"
      },
      {
        "name": "findNodeByValue",
        "params": [
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }"
      },
      {
        "name": "findNodeRecursive",
        "params": [
          {
            "name": "node",
            "type": "TreeNode<T>"
          },
          {
            "name": "value",
            "type": "T"
          }
        ],
        "returnType": "TreeNode<T> | null",
        "code": "findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "child of node.children",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }"
      },
      {
        "name": "renderComment",
        "params": [
          {
            "name": "comment",
            "type": "Comment"
          }
        ],
        "returnType": "void",
        "code": "const renderComment = (comment: Comment) => ("
      },
      {
        "name": "if",
        "params": [
          {
            "name": "obj === null || typeof obj !== 'object'",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }"
      },
      {
        "name": "for",
        "params": [
          {
            "name": "key in obj",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }"
      },
      {
        "name": "traverseDOM",
        "params": [
          {
            "name": "element",
            "type": "Element"
          },
          {
            "name": "callback",
            "type": "(el"
          }
        ],
        "returnType": "void",
        "code": "function traverseDOM(element: Element, callback: (el: Element) => void): void {"
      },
      {
        "name": "forEach",
        "params": [
          {
            "name": "child => {\n        if (child.nodeType === Node.ELEMENT_NODE",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }"
      },
      {
        "name": "recursivePromiseChain",
        "params": [
          {
            "name": "actions",
            "type": "(("
          }
        ],
        "returnType": "void",
        "code": "function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {"
      },
      {
        "name": "if",
        "params": [
          {
            "name": "index >= actions.length",
            "type": "any"
          }
        ],
        "returnType": "void",
        "code": "if (index >= actions.length) {\n        return Promise.resolve();\n    }"
      },
      {
        "name": "runRecursiveExample",
        "params": [],
        "returnType": "void",
        "code": "const runRecursiveExample = () => {\n        // Calculate factorial of 5\n        const fact5 = factorial(5);\n\n        // Calculate 10th Fibonacci number\n        const fib10 = fibonacci(10);\n\n        // Sum the nested array\n        const sum = sumNestedArray(nestedArray);\n\n        // Process the tree\n        const treeProcessor = new RecursiveTreeProcessor(sampleTree);\n        const values: string[] = [];\n        depthFirstTraversal(sampleTree, (val) => values.push(val));\n\n        setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}\n      Sum of nested array: ${sum}\n      Tree values: ${values.join(', ')}\n    `);\n    }"
      },
      {
        "name": "setResult",
        "params": [
          {
            "name": "`\n      Factorial of 5",
            "type": "${fact5}\n      Fibonacci(10"
          }
        ],
        "returnType": "$",
        "code": "setResult(`\n      Factorial of 5: ${fact5}\n      Fibonacci(10): ${fib10}"
      }
    ]
  }
];