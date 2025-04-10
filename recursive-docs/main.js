// Auto-generated main.js
const { useState, useEffect } = React;

// Component tree item in sidebar
const ComponentTreeItem = ({ component, activeComponent, setActiveComponent, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = component.childComponents && component.childComponents.length > 0;

  return (
    <li className="component-item">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '20px',
              color: 'var(--text-color)'
            }}
          >
            {expanded ? '▼' : '►'}
          </button>
        )}
        <a
          href="#"
          className={`component-link ${activeComponent === component.name ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveComponent(component.name);
          }}
          style={{ paddingLeft: hasChildren ? '0' : '20px' }}
        >
          {component.name}
        </a>
      </div>

      {hasChildren && expanded && (
        <ul className="child-components">
          {component.childComponents.map(child => (
            <ComponentTreeItem
              key={child.name}
              component={child}
              activeComponent={activeComponent}
              setActiveComponent={setActiveComponent}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// Props table
const PropsTable = ({ props }) => {
  if (!props || props.length === 0) {
    return <p>No props defined for this component.</p>;
  }

  return (
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
        {props.map(prop => (
          <tr key={prop.name}>
            <td><code>{prop.name}</code></td>
            <td><code>{prop.type || 'any'}</code></td>
            <td>{prop.required ? 'Yes' : 'No'}</td>
            <td>{prop.defaultValue ? <code>{prop.defaultValue}</code> : '-'}</td>
            <td>{prop.description || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Methods table
const MethodsTable = ({ methods }) => {
  if (!methods || methods.length === 0) {
    return null;
  }

  return (
    <>
      {methods.map(method => (
        <div key={method.name} className="method-item">
          <h3 className="method-name">
            <code>{method.name}</code>
            <span className="method-signature">
              ({method.params.map(p => p.name + ': ' + (p.type || 'any')).join(', ')})
              {method.returnType ? ': ' + method.returnType : ''}
            </span>
          </h3>
          {method.description && <p className="method-description">{method.description}</p>}

          {method.params.length > 0 && (
            <div className="method-params">
              <h4>Parameters:</h4>
              <table className="params-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {method.params.map(param => (
                    <tr key={param.name}>
                      <td><code>{param.name}</code></td>
                      <td><code>{param.type || 'any'}</code></td>
                      <td>{param.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {method.returnType && method.returnType !== 'void' && (
            <div className="method-return">
              <h4>Returns:</h4>
              <p><code>{method.returnType}</code> {method.returnDescription || ''}</p>
            </div>
          )}

          {method.codeString && (
            <div className="method-code">
              <h4>Implementation:</h4>
              <CodeBlock code={method.codeString} language="typescript" />
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// Code block with syntax highlighting
const CodeBlock = ({ code, language = "jsx" }) => {
  const codeRef = React.useRef(null);
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  if (!code) return null;

  return (
    <div className={`code-container ${expanded ? 'expanded' : ''}`}>
      <pre>
        <code ref={codeRef} className={language}>
          {code}
        </code>
      </pre>
      <button
        className="code-expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
};

// Component details
const ComponentDetails = ({ component }) => {
  if (!component) {
    return <div>Select a component from the sidebar to view its details.</div>;
  }

  return (
    <div className="component-details">
      <div className="component-header">
        <h1 className="component-title">{component.name}</h1>
        <p className="component-description">{component.description}</p>
        <div className="component-path">
          <span>File: </span>
          <code>{component.filePath}</code>
        </div>
      </div>

      <h2 className="section-title">Props</h2>
      <PropsTable props={component.props} />

      {component.methods && component.methods.length > 0 && (
        <>
          <h2 className="section-title">Methods</h2>
          <MethodsTable methods={component.methods} />
        </>
      )}

      {component.sourceCode && (
        <>
          <h2 className="section-title">Source Code</h2>
          <CodeBlock code={component.sourceCode} />
        </>
      )}

      {component.childComponents && component.childComponents.length > 0 && (
        <>
          <h2 className="section-title">Child Components</h2>
          <ul className="component-list">
            {component.childComponents.map(child => (
              <li key={child.name}>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  document.querySelector(`a.component-link[data-component="${child.name}"]`).click();
                }}>
                  {child.name}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// Main App
const App = () => {
  const [activeComponent, setActiveComponent] = useState("");
  const [activeComponentData, setActiveComponentData] = useState(null);

  // Get flat array of all components
  const getAllComponents = (components, result = []) => {
    components.forEach(component => {
      result.push(component);
      if (component.childComponents && component.childComponents.length > 0) {
        getAllComponents(component.childComponents, result);
      }
    });
    return result;
  };

  const allComponents = getAllComponents(window.COMPONENT_DATA);

  // Set default active component
  useEffect(() => {
    if (window.COMPONENT_DATA && window.COMPONENT_DATA.length > 0 && !activeComponent) {
      setActiveComponent(window.COMPONENT_DATA[0].name);
    }
  }, []);

  // Update active component data when active component changes
  useEffect(() => {
    if (activeComponent) {
      const component = allComponents.find(c => c.name === activeComponent);
      setActiveComponentData(component);
    }
  }, [activeComponent]);

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">React Components</div>
        </div>
        <div className="sidebar-content">
          <ul className="component-tree">
            {window.COMPONENT_DATA.map(component => (
              <ComponentTreeItem
                key={component.name}
                component={component}
                activeComponent={activeComponent}
                setActiveComponent={setActiveComponent}
              />
            ))}
          </ul>
        </div>
      </div>
      <div className="main-content">
        <ComponentDetails component={activeComponentData} />
      </div>
    </>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById('app'));

// Initialize highlight.js
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
});