import {
  MetaDetail,
  MetaPreview,
  Stream,
  addonBuilder,
} from "stremio-addon-sdk";
import manifest from "./manifest";
import { StremioAPIClient } from "./utils/stremio";
import { SimklAPIClient } from "./utils/simkl";
import { backfillFromStremioToSimkl } from "./utils/sync";

const builder = new addonBuilder(manifest);

(async () => {
  const stremioClient = await new StremioAPIClient().init();
  const simklClient = await new SimklAPIClient().init();

  await backfillFromStremioToSimkl(stremioClient, simklClient);
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
