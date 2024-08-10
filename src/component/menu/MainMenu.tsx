import React from "react";
import { useUserManager } from "service/UserManager";
import { usePageManager } from "../../service/PageManager";

const MainMenu: React.FC = () => {
  const { openPage } = usePageManager();
  const { user } = useUserManager();
  const openBattle = () => {
    // const url = "https://statuesque-cupcake-107222.netlify.app/tg";
    // window.Telegram.WebApp.openLink(url);
    let url = "match3/playcenter/tournament/home";
    if (user) {
      url = url + "?uid=" + user.uid + "&token=" + user.token;
      window.open(url);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 100,
        top: 20,
        right: 5,
        width: 50,
        height: 30,
        borderRadius: 4,
        backgroundColor: "white",
        color: "blue",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={openBattle}
    >
      Menu1
    </div>
  );
};

export default MainMenu;
