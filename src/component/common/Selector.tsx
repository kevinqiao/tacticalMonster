import React, { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectorProps {
  options: Option[];
  placeholder?: string;
  onSelect: (value: string) => void;
}

const Selector: React.FC<SelectorProps> = ({ options, placeholder = "Select an employee no", onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: Option) => {
    setSelectedValue(option.label);
    onSelect(option.value);
    setIsOpen(false);
  };

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={selectorRef}
      style={{
        position: "relative",
        width: "100%",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "10px",
        backgroundColor: "#fff",
        cursor: "pointer",
      }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div>{selectedValue || placeholder}</div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#fff",
            zIndex: 1000,
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Selector;
