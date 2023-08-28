import axios from "axios";
import { getEnvValue, setEnvValue } from "./environment";
import { delay } from "./delay";

export class SimklAPIClient {
  id: string = "";
  accessToken: string = "";
  library: SimklLibrary = {
    movies: [],
    shows: [],
  };

  constructor() {
    this.id = SimklAPIClient.validateClientIdFromEnv();
    this.accessToken = getEnvValue("SIMKL_ACCESSTOKEN") || "";
  }

  async init() {
    this.accessToken = await this.updateAccessToken();
    return this;
  }

  static validateClientIdFromEnv(): string {
    const id = getEnvValue("SIMKL_CLIENTID");
    if (!id) {
      throw new Error(
        "Reauthenticate by setting SIMKL_CLIENTID in your .env file",
      );
    }
    return id;
  }

  async updateAccessTokenWithClientId(id: string = this.id): Promise<string> {
    const {
      data: { user_code, verification_url, expires_in, interval },
    } = await axios.get<{
      user_code: string;
      verification_url: string;
      expires_in: number;
      interval: number;
    }>(
      `https://api.simkl.com/oauth/pin?client_id=${
        id ? id : SimklAPIClient.validateClientIdFromEnv()
      }`,
    );

    if (!user_code || !verification_url) {
      console.warn(
        "Updating AccessToken - Authenticatation Method: ClientId - FAILED",
      );
      throw new Error("Invalid user_code or verification_url.");
    } else if (!interval || !expires_in) {
      console.warn(
        "Updating AccessToken - Authenticatation Method: ClientId - FAILED",
      );
      throw new Error("Invalid interval or expiry response by api.");
    }

    console.log(
      "Open the link and input your code:\n\nLink: " +
        verification_url +
        "\nCode: " +
        user_code,
    );

    for (let i = 0; i < expires_in; i = i + interval) {
      console.log(
        `(${i / interval}/${
          expires_in / interval
        }) Polling for response every ${interval} seconds.`,
      );
      await delay(interval * 1000);
      const {
        data: { access_token },
      } = await axios.get(
        `https://api.simkl.com/oauth/pin/${user_code}?client_id=${id}`,
      );
      if (access_token) {
        setEnvValue("SIMKL_ACCESSTOKEN", access_token);
        return access_token;
      }
    }

    throw new Error(
      "Getting the code timed out. Try restarting the application.",
    );
  }

  async updateAccessToken(accessToken = this.accessToken): Promise<string> {
    if (!accessToken) {
      return await this.updateAccessTokenWithClientId();
    }
    return accessToken;
  }

  createSimklHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "simkl-api-key": this.id,
    };
  }

  async getLibrary() {
    const { data } = await axios.get(`https://api.simkl.com/sync/all-items`, {
      headers: this.createSimklHeaders(),
    });
    if (data.movies && data.movies.length > 0) {
      this.library.movies = data.movies;
    }
    if (data.shows && data.shows.length > 0) {
      this.library.shows = [...data.shows, ...data.anime];
    }
    return this.library;
  }

  async updateShowsList(shows: SimklShowAddToList[]) {
    if (shows.length <= 0) {
      return;
    }
    const { data } = await axios.post(
      "https://api.simkl.com/sync/add-to-list",
      { shows: shows },
      { headers: this.createSimklHeaders() },
    );
    return data;
  }

  async updateMoviesList(movies: SimklMovieAddToList[]) {
    if (movies.length <= 0) {
      return;
    }
    const { data } = await axios.post(
      "https://api.simkl.com/sync/add-to-list",
      { movies: movies },
      { headers: this.createSimklHeaders() },
    );
    return data;
  }

  async updateShowsHistory(shows: SimklShowAddToList[]) {
    if (shows.length <= 0) {
      return;
    }
    const { data } = await axios.post(
      "https://api.simkl.com/sync/history",
      { shows: shows },
      { headers: this.createSimklHeaders() },
    );
    return data;
  }

  async updateMoviesHistory(movies: SimklMovieAddToList[]) {
    if (movies.length <= 0) {
      return;
    }
    const { data } = await axios.post(
      "https://api.simkl.com/sync/history",
      { movies: movies },
      { headers: this.createSimklHeaders() },
    );
    return data;
  }
}

export interface SimklMovieAddToList {
  title?: string;
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
  title?: string;
  ids: {
    imdb: string;
  };
  to?: string;
  watched_at?: string;
  seasons?: SimklShowSeasonAddToList[];
}

export interface SimklLibraryObjectShow {
  title: string;
  poster: string;
  year: number;
  ids: {
    simkl: number;
    imdb: string;
  };
}

export interface SimklLibraryObjectMovie {
  title: string;
  poster: string;
  year: number;
  ids: {
    simkl: number;
    imdb: string;
  };
}

export interface SimklLibraryObjectBase {
  last_watched_at: string | null;
  user_rating: number | null;
  status: "watching" | "plantowatch" | "hold" | "completed" | "dropped";
}

export interface SimklLibraryShowObject extends SimklLibraryObjectBase {
  show: SimklLibraryObjectShow;
}

export interface SimklLibraryMovieObject extends SimklLibraryObjectBase {
  movie: SimklLibraryObjectMovie;
}

export type SimklLibraryObject = SimklLibraryObjectBase & {
  show?: SimklLibraryObjectShow;
  movie?: SimklLibraryObjectMovie;
};

export interface SimklLibrary {
  movies: SimklLibraryMovieObject[];
  shows: SimklLibraryShowObject[];
}
