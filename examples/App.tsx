import React, { useState } from 'react';
import Todo, { TodoItem } from './Todo';
import RecursiveExamples from './RecursiveExamples';
import HealthcareDashboard from './HealthcareDashboard';

/**
 * Props for the main App component
 */
interface AppProps {
    /**
     * The title of the app
     */
    title?: string;

    /**
     * Whether to show recursive examples
     */
    showRecursiveExamples?: boolean;

    /**
     * Whether to show the healthcare dashboard
     */
    showHealthcareDashboard?: boolean;

    /**
     * Dark mode setting for all components
     */
    darkMode?: boolean;
}

/**
 * Main application component that demonstrates various React features
 */
const App: React.FC<AppProps> = ({
    title = 'React Example Application',
    showRecursiveExamples = false,
    showHealthcareDashboard = true,
    darkMode = false
}) => {
    const [todos, setTodos] = useState<TodoItem[]>([
        {
            id: '1',
            text: 'Learn React',
            completed: true,
            priority: 'high',
            category: 'work',
            dueDate: '2023-06-15',
            createdAt: '2023-06-01'
        },
        {
            id: '2',
            text: 'Build an app',
            completed: false,
            priority: 'medium',
            category: 'personal',
            dueDate: '2023-07-01',
            createdAt: '2023-06-01'
        },
        {
            id: '3',
            text: 'Deploy to production',
            completed: false,
            priority: 'low',
            category: 'work',
            createdAt: '2023-06-01'
        }
    ]);

    const [activeTab, setActiveTab] = useState<'todo' | 'recursive' | 'healthcare'>('todo');

    const handleTodoAdded = (todo: TodoItem) => {
        setTodos([...todos, todo]);
    };

    return (
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            <header className="app-header">
                <h1>{title}</h1>
                <div className="app-tabs">
                    <button
                        className={activeTab === 'todo' ? 'active' : ''}
                        onClick={() => setActiveTab('todo')}
                    >
                        Todo App
                    </button>

                    {showRecursiveExamples && (
                        <button
                            className={activeTab === 'recursive' ? 'active' : ''}
                            onClick={() => setActiveTab('recursive')}
                        >
                            Recursive Examples
                        </button>
                    )}

                    {showHealthcareDashboard && (
                        <button
                            className={activeTab === 'healthcare' ? 'active' : ''}
                            onClick={() => setActiveTab('healthcare')}
                        >
                            Healthcare Dashboard
                        </button>
                    )}
                </div>
            </header>

            <main className="app-content">
                {activeTab === 'todo' && (
                    <div className="todo-section">
                        <Todo
                            initialTodos={todos}
                            onTodoAdded={handleTodoAdded}
                            title="My Task List"
                            darkMode={darkMode}
                            enableStorage={true}
                        />
                    </div>
                )}

                {activeTab === 'recursive' && showRecursiveExamples && (
                    <div className="recursive-section">
                        <RecursiveExamples />
                    </div>
                )}

                {activeTab === 'healthcare' && showHealthcareDashboard && (
                    <div className="healthcare-section">
                        <HealthcareDashboard
                            adminMode={true}
                            currentUser="Dr. Demo User"
                        />
                    </div>
                )}
            </main>

            <footer className="app-footer">
                <p>Example React Application with Vector Similarity Testing</p>
            </footer>
        </div>
    );
};

export default App;
