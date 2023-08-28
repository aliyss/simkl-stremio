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
import { getEnvValue } from "./environment";
import { StremioAPIClient } from "./stremio";

const backfill_lastepisodefill = getEnvValue("SIMKL_BACKFILL_LASTEPISODEFILL");

function convertStremioDateToSimkl(date: string) {
  return date.split("T")[0] + " " + date.split("T")[1].split(".")[0];
}

export function convertSimklLibraryToSimklLibraryObjectArray(
  simklLibrary: SimklLibrary,
): SimklLibraryObject[] {
  return [...simklLibrary.movies, ...simklLibrary.shows];
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
    if (e.stremio?.type === "movie") {
      let movieObject: SimklMovieAddToList = {
        ids: { imdb: e.stremio?._id },
      };
      if (e.stremio?.state.flaggedWatched || e.stremio?.state.timesWatched) {
        movieObject.to = "completed";
        movieObject.watched_at = convertStremioDateToSimkl(
          e.stremio?.state.lastWatched,
        );
      } else {
        movieObject.to = "plantowatch";
      }
      movies.push(movieObject);
    } else if (e.stremio?.type === "series") {
      let showObject: SimklShowAddToList = {
        ids: { imdb: e.stremio?._id },
      };
      if (e.stremio?.state.flaggedWatched) {
        showObject.to = "completed";
      } else if (
        e.stremio?.state.season === 0 &&
        e.stremio?.state.episode === 0
      ) {
        showObject.to = "plantowatch";
      } else {
        showObject.to = "watching";
      }
      shows.push(showObject);
    }
  }
  return { shows, movies };
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
    if (e.stremio?.type === "movie") {
      let movieObject: SimklMovieAddToList = {
        ids: { imdb: e.stremio?._id },
      };
      if (e.stremio?.state.flaggedWatched || e.stremio?.state.timesWatched) {
        movieObject.watched_at = convertStremioDateToSimkl(
          e.stremio?.state.lastWatched,
        );
        movies.push(movieObject);
      }
    } else if (e.stremio?.type === "series") {
      let showObject: SimklShowAddToList = {
        ids: { imdb: e.stremio?._id },
      };
      if (e.stremio?.state.flaggedWatched) {
        showObject.watched_at = convertStremioDateToSimkl(
          e.stremio?.state.lastWatched,
        );
      }
      if (e.stremio?.state.season === 0 && e.stremio?.state.episode === 0) {
      } else {
        showObject.seasons = [];
        let episodeList: string[] = [];
        let wb: any = null;
        if (!backfill_lastepisodefill) {
          try {
            const cinemataValues = await StremioAPIClient.getCinemetaMeta(
              e.stremio._id,
            );
            if (!cinemataValues) {
              throw "Not found";
            }
            episodeList =
              cinemataValues?.meta.videos
                .filter((e) => e.season > 0)
                .concat(
                  cinemataValues.meta.videos.filter((e) => e.season === 0),
                )
                .map((v) => e.stremio?._id + ":" + v.season + ":" + v.number) ||
              [];
            if (e.stremio.state.watched) {
              wb = watchedBitfield.constructAndResize(
                e.stremio?.state.watched,
                episodeList || [],
              );
            }
          } catch (e) {
            console.log(e);
          }
        }
        for (let i = 0; i < e.stremio?.state.season; i++) {
          let season: SimklShowSeasonAddToList = {
            number: i + 1,
          };
          if (backfill_lastepisodefill) {
            season.watched_at = convertStremioDateToSimkl(
              e.stremio?.state.lastWatched,
            );
            if (e.stremio?.state.season === i + 1) {
              season.episodes = [];
              for (let j = 0; j < e.stremio?.state.episode; j++) {
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
      }
      shows.push(showObject);
    }
  }
  return { shows, movies };
}
