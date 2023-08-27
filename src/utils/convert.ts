import {
  SimklMovieAddToList,
  SimklShowAddToList,
  SimklShowSeasonAddToList,
} from "./simkl";
import { StremioLibraryObject } from "./stremio";

function convertStremioDateToSimkl(date: string) {
  return date.split("T")[0] + " " + date.split("T")[1].split(".")[0];
}

export function convertFromStremioLibraryToSimklList(
  stremioLibraryObjects: StremioLibraryObject[],
  filter?: (
    value: StremioLibraryObject,
    index?: number,
    array?: StremioLibraryObject[],
  ) => unknown,
) {
  let shows: SimklShowAddToList[] = [];
  let movies: SimklMovieAddToList[] = [];

  if (!filter) {
    filter = () => true;
  }

  stremioLibraryObjects.filter(filter).forEach((e) => {
    if (e.type === "movie") {
      let movieObject: SimklMovieAddToList = {
        ids: { imdb: e._id },
      };
      if (e.state.flaggedWatched || e.state.timesWatched) {
        movieObject.to = "completed";
        movieObject.watched_at = convertStremioDateToSimkl(e.state.lastWatched);
      } else {
        movieObject.to = "plantowatch";
      }
      movies.push(movieObject);
    } else if (e.type === "series") {
      let showObject: SimklShowAddToList = {
        ids: { imdb: e._id },
      };
      if (e.state.flaggedWatched) {
        showObject.to = "completed";
      } else if (e.state.season === 0 && e.state.episode === 0) {
        showObject.to = "plantowatch";
      } else {
        showObject.to = "watching";
      }
      shows.push(showObject);
    }
  });
  return { shows, movies };
}

export function convertFromStremioLibraryToSimklWatchHistory(
  stremioLibraryObjects: StremioLibraryObject[],
  filter?: (
    value: StremioLibraryObject,
    index?: number,
    array?: StremioLibraryObject[],
  ) => unknown,
) {
  let shows: SimklShowAddToList[] = [];
  let movies: SimklMovieAddToList[] = [];

  if (!filter) {
    filter = () => true;
  }

  stremioLibraryObjects.filter(filter).forEach((e) => {
    if (e.type === "movie") {
      let movieObject: SimklMovieAddToList = {
        ids: { imdb: e._id },
      };
      if (e.state.flaggedWatched || e.state.timesWatched) {
        movieObject.watched_at = convertStremioDateToSimkl(e.state.lastWatched);
        movies.push(movieObject);
      }
    } else if (e.type === "series") {
      let showObject: SimklShowAddToList = {
        ids: { imdb: e._id },
      };
      if (e.name.startsWith("Solar")) {
        console.log(e);
      }
      if (e.state.flaggedWatched) {
        showObject.watched_at = convertStremioDateToSimkl(e.state.lastWatched);
      }
      if (e.state.season === 0 && e.state.episode === 0) {
      } else {
        showObject.seasons = [];
        for (let i = 0; i < e.state.season; i++) {
          let season: SimklShowSeasonAddToList = {
            number: i + 1,
            watched_at: convertStremioDateToSimkl(e.state.lastWatched),
          };
          if (e.state.season === i + 1) {
            season.episodes = [];
            for (let j = 0; j < e.state.episode; j++) {
              let episode = j + 1;
              season.episodes.push({
                number: episode,
              });
            }
          }
          showObject.seasons.push(season);
        }
      }
      shows.push(showObject);
    }
  });
  return { shows, movies };
}
