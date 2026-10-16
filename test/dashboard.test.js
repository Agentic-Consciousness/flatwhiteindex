import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseData,
  filterCafes,
  calculateHabit,
  priceBand,
} from "../public/dashboard-model.js";

const cafes = [
  {
    name: "Morning Cup",
    suburb: "Newtown",
    price: "4.50",
    lat: -33.9,
    lng: 151.1,
  },
  { name: "Another Cup", suburb: "Newtown", price: 5.5 },
  { name: "Corner Café", suburb: "Waterloo", price: 4.2 },
  { name: "Bad Observation", suburb: "Waterloo", price: -1 },
];
describe("Public survey model", () => {
  it("uses only published visible observations for every statistic", () => {
    const result = normaliseData({
      gems: cafes,
      avg_price: 99,
      prices_collected: 10000,
    });
    assert.equal(result.count, 3);
    assert.equal(result.avg, 4.73);
    assert.equal(result.median, 4.5);
    assert.equal(result.min, 4.2);
    assert.equal(result.max, 5.5);
    assert.deepEqual(
      result.suburbs.map((s) => [s.name, s.count, s.price]),
      [
        ["Waterloo", 1, 4.2],
        ["Newtown", 2, 5],
      ],
    );
  });
  it("handles empty and malformed observations without invented prices", () => {
    const result = normaliseData({
      gems: [
        ...cafes.slice(3),
        { name: "No suburb", price: 5 },
        { name: "NaN", suburb: "X", price: "no" },
      ],
    });
    assert.equal(result.count, 0);
    assert.equal(result.avg, null);
    assert.equal(result.min, null);
    assert.deepEqual(result.suburbs, []);
  });
  it("computes the middle of an even sample", () => {
    assert.equal(normaliseData({ gems: cafes.slice(0, 2) }).median, 5);
  });
  it("breaks tied suburb averages alphabetically", () => {
    const result = normaliseData({
      gems: [
        { name: "Z", suburb: "Zetland", price: 5 },
        { name: "A", suburb: "Ashfield", price: 5 },
      ],
    });
    assert.equal(result.suburbs[0].name, "Ashfield");
  });
});
describe("Café discovery", () => {
  const rows = normaliseData({ gems: cafes }).cafes;
  it("searches café names and suburbs, ignoring case and outer spaces", () => {
    assert.equal(
      filterCafes(rows, { query: " CORNER " })[0].name,
      "Corner Café",
    );
    assert.equal(filterCafes(rows, { query: "newtown" }).length, 2);
  });
  it("makes under-price filters exclusive at their boundary", () => {
    assert.deepEqual(
      filterCafes(rows, { budget: "4.5" }).map((c) => c.price),
      [4.2],
    );
    assert.deepEqual(
      filterCafes(rows, { budget: "5" }).map((c) => c.price),
      [4.2, 4.5],
    );
  });
  it("combines price and text filters and sorts without mutating the source", () => {
    assert.equal(
      filterCafes(rows, { query: "newtown", budget: "5", sort: "dear" }).length,
      1,
    );
    assert.deepEqual(
      filterCafes(rows, { sort: "dear" }).map((c) => c.price),
      [5.5, 4.5, 4.2],
    );
    assert.equal(rows[0].name, "Morning Cup");
    assert.equal(filterCafes(rows, { sort: "az" })[0].name, "Another Cup");
    assert.deepEqual(filterCafes(rows, { query: "not-a-suburb" }), []);
  });
});
describe("Coffee habit calculator", () => {
  it("uses the shown price, cups per week and 48 coffee weeks", () => {
    const result = calculateHabit(4.63, 5, 85000);
    assert.equal(result.weekly, 23.15);
    assert.equal(result.annual, 1111.2);
    assert.equal(calculateHabit(5, 5, 98800).minutes, 6);
    assert.equal(calculateHabit(4.63, 10, 85000).annual, result.annual * 2);
  });
  it("rejects invalid and missing prices or salaries", () => {
    for (const args of [
      [null, 5, 85000],
      [4.63, 5, ""],
      [4.63, 5, 0],
      [4.63, -1, 85000],
      [4.63, 50, 85000],
      [Infinity, 5, 1],
    ]) {
      assert.equal(calculateHabit(...args), null);
    }
  });
  it("labels prices relative to the actual survey average", () => {
    assert.equal(priceBand(4, 4.63).label, "Below average");
    assert.equal(priceBand(4.63, 4.63).label, "Around average");
    assert.equal(priceBand(5.5, 4.63).label, "Above average");
  });
});
