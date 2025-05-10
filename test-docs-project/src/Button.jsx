import React from 'react';
import PropTypes from 'prop-types';

/**
 * A customizable button component with various styles and sizes
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  onClick, 
  disabled = false 
}) => {
  const baseClasses = 'rounded font-semibold focus:outline-none transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };
  
  const classes = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${sizeClasses[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;
  
  return (
    <button 
      className={classes} 
      onClick={onClick} 
      disabled={disabled}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  /** The content to display inside the button */
  children: PropTypes.node.isRequired,
  /** The visual style variant of the button */
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success']),
  /** The size of the button */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Function called when the button is clicked */
  onClick: PropTypes.func,
  /** Whether the button is disabled */
  disabled: PropTypes.bool,
};

export default Button;
