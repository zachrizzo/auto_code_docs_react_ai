import React from 'react';
import App from './App';
import Todo, { TodoItem as TodoItemType } from './Todo';
import TodoItem from './TodoItem';
import RecursiveExamples, {
    factorial,
    fibonacci as recursiveExamplesFibonacci,
    sumNestedArray,
    depthFirstTraversal,
    RecursiveTreeProcessor,
    CommentThread,
    deepClone,
    traverseDOM,
    recursivePromiseChain,
    Comment,
    TreeNode
} from './RecursiveExamples';
import UseRecursiveExamples from './UseRecursiveExamples';
import FibonacciExample, { fibonacci } from './Fibonacci';

/**
 * This component brings together all the components, functions and examples
 * for documentation generation purposes.
 */
const DocumentAll: React.FC = () => {
    // Create demo data for examples
    const demoTree: TreeNode<string> = {
        value: 'root',
        children: [{ value: 'child', children: [] }]
    };

    const demoComments: Comment[] = [
        { id: '1', text: 'Example comment', author: 'User', replies: [] }
    ];

    // This component is never actually rendered, it just exists to document everything
    return (
        <div>
            <h1>Documentation Components</h1>

            {/* Standard App Components */}
            <App title="Example App" showRecursiveExamples={true} />
            <Todo
                initialTodos={[{ id: '1', text: 'Test Todo', completed: false }]}
                onTodoAdded={(todo) => console.log(todo)}
                title="Example Todos"
            />
            <TodoItem
                todo={{ id: '1', text: 'Test Todo', completed: false }}
                onToggle={() => { }}
                onDelete={() => { }}
            />

            {/* Recursive Examples */}
            <RecursiveExamples />
            <UseRecursiveExamples />
            <CommentThread comments={demoComments} />
            <FibonacciExample />

            {/* These would normally be hidden, but included for documentation */}
            <div style={{ display: 'none' }}>
                <h2>Recursive Functions (TypeScript)</h2>
                <p>{`factorial(5) = ${factorial(5)}`}</p>

                {/* Make sure fibonacci is properly documented with explicit implementation */}
                <div id="fibonacci-example">
                    <h3>Fibonacci Function</h3>
                    <p>{`Imported fibonacci(10) = ${fibonacci(10)}`}</p>
                    <p>{`RecursiveExamples fibonacci(10) = ${recursiveExamplesFibonacci(10)}`}</p>
                    <pre>
                        {`
// Fibonacci calculation with recursion and memoization
export function fibonacci(n: number, memo: Record<number, number> = {}): number {
    if (n in memo) return memo[n];
    if (n <= 1) return n;

    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}
                        `}
                    </pre>
                </div>

                <p>{`sumNestedArray([1, [2, 3]]) = ${sumNestedArray([1, [2, 3]])}`}</p>

                <h2>Hospital Test JavaScript</h2>
                <div id="hospital-examples">
                    {(() => {
                        // Sample patient data
                        const patient = {
                            id: 'P1001',
                            name: 'John Doe',
                            roomCharge: 500,
                            procedures: [
                                { name: 'X-Ray', cost: 250 },
                                { name: 'Blood Test', cost: 100 }
                            ],
                            medications: [
                                { name: 'Antibiotic', cost: 75 },
                                { name: 'Pain Reliever', cost: 25 }
                            ]
                        };

                        // Sample hospital hierarchy
                        const hospital = {
                            type: 'hospital',
                            name: 'General Hospital',
                            children: [
                                {
                                    type: 'floor',
                                    name: 'Floor 1',
                                    children: [
                                        {
                                            type: 'room',
                                            name: 'Room 101',
                                            children: [
                                                { type: 'patient', id: 'P1001', name: 'John Doe' }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        };

                        // Sample org chart data
                        const orgChart = {
                            name: 'Dr. Smith',
                            role: 'Chief of Medicine',
                            subordinates: [
                                {
                                    name: 'Dr. Johnson',
                                    role: 'Head of Surgery',
                                    subordinates: [
                                        { name: 'Dr. Williams', role: 'Surgeon', subordinates: [] }
                                    ]
                                },
                                {
                                    name: 'Dr. Brown',
                                    role: 'Head of Pediatrics',
                                    subordinates: []
                                }
                            ]
                        };

                        return (
                            <>
                                <h3>Calculate Patient Cost</h3>
                                <p>{`Patient: ${patient.name}`}</p>
                                <p>{`Total Cost: $${calculatePatientCost(patient)}`}</p>

                                <h3>Find Patient</h3>
                                <p>{`Found patient: ${findPatient(hospital, 'P1001')?.name || 'Not found'}`}</p>

                                <h3>Hospital Organization Chart</h3>
                                <pre>{buildHospitalOrgChart(orgChart)}</pre>
                            </>
                        );
                    })()}
                </div>

                <h2>Recursive Classes</h2>
                {(() => {
                    const processor = new RecursiveTreeProcessor(demoTree);
                    const mappedTree = processor.mapTree(val => val.toUpperCase());
                    return <p>Tree processor example</p>;
                })()}

                <h2>JavaScript Examples</h2>
                <p>deepClone example</p>
                <p>traverseDOM example</p>
                <p>recursivePromiseChain example</p>
            </div>
        </div>
    );
};

/**
 * Hospital data recursive function examples
 */

/**
 * A recursive function to calculate the total cost of a patient's stay
 * including all procedures, medications, and room charges
 */
export function calculatePatientCost(patient: any): number {
    let totalCost = patient.roomCharge || 0;

    // Add procedure costs
    if (patient.procedures && Array.isArray(patient.procedures)) {
        totalCost += patient.procedures.reduce((acc: number, proc: any) =>
            acc + proc.cost, 0);
    }

    // Add medication costs
    if (patient.medications && Array.isArray(patient.medications)) {
        totalCost += patient.medications.reduce((acc: number, med: any) =>
            acc + med.cost, 0);
    }

    return totalCost;
}

/**
 * Recursive function to find a patient in a hospital hierarchy (floors, wings, rooms)
 */
export function findPatient(hospital: any, patientId: string): any {
    // Base case - if this is a patient object
    if (hospital.type === 'patient' && hospital.id === patientId) {
        return hospital;
    }

    // If this is a floor, wing, or room with children
    if (hospital.children && Array.isArray(hospital.children)) {
        for (const child of hospital.children) {
            const result = findPatient(child, patientId);
            if (result) return result;
        }
    }

    return null;
}

/**
 * Recursively build a hospital organizational chart
 */
export function buildHospitalOrgChart(department: any): string {
    let chart = `${department.name} (${department.role})\n`;

    if (department.subordinates && Array.isArray(department.subordinates)) {
        department.subordinates.forEach((staff: any) => {
            // Recursive call with indentation for each level
            const subChart = buildHospitalOrgChart(staff)
                .split('\n')
                .map(line => `  ${line}`)
                .join('\n');
            chart += `${subChart}\n`;
        });
    }

    return chart.trim();
}

export default DocumentAll;
