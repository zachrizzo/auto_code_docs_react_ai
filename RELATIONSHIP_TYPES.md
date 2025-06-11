# 🔗 Code Relationship Types

The code relationship graph now uses **3 clear, intuitive relationship types** that are easy to understand:

## **1. 🔵 USES** (Blue)
**What it means:** Component A uses/depends on Component B  
**Examples:**
- `Button` component imports and renders `Icon` component
- `Modal` component calls functions from `utils` library
- `Form` component uses `ValidationService` 

**Visual:** Solid blue lines, hexagon/diamond/square/circle nodes

## **2. 🟣 INHERITS** (Purple) 
**What it means:** Class A extends Class B  
**Examples:**
- `CustomButton extends BaseButton`
- `UserModal extends Modal`
- `ApiService extends BaseService`

**Visual:** Dash-dot purple lines

## **3. 🟢 CONTAINS** (Green)
**What it means:** Component A wraps/contains Component B  
**Examples:**
- `Layout` contains `Header`, `Sidebar`, `Content`
- `Form` contains `Input`, `Button`, `Validation`
- `Card` contains `Title`, `Body`, `Actions`

**Visual:** Dashed green lines

---

## **Node Shapes & Colors**

### **⬡ Hexagon - React Components (Green)**
- Modern React functional components
- TSX/JSX files with component exports
- Most common in React apps

### **⬜ Square - Classes (Blue)**  
- ES6 classes, TypeScript classes
- Service classes, utility classes
- Object-oriented code structures

### **◆ Diamond - Functions (Orange)**
- Standalone functions
- Utility functions, helpers
- Pure functions without classes

### **● Circle - Methods (Purple)**
- Methods within classes
- Member functions
- Instance/static methods

---

## **Relationship Weights**

**Weight 1**: Basic usage (light lines)  
**Weight 2**: Standard usage (medium lines)  
**Weight 3**: Heavy usage - imports AND renders (thick lines)

---

## **Why This Design?**

✅ **Simple & Clear**: Only 3 types instead of 6 confusing ones  
✅ **Intuitive Colors**: Blue for usage, Purple for inheritance, Green for containment  
✅ **Meaningful Shapes**: Each component type has a unique, recognizable shape  
✅ **Visual Hierarchy**: Line thickness shows relationship strength  
✅ **Better Navigation**: Easy to spot component types and connections at a glance  

This makes it immediately clear how your codebase is structured and where potential issues like duplicated code or circular dependencies might exist.