import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import RecursiveExamples from './RecursiveExamples';
import UseRecursiveExamples from './UseRecursiveExamples';

/**
 * Main entry point for the examples
 *
 * This file renders different example components based on the URL hash
 */
const Examples: React.FC = () => {
    // Determine which example to render based on the URL hash
    const hash = window.location.hash.replace('#', '') || 'app';

    // Render the appropriate example
    const renderExample = () => {
        switch (hash) {
            case 'recursive':
                return <RecursiveExamples />;
            case 'use-recursive':
                return <UseRecursiveExamples />;
            case 'app':
            default:
                return <App />;
        }
    };

    return (
        <div className="examples-container">
            <header className="examples-header">
                <h1>React Component Documentation Examples</h1>
                <nav>
                    <ul>
                        <li>
                            <a href="#app" className={hash === 'app' ? 'active' : ''}>
                                Todo App
                            </a>
                        </li>
                        <li>
                            <a href="#recursive" className={hash === 'recursive' ? 'active' : ''}>
                                Recursive Examples
                            </a>
                        </li>
                        <li>
                            <a href="#use-recursive" className={hash === 'use-recursive' ? 'active' : ''}>
                                Recursive Examples Usage
                            </a>
                        </li>
                    </ul>
                </nav>
            </header>

            <main className="examples-content">
                {renderExample()}
            </main>

            <footer className="examples-footer">
                <p>
                    These examples demonstrate React components with JSDoc comments for documentation generation.
                </p>
            </footer>
        </div>
    );
};

// Render the examples app
ReactDOM.render(
    <Examples />,
    document.getElementById('root')
);

// Add basic styles for the examples
const style = document.createElement('style');
style.textContent = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    color: #333;
  }

  .examples-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .examples-header {
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
    padding-bottom: 10px;
  }

  .examples-header nav ul {
    display: flex;
    list-style: none;
    padding: 0;
  }

  .examples-header nav li {
    margin-right: 20px;
  }

  .examples-header nav a {
    color: #0366d6;
    text-decoration: none;
    padding: 5px 10px;
  }

  .examples-header nav a.active {
    background-color: #0366d6;
    color: white;
    border-radius: 3px;
  }

  .examples-footer {
    margin-top: 50px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    color: #666;
  }

  .comment {
    border: 1px solid #eee;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
  }

  .comment-header {
    margin-bottom: 10px;
  }

  .author {
    font-weight: bold;
  }

  .comment-replies {
    margin-left: 20px;
    border-left: 2px solid #eee;
    padding-left: 10px;
  }

  button {
    background-color: #0366d6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #0255af;
  }

  pre.result {
    background-color: #f6f8fa;
    padding: 16px;
    border-radius: 6px;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  section {
    margin-bottom: 30px;
  }
`;
document.head.appendChild(style);
