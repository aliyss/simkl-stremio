import axios from "axios";
import { getEnvValue, setEnvValue } from "./environment";

export interface StremioCredentials {
  email: string;
  password: string;
}

export class StremioAPIClient {
  authKey: string = "";
  library: StremioLibraryObject[] = [];

  constructor() {
    this.authKey = getEnvValue("STREMIO_AUTHKEY") || "";
  }

  async init() {
    // this.authKey = await StremioAPIClient.updateAuthKeyWithAuthKey();
    return this;
  }

  static validateCredentialsFromEnv(): StremioCredentials {
    const email = getEnvValue("STREMIO_EMAIL");
    const password = getEnvValue("STREMIO_PASSWORD");
    if (!email || !password) {
      throw new Error(
        "Reauthenticate by setting STREMIO_EMAIL & STREMIO_PASSWORD in your .env file",
      );
    }
    return {
      email,
      password,
    };
  }

  static async updateAuthKeyWithCredentials(
    creds?: StremioCredentials,
  ): Promise<string> {
    const {
      data: { result, error },
    } = await axios.post<{ result?: { authKey: string }; error?: any }>(
      "https://api.strem.io/api/login",
      creds ? creds : StremioAPIClient.validateCredentialsFromEnv(),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!result || !result.authKey) {
      console.warn(
        "Updating AuthKey - Authenticatation Method: Credentials - FAILED",
      );
      throw new Error(error);
    }
    setEnvValue("STREMIO_AUTHKEY", result.authKey);
    return result.authKey;
  }

  static async updateAuthKeyWithAuthKey(
    authKey = getEnvValue("STREMIO_AUTHKEY"),
  ): Promise<string> {
    if (!authKey) {
      return StremioAPIClient.updateAuthKeyWithCredentials();
    }
    const {
      data: { result },
    } = await axios.post<{ result: { authKey: string }; error: any }>(
      "https://api.strem.io/api/loginWithToken",
      { token: authKey },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!result || !result.authKey) {
      return StremioAPIClient.updateAuthKeyWithCredentials();
    }
    setEnvValue("STREMIO_AUTHKEY", result.authKey);
    return result.authKey;
  }

  async getLibrary(
    authKey = this.authKey,
    retry = false,
  ): Promise<StremioLibraryObject[]> {
    let {
      data: { result, error },
    } = await axios.post<{ result: StremioLibraryObject[]; error: any }>(
      "https://api.strem.io/api/datastoreGet",
      {
        collection: "libraryItem",
        ids: [],
        all: true,
        authKey,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!result && !retry) {
      this.authKey = await StremioAPIClient.updateAuthKeyWithAuthKey(authKey);
      return this.getLibrary(this.authKey, true);
    } else if (!result) {
      throw new Error(JSON.stringify(error));
    }
    this.library = result;
    return this.library;
  }

  static async getCinemetaMeta(id: string) {
    try {
      const { data } = await axios.get<StremioCinemataMetaSeriesData>(
        `https://v3-cinemeta.strem.io/meta/series/${id}.json`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return data;
    } catch (e) {
      console.log(e);
    }
  }
}

export interface StremioCinemataMetaSeriesData {
  meta: {
    id: string;
    videos: { season: number; number: number }[];
  };
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
