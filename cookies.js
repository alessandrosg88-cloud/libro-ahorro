(function(){
  var b = document.getElementById('cookie-banner'), K = 'libroCookiesOk', ok = false;
  try { ok = localStorage.getItem(K) === '1'; } catch (e) {}
  if (!ok) b.style.display = 'flex';
  document.getElementById('cookie-accept').onclick = function(){
    b.style.display = 'none';
    try { localStorage.setItem(K, '1'); } catch (e) {}
  };
})();
