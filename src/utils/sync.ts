import {
  convertFromStremioLibraryToSimklList,
  convertFromStremioLibraryToSimklWatchHistory,
  convertSimklLibraryToSimklLibraryObjectArray,
  convertStremioDateToSimkl,
} from "./convert";
import { SimklAPIClient, SimklLibraryObject } from "./simkl";
import { StremioAPIClient, StremioLibraryObject } from "./stremio";
import config from "../../config.json";

const simklSettings = config;

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
  force: boolean,
): (value: GroupedStremioWithSimklObject) => boolean | void {
  return (value: GroupedStremioWithSimklObject): boolean | void => {
    if (!value.stremio) {
      return;
    }
    if (!value.simkl) {
      return true;
    }
    if (value.simkl.status === "completed") {
      return;
    }
    if (
      (simklSettings.backfill_listmovies || force) &&
      value.stremio.type === "movie"
    ) {
      if (simklSettings.backfill_modifylist) {
        return true;
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
    if (
      (simklSettings.backfill_listshows || force) &&
      value.stremio.type === "series"
    ) {
      if (simklSettings.backfill_modifylist) {
        return true;
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
  };
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
  authKey: string,
  accessToken: string,
  clientId: string,
  force = false,
) {
  const { result: stremioLibrary, authKey: newAuthKey } =
    await StremioAPIClient.getLibrary(authKey);
  const simklLibrary = await SimklAPIClient.getLibrary(accessToken, clientId);

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
      stremioToSimklListSyncLogic(force),
    );

    await SimklAPIClient.updateShowsList(
      accessToken,
      clientId,
      backfillToList.movies,
    );
    await SimklAPIClient.updateShowsList(
      accessToken,
      clientId,
      backfillToList.shows,
    );
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

    await SimklAPIClient.updateMoviesHistory(
      accessToken,
      clientId,
      backfillToWatchHistory.movies,
    );
    await SimklAPIClient.updateShowsHistory(
      accessToken,
      clientId,
      backfillToWatchHistory.shows,
    );
  }

  return { authKey: newAuthKey || authKey, accessToken, clientId };
}
