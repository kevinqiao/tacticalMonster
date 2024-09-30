import React, { ChangeEvent, useState } from "react";

// 定义组件的 props 类型
interface CustomInputProps {
  label: string;
  placeholder?: string;
  validateInput?: (inputValue: string) => boolean;
  errorMessage?: string;
  onClose: () => void;
}

const NameInput: React.FC<CustomInputProps> = ({
  label,
  placeholder = "",
  validateInput,
  errorMessage = "Invalid input",
  onClose,
}) => {
  const [value, setValue] = useState<string>(""); // 使用 useState 进行输入值管理
  const [isValid, setIsValid] = useState<boolean>(true); // 用于验证状态

  // 处理输入变化
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setValue(inputValue);

    // 如果传入了验证函数，则进行验证
    if (validateInput) {
      setIsValid(validateInput(inputValue));
    }
  };

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <label>{label}</label>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          style={{
            border: isValid ? "1px solid green" : "1px solid red",
            padding: "10px",
            margin: "0px",
            borderRadius: "4px",
            width: "100%",
            minWidth: "0px",
          }}
        />
        {!isValid && <span style={{ color: "red", fontSize: "12px" }}>{errorMessage}</span>}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100px",
          height: "40px",
          backgroundColor: "blue",
          color: "white",
        }}
        onClick={onClose}
      >
        Ok
      </div>
    </>
  );
};

export default NameInput;
