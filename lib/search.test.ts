import { test } from "node:test";
import assert from "node:assert/strict";
import { search, matchScore, type Lite } from "./search.ts";

const A = (id: number, n: string, s: string, c: string, extra: Partial<Lite> = {}): Lite =>
  ({ id, n, s, g: "M", c, i: true, f: c === "FR", p: false, ...extra });
const list = [
  A(1, "Kylian Mbappé", "Football", "FR"),
  A(2, "Félix Lebrun", "Tennis de table", "FR"),
  A(3, "Alexis Lebrun", "Tennis de table", "FR"),
  A(4, "Tadej Pogačar", "Cyclisme sur route", "SI"),
  A(5, "Summer McIntosh", "Natation", "CA", { g: "F" }),
  A(6, "Mathieu van der Poel", "Cyclisme sur route", "NL"),
  A(7, "Armand Duplantis", "Athlétisme", "SE"),
];

test("fautes de frappe", () => {
  assert.equal(search(list, "mbape")[0].id, 1);
  assert.equal(search(list, "pogacar")[0].id, 4);
  assert.equal(search(list, "duplantiss")[0].id, 7);
  assert.equal(search(list, "pogcaar")[0].id, 4);
});

test("saisie collée ou avec espaces", () => {
  assert.equal(search(list, "Mc Intosh")[0].id, 5);
  assert.equal(search(list, "vanderpoel")[0].id, 6);
});

test("homonymes : les deux Lebrun sont proposés, le prénom départage", () => {
  assert.deepEqual(search(list, "lebrun").map((a) => a.id).sort(), [2, 3]);
  assert.equal(search(list, "felix lebrun")[0].id, 2);
});

test("lettres nordiques et spéciales", () => {
  const l = [A(9, "Johannes Høsflot Klæbo", "Ski de fond", "NO"), A(10, "Iga Świątek", "Tennis", "PL")];
  assert.equal(search(l, "klaebo")[0].id, 9);
  assert.equal(search(l, "hosflot")[0].id, 9);
  assert.equal(search(l, "swiatek")[0].id, 10);
});

test("filtre France", () => {
  assert.equal(search(list, "pogacar", { franceOnly: true }).length, 0);
});

test("pas de faux positifs grossiers", () => {
  assert.equal(matchScore("zidane", "Kylian Mbappé"), 0);
});
