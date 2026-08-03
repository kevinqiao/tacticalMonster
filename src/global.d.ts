// 确保这个文件的内容在全局范围内可见
declare global {
    interface Window {
        opera?: any;
        MSStream?: any;
        solana?: any;  // Solana钱包扩展
        ethereum?: any;  // MetaMask/以太坊钱包扩展
    }
}

export { };

