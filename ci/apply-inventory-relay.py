#!/usr/bin/env python3
"""One-off: point the inventory barcode lookup at the SMLC lookup relay.

The old code called UPCitemdb straight from the browser, which that service blocks
(its responses only allow its own origin), so household products never filled in.
This rewrites that lookup to use the relay, which does the lookup server-side.
Safe to run twice: it does nothing if the change is already there.
"""
import pathlib
import sys

MARK_START = '    // UPCitemdb free lookup:'
MARK_END = '\n    // ---- trusted list (inventory/products.json)'

NEW = """    // SMLC product lookup relay: the big product databases (retailerapi, UPCitemdb) only
    // answer servers, so this relay does the lookup and hands back the name, brand and picture.
    var UPC_RELAY = 'https://smlc-barcode-lookup-0r5r2m.freebuff.site/';
    function relayLookup(code) {
        if (!/^\\d{8,14}$/.test(code)) return Promise.resolve(null);
        return fetch(UPC_RELAY + '?upc=' + encodeURIComponent(code))
            .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
                if (!j || !j.found || !j.name) return null;
                return { name: j.name, brand: j.brand || '', category: j.category || 'Other',
                         image: j.image || '', storeLink: j.storeLink || '', barcode: code,
                         source: 'found', from: 'the SMLC product lookup' };
            }).catch(function () { return null; });
    }"""


def main():
    path = pathlib.Path('inventory/index.html')
    html = path.read_text(encoding='utf-8')
    if 'relayLookup' in html:
        print('already applied')
        return 0
    start = html.index(MARK_START)
    end = html.index(MARK_END)
    html = html[:start] + NEW + html[end:]
    html = html.replace('jobs.push(upcdbLookup(code));', 'jobs.push(relayLookup(code));')
    path.write_text(html, encoding='utf-8')
    print('patched inventory/index.html')
    return 0


if __name__ == '__main__':
    sys.exit(main())
