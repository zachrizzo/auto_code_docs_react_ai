import React, { useMemo } from 'react';

interface SidebarProps {
    components: any[];
    activeCategory: string | null;
    onCategoryChange: (category: string) => void;
    onComponentClick: (component: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    components,
    activeCategory,
    onCategoryChange,
    onComponentClick
}) => {
    // Group components by category
    const categorizedComponents = useMemo(() => {
        const categories: Record<string, any[]> = {};

        components.forEach(comp => {
            const category = comp.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }
            // Avoid duplicates by checking if component already exists
            if (!categories[category].some(c => c.name === comp.name)) {
                categories[category].push(comp);
            }
        });

        return categories;
    }, [components]);

    const categories = Object.keys(categorizedComponents).sort();

    return (
        <div className="sidebar bg-sidebar-bg border-r border-border h-full overflow-y-auto p-4">
            <div className="sidebar-header mb-4">
                <h3 className="text-lg font-semibold">Categories</h3>
            </div>
            <div className="sidebar-content">
                {categories.map((category) => (
                    <div key={category} className="mb-3">
                        <button
                            className={`w-full text-left py-2 px-3 rounded-md text-sm font-medium ${activeCategory === category ? 'bg-primary text-white' : 'hover:bg-hover-color'
                                }`}
                            onClick={() => onCategoryChange(category)}
                        >
                            {category} ({categorizedComponents[category].length})
                        </button>

                        {activeCategory === category && (
                            <div className="mt-2 ml-2 border-l-2 border-border pl-3 space-y-1">
                                {categorizedComponents[category].map((comp) => (
                                    <button
                                        key={comp.name}
                                        className="w-full text-left py-1 px-2 rounded text-sm hover:bg-hover-color truncate"
                                        onClick={() => onComponentClick(comp)}
                                    >
                                        {comp.name}
                                        {comp.similarityScore > 0.7 && (
                                            <span className="ml-1 text-primary">●</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
