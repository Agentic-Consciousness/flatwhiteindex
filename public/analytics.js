// Keep preview and local QA out of the production analytics dataset.
(function () {
  if (
    !["www.flatwhiteindex.com.au", "flatwhiteindex.com.au"].includes(
      location.hostname,
    )
  )
    return;
  const umami = document.createElement("script");
  umami.defer = true;
  umami.src = "https://analytics.agenticconsciousness.com.au/script.js";
  umami.dataset.websiteId = "d35f6ff1-35d8-4c68-890d-5aa312d6039c";
  document.head.appendChild(umami);

  !(function (t, e) {
    var o, n, p, r;
    e.__SV ||
      ((window.posthog = e),
      (e._i = []),
      (e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split(".");
          (2 == o.length && ((t = t[o[0]]), (e = o[1])),
            (t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            }));
        }
        (((p = t.createElement("script")).type = "text/javascript"),
          (p.crossOrigin = "anonymous"),
          (p.async = !0),
          (p.src =
            s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") +
            "/static/array.js"),
          (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(
            p,
            r,
          ));
        var u = e;
        for (
          void 0 !== a ? (u = e[a] = []) : (a = "posthog"),
            u.people = u.people || [],
            u.toString = function (t) {
              var e = "posthog";
              return (
                "posthog" !== a && (e += "." + a),
                t || (e += " (stub)"),
                e
              );
            },
            u.people.toString = function () {
              return u.toString(1) + ".people (stub)";
            },
            o =
              "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(
                " ",
              ),
            n = 0;
          n < o.length;
          n++
        )
          g(u, o[n]);
        e._i.push([i, s, a]);
      }),
      (e.__SV = 1));
  })(document, window.posthog || []);
  posthog.init("phc_AUTXvNZkCQVUVJjTEqMUzTkqLtz4iEQvvDQ4zsu3Hetw", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    capture_performance: true,
    enable_heatmaps: true,
    enable_recording_console_log: true,
    session_recording: {
      recordCrossOriginIframes: true,
      maskAllInputs: true,
      maskTextSelector: "[data-private]",
    },
    scroll_subbehavior: "full",
  });
})();
