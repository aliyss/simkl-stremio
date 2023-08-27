import {
  SimklMovieAddToList,
  SimklShowAddToList,
  SimklShowSeasonAddToList,
} from "./simkl";
import { StremioLibraryObject } from "./stremio";

function convertStremioDateToSimkl(date: string) {
  return date.split("T")[0] + " " + date.split("T")[1].split(".")[0];
}

export function convertFromStremioToSimkl(
  stremioLibraryObjects: StremioLibraryObject[],
) {
  let shows: SimklShowAddToList[] = [];
  let movies: SimklMovieAddToList[] = [];

  stremioLibraryObjects.forEach((e) => {
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
        showObject.watched_at = convertStremioDateToSimkl(e.state.lastWatched);
      } else if (e.state.season === 0 && e.state.episode === 0) {
        showObject.to = "plantowatch";
      } else {
        showObject.to = "watching";
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
