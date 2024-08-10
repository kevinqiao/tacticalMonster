// GlobalStyle.ts
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Arial', sans-serif;
  }

  h1 {
    font-size: 2rem;
    color: ${(props) => props.theme.primaryColor};
  }
`;

export default GlobalStyle;
