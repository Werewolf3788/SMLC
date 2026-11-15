/* Bakes the Clay County Business Directory into directory.html (cards, menus, quick answers,
   schema.org JSON-LD) so Google and AI crawlers can read it without running JavaScript.
   Source: Firestore directory/public (public read) -> falls back to data/directory.json.
   Usage:  node scripts/build-directory.mjs            (Firestore, then fallback)
           node scripts/build-directory.mjs --file x.json
   Writes: directory.html (between the DIR markers) and data/directory.json */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FS_DOC = 'https://firestore.googleapis.com/v1/projects/smlc-fuel-monitor/databases/(default)/documents/directory/public?key=AIzaSyBYPbGWDhPUnCSnPWDP9wtiKe2P5WpinXg';

// Load the shared renderer (a browser script) into a sandbox
const sandbox = { window: {}, Intl, Date, String, Object, encodeURIComponent };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'smlc-directory-render.js'), 'utf8'), sandbox);
const D = sandbox.window.SMLCDirectory;

async function loadData() {
  const i = process.argv.indexOf('--file');
  if (i > 0) return { pub: JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')), from: process.argv[i + 1] };
  try {
    const r = await fetch(FS_DOC);
    if (r.ok) {
      const doc = await r.json();
      const pub = D.fieldsToObject(doc.fields || {});
      if (pub.businesses && pub.businesses.length) return { pub, from: 'Firestore' };
    }
    console.log('Firestore answered ' + r.status + '; using data/directory.json');
  } catch (e) {
    console.log('Firestore not reachable (' + e.message + '); using data/directory.json');
  }
  const file = path.join(root, 'data', 'directory.json');
  return { pub: JSON.parse(fs.readFileSync(file, 'utf8')), from: 'data/directory.json' };
}

function between(html, name, content) {
  const re = new RegExp('(<!--' + name + '-->)[\\s\\S]*?(<!--/' + name + '-->)');
  if (!re.test(html)) throw new Error('Marker ' + name + ' not found in directory.html');
  return html.replace(re, (m, a, b) => a + content + b);
}

const { pub, from } = await loadData();
const today = D.todayIso();
const htmlFile = path.join(root, 'directory.html');
let html = fs.readFileSync(htmlFile, 'utf8');
const ld = JSON.stringify(D.ldJson(pub, today)).replace(/</g, '\\u003c');
html = between(html, 'DIR-LD', '<script type="application/ld+json" id="dir-ld">' + ld + '</script>');
html = between(html, 'DIR-COUNT', String(pub.count || (pub.businesses || []).length));
html = between(html, 'DIR-TOWNS', D.optionsHtml(pub.towns, 'All towns'));
html = between(html, 'DIR-CATS', D.optionsHtml(pub.categories, 'All categories'));
html = between(html, 'DIR-CARDS', '\n' + D.cardsHtml(pub, today) + '\n');
html = between(html, 'DIR-ANSWERS', '\n' + D.answersHtml(pub) + '\n');
const updated = new Date(pub.updatedAt);
html = between(html, 'DIR-UPDATED', updated.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }) + ' Central');
html = html.replace(/<html lang="en"[^>]*>/, '<html lang="en" data-dir-updated="' + D.esc(pub.updatedAt) + '">');
fs.writeFileSync(htmlFile, html);
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'directory.json'), JSON.stringify(pub, null, 1) + '\n');
console.log('directory.html built from ' + from + ': ' + (pub.businesses || []).length + ' businesses, ' + (pub.answers || []).length + ' answers.');
