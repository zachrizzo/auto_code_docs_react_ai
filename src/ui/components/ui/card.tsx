import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => (
    <div
        className={`rounded-lg border bg-card text-card-foreground shadow ${className}`}
        onClick={onClick}
        {...props}
    >
        {children}
    </div>
);

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...props }) => (
    <div
        className={`flex flex-col space-y-1.5 p-6 ${className}`}
        {...props}
    >
        {children}
    </div>
);

interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', ...props }) => (
    <h3
        className={`text-xl font-bold ${className}`}
        {...props}
    >
        {children}
    </h3>
);

interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '', ...props }) => (
    <p
        className={`text-sm text-muted-foreground ${className}`}
        {...props}
    >
        {children}
    </p>
);

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', ...props }) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...props }) => (
    <div
        className={`flex items-center p-6 pt-0 ${className}`}
        {...props}
    >
        {children}
    </div>
);
