/**
 * SMLC Product Lookup — one barcode in, one clean product out.
 *
 * Deploy: Extensions → Apps Script → Deploy → New deployment → Web app
 *         Execute as: Me.  Who has access: Anyone.
 *   Then paste the /exec URL into the inventory page as LOOKUP_URL (inventory/index.html).
 *
 *   GET .../exec?upc=013700016608
 *   GET .../exec?upc=013700016608&callback=myFn     -> myFn({...}); (works from any page, no CORS)
 *   GET .../exec?status=1                          -> which keys the vault gave us (names only, never values)
 *
 * Keys are never written here. They come from the Key Vault through the shared Keys library,
 * so rotating a key in the "Keys" sheet is all it takes — no code change, no redeploy.
 *
 * The answer is the same shape for food and non-food:
 *   { found, upc, name, brand, category, isFood, image, storeLink, source }
 *   category is one of the inventory app's types (Food, Cleaning, Electronics, …);
 *   isFood tells the app whether to ask for an expiry date (food) or a purchase time + serial (everything else).
 */

var FOOD_CATS = ['Food', 'Fresh food', 'Drinks', 'Snacks', 'Frozen'];
var CACHE_SECONDS = 6 * 60 * 60;   // a barcode's product data does not change hourly

function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback || '';

  if (p.status) {
    return reply({
      ok: true,
      service: 'SMLC product lookup',
      v: 1,
      keys: {
        retailerapi_api_key: !!secret('retailerapi_api_key'),
        kroger_client_id: !!secret('kroger_client_id'),
        kroger_client_secret: !!secret('kroger_client_secret'),
        usda_fdc_api_key: !!secret('usda_fdc_api_key')
      }
    }, cb);
  }

  var code = String(p.upc || p.barcode || '').replace(/\D/g, '');
  if (!/^\d{8,14}$/.test(code)) {
    return reply({ found: false, error: 'send ?upc= with 8 to 14 digits' }, cb);
  }

  var out;
  try {
    out = lookup(code);
  } catch (err) {
    out = { found: false, upc: code, error: String((err && err.message) || err).slice(0, 300) };
  }
  return reply(out, cb);
}

function reply(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---- keys -------------------------------------------------------------------
// Keys.get() is the shared Keys library. If a key is missing, add a row to the "Keys" sheet.
function secret(name) {
  try {
    return String(Keys.get(name) || '').trim();
  } catch (e) {
    return '';
  }
}

// ---- lookup -----------------------------------------------------------------
function lookup(code) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('upc:' + code);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) { /* fall through and ask again */ }
  }

  var out = { found: false, upc: code, source: null, v: 1 };
  var codes = variants(code);

  // 1) retailerapi: any UPC/EAN, food or not — the widest net we have
  for (var i = 0; i < codes.length && !out.found; i++) {
    var a = retailerApi(codes[i]);
    if (a && a.found) out = a;
  }
  // 2) Kroger: grocery, but its catalogue also carries household goods
  for (var j = 0; j < codes.length && !out.found; j++) {
    var k = kroger(codes[j]);
    if (k && k.found) out = k;
  }
  // 3) USDA FoodData Central: branded food, by UPC — food only, so last
  for (var m = 0; m < codes.length && !out.found; m++) {
    var u = usda(codes[m]);
    if (u && u.found) out = u;
  }

  if (out.found) {
    out.isFood = FOOD_CATS.indexOf(out.category) >= 0;
    try { cache.put('upc:' + code, JSON.stringify(out), CACHE_SECONDS); } catch (e) { /* caching is optional */ }
  }
  return out;
}

// The same product turns up as 12 digits (UPC-A), 13 (EAN-13) or 14 (GTIN); try each spelling
function variants(code) {
  var out = [code];
  if (/^\d{12}$/.test(code)) out.push('0' + code);
  if (/^\d{13}$/.test(code) && code.charAt(0) === '0') out.push(code.slice(1));
  if (/^\d{14}$/.test(code)) out.push(code.slice(1));
  if (/^\d{8}$/.test(code)) out.push('00000' + code);
  var seen = {}, uniq = [];
  for (var i = 0; i < out.length; i++) {
    if (!seen[out[i]]) { seen[out[i]] = 1; uniq.push(out[i]); }
  }
  return uniq;
}

