import {
  normaliseData,
  filterCafes,
  calculateHabit,
  priceBand,
  money,
  plural,
} from "./dashboard-model.js";

const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const track = (event, properties = {}) =>
  window.posthog?.capture?.(event, properties);
let data = null;
let budget = "all";
let expanded = Boolean(document.querySelector("[data-report]"));
let map = null;
let markerLayer = null;
let markers = new Map();
let selectedId = null;
let loading = false;
let mapObserver = null;
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const validPoint = (cafe) =>
  cafe.lat != null &&
  cafe.lng != null &&
  Number.isFinite(Number(cafe.lat)) &&
  Number.isFinite(Number(cafe.lng)) &&
  Math.abs(cafe.lat) <= 90 &&
  Math.abs(cafe.lng) <= 180;
const setText = (id, value) => {
  if ($(id)) $(id).textContent = value;
};

document.querySelector(".menu-toggle")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(open));
  $("siteNav").classList.toggle("is-open", open);
});
document.querySelectorAll(".nav a").forEach((link) =>
  link.addEventListener("click", () => {
    $("siteNav").classList.remove("is-open");
    document
      .querySelector(".menu-toggle")
      .setAttribute("aria-expanded", "false");
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("siteNav")?.classList.contains("is-open")) {
    $("siteNav").classList.remove("is-open");
    const toggle = document.querySelector(".menu-toggle");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }
});

function activeCafes() {
  return filterCafes(data?.cafes || [], {
    query: $("cafeSearch")?.value || "",
    budget,
    sort: $("cafeSort")?.value || "cheap",
  });
}

function renderCafes() {
  if (!$("cafeList") || !data) return;
  const rows = activeCafes();
  setText(
    "resultCount",
    `${plural(rows.length, "price")} · ${data.count} in survey`,
  );
  $("cafeList").innerHTML = rows.length
    ? rows
        .map((c) => {
          const band = priceBand(c.price, data.avg);
          return `<button class="cafe-row" type="button" data-cafe-id="${c.id}" aria-pressed="${c.id === selectedId}" aria-label="${esc(c.name)}, ${esc(c.suburb)}, ${money(c.price)}. Show on map."><span class="cup-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V6Z"/><path d="M17 8h2a3 3 0 0 1 0 6h-2M3 23h16"/></svg></span><span><span class="cafe-name">${esc(c.name)}</span><span class="cafe-meta">${esc(c.suburb)} · Small flat white</span></span><span class="cafe-price num" style="color:${band.colour}">${money(c.price)}<span class="cafe-band">${band.label}</span></span></button>`;
        })
        .join("")
    : `<div class="empty-state"><p>No cafés match those filters.</p><button class="button light" type="button" id="clearFilters">Clear search &amp; filters ↗</button></div>`;
  if (selectedId != null && !rows.some((c) => c.id === selectedId)) {
    selectedId = null;
    setText("selectedInfo", "Select a café to see it on the map.");
  }
  if (map) renderMarkers(rows, true);
}

