import React, { useRef, useState } from "react";

interface EditableDivProps {
  placeholder?: string;
  initialValue?: string;
  onContentChange?: (content: string) => void;
}

const EditableNumPad: React.FC<EditableDivProps> = ({
  placeholder = "Click here to edit...",
  initialValue = "",
  onContentChange,
}) => {
  const [content, setContent] = useState<string>(initialValue || placeholder);
  const divRef = useRef<HTMLDivElement>(null);

  const handleInput = () => {
    if (divRef.current) {
      const text = divRef.current.innerText;
      setContent(text);
      onContentChange && onContentChange(text);
    }
  };

  const handleFocus = () => {
    if (content === placeholder && divRef.current) {
      divRef.current.innerText = "";
    }
  };

  const handleBlur = () => {
    if (content.trim() === "" && divRef.current) {
      divRef.current.innerText = placeholder;
      setContent(placeholder);
    }
  };

  return (
    <div
      ref={divRef}
      contentEditable
      style={{
        border: "1px solid #ccc",
        padding: "8px",
        minHeight: "20px",
        borderRadius: "4px",
        outline: "none",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
      }}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleBlur}
      suppressContentEditableWarning={true} // 用来抑制 React 对 contentEditable 的警告
    >
      {content}
    </div>
  );
};

export default EditableNumPad;
