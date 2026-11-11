(function(){
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
  // Si ya se abre como app instalada, no mostramos el botón
  var instalada = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var bar = document.querySelector(".lang-bar");
  if (!bar || instalada) return;

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "ghost-btn lang-btn";
  btn.innerHTML = '<span aria-hidden="true">📲</span> <span>Instalar app</span>';
  bar.insertBefore(btn, bar.firstChild);

  var aviso = null;
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); aviso = e; });
  window.addEventListener("appinstalled", function(){ btn.hidden = true; cerrar(); });

  var ua = navigator.userAgent || "";
  var esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var esAndroid = /Android/i.test(ua);
  var esSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg\//i.test(ua);

  function pasos(){
    if (esIOS) return esSafari
      ? ["Pulsa el botón <b>Compartir</b> (el cuadrado con la flecha ↑) en la barra de Safari.",
         "Elige <b>Añadir a pantalla de inicio</b>.",
         "Pulsa <b>Añadir</b>. Tendrás CapitalNido como una app más."]
      : ["En iPhone/iPad la instalación se hace desde <b>Safari</b>.",
         "Abre esta página en Safari, pulsa <b>Compartir</b> (↑) y elige <b>Añadir a pantalla de inicio</b>."];
    if (esAndroid) return ["Abre el menú del navegador (<b>⋮</b> arriba a la derecha).",
         "Pulsa <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.",
         "Confirma. La app aparecerá con tus demás aplicaciones."];
    if (esSafari) return ["En el menú de Safari, elige <b>Archivo → Añadir al Dock</b>."];
    return ["Busca el icono de instalar <b>⊕</b> a la derecha de la barra de direcciones,",
            "o abre el menú del navegador (<b>⋮</b>) → <b>Transmitir, guardar y compartir → Instalar página como app</b>.",
            "Si ya la instalaste antes, búscala entre tus aplicaciones."];
  }

  var capa = null;
  function cerrar(){ if (capa) { capa.remove(); capa = null; } }
  function mostrarAyuda(){
    cerrar();
    capa = document.createElement("div");
    capa.setAttribute("role", "dialog"); capa.setAttribute("aria-modal", "true");
    capa.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px";
    var caja = document.createElement("div");
    caja.style.cssText = "background:#fff;color:#1d2b27;max-width:420px;width:100%;border-radius:14px;padding:20px 22px;box-shadow:0 10px 40px rgba(0,0,0,.25);font:15px/1.5 inherit";
    caja.innerHTML = '<h3 style="margin:0 0 6px;font-size:18px;color:#1f5c4d">📲 Instalar CapitalNido</h3>' +
      '<p style="margin:0 0 10px">Una vez instalada se abre como una app y <b>funciona sin wifi</b>. Lo que anotes se guarda en este dispositivo.</p>' +
      '<ol style="margin:0 0 14px;padding-left:20px">' + pasos().map(function(p){ return "<li>" + p + "</li>"; }).join("") + '</ol>' +
      '<button type="button" style="background:#1f5c4d;color:#fff;border:0;border-radius:8px;padding:9px 18px;font:inherit;cursor:pointer">Entendido</button>';
    caja.querySelector("button").addEventListener("click", cerrar);
    capa.addEventListener("click", function(e){ if (e.target === capa) cerrar(); });
    capa.appendChild(caja);
    document.body.appendChild(capa);
  }
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") cerrar(); });

  btn.addEventListener("click", function(){
    if (aviso) {
      aviso.prompt();
      aviso.userChoice.finally(function(){ aviso = null; });
    } else {
      mostrarAyuda();
    }
  });
})();