function clearFilters() {
  $("cafeSearch").value = "";
  budget = "all";
  document
    .querySelectorAll("[data-budget]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.budget === "all"),
      ),
    );
  renderCafes();
}
$("cafeList")?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-cafe-id]");
  if (row) selectCafe(Number(row.dataset.cafeId));
  if (event.target.closest("#clearFilters")) clearFilters();
});
$("cafeSearch")?.addEventListener("input", renderCafes);
$("cafeSort")?.addEventListener("change", renderCafes);
document.querySelectorAll("[data-budget]").forEach((button) =>
  button.addEventListener("click", () => {
    budget = button.dataset.budget;
    document
      .querySelectorAll("[data-budget]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    renderCafes();
  }),
);

function showMapUnavailable() {
  if ($("mapUnavailable")) $("mapUnavailable").hidden = false;
}
function fitMap(cafes) {
  const points = cafes.filter(validPoint);
  if (points.length)
    map.fitBounds(
      window.L.latLngBounds(points.map((c) => [Number(c.lat), Number(c.lng)])),
      {
        padding: [35, 35],
        maxZoom: points.length === 1 ? 15 : 13,
        animate: !reducedMotion(),
      },
    );
}
function initMap() {
  if (map || !data || !$("coffeeMap")) return;
  if (!window.L) {
    showMapUnavailable();
    return;
  }
  try {
    const L = window.L;
    map = L.map("coffeeMap", {
      scrollWheelZoom: false,
      zoomControl: true,
      preferCanvas: true,
    });
    let tileErrors = 0;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => {
        if (++tileErrors >= 4) showMapUnavailable();
      })
      .on("tileload", () => {
        tileErrors = 0;
        $("mapUnavailable").hidden = true;
      })
      .addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.setView([-33.8688, 151.15], 10);
    renderMarkers(activeCafes(), true);
    map.on("zoomend", () => renderMarkers(activeCafes(), false));
    new ResizeObserver(() => map.invalidateSize()).observe($("coffeeMap"));
  } catch (error) {
    console.warn("Map could not be initialised:", error.message);
    showMapUnavailable();
  }
}
function renderMarkers(cafes, fit = false) {
  if (!map || !markerLayer) return;
  const L = window.L;
  markerLayer.clearLayers();
  markers.clear();
  for (const cafe of cafes.filter(validPoint)) {
    const band = priceBand(cafe.price, data.avg);
    const marker = L.circleMarker([Number(cafe.lat), Number(cafe.lng)], {
      radius: cafe.id === selectedId ? 10 : 7,
      color: "#fffef9",
      weight: 2,
      fillColor: band.colour,
      fillOpacity: 0.95,
    });
    // Non-permanent labels keep the city view readable. Names remain in the accessible café list.
    marker.bindTooltip(`${esc(cafe.name)} · ${money(cafe.price)}`, {
      direction: "top",
      offset: [0, -7],
    });
    marker.bindPopup(
      `<div class="popup-name">${esc(cafe.name)}</div><div>${esc(cafe.suburb)} · Small flat white</div><div class="popup-price num">${money(cafe.price)}</div><div>${band.label} in this survey</div>`,
      { maxWidth: 250 },
    );
    marker.on("click", () => {
      selectedId = cafe.id;
      markSelectedCafe(cafe);
      document.querySelector(`[data-cafe-id="${cafe.id}"]`)?.scrollIntoView({
        behavior: reducedMotion() ? "instant" : "smooth",
        block: "nearest",
      });
    });
    marker.addTo(markerLayer);
    markers.set(cafe.id, marker);
  }
  if (fit) {
    fitMap(cafes);
    map.closePopup();
  }
}
function markSelectedCafe(cafe) {
  document
    .querySelectorAll("[data-cafe-id]")
    .forEach((row) =>
      row.setAttribute(
        "aria-pressed",
        String(Number(row.dataset.cafeId) === cafe.id),
      ),
    );
  setText(
    "selectedInfo",
    `${cafe.name} · ${cafe.suburb} · ${money(cafe.price)}${validPoint(cafe) ? "" : " · Map location unavailable"}`,
  );
}
function selectCafe(id) {
  const cafe = data?.cafes.find((c) => c.id === id);
  if (!cafe) return;
  selectedId = id;
  markSelectedCafe(cafe);
  initMap();
  if (map && validPoint(cafe)) {
    map.setView([Number(cafe.lat), Number(cafe.lng)], 15, { animate: false });
    markers.get(id)?.openPopup();
    if (window.innerWidth < 761)
      $("coffeeMap").scrollIntoView({
        behavior: reducedMotion() ? "instant" : "smooth",
        block: "center",
      });
  }
  track("cafe_selected", { suburb: cafe.suburb });
}
$("resetMap")?.addEventListener("click", () => {
  selectedId = null;
  clearFilters();
  setText("selectedInfo", "Select a café to see it on the map.");
  if (map) map.closePopup();
  if (location.hash.startsWith("#suburb="))
    history.replaceState(null, "", "#explore");
});

