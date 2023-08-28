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
const stremioClient = new StremioAPIClient();
const simklClient = new SimklAPIClient();

(async () => {
  await stremioClient.init();
  await simklClient.init();

  await backfillFromStremioToSimkl(stremioClient, simklClient);
})();

builder.defineCatalogHandler(async (args) => {
  // console.log(args, "catalog");

  let metas: MetaPreview[] = [];

  return { metas };
});

builder.defineMetaHandler(async (args) => {
  // console.log(args, "meta");

  let meta: MetaDetail = null as unknown as MetaDetail;

  return { meta };
});

builder.defineSubtitlesHandler(async (args) => {
  // console.log(args, "subtitles");

  let info = await StremioAPIClient.getCinemetaMeta(
    args.id.split(":")[0],
    args.type,
  );

  let timeout = 0;
  if (info?.meta.runtime) {
    timeout = parseInt(info.meta.runtime.split(" ")[0]) * 60 * 1000;
  }

  setTimeout(async function () {
    await backfillFromStremioToSimkl(stremioClient, simklClient);
  }, timeout);

  return Promise.resolve({ subtitles: [] });
});

builder.defineStreamHandler(async ({ id, type }) => {
  // console.log(id, type, "stream");

  let streams: Stream[] = [];

  return { streams };
});

export default builder.getInterface();
