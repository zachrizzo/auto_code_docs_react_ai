"use client";

import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface DocumentationCardProps {
    title: string;
    description?: string;
    metadata?: {
        type?: string;
        propsCount?: number;
        methodsCount?: number;
        hasWarnings?: boolean;
    };
    onClick?: () => void;
}

export function DocumentationCard({
    title,
    description,
    metadata,
    onClick,
}: DocumentationCardProps) {
    return (
        <Card
            className="h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={onClick}
        >
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                    {title}
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            {metadata && (
                <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                    {metadata.type && (
                        <Badge variant="outline">Type: {metadata.type}</Badge>
                    )}
                    {metadata.propsCount !== undefined && (
                        <Badge variant="outline">Props: {metadata.propsCount}</Badge>
                    )}
                    {metadata.methodsCount !== undefined && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            Methods: {metadata.methodsCount}
                            {metadata.hasWarnings && (
                                <span title="Has similarity warnings">⚠️</span>
                            )}
                        </Badge>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}

interface ViewDocumentationButtonProps {
    href: string;
    className?: string;
}

export function ViewDocumentationButton({
    href,
    className,
}: ViewDocumentationButtonProps) {
    return (
        <Button
            asChild
            className={className}
            onClick={(e) => e.stopPropagation()}
        >
            <a href={href} target="_blank" rel="noopener noreferrer">
                View Documentation
            </a>
        </Button>
    );
}