function clean(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

function httpsUrl(u) {
  return String(u || '').replace(/^http:/i, 'https:');
}

// Food or not, from words in the product's name and categories.
// Anything that does not read as food stays "Other" — the app then treats it as a thing you keep.
function classify(text) {
  var s = ' ' + clean(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  function has(re) { return re.test(s); }
  if (has(/\b(paper towels?|toilet paper|tissues?|napkins?|paper plates?|paper cups?)\b/)) return 'Paper goods';
  if (has(/\b(trash|garbage|detergent|laundry|bleach|disinfect\w*|cleaners?|cleaning|dish soap|dishwasher|mop|sponge)\b/)) return 'Cleaning';
  if (has(/\b(pet|pets|dog|cat|litter|bird|fish)\b/)) return 'Pet';
  if (has(/\b(shampoo|toothpaste|toothbrush|deodorant|razors?|lotion|body wash|soap|floss)\b/)) return 'Personal care';
  if (has(/\b(vitamins?|medicine|pain relief|first aid|bandages?|ibuprofen|acetaminophen)\b/)) return 'Medicine';
  if (has(/\b(diapers?|wipes|baby formula)\b/)) return 'Baby';
  if (has(/\b(laptop|computer|monitor|keyboard|mouse|headphones?|earbuds?|phone|tablet|television|tv|speaker|camera|charger|cable|console|router)\b/)) return 'Electronics';
  if (has(/\b(refrigerator|fridge|microwave|oven|washer|dryer|vacuum|blender|toaster|air fryer|coffee maker|dishwasher)\b/)) return 'Appliances';
  if (has(/\b(drill|hammer|wrench|screwdriver|saw|tool|toolbox|level|plier)\b/)) return 'Tools';
  if (has(/\b(chair|table|desk|sofa|couch|bookshelf|dresser|mattress|bed frame)\b/)) return 'Furniture';
  if (has(/\b(shirt|t-?shirt|pants|jeans|shorts|jacket|coat|dress|socks|shoes|sneakers|boots|hat)\b/)) return 'Clothing';
  if (has(/\bfrozen\b/)) return 'Frozen';
  if (has(/\b(juice|soda|water|drinks?|beverages?|cola|energy drink)\b/)) return 'Drinks';
  if (has(/\b(ramen|noodles?|soups?|salsa|dips?|sauces?|pasta|cereal|snacks?|chips?|cookies?|crackers?|candy|chocolate|rice|beans?|flour|sugar|milk|cheese|yogurt|bread|eggs?|meat|chicken|beef|pork|fruit|vegetables?|canned|granola|oats?|oil|spices?|seasoning|coffee|tea)\b/)) return 'Food';
  return 'Other';
}

function fetchJson(url, options) {
  var res = UrlFetchApp.fetch(url, options || {});
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) return null;
  try { return JSON.parse(res.getContentText()); } catch (e) { return null; }
}

// retailerapi — lookup by UPC/EAN/GTIN/ASIN, current price + sellers. Free tier: 1,000/month.
function retailerApi(code) {
  var key = secret('retailerapi_api_key');
  if (!key) return null;
  var p = fetchJson('https://api.retailerapi.com/v1/products/' + encodeURIComponent(code), {
    method: 'get',
    headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + key },
    muteHttpExceptions: true
  });
  if (!p || !p.title) return null;
  var cats = Array.isArray(p.categories) ? p.categories.join(' ') : String(p.categories || '');
  return {
    found: true,
    upc: code,
    name: clean(p.title),
    brand: clean(p.brand),
    category: classify(cats + ' ' + p.title),
    image: httpsUrl(p.image_url),
    storeLink: clean(p.walmart_url),
    source: 'retailerapi'
  };
}

// Kroger Products API — needs a token from the client id/secret, then product.compact lookup by UPC.
function krogerToken() {
  var cache = CacheService.getScriptCache();
  var got = cache.get('kroger:token');
  if (got) return got;
  var id = secret('kroger_client_id'), sec = secret('kroger_client_secret');
  if (!id || !sec) return '';
  var res = UrlFetchApp.fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    headers: { 'Authorization': 'Basic ' + Utilities.base64Encode(id + ':' + sec) },
    payload: { grant_type: 'client_credentials', scope: 'product.compact' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return '';
  var tok = '';
  try { tok = (JSON.parse(res.getContentText()) || {}).access_token || ''; } catch (e) { tok = ''; }
  if (tok) cache.put('kroger:token', tok, 1500);   // tokens last 30 min; keep ours a little shorter
  return tok;
}

function kroger(code) {
  var tok = krogerToken();
  if (!tok) return null;
  var upc = code.length === 12 ? '0' + code : code;
  var body = fetchJson('https://api.kroger.com/v1/products?filter.productId=' + encodeURIComponent(upc) + '&filter.limit=1', {
    method: 'get',
    headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + tok },
    muteHttpExceptions: true
  });
  var item = body && body.data && body.data[0];
  if (!item || !item.description) return null;
  var cats = (item.categories || []).join(' ');
  var image = '';
  var sizes = (item.images && item.images[0] && item.images[0].sizes) || [];
  for (var i = 0; i < sizes.length; i++) {
    if (sizes[i] && sizes[i].url) { image = sizes[i].url; break; }
  }
  return {
    found: true,
    upc: code,
    name: clean(item.description),
    brand: clean(item.brand),
    category: classify(cats + ' ' + item.description),
    image: httpsUrl(image),
    storeLink: 'https://www.kroger.com/search?query=' + encodeURIComponent(clean(item.description)),
    source: 'kroger'
  };
}

// USDA FoodData Central — branded foods by UPC. Food only, so it is the last thing asked.
function usda(code) {
  var key = secret('usda_fdc_api_key');
  if (!key) return null;
  var body = fetchJson('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(key) +
    '&query=' + encodeURIComponent(code) + '&dataType=Branded&pageSize=5', {
    method: 'get',
    headers: { 'Accept': 'application/json' },
    muteHttpExceptions: true
  });
  var foods = (body && body.foods) || [];
  for (var i = 0; i < foods.length; i++) {
    var f = foods[i] || {};
    var gtin = String(f.gtinUpc || '').replace(/\D/g, '');
    if (gtin && gtin !== code && gtin !== '0' + code && code !== '0' + gtin) continue;   // must be this product
    if (!f.description) continue;
    var cat = classify((f.foodCategory || '') + ' ' + f.description);
    if (cat === 'Other') cat = 'Food';        // it came from the food database, so it is food
    return {
      found: true,
      upc: code,
      name: clean(f.description),
      brand: clean(f.brandOwner || f.brandName),
      category: cat,
      image: '',
      storeLink: '',
      source: 'usda'
    };
  }
  return null;
}
