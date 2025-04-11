import React from 'react';

interface EmptyStateProps {
    type: 'no-results' | 'no-data' | 'empty-graph';
    message: string;
    suggestion: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, message, suggestion }) => {
    const icons = {
        'no-results': (
            <svg className="w-12 h-12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        ),
        'no-data': (
            <svg className="w-12 h-12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
        ),
        'empty-graph': (
            <svg className="w-12 h-12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
            </svg>
        ),
    };

    return (
        <div className={`no-results ${type}`}>
            <div className="empty-state-icon">
                {icons[type]}
            </div>
            <h3 className="empty-state-message">{message}</h3>
            <p className="empty-state-suggestion">{suggestion}</p>
        </div>
    );
};
