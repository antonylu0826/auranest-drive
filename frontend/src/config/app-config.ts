import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "AuraNest Drive",
  version: packageJson.version,
  copyright: `© ${currentYear}, AuraNest Drive.`,
  meta: {
    title: "AuraNest Drive",
    description: "AuraNest Drive — 安全、可協作的雲端檔案管理平台。",
  },
};
