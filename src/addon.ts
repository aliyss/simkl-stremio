import {
  MetaDetail,
  MetaPreview,
  Stream,
  addonBuilder,
  getRouter,
} from "stremio-addon-sdk";
import manifest from "./manifest";

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args: any) => {
  // console.log(args, "catalog");

  let metas: MetaPreview[] = [];

  return { metas };
});

builder.defineMetaHandler(async (args: any) => {
  // console.log(args, "meta");

  let meta: MetaDetail = null as unknown as MetaDetail;

  return { meta };
});

builder.defineSubtitlesHandler(async (args) => {
  // console.log(args, "subtitles");

  return Promise.resolve({ subtitles: [] });
});

builder.defineStreamHandler(async (args) => {
  // console.log(args, "stream");

  let streams: Stream[] = [];

  return { streams };
});

const builderInterface = builder.getInterface();
export default getRouter(builderInterface);
