import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (file) =>
  JSON.parse(readFileSync(new URL("../" + file, import.meta.url), "utf8"));
const ledger = read("release/app-launch-ledger.json"),
  state = read("release/market-launch-state.json"),
  ads = read("release/admob.json");
assert.equal(ledger.schemaVersion, 1);
assert.equal(state.schemaVersion, 1);
assert.equal(ledger.app.repo, "seoleeapps/meniere-support");
assert.equal(state.app.repo, ledger.app.repo);
assert.deepEqual(Object.keys(state.markets), ["google_play"]);
assert.equal(
  state.markets.google_play.identity.applicationId,
  "com.seoleeapps.menieresupport",
);
const releaseGates = [
  ...Object.entries(state.commonGates),
  ...Object.entries(state.markets).flatMap(([market, entry]) =>
    Object.entries(entry.gates).map(([id, gate]) => [`${market}.${id}`, gate]),
  ),
];
for (const [id, gate] of releaseGates) {
  assert.ok(["pending", "pass", "na", "blocked"].includes(gate.status), id);
  if (["pass", "na"].includes(gate.status)) {
    assert.ok(gate.evidence.length && gate.checkedAt, id + " requires evidence");
  }
  if (gate.status === "blocked") {
    assert.ok(gate.blocker && gate.checkedAt, id + " requires a blocker");
  }
}
for (const platform of ["android", "ios"]) {
  assert.match(ads[platform].appId, /^ca-app-pub-9932778305312246~\d+$/);
  assert.match(ads[platform].bannerId, /^ca-app-pub-9932778305312246\/\d+$/);
}
const items = Object.values(ledger.sections).flatMap(
  (section) => section.items,
);
assert.ok(items.length > 50);
assert.equal(new Set(items.map((item) => item.id)).size, items.length);
for (const item of items) {
  assert.ok(
    ["pending", "pass", "na", "blocked", "stale"].includes(item.status),
    item.id,
  );
  if (["pass", "na"].includes(item.status)) {
    assert.ok(
      item.evidence.length && item.checkedAt,
      item.id + " requires evidence",
    );
    if (item.status === "na")
      assert.ok(item.notes, item.id + " requires a reason");
  }
}
if (process.argv.includes("--schema-only")) {
  console.log(
    "Release metadata structure: pass. Public readiness is checked separately.",
  );
} else {
  const pending = items.filter(
    (item) =>
      (item.appliesTo.includes("all") ||
        item.appliesTo.some((m) => ledger.app.targetMarkets.includes(m))) &&
      !["pass", "na"].includes(item.status),
  );
  const gates = releaseGates.filter(
    ([, gate]) => gate.status !== "pass" && gate.status !== "na",
  );
  for (const item of pending) console.error(`${item.id}: ${item.status}`);
  for (const [id, gate] of gates)
    console.error(`${id}: ${gate.status}${gate.blocker ? " — " + gate.blocker : ""}`);
  assert.equal(
    pending.length + gates.length,
    0,
    "Release is not ready; do not submit or publish this candidate.",
  );
  console.log("Release readiness: pass");
}
