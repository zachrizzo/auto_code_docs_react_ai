// Auto-generated main.js
const { useState, useEffect } = React;

const App = () => {
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [components, setComponents] = useState([]);
  const [filteredComponents, setFilteredComponents] = useState([]);

  useEffect(() => {
    // Initialize with component data
    if (window.COMPONENT_DATA) {
      setComponents(window.COMPONENT_DATA);
      setFilteredComponents(window.COMPONENT_DATA);
    }
  }, []);

  useEffect(() => {
    // Filter components based on search query
    if (!searchQuery.trim()) {
      setFilteredComponents(components);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = components.filter(component =>
      component.name.toLowerCase().includes(query) ||
      (component.description && component.description.toLowerCase().includes(query))
    );
    setFilteredComponents(filtered);
  }, [searchQuery, components]);

  // Select the first component by default when components load
  useEffect(() => {
    if (filteredComponents.length > 0 && !selectedComponent) {
      setSelectedComponent(filteredComponents[0]);
    }
  }, [filteredComponents, selectedComponent]);

  return (
    <>
      <Sidebar
        components={filteredComponents}
        selectedComponent={selectedComponent}
        setSelectedComponent={setSelectedComponent}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <main className="main-content">
        {selectedComponent && (
          <ComponentDetails component={selectedComponent} />
        )}
      </main>
    </>
  );
};

const Sidebar = ({ components, selectedComponent, setSelectedComponent, searchQuery, setSearchQuery }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">React Component Docs</div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="sidebar-content">
        <ComponentTree
          components={components}
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
        />
      </div>
    </div>
  );
};

const ComponentTree = ({ components, selectedComponent, setSelectedComponent }) => {
  return (
    <ul className="component-tree">
      {components.map((component, index) => (
        <ComponentTreeItem
          key={index}
          component={component}
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
        />
      ))}
    </ul>
  );
};

const ComponentTreeItem = ({ component, selectedComponent, setSelectedComponent }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = component.childComponents && component.childComponents.length > 0;

  const isSelected = selectedComponent && selectedComponent.name === component.name;

  return (
    <li className="component-item">
      <div className="component-item-header">
        {hasChildren && (
          <button
            className={`toggle-btn ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '►'}
          </button>
        )}
        <a
          href="#"
          className={`component-link ${isSelected ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setSelectedComponent(component);
          }}
        >
          {component.name}
        </a>
      </div>

      {hasChildren && expanded && (
        <ul className="child-components">
          {component.childComponents.map((child, index) => (
            <ComponentTreeItem
              key={index}
              component={child}
              selectedComponent={selectedComponent}
              setSelectedComponent={setSelectedComponent}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const ComponentDetails = ({ component }) => {
  useEffect(() => {
    // Highlight code blocks when component changes
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  }, [component]);

  return (
    <div className="component-details">
      <div className="component-header">
        <h1 className="component-title">{component.name}</h1>
        {component.description && (
          <p className="component-description">{component.description}</p>
        )}
        <span className="component-path">{component.filePath}</span>
      </div>

      {/* Similarity Warnings */}
      {component.similarityWarnings && component.similarityWarnings.length > 0 && (
        <div className="section similarity-warnings">
          <h2 className="section-title warning-title">Similarity Warnings</h2>
          <div className="warning-container">
            {component.similarityWarnings.map((warning, index) => (
              <div key={index} className="similarity-warning">
                <div className="warning-header">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-score">{Math.round(warning.score * 100)}% similar to:</span>
                </div>
                <div className="warning-details">
                  <div className="warning-component">{warning.similarTo}</div>
                  <div className="warning-path">in {warning.filePath}</div>
                  <div className="warning-reason">{warning.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Props Section */}
      {component.props && component.props.length > 0 && (
        <div className="section">
          <h2 className="section-title">Props</h2>
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
              {component.props.map((prop, index) => (
                <tr key={index}>
                  <td className="prop-name">{prop.name}</td>
                  <td className="prop-type"><code>{prop.type}</code></td>
                  <td className="prop-required">{prop.required ? 'Yes' : 'No'}</td>
                  <td className="prop-default">
                    {prop.defaultValue !== undefined ? <code>{prop.defaultValue}</code> : '-'}
                  </td>
                  <td className="prop-description">{prop.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Methods Section */}
      {component.methods && component.methods.length > 0 && (
        <div className="section">
          <h2 className="section-title">Methods</h2>
          <div className="methods-list">
            {component.methods.map((method, index) => (
              <div key={index} className="method-item">
                <h3 className="method-name">{method.name}</h3>
                {method.description && (
                  <p className="method-description">{method.description}</p>
                )}

                {method.params && method.params.length > 0 && (
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
                        {method.params.map((param, idx) => (
                          <tr key={idx}>
                            <td>{param.name}</td>
                            <td><code>{param.type}</code></td>
                            <td>{param.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {method.returnType && (
                  <div className="method-return">
                    <h4>Returns:</h4>
                    <code>{method.returnType}</code>
                    {method.returnDescription && (
                      <p>{method.returnDescription}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Code Section */}
      {component.sourceCode && (
        <div className="section">
          <h2 className="section-title">Source Code</h2>
          <pre className="source-code-container">
            <code className="typescript">{component.sourceCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
