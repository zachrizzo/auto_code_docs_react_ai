import React from 'react';
import RecursiveExamples, {
    factorial,
    fibonacci,
    sumNestedArray,
    TreeNode,
    Comment,
    CommentThread,
    deepClone,
    RecursiveTreeProcessor,
    depthFirstTraversal
} from './RecursiveExamples';

/**
 * This file demonstrates how to use the recursive examples in a test environment
 */
const UseRecursiveExamples: React.FC = () => {
    // Section 1: Test recursive functions
    console.log('Testing recursive functions:');
    console.log(`Factorial of 5: ${factorial(5)}`);
    console.log(`Fibonacci of 10: ${fibonacci(10)}`);

    const nestedArray = [1, 2, [3, 4, [5, 6]], 7, [8, [9, 10]]];
    console.log(`Sum of nested array: ${sumNestedArray(nestedArray)}`);

    // Section 2: Test recursive tree operations
    console.log('\nTesting recursive tree operations:');

    // Create a sample tree
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
                children: [
                    { value: 'grandchild3', children: [] }
                ]
            }
        ]
    };

    // Use the recursive tree processor
    const treeProcessor = new RecursiveTreeProcessor(sampleTree);

    // Find a node by value
    const foundNode = treeProcessor.findNodeByValue('grandchild2');
    console.log('Found node:', foundNode ? foundNode.value : 'Not found');

    // Map the tree - convert all string values to uppercase
    const uppercaseTree = treeProcessor.mapTree(value => value.toUpperCase());
    console.log('Tree with uppercase values:');
    depthFirstTraversal(uppercaseTree, value => console.log(value));

    // Section 3: Test deep clone recursive function
    console.log('\nTesting deep clone:');
    const originalObj = {
        name: 'original',
        nested: {
            count: 42,
            items: [1, 2, 3]
        }
    };

    const clonedObj = deepClone(originalObj);

    // Modify the clone to show they're separate
    clonedObj.name = 'clone';
    clonedObj.nested.count = 100;
    clonedObj.nested.items.push(4);

    console.log('Original after clone modification:', originalObj);
    console.log('Cloned and modified object:', clonedObj);

    // Section 4: Test recursive promise chain
    const testPromiseChain = async () => {
        console.log('\nTesting recursive promise chain:');

        const actions = [
            () => new Promise<void>(resolve => {
                console.log('Step 1');
                resolve();
            }),
            () => new Promise<void>(resolve => {
                console.log('Step 2');
                resolve();
            }),
            () => new Promise<void>(resolve => {
                console.log('Step 3');
                resolve();
            })
        ];

        await import('./RecursiveExamples').then(module => {
            return module.recursivePromiseChain(actions);
        });

        console.log('All steps completed');
    };

    // Call the async function
    testPromiseChain().catch(err => console.error('Error in promise chain:', err));

    // Section 5: Create a sample comment thread for the UI component
    const sampleComments: Comment[] = [
        {
            id: '1',
            text: 'This is a top-level comment',
            author: 'User1',
            replies: [
                {
                    id: '2',
                    text: 'This is a reply to the top comment',
                    author: 'User2',
                    replies: [
                        {
                            id: '3',
                            text: 'This is a nested reply',
                            author: 'User3',
                            replies: [
                                {
                                    id: '4',
                                    text: 'This is a deeply nested reply',
                                    author: 'User4',
                                    replies: []
                                }
                            ]
                        }
                    ]
                },
                {
                    id: '5',
                    text: 'This is another direct reply to the top comment',
                    author: 'User5',
                    replies: []
                }
            ]
        },
        {
            id: '6',
            text: 'This is a second top-level comment',
            author: 'User6',
            replies: []
        }
    ];

    return (
        <div className="recursive-examples-usage">
            <h1>Recursive Examples Usage</h1>

            <section>
                <h2>Full Recursive Examples Component</h2>
                <RecursiveExamples />
            </section>

            <section>
                <h2>Just the Comment Thread Component</h2>
                <CommentThread comments={sampleComments} />
            </section>

            <section>
                <h2>Check console for more examples</h2>
                <p>Open your browser console to see the results of the recursive functions and operations.</p>
            </section>
        </div>
    );
};

export default UseRecursiveExamples;
