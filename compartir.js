(function(){
  var bar = document.querySelector(".lang-bar");
  if (!bar) return;
  var MSG = {
    es: { title: "Libro de Ahorro", text: "Te recomiendo el Libro de Ahorro para organizar lo que ahorras cada mes:" },
    it: { title: "Libro dei Risparmi", text: "Ti consiglio il Libro dei Risparmi per organizzare quanto risparmi ogni mese:" },
    en: { title: "Savings Book", text: "Check out Savings Book to organise how much you save each month:" }
  };
  var wrap = document.createElement("div");
  wrap.className = "share-wrap";
  wrap.innerHTML =
    '<button type="button" class="ghost-btn lang-btn" id="shareBtn" aria-haspopup="true"><span aria-hidden="true">📤</span> <span>Compartir</span></button>' +
    '<div class="share-menu" id="shareMenu" hidden>' +
      '<button type="button" data-net="native" hidden><span aria-hidden="true">📲</span><span>Más opciones…</span></button>' +
      '<a data-net="whatsapp" target="_blank" rel="noopener"><span aria-hidden="true">💬</span><span>WhatsApp</span></a>' +
      '<button type="button" data-net="instagram"><span aria-hidden="true">📸</span><span>Instagram</span></button>' +
      '<a data-net="sms"><span aria-hidden="true">📱</span><span>Mensaje de texto</span></a>' +
      '<a data-net="telegram" target="_blank" rel="noopener"><span aria-hidden="true">✈️</span><span>Telegram</span></a>' +
      '<a data-net="facebook" target="_blank" rel="noopener"><span aria-hidden="true">📘</span><span>Facebook</span></a>' +
      '<a data-net="x" target="_blank" rel="noopener"><span aria-hidden="true">𝕏</span><span>X (Twitter)</span></a>' +
      '<a data-net="email"><span aria-hidden="true">✉️</span><span>Correo</span></a>' +
      '<button type="button" data-net="copy"><span aria-hidden="true">🔗</span><span>Copiar enlace</span></button>' +
      '<div class="share-note" id="shareNote" hidden></div>' +
    '</div>';
  bar.insertBefore(wrap, bar.firstChild);
  var btn = document.getElementById("shareBtn");
  var menu = document.getElementById("shareMenu");
  var note = document.getElementById("shareNote");
  function datos(){
    var m = MSG[document.documentElement.lang] || MSG.es;
    return { title: m.title, text: m.text, url: location.origin + location.pathname };
  }
  function enc(s){ return encodeURIComponent(s); }
  function prepararEnlaces(){
    var d = datos();
    var hrefs = {
      whatsapp: "https://wa.me/?text=" + enc(d.text + " " + d.url),
      sms: "sms:?&body=" + enc(d.text + " " + d.url),
      telegram: "https://t.me/share/url?url=" + enc(d.url) + "&text=" + enc(d.text),
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + enc(d.url),
      x: "https://twitter.com/intent/tweet?text=" + enc(d.text) + "&url=" + enc(d.url),
      email: "mailto:?subject=" + enc(d.title) + "&body=" + enc(d.text + "\n" + d.url)
    };
    menu.querySelectorAll("a[data-net]").forEach(function(a){ a.href = hrefs[a.getAttribute("data-net")]; });
    menu.querySelector('[data-net="native"]').hidden = !navigator.share;
  }
  function aviso(t){ note.textContent = t; note.hidden = false; }
  function copiar(texto, alTerminar){
    function fallback(){
      var ta = document.createElement("textarea");
      ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      alTerminar();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(alTerminar, fallback);
    else fallback();
  }
  function cerrar(){ menu.hidden = true; note.hidden = true; }
  btn.addEventListener("click", function(e){
    e.stopPropagation();
    if (menu.hidden){ prepararEnlaces(); note.hidden = true; menu.hidden = false; }
    else cerrar();
  });
  menu.addEventListener("click", function(e){
    e.stopPropagation();
    var item = e.target.closest("[data-net]");
    if (!item) return;
    var net = item.getAttribute("data-net");
    var d = datos();
    if (net === "native"){
      navigator.share({ title: d.title, text: d.text, url: d.url }).catch(function(){});
    } else if (net === "copy"){
      copiar(d.url, function(){ aviso("Enlace copiado."); });
    } else if (net === "instagram"){
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
        navigator.share({ title: d.title, text: d.text, url: d.url }).catch(function(){});
      } else {
        copiar(d.text + " " + d.url, function(){ aviso("Enlace copiado. Pégalo en Instagram (en un mensaje o en tu historia)."); });
      }
    } else {
      setTimeout(cerrar, 300);
    }
  });
  document.addEventListener("click", function(){ if (!menu.hidden) cerrar(); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") cerrar(); });
})();
