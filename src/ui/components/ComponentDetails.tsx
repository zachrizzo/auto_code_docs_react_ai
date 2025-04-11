import React from 'react';

interface ComponentDetailsProps {
    component: any;
    onBack: () => void;
    setSelectedComponent: (component: any) => void;
}

export const ComponentDetails: React.FC<ComponentDetailsProps> = ({
    component,
    onBack,
    setSelectedComponent
}) => {
    // Get the correct name to display (either displayName, name, or originalName)
    const displayName = component.displayName || component.name;
    const originalName = component.originalName || component.name;

    // Get other component properties
    const { description, type, fileName, props = [], methods = [], childComponents = [], sourceCode } = component;

    return (
        <div className="component-details">
            <div className="details-header">
                <button className="back-button" onClick={onBack}>
                    ← Back to Components
                </button>
                <h2 className="component-title">{displayName}</h2>
            </div>

            {fileName && (
                <div className="component-filepath">
                    <strong>File:</strong> {fileName}
                    {originalName !== displayName && (
                        <div className="mt-1 text-sm">
                            <strong>Original Name:</strong> {originalName}
                        </div>
                    )}
                </div>
            )}

            {description && (
                <div className="component-section">
                    <h3>Description</h3>
                    <p>{description}</p>
                </div>
            )}

            {props.length > 0 && (
                <div className="component-section">
                    <h3>
                        <svg className="w-5 h-5 inline-block mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Props
                    </h3>
                    <table className="props-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Default</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.map((prop: any, index: number) => (
                                <tr key={index}>
                                    <td className="prop-name">
                                        {prop.name}
                                        {prop.required && <span className="required-badge">Required</span>}
                                    </td>
                                    <td className="prop-type">
                                        <code>{prop.type || 'any'}</code>
                                    </td>
                                    <td>{prop.required ? 'Yes' : 'No'}</td>
                                    <td className="prop-default">
                                        {prop.defaultValue !== undefined ? (
                                            <code>{String(prop.defaultValue)}</code>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td>{prop.description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {methods.length > 0 && (
                <div className="component-section">
                    <h3>
                        <svg className="w-5 h-5 inline-block mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                        </svg>
                        Methods
                    </h3>
                    <div className="methods-list">
                        {methods.map((method: any, index: number) => (
                            <div key={index} className={`method ${method.similarMethods?.length ? 'has-similarities' : ''}`}>
                                <div className="method-header">
                                    <div className="method-name">
                                        {method.similarityScore && method.similarityScore > 0.7 && (
                                            <span className="method-similarity-badge" title={`Similarity score: ${Math.round(method.similarityScore * 100)}%`}>!</span>
                                        )}
                                        {method.name}
                                    </div>
                                    <div className="method-signature">
                                        {method.name}({method.params.map((p: any) => `${p.name}: ${p.type}`).join(', ')}): {method.returnType}
                                    </div>
                                </div>

                                {method.description && (
                                    <div className="method-description">{method.description}</div>
                                )}

                                {method.similarMethods && method.similarMethods.length > 0 && (
                                    <div className="method-similarities">
                                        <h5>
                                            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                            </svg>
                                            Similar Methods Found
                                        </h5>
                                        {method.similarMethods.map((similarMethod: any, idx: number) => (
                                            <div key={idx} className="similarity-item">
                                                <div className="similarity-warning">
                                                    <div className="similarity-header">
                                                        <span className="similarity-badge">{Math.round(similarMethod.score * 100)}%</span>
                                                        <span className="similarity-name">{similarMethod.methodName}</span>
                                                    </div>
                                                    <div className="similarity-reason">{similarMethod.reason}</div>
                                                    <div className="similarity-file">
                                                        in {similarMethod.componentName} ({similarMethod.filePath})
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="method-code">
                                    <button className="copy-button">Copy</button>
                                    <pre><code className="language-javascript">{method.code}</code></pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {childComponents.length > 0 && (
                <div className="component-section">
                    <h3>
                        <svg className="w-5 h-5 inline-block mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M19 9l-7 7-7-7"></path>
                        </svg>
                        Child Components
                    </h3>
                    <div className="components-grid">
                        {childComponents.map((child: any, index: number) => (
                            <div
                                key={index}
                                className="component-card"
                                onClick={() => setSelectedComponent(child)}
                            >
                                <div className="component-name">
                                    {child.displayName || child.name}
                                </div>
                                {child.description && (
                                    <div className="component-description">{child.description}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {sourceCode && (
                <div className="component-section">
                    <h3>
                        <svg className="w-5 h-5 inline-block mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                        </svg>
                        Source Code
                    </h3>
                    <div className="source-code">
                        <button className="copy-button">Copy</button>
                        <pre><code className="language-javascript">{sourceCode}</code></pre>
                    </div>
                </div>
            )}
        </div>
    );
};
