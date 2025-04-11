import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { ComponentCard } from './ComponentCard';
import { ComponentDetails } from './ComponentDetails';
import { EmptyState } from './EmptyState';
import { Sidebar } from './Sidebar';
import { Search } from './Search';
import { ThemeContext, ThemeProvider } from '../context/ThemeContext';
import { ToastContext, ToastProvider } from '../context/ToastContext';
import { processComponentsWithSimilarity } from '../utils/similarity';

// Main App component
export const App = () => {
    const [components, setComponents] = useState([]);
    const [filteredComponents, setFilteredComponents] = useState([]);
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [activeCategory, setActiveCategory] = useState(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { showToast } = useContext(ToastContext);

    // Load components data
    useEffect(() => {
        try {
            if (window.COMPONENT_DATA && Array.isArray(window.COMPONENT_DATA)) {
                const processedData = processComponentsWithSimilarity(window.COMPONENT_DATA);
                setComponents(processedData);
                setFilteredComponents(processedData);

                // Set initial active category if components exist
                if (processedData.length > 0) {
                    const categories = [...new Set(processedData.map(c => c.category || 'Uncategorized'))];
                    setActiveCategory(categories[0]);
                }

                console.log('Loaded and processed', processedData.length, 'components');
            } else {
                console.error('Component data is not available or not an array');
                showToast('Failed to load component data', 'error');
            }
        } catch (error) {
            console.error('Error loading component data:', error);
            showToast('Error loading component data: ' + error.message, 'error');
        }
    }, []);

    // Filter components based on search query, active tab and category
    useEffect(() => {
        let filtered = [...components];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(comp =>
                comp.name.toLowerCase().includes(query) ||
                (comp.description && comp.description.toLowerCase().includes(query))
            );
        }

        // Filter by tab
        if (activeTab === 'components') {
            filtered = filtered.filter(comp => comp.type !== 'function');
        } else if (activeTab === 'functions') {
            filtered = filtered.filter(comp => comp.type === 'function');
        } else if (activeTab === 'similar') {
            filtered = filtered.filter(comp => comp.similarityScore > 0.7);
        }

        // Filter by category if one is active
        if (activeCategory) {
            filtered = filtered.filter(comp => (comp.category || 'Uncategorized') === activeCategory);
        }

        setFilteredComponents(filtered);
    }, [searchQuery, activeTab, activeCategory, components]);

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleCategoryChange = (category) => {
        setActiveCategory(category);
    };

    const handleComponentClick = (component) => {
        setSelectedComponent(component);
        window.scrollTo(0, 0);
    };

    const handleBackClick = () => {
        setSelectedComponent(null);
    };

    const toggleSidebar = () => {
        setShowSidebar(!showSidebar);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="flex items-center">
                    <button
                        className="mr-3 p-2 rounded-md hover:bg-hover-color"
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                    >
                        <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                    <div className="app-title">React Component Documentation</div>
                </div>
                <div className="app-actions">
                    <Search onSearch={handleSearch} />
                    <div className="theme-toggle ml-2">
                        <button onClick={toggleTheme} aria-label="Toggle theme">
                            {theme === 'light' ? (
                                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {showSidebar && (
                    <div className="w-64 flex-shrink-0">
                        <Sidebar
                            components={components}
                            activeCategory={activeCategory}
                            onCategoryChange={handleCategoryChange}
                            onComponentClick={handleComponentClick}
                        />
                    </div>
                )}

                <main className="app-content flex-1 overflow-y-auto">
                    {selectedComponent ? (
                        <ComponentDetails
                            component={selectedComponent}
                            onBack={handleBackClick}
                            setSelectedComponent={setSelectedComponent}
                        />
                    ) : (
                        <>
                            <div className="tabs">
                                <button
                                    className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                                    onClick={() => handleTabChange('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'components' ? 'active' : ''}`}
                                    onClick={() => handleTabChange('components')}
                                >
                                    Components
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'functions' ? 'active' : ''}`}
                                    onClick={() => handleTabChange('functions')}
                                >
                                    Functions
                                </button>
                                <button
                                    className={`tab-button ${activeTab === 'similar' ? 'active' : ''}`}
                                    onClick={() => handleTabChange('similar')}
                                >
                                    Similar Components
                                </button>
                            </div>

                            {filteredComponents.length > 0 ? (
                                <div className="components-grid">
                                    {filteredComponents.map((component, index) => (
                                        <ComponentCard
                                            key={index}
                                            component={component}
                                            onClick={handleComponentClick}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    type="no-results"
                                    message="No components found"
                                    suggestion={searchQuery ? `Try adjusting your search query or switching tabs` : `There are no components available in the documentation`}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>

            <footer className="app-footer">
                <p>Generated documentation for React components</p>
            </footer>
        </div>
    );
};

// Wrap the app with providers
export const AppWithProviders = () => {
    return (
        <ThemeProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </ThemeProvider>
    );
};

// Define window interface to include COMPONENT_DATA
declare global {
    interface Window {
        COMPONENT_DATA: any[];
    }
}
