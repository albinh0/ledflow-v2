import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  fontFamily?: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  dropUp?: boolean;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select option...',
  className = '',
  dropUp = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = (currentIndex + 1) % options.length;
        if (options[nextIndex]) {
          onChange(options[nextIndex].value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        if (options[prevIndex]) {
          onChange(options[prevIndex].value);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, options, value, onChange]);

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative inline-block w-full select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-8 px-2.5 bg-[#141418] hover:bg-[#1a1a22] border border-[#272732] hover:border-[#3a3a4c] focus:border-blue-500/80 rounded-lg text-xs text-[#e2e8f0] flex items-center justify-between gap-1.5 transition-all outline-none cursor-pointer ${
          isOpen ? 'border-blue-500 shadow-xs shadow-blue-500/20' : ''
        } ${className}`}
        style={selectedOption?.fontFamily ? { fontFamily: selectedOption.fontFamily } : undefined}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#7e7e90] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={listboxRef}
          className={`absolute left-0 right-0 z-50 min-w-[140px] max-h-56 overflow-y-auto bg-[#181820] border border-[#323242] rounded-xl p-1 shadow-2xl backdrop-blur-md custom-scrollbar ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={opt.fontFamily ? { fontFamily: opt.fontFamily } : undefined}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30'
                    : 'text-[#c0c0d2] hover:bg-[#232330] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
