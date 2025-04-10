import React, { useState } from 'react';
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
}

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

/**
 * A component for managing a list of todo items
 */
const Todo: React.FC<TodoProps> = ({
    initialTodos = [],
    onTodoAdded,
    title = 'Todo List'
}) => {
    const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
    const [newTodoText, setNewTodoText] = useState('');

    const handleAddTodo = () => {
        if (!newTodoText.trim()) return;

        const newTodo: TodoItem = {
            id: Date.now().toString(),
            text: newTodoText,
            completed: false
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

    return (
        <div className="todo-container">
            <h2>{title}</h2>

            <div className="todo-input">
                <input
                    type="text"
                    value={newTodoText}
                    onChange={e => setNewTodoText(e.target.value)}
                    placeholder="Add a new task"
                />
                <button onClick={handleAddTodo}>Add</button>
            </div>

            <ul className="todo-list">
                {todos.map(todo => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={() => handleToggleTodo(todo.id)}
                        onDelete={() => handleDeleteTodo(todo.id)}
                    />
                ))}
            </ul>

            <div className="todo-summary">
                <p>{todos.filter(todo => todo.completed).length} of {todos.length} tasks completed</p>
            </div>
        </div>
    );
};

export default Todo;
