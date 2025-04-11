import React, { useState } from 'react';
import { Input } from './ui/input';

interface SearchProps {
    onSearch: (query: string) => void;
}

export const Search: React.FC<SearchProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    };

    return (
        <div className="search-box">
            <Input
                type="text"
                placeholder="Search components..."
                value={query}
                onChange={handleChange}
                className="w-full"
            />
        </div>
    );
};
