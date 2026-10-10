// SQLite se connection (Capacitor SQLite plugin). Android par asli SQLite database file banti hai.
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { SCHEMA, toStatements, fromRows } from './dbmap.js';

const DB_NAME = 'tasbi_production';
let db = null;
let chain = Promise.resolve();

async function init() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistent = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (consistent.result && isConn) db = await sqlite.retrieveConnection(DB_NAME, false);
  else db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await db.open();
  await db.execute(SCHEMA);   // tables pehli dafa khud ban jate hain
}

async function rows(sql) {
  const r = await db.query(sql);
  return r.values || [];
}

// Pehli dafa (database khali) null deta hai
async function load() {
  const meta = await rows('SELECT key, value FROM meta');
  if (!meta.some(m => m.key === 'initialized')) return null;
  return fromRows({
    parties: await rows('SELECT * FROM parties ORDER BY id'),
    categories: await rows('SELECT * FROM categories ORDER BY list, id'),
    entries: await rows('SELECT * FROM entries ORDER BY seq'),
    productions: await rows('SELECT * FROM productions ORDER BY id'),
    payments: await rows('SELECT * FROM payments ORDER BY id'),
    meta
  });
}

// Saves line me chalte hain taake aapas me na takrayen
function save(state) {
  const run = () => db.executeSet(toStatements(state), true);   // true = ek transaction
  chain = chain.catch(() => {}).then(run);
  return chain;
}

window.TasbiDb = { init, load, save };
