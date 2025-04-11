import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ComponentDefinition } from '../../core/types';

interface ComponentCardProps {
    component: ComponentDefinition;
    onClick: (component: ComponentDefinition) => void;
}

// Component detail card with shadcn/ui
export const ComponentCard: React.FC<ComponentCardProps> = ({ component, onClick }) => {
    return (
        <Card className="w-full mb-4 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center justify-between">
                    {component.name}
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {component.type || 'Component'}
                    </span>
                </CardTitle>
                {component.description && (
                    <CardDescription>{component.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {component.ai?.summary && (
                    <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1">AI Summary</h4>
                        <p className="text-sm text-muted-foreground">{component.ai.summary}</p>
                    </div>
                )}
                {component.props && component.props.length > 0 && (
                    <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1">Props ({component.props.length})</h4>
                        <ul className="text-sm list-disc pl-5">
                            {component.props.slice(0, 3).map((prop, index) => (
                                <li key={index} className="text-muted-foreground">
                                    <span className="font-mono">{prop.name}</span>
                                    {prop.required && <span className="text-destructive ml-1">*</span>}
                                </li>
                            ))}
                            {component.props.length > 3 && (
                                <li className="text-muted-foreground">+ {component.props.length - 3} more</li>
                            )}
                        </ul>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" onClick={() => onClick(component)}>
                    View Details
                </Button>
            </CardFooter>
        </Card>
    );
};

interface SidebarNavProps {
    components: ComponentDefinition[];
    onSelect: (component: ComponentDefinition) => void;
    selectedComponent: ComponentDefinition | null;
}

// Sidebar navigation with shadcn/ui
export const SidebarNav: React.FC<SidebarNavProps> = ({ components, onSelect, selectedComponent }) => {
    return (
        <div className="w-full">
            <div className="space-y-1">
                {components.map((component) => (
                    <Button
                        key={component.name}
                        variant={selectedComponent?.name === component.name ? "secondary" : "ghost"}
                        className="w-full justify-start text-left"
                        onClick={() => onSelect(component)}
                    >
                        {component.name}
                    </Button>
                ))}
            </div>
        </div>
    );
};

interface PropertyTableProps {
    properties: any[]; // Using any for simplicity, ideally would be properly typed
}

// Property table with shadcn/ui
export const PropertyTable: React.FC<PropertyTableProps> = ({ properties }) => {
    if (!properties || properties.length === 0) {
        return <p className="text-muted-foreground text-sm">No properties available</p>;
    }

    return (
        <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Default</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                    {properties.map((prop, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : 'bg-card'}>
                            <td className="px-4 py-2 text-sm font-mono whitespace-nowrap">
                                {prop.name}
                                {prop.required && <span className="text-destructive ml-1">*</span>}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono">{prop.type}</td>
                            <td className="px-4 py-2 text-sm font-mono">{prop.defaultValue || '-'}</td>
                            <td className="px-4 py-2 text-sm">{prop.description || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface MethodDisplayProps {
    method: {
        name: string;
        code?: string;
        ai?: {
            description?: string;
        };
        params?: Array<{
            name: string;
            type: string;
        }>;
        returnType?: string;
        similarityWarnings?: Array<{
            similarTo: string;
            score: number;
            reason: string;
            filePath: string;
            code?: string;
        }>;
    };
}

// Method display with shadcn/ui - ENHANCED
export const MethodDisplay: React.FC<MethodDisplayProps> = ({ method }) => {
    const [copied, setCopied] = React.useState(false);
    const [expanded, setExpanded] = React.useState(false);

    const hasSimilarMethods = method.similarityWarnings && method.similarityWarnings.length > 0;

    const handleCopy = () => {
        navigator.clipboard.writeText(method.code || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className={`mb-4 ${hasSimilarMethods ? 'border-amber-300 dark:border-amber-700' : ''}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-mono flex justify-between items-center">
                    <div className="flex items-center">
                        {method.name}()
                        {hasSimilarMethods && (
                            <span className="ml-2 text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 rounded-full">
                                Similar code detected
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="text-xs text-muted-foreground hover:text-primary"
                        >
                            {copied ? "Copied!" : "Copy"}
                        </button>
                        {hasSimilarMethods && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs text-muted-foreground hover:text-primary"
                            >
                                {expanded ? "Hide details" : "View similarities"}
                            </button>
                        )}
                    </div>
                </CardTitle>
                {method.ai?.description && (
                    <CardDescription>{method.ai.description}</CardDescription>
                )}
                <div className="mt-2 bg-muted rounded p-2 text-xs font-mono">
                    {method.name}(
                    {method.params && method.params.map((param, i: number) => (
                        <span key={param.name}>
                            {i > 0 && ', '}
                            <span className="text-blue-600 dark:text-blue-400">{param.name}</span>
                            <span>: </span>
                            <span className="text-green-600 dark:text-green-400">{param.type}</span>
                        </span>
                    ))}
                    ): <span className="text-purple-600 dark:text-purple-400">{method.returnType || 'void'}</span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {method.code && (
                    <div className="rounded-md bg-muted p-4 overflow-auto relative">
                        <pre className="text-sm font-mono">
                            <code>{method.code}</code>
                        </pre>
                    </div>
                )}

                {hasSimilarMethods && expanded && (
                    <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground">Similar Methods Found</h4>
                        {method.similarityWarnings && method.similarityWarnings.map((similarMethod, idx: number) => (
                            <div key={idx} className="border rounded-md p-3 bg-muted/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm">
                                        {similarMethod.similarTo}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 rounded-full">
                                        {Math.round(similarMethod.score * 100)}% match
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{similarMethod.reason}</p>

                                {similarMethod.code && (
                                    <div className="rounded-md bg-muted p-3 overflow-auto text-xs">
                                        <pre className="font-mono"><code>{similarMethod.code}</code></pre>
                                    </div>
                                )}

                                <div className="text-xs text-muted-foreground mt-2">
                                    From: {similarMethod.filePath}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

interface ComponentDetailProps {
    component: ComponentDefinition;
}

// Component detail view with shadcn/ui
export const ComponentDetail: React.FC<ComponentDetailProps> = ({ component }) => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{component.name}</h1>
                {component.description && (
                    <p className="text-muted-foreground mt-1">{component.description}</p>
                )}
            </div>

            {component.ai?.summary && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{component.ai.summary}</p>
                    </CardContent>
                </Card>
            )}

            {component.props && component.props.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Props</h2>
                    <PropertyTable properties={component.props} />
                </div>
            )}

            {component.methods && component.methods.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Methods</h2>
                    {component.methods.map((method, index) => (
                        <MethodDisplay key={index} method={method} />
                    ))}
                </div>
            )}

            {component.childComponents && component.childComponents.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Child Components</h2>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {component.childComponents.map((child, index) => (
                            <ComponentCard key={index} component={child} onClick={() => { }} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
