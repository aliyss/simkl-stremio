import path from "path";
import addon from "./addon";
import express from "express";
import bodyParser from "body-parser";
import manifest from "./manifest";
import { StremioAPIClient } from "./utils/stremio";
import { backfillFromStremioToSimkl } from "./utils/sync";

const app = express();

const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get("/configure", (_, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});

app.use(addon);
let routerStack = app._router.stack[app._router.stack.length - 1];

routerStack.handle.stack = routerStack.handle.stack.filter((x: any) => {
  if (x.route && x.route.path === "/manifest.json") {
    return false;
  }
  return true;
});

const createLog = (req: any, res: any, next: any) => {
  res.on("finish", function () {
    console.log(
      req.method,
      decodeURI(req.url),
      res.statusCode,
      res.statusMessage,
    );
  });
  next();
};

app.get("/", (req: any, res: any) => {
  const host = req.get("host");
  res.redirect(`stremio://${host}/manifest.json`);
});

app.get("/manifest.json", (req: any, res: any) => {
  res.send({
    ...manifest,
    behaviorHints: {
      configurable: true,
      configurationRequired: true,
    },
  });
});

app.get("/:config/configure", (req: any, res: any) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});

app.get("/:config/manifest.json", (req: any, res: any) => {
  res.send({
    ...manifest,
    version: manifest.version,
    behaviorHints: {
      configurable: true,
      configurationRequired: false,
    },
  });
});

app.get("/:config(*)/meta/:type/:id.json", (req: any, res: any) => {
  // console.log(req.params.config);
});

app.get("/:config(*)/stream/:type/:id.json", (req: any, res: any) => {
  res.send({
    streams: [],
  });
});

app.get(
  "/:config(*)/subtitles/:type/:id/:rest(*)",
  async (req: any, res: any) => {
    let userConfigString = req.params.config.split("|");

    let userConfig: Record<string, string> = {};
    for (let i = 0; i < userConfigString.length; i++) {
      let lineConfig = userConfigString[i].split("-=-");
      userConfig[lineConfig[0]] = lineConfig[1];
    }

    if (
      !userConfig["stremio_authkey"] ||
      !userConfig["simkl_accesstoken"] ||
      !userConfig["simkl_clientid"]
    ) {
      res.send({
        subtitles: [],
      });
      return;
    }

    try {
      let info = await StremioAPIClient.getCinemetaMeta(
        req.params.id.split(":")[0],
        req.params.type,
      );

      let timeout = 0;
      if (info?.meta.runtime) {
        timeout = parseInt(info.meta.runtime.split(" ")[0]) * 1000;
      }

      const protocol = req.protocol;
      const host = req.get("host");

      console.log(`Queued ${info?.meta.id} running in ${info?.meta.runtime}`);
      setTimeout(async function () {
        console.log("Syncing...");
        try {
          let { authKey } = await backfillFromStremioToSimkl(
            userConfig["stremio_authkey"],
            userConfig["simkl_accesstoken"],
            userConfig["simkl_clientid"],
            true,
          );
          console.log("Sync Completed");
          if (authKey && authKey !== userConfig["stremio_authkey"]) {
            userConfig["stremio_authkey"] = authKey;
            await StremioAPIClient.updateAddonCollection(authKey, manifest.id, {
              transportUrl: `${protocol}://${host}/${Object.entries(userConfig)
                .map((value) => value.join("-=-"))
                .join("|")}/manifest.json`,
            });
          }
        } catch (e) {
          console.log(e);
        }
      }, timeout);
    } catch (e) {}

    res.send({
      subtitles: [],
    });
  },
);

app.use(createLog);

app.post("/configure/submit", urlencodedParser, (req, res) => {
  const host = req.get("host");
  res.redirect(
    `stremio://${host}/stremio_authkey-=-${req.body.stremio_authkey}|simkl_accesstoken-=-${req.body.simkl_accesstoken}|simkl_clientid-=-${req.body.simkl_clientid}/manifest.json`,
  );
});

app.use("/public", express.static("public"));
app.listen(process.env.PORT || 7000);
