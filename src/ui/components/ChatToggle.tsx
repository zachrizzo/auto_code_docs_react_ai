import React, { useState } from 'react';
import { AiChat } from './AiChat';
import { Button } from './ui/button';

interface ChatToggleProps {
    className?: string;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ className = '' }) => {
    const [showChat, setShowChat] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                onClick={() => setShowChat(!showChat)}
                className={`fixed bottom-6 right-6 z-40 shadow-md hover:shadow-lg transition-all duration-200 rounded-full w-12 h-12 ${className}`}
                aria-label="Toggle AI Chat"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
                    <path d="M8 10.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 14H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M17 3.33782C15.5291 2.48697 13.8214 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22C17.5228 22 22 17.5228 22 12C22 10.1786 21.513 8.47087 20.6622 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </Button>

            {showChat && (
                <div className="fixed bottom-24 right-6 z-50">
                    <AiChat onClose={() => setShowChat(false)} />
                </div>
            )}
        </>
    );
};
