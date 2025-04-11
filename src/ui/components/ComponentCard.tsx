import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ComponentCardProps {
    component: any;
    onClick: (component: any) => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component, onClick }) => {
    // Use displayName if available, otherwise use name
    const displayName = component.displayName || component.name;

    const { description, type, fileName, props = [], similarityScore } = component;

    const requiredProps = props.filter((p: { required: boolean }) => p.required).length;
    const hasChildren = component.childComponents && component.childComponents.length > 0;
    const hasSimilarities = similarityScore && similarityScore > 0.7;

    return (
        <Card className={`component-card h-full cursor-pointer hover:shadow-md transition-all ${hasSimilarities ? 'has-similarities' : ''}`} onClick={() => onClick(component)}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                        {displayName}
                        {hasSimilarities && (
                            <span className="similarity-indicator ml-2" title={`Similarity score: ${Math.round(similarityScore * 100)}%`}>
                                <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                </svg>
                            </span>
                        )}
                    </CardTitle>
                    <Badge variant={type === 'function' ? 'secondary' : 'default'}>
                        {type === 'function' ? 'Function' : 'Component'}
                    </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                    {description || 'No description available'}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="component-meta text-xs text-muted-foreground">
                    {fileName && (
                        <div className="meta-item">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                            </svg>
                            {fileName.split('/').pop()}
                        </div>
                    )}
                    {props.length > 0 && (
                        <div className="meta-item">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            {props.length} {props.length === 1 ? 'prop' : 'props'}
                            {requiredProps > 0 && (
                                <span className="ml-1 text-red-500">({requiredProps} required)</span>
                            )}
                        </div>
                    )}
                    {hasChildren && (
                        <div className="meta-item">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M19 9l-7 7-7-7"></path>
                            </svg>
                            {component.childComponents.length} {component.childComponents.length === 1 ? 'child' : 'children'}
                        </div>
                    )}
                    {hasSimilarities && (
                        <div className="meta-item warning">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            Similar components
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
