import React from 'react';

/**
 * Fibonacci number calculator using recursion with memoization
 *
 * @param n The position in fibonacci sequence to calculate
 * @param memo Optional memoization object to improve performance
 * @returns The fibonacci number at position n
 */
export function fibonacci(n: number, memo: Record<number, number> = {}): number {
    // Base cases
    if (n in memo) return memo[n];
    if (n <= 1) return n;

    // Recursive case with memoization
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}

/**
 * Component that demonstrates the fibonacci sequence calculation
 */
const FibonacciExample: React.FC = () => {
    // Calculate first 10 fibonacci numbers
    const fibNumbers = Array.from({ length: 10 }, (_, i) => fibonacci(i));

    return (
        <div className="fibonacci-example">
            <h2>Fibonacci Sequence</h2>
            <p>The fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones.</p>

            <h3>First 10 Fibonacci Numbers:</h3>
            <ul>
                {fibNumbers.map((num, index) => (
                    <li key={index}>
                        F({index}) = {num}
                    </li>
                ))}
            </ul>

            <h3>Implementation:</h3>
            <pre>
                {`
/**
 * Fibonacci number calculator using recursion with memoization
 */
function fibonacci(n: number, memo: Record<number, number> = {}): number {
    // Base cases
    if (n in memo) return memo[n];
    if (n <= 1) return n;

    // Recursive case with memoization
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}
                `}
            </pre>
        </div>
    );
};

export default FibonacciExample;
