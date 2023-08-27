import {
  MetaDetail,
  MetaPreview,
  Stream,
  addonBuilder,
} from "stremio-addon-sdk";
import manifest from "./manifest";
import { getStremioAuthKey } from "./auth";
import { getStremioLibrary } from "./utils/stremio";
import { getEnvValue, setEnvValue } from "./utils/environment";

const builder = new addonBuilder(manifest);

let authKey = getEnvValue("STREMIO_AUTHKEY");
let stremioAuth = {
  email: getEnvValue("STREMIO_EMAIL"),
  password: getEnvValue("STREMIO_PASSWORD"),
};
let simklSettings = {
  backfill_series: getEnvValue("SIMKL_BACKFILL_SERIES"),
  backfill_movies: getEnvValue("SIMKL_BACKFILL_MOVIES"),
};

let stremioLibrary = [];

(async () => {
  if (!authKey && stremioAuth.email && stremioAuth.password) {
    authKey = await getStremioAuthKey({
      email: stremioAuth.email,
      password: stremioAuth.password,
      authKey: null,
    });
    console.warn(
      "You can now remove STREMIO_EMAIL & STREMIO_PASSWORD if you want. Otherwise it will be used as a fallback.",
    );
    setEnvValue("STREMIO_AUTHKEY", authKey || "");
  } else if (!authKey) {
    console.error(
      "Try reauthenticating by adding your STREMIO_EMAIL & STREMIO_PASSWORD to .env",
    );
    throw new Error("Invalid .env file!");
  }

  if (!authKey) {
    return;
  }

  if (simklSettings.backfill_movies || simklSettings.backfill_series) {
    stremioLibrary = await getStremioLibrary(authKey);
    console.log(stremioLibrary);
  }
})();

builder.defineCatalogHandler(async (args) => {
  console.log(args);

  let metas: MetaPreview[] = [];

  return { metas };
});

builder.defineMetaHandler(async ({ id, type }) => {
  console.log(id, type);

  let meta: MetaDetail = null as unknown as MetaDetail;

  return { meta };
});

builder.defineSubtitlesHandler(async (args) => {
  console.log(args);

  return Promise.resolve({ subtitles: [] });
});

builder.defineStreamHandler(async ({ id, type }) => {
  console.log(id, type, "here");

  let streams: Stream[] = [];

  return { streams };
});

export default builder.getInterface();
