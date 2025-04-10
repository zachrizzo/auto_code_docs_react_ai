import React, { useState } from 'react';

/**
 * TypeScript recursive data structure examples
 */

// Recursive type definition for nested comment structure
export interface Comment {
    id: string;
    text: string;
    author: string;
    replies: Comment[];
}

// Recursive type for tree node
export interface TreeNode<T> {
    value: T;
    children: TreeNode<T>[];
}

/**
 * Recursive functions in TypeScript
 */

// Simple factorial calculation with recursion
export function factorial(n: number): number {
    // Base case
    if (n <= 1) return 1;
    // Recursive case
    return n * factorial(n - 1);
}

// Fibonacci calculation with recursion and memoization
export function fibonacci(n: number, memo: Record<number, number> = {}): number {
    if (n in memo) return memo[n];
    if (n <= 1) return n;

    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}

// Recursive function to calculate the sum of all numbers in a nested array
export function sumNestedArray(arr: any[]): number {
    let sum = 0;

    for (const item of arr) {
        if (Array.isArray(item)) {
            // Recursion within recursion - we recursively process nested arrays
            sum += sumNestedArray(item);
        } else if (typeof item === 'number') {
            sum += item;
        }
    }

    return sum;
}

// Recursive tree traversal - depth-first search
export function depthFirstTraversal<T>(node: TreeNode<T>, callback: (value: T) => void): void {
    // Process current node
    callback(node.value);

    // Recursively process all children
    for (const child of node.children) {
        depthFirstTraversal(child, callback);
    }
}

/**
 * Recursive class implementation in TypeScript
 */
export class RecursiveTreeProcessor<T> {
    private root: TreeNode<T>;

    constructor(root: TreeNode<T>) {
        this.root = root;
    }

    // Method that uses recursion
    public findNodeByValue(value: T): TreeNode<T> | null {
        return this.findNodeRecursive(this.root, value);
    }

    // Private recursive helper method
    private findNodeRecursive(node: TreeNode<T>, value: T): TreeNode<T> | null {
        // Base case - found the node
        if (node.value === value) return node;

        // Recursive case - search in children
        for (const child of node.children) {
            const result = this.findNodeRecursive(child, value);
            if (result) return result;
        }

        return null;
    }

    // Another recursive method that transforms the tree
    public mapTree<U>(mapFn: (value: T) => U): TreeNode<U> {
        return this.mapNodeRecursive(this.root, mapFn);
    }

    private mapNodeRecursive<U>(node: TreeNode<T>, mapFn: (value: T) => U): TreeNode<U> {
        return {
            value: mapFn(node.value),
            children: node.children.map(child => this.mapNodeRecursive(child, mapFn))
        };
    }
}

/**
 * React component that demonstrates recursive rendering
 */
export const CommentThread: React.FC<{ comments: Comment[] }> = ({ comments }) => {
    const renderComment = (comment: Comment) => (
        <div key={comment.id} className="comment">
            <div className="comment-header">
                <span className="author">{comment.author}</span>
            </div>
            <div className="comment-text">{comment.text}</div>

            {/* Recursive rendering of replies */}
            {comment.replies.length > 0 && (
                <div className="comment-replies">
                    {comment.replies.map(reply => renderComment(reply))}
                </div>
            )}
        </div>
    );

    return (
        <div className="comment-thread">
            {comments.map(comment => renderComment(comment))}
        </div>
    );
};

/**
 * JavaScript examples with recursion (using JS syntax, no types)
 */

// Deep object clone with recursion
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as unknown as T;
    }

    const clonedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = deepClone((obj as Record<string, any>)[key]);
        }
    }

    return clonedObj as T;
}

// Recursive DOM traversal example in JavaScript
export function traverseDOM(element: Element, callback: (el: Element) => void): void {
    // Process current element
    callback(element);

    // Recursively process all child nodes
    Array.from(element.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            traverseDOM(child as Element, callback);
        }
    });
}

// Recursive promise chain
export function recursivePromiseChain(actions: (() => Promise<any>)[], index = 0): Promise<void> {
    if (index >= actions.length) {
        return Promise.resolve();
    }

    return Promise.resolve()
        .then(() => actions[index]())
        .then(() => recursivePromiseChain(actions, index + 1));
}

// Example usage component
const RecursiveExamples: React.FC = () => {
    const [result, setResult] = useState<string>('');

    // Example tree data
    const sampleTree: TreeNode<string> = {
        value: 'root',
        children: [
            {
                value: 'child1',
                children: [
                    { value: 'grandchild1', children: [] },
                    { value: 'grandchild2', children: [] }
                ]
            },
            {
                value: 'child2',
                children: []
            }
        ]
    };

    // Example nested comments
    const sampleComments: Comment[] = [
        {
            id: '1',
            text: 'This is a parent comment',
            author: 'User1',
            replies: [
                {
                    id: '2',
                    text: 'This is a reply',
                    author: 'User2',
                    replies: [
                        {
                            id: '3',
                            text: 'This is a nested reply',
                            author: 'User3',
                            replies: []
                        }
                    ]
                }
            ]
        }
    ];

    // Example nested array for sumNestedArray
    const nestedArray = [1, 2, [3, 4, [5, 6]], 7, [8, [9, 10]]];

    const runRecursiveExample = () => {
        // Calculate factorial of 5
        const fact5 = factorial(5);

        // Calculate 10th Fibonacci number
        const fib10 = fibonacci(10);

        // Sum the nested array
        const sum = sumNestedArray(nestedArray);

        // Process the tree
        const treeProcessor = new RecursiveTreeProcessor(sampleTree);
        const values: string[] = [];
        depthFirstTraversal(sampleTree, (val) => values.push(val));

        setResult(`
      Factorial of 5: ${fact5}
      Fibonacci(10): ${fib10}
      Sum of nested array: ${sum}
      Tree values: ${values.join(', ')}
    `);
    };

    return (
        <div className="recursive-examples">
            <h2>Recursive Function Examples</h2>

            <button onClick={runRecursiveExample}>Run Examples</button>

            {result && (
                <pre className="result">{result}</pre>
            )}

            <h3>Comment Thread Example (Recursive Component)</h3>
            <CommentThread comments={sampleComments} />
        </div>
    );
};

export default RecursiveExamples;
