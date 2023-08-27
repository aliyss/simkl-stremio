export async function getSimklLibrary() {
  throw new Error("Needs Implementation");
}

export interface SimklMovieAddToList {
  ids: {
    imdb: string;
  };
  to?: string;
  watched_at?: string;
}

export interface SimklShowEpisodeAddToList {
  number?: number;
  watched_at?: string;
}

export interface SimklShowSeasonAddToList {
  number?: number;
  watched_at?: string;
  episodes?: SimklShowEpisodeAddToList[];
}

export interface SimklShowAddToList {
  ids: {
    imdb: string;
  };
  to?: string;
  watched_at?: string;
  seasons?: SimklShowSeasonAddToList[];
}
