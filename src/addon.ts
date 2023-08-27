import {
  MetaDetail,
  MetaPreview,
  Stream,
  addonBuilder,
} from "stremio-addon-sdk";
import manifest from "./manifest";
import { StremioAPIClient, StremioLibraryObject } from "./utils/stremio";
import { getEnvValue } from "./utils/environment";
import {
  convertFromStremioLibraryToSimklList,
  convertFromStremioLibraryToSimklWatchHistory,
} from "./utils/convert";
import { SimklAPIClient } from "./utils/simkl";

const builder = new addonBuilder(manifest);

let simklSettings = {
  backfill_shows: getEnvValue("SIMKL_BACKFILL_SHOWS"),
  backfill_movies: getEnvValue("SIMKL_BACKFILL_MOVIES"),
  backfill_modifylist: getEnvValue("SIMKL_BACKFILL_MODIFYLIST"),
};

let stremioLibrary: StremioLibraryObject[] = [];

(async () => {
  const stremioClient = await new StremioAPIClient().init();
  const simklClient = await new SimklAPIClient().init();
  if (simklSettings.backfill_movies || simklSettings.backfill_shows) {
    const stremioLibraryResponse = await stremioClient.getStremioLibrary();
    if (stremioLibraryResponse) {
      stremioLibrary = stremioLibraryResponse;

      let backfillToList = convertFromStremioLibraryToSimklList(
        stremioLibrary,
        (value) => {
          if (simklSettings.backfill_movies && value.type === "movie") {
            return true;
          }
          if (simklSettings.backfill_shows && value.type === "series") {
            return true;
          }
        },
      );

      let backfillToWatchHistory = convertFromStremioLibraryToSimklWatchHistory(
        stremioLibrary,
        (value) => {
          if (simklSettings.backfill_movies && value.type === "movie") {
            return true;
          }
          if (simklSettings.backfill_shows && value.type === "series") {
            return true;
          }
        },
      );
      if (simklSettings.backfill_modifylist) {
        simklClient.updateMoviesList(backfillToList.movies);
        simklClient.updateShowsList(backfillToList.shows);
      }
      simklClient.updateMoviesHistory(backfillToWatchHistory.movies);
      simklClient.updateShowsHistory(backfillToWatchHistory.shows);
    }
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