function renderRankings() {
  if (!$("rankingTable") || !data) return;
  const query = $("suburbSearch")?.value.trim().toLowerCase() || "";
  const matches = data.suburbs.filter((s) =>
    s.name.toLowerCase().includes(query),
  );
  const visible = expanded || query ? matches : matches.slice(0, 8);
  setText("rankingCount", `${plural(matches.length, "suburb")} in the survey`);
  $("rankingTable").innerHTML = visible.length
    ? `<table class="rank-table"><caption class="sr-only">Surveyed suburb averages, lowest first</caption><thead><tr><th scope="col">#</th><th scope="col">Neighbourhood</th><th scope="col">Sample</th><th scope="col" class="rank-range">Range</th><th scope="col">Average</th></tr></thead><tbody>${visible
        .map((s) => {
          const rank = data.suburbs.indexOf(s) + 1;
          const sample = plural(s.count, "observation");
          const url = `/#suburb=${encodeURIComponent(s.name)}`;
          return `<tr><td class="num">${String(rank).padStart(2, "0")}</td><td><a class="link-button rank-name" href="${url}" data-suburb="${esc(s.name)}">${esc(s.name)}</a><span class="rank-bar" aria-hidden="true"><i style="width:${Math.min(100, (s.price / data.max) * 100).toFixed(1)}%"></i></span></td><td><span class="small muted">${sample}</span>${s.count < 3 ? '<span class="sample-pill">Small sample</span>' : ""}</td><td class="rank-range small muted">${money(s.min)}${s.min !== s.max ? `–${money(s.max)}` : ""}</td><td class="num">${money(s.price)}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : '<p class="empty-state">No suburbs match your search.</p>';
  if ($("moreSuburbs")) {
    $("moreSuburbs").hidden = Boolean(query) || matches.length <= 8;
    $("moreSuburbs").textContent = expanded
      ? "Show fewer suburbs ↑"
      : `See all ${matches.length} suburbs ↓`;
    $("moreSuburbs").setAttribute("aria-expanded", String(expanded));
  }
}
$("suburbSearch")?.addEventListener("input", renderRankings);
$("moreSuburbs")?.addEventListener("click", () => {
  expanded = !expanded;
  renderRankings();
});
$("rankingTable")?.addEventListener("click", (event) => {
  const link = event.target.closest("[data-suburb]");
  if (!link || !$("cafeSearch")) return;
  event.preventDefault();
  exploreSuburb(link.dataset.suburb);
});
function exploreSuburb(name) {
  clearFilters();
  $("cafeSearch").value = name;
  renderCafes();
  initMap();
  history.replaceState(null, "", `#suburb=${encodeURIComponent(name)}`);
  $("explore").scrollIntoView({
    behavior: reducedMotion() ? "instant" : "smooth",
    block: "start",
  });
  track("suburb_clicked", { suburb: name });
}

function renderHistogram() {
  if (!$("histogram")) return;
  const bands = [
    { label: "Under $4", min: 0, max: 4 },
    { label: "$4–4.49", min: 4, max: 4.5 },
    { label: "$4.50–4.99", min: 4.5, max: 5 },
    { label: "$5–5.49", min: 5, max: 5.5 },
    { label: "$5.50–5.99", min: 5.5, max: 6 },
    { label: "$6+", min: 6, max: Infinity },
  ].map((b) => ({
    ...b,
    count: data.cafes.filter((c) => c.price >= b.min && c.price < b.max).length,
  }));
  const mode = bands.reduce(
    (best, band) => (band.count > best.count ? band : best),
    bands[0],
  );
  const max = Math.max(mode.count, 1);
  $("histogram").innerHTML = bands
    .map(
      (b) =>
        `<div class="hist-col${b === mode ? " is-mode" : ""}"><span class="hist-count num">${b.count || ""}</span><div class="hist-bar" style="height:${((b.count / max) * 130).toFixed(1)}px"></div></div>`,
    )
    .join("");
  $("histogram").setAttribute(
    "aria-label",
    bands.map((b) => `${b.label}: ${plural(b.count, "price")}`).join("; "),
  );
  $("histLabels").innerHTML = bands
    .map((b) => `<span>${b.label}</span>`)
    .join("");
  $("chartSummary").innerHTML = data.count
    ? `<strong>${Math.round((mode.count / data.count) * 100)}% of surveyed prices</strong> fall in the ${mode.label} band.`
    : "The chart will appear as prices are collected.";
}
function renderCalculator() {
  if (!$("salaryInput") || !data) return;
  const result = calculateHabit(
    data.avg,
    $("cupsInput").value,
    $("salaryInput").value,
  );
  $("calcValidation").hidden = Boolean(result) || !data.count;
  $("salaryInput").setAttribute(
    "aria-invalid",
    String(!result && data.count > 0),
  );
  if (!result) {
    setText("weeklyCost", "—");
    setText("annualCost", "—");
    setText(
      "workMinutes",
      data.count
        ? "Enter your salary to compare work time."
        : "Available once prices are collected.",
    );
    setText("calcValidation", "Enter an annual salary greater than zero.");
    return;
  }
  setText("weeklyCost", money(result.weekly));
  setText("annualCost", money(result.annual));
  setText(
    "workMinutes",
    `One ${money(data.avg)} cup = ${result.minutes.toFixed(1)} minutes of work at your salary, before tax.`,
  );
}
$("cupsInput")?.addEventListener("change", renderCalculator);
$("salaryInput")?.addEventListener("input", renderCalculator);

