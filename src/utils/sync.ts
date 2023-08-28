import {
  convertFromStremioLibraryToSimklList,
  convertFromStremioLibraryToSimklWatchHistory,
  convertSimklLibraryToSimklLibraryObjectArray,
} from "./convert";
import { getEnvValue } from "./environment";
import { SimklAPIClient, SimklLibraryObject } from "./simkl";
import { StremioAPIClient, StremioLibraryObject } from "./stremio";

const simklSettings = {
  backfill_shows: getEnvValue("SIMKL_BACKFILL_SHOWS") === "true",
  backfill_movies: getEnvValue("SIMKL_BACKFILL_MOVIES") === "true",
  backfill_modifylist: getEnvValue("SIMKL_BACKFILL_MODIFYLIST") === "true",
};

export interface GroupedStremioWithSimklObject {
  stremio?: StremioLibraryObject;
  simkl?: SimklLibraryObject;
}

function groupStremioWithSimkl(
  stremioLibrary: StremioLibraryObject[],
  simklLibrary: SimklLibraryObject[],
) {
  const groupedStremioObject = stremioLibrary.reduce<
    Record<string, { stremio: StremioLibraryObject }>
  >((accum, obj) => {
    const id = obj._id;
    if (!accum[id]) accum[id] = { stremio: obj };
    return accum;
  }, {});

  const groupedStremioWithSimklObject = simklLibrary.reduce<
    Record<string, GroupedStremioWithSimklObject>
  >((accum, obj) => {
    let id = "";
    if (obj.show) {
      id = obj.show.ids.imdb;
    } else if (obj.movie) {
      id = obj.movie.ids.imdb;
    }
    if (!accum[id]) accum[id] = { simkl: obj };
    else accum[id] = { ...accum[id], simkl: obj };
    return accum;
  }, groupedStremioObject);

  return Object.values(groupedStremioWithSimklObject);
}

function stremioToSimklListSyncLogic(
  value: GroupedStremioWithSimklObject,
): boolean | void {
  if (!value.stremio) {
    return;
  }
  if (simklSettings.backfill_movies && value.stremio.type === "movie") {
    if (!value.simkl) {
      return true;
    }
    if (value.simkl.status === "completed") {
      return;
    }
    return true;
  }
  if (simklSettings.backfill_shows && value.stremio.type === "series") {
    if (!value.simkl) {
      return true;
    }
    return true;
  }
}

function stremioToSimklWatchHistorySyncLogic(
  value: GroupedStremioWithSimklObject,
): boolean | void {
  if (!value.stremio) {
    return;
  }
  if (simklSettings.backfill_movies && value.stremio.type === "movie") {
    if (!value.simkl) {
      return true;
    }
    if (value.simkl.status === "completed") {
      return;
    }
    return true;
  }
  if (simklSettings.backfill_shows && value.stremio.type === "series") {
    if (!value.simkl) {
      return true;
    }
    return true;
  }
}

export async function backfillFromStremioToSimkl(
  stremioClient: StremioAPIClient,
  simklClient: SimklAPIClient,
) {
  if (!simklSettings.backfill_shows && !simklSettings.backfill_movies) {
    return;
  }

  const stremioLibrary = await stremioClient.getLibrary();
  const simklLibrary = await simklClient.getLibrary();

  const groupedLibrary = groupStremioWithSimkl(
    stremioLibrary,
    convertSimklLibraryToSimklLibraryObjectArray(simklLibrary),
  );

  let backfillToList = convertFromStremioLibraryToSimklList(
    groupedLibrary,
    stremioToSimklListSyncLogic,
  );

  let backfillToWatchHistory =
    await convertFromStremioLibraryToSimklWatchHistory(
      groupedLibrary,
      stremioToSimklWatchHistorySyncLogic,
    );

  if (simklSettings.backfill_modifylist) {
    await simklClient.updateMoviesList(backfillToList.movies);
    await simklClient.updateShowsList(backfillToList.shows);
  }

  await simklClient.updateMoviesHistory(backfillToWatchHistory.movies);
  await simklClient.updateShowsHistory(backfillToWatchHistory.shows);
}
