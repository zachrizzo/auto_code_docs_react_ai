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
    // Group components by category and fix prefixed names
    const categorizedComponents = useMemo(() => {
        const categories: Record<string, any[]> = {};

        // First, sort components by name length (shortest first)
        // This helps us identify parent component names before their prefixed children
        const sortedComponents = [...components].sort((a, b) => a.name.length - b.name.length);

        // Keep track of component names that are prefixes of other components
        const prefixComponentNames = new Set<string>();

        // Helper function to check if a name is a prefixed component
        const isComponentPrefixed = (name: string) => {
            for (const prefix of prefixComponentNames) {
                // Check if name starts with a component name followed by a non-lowercase letter
                // This identifies patterns like "DocumentAllcalculatePatientCost"
                if (
                    name.startsWith(prefix) &&
                    name !== prefix &&
                    name.length > prefix.length &&
                    /[A-Z]/.test(name.charAt(prefix.length))
                ) {
                    return {
                        isPrefixed: true,
                        prefix
                    };
                }
            }
            return { isPrefixed: false };
        };

        // Process components
        sortedComponents.forEach(comp => {
            // Keep track of component names that could be prefixes
            prefixComponentNames.add(comp.name);

            const category = comp.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }

            // Check if this component name is prefixed by another component
            const { isPrefixed, prefix } = isComponentPrefixed(comp.name);

            // If it's prefixed (like DocumentAllcalculatePatientCost), extract the actual function name
            if (isPrefixed && prefix) {
                // Create a clean name removing the prefix
                const cleanName = comp.name.substring(prefix.length);

                // Update the component name but preserve the original name for reference
                const modifiedComp = {
                    ...comp,
                    displayName: cleanName,
                    originalName: comp.name
                };

                // Avoid duplicates by checking if component already exists
                if (!categories[category].some(c => c.displayName === cleanName || c.name === cleanName)) {
                    categories[category].push(modifiedComp);
                }
            } else {
                // For regular components, just check for duplicates by name
                if (!categories[category].some(c => c.name === comp.name || c.displayName === comp.name)) {
                    categories[category].push(comp);
                }
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
                                        key={comp.originalName || comp.name}
                                        className="w-full text-left py-1 px-2 rounded text-sm hover:bg-hover-color truncate"
                                        onClick={() => onComponentClick(comp)}
                                    >
                                        {comp.displayName || comp.name}
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
