import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCategory, normalize, rankBy } from "./scoring.ts";

// Données réelles de l'édition 2025 (Google Sheet familial)
const monde = ["Pogacar", "Duplantis", "Alcaraz", "Marquez", "Sinner", "Mc Intosh", "Jefferson-Wooden", "Dembélé", "Ferrand-Prevost", "Mc Laughlin"];
const france = ["Dembele ", "Ferrand-Prevost", "Gressier", "Marchand", "Ogier", "Dalin", "Grousset", "Bielle-Biarrey", "Simon", "Lebrun"];

test("normalisation des noms", () => {
  assert.equal(normalize("Dembélé "), normalize("dembele"));
  assert.equal(normalize("Mc Intosh"), normalize("McIntosh"));
  assert.equal(normalize("Ferrand-Prevost"), normalize("Ferrand Prévost"));
});

test("scores 2025 (le tableur ratait « Dembele » vs « Dembélé » : +1 France)", () => {
  const laurent = {
    m: ["Pogacar", "Marquez", "Mc Ilroy", "Mc Intosh", "Mc Laughlin", "Duplantis", "Sinner", "Norris", "Gilgeous-Alexander", "Van der Poel"],
    f: ["Ferrand-Prevost", "Dembélé", "Gressier", "Bielle-Biarrey", "Marchand", "Grousset", "Dalin", "Ogier", "Gaba", "Wembanyama"],
  };
  const pierre = {
    m: ["Pogacar", "Mc Intosh", "Marquez", "Duplantis", "Mc Laughlin", "Alcaraz", "Sinner", "Odermatt", "Boe", "Van der Poel"],
    f: ["Gressier", "Dembélé", "Ferrand-Prevost", "Marchand", "Ogier", "Dalin", "Grousset", "Gaba", "Bielle-Biarrey", "Lebrun"],
  };
  const corentin = {
    m: ["Pogacar", "Duplantis", "Mc Intosh", "Mc Laughlin", "Sinner", "Alcaraz", "Odermatt", "Marquez", "Ledecky", "Marchand"],
    f: ["Marchand", "Gressier", "Ferrand-Prevost", "Dembélé", "Grousset", "Ogier", "Bielle-Biarrey", "Gaba", "Jeanmonot", "Mbappé"],
  };
  assert.equal(scoreCategory(laurent.m, monde).total, 8);
  assert.equal(scoreCategory(laurent.f, france).total, 10);
  assert.equal(scoreCategory(pierre.m, monde).total, 9);
  assert.equal(scoreCategory(pierre.f, france).total, 19);
  assert.equal(scoreCategory(corentin.m, monde).total, 13);
  assert.equal(scoreCategory(corentin.f, france).total, 7);
});

test("alias pour fautes de frappe", () => {
  const aliases = new Map([["mbape", "mbappe"]]);
  assert.equal(scoreCategory(["Mbape"], ["Mbappé"], aliases).total, 3);
});

test("pas de résultats officiels => 0", () => {
  assert.equal(scoreCategory(monde, Array(10).fill("")).total, 0);
});

test("ex aequo", () => {
  const r = rankBy([{ s: 10, e: 1 }, { s: 12, e: 0 }, { s: 10, e: 1 }], (x) => x.s, (x) => x.e);
  assert.deepEqual(r.map((x) => x.rank), [1, 2, 2]);
});
