// Service worker del CapitalNido: permite instalar la app y abrirla sin conexión.
// Solo guarda en caché los archivos de la propia web; los datos de tu cuenta
// nunca se guardan aquí, siempre van directos por internet.
var CACHE = "libro-ahorro-v13";
var ARCHIVOS = [
  "./",
  "index.html",
  "fonts.css",
  "nube.js",
  "app.js",
  "idioma.js",
  "compartir.js",
  "cookies.js",
  "pwa.js",
  "privacidad.html",
  "terminos.html",
  "manifest.webmanifest",
  "icon.svg",
  "logo.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];
// Si internet tarda más que esto (wifi débil), se usa la copia guardada
var ESPERA_MS = 3500;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("libro-ahorro-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function desdeCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (r) {
    if (r) return r;
    if (req.mode === "navigate") return caches.match("index.html");
    return undefined;
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  // Solo GET de nuestro propio dominio; todo lo demás (Supabase, etc.) pasa sin tocar
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Primero internet (para tener siempre la última versión); si no hay conexión
  // o tarda demasiado, la copia guardada.
  var red = fetch(new Request(req, { cache: "no-cache" })).then(function (res) {
    if (res && res.ok) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copia); });
    }
    return res;
  });
  e.waitUntil(red.catch(function () {}));

  e.respondWith(new Promise(function (resolve) {
    var hecho = false;
    function fin(r) { if (!hecho && r) { hecho = true; resolve(r); } }
    var t = setTimeout(function () { desdeCache(req).then(fin); }, ESPERA_MS);
    red.then(function (res) { clearTimeout(t); fin(res); })
       .catch(function () {
         clearTimeout(t);
         desdeCache(req).then(function (r) { if (r) fin(r); else if (!hecho) { hecho = true; resolve(Response.error()); } });
       });
    // Si tras el tiempo de espera no había copia, seguimos esperando a internet
  }));
});
