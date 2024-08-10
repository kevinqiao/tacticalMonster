// StyledComponents.ts
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: ${(props) => props.theme.backgroundColor};
`;

const Heading = styled.h1`
  color: ${(props) => props.theme.primaryColor};
`;

const Button = styled.button`
  padding: 10px 20px;
  margin-top: 20px;
  background-color: ${(props) => props.theme.primaryColor};
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.secondaryColor};
  }
`;
const Loading = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-color: red;
  color: white;
`;
const AuthCloseBtn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0px;
  right: 0px;
  width: 60px;
  height: 50px;
  background-color: white;
  color: blue;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;
const MemberMenuCloseBtn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0px;
  left: 0px;
  width: 60px;
  height: 50px;
  background-color: white;
  color: blue;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;
export { AuthCloseBtn, Button, Container, Heading, Loading, MemberMenuCloseBtn };

