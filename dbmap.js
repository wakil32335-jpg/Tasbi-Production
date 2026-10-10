// App ka data  <->  SQLite tables (sirf mapping, koi plugin yahan nahi)
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS parties(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'p' = Worker (Cr.), 'r' = Malik (Dr.)
  inactive INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories(
  list TEXT NOT NULL,              -- 'p' = Production Rate List, 's' = Delivery Rate List
  id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  inactive INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(list, id)
);
CREATE TABLE IF NOT EXISTS entries(  -- ledger ki har line
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL,
  label TEXT,
  details TEXT,
  credit REAL,
  debit REAL,
  link TEXT,                       -- production/delivery id, 'y<id>' payment, ya 'open'
  iso TEXT
);
CREATE TABLE IF NOT EXISTS productions(  -- Production (kind 'p') aur Delivery (kind 's')
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  party_id INTEGER NOT NULL,
  iso TEXT NOT NULL,
  category TEXT,
  qty INTEGER,
  price REAL,
  total REAL,
  remarks TEXT
);
CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY,
  party_id INTEGER NOT NULL,
  iso TEXT NOT NULL,
  amount REAL,
  remarks TEXT
);
CREATE TABLE IF NOT EXISTS meta(
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

const TABLES = ['entries', 'parties', 'categories', 'productions', 'payments', 'meta'];

// Poora state -> SQL statements (ek transaction me chalenge)
export function toStatements(s) {
  const st = TABLES.map(t => ({ statement: 'DELETE FROM ' + t + ';', values: [] }));
  const add = (statement, values) => st.push({ statement, values });
  s.parties.forEach(p => {
    add('INSERT INTO parties(id,name,type,inactive) VALUES (?,?,?,?);', [p.id, p.name, p.t, p.off ? 1 : 0]);
    p.e.forEach(x => add(
      'INSERT INTO entries(party_id,label,details,credit,debit,link,iso) VALUES (?,?,?,?,?,?,?);',
      [p.id, x[0], x[1], x[2], x[3], x[4] == null ? null : String(x[4]), x[5]]));
  });
  [['p', s.cats], ['s', s.scats]].forEach(([list, arr]) => arr.forEach(c => add(
    'INSERT INTO categories(list,id,name,price,inactive) VALUES (?,?,?,?,?);',
    [list, c.id, c.name, c.price, c.off ? 1 : 0])));
  s.prods.forEach(x => add(
    'INSERT INTO productions(id,kind,party_id,iso,category,qty,price,total,remarks) VALUES (?,?,?,?,?,?,?,?,?);',
    [x.id, x.kind, x.aid, x.iso, x.k, x.q, x.p, x.t, x.rm || '']));
  s.pays.forEach(x => add(
    'INSERT INTO payments(id,party_id,iso,amount,remarks) VALUES (?,?,?,?,?);',
    [x.id, x.aid, x.iso, x.amt, x.rm || '']));
  add('INSERT INTO meta(key,value) VALUES (?,?);', ['nid', String(s.nid)]);
  add('INSERT INTO meta(key,value) VALUES (?,?);', ['pyid', String(s.pyid)]);
  add('INSERT INTO meta(key,value) VALUES (?,?);', ['initialized', '1']);
  return st;
}

// Tables ki rows -> app ka state
export function fromRows(r) {
  const byId = {};
  const parties = r.parties.map(p => {
    const o = { id: p.id, name: p.name, t: p.type, e: [] };
    if (p.inactive) o.off = true;
    byId[p.id] = o;
    return o;
  });
  r.entries.forEach(x => {
    const o = byId[x.party_id];
    if (!o) return;
    let link = x.link;
    if (link != null && /^\d+$/.test(link)) link = Number(link);
    o.e.push([x.label, x.details, x.credit, x.debit, link, x.iso]);
  });
  const cat = l => r.categories.filter(c => c.list === l).map(c => {
    const o = { id: c.id, name: c.name, price: c.price };
    if (c.inactive) o.off = true;
    return o;
  });
  const nm = id => (byId[id] ? byId[id].name : '?');
  const prods = r.productions.map(x => ({ id: x.id, kind: x.kind, aid: x.party_id, iso: x.iso, n: nm(x.party_id), k: x.category, q: x.qty, p: x.price, t: x.total, rm: x.remarks || '' }));
  const pays = r.payments.map(x => ({ id: x.id, aid: x.party_id, iso: x.iso, n: nm(x.party_id), amt: x.amount, rm: x.remarks || '' }));
  const meta = {};
  r.meta.forEach(m => { meta[m.key] = m.value; });
  return { parties, cats: cat('p'), scats: cat('s'), prods, pays, nid: Number(meta.nid || 0), pyid: Number(meta.pyid || 0) };
}
