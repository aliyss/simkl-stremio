import { Manifest } from "stremio-addon-sdk";
import { ADDON_ID } from "./constants";
import { version, description } from "../package.json";

const manifest: Manifest = {
  id: `com.aliyss.${ADDON_ID}`,
  name: "SIMKL",
  version,
  description,
  logo: "https://avatars.githubusercontent.com/u/9755912?s=200&v=4",
  background: "",
  catalogs: [],
  resources: ["catalog", "meta", "stream", "subtitles"],
  types: ["series", "movie"],
  behaviorHints: {
    // @ts-ignore
    configurable: true,
    configurationRequired: true,
  },
};

export default manifest;
