import React, { useState, useEffect } from 'react';
import TodoItem from './TodoItem';

/**
 * Todo list component that displays a list of tasks
 */
interface TodoProps {
    /**
     * Initial todo items to display
     */
    initialTodos?: TodoItem[];

    /**
     * Callback triggered when a todo item is added
     */
    onTodoAdded?: (todo: TodoItem) => void;

    /**
     * Title of the todo list
     */
    title?: string;

    /**
     * Enable dark mode
     */
    darkMode?: boolean;

    /**
     * Enable persistent storage
     */
    enableStorage?: boolean;
}

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    notes?: string;
    createdAt: string;
}

/**
 * Available filter options for the todo list
 */
type FilterOption = 'all' | 'active' | 'completed' | 'high-priority';

/**
 * A component for managing a list of todo items with categories, priorities, and filters
 */
const Todo: React.FC<TodoProps> = ({
    initialTodos = [],
    onTodoAdded,
    title = 'Todo List',
    darkMode = false,
    enableStorage = false
}) => {
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoCategory, setNewTodoCategory] = useState('work');
    const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTodoDueDate, setNewTodoDueDate] = useState('');
    const [filter, setFilter] = useState<FilterOption>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories] = useState(['work', 'personal', 'shopping', 'health', 'other']);

    // Load todos from localStorage if enabled
    useEffect(() => {
        if (enableStorage) {
            const storedTodos = localStorage.getItem('todos');
            if (storedTodos) {
                setTodos(JSON.parse(storedTodos));
            } else {
                setTodos(initialTodos);
            }
        } else {
            setTodos(initialTodos);
        }
    }, [enableStorage, initialTodos]);

    // Save todos to localStorage when they change
    useEffect(() => {
        if (enableStorage && todos.length > 0) {
            localStorage.setItem('todos', JSON.stringify(todos));
        }
    }, [todos, enableStorage]);

    const handleAddTodo = () => {
        if (!newTodoText.trim()) return;

        const newTodo: TodoItem = {
            id: Date.now().toString(),
            text: newTodoText,
            completed: false,
            category: newTodoCategory,
            priority: newTodoPriority,
            dueDate: newTodoDueDate || undefined,
            createdAt: new Date().toISOString()
        };

        setTodos([...todos, newTodo]);
        setNewTodoText('');

        if (onTodoAdded) {
            onTodoAdded(newTodo);
        }
    };

    const handleToggleTodo = (id: string) => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            )
        );
    };

    const handleDeleteTodo = (id: string) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const handleUpdateTodoPriority = (id: string, priority: 'low' | 'medium' | 'high') => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, priority } : todo
            )
        );
    };

    const handleUpdateTodoCategory = (id: string, category: string) => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, category } : todo
            )
        );
    };

    const handleUpdateTodoDueDate = (id: string, dueDate: string) => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, dueDate } : todo
            )
        );
    };

    const handleAddNotes = (id: string, notes: string) => {
        setTodos(
            todos.map(todo =>
                todo.id === id ? { ...todo, notes } : todo
            )
        );
    };

    // Filter and search todos
    const filteredTodos = todos.filter(todo => {
        // First apply the category/status filter
        const matchesFilter =
            filter === 'all' ||
            (filter === 'active' && !todo.completed) ||
            (filter === 'completed' && todo.completed) ||
            (filter === 'high-priority' && todo.priority === 'high');

        // Then apply the search term
        const matchesSearch =
            searchTerm === '' ||
            todo.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (todo.category && todo.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (todo.notes && todo.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesFilter && matchesSearch;
    });

    // Get stats for the summary
    const completedCount = todos.filter(todo => todo.completed).length;
    const highPriorityCount = todos.filter(todo => todo.priority === 'high').length;
    const overdueCount = todos.filter(todo => {
        if (!todo.dueDate || todo.completed) return false;
        return new Date(todo.dueDate) < new Date();
    }).length;

    return (
        <div className={`todo-container ${darkMode ? 'dark-mode' : ''}`}>
            <h2>{title}</h2>

            <div className="todo-filters">
                <div className="search-box">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search todos..."
                        className="search-input"
                    />
                </div>

                <div className="filter-options">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}>
                        All
                    </button>
                    <button
                        className={filter === 'active' ? 'active' : ''}
                        onClick={() => setFilter('active')}>
                        Active
                    </button>
                    <button
                        className={filter === 'completed' ? 'active' : ''}
                        onClick={() => setFilter('completed')}>
                        Completed
                    </button>
                    <button
                        className={filter === 'high-priority' ? 'active' : ''}
                        onClick={() => setFilter('high-priority')}>
                        High Priority
                    </button>
                </div>
            </div>

            <div className="todo-input-panel">
                <div className="todo-input">
                    <input
                        type="text"
                        value={newTodoText}
                        onChange={e => setNewTodoText(e.target.value)}
                        placeholder="Add a new task"
                        className="todo-text-input"
                    />

                    <select
                        value={newTodoCategory}
                        onChange={e => setNewTodoCategory(e.target.value)}
                        className="todo-category-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={newTodoPriority}
                        onChange={e => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                        className="todo-priority-select"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>

                    <input
                        type="date"
                        value={newTodoDueDate}
                        onChange={e => setNewTodoDueDate(e.target.value)}
                        className="todo-date-input"
                    />

                    <button onClick={handleAddTodo} className="todo-add-button">Add</button>
                </div>
            </div>

            <ul className="todo-list">
                {filteredTodos.length === 0 ? (
                    <li className="empty-state">No tasks found</li>
                ) : (
                    filteredTodos.map(todo => (
                        <TodoItem
                            key={todo.id}
                            todo={todo}
                            onToggle={() => handleToggleTodo(todo.id)}
                            onDelete={() => handleDeleteTodo(todo.id)}
                            onUpdatePriority={(priority) => handleUpdateTodoPriority(todo.id, priority)}
                            onUpdateCategory={(category) => handleUpdateTodoCategory(todo.id, category)}
                            onUpdateDueDate={(dueDate) => handleUpdateTodoDueDate(todo.id, dueDate)}
                            onAddNotes={(notes) => handleAddNotes(todo.id, notes)}
                            categories={categories}
                        />
                    ))
                )}
            </ul>

            <div className="todo-summary">
                <p>{completedCount} of {todos.length} tasks completed</p>
                {highPriorityCount > 0 && (
                    <p>{highPriorityCount} high priority tasks</p>
                )}
                {overdueCount > 0 && (
                    <p className="overdue-warning">{overdueCount} overdue tasks</p>
                )}
            </div>
        </div>
    );
};

export default Todo;
