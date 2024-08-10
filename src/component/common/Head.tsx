// components/Head.tsx
import React from "react";
import { Helmet } from "react-helmet";
import useLocalization from "service/LocalizationManager";

const Head: React.FC = () => {
  const { locale } = useLocalization();
  console.log("locale:" + locale);
  const getFontLinks = () => {
    switch (locale) {
      case "zh-CN":
        return (
          <link href="https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap" rel="stylesheet" />
        );
      case "ja-JP":
        return <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP&display=swap" rel="stylesheet" />;
      case "en-US":
      default:
        return <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet" />;
    }
  };

  return <Helmet>{getFontLinks()}</Helmet>;
};

export default Head;
