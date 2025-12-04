'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const currentValues = value || [];

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!currentValues.includes(inputValue.trim())) {
                onChange([...currentValues, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(currentValues.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="border p-2 rounded-md bg-background">
            <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
                {currentValues.map(tag => (
                    <Badge key={tag} variant="secondary">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={addTag}
                placeholder={placeholder}
                className="border-none shadow-none focus-visible:ring-0 h-8 p-0"
            />
        </div>
    );
}
