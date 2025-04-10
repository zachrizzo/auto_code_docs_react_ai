// Auto-generated component data
window.COMPONENT_DATA = [
  {
    "name": "App",
    "description": "Main application component that serves as the entry point",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": false,
        "defaultValue": "My Todo App",
        "description": "Title for the application"
      },
      {
        "name": "showRecursiveExamples",
        "type": "boolean",
        "required": false,
        "defaultValue": false,
        "description": "Whether to show recursive examples"
      }
    ],
    "filePath": "examples/App.tsx",
    "sourceCode": "import React from 'react';\nimport Todo, { TodoItem } from './Todo';\nimport RecursiveExamples from './RecursiveExamples';\n\n/**\n * Props for the App component\n */\ninterface AppProps {\n    /**\n     * Title for the application\n     */\n    title?: string;\n\n    /**\n     * Whether to show recursive examples\n     */\n    showRecursiveExamples?: boolean;\n}\n\n/**\n * Main application component that serves as the entry point\n */\nconst App: React.FC<AppProps> = ({\n    title = 'My Todo App',\n    showRecursiveExamples = false\n}) => {\n    const initialTodos: TodoItem[] = [\n        { id: '1', text: 'Learn React', completed: true },\n        { id: '2', text: 'Build an app', completed: false },\n        { id: '3', text: 'Deploy to production', completed: false },\n    ];\n\n    const handleTodoAdded = (todo: TodoItem) => {\n        console.log('New todo added:', todo);\n    };\n\n    return (\n        <div className=\"app\">\n            <header className=\"app-header\">\n                <h1>{title}</h1>\n            </header>\n\n            <main className=\"app-content\">\n                <Todo\n                    initialTodos={initialTodos}\n                    onTodoAdded={handleTodoAdded}\n                    title=\"My Tasks\"\n                />\n\n                {showRecursiveExamples && (\n                    <div className=\"recursive-examples-container\">\n                        <h2>Recursive Examples</h2>\n                        <RecursiveExamples />\n                    </div>\n                )}\n            </main>\n\n            <footer className=\"app-footer\">\n                <p>Created with React</p>\n            </footer>\n        </div>\n    );\n};\n\nexport default App;\n",
    "childComponents": [
      {
        "name": "Todo",
        "description": "A component for managing a list of todo items",
        "props": [
          {
            "name": "initialTodos",
            "type": "TodoItem[]",
            "required": false,
            "defaultValue": "[]",
            "description": "Initial todo items to display"
          },
          {
            "name": "onTodoAdded",
            "type": "((todo: TodoItem) => void)",
            "required": false,
            "description": "Callback triggered when a todo item is added"
          },
          {
            "name": "title",
            "type": "string",
            "required": false,
            "defaultValue": "Todo List",
            "description": "Title of the todo list"
          }
        ],
        "filePath": "examples/Todo.tsx",
        "sourceCode": "import React, { useState } from 'react';\nimport TodoItem from './TodoItem';\n\n/**\n * Todo list component that displays a list of tasks\n */\ninterface TodoProps {\n    /**\n     * Initial todo items to display\n     */\n    initialTodos?: TodoItem[];\n\n    /**\n     * Callback triggered when a todo item is added\n     */\n    onTodoAdded?: (todo: TodoItem) => void;\n\n    /**\n     * Title of the todo list\n     */\n    title?: string;\n}\n\nexport interface TodoItem {\n    id: string;\n    text: string;\n    completed: boolean;\n}\n\n/**\n * A component for managing a list of todo items\n */\nconst Todo: React.FC<TodoProps> = ({\n    initialTodos = [],\n    onTodoAdded,\n    title = 'Todo List'\n}) => {\n    const [todos, setTodos] = useState<TodoItem[]>(initialTodos);\n    const [newTodoText, setNewTodoText] = useState('');\n\n    const handleAddTodo = () => {\n        if (!newTodoText.trim()) return;\n\n        const newTodo: TodoItem = {\n            id: Date.now().toString(),\n            text: newTodoText,\n            completed: false\n        };\n\n        setTodos([...todos, newTodo]);\n        setNewTodoText('');\n\n        if (onTodoAdded) {\n            onTodoAdded(newTodo);\n        }\n    };\n\n    const handleToggleTodo = (id: string) => {\n        setTodos(\n            todos.map(todo =>\n                todo.id === id ? { ...todo, completed: !todo.completed } : todo\n            )\n        );\n    };\n\n    const handleDeleteTodo = (id: string) => {\n        setTodos(todos.filter(todo => todo.id !== id));\n    };\n\n    return (\n        <div className=\"todo-container\">\n            <h2>{title}</h2>\n\n            <div className=\"todo-input\">\n                <input\n                    type=\"text\"\n                    value={newTodoText}\n                    onChange={e => setNewTodoText(e.target.value)}\n                    placeholder=\"Add a new task\"\n                />\n                <button onClick={handleAddTodo}>Add</button>\n            </div>\n\n            <ul className=\"todo-list\">\n                {todos.map(todo => (\n                    <TodoItem\n                        key={todo.id}\n                        todo={todo}\n                        onToggle={() => handleToggleTodo(todo.id)}\n                        onDelete={() => handleDeleteTodo(todo.id)}\n                    />\n                ))}\n            </ul>\n\n            <div className=\"todo-summary\">\n                <p>{todos.filter(todo => todo.completed).length} of {todos.length} tasks completed</p>\n            </div>\n        </div>\n    );\n};\n\nexport default Todo;\n",
        "childComponents": [
          {
            "name": "TodoItem",
            "description": "Component that displays a single todo item with controls to toggle completion or delete",
            "props": [
              {
                "name": "todo",
                "type": "TodoItem",
                "required": true,
                "description": "The todo item to display"
              },
              {
                "name": "onToggle",
                "type": "() => void",
                "required": true,
                "description": "Callback triggered when the todo completion status is toggled"
              },
              {
                "name": "onDelete",
                "type": "() => void",
                "required": true,
                "description": "Callback triggered when the todo is deleted"
              }
            ],
            "filePath": "examples/TodoItem.tsx",
            "sourceCode": "import React from 'react';\nimport { TodoItem as TodoItemType } from './Todo';\n\n/**\n * Props for the TodoItem component\n */\ninterface TodoItemProps {\n    /**\n     * The todo item to display\n     */\n    todo: TodoItemType;\n\n    /**\n     * Callback triggered when the todo completion status is toggled\n     */\n    onToggle: () => void;\n\n    /**\n     * Callback triggered when the todo is deleted\n     */\n    onDelete: () => void;\n}\n\n/**\n * Component that displays a single todo item with controls to toggle completion or delete\n */\nconst TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {\n    return (\n        <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>\n            <div className=\"todo-content\">\n                <input\n                    type=\"checkbox\"\n                    checked={todo.completed}\n                    onChange={onToggle}\n                    className=\"todo-checkbox\"\n                />\n                <span className=\"todo-text\">{todo.text}</span>\n            </div>\n            <button\n                className=\"todo-delete\"\n                onClick={onDelete}\n                aria-label=\"Delete todo\"\n            >\n                Delete\n            </button>\n        </li>\n    );\n};\n\nexport default TodoItem;\n",
            "childComponents": []
          }
        ],
        "methods": [
          {
            "name": "handleAddTodo",
            "description": "Handler for AddTodo event",
            "params": [],
            "returnType": "void"
          },
          {
            "name": "handleToggleTodo",
            "description": "Handler for ToggleTodo event",
            "params": [
              {
                "name": "id",
                "type": "string",
                "description": ""
              }
            ],
            "returnType": "void"
          },
          {
            "name": "handleDeleteTodo",
            "description": "Handler for DeleteTodo event",
            "params": [
              {
                "name": "id",
                "type": "string",
                "description": ""
              }
            ],
            "returnType": "void"
          }
        ]
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
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
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
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
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
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
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
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
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
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
          }
        ]
      },
      {
        "name": "RecursiveExamples",
        "description": "",
        "props": [],
        "filePath": "examples/RecursiveExamples.tsx",
        "sourceCode": "import React, { useState } from 'react';\n\n/**\n * TypeScript recursive data structure examples\n */\n\n// Recursive type definition for nested comment structure\nexport interface Comment {\n    id: string;\n    text: string;\n    author: string;\n    replies: Comment[];\n}\n\n// Recursive type for tree node\nexport interface TreeNode<T> {\n    value: T;\n    children: TreeNode<T>[];\n}\n\n/**\n * Recursive functions in TypeScript\n */\n\n// Simple factorial calculation with recursion\nexport function factorial(n: number): number {\n    // Base case\n    if (n <= 1) return 1;\n    // Recursive case\n    return n * factorial(n - 1);\n}\n\n// Fibonacci calculation with recursion and memoization\nexport function fibonacci(n: number, memo: Record<number, number> = {}): number {\n    if (n in memo) return memo[n];\n    if (n <= 1) return n;\n\n    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n    return memo[n];\n}\n\n// Recursive function to calculate the sum of all numbers in a nested array\nexport function sumNestedArray(arr: any[]): number {\n    let sum = 0;\n\n    for (const item of arr) {\n        if (Array.isArray(item)) {\n            // Recursion within recursion - we recursively process nested arrays\n            sum += sumNestedArray(item);\n        } else if (typeof item === 'number') {\n            sum += item;\n        }\n    }\n\n    return sum;\n}\n\n// Recursive tree traversal - depth-first search\nexport function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {\n    // Process current node\n    callback(node.value);\n\n    // Recursively process all children\n    for (const child of node.children) {\n        depthFirstTraversal(child, callback);\n    }\n}\n\n/**\n * Recursive class implementation in TypeScript\n */\nexport class RecursiveTreeProcessor<T> {\n    private root: TreeNode<T>;\n\n    constructor(root: TreeNode<T>) {\n        this.root = root;\n    }\n\n    // Method that uses recursion\n    public findNodeByValue(value: T): TreeNode<T> | null {\n        return this.findNodeRecursive(this.root, value);\n    }\n\n    // Private recursive helper method\n    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {\n        // Base case - found the node\n        if (node.value === value) return node;\n\n        // Recursive case - search in children\n        for (const child of node.children) {\n            const result = this.findNodeRecursive(child, value);\n            if (result) return result;\n        }\n\n        return null;\n    }\n\n    // Another recursive method that transforms the tree\n    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {\n        return this.mapNodeRecursive(this.root, mapFn);\n    }\n\n    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {\n        return {\n            value: mapFn(node.value),\n            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))\n        };\n    }\n}\n\n/**\n * React component that demonstrates recursive rendering\n */\nexport const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {\n    const renderComment = (comment: Comment) => (\n        <div key={comment.id} className=\"comment\">\n            <div className=\"comment-header\">\n                <span className=\"author\">{comment.author}</span>\n            </div>\n            <div className=\"comment-text\">{comment.text}</div>\n\n            {/* Recursive rendering of replies */}\n            {comment.replies.length > 0 && (\n                <div className=\"comment-replies\">\n                    {comment.replies.map(reply => renderComment(reply))}\n                </div>\n            )}\n        </div>\n    );\n\n    return (\n        <div className=\"comment-thread\">\n            {comments.map(comment => renderComment(comment))}\n        </div>\n    );\n};\n\n/**\n * JavaScript examples with recursion (using JS syntax, no types)\n */\n\n// Deep object clone with recursion\nexport function deepClone<T>(obj: T): T {\n    if (obj === null || typeof obj !== 'object') {\n        return obj;\n    }\n\n    if (Array.isArray(obj)) {\n        return obj.map(item => deepClone(item)) as unknown as T;\n    }\n\n    const clonedObj: Record<string, any> = {};\n    for (const key in obj) {\n        if (Object.prototype.hasOwnProperty.call(obj, key)) {\n            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);\n        }\n    }\n\n    return clonedObj as T;\n}\n\n// Recursive DOM traversal example in JavaScript\nexport function traverseDOM(element: Element, callback: (el: Element) => void): void {\n    // Process current element\n    callback(element);\n\n    // Recursively process all child nodes\n    Array.from(element.childNodes).forEach(child => {\n        if (child.nodeType === Node.ELEMENT_NODE) {\n            traverseDOM(child as Element, callback);\n        }\n    });\n}\n\n// Recursive promise chain\nexport function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {\n    if (index >= actions.length) {\n        return Promise.resolve();\n    }\n\n    return Promise...\n// (code truncated for brevity)",
        "childComponents": [],
        "methods": [
          {
            "name": "runRecursiveExample",
            "description": "",
            "params": [],
            "returnType": "void"
          }
        ]
      }
    ],
    "methods": [
      {
        "name": "handleTodoAdded",
        "description": "Handler for TodoAdded event",
        "params": [
          {
            "name": "todo",
            "type": "TodoItem",
            "description": ""
          }
        ],
        "returnType": "void"
      }
    ]
  }
];