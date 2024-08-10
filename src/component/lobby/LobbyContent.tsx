import { useSlideNavManager } from "component/SlideNavManager";
import React, { FunctionComponent, Suspense, useMemo } from "react";
import useCoord from "service/TerminalManager";
import styled from "styled-components";
const colors = ["red", "green", "blue", "orange", "grey"];
interface ContainerProps {
  height: string;
  width: string;
}
const SlideContainer = styled.div<ContainerProps>`
  display: flex;
  justify-content: flex-start;
  width: ${(props) => props.width};
  height: ${(props) => props.height};
  background-color: transparent;
`;
const SideContainer = styled.div<ContainerProps>`
  position: relative;
  width: ${(props) => props.width};
  height: ${(props) => props.height};
`;

const SlideNav = styled.div`
  width: 100%;
  height: 100%;
  margin: 5px 5px 5px 5px;
  padding: 0px;
  background-color: transparent;
`;
const SideNav = styled.div`
  width: 100%;
  height: 100%;
  margin: 0px;
  padding: 0px;
`;
const LobbyContent = () => {
  const { components, loadSlideContainer, loadSlide } = useSlideNavManager();
  const { height, width } = useCoord();

  const render = useMemo(() => {
    return (
      <>
        <div id="main-home" key={"main-home"} ref={loadSlideContainer} style={{ width: "100%", height: "100%" }}>
          {/* <div style={{ width: "100%", height: height - 60, backgroundColor: "green" }}></div> */}
          {width < height ? (
            <SlideContainer width={`${5 * width}px`} height={"100%"}>
              {components.map((c, index) => {
                if (c.component) {
                  const SelectedComponent: FunctionComponent = c.component;
                  return (
                    <div
                      key={c.name}
                      ref={(ele) => loadSlide(index, ele)}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        width: "100vw",
                        height: "100%",
                        backgroundColor: "red",
                      }}
                    >
                      <SlideNav>
                        <Suspense
                          fallback={
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                width: "100vw",
                                height: "100%",
                                backgroundColor: "red",
                              }}
                            >
                              Loading...
                            </div>
                          }
                        >
                          <SelectedComponent />
                        </Suspense>
                      </SlideNav>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={c.name}
                      ref={(ele) => loadSlide(index, ele)}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        width: "100vw",
                        height: "100%",
                        backgroundColor: "white",
                      }}
                    >
                      <SlideNav style={{ backgroundColor: colors[index] }}></SlideNav>
                    </div>
                  );
                }
              })}
            </SlideContainer>
          ) : (
            <SideContainer width={"100%"} height={"100%"}>
              {components.map((c, index) => {
                if (c.component) {
                  const SelectedComponent: FunctionComponent = c.component;
                  return (
                    <div
                      key={c.name}
                      ref={(ele) => loadSlide(c.index, ele)}
                      style={{
                        position: "absolute",
                        top: 0,
                        width: "100%",
                        height: "100%",
                        // backgroundColor: "red",
                      }}
                    >
                      <SideNav>
                        <Suspense
                          fallback={
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                width: "100vw",
                                height: "100%",
                              }}
                            >
                              Loading...
                            </div>
                          }
                        >
                          <SelectedComponent />
                        </Suspense>
                      </SideNav>
                    </div>
                  );
                } else
                  return (
                    <div
                      key={c.name}
                      ref={(ele) => loadSlide(c.index, ele)}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        opacity: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "red",
                      }}
                    >
                      <SideNav style={{ backgroundColor: colors[c.index] }}></SideNav>
                    </div>
                  );
              })}
            </SideContainer>
          )}
        </div>
      </>
    );
  }, [loadSlideContainer, width, height, components, loadSlide]);

  return <>{render}</>;
};

export default LobbyContent;
