// Service worker del Libro de Ahorro: permite instalar la app y abrirla sin conexión.
// Solo guarda en caché los archivos de la propia web; los datos de tu cuenta
// (Supabase) nunca se guardan aquí, siempre van directos por internet.
var CACHE = "libro-ahorro-v7";
var ARCHIVOS = [
  "./",
  "index.html",
  "fonts.css",
  "supabase.min.js",
  "app.js",
  "idioma.js",
  "compartir.js",
  "cookies.js",
  "pwa.js",
  "privacidad.html",
  "terminos.html",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  // Solo GET de nuestro propio dominio; todo lo demás (Supabase, etc.) pasa sin tocar
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Primero internet (para tener siempre la última versión); si no hay conexión, la copia guardada
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); });
    })
  );
});