function renderData() {
  const low = data.suburbs[0],
    high = data.suburbs.at(-1);
  setText("heroPrice", data.count ? money(data.avg) : "Not yet");
  if ($("heroSample"))
    $("heroSample").innerHTML = data.count
      ? `From <strong>${plural(data.count, "price")}</strong><br>across ${plural(data.suburbs.length, "suburb")}.`
      : "The survey is growing.<br>Prices will appear here.";
  setText("statCount", data.count.toLocaleString("en-AU"));
  setText("statSuburbs", data.suburbs.length.toLocaleString("en-AU"));
  setText("statLow", low ? money(low.price) : "—");
  setText("statHigh", high ? money(high.price) : "—");
  const lowTies = low
    ? data.suburbs.filter(
        (s) => Math.round(s.price * 100) === Math.round(low.price * 100),
      ).length
    : 0;
  const highTies = high
    ? data.suburbs.filter(
        (s) => Math.round(s.price * 100) === Math.round(high.price * 100),
      ).length
    : 0;
  setText(
    "statLowNote",
    low
      ? `${low.name}${lowTies > 1 ? ` + ${lowTies - 1} tied` : ""} · n=${low.count}`
      : "In the current sample",
  );
  setText(
    "statHighNote",
    high
      ? `${high.name}${highTies > 1 ? ` + ${highTies - 1} tied` : ""} · n=${high.count}`
      : "In the current sample",
  );
  const date = data.generatedAt ? new Date(data.generatedAt) : null;
  const dateText =
    date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString("en-AU", {
          timeZone: "Australia/Sydney",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
  setText(
    "surveySnapshot",
    dateText
      ? `Dataset retrieved ${dateText}. Prices may change; confirm with the café.`
      : "Prices may change; confirm with the café.",
  );
  renderCafes();
  renderRankings();
  renderHistogram();
  renderCalculator();
  if ($("reportAverage")) {
    setText("reportAverage", data.avg == null ? "—" : money(data.avg));
    setText("reportMedian", data.median == null ? "—" : money(data.median));
    setText(
      "reportRange",
      data.count ? `${money(data.min)}–${money(data.max)}` : "—",
    );
    setText("reportSample", data.count.toLocaleString("en-AU"));
    setText(
      "reportSuburbs",
      `${plural(data.suburbs.length, "suburb")} represented`,
    );
    setText(
      "reportSummary",
      data.count
        ? `The current sample contains ${plural(data.count, "price observation")} across ${plural(data.suburbs.length, "suburb")}. Its average small flat white price is ${money(data.avg)}, and its median is ${money(data.median)}. Individual surveyed prices range from ${money(data.min)} to ${money(data.max)}.`
        : "No price observations are available yet. Check back as the survey develops.",
    );
    setText(
      "reportRetrieved",
      dateText
        ? `Dataset retrieved ${dateText}. This is not the collection date for each café.`
        : "The feed does not specify a retrieval date.",
    );
  }
  if (data.count) {
    document.title = $("reportAverage")
      ? `Sydney Coffee Price Report 2026 — ${money(data.avg)} Average | Flat White Index`
      : `${money(data.avg)} Sydney Flat White Average | Flat White Index`;
    const desc = `Compare ${plural(data.count, "flat white price")} across ${plural(data.suburbs.length, "Sydney suburb")}. Current survey average: ${money(data.avg)}. Collected by direct phone calls.`;
    if (!$("reportAverage"))
      document.querySelector('meta[name="description"]').content = desc;
  }
  if ($("coffeeMap") && !mapObserver) {
    mapObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          mapObserver.disconnect();
          initMap();
        }
      },
      { rootMargin: "200px" },
    );
    mapObserver.observe($("coffeeMap"));
  }
}

