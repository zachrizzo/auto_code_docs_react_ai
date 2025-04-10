// Auto-generated component data
window.COMPONENT_DATA = [
  {
    "name": "FibonacciExample",
    "description": "Default export from Fibonacci.tsx",
    "props": [],
    "filePath": "examples/Fibonacci.tsx",
    "sourceCode": "import React from 'react';\n\n/**\n * Fibonacci number calculator using recursion with memoization\n *\n * @param n The position in fibonacci sequence to calculate\n * @param memo Optional memoization object to improve performance\n * @returns The fibonacci number at position n\n */\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n/**\n * Component that demonstrates the fibonacci sequence calculation\n */\nconst FibonacciExample: React.FC = () => {\n    // Calculate first 10 fibonacci numbers\n    const fibNumbers = Array.from({ length: 10 }, (_, i) => fibonacci(i));\n\n    return (\n        <div className=\"fibonacci-example\">\n            <h2>Fibonacci Sequence</h2>\n            <p>The fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones.</p>\n\n            <h3>First 10 Fibonacci Numbers:</h3>\n            <ul>\n                {fibNumbers.map((num, index) => (\n                    <li key={index}>\n                        F({index}) = {num}\n                    </li>\n                ))}\n            </ul>\n\n            <h3>Implementation:</h3>\n            <pre>\n                {`\n/**\n * Fibonacci number calculator using recursion with memoization\n */\nfunction fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n                `}\n            </pre>\n        </div>\n    );\n};\n\nexport default FibonacciExample;\n",
    "childComponents": []
  },
  {
    "name": "fibonacci",
    "description": "Fibonacci number calculator using recursion with memoization",
    "props": [],
    "filePath": "examples/Fibonacci.tsx",
    "sourceCode": "import React from 'react';\n\n/**\n * Fibonacci number calculator using recursion with memoization\n *\n * @param n The position in fibonacci sequence to calculate\n * @param memo Optional memoization object to improve performance\n * @returns The fibonacci number at position n\n */\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n/**\n * Component that demonstrates the fibonacci sequence calculation\n */\nconst FibonacciExample: React.FC = () => {\n    // Calculate first 10 fibonacci numbers\n    const fibNumbers = Array.from({ length: 10 }, (_, i) => fibonacci(i));\n\n    return (\n        <div className=\"fibonacci-example\">\n            <h2>Fibonacci Sequence</h2>\n            <p>The fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones.</p>\n\n            <h3>First 10 Fibonacci Numbers:</h3>\n            <ul>\n                {fibNumbers.map((num, index) => (\n                    <li key={index}>\n                        F({index}) = {num}\n                    </li>\n                ))}\n            </ul>\n\n            <h3>Implementation:</h3>\n            <pre>\n                {`\n/**\n * Fibonacci number calculator using recursion with memoization\n */\nfunction fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n                `}\n            </pre>\n        </div>\n    );\n};\n\nexport default FibonacciExample;\n",
    "childComponents": []
  },
  {
    "name": "Fibonacci",
    "description": "Component that demonstrates the fibonacci sequence calculation",
    "props": [],
    "filePath": "examples/Fibonacci.tsx",
    "sourceCode": "import React from 'react';\n\n/**\n * Fibonacci number calculator using recursion with memoization\n *\n * @param n The position in fibonacci sequence to calculate\n * @param memo Optional memoization object to improve performance\n * @returns The fibonacci number at position n\n */\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n/**\n * Component that demonstrates the fibonacci sequence calculation\n */\nconst FibonacciExample: React.FC = () => {\n    // Calculate first 10 fibonacci numbers\n    const fibNumbers = Array.from({ length: 10 }, (_, i) => fibonacci(i));\n\n    return (\n        <div className=\"fibonacci-example\">\n            <h2>Fibonacci Sequence</h2>\n            <p>The fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones.</p>\n\n            <h3>First 10 Fibonacci Numbers:</h3>\n            <ul>\n                {fibNumbers.map((num, index) => (\n                    <li key={index}>\n                        F({index}) = {num}\n                    </li>\n                ))}\n            </ul>\n\n            <h3>Implementation:</h3>\n            <pre>\n                {`\n/**\n * Fibonacci number calculator using recursion with memoization\n */\nfunction fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n                `}\n            </pre>\n        </div>\n    );\n};\n\nexport default FibonacciExample;\n",
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
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
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
        "code": "function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    // Base cases\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    // Recursive case with memoization\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}"
      }
    ]
  }
];