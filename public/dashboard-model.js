export const money = (value) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    value,
  );
export const plural = (count, word) =>
  `${count.toLocaleString("en-AU")} ${word}${count === 1 ? "" : "s"}`;

// Compute every public figure from the same visible price observations.
export function normaliseData(raw) {
  const cafes = (Array.isArray(raw.gems) ? raw.gems : [])
    .filter(
      (c) =>
        typeof c.name === "string" &&
        typeof c.suburb === "string" &&
        Number.isFinite(Number(c.price)) &&
        Number(c.price) > 0,
    )
    .map((c, index) => ({ ...c, price: Number(c.price), id: index }));
  const grouped = new Map();
  for (const cafe of cafes) {
    if (!grouped.has(cafe.suburb)) grouped.set(cafe.suburb, []);
    grouped.get(cafe.suburb).push(cafe);
  }
  const suburbs = [...grouped]
    .map(([name, rows]) => ({
      name,
      count: rows.length,
      price: rows.reduce((sum, c) => sum + c.price, 0) / rows.length,
      min: Math.min(...rows.map((c) => c.price)),
      max: Math.max(...rows.map((c) => c.price)),
    }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  const prices = cafes.map((c) => c.price).sort((a, b) => a - b);
  const n = prices.length;
  return {
    cafes,
    suburbs,
    count: n,
    avg: n
      ? Math.round((prices.reduce((a, b) => a + b, 0) / n) * 100) / 100
      : null,
    min: n ? prices[0] : null,
    max: n ? prices[n - 1] : null,
    median: n
      ? (prices[Math.floor((n - 1) / 2)] + prices[Math.floor(n / 2)]) / 2
      : null,
    generatedAt: raw.generated_at || null,
  };
}

export function filterCafes(
  cafes,
  { query = "", budget = "all", sort = "cheap" } = {},
) {
  const q = query.trim().toLocaleLowerCase("en-AU");
  return cafes
    .filter(
      (c) =>
        (!q ||
          `${c.name} ${c.suburb}`.toLocaleLowerCase("en-AU").includes(q)) &&
        (budget === "all" || c.price < Number(budget)),
    )
    .sort(
      (a, b) =>
        (sort === "dear"
          ? b.price - a.price
          : sort === "az"
            ? 0
            : a.price - b.price) || a.name.localeCompare(b.name),
    );
}

export function calculateHabit(price, cups, salary) {
  const p = Number(price),
    c = Number(cups),
    s = Number(salary);
  if (![p, c, s].every(Number.isFinite) || p <= 0 || c < 0 || c > 35 || s <= 0)
    return null;
  return {
    weekly: Math.round(p * c * 100) / 100,
    annual: Math.round(p * c * 48 * 100) / 100,
    minutes: (p / (s / (52 * 38))) * 60,
  };
}

export function priceBand(price, avg) {
  if (price < avg - 0.15) return { colour: "#34634d", label: "Below average" };
  if (price > avg + 0.15) return { colour: "#a34a2b", label: "Above average" };
  return { colour: "#a97738", label: "Around average" };
}
