"use client";

/**
 * Generator for main.js file which contains React UI components
 */

import fs from "fs-extra";

/**
 * Generate main.js file with improved React components
 * @param mainJsPath Path to write the JavaScript file
 */
export async function generateMainJs(mainJsPath: string): Promise<void> {
  // Generate vanilla JavaScript instead of JSX for browser compatibility
  const jsContent = `// Auto-generated React components for documentation
try {
  console.log("Initializing documentation UI...");

  // Check if config is loaded
  if (!window.docsConfig) {
    console.warn("Documentation configuration not found, using defaults");
    window.docsConfig = {
      showCode: true,
      showMethods: true,
      showSimilarity: true
    };
  }

  // Extract config
  const { showCode, showMethods, showSimilarity } = window.docsConfig;
  console.log("Documentation config:", window.docsConfig);

  // Main App component rendering
  const App = () => {
    const [components, setComponents] = React.useState([]);
    const [filteredComponents, setFilteredComponents] = React.useState([]);
    const [selectedComponent, setSelectedComponent] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('all');
    const [activeCategory, setActiveCategory] = React.useState(null);
    const [componentDetails, setComponentDetails] = React.useState(null);
    const [loadingDetails, setLoadingDetails] = React.useState(false);
    const [showChat, setShowChat] = React.useState(false);
    const [chatHistory, setChatHistory] = React.useState([]);
    const [chatInput, setChatInput] = React.useState('');
    const [chatLoading, setChatLoading] = React.useState(false);
    const [darkMode, setDarkMode] = React.useState(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Load components data
    React.useEffect(() => {
      try {
        if (window.COMPONENT_DATA && Array.isArray(window.COMPONENT_DATA)) {
          setComponents(window.COMPONENT_DATA);
          setFilteredComponents(window.COMPONENT_DATA);

          // Set initial active category if components exist
          if (window.COMPONENT_DATA.length > 0) {
            const categories = [...new Set(window.COMPONENT_DATA.map(c => c.category || 'Uncategorized'))];
            setActiveCategory(categories[0]);
          }
        }
      } catch (error) {
        console.error('Error loading component data:', error);
      }
    }, []);

    // Add dark mode listener
    React.useEffect(() => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => setDarkMode(e.matches);

      darkModeMediaQuery.addEventListener('change', handleChange);
      return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
      document.documentElement.classList.add('transition');
      setTimeout(() => {
        document.documentElement.classList.remove('transition');
      }, 800);

      const newMode = !darkMode;
      setDarkMode(newMode);
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
    };

    // Set initial theme
    React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    // Highlight code blocks when component details change
    React.useEffect(() => {
      if (selectedComponent && window.hljs) {
        setTimeout(() => {
          document.querySelectorAll('pre code').forEach((block) => {
            window.hljs.highlightElement(block);
          });
        }, 0);
      }
    }, [selectedComponent, componentDetails]);

    // Filter components based on search query and active tab
    const filterComponents = () => {
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
      }

      // Filter by category
      if (activeCategory) {
        filtered = filtered.filter(comp => (comp.category || 'Uncategorized') === activeCategory);
      }

      return filtered;
    };

    // Handle search input
    const handleSearch = (query) => {
      setSearchQuery(query);
      setFilteredComponents(filterComponents());
    };

    // Handle tab change
    const handleTabChange = (tab) => {
      setActiveTab(tab);
      setFilteredComponents(filterComponents());
    };

    // Handle category change
    const handleCategoryChange = (category) => {
      setActiveCategory(category);
      setFilteredComponents(filterComponents());
    };

    // Handle component selection
    const handleComponentClick = (component) => {
      setSelectedComponent(component);

      // Only fetch details if code or methods are enabled
      if (showCode || showMethods) {
        setLoadingDetails(true);

        // Fetch additional component details from API
        fetch(\`/api/component-code?name=\${encodeURIComponent(component.name)}\`)
          .then(response => response.json())
          .then(data => {
            setComponentDetails(data);
            setLoadingDetails(false);
          })
          .catch(error => {
            console.error('Error fetching component details:', error);
            setComponentDetails(null);
            setLoadingDetails(false);
          });
      }
    };

    // Handle back button click
    const handleBackClick = () => {
      setSelectedComponent(null);
      setComponentDetails(null);
    };

    // Toggle chat UI
    const handleToggleChat = () => {
      setShowChat(!showChat);
    };

    // Handle chat input submit
    const handleChatSubmit = (e) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      // Add user message to chat history
      const newUserMessage = { role: 'user', content: chatInput };
      const updatedHistory = [...chatHistory, newUserMessage];
      setChatHistory(updatedHistory);
      setChatInput('');
      setChatLoading(true);

      // Send chat request to API
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: updatedHistory,
          query: chatInput
        }),
      })
        .then(response => response.json())
        .then(data => {
          setChatHistory([...updatedHistory, { role: 'assistant', content: data.response }]);
          setChatLoading(false);
        })
        .catch(error => {
          console.error('Error sending chat message:', error);
          setChatHistory([
            ...updatedHistory,
            { role: 'assistant', content: 'Error: Could not process your request. Please try again.' }
          ]);
          setChatLoading(false);
        });
    };

    // Get unique categories from components
    const categories = React.useMemo(() => {
      if (!components.length) return [];
      return [...new Set(components.map(c => c.category || 'Uncategorized'))];
    }, [components]);

    // Format similarity score for display
    const formatSimilarityScore = (score) => {
      return Math.round(score * 100) + '%';
    };

    // Render component detail view or component list
    return React.createElement(
      'div',
      { className: 'app-container' },
      React.createElement(
        'header',
        { className: 'app-header' },
        React.createElement(
          'div',
          { className: 'header-left' },
          React.createElement('h1', { className: 'app-title' }, 'React Component Documentation')
        ),
        React.createElement(
          'div',
          { className: 'app-actions' },
          !selectedComponent && React.createElement(
            'div',
            { className: 'search-box' },
            React.createElement('i', { className: 'search-icon' }, '🔍'),
            React.createElement('input', {
              type: 'text',
              placeholder: 'Search components...',
              value: searchQuery,
              onChange: (e) => handleSearch(e.target.value)
            })
          ),
          React.createElement(
            'button',
            {
              className: 'theme-toggle-button',
              onClick: toggleDarkMode,
              title: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
              'aria-label': 'Toggle dark mode'
            },
            darkMode ? '☀️' : '🌙'
          ),
          React.createElement(
            'button',
            {
              className: 'chat-button',
              onClick: handleToggleChat,
              title: 'AI Chat'
            },
            '💬 Chat'
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'app-content' },
        selectedComponent ?
          React.createElement(
            'div',
            { className: 'component-details' },
            React.createElement(
              'div',
              { className: 'details-header' },
              React.createElement(
                'button',
                {
                  className: 'back-button',
                  onClick: handleBackClick
                },
                '← Back to Components'
              ),
              React.createElement('h2', { className: 'component-title' }, selectedComponent.name)
            ),
            selectedComponent.fileName && React.createElement(
              'div',
              { className: 'component-filepath' },
              React.createElement('span', { className: 'filepath-label' }, 'File:'),
              React.createElement('span', { className: 'filepath-value' }, selectedComponent.filePath || selectedComponent.fileName)
            ),
            selectedComponent.description && React.createElement(
              'div',
              { className: 'component-section' },
              React.createElement('h3', null, 'Description'),
              React.createElement('p', null, selectedComponent.description)
            ),
            selectedComponent.props && selectedComponent.props.length > 0 && React.createElement(
              'div',
              { className: 'component-section' },
              React.createElement('h3', null, 'Props'),
              React.createElement(
                'table',
                { className: 'props-table' },
                React.createElement(
                  'thead',
                  null,
                  React.createElement(
                    'tr',
                    null,
                    React.createElement('th', null, 'Name'),
                    React.createElement('th', null, 'Type'),
                    React.createElement('th', null, 'Required'),
                    React.createElement('th', null, 'Description')
                  )
                ),
                React.createElement(
                  'tbody',
                  null,
                  selectedComponent.props.map((prop, index) =>
                    React.createElement(
                      'tr',
                      { key: index },
                      React.createElement('td', { className: 'prop-name' }, prop.name),
                      React.createElement(
                        'td',
                        { className: 'prop-type' },
                        React.createElement('code', null, prop.type || 'any')
                      ),
                      React.createElement('td', null, prop.required ? 'Yes' : 'No'),
                      React.createElement('td', null, prop.description || '-')
                    )
                  )
                )
              )
            ),
            (showCode && loadingDetails) &&
              React.createElement('div', { className: 'loading-spinner' }, 'Loading component details...'),

            (showCode && !loadingDetails && componentDetails && componentDetails.sourceCode) && React.createElement(
              'div',
              { className: 'component-section code-section' },
              React.createElement('h3', null, 'Source Code'),
              React.createElement(
                'div',
                { className: 'code-actions' },
                React.createElement('button', {
                  className: 'copy-button',
                  title: 'Copy to clipboard',
                  onClick: () => {
                    navigator.clipboard.writeText(componentDetails.sourceCode);
                    // Show copied toast
                    const toast = document.createElement('div');
                    toast.className = 'copied-toast';
                    toast.textContent = 'Copied to clipboard!';
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 2000);
                  }
                }, '📋 Copy')
              ),
              React.createElement(
                'div',
                { className: 'code-container' },
                React.createElement('pre', null, React.createElement('code', { className: 'language-javascript' }, componentDetails.sourceCode))
              )
            ),

            // Methods Section - only if showMethods is true
            (showMethods && !loadingDetails && componentDetails && componentDetails.methods && componentDetails.methods.length > 0) && React.createElement(
              'div',
              { className: 'component-section' },
              React.createElement('h3', null, 'Methods'),
              React.createElement(
                'div',
                { className: 'methods-list' },
                componentDetails.methods.map((method, index) =>
                  React.createElement(
                    'div',
                    {
                      key: index,
                      className: 'method-card' + ((showSimilarity && method.similarityWarnings && method.similarityWarnings.length > 0) ? ' has-similarity-warnings' : '')
                    },
                    React.createElement('h4', { className: 'method-name' }, method.name),
                    method.description && React.createElement('p', { className: 'method-description' }, method.description),
                    React.createElement(
                      'div',
                      { className: 'method-signature' },
                      React.createElement('code', null,
                        method.name + '(' +
                        (method.params ? method.params.map(p => p.name + ': ' + p.type).join(', ') : '') +
                        ') → ' +
                        (method.returnType || 'void')
                      )
                    ),
                    method.code && React.createElement(
                      'div',
                      { className: 'method-code' },
                      React.createElement('pre', null, React.createElement('code', { className: 'language-javascript' }, method.code))
                    ),

                    // Similarity Warnings - only if showSimilarity is true
                    (showSimilarity && method.similarityWarnings && method.similarityWarnings.length > 0) && React.createElement(
                      'div',
                      { className: 'similarity-warnings' },
                      React.createElement('h5', null, 'Similarity Warnings'),
                      React.createElement(
                        'ul',
                        { className: 'warnings-list' },
                        method.similarityWarnings.map((warning, wIndex) =>
                          React.createElement(
                            'li',
                            { key: wIndex, className: 'warning-item' },
                            React.createElement('span', { className: 'warning-score' }, 'Score: ', formatSimilarityScore(warning.score)),
                            React.createElement('span', { className: 'warning-component' }, 'Similar to: ', warning.similarTo),
                            React.createElement('span', { className: 'warning-reason' }, warning.reason),
                            warning.code && React.createElement(
                              'div',
                              { className: 'warning-code' },
                              React.createElement('pre', null, React.createElement('code', { className: 'language-javascript' }, warning.code))
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            ),
            selectedComponent.childComponents && selectedComponent.childComponents.length > 0 && React.createElement(
              'div',
              { className: 'component-section' },
              React.createElement('h3', null, 'Child Components'),
              React.createElement(
                'div',
                { className: 'components-grid' },
                selectedComponent.childComponents.map((child, index) =>
                  React.createElement(
                    'div',
                    {
                      key: index,
                      className: 'component-card',
                      onClick: () => {
                        const fullChild = components.find(c => c.name === child.name);
                        if (fullChild) {
                          handleComponentClick(fullChild);
                        }
                      }
                    },
                    React.createElement('div', { className: 'component-name' }, child.name),
                    child.description && React.createElement(
                      'div',
                      { className: 'component-description' },
                      child.description
                    )
                  )
                )
              )
            )
          ) :
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              'div',
              { className: 'tabs' },
              React.createElement(
                'button',
                {
                  className: 'tab-button ' + (activeTab === 'all' ? 'active' : ''),
                  onClick: () => handleTabChange('all')
                },
                'All'
              ),
              React.createElement(
                'button',
                {
                  className: 'tab-button ' + (activeTab === 'components' ? 'active' : ''),
                  onClick: () => handleTabChange('components')
                },
                'Components'
              ),
              showMethods && React.createElement(
                'button',
                {
                  className: 'tab-button ' + (activeTab === 'functions' ? 'active' : ''),
                  onClick: () => handleTabChange('functions')
                },
                'Functions'
              )
            ),
            categories.length > 0 && React.createElement(
              'div',
              { className: 'categories' },
              React.createElement(
                'select',
                {
                  value: activeCategory || '',
                  onChange: (e) => handleCategoryChange(e.target.value),
                  className: 'category-select'
                },
                categories.map((category, index) =>
                  React.createElement(
                    'option',
                    { key: index, value: category },
                    category
                  )
                )
              )
            ),
            filteredComponents.length > 0 ?
              React.createElement(
                'div',
                { className: 'components-grid' },
                filteredComponents.map((component, index) =>
                  React.createElement(
                    'div',
                    {
                      key: index,
                      className: 'component-card',
                      onClick: () => handleComponentClick(component)
                    },
                    React.createElement('div', { className: 'component-name' }, component.name),
                    component.description && React.createElement(
                      'div',
                      { className: 'component-description' },
                      component.description
                    ),
                    React.createElement(
                      'div',
                      { className: 'component-meta' },
                      React.createElement(
                        'div',
                        { className: 'meta-item' },
                        'Type: ', component.type || 'Component'
                      ),
                      component.props && React.createElement(
                        'div',
                        { className: 'meta-item' },
                        'Props: ', component.props.length
                      ),
                      showMethods && component.methods && React.createElement(
                        'div',
                        { className: 'meta-item' },
                        'Methods: ', component.methods.length,
                        showSimilarity && component.methods && component.methods.some(m => m.similarityWarnings && m.similarityWarnings.length > 0) ?
                          React.createElement('span', { className: 'similarity-indicator', title: 'Has similarity warnings' }, ' ⚠️') : null
                      )
                    )
                  )
                )
              ) :
              React.createElement(
                'div',
                { className: 'no-results' },
                React.createElement('div', { className: 'empty-state-icon' }, '🔍'),
                React.createElement('div', { className: 'empty-state-message' }, 'No components found'),
                React.createElement(
                  'div',
                  { className: 'empty-state-suggestion' },
                  'Try adjusting your search or filters'
                )
              )
          )
      ),
      // Chat UI
      showChat && React.createElement(
        'div',
        { className: 'chat-container' },
        React.createElement(
          'div',
          { className: 'chat-header' },
          React.createElement('h3', null, 'AI Chat Assistant'),
          React.createElement(
            'button',
            {
              className: 'chat-close-button',
              onClick: handleToggleChat,
              'aria-label': 'Close chat'
            },
            '×'
          )
        ),
        React.createElement(
          'div',
          { className: 'chat-messages' },
          chatHistory.length === 0 && React.createElement(
            'div',
            { className: 'chat-welcome' },
            React.createElement('h4', null, 'Welcome to the AI Assistant!'),
            React.createElement('p', null, 'Ask questions about the components, their usage, or any related development questions.')
          ),
          chatHistory.map((message, index) => React.createElement(
            'div',
            {
              key: index,
              className: \`chat-message \${message.role === 'user' ? 'user-message' : 'assistant-message'}\`
            },
            message.content
          )),
          chatLoading && React.createElement(
            'div',
            { className: 'assistant-message' },
            React.createElement('div', { className: 'loading-dots' })
          )
        ),
        React.createElement(
          'form',
          {
            className: 'chat-input-form',
            onSubmit: handleChatSubmit
          },
          React.createElement('input', {
            type: 'text',
            className: 'chat-input',
            value: chatInput,
            onChange: (e) => setChatInput(e.target.value),
            placeholder: 'Type your question...',
            disabled: chatLoading
          }),
          React.createElement(
            'button',
            {
              type: 'submit',
              className: 'chat-send-button',
              disabled: !chatInput.trim() || chatLoading
            },
            'Send'
          )
        )
      ),
      React.createElement(
        'footer',
        { className: 'app-footer' },
        'Generated by React Component Documentation Tool'
      )
    );
  };

  // Render the app to the DOM
  ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(App));
} catch (error) {
  console.error('Error rendering documentation UI:', error);
  document.getElementById('app').innerHTML = \`
    <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
      <h3>Error Rendering Documentation</h3>
      <p>\${error?.message || 'An unknown error occurred'}</p>
      <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  \`;
}`;

  await fs.writeFile(mainJsPath, jsContent);
}
