import {
  SimklLibrary,
  SimklLibraryObject,
  SimklMovieAddToList,
  SimklShowAddToList,
  SimklShowSeasonAddToList,
} from "./simkl";
// @ts-ignore
import watchedBitfield from "stremio-watched-bitfield";
import { GroupedStremioWithSimklObject } from "./sync";
import {
  StremioAPIClient,
  StremioCinemataMetaSeriesData,
  StremioLibraryObject,
} from "./stremio";

const backfill_lastepisodefill = false;

export function convertStremioDateToSimkl(date: string) {
  return date.split("T")[0] + " " + date.split("T")[1].split(".")[0];
}

export function convertSimklLibraryToSimklLibraryObjectArray(
  simklLibrary: SimklLibrary,
): SimklLibraryObject[] {
  return [...simklLibrary.movies, ...simklLibrary.shows];
}

export function convertFromStremioLibraryToSimklListMovie(
  stremio: StremioLibraryObject,
) {
  let movieObject: SimklMovieAddToList = {
    title: stremio.name,
    ids: { imdb: stremio._id },
  };
  if (
    stremio.state.flaggedWatched ||
    (stremio.state.lastWatched && stremio.state.timesWatched)
  ) {
    movieObject.to = "completed";
    movieObject.watched_at = convertStremioDateToSimkl(
      stremio.state.lastWatched,
    );
  } else {
    movieObject.to = "plantowatch";
  }
  return movieObject;
}

export function convertFromStremioLibraryToSimklListShow(
  stremio: StremioLibraryObject,
) {
  let showObject: SimklShowAddToList = {
    title: stremio.name,
    ids: { imdb: stremio._id },
  };
  if (stremio.state.flaggedWatched) {
    showObject.to = "completed";
  } else if (stremio.state.season === 0 && stremio.state.episode === 0) {
    showObject.to = "plantowatch";
  } else {
    showObject.to = "watching";
  }
  return showObject;
}

export function convertFromStremioLibraryToSimklList(
  libraryObjects: GroupedStremioWithSimklObject[],
  filter?: (
    value: GroupedStremioWithSimklObject,
    index?: number,
    array?: GroupedStremioWithSimklObject[],
  ) => unknown,
) {
  let shows: SimklShowAddToList[] = [];
  let movies: SimklMovieAddToList[] = [];

  if (!filter) {
    filter = () => true;
  }

  const filtered = libraryObjects.filter(filter);

  for (let s = 0; s < filtered.length; s++) {
    const e = filtered[s];
    if (!e.stremio) {
      continue;
    }
    if (e.stremio.type === "movie") {
      let movie = convertFromStremioLibraryToSimklListMovie(e.stremio);
      if (movie) {
        movies.push(movie);
      }
    } else if (e.stremio.type === "series") {
      let show = convertFromStremioLibraryToSimklListMovie(e.stremio);
      if (show) {
        shows.push(show);
      }
    }
  }
  return { shows, movies };
}

export function convertFromStremioLibraryToSimklWatchHistoryMovie(
  stremio: StremioLibraryObject,
) {
  let movieObject: SimklMovieAddToList = {
    ids: { imdb: stremio._id },
  };
  if (stremio.state.flaggedWatched && stremio.state.timesWatched) {
    movieObject.watched_at = convertStremioDateToSimkl(
      stremio.state.lastWatched,
    );
  }
  return movieObject;
}

function convertCinemetaMetaValuesToStremioVideoId(
  cinemeta: StremioCinemataMetaSeriesData | undefined,
  id: string,
) {
  if (!cinemeta) {
    return [];
  }

  return cinemeta.meta.videos
    .filter((e) => e.season > 0)
    .concat(cinemeta.meta.videos.filter((e) => e.season === 0))
    .map((v) => id + ":" + v.season + ":" + v.number);
}

export async function convertCinemataToStremioWatchedBitField(
  stremio: StremioLibraryObject,
) {
  const cinemataValues = await StremioAPIClient.getCinemetaMeta(stremio._id);
  if (!cinemataValues) {
    throw "Not found";
  }

  const episodeList = convertCinemetaMetaValuesToStremioVideoId(
    cinemataValues,
    stremio._id,
  );

  let wb: any;
  if (stremio.state.watched) {
    wb = watchedBitfield.constructAndResize(
      stremio.state.watched,
      episodeList || [],
    );
  }
  return { episodeList, wb };
}

export async function convertFromStremioLibraryToSimklWatchHistoryShow(
  stremio: StremioLibraryObject,
) {
  let showObject: SimklShowAddToList = {
    ids: { imdb: stremio._id },
  };

  if (stremio.state.flaggedWatched) {
    showObject.watched_at = convertStremioDateToSimkl(
      stremio.state.lastWatched,
    );
  }

  if (stremio.state.season === 0 && stremio.state.episode === 0) {
    return showObject;
  }

  let episodeList: string[] = [];
  let wb: any = null;

  if (!backfill_lastepisodefill) {
    try {
      let response = await convertCinemataToStremioWatchedBitField(stremio);
      episodeList = response.episodeList;
      wb = response.wb;
    } catch (e) {
      console.log(e);
    }
  }

  showObject.seasons = [];
  for (
    let i = 0;
    i <
    (stremio.state.watched
      ? parseInt(stremio.state.watched.split(":")[1])
      : stremio.state.season);
    i++
  ) {
    let season: SimklShowSeasonAddToList = {
      number: i + 1,
    };
    if (backfill_lastepisodefill) {
      season.watched_at = convertStremioDateToSimkl(stremio.state.lastWatched);
      if (stremio.state.season === i + 1) {
        season.episodes = [];
        for (let j = 0; j < stremio.state.episode; j++) {
          let episode = j + 1;
          season.episodes.push({
            number: episode,
          });
        }
      }
    } else {
      season.episodes = [];
      episodeList
        .filter((v) => v.split(":")[1] === season.number?.toString())
        .forEach((ep) => {
          const splitEp = parseInt(ep.split(":")[2]);
          if (wb && wb.getVideo(ep)) {
            if (season.episodes && !season.episodes[splitEp - 1]) {
              season.episodes.push({ number: splitEp });
            }
          }
        });
    }
    showObject.seasons.push(season);
  }
  return showObject;
}

export async function convertFromStremioLibraryToSimklWatchHistory(
  libraryObjects: GroupedStremioWithSimklObject[],
  filter?: (
    value: GroupedStremioWithSimklObject,
    index?: number,
    array?: GroupedStremioWithSimklObject[],
  ) => unknown,
) {
  let shows: SimklShowAddToList[] = [];
  let movies: SimklMovieAddToList[] = [];

  if (!filter) {
    filter = () => true;
  }

  const filtered = libraryObjects.filter(filter);

  for (let s = 0; s < filtered.length; s++) {
    const e = filtered[s];
    if (!e.stremio) {
      continue;
    }
    if (e.stremio.type === "movie") {
      const movie = convertFromStremioLibraryToSimklWatchHistoryMovie(
        e.stremio,
      );
      if (movie) {
        movies.push(movie);
      }
    } else if (e.stremio.type === "series") {
      const show = await convertFromStremioLibraryToSimklWatchHistoryShow(
        e.stremio,
      );
      if (show) {
        shows.push(show);
      }
    }
  }
  return { shows, movies };
}