async function loadDashboard() {
  if (loading) return;
  loading = true;
  const message = $("dataMessage");
  if (message) message.hidden = true;
  try {
    $("heroPrice")?.classList.remove("hero-loading");
    let raw = window.__LIVE_DATA__;
    if (!raw) {
      const response = await fetch("/api/dashboard", {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error(`Price feed returned ${response.status}`);
      raw = await response.json();
    }
    if (!raw || !Array.isArray(raw.gems))
      throw new Error("Unexpected price feed");
    data = normaliseData(raw);
    renderData();
    if (!data.count && message) {
      message.hidden = false;
      message.textContent =
        "The survey has no published prices yet. New observations will appear here as they become available.";
    }
    if ($("cafeSearch") && location.hash.startsWith("#suburb=")) {
      try {
        exploreSuburb(decodeURIComponent(location.hash.slice(8)));
      } catch {
        /* Ignore malformed shared URLs. */
      }
    }
  } catch (error) {
    setText("heroPrice", "Unavailable");
    $("heroPrice")?.classList.add("hero-loading");
    setText("heroSample", "We couldn’t load the survey. Please try again.");
    setText("resultCount", "Prices unavailable");
    setText("rankingCount", "Prices unavailable");
    setText(
      "reportSummary",
      "The current survey could not be loaded. Please retry or return to the dashboard later.",
    );
    if ($("cafeList"))
      $("cafeList").innerHTML =
        '<p class="empty-state">Prices couldn’t be loaded. Use “Try again” above to reconnect.</p>';
    if (message) {
      message.hidden = false;
      message.innerHTML =
        'The price feed is taking a break. <button class="link-button" type="button" id="retryData">Try again ↻</button>';
      $("retryData").addEventListener("click", loadDashboard);
    }
    console.warn("Price feed unavailable:", error.message);
  } finally {
    loading = false;
  }
}

async function postForm(form, endpoint, body, successText, eventName) {
  const button = form.querySelector('[type="submit"]');
  const status =
    form.parentElement.querySelector(".form-status") ||
    form.querySelector(".form-status");
  if (button.disabled) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Sending…";
  status.textContent = "";
  status.dataset.error = "false";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "A few too many requests. Please wait before trying again."
          : "That didn’t go through. Please try again in a moment.",
      );
    const result = await response.json();
    if (result.ok !== true)
      throw new Error("That didn’t go through. Please try again in a moment.");
    status.textContent = successText;
    form.reset();
    button.textContent = "All done ✓";
    track(eventName);
    // A confirmed submission stays disabled for this page visit to prevent duplicate sends.
  } catch (error) {
    status.dataset.error = "true";
    status.textContent =
      error.name === "TimeoutError"
        ? "The request timed out. Please wait a moment before trying again."
        : error.message;
    button.disabled = false;
    button.textContent = label;
  }
}
document.querySelectorAll("[data-subscribe]").forEach((form) =>
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    postForm(
      form,
      "/api/subscribe",
      {
        email: form.elements.email.value.trim(),
        source: form.dataset.subscribe,
      },
      "You’re on the list. Thanks for joining us.",
      "newsletter_subscribed",
    );
  }),
);
const priceDialog = $("priceDialog");
document.querySelectorAll("[data-open-price]").forEach((button) =>
  button.addEventListener("click", () => {
    priceDialog.showModal();
    track("modal_opened", { modal: "submit_price" });
  }),
);
priceDialog
  ?.querySelector(".modal-close")
  .addEventListener("click", () => priceDialog.close());
priceDialog?.addEventListener("click", (event) => {
  if (event.target !== priceDialog) return;
  const box = priceDialog.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    priceDialog.close();
});
$("priceForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const body = Object.fromEntries(new FormData(form));
  body.name = body.name.trim();
  body.suburb = body.suburb.trim();
  if (!body.name || !body.suburb) {
    const status = form.querySelector(".form-status");
    status.dataset.error = "true";
    status.textContent = "Please enter a café name and suburb.";
    return;
  }
  postForm(
    form,
    "/api/submit-price",
    body,
    "Thanks! Your price has been submitted for review.",
    "price_submitted",
  );
});

if ($("heroPrice") || document.querySelector("[data-report]")) loadDashboard();
