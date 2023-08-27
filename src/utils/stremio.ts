import axios from "axios";
import { setEnvValue } from "./environment";

const getStremioLibraryOptions = {
  url: "https://api.strem.io/api/datastoreGet",
  headers: { "content-type": "application/json" },
  data: {
    authKey: "",
    collection: "libraryItem",
    ids: [],
    all: true,
  },
};

export async function getStremioLibrary(authKey: string) {
  let {
    data: { result, error },
  } = await axios.post(
    getStremioLibraryOptions.url,
    { ...getStremioLibraryOptions.data, authKey },
    { headers: getStremioLibraryOptions.headers },
  );
  if (error) {
    setEnvValue("STREMIO_AUTHKEY", "");
  }
  return result;
}

export interface StremioLibraryObjectState {
  lastWatched: string;
  timeWatched: number;
  timeOffset: number;
  overallTimeWatched: 0;
  timesWatched: number;
  flaggedWatched: 0 | 1;
  duration: number;
  video_id: string;
  watched: string;
  noNotif: boolean;
  season: number;
  episode: number;
}

export interface StremioLibraryObject {
  _id: string;
  removed: boolean;
  temp: boolean;
  _ctime: string;
  _mtime: string;
  state: StremioLibraryObjectState;
  name: string;
  type: "movie" | "series";
  poster: string;
  background: string;
  logo: string;
  year: string;
}
