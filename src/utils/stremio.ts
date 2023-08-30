import axios from "axios";
import { Manifest } from "stremio-addon-sdk";

export interface StremioCredentials {
  email: string;
  password: string;
}

export class StremioAPIClient {
  constructor() {}

  static async updateAuthKeyWithCredentials(
    creds: StremioCredentials,
  ): Promise<string> {
    const {
      data: { result, error },
    } = await axios.post<{ result?: { authKey: string }; error?: any }>(
      "https://api.strem.io/api/login",
      creds,
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
    return result.authKey;
  }

  static async updateAuthKeyWithAuthKey(
    authKey: string,
    creds?: StremioCredentials,
  ): Promise<string> {
    if (!authKey && creds) {
      return StremioAPIClient.updateAuthKeyWithCredentials(creds);
    } else if (!authKey) {
      throw new Error("No valid Auth Key or Credentials");
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
    if ((!result || !result.authKey) && creds) {
      return StremioAPIClient.updateAuthKeyWithCredentials(creds);
    } else if (!result || !result.authKey) {
      throw new Error("No valid Auth Key or Credentials");
    }
    return result.authKey;
  }

  static async getLibrary(
    authKey: string,
    retry = false,
  ): Promise<{ result: StremioLibraryObject[]; authKey: string }> {
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
      authKey = await StremioAPIClient.updateAuthKeyWithAuthKey(authKey);
      return StremioAPIClient.getLibrary(authKey, true);
    } else if (!result) {
      throw new Error(JSON.stringify(error));
    }
    return { result, authKey };
  }

  static async getAddonCollection(
    authKey: string,
    retry = false,
  ): Promise<{ result: StremioAddonCollection; authKey: string }> {
    let {
      data: { result, error },
    } = await axios.post<{ result: StremioAddonCollection; error: any }>(
      "https://api.strem.io/api/addonCollectionGet",
      {
        addFromURL: [],
        authKey,
        update: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!result && !retry) {
      authKey = await StremioAPIClient.updateAuthKeyWithAuthKey(authKey);
      return StremioAPIClient.getAddonCollection(authKey, true);
    } else if (!result) {
      throw new Error(JSON.stringify(error));
    }
    return {
      result,
      authKey,
    };
  }

  static async setAddonCollection(
    authKey: string,
    retry = false,
    data: StremioAddon[],
  ): Promise<{ result: { success: boolean }; authKey: string }> {
    let {
      data: { result, error },
    } = await axios.post<{ result: { success: boolean }; error: any }>(
      "https://api.strem.io/api/addonCollectionSet",
      {
        addons: data,
        authKey,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!result && !retry) {
      authKey = await StremioAPIClient.updateAuthKeyWithAuthKey(authKey);
      return StremioAPIClient.setAddonCollection(authKey, true, data);
    } else if (!result || !result.success) {
      throw new Error(JSON.stringify(error));
    }

    return {
      result,
      authKey,
    };
  }

  static async updateAddonCollection(
    authKey: string,
    id: string,
    data: StremioAddonBuilder,
  ) {
    const addonGetResult = await StremioAPIClient.getAddonCollection(authKey);
    authKey = addonGetResult.authKey;
    for (let i = 0; i < addonGetResult.result.addons.length; i++) {
      if (addonGetResult.result.addons[i].manifest.id === id) {
        addonGetResult.result.addons[i] = {
          ...addonGetResult.result.addons[i],
          ...data,
        };
      }
    }
    return await StremioAPIClient.setAddonCollection(
      authKey,
      true,
      addonGetResult.result.addons,
    );
  }

  static async getCinemetaMeta(id: string, type = "series") {
    try {
      const { data } = await axios.get<StremioCinemataMetaSeriesData>(
        `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`,
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

export interface StremioAddonBuilder {
  transportUrl?: string;
  transportName?: string;
  manifest?: Manifest;
  flags?: any;
}

export interface StremioAddon {
  transportUrl: string;
  transportName: string;
  manifest: Manifest;
  flags: any;
}

export interface StremioAddonCollection {
  lastModified: string;
  addons: StremioAddon[];
}

export interface StremioCinemataMetaSeriesData {
  meta: {
    id: string;
    videos: { season: number; number: number }[];
    runtime: string;
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
