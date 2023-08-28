import {
  convertFromStremioLibraryToSimklList,
  convertFromStremioLibraryToSimklWatchHistory,
  convertSimklLibraryToSimklLibraryObjectArray,
  convertStremioDateToSimkl,
} from "./convert";
import { getEnvValue } from "./environment";
import { SimklAPIClient, SimklLibraryObject } from "./simkl";
import { StremioAPIClient, StremioLibraryObject } from "./stremio";

const simklSettings = {
  backfill_listshows: getEnvValue("SIMKL_BACKFILL_LISTSHOWS") === "true",
  backfill_listmovies: getEnvValue("SIMKL_BACKFILL_LISTMOVIES") === "true",
  backfill_watchhistoryshows:
    getEnvValue("SIMKL_BACKFILL_WATCHHISTORYSHOWS") === "true",
  backfill_watchhistorymovies:
    getEnvValue("SIMKL_BACKFILL_WATCHHISTORYMOVIES") === "true",
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
  if (simklSettings.backfill_listmovies && value.stremio.type === "movie") {
    if (!value.simkl) {
      return true;
    }
    if (value.simkl.status === "completed") {
      return;
    }
    if (simklSettings.backfill_modifylist) {
      return true;
    }
  }
  if (simklSettings.backfill_listshows && value.stremio.type === "series") {
    if (!value.simkl) {
      return true;
    }
    if (simklSettings.backfill_modifylist) {
      return true;
    }
  }
}

function stremioToSimklWatchHistorySyncLogic(
  value: GroupedStremioWithSimklObject,
): boolean | void {
  if (!value.stremio) {
    return;
  }
  if (
    simklSettings.backfill_watchhistorymovies &&
    value.stremio.type === "movie"
  ) {
    if (!value.simkl) {
      return true;
    }
    if (value.simkl.status === "completed") {
      return;
    }
    return true;
  }
  if (
    simklSettings.backfill_watchhistoryshows &&
    value.stremio.type === "series"
  ) {
    if (!value.simkl) {
      return true;
    }
    if (!value.stremio.state.watched) {
      return;
    }
    if (
      value.simkl.last_watched_at &&
      new Date(convertStremioDateToSimkl(value.stremio.state.lastWatched)) <
        new Date(value.simkl.last_watched_at)
    ) {
      return;
    }
    return true;
  }
}

export async function backfillFromStremioToSimkl(
  stremioClient: StremioAPIClient,
  simklClient: SimklAPIClient,
  force = false,
) {
  const stremioLibrary = await stremioClient.getLibrary();
  const simklLibrary = await simklClient.getLibrary();

  const groupedLibrary = groupStremioWithSimkl(
    stremioLibrary,
    convertSimklLibraryToSimklLibraryObjectArray(simklLibrary),
  );

  if (
    simklSettings.backfill_listshows ||
    simklSettings.backfill_listmovies ||
    force
  ) {
    let backfillToList = convertFromStremioLibraryToSimklList(
      groupedLibrary,
      stremioToSimklListSyncLogic,
    );

    await simklClient.updateMoviesList(backfillToList.movies);
    await simklClient.updateShowsList(backfillToList.shows);
  }

  if (
    simklSettings.backfill_watchhistoryshows ||
    simklSettings.backfill_watchhistorymovies ||
    force
  ) {
    let backfillToWatchHistory =
      await convertFromStremioLibraryToSimklWatchHistory(
        groupedLibrary,
        stremioToSimklWatchHistorySyncLogic,
      );

    await simklClient.updateMoviesHistory(backfillToWatchHistory.movies);
    await simklClient.updateShowsHistory(backfillToWatchHistory.shows);
  }
}
