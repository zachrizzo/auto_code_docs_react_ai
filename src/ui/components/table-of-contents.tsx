"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import Link from "next/link"
import { ScrollArea } from "./ui/scroll-area"

interface TOCItem {
  id: string
  title: string
  level: number
  children?: TOCItem[]
}

interface TableOfContentsProps {
  /**
   * The container element to extract headings from
   * If not provided, it will use the document body
   */
  contentRef?: React.RefObject<HTMLElement>
  
  /**
   * Custom heading elements to display instead of extracting from the document
   */
  items?: TOCItem[]
  
  /**
   * Minimum heading level to include (1-6)
   * Default: 2 (h2)
   */
  minLevel?: number
  
  /**
   * Maximum heading level to include (1-6)
   * Default: 4 (h4)
   */
  maxLevel?: number
  
  /**
   * Title to display above the table of contents
   */
  title?: string
  
  /**
   * CSS class to apply to the container
   */
  className?: string
}

/**
 * TableOfContents component that automatically extracts headings from content
 * and displays them as a navigable table of contents.
 * 
 * @example
 * ```tsx
 * // Basic usage with automatic heading extraction
 * <TableOfContents />
 * 
 * // With custom content reference
 * const contentRef = useRef<HTMLDivElement>(null);
 * <TableOfContents contentRef={contentRef} />
 * 
 * // With custom items
 * const items = [
 *   { id: "section-1", title: "Section 1", level: 2 },
 *   { id: "section-2", title: "Section 2", level: 2, 
 *     children: [
 *       { id: "subsection-1", title: "Subsection 1", level: 3 }
 *     ]
 *   }
 * ];
 * <TableOfContents items={items} />
 * ```
 */
export function TableOfContents({
  contentRef,
  items: propItems,
  minLevel = 2,
  maxLevel = 4,
  title = "On this page",
  className,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")
  const [items, setItems] = useState<TOCItem[]>(propItems || [])

  // Extract headings from content if items are not provided
  useEffect(() => {
    if (propItems) {
      setItems(propItems)
      return
    }

    const container = contentRef?.current || document.body
    
    // Find all heading elements in the container
    const headingElements = Array.from(
      container.querySelectorAll<HTMLHeadingElement>(
        `h${minLevel}, h${minLevel + 1}, h${minLevel + 2}, h${minLevel + 3}, h${minLevel + 4}, h${minLevel + 5}`.slice(0, (maxLevel - minLevel + 1) * 4)
      )
    )

    // Convert heading elements to TOC items
    const tocItems: TOCItem[] = []
    
    headingElements.forEach((heading) => {
      const id = heading.id || heading.textContent?.trim().toLowerCase().replace(/\s+/g, "-") || ""
      
      // Set ID on the heading if it doesn't have one
      if (!heading.id) {
        heading.id = id
      }
      
      const level = parseInt(heading.tagName[1])
      
      tocItems.push({
        id,
        title: heading.textContent || "",
        level,
      })
    })
    
    // Build hierarchical structure
    const buildHierarchy = (items: TOCItem[], level: number): TOCItem[] => {
      const result: TOCItem[] = []
      let currentParent: TOCItem | null = null
      
      items.forEach((item) => {
        if (item.level === level) {
          result.push(item)
          currentParent = item
        } else if (item.level > level && currentParent) {
          currentParent.children = currentParent.children || []
          currentParent.children.push(item)
        }
      })
      
      return result
    }
    
    setItems(buildHierarchy(tocItems, minLevel))
  }, [contentRef, propItems, minLevel, maxLevel])

  // Set up intersection observer to highlight active section
  useEffect(() => {
    if (typeof window === "undefined" || propItems) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "0px 0px -80% 0px" }
    )
    
    const headingElements = Array.from(document.querySelectorAll("h2, h3, h4, h5, h6"))
    headingElements.forEach((element) => observer.observe(element))
    
    return () => {
      headingElements.forEach((element) => observer.unobserve(element))
    }
  }, [propItems])

  // Render TOC items recursively
  const renderItems = (items: TOCItem[], depth = 0) => {
    return (
      <ul className={cn("m-0 list-none", depth > 0 ? "pl-4" : "")}>
        {items.map((item) => (
          <li key={item.id} className="mt-2">
            <Link
              href={`#${item.id}`}
              className={cn(
                "inline-block text-sm no-underline transition-colors hover:text-foreground",
                activeId === item.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: "smooth",
                })
              }}
            >
              {item.title}
            </Link>
            {item.children?.length ? renderItems(item.children, depth + 1) : null}
          </li>
        ))}
      </ul>
    )
  }

  // Don't render if there are no items
  if (items.length === 0) {
    return null
  }

  return (
    <div className={cn("relative", className)}>
      {title && (
        <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      )}
      <ScrollArea className="max-h-[calc(100vh-200px)]">
        {renderItems(items)}
      </ScrollArea>
    </div>
  )
}
