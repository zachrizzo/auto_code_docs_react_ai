
// Main React application for documentation
const { useState, useEffect, Fragment, useMemo } = React;

// Component to visualize similarity between functions
function SimilarityGraph({ components }) {
  const [selectedSimilarity, setSelectedSimilarity] = useState(null);
  const allSimilarities = useMemo(() => {
    // Collect all similarity warnings
    const similarities = [];

    components.forEach(component => {
      if (component.methods) {
        component.methods.forEach(method => {
          if (method.similarityWarnings && method.similarityWarnings.length > 0) {
            method.similarityWarnings.forEach(warning => {
              similarities.push({
                sourceComponent: component.name,
                sourceMethod: method.name,
                targetName: warning.similarTo,
                filePath: warning.filePath,
                score: warning.score,
                reason: warning.reason
              });
            });
          }
        });
      }
    });

    // Sort by similarity score (highest first)
    return similarities.sort((a, b) => b.score - a.score);
  }, [components]);

  // Filter to show only similarities above 60%
  const displayedSimilarities = allSimilarities.filter(sim => sim.score >= 0.6);

  if (displayedSimilarities.length === 0) {
    return <div className="no-similarities">No similar methods found</div>;
  }

  return (
    <div className="similarity-graph-container">
      <h3>Method Similarity Analysis</h3>
      <p>Showing {displayedSimilarities.length} method similarities with 60%+ similarity score</p>

      <div className="similarity-list">
        {displayedSimilarities.map((similarity, index) => (
          <div
            key={`sim-${index}`}
            className="similarity-card"
            onClick={() => setSelectedSimilarity(similarity)}
          >
            <div className="similarity-header">
              <span className="similarity-score">{Math.round(similarity.score * 100)}%</span>
              <span className="similarity-title">
                {similarity.sourceComponent}.{similarity.sourceMethod} ↔ {similarity.targetName}
              </span>
            </div>
            <div className="similarity-details">
              <div className="similarity-source">From: {similarity.filePath}</div>
              <div className="similarity-reason">{similarity.reason}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedSimilarity && (
        <div className="similarity-modal">
          <div className="similarity-modal-content">
            <button className="close-button" onClick={() => setSelectedSimilarity(null)}>✕</button>
            <h3>Similarity Details</h3>
            <div className="similarity-modal-score">
              {Math.round(selectedSimilarity.score * 100)}% Similar
            </div>
            <div className="similarity-modal-methods">
              <div className="similarity-source-method">
                <h4>{selectedSimilarity.sourceComponent}.{selectedSimilarity.sourceMethod}</h4>
                <div className="similarity-file-path">{selectedSimilarity.filePath}</div>
              </div>
              <div className="similarity-target-method">
                <h4>{selectedSimilarity.targetName}</h4>
              </div>
            </div>
            <div className="similarity-modal-reason">
              <strong>Reason:</strong> {selectedSimilarity.reason}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('components');

  useEffect(() => {
    // Initialize with component data
    setComponents(window.COMPONENT_DATA || []);
  }, []);

  // Filter components based on search term
  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Function to render a similarity warning
  const renderSimilarityWarning = (warning) => (
    <div className="similarity-warning">
      <div className="similarity-header">
        <span className="similarity-badge">
          {Math.round(warning.score * 100)}% Similar
        </span>
        <span className="similarity-name">{warning.similarTo}</span>
      </div>
      <div className="similarity-reason">{warning.reason}</div>
      <div className="similarity-file">{warning.filePath}</div>
    </div>
  );

  // Function to render a method with similarity warnings
  const renderMethod = (method, componentName) => {
    const hasSimilarities = method.similarityWarnings && method.similarityWarnings.length > 0;

    return (
      <div className={`method ${hasSimilarities ? 'has-similarities' : ''}`} key={method.name}>
        <div className="method-header">
          <h4 className="method-name">
            {method.name}
            {hasSimilarities &&
              <span className="method-similarity-badge" title="Has similar methods">
                {method.similarityWarnings.length}
              </span>
            }
          </h4>
          <div className="method-signature">
            ({method.params.map(p => `${p.name}: ${p.type}`).join(', ')})
            {method && method.returnType && `: ${method.returnType}`}
          </div>
        </div>

        {method.description &&
          <div className="method-description">{method.description}</div>
        }

        {hasSimilarities && (
          <div className="method-similarities">
            <h5>Similar Methods:</h5>
            {method.similarityWarnings.map((warning, i) => (
              <div key={`similarity-${i}`} className="similarity-item">
                {renderSimilarityWarning(warning)}
              </div>
            ))}
          </div>
        )}

        {method.code && (
          <pre className="method-code">
            <code className="language-javascript">{method.code}</code>
          </pre>
        )}
      </div>
    );
  };

  // Function to render a component
  const renderComponent = (component) => {
    const hasMethodsWithSimilarities = component.methods &&
      component.methods.some(m => m.similarityWarnings && m.similarityWarnings.length > 0);

    return (
      <div
        className={`component-card ${hasMethodsWithSimilarities ? 'has-similarities' : ''}`}
        key={component.name}
        onClick={() => setSelectedComponent(component)}
      >
        <h3 className="component-name">
          {component.name}
          {hasMethodsWithSimilarities &&
            <span className="similarity-indicator" title="Contains similar methods">⚠</span>
          }
        </h3>
        {component.description &&
          <p className="component-description">{component.description}</p>
        }
        <div className="component-meta">
          <span className="meta-item">
            Props: <strong>{component.props.length}</strong>
          </span>
          <span className="meta-item">
            Methods: <strong>{component.methods ? component.methods.length : 0}</strong>
          </span>
          {hasMethodsWithSimilarities && (
            <span className="meta-item warning">
              Similar Methods Found
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render component details
  const renderComponentDetails = (component) => (
    <div className="component-details">
      <div className="details-header">
        <button className="back-button" onClick={() => setSelectedComponent(null)}>
          ← Back to Components
        </button>
        <h2 className="component-title">{component.name}</h2>
      </div>

      {component.description && (
        <div className="component-description">
          <p>{component.description}</p>
        </div>
      )}

      <div className="component-filepath">
        <strong>File:</strong> {component.filePath}
      </div>

      {component.props.length > 0 && (
        <div className="component-section">
          <h3>Props</h3>
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
              {component.props.map(prop => (
                <tr key={prop.name}>
                  <td className="prop-name">{prop.name}</td>
                  <td className="prop-type"><code>{prop.type}</code></td>
                  <td className="prop-required">{prop.required ? '✓' : ''}</td>
                  <td className="prop-default">
                    {prop.defaultValue !== undefined ? <code>{String(prop.defaultValue)}</code> : ''}
                  </td>
                  <td className="prop-description">{prop.description || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {component.methods && component.methods.length > 0 && (
        <div className="component-section">
          <h3>Methods</h3>
          <div className="methods-list">
            {component.methods.map(method => renderMethod(method, component.name))}
          </div>
        </div>
      )}

      {component.sourceCode && (
        <div className="component-section">
          <h3>Source Code</h3>
          <pre className="source-code">
            <code className="language-javascript">{component.sourceCode}</code>
          </pre>
        </div>
      )}
    </div>
  );

  // Render the main app
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">React Component Documentation</h1>
        <div className="app-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="theme-toggle">
            <button onClick={() => document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')}>
              Toggle Theme
            </button>
          </div>
        </div>
      </header>

      <div className="app-content">
        {selectedComponent ? (
          renderComponentDetails(selectedComponent)
        ) : (
          <Fragment>
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'components' ? 'active' : ''}`}
                onClick={() => setActiveTab('components')}
              >
                Components
              </button>
              <button
                className={`tab-button ${activeTab === 'similarities' ? 'active' : ''}`}
                onClick={() => setActiveTab('similarities')}
              >
                Function Similarities
              </button>
            </div>

            {activeTab === 'components' ? (
              <div className="components-grid">
                {filteredComponents.length > 0 ? (
                  filteredComponents.map(component => renderComponent(component))
                ) : (
                  <div className="no-results">No components found</div>
                )}
              </div>
            ) : (
              <div className="similarities-view">
                <SimilarityGraph components={components} />
              </div>
            )}
          </Fragment>
        )}
      </div>

      <footer className="app-footer">
        <p>Generated with Recursive React Docs AI</p>
      </footer>
    </div>
  );
}

// Create React DOM Root
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the React app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize syntax highlighting
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
});

// Add tooltip functionality
document.addEventListener('DOMContentLoaded', function() {
  const addTooltips = () => {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      element.addEventListener('mouseenter', function() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = this.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);

        const rect = this.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';

        this.addEventListener('mouseleave', function() {
          document.body.removeChild(tooltip);
        }, { once: true });
      });
    });
  };

  // Initial setup
  setTimeout(addTooltips, 1000);

  // Refresh tooltips when tab changes or component is selected
  const observer = new MutationObserver(function(mutations) {
    setTimeout(addTooltips, 500);
  });

  observer.observe(document.getElementById('app'), {
    childList: true,
    subtree: true
  });
});
