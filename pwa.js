Añadir pwa.js  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
  var bar = document.querySelector(".lang-bar");
  if (!bar) return;
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "ghost-btn lang-btn"; btn.hidden = true;
  btn.innerHTML = '<span aria-hidden="true">📲</span> <span>Instalar app</span>';
  bar.insertBefore(btn, bar.firstChild);
  var aviso = null;
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); aviso = e; btn.hidden = false; });
  btn.addEventListener("click", function(){
    if (!aviso) return;
    aviso.prompt();
    aviso.userChoice.finally(function(){ aviso = null; btn.hidden = true; });
  });
  window.addEventListener("appinstalled", function(){ btn.hidden = true; });
})();
