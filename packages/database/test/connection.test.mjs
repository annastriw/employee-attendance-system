import assert from "node:assert/strict";
import { test } from "node:test";
import { createDatabaseClient } from "../dist/index.js";
test("rejects missing credentials or a non-MySQL URL without echoing secrets", () => {
  assert.throws(() => createDatabaseClient("postgresql://user:secret@localhost/db"), /MySQL/);
  assert.throws(() => createDatabaseClient("mysql://user@localhost/db"), /credentials/);
});
test("remote connections require a verified CA certificate", () => {
  assert.throws(() => createDatabaseClient("mysql://user:secret@db.example.test/db"), /TLS/);
});
test("limits the connection pool", () => {
  assert.throws(() => createDatabaseClient("mysql://user:secret@127.0.0.1/db", { poolSize: 0 }), /pool/);
});
