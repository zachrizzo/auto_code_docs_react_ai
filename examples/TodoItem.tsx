import React, { useState } from 'react';
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

    /**
     * Callback triggered when the todo priority is updated
     */
    onUpdatePriority: (priority: 'low' | 'medium' | 'high') => void;

    /**
     * Callback triggered when the todo category is updated
     */
    onUpdateCategory: (category: string) => void;

    /**
     * Callback triggered when the todo due date is updated
     */
    onUpdateDueDate: (dueDate: string) => void;

    /**
     * Callback triggered when notes are added to the todo
     */
    onAddNotes: (notes: string) => void;

    /**
     * Available categories
     */
    categories: string[];
}

/**
 * Component that displays a single todo item with controls to toggle completion or delete
 */
const TodoItem: React.FC<TodoItemProps> = ({
    todo,
    onToggle,
    onDelete,
    onUpdatePriority,
    onUpdateCategory,
    onUpdateDueDate,
    onAddNotes,
    categories
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [notes, setNotes] = useState(todo.notes || '');

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Check if task is overdue
    const isOverdue = () => {
        if (!todo.dueDate || todo.completed) return false;
        return new Date(todo.dueDate) < new Date();
    };

    // Handle notes update
    const handleNotesUpdate = () => {
        onAddNotes(notes);
        setIsExpanded(false);
    };

    const priorityColors = {
        low: '#4caf50',      // Green
        medium: '#ff9800',   // Orange
        high: '#f44336'      // Red
    };

    return (
        <li className={`todo-item ${todo.completed ? 'completed' : ''} ${isOverdue() ? 'overdue' : ''} priority-${todo.priority || 'medium'}`}>
            <div className="todo-item-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="todo-content">
                    <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={onToggle}
                        className="todo-checkbox"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div className="todo-main-content">
                        <span className="todo-text">{todo.text}</span>

                        <div className="todo-metadata">
                            {todo.category && (
                                <span className="todo-category">{todo.category}</span>
                            )}

                            {todo.dueDate && (
                                <span className={`todo-due-date ${isOverdue() ? 'overdue' : ''}`}>
                                    Due: {formatDate(todo.dueDate)}
                                </span>
                            )}

                            <span
                                className="todo-priority"
                                style={{ backgroundColor: priorityColors[todo.priority || 'medium'] }}
                            >
                                {todo.priority || 'medium'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="todo-actions">
                    <button
                        className="todo-expand-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        {isExpanded ? '▲' : '▼'}
                    </button>

                    <button
                        className="todo-delete-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        aria-label="Delete todo"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="todo-details">
                    <div className="todo-detail-row">
                        <label>Priority:</label>
                        <select
                            value={todo.priority || 'medium'}
                            onChange={(e) => onUpdatePriority(e.target.value as 'low' | 'medium' | 'high')}
                            className="todo-priority-select"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div className="todo-detail-row">
                        <label>Category:</label>
                        <select
                            value={todo.category || 'work'}
                            onChange={(e) => onUpdateCategory(e.target.value)}
                            className="todo-category-select"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="todo-detail-row">
                        <label>Due Date:</label>
                        <input
                            type="date"
                            value={todo.dueDate || ''}
                            onChange={(e) => onUpdateDueDate(e.target.value)}
                            className="todo-due-date-input"
                        />
                    </div>

                    <div className="todo-detail-row">
                        <label>Notes:</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="todo-notes-input"
                            placeholder="Add notes here..."
                        />
                        <button
                            onClick={handleNotesUpdate}
                            className="todo-save-notes-button"
                        >
                            Save Notes
                        </button>
                    </div>

                    <div className="todo-detail-row">
                        <label>Created:</label>
                        <span>{formatDate(todo.createdAt)}</span>
                    </div>
                </div>
            )}
        </li>
    );
};

export default TodoItem;
