/**
 * Webpack Module #1479
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(271);
    const o = n(10),
      { IS_LOCALHOST: i, IS_RC: a } = n(231);
    o.IS_TEAMS = "teams.coreldraw.app" === window.location.hostname;
    const r = window.location.hostname.endsWith(".ngrok.io");
    o.IS_TEAMS
      ? (o.gApi.url = o.cloudTeamsURL)
      : i || r
      ? (o.trunkwebcdr && (o.gApi.webcdr = o.cloudTrunkURL + "/api/webcdr"),
        (o.gApi.url = o.cloudTrunkURL))
      : o.IS_BETA
      ? (o.cloudBetaURL && (o.gApi.url = o.cloudBetaURL),
        o.betaWebcdr && (o.gApi.webcdr = o.betaWebcdr))
      : a
      ? (o.cloudRCURL && (o.gApi.url = o.cloudRCURL),
        o.stagingWebcdr && (o.gApi.webcdr = o.stagingWebcdr))
      : o.IS_TRUNK &&
        ((o.gApi.url = o.cloudTrunkURL),
        o.trunkwebcdr && (o.gApi.webcdr = o.trunkwebcdr)),
      !o.gApi.webcdr && o.webcdr && (o.gApi.webcdr = o.webcdr),
      (window.gApi = o.gApi),
      (e.exports = o);
  }