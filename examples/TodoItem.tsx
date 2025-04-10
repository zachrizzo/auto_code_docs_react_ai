import React from 'react';
import { TodoItem as TodoItemType } from './Todo';

/**
 * Props for the TodoItem component
 */
interface TodoItemProps {
    /**
     * The todo item to display
     */
    todo: TodoItemType;

    /**
     * Callback triggered when the todo completion status is toggled
     */
    onToggle: () => void;

    /**
     * Callback triggered when the todo is deleted
     */
    onDelete: () => void;
}

/**
 * Component that displays a single todo item with controls to toggle completion or delete
 */
const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
    return (
        <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <div className="todo-content">
                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={onToggle}
                    className="todo-checkbox"
                />
                <span className="todo-text">{todo.text}</span>
            </div>
            <button
                className="todo-delete"
                onClick={onDelete}
                aria-label="Delete todo"
            >
                Delete
            </button>
        </li>
    );
};

export default TodoItem;
