import React from 'react';
import { AppWithProviders } from './ui/components/App';

/**
 * Main entry point for the application
 * This file simply imports and exports the App component from the ui directory
 */
const App: React.FC = () => {
    return <AppWithProviders />;
};

export default App;
