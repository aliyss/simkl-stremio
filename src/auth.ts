import axios from "axios";

export async function getSimklAccessToken(id: string) {
  const {
    data: { user_code, verification_url },
  } = await axios.get(`https://api.simkl.com/oauth/pin?client_id=${id}`);

  const {
    data: { access_token },
  } = await axios.get(
    `https://api.simkl.com/oauth/pin/${user_code}?client_id=${id}`,
  );

  return {
    Authorization: `Bearer ${access_token}`,
    "simkl-api-key": id,
  };
}

type GetStremioAuthKeyWithCredentialsProps =
  | {
      email: string;
      password: string;
      authKey: null;
    }
  | {
      email: null;
      password: null;
      authKey: string;
    };

export async function getStremioAuthKey(
  creds: GetStremioAuthKeyWithCredentialsProps,
) {
  if (creds.authKey === null) {
    const {
      data: { result },
    } = await axios.post<{ result: { authKey: string } }>(
      "https://api.strem.io/api/login",
      creds,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return result.authKey || null;
  }
  return null;
}
