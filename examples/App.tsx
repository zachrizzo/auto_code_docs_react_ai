import React from 'react';
import Todo, { TodoItem } from './Todo';
import RecursiveExamples from './RecursiveExamples';

/**
 * Props for the App component
 */
interface AppProps {
    /**
     * Title for the application
     */
    title?: string;

    /**
     * Whether to show recursive examples
     */
    showRecursiveExamples?: boolean;
}

/**
 * Main application component that serves as the entry point
 */
const App: React.FC<AppProps> = ({
    title = 'My Todo App',
    showRecursiveExamples = false
}) => {
    const initialTodos: TodoItem[] = [
        { id: '1', text: 'Learn React', completed: true },
        { id: '2', text: 'Build an app', completed: false },
        { id: '3', text: 'Deploy to production', completed: false },
    ];

    const handleTodoAdded = (todo: TodoItem) => {
        console.log('New todo added:', todo);
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>{title}</h1>
            </header>

            <main className="app-content">
                <Todo
                    initialTodos={initialTodos}
                    onTodoAdded={handleTodoAdded}
                    title="My Tasks"
                />

                {showRecursiveExamples && (
                    <div className="recursive-examples-container">
                        <h2>Recursive Examples</h2>
                        <RecursiveExamples />
                    </div>
                )}
            </main>

            <footer className="app-footer">
                <p>Created with React</p>
            </footer>
        </div>
    );
};

export default App;
