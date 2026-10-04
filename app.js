(function(){
  "use strict";

  var STORAGE_KEY = "libro-ahorro-v1";
  var CAT_COLORS = ["--cat-1","--cat-2","--cat-3","--cat-4","--cat-5","--cat-6","--cat-7","--cat-8"];
  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  function todayMonthKey(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
  }
  function monthKeyToLabel(key){
    var parts = key.split("-"); var y = parts[0], m = parseInt(parts[1],10)-1;
    return MESES[m] + " " + y;
  }
  function addMonths(key, delta){
    var parts = key.split("-"); var y = parseInt(parts[0],10), m = parseInt(parts[1],10)-1;
    var d = new Date(y, m + delta, 1);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
  }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function fmtEur(n){
    n = Math.round(n);
    return n.toLocaleString("es-ES") + " €";
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  // Empieza siempre a cero: nada de objetivos ni reparto predefinidos.
  // El usuario decide cuánto quiere ahorrar y cómo repartirlo desde cero.
  function defaultState(){
    return {
      totalMensual: 0,
      investObjetivo: 0,
      categorias: ["Bitcoin","ETF","Acciones"],
      entries: [],       // {id, mes, categoria, cantidad, nota, fecha}
      emergEntries: [],  // {id, mes, categoria, cantidad, nota, fecha}
      fondoCategorias: ["Imprevistos","Viajes","Coche","Casa","Salud"],
      ventas: [],        // {id, mes, tipo: "invest"|"fondo", categoria, cantidad, nota, fecha}
      saldoCuenta: null,       // dinero en la cuenta (lo escribe el usuario)
      valorInversiones: {},    // cat -> {valor, base}: valor actual escrito y lo aportado en ese momento
      entradasFijas: [],       // {id, nombre, cantidad, desde, hasta}
      intereses: [],           // {id, mes, origen, cantidad, nota, fecha}
      metas: {},               // categoría del fondo -> {objetivo, fecha: "YYYY-MM" | null}
      gastosMensuales: null,   // para calcular cuántos meses cubre el fondo
      mesesMeta: 6,
      sim: null,               // {inicial, aporte, rent, anos} del simulador
      plan: []                 // aportación automática: {id, tipo: "invest"|"fondo", categoria, cantidad}
    };
  }
  function mergeDefaults(data){
    var def = defaultState();
    data = data || {};
    for (var k in def) if (!(k in data)) data[k] = def[k];
    return data;
  }

  // ---------- storage: Supabase (per-account), with a localStorage cache ----------
  var SUPABASE_URL = "https://nhhskvauwdudhojjvodi.supabase.co";
  var SUPABASE_KEY = "sb_publishable_0EouCOgtpq146qgFsMusDg_bvQh58MI";
  var SUPABASE_TABLE = "libro_ahorro";

  var sb = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: "libro-ahorro-auth" } });
    }
  } catch (e) { sb = null; }

  var currentUser = null;

  function loadLocalState(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? mergeDefaults(JSON.parse(raw)) : defaultState();
    } catch(e){ return defaultState(); }
  }
  function saveLocalState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
  }
  function setSyncStatus(on, label){
    var dot = document.getElementById("syncDot");
    var lbl = document.getElementById("syncLabel");
    if (dot) dot.className = "sync-dot" + (on ? " on" : "");
    if (lbl) lbl.textContent = label;
  }

  // Guarda en Supabase (si hay sesión) y siempre deja una copia local de respaldo.
  function saveState(){
    saveLocalState();
    if (sb && currentUser){
      sb.from(SUPABASE_TABLE)
        .upsert({ user_id: currentUser.id, data: state, updated_at: new Date().toISOString() })
        .then(function(res){
          if (res.error) { setSyncStatus(false, "sin conexión, guardado local"); }
          else { setSyncStatus(true, "guardado en tu cuenta"); }
        });
    }
  }

  async function loadStateForUser(user){
    if (!sb) return loadLocalState();
    try {
      var res = await sb.from(SUPABASE_TABLE).select("data").eq("user_id", user.id).maybeSingle();
      if (res.error) throw res.error;
      if (res.data && res.data.data) return mergeDefaults(res.data.data);
      var fresh = defaultState();
      await sb.from(SUPABASE_TABLE).insert({ user_id: user.id, data: fresh });
      return fresh;
    } catch (e) {
      setSyncStatus(false, "sin conexión, guardado local");
      return loadLocalState();
    }
  }

  var state = defaultState();
  var currentMonth = todayMonthKey();
  var breakdownScope = "month";

  // ---------- derived helpers ----------
  function investEntriesForMonth(mes){ return state.entries.filter(function(e){ return e.mes === mes; }); }
  function emergEntriesForMonth(mes){ return state.emergEntries.filter(function(e){ return e.mes === mes; }); }
  function sum(arr, key){ return arr.reduce(function(a,b){ return a + (b[key]||0); }, 0); }

  function investTotalMonth(mes){ return sum(investEntriesForMonth(mes), "cantidad"); }
  function emergTotalMonth(mes){ return sum(emergEntriesForMonth(mes), "cantidad"); }
  function ventasDe(tipo, mes){ return (state.ventas || []).filter(function(v){ return v.tipo === tipo && (!mes || v.mes === mes); }); }
  function emergFundTotal(){ return sum(state.emergEntries, "cantidad") - sum(ventasDe("fondo"), "cantidad"); }
  function investHolding(cat){
    var dentro = sum(state.entries.filter(function(e){ return e.categoria === cat; }), "cantidad");
    var fuera = sum(ventasDe("invest").filter(function(v){ return v.categoria === cat; }), "cantidad");
    return dentro - fuera;
  }
  function investTotalAll(){ return sum(state.entries, "cantidad") - sum(ventasDe("invest"), "cantidad"); }
  function fillSelect(sel, items, withNew, emptyText){
    var prev = sel.value;
    sel.innerHTML = "";
    items.forEach(function(c){ var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
    if (!items.length && emptyText){ var e = document.createElement("option"); e.value = ""; e.textContent = emptyText; sel.appendChild(e); }
    if (withNew){ var o2 = document.createElement("option"); o2.value = "__nueva__"; o2.textContent = "+ nueva categoría"; sel.appendChild(o2); }
    if (items.indexOf(prev) >= 0) sel.value = prev;
  }
  function ventaRow(v){
    return '<div class="entry-row venta">' +
      '<span class="dot" style="background:var(--crit)"></span>' +
      '<span class="entry-cat"><span class="name">' + (v.tipo === "invest" ? "Venta" : "Retiro") + ' · ' + escapeHtml(v.categoria || "") + '</span>' +
      (v.nota ? '<span class="note"> · ' + escapeHtml(v.nota) + '</span>' : '') + '</span>' +
      '<span class="entry-amt num" style="color:var(--crit)">−' + fmtEur(v.cantidad) + '</span>' +
      '<button class="entry-del" data-del-venta="' + v.id + '" aria-label="Eliminar">✕</button>' +
    '</div>';
  }

  function categoryColor(cat){
    var idx = state.categorias.indexOf(cat);
    if (idx < 0) idx = state.categorias.length;
    var slot = CAT_COLORS[idx % CAT_COLORS.length];
    return "var(" + slot + ")";
  }

  function allMonthsWithData(){
    var set = {};
    state.entries.forEach(function(e){ set[e.mes] = true; });
    state.emergEntries.forEach(function(e){ set[e.mes] = true; });
    (state.ventas || []).forEach(function(v){ set[v.mes] = true; });
    set[currentMonth] = true;
    set[todayMonthKey()] = true;
    var months = Object.keys(set).sort();
    return months;
  }

  // ---------- rendering ----------
  // ---------- tu dinero: valor actual, entradas fijas, intereses, origen ----------
  var ORIGEN_CUENTA = "cuenta", ORIGEN_INTERESES = "intereses", ORIGEN_FONDO = "fondo";
  var CAT_TRASPASO = "Traspaso a Inversión";
  function fijasDelMes(mes){
    return (state.entradasFijas || []).filter(function(f){ return f.desde <= mes && (!f.hasta || f.hasta >= mes); });
  }
  function interesesDelMes(mes){ return (state.intereses || []).filter(function(i){ return i.mes === mes; }); }
  function valorActualInv(cat){
    var v = (state.valorInversiones || {})[cat];
    var holding = investHolding(cat);
    if (!v) return holding;
    return Math.max(0, v.valor + (holding - v.base));
  }
  function catsConInversion(){
    return state.categorias.filter(function(c){ return investHolding(c) > 0 || (state.valorInversiones || {})[c]; });
  }
  // Ganancia o pérdida: "+120 € (+8,5 %)"
  function fmtGain(g, base){
    var s = (g > 0 ? "+" : g < 0 ? "−" : "") + fmtEur(Math.abs(g));
    if (base > 0){
      var p = g / base * 100;
      s += " (" + (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %)";
    }
    return s;
  }
  function totalValorInv(){ return catsConInversion().reduce(function(a, c){ return a + valorActualInv(c); }, 0); }
  function origenLabel(o){
    if (!o) return "";
    if (o === ORIGEN_CUENTA) return "la cuenta";
    if (o === ORIGEN_INTERESES) return "Cuenta remunerada";
    if (o === ORIGEN_FONDO) return "el Fondo";
    return o.replace(/^fija:/, "");
  }
  // Orígenes disponibles en un mes, con cuánto entra y cuánto se ha usado
  function origenesDelMes(mes){
    var out = [], idx = {};
    fijasDelMes(mes).forEach(function(f){
      var k = "fija:" + f.nombre;
      if (!(k in idx)){ idx[k] = out.length; out.push({ key: k, entra: 0 }); }
      out[idx[k]].entra += f.cantidad;
    });
    out.push({ key: ORIGEN_INTERESES, entra: sum(interesesDelMes(mes), "cantidad") });
    out.push({ key: ORIGEN_CUENTA, entra: null });
    out.forEach(function(o){ o.usado = usadoDe(o.key, mes); });
    return out;
  }
  function usadoDe(origen, mes){
    return sum(investEntriesForMonth(mes).filter(function(e){ return e.origen === origen; }), "cantidad") +
           sum(emergEntriesForMonth(mes).filter(function(e){ return e.origen === origen; }), "cantidad");
  }
  // Devuelve un mensaje si no hay dinero suficiente en el origen elegido
  function faltaDinero(origen, amt){
    if (origen === ORIGEN_FONDO){
      var enFondo = emergFundTotal();
      if (amt > enFondo + 0.001) return "En el fondo solo hay " + fmtEur(Math.max(0, enFondo)) + ".";
      return null;
    }
    if (origen === ORIGEN_CUENTA){
      if (state.saldoCuenta != null && amt > state.saldoCuenta + 0.001) return "En la cuenta solo tienes " + fmtEur(state.saldoCuenta) + ".";
      return null;
    }
    var o = origenesDelMes(currentMonth).filter(function(x){ return x.key === origen; })[0];
    if (!o) return null;
    var libre = o.entra - o.usado;
    if (amt > libre + 0.001) return "De " + origenLabel(origen) + " solo te quedan " + fmtEur(Math.max(0, libre)) + " este mes.";
    return null;
  }
  function aplicarSalidaCuenta(origen, amt){
    if (origen === ORIGEN_CUENTA && state.saldoCuenta != null) state.saldoCuenta = Math.round((state.saldoCuenta + amt) * 100) / 100;
  }
  function fillOrigenSelect(sel){
    var prev = sel.value;
    sel.innerHTML = "";
    origenesDelMes(currentMonth).forEach(function(o){
      var op = document.createElement("option");
      op.value = o.key;
      op.textContent = "Sale de: " + origenLabel(o.key) + (o.entra != null ? " (quedan " + fmtEur(Math.max(0, o.entra - o.usado)) + ")" : (state.saldoCuenta != null ? " (" + fmtEur(state.saldoCuenta) + ")" : ""));
      sel.appendChild(op);
    });
    // Inversión: también se puede pagar con dinero del Fondo (traspaso)
    if (sel.id === "investOrigen"){
      var opF = document.createElement("option");
      opF.value = ORIGEN_FONDO;
      opF.textContent = "Sale de: el Fondo (hay " + fmtEur(Math.max(0, emergFundTotal())) + ")";
      sel.appendChild(opF);
    }
    var keys = Array.prototype.map.call(sel.options, function(x){ return x.value; });
    // Mantiene lo que eligió la persona; si no eligió nada, usa la primera entrada con dinero
    if (sel.dataset.elegido === "1" && keys.indexOf(prev) >= 0) sel.value = prev;
    else if (sel.id === "planOrigen"){
      // El plan: primera entrada que tenga dinero suficiente; si ninguna, la cuenta
      var need = sum(state.plan || [], "cantidad");
      var buena = origenesDelMes(currentMonth).filter(function(o){ return o.entra != null && o.entra - o.usado > 0 && o.entra - o.usado >= need; })[0];
      sel.value = buena ? buena.key : ORIGEN_CUENTA;
    }
    else sel.selectedIndex = 0;
    if (!sel.dataset.escucha){ sel.dataset.escucha = "1"; sel.addEventListener("change", function(){ sel.dataset.elegido = "1"; }); }
  }

  // Objetivo mensual: solo una cantidad; muestra cuánto llevas ahorrado este mes
  function renderGoal(){
    var goal = state.totalMensual || 0;
    var hecho = investTotalMonth(currentMonth) + emergTotalMonth(currentMonth);
    var gi = document.getElementById("goalInput");
    if (document.activeElement !== gi) gi.value = goal > 0 ? goal : "";
    var pct = goal > 0 ? hecho / goal * 100 : 0;
    var fill = document.getElementById("goalFill");
    fill.style.width = clamp(pct, 0, 100) + "%";
    fill.className = "progress-fill invest" + (goal > 0 && hecho >= goal ? " done" : "");
    document.getElementById("goalPct").textContent = goal > 0 ? Math.round(pct) + "%" : "";
    document.getElementById("goalText").textContent = goal > 0 ? "Llevas " + fmtEur(hecho) + " de " + fmtEur(goal) + " este mes" : "Escribe cuánto quieres ahorrar cada mes";
    var st = document.getElementById("goalStatus");
    if (goal <= 0) st.textContent = "";
    else if (hecho >= goal) st.textContent = "¡Objetivo cumplido!";
    else st.textContent = "Te faltan " + fmtEur(goal - hecho);
  }

  function renderMoney(){
    var cuenta = state.saldoCuenta || 0, inv = totalValorInv(), fondo = emergFundTotal();
    document.getElementById("moneyTotal").textContent = fmtEur(cuenta + inv + fondo);
    document.getElementById("moneyCuenta").textContent = fmtEur(cuenta);
    document.getElementById("moneyInv").textContent = fmtEur(inv);
    document.getElementById("moneyFondo").textContent = fmtEur(fondo);
    renderGoal();
    var fijasMes = sum(fijasDelMes(currentMonth), "cantidad");
    document.getElementById("incomeLabel").textContent = fijasMes > 0 ? "+" + fmtEur(fijasMes) + "/mes" : "";
    document.getElementById("investTargetLabel").textContent = fmtEur(inv);
    document.getElementById("emergTargetLabel").textContent = fmtEur(fondo);
    var aportado = catsConInversion().reduce(function(a, c){ return a + investHolding(c); }, 0);
    var g = inv - aportado, gEl = document.getElementById("moneyInvGain");
    gEl.textContent = Math.round(g) === 0 ? "" : fmtGain(g, aportado);
    gEl.className = "gain " + (g > 0 ? "up" : "down");
    var rt = document.getElementById("rentaTotal");
    if (!catsConInversion().length || aportado <= 0){
      rt.innerHTML = "";
    } else {
      rt.innerHTML = '<span class="name">Rentabilidad total</span>' +
        '<span class="aport">aportado ' + fmtEur(aportado) + ' · vale ' + fmtEur(inv) + '</span>' +
        '<b class="gain ' + (g >= 0 ? "up" : "down") + '">' + fmtGain(g, aportado) + '</b>';
    }

    var saldo = document.getElementById("saldoInput");
    if (document.activeElement !== saldo) saldo.value = state.saldoCuenta == null ? "" : state.saldoCuenta;

    // valor actual de inversiones (se mantiene de un mes a otro)
    var cats = catsConInversion();
    var iv = document.getElementById("invValues");
    var focused = document.activeElement && document.activeElement.getAttribute("data-valor-cat");
    if (!cats.length){
      iv.innerHTML = '<div class="empty-note">Cuando añadas una inversión podrás escribir aquí cuánto vale hoy.</div>';
    } else if (!focused){
      iv.innerHTML = cats.map(function(c){
        var val = valorActualInv(c), ap = investHolding(c), d = val - ap;
        return '<div class="val-row">' +
          '<span class="dot" style="background:' + categoryColor(c) + '"></span>' +
          '<span class="name">' + escapeHtml(c) + ' <span class="aport">· aportado ' + fmtEur(ap) + '</span>' +
          (Math.round(d) !== 0 ? ' <span class="gain ' + (d > 0 ? "up" : "down") + '">' + fmtGain(d, ap) + '</span>' : '') + '</span>' +
          '<span class="val-input">€ <input type="number" min="0" step="0.01" data-valor-cat="' + escapeHtml(c) + '" value="' + (Math.round(val * 100) / 100) + '"></span>' +
        '</div>';
      }).join("");
    }

    // entradas fijas
    var fijas = fijasDelMes(currentMonth);
    document.getElementById("fijasList").innerHTML = fijas.length ? fijas.map(function(f){
      return '<div class="entry-row"><span class="dot" style="background:var(--good)"></span>' +
        '<span class="entry-cat"><span class="name">' + escapeHtml(f.nombre) + '</span><span class="note"> · desde ' + monthKeyToLabel(f.desde) + '</span></span>' +
        '<span class="entry-amt num">+' + fmtEur(f.cantidad) + '</span>' +
        '<button class="entry-del" data-del-fija="' + f.id + '" aria-label="Eliminar">✕</button></div>';
    }).join("") : '<div class="empty-note">Añade tu nómina u otras entradas que recibes cada mes.</div>';

    // intereses del mes
    var ints = interesesDelMes(currentMonth);
    document.getElementById("interesesList").innerHTML = ints.length ? ints.map(function(i){
      return '<div class="entry-row"><span class="dot" style="background:var(--good)"></span>' +
        '<span class="entry-cat"><span class="name">' + escapeHtml(i.origen || "Intereses") + '</span>' + (i.nota ? '<span class="note"> · ' + escapeHtml(i.nota) + '</span>' : '') + '</span>' +
        '<span class="entry-amt num">+' + fmtEur(i.cantidad) + '</span>' +
        '<button class="entry-del" data-del-interes="' + i.id + '" aria-label="Eliminar">✕</button></div>';
    }).join("") : '<div class="empty-note">Sin intereses este mes.</div>';
    var io = document.getElementById("interesOrigen"), ioPrev = io.value;
    io.innerHTML = "";
    ["Cuenta", "Fondo"].concat(cats).forEach(function(c){ var o = document.createElement("option"); o.value = c; o.textContent = c; io.appendChild(o); });
    if (ioPrev) io.value = ioPrev;
    if (!io.value) io.selectedIndex = 0;

    // resumen de origen
    var origs = origenesDelMes(currentMonth);
    var totEntra = 0, totUsado = 0;
    var html = origs.map(function(o){
      totUsado += o.usado;
      if (o.entra == null){
        if (!o.usado) return "";
        return '<div class="origen-row"><span class="name">De la cuenta</span><span class="nums">usado ' + fmtEur(o.usado) + '</span></div>';
      }
      if (!o.entra && !o.usado) return "";
      totEntra += o.entra;
      var libre = o.entra - o.usado, pct = o.entra > 0 ? clamp(o.usado / o.entra * 100, 0, 100) : 100;
      return '<div class="origen-row"><span class="name">' + escapeHtml(origenLabel(o.key)) + '</span>' +
        '<span class="nums">entra ' + fmtEur(o.entra) + ' · ahorrado ' + fmtEur(o.usado) + '</span>' +
        '<span class="left" style="color:' + (libre < 0 ? "var(--crit)" : "var(--ink)") + '">quedan ' + fmtEur(libre) + '</span>' +
        '<div class="origen-bar"><div style="width:' + pct + '%"></div></div></div>';
    }).join("");
    if (!html) html = '<div class="empty-note">Añade tus entradas fijas o intereses y, al invertir o ahorrar, elige de dónde sale.</div>';
    else html += '<div class="origen-total"><span>Entra este mes ' + fmtEur(totEntra) + ' · ahorrado ' + fmtEur(totUsado) + '</span><span>Sin asignar ' + fmtEur(totEntra - (totUsado - usadoDe(ORIGEN_CUENTA, currentMonth))) + '</span></div>';
    document.getElementById("origenResumen").innerHTML = html;

    fillOrigenSelect(document.getElementById("investOrigen"));
    fillOrigenSelect(document.getElementById("emergOrigen"));
    renderPlan();
    renderSim();
  }

  function render(){
    renderMonthBar();
    renderHero();
    renderInvestCard();
    renderEmergCard();
    renderHistory();
  }

  function renderMonthBar(){
    document.getElementById("monthLabel").textContent = monthKeyToLabel(currentMonth);
  }

  function renderHero(){
    var totalInput = document.getElementById("totalInput");
    if (document.activeElement !== totalInput) totalInput.value = state.totalMensual;

    var invest = clamp(state.investObjetivo, 0, state.totalMensual);
    var emerg = state.totalMensual - invest;

    var slider = document.getElementById("splitSlider");
    slider.max = state.totalMensual;
    if (document.activeElement !== slider) slider.value = invest;
    document.getElementById("sliderMax").textContent = state.totalMensual;

    document.getElementById("investAmtLabel").textContent = fmtEur(invest);
    document.getElementById("emergAmtLabel").textContent = fmtEur(emerg);

    var investPct = state.totalMensual > 0 ? (invest/state.totalMensual*100) : 0;
    var emergPct = state.totalMensual > 0 ? (100 - investPct) : 0;
    var visual = document.getElementById("splitVisual");
    if (state.totalMensual <= 0){
      visual.innerHTML = '';
    } else {
      visual.innerHTML =
        '<div class="split-seg invest" style="flex-basis:'+investPct+'%">'+(investPct>14?fmtEur(invest):'')+'</div>' +
        '<div class="split-seg emerg" style="flex-basis:'+emergPct+'%">'+(emergPct>14?fmtEur(emerg):'')+'</div>';
    }


    document.getElementById("historyTargetLabel").textContent = "objetivo total " + fmtEur(state.totalMensual) + "/mes";
  }

  function currentInvestObjetivo(){ return clamp(state.investObjetivo, 0, state.totalMensual); }
  function currentEmergObjetivo(){ return state.totalMensual - currentInvestObjetivo(); }

  function renderInvestCard(){
    // category select
    var sel = document.getElementById("investCat");
    var prevVal = sel.value;
    sel.innerHTML = "";
    state.categorias.forEach(function(c){
      var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
    });
    var otherOpt = document.createElement("option");
    otherOpt.value = "__nueva__"; otherOpt.textContent = "+ nueva categoría";
    sel.appendChild(otherOpt);
    if (state.categorias.indexOf(prevVal) >= 0) sel.value = prevVal;

    // progress
    var total = investTotalMonth(currentMonth);
    var target = currentInvestObjetivo();
    var pct = target > 0 ? (total/target*100) : (total>0?100:0);
    var fill = document.getElementById("investProgressFill");
    fill.style.width = clamp(pct,0,100) + "%";
    fill.className = "progress-fill invest" + (total > target && target > 0 ? " over" : "");
    document.getElementById("investProgressText").textContent = fmtEur(total) + " / " + fmtEur(target);
    document.getElementById("investProgressPct").textContent = Math.round(pct) + "%";

    // entries list
    var list = document.getElementById("investEntries");
    var entries = investEntriesForMonth(currentMonth).slice().sort(function(a,b){ return b.fecha.localeCompare(a.fecha); });
    if (entries.length === 0){
      list.innerHTML = '<div class="empty-note">Todavía no has añadido inversiones este mes.</div>';
    } else {
      list.innerHTML = entries.map(function(e){
        return '<div class="entry-row">' +
          '<span class="dot" style="background:'+categoryColor(e.categoria)+'"></span>' +
          '<span class="entry-cat"><span class="name">'+escapeHtml(e.categoria)+'</span>' +
          (e.origen ? '<span class="note"> · de '+escapeHtml(origenLabel(e.origen))+'</span>' : '') +
          (e.nota ? '<span class="note"> · '+escapeHtml(e.nota)+'</span>' : '') + '</span>' +
          '<span class="entry-amt num">'+fmtEur(e.cantidad)+'</span>' +
          '<button class="entry-del" data-del-invest="'+e.id+'" aria-label="Eliminar">✕</button>' +
          '</div>';
      }).join("");
    }

    var ventasMes = ventasDe("invest", currentMonth);

    if (ventasMes.length) list.innerHTML += ventasMes.map(ventaRow).join("");

    document.getElementById("investAllTotal").textContent = fmtEur(investTotalAll());

    fillSelect(document.getElementById("sellCat"), state.categorias.filter(function(c){ return investHolding(c) > 0; }), false, "no tienes inversiones");

    renderCategoryBreakdown();
  }

  function renderCategoryBreakdown(){
    var source = breakdownScope === "month" ? investEntriesForMonth(currentMonth) : state.entries;
    var totals = {};
    state.categorias.forEach(function(c){ totals[c] = 0; });
    source.forEach(function(e){ totals[e.categoria] = (totals[e.categoria]||0) + e.cantidad; });
    (breakdownScope === "month" ? ventasDe("invest", currentMonth) : ventasDe("invest")).forEach(function(v){ totals[v.categoria] = (totals[v.categoria]||0) - v.cantidad; });
    var cats = Object.keys(totals).filter(function(c){ return totals[c] > 0; });
    var grand = cats.reduce(function(a,c){ return a + totals[c]; }, 0);

    var bar = document.getElementById("catStackBar");
    var legend = document.getElementById("catLegend");

    if (grand === 0){
      bar.innerHTML = '<div style="flex:1;background:var(--surface-2);border-radius:6px"></div>';
      legend.innerHTML = '<div class="empty-note">Sin datos todavía.</div>';
      return;
    }

    bar.innerHTML = cats.map(function(c){
      var pct = totals[c]/grand*100;
      return '<div class="stack-seg" title="'+escapeHtml(c)+': '+fmtEur(totals[c])+'" style="flex-basis:'+pct+'%;background:'+categoryColor(c)+'"></div>';
    }).join("");

    legend.innerHTML = cats.slice().sort(function(a,b){ return totals[b]-totals[a]; }).map(function(c){
      var pct = Math.round(totals[c]/grand*100);
      return '<div class="cat-legend-row">' +
        '<span class="dot" style="background:'+categoryColor(c)+'"></span>' +
        '<span class="name">'+escapeHtml(c)+'</span>' +
        '<span class="pct">'+pct+'%</span>' +
        '<span class="amt num">'+fmtEur(totals[c])+'</span>' +
        '</div>';
    }).join("");
  }

  function renderEmergCard(){
    var total = emergTotalMonth(currentMonth);
    var target = currentEmergObjetivo();
    var pct = target > 0 ? (total/target*100) : (total>0?100:0);
    var fill = document.getElementById("emergProgressFill");
    fill.style.width = clamp(pct,0,100) + "%";
    fill.className = "progress-fill emerg" + (total > target && target > 0 ? " over" : "");
    document.getElementById("emergProgressText").textContent = fmtEur(total) + " / " + fmtEur(target);
    document.getElementById("emergProgressPct").textContent = Math.round(pct) + "%";

    document.getElementById("emergFundTotal").textContent = fmtEur(emergFundTotal());

    var list = document.getElementById("emergEntries");
    var entries = emergEntriesForMonth(currentMonth).slice().sort(function(a,b){ return b.fecha.localeCompare(a.fecha); });
    if (entries.length === 0){
      list.innerHTML = '<div class="empty-note">Todavía no has añadido nada al fondo este mes.</div>';
    } else {
      list.innerHTML = entries.map(function(e){
        return '<div class="entry-row">' +
          '<span class="dot emerg" style="background:var(--emerg)"></span>' +
          '<span class="entry-cat"><span class="name">'+escapeHtml(e.categoria || "Aportación")+'</span>' +
          (e.origen ? '<span class="note"> · de '+escapeHtml(origenLabel(e.origen))+'</span>' : '') +
          (e.nota ? '<span class="note"> · '+escapeHtml(e.nota)+'</span>' : '') + '</span>' +
          '<span class="entry-amt num">'+fmtEur(e.cantidad)+'</span>' +
          '<button class="entry-del" data-del-emerg="'+e.id+'" aria-label="Eliminar">✕</button>' +
          '</div>';
      }).join("");
    }
    var retirosMes = ventasDe("fondo", currentMonth);
    if (retirosMes.length) list.innerHTML += retirosMes.map(ventaRow).join("");
    fillSelect(document.getElementById("emergCat"), state.fondoCategorias || [], true);
    fillSelect(document.getElementById("withdrawCat"), state.fondoCategorias || [], false);
    document.getElementById("fondoCatChips").innerHTML = (state.fondoCategorias || []).map(function(c){
      return '<span class="cat-chip"><span>' + escapeHtml(c) + '</span><button type="button" data-del-fcat="' + escapeHtml(c) + '" aria-label="Eliminar" title="Eliminar">✕</button></span>';
    }).join("");
    if (!(state.fondoCategorias || []).length) document.getElementById("emergNewCatRow").classList.add("show");
    renderFondoBreakdown();
    renderMetas();
    renderCobertura();
  }

  // ---------- meses de emergencia cubiertos ----------
  function renderCobertura(){
    var g = state.gastosMensuales, meta = state.mesesMeta || 6, fondo = Math.max(0, emergFundTotal());
    var gi = document.getElementById("gastosInput"), mi = document.getElementById("mesesMetaInput");
    if (document.activeElement !== gi) gi.value = g ? g : "";
    if (document.activeElement !== mi) mi.value = meta;
    var box = document.getElementById("cobertura");
    if (!g || g <= 0){ box.innerHTML = '<div class="empty-note">Escribe cuánto gastas al mes y te diremos cuántos meses podrías vivir con tu fondo.</div>'; return; }
    var meses = fondo / g, objetivo = g * meta, pct = clamp(meses / meta * 100, 0, 100);
    var texto = meses >= meta ? "¡Meta cumplida! Tu fondo cubre tus gastos de " + meta + " meses."
      : "Te faltan " + fmtEur(objetivo - fondo) + " para cubrir " + meta + " meses.";
    box.innerHTML = '<div class="meta-top"><span class="cob-big num">' + meses.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + ' meses</span>' +
      '<span class="num">' + fmtEur(fondo) + ' / ' + fmtEur(objetivo) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill emerg' + (meses >= meta ? " done" : "") + '" style="width:' + pct + '%"></div></div>' +
      '<div class="meta-info">' + texto + '</div>';
  }

  // ---------- aportación automática (plan mensual) ----------
  function planTotal(){ return sum(state.plan || [], "cantidad"); }
  function planHecho(mes){
    var f = function(e){ return e.mes === mes && e.plan; };
    return state.entries.some(f) || state.emergEntries.some(f);
  }
  function renderPlan(){
    var items = state.plan || [];
    fillOrigenSelect(document.getElementById("planOrigen"));
    document.getElementById("planTotalLabel").textContent = items.length ? fmtEur(planTotal()) + "/mes" : "";
    document.getElementById("planItems").innerHTML = items.length ? items.map(function(it){
      var color = it.tipo === "invest" ? categoryColor(it.categoria) : "var(--emerg)";
      return '<div class="entry-row"><span class="dot" style="background:' + color + '"></span>' +
        '<span class="entry-cat"><span class="name">' + escapeHtml(it.categoria) + '</span><span class="note"> · ' + (it.tipo === "invest" ? "Inversión" : "Fondo") + '</span></span>' +
        '<span class="entry-amt num">' + fmtEur(it.cantidad) + '</span>' +
        '<button class="entry-del" data-del-plan="' + it.id + '" aria-label="Eliminar">✕</button></div>';
    }).join("") : '<div class="empty-note">Añade lo que quieres apartar cada mes, por ejemplo 200 € a ETF y 100 € a Imprevistos.</div>';
    var tipo = document.getElementById("planTipo").value;
    fillSelect(document.getElementById("planCat"), tipo === "invest" ? state.categorias : (state.fondoCategorias || []), false, "crea antes una categoría");
    var btn = document.getElementById("planApplyBtn"), hecho = planHecho(currentMonth);
    btn.disabled = !items.length || !!hecho;
    btn.textContent = hecho ? "Plan de este mes ya registrado ✓" : "Registrar el plan de este mes (" + fmtEur(planTotal()) + ")";
    document.getElementById("planOrigen").hidden = !items.length || !!hecho;
  }

  // ---------- simulador de interés compuesto ----------
  function simDatos(){
    var sv = state.sim || {};
    var mediaAporte = (function(){
      var meses = allMonthsWithData().filter(function(m){ return investTotalMonth(m) > 0; });
      return meses.length ? Math.round(sum(state.entries, "cantidad") / meses.length) : 0;
    })();
    return {
      inicial: sv.inicial != null ? sv.inicial : Math.round(totalValorInv()),
      aporte: sv.aporte != null ? sv.aporte : (state.investObjetivo || mediaAporte || 100),
      rent: sv.rent != null ? sv.rent : 5,
      anos: sv.anos != null ? sv.anos : 10
    };
  }
  function simular(d){
    var r = Math.pow(1 + d.rent / 100, 1 / 12) - 1, v = d.inicial, puntos = [{ ano: 0, valor: v, aportado: d.inicial }];
    for (var m = 1; m <= d.anos * 12; m++){
      v = v * (1 + r) + d.aporte;
      if (m % 12 === 0) puntos.push({ ano: m / 12, valor: v, aportado: d.inicial + d.aporte * m });
    }
    return puntos;
  }
  function renderSim(){
    var d = simDatos();
    [["simInicial", d.inicial], ["simAporte", d.aporte], ["simRent", d.rent], ["simAnos", d.anos]].forEach(function(x){
      var el = document.getElementById(x[0]); if (document.activeElement !== el) el.value = x[1];
    });
    var pts = simular(d), fin = pts[pts.length - 1];
    document.getElementById("simFinal").textContent = fmtEur(fin.valor);
    document.getElementById("simAportado").textContent = fmtEur(fin.aportado);
    document.getElementById("simIntereses").textContent = "+" + fmtEur(Math.max(0, fin.valor - fin.aportado));
    document.getElementById("simHeadLabel").textContent = fmtEur(fin.valor) + " en " + d.anos + " años";
    var svg = document.getElementById("simChart");
    var W = 800, H = 220, padL = 64, padR = 16, padT = 14, padB = 30, plotW = W - padL - padR, plotH = H - padT - padB;
    var maxV = Math.max(1, fin.valor) * 1.1, n = pts.length;
    var x = function(i){ return padL + (n <= 1 ? plotW / 2 : plotW * i / (n - 1)); };
    var y = function(v){ return padT + plotH - v / maxV * plotH; };
    var parts = [];
    for (var s2 = 0; s2 <= 4; s2++){
      var gv = maxV / 4 * s2, gy = y(gv);
      parts.push('<line class="gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"/>');
      parts.push('<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + Math.round(gv).toLocaleString("es-ES") + '</text>');
    }
    var area = function(key){ return 'M' + x(0) + ',' + y(0) + ' ' + pts.map(function(p, i){ return 'L' + x(i) + ',' + y(p[key]); }).join(' ') + ' L' + x(n - 1) + ',' + y(0) + ' Z'; };
    parts.push('<path d="' + area("valor") + '" fill="var(--good)" opacity="0.22"/>');
    parts.push('<path d="' + area("aportado") + '" fill="var(--accent)" opacity="0.35"/>');
    parts.push('<polyline fill="none" stroke="var(--good)" stroke-width="2.5" points="' + pts.map(function(p, i){ return x(i) + ',' + y(p.valor); }).join(' ') + '"/>');
    var cada = Math.max(1, Math.ceil(n / 10));
    pts.forEach(function(p, i){ if (i % cada === 0 || i === n - 1) parts.push('<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + p.ano + '</text>'); });
    parts.push('<circle cx="' + x(n - 1) + '" cy="' + y(fin.valor) + '" r="4.5" fill="var(--good)"/>');
    svg.innerHTML = parts.join("");
  }

  // ---------- metas de ahorro (por categoría del fondo) ----------
  function fondoCatSaldo(cat){
    return sum(state.emergEntries.filter(function(e){ return (e.categoria || "") === cat; }), "cantidad") -
           sum(ventasDe("fondo").filter(function(v){ return (v.categoria || "") === cat; }), "cantidad");
  }
  function mesesHasta(fecha){
    var a = todayMonthKey().split("-"), b = fecha.split("-");
    return (parseInt(b[0],10) * 12 + parseInt(b[1],10)) - (parseInt(a[0],10) * 12 + parseInt(a[1],10)) + 1;
  }
  function renderMetas(){
    var metas = state.metas || {};
    var cats = Object.keys(metas).filter(function(c){ return metas[c] && metas[c].objetivo > 0; });
    var list = document.getElementById("metasList");
    list.innerHTML = cats.length ? cats.map(function(c){
      var m = metas[c], tiene = Math.max(0, fondoCatSaldo(c)), falta = m.objetivo - tiene;
      var pct = clamp(tiene / m.objetivo * 100, 0, 100), info;
      if (falta <= 0) info = "¡Meta conseguida!";
      else if (m.fecha){
        var n = mesesHasta(m.fecha);
        info = n >= 1 ? "Aparta " + fmtEur(Math.ceil(falta / n)) + "/mes hasta " + monthKeyToLabel(m.fecha) : "Fecha pasada · faltan " + fmtEur(falta);
      } else info = "Faltan " + fmtEur(falta);
      return '<div class="meta-row">' +
        '<div class="meta-top"><span class="name">' + escapeHtml(c) + '</span>' +
        '<span class="num">' + fmtEur(tiene) + ' / ' + fmtEur(m.objetivo) + '</span>' +
        '<button class="entry-del" data-del-meta="' + escapeHtml(c) + '" aria-label="Eliminar">✕</button></div>' +
        '<div class="progress-track"><div class="progress-fill emerg' + (falta <= 0 ? " done" : "") + '" style="width:' + pct + '%"></div></div>' +
        '<div class="meta-info">' + info + '</div>' +
      '</div>';
    }).join("") : '<div class="empty-note">Aún no tienes metas. Por ejemplo: Viajes, 1.500 € para junio.</div>';
    fillSelect(document.getElementById("metaCat"), state.fondoCategorias || [], false, "crea antes una categoría");
  }

  function renderHistory(){
    var months = allMonthsWithData().slice(-12); // last 12 with data / current
    var target = 0; // ya no hay objetivo mensual

    // table
    var body = document.getElementById("historyBody");
    body.innerHTML = months.slice().reverse().map(function(m){
      var inv = investTotalMonth(m), em = emergTotalMonth(m), tot = inv+em;
      var ok = target > 0 ? (tot >= target) : (tot > 0);
      return '<tr>' +
        '<td style="text-transform:capitalize">'+monthKeyToLabel(m)+'</td>' +
        '<td class="num">'+fmtEur(inv)+'</td>' +
        '<td class="num">'+fmtEur(em)+'</td>' +
        '<td class="num"><b>'+fmtEur(tot)+'</b></td>' +
        '</tr>';
    }).join("");

    renderTrendChart(months, target);
    renderCumulative();
    renderMoney();
  }

  function renderTrendChart(months, target){
    var svg = document.getElementById("trendChart");
    var W = 800, H = 220, padL = 40, padR = 16, padT = 14, padB = 30;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var maxVal = Math.max(target, 1);
    months.forEach(function(m){ maxVal = Math.max(maxVal, investTotalMonth(m)+emergTotalMonth(m)); });
    maxVal = maxVal * 1.15;

    var n = Math.max(months.length, 1);
    var slot = plotW / n;
    var barW = Math.min(34, slot * 0.5);

    var yScale = function(v){ return padT + plotH - (v/maxVal*plotH); };

    var parts = [];

    // gridlines (4)
    var steps = 4;
    for (var i=0;i<=steps;i++){
      var v = maxVal/steps*i;
      var y = yScale(v);
      parts.push('<line class="gridline" x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y+'" y2="'+y+'"/>');
      parts.push('<text x="'+(padL-6)+'" y="'+(y+3)+'" text-anchor="end">'+Math.round(v)+'</text>');
    }

    // target line
    if (target > 0){
      var ty = yScale(target);
      parts.push('<line class="target-line" x1="'+padL+'" x2="'+(W-padR)+'" y1="'+ty+'" y2="'+ty+'"/>');
      parts.push('<text x="'+(W-padR)+'" y="'+(ty-4)+'" text-anchor="end" style="fill:var(--ink-mute)">objetivo</text>');
    }

    months.forEach(function(m, i){
      var cx = padL + slot*i + slot/2;
      var inv = investTotalMonth(m), em = emergTotalMonth(m);
      var x = cx - barW/2;

      var yInvTop = yScale(inv);
      var hInv = (padT+plotH) - yInvTop;
      if (hInv > 0){
        parts.push('<rect class="bar-seg" data-tip-month="'+m+'" x="'+x+'" y="'+yInvTop+'" width="'+barW+'" height="'+hInv+'" rx="3" fill="var(--accent)"></rect>');
      }
      var yEmTop = yScale(inv+em) ;
      var hEm = yInvTop - yEmTop - (hInv>0?2:0);
      if (hEm > 0){
        parts.push('<rect class="bar-seg" data-tip-month="'+m+'" x="'+x+'" y="'+yEmTop+'" width="'+barW+'" height="'+hEm+'" rx="3" fill="var(--emerg)"></rect>');
      }

      var lbl = monthKeyToLabel(m).slice(0,3).toUpperCase();
      parts.push('<text x="'+cx+'" y="'+(H-10)+'" text-anchor="middle">'+lbl+'</text>');
    });

    svg.innerHTML = parts.join("");

    // hover tooltip
    var tip = document.getElementById("tip");
    svg.querySelectorAll("[data-tip-month]").forEach(function(el){
      el.addEventListener("mousemove", function(ev){
        var m = el.getAttribute("data-tip-month");
        var inv = investTotalMonth(m), em = emergTotalMonth(m);
        tip.innerHTML =
          '<div style="font-weight:600;margin-bottom:3px;text-transform:capitalize">'+monthKeyToLabel(m)+'</div>' +
          '<div class="row"><span class="dot" style="background:var(--accent)"></span>Inversión <b>'+fmtEur(inv)+'</b></div>' +
          '<div class="row"><span class="dot" style="background:var(--emerg)"></span>Fondo <b>'+fmtEur(em)+'</b></div>';
        tip.style.left = ev.clientX + "px";
        tip.style.top = ev.clientY + "px";
        tip.classList.add("show");
      });
      el.addEventListener("mouseleave", function(){ tip.classList.remove("show"); });
    });
  }

  function renderCumulative(){
    var svg = document.getElementById("cumChart");
    if (!svg) return;
    var keys = allMonthsWithData();
    var months = [];
    for (var mk = keys[0]; mk <= keys[keys.length - 1] && months.length < 240; mk = addMonths(mk, 1)) months.push(mk);
    var accInv = 0, accFon = 0;
    var pts = months.map(function(m){
      accInv += investTotalMonth(m) - sum(ventasDe("invest", m), "cantidad");
      accFon += emergTotalMonth(m) - sum(ventasDe("fondo", m), "cantidad");
      return { m: m, inv: accInv, fon: accFon, tot: accInv + accFon };
    });
    var totInv = investTotalAll(), totFon = emergFundTotal();
    document.getElementById("cumInvest").textContent = fmtEur(totInv);
    document.getElementById("cumFondo").textContent = fmtEur(totFon);
    document.getElementById("cumTotal").textContent = fmtEur(totInv + totFon);
    document.getElementById("cumTotalLabel").textContent = fmtEur(totInv + totFon);
    var W = 800, H = 220, padL = 48, padR = 16, padT = 14, padB = 30;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxVal = 1, minVal = 0;
    pts.forEach(function(p){ maxVal = Math.max(maxVal, p.tot, p.inv, p.fon); minVal = Math.min(minVal, p.tot, p.inv, p.fon); });
    maxVal = maxVal * 1.15;
    var n = pts.length;
    var xAt = function(i){ return n <= 1 ? padL + plotW / 2 : padL + plotW * i / (n - 1); };
    var yAt = function(v){ return padT + plotH - ((v - minVal) / (maxVal - minVal) * plotH); };
    var parts = [];
    for (var s = 0; s <= 4; s++){
      var gv = minVal + (maxVal - minVal) / 4 * s, gy = yAt(gv);
      parts.push('<line class="gridline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '"/>');
      parts.push('<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + Math.round(gv) + '</text>');
    }
    function linea(key, color, width){
      return '<polyline fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linejoin="round" stroke-linecap="round" points="' +
        pts.map(function(p, i){ return xAt(i) + ',' + yAt(p[key]); }).join(' ') + '"/>';
    }
    if (n > 1){
      var area = 'M' + xAt(0) + ',' + yAt(0) + ' ' + pts.map(function(p, i){ return 'L' + xAt(i) + ',' + yAt(p.tot); }).join(' ') + ' L' + xAt(n - 1) + ',' + yAt(0) + ' Z';
      parts.push('<path d="' + area + '" fill="var(--ink)" opacity="0.06"/>');
      parts.push(linea("inv", "var(--accent)", 2));
      parts.push(linea("fon", "var(--emerg)", 2));
      parts.push(linea("tot", "var(--ink)", 3));
    }
    var every = Math.max(1, Math.ceil(n / 12));
    var slotW = plotW / Math.max(n, 1);
    pts.forEach(function(p, i){
      if (i % every === 0 || i === n - 1) parts.push('<text x="' + xAt(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + monthKeyToLabel(p.m).slice(0,3).toUpperCase() + '</text>');
      parts.push('<circle cx="' + xAt(i) + '" cy="' + yAt(p.tot) + '" r="4" fill="var(--ink)"/>');
      parts.push('<rect data-cum="' + i + '" x="' + (xAt(i) - slotW / 2) + '" y="' + padT + '" width="' + slotW + '" height="' + plotH + '" fill="transparent"/>');
    });
    svg.innerHTML = parts.join("");
    var tip = document.getElementById("tip");
    svg.querySelectorAll("[data-cum]").forEach(function(el){
      el.addEventListener("mousemove", function(ev){
        var p = pts[+el.getAttribute("data-cum")];
        tip.innerHTML =
          '<div style="font-weight:600;margin-bottom:3px;text-transform:capitalize">' + monthKeyToLabel(p.m) + '</div>' +
          '<div class="row"><span class="dot" style="background:var(--accent)"></span>Inversión <b>' + fmtEur(p.inv) + '</b></div>' +
          '<div class="row"><span class="dot" style="background:var(--emerg)"></span>Fondo <b>' + fmtEur(p.fon) + '</b></div>' +
          '<div class="row"><span class="dot" style="background:var(--ink)"></span>Total <b>' + fmtEur(p.tot) + '</b></div>';
        tip.style.left = ev.clientX + "px";
        tip.style.top = ev.clientY + "px";
        tip.classList.add("show");
      });
      el.addEventListener("mouseleave", function(){ tip.classList.remove("show"); });
    });
  }
  var fondoScope = "all";
  function renderFondoBreakdown(){
    var bar = document.getElementById("fondoStackBar"), legend = document.getElementById("fondoLegend");
    if (!bar) return;
    var mes = fondoScope === "month" ? currentMonth : null;
    var SIN = "Sin categoría";
    var cats = (state.fondoCategorias || []).slice();
    var totals = {};
    (mes ? emergEntriesForMonth(mes) : state.emergEntries).forEach(function(e){
      var c = e.categoria || SIN;
      if (cats.indexOf(c) < 0) cats.push(c);
      totals[c] = (totals[c] || 0) + e.cantidad;
    });
    ventasDe("fondo", mes).forEach(function(v){
      var c = v.categoria || SIN;
      if (cats.indexOf(c) < 0) cats.push(c);
      totals[c] = (totals[c] || 0) - v.cantidad;
    });
    var color = function(c){ return "var(" + CAT_COLORS[cats.indexOf(c) % CAT_COLORS.length] + ")"; };
    var shown = cats.filter(function(c){ return (totals[c] || 0) !== 0; });
    var pos = shown.filter(function(c){ return totals[c] > 0; });
    var grand = pos.reduce(function(a, c){ return a + totals[c]; }, 0);
    var vacio = '<div style="flex:1;background:var(--surface-2);border-radius:6px"></div>';
    if (!shown.length){
      bar.innerHTML = vacio;
      legend.innerHTML = '<div class="empty-note">Sin datos todavía.</div>';
      return;
    }
    bar.innerHTML = grand > 0 ? pos.map(function(c){
      return '<div class="stack-seg" title="' + escapeHtml(c) + ': ' + fmtEur(totals[c]) + '" style="flex-basis:' + (totals[c] / grand * 100) + '%;background:' + color(c) + '"></div>';
    }).join("") : vacio;
    legend.innerHTML = shown.sort(function(a, b){ return totals[b] - totals[a]; }).map(function(c){
      var pct = grand > 0 && totals[c] > 0 ? Math.round(totals[c] / grand * 100) + "%" : "";
      return '<div class="cat-legend-row">' +
        '<span class="dot" style="background:' + color(c) + '"></span>' +
        '<span class="name">' + escapeHtml(c) + '</span>' +
        '<span class="pct">' + pct + '</span>' +
        '<span class="amt num">' + fmtEur(totals[c]) + '</span>' +
      '</div>';
    }).join("");
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }

  function showLimitMsg(id, text){
    var el = document.getElementById(id);
    el.textContent = text;
    el.hidden = false;
  }
  function hideLimitMsg(id){
    var el = document.getElementById(id);
    el.hidden = true;
  }

  // ---------- events ----------
  document.getElementById("prevMonth").addEventListener("click", function(){
    currentMonth = addMonths(currentMonth, -1); render();
  });
  document.getElementById("nextMonth").addEventListener("click", function(){
    currentMonth = addMonths(currentMonth, 1); render();
  });
  document.getElementById("gotoToday").addEventListener("click", function(){
    currentMonth = todayMonthKey(); render();
  });

  document.getElementById("totalInput").addEventListener("input", function(){
    var v = parseFloat(this.value);
    if (isNaN(v) || v < 0) return;
    state.totalMensual = v;
    if (state.investObjetivo > v) state.investObjetivo = v;
    saveState(); renderHero(); renderInvestCard(); renderEmergCard(); renderHistory();
  });
  document.getElementById("splitSlider").addEventListener("input", function(){
    state.investObjetivo = parseFloat(this.value);
    saveState(); renderHero(); renderInvestCard(); renderEmergCard();
  });

  document.getElementById("investCat").addEventListener("change", function(){
    var row = document.getElementById("newCatRow");
    if (this.value === "__nueva__"){ row.classList.add("show"); document.getElementById("newCatInput").focus(); }
    else { row.classList.remove("show"); }
  });
  document.getElementById("newCatConfirm").addEventListener("click", function(){
    addNewCategory();
  });
  document.getElementById("newCatInput").addEventListener("keydown", function(e){
    if (e.key === "Enter"){ e.preventDefault(); addNewCategory(); }
  });
  function addNewCategory(){
    var input = document.getElementById("newCatInput");
    var name = input.value.trim();
    if (!name) return;
    if (state.categorias.indexOf(name) < 0) state.categorias.push(name);
    input.value = "";
    document.getElementById("newCatRow").classList.remove("show");
    saveState();
    renderInvestCard();
    document.getElementById("investCat").value = name;
  }

  document.getElementById("investForm").addEventListener("submit", function(e){
    e.preventDefault();
    var catSel = document.getElementById("investCat");
    var cat = catSel.value;
    if (cat === "__nueva__"){ addNewCategory(); cat = document.getElementById("investCat").value; if (cat === "__nueva__") return; }
    var amtInput = document.getElementById("investAmt");
    var amt = parseFloat(amtInput.value);
    if (isNaN(amt) || amt <= 0) return;

    var origen = document.getElementById("investOrigen").value;
    var falta = faltaDinero(origen, amt);
    if (falta){ showLimitMsg("investLimitMsg", falta); return; }
    hideLimitMsg("investLimitMsg");

    var note = document.getElementById("investNote").value.trim();
    aplicarSalidaCuenta(origen, -amt);
    var entryId = uid();
    var nuevaEntrada = { id: entryId, mes: currentMonth, categoria: cat, cantidad: amt, nota: note, origen: origen, fecha: new Date().toISOString() };
    if (origen === ORIGEN_FONDO){
      // Traspaso: sale del Fondo (retiro enlazado) y entra en Inversión
      var ventaId = uid();
      nuevaEntrada.ventaId = ventaId;
      state.ventas = state.ventas || [];
      state.ventas.push({ id: ventaId, mes: currentMonth, tipo: "fondo", categoria: CAT_TRASPASO, cantidad: amt, nota: "a " + cat + (note ? " · " + note : ""), entryId: entryId, fecha: nuevaEntrada.fecha });
    }
    state.entries.push(nuevaEntrada);
    saveState();
    amtInput.value = ""; document.getElementById("investNote").value = "";
    renderInvestCard(); renderEmergCard(); renderHero(); renderHistory();
  });

  document.getElementById("emergForm").addEventListener("submit", function(e){
    e.preventDefault();
    var amtInput = document.getElementById("emergAmt");
    var amt = parseFloat(amtInput.value);
    if (isNaN(amt) || amt <= 0) return;

    var origen = document.getElementById("emergOrigen").value;
    var falta = faltaDinero(origen, amt);
    if (falta){ showLimitMsg("emergLimitMsg", falta); return; }
    hideLimitMsg("emergLimitMsg");

    var note = document.getElementById("emergNote").value.trim();
    aplicarSalidaCuenta(origen, -amt);
    state.emergEntries.push({ id: uid(), mes: currentMonth, categoria: fondoCatSeleccionada(), cantidad: amt, nota: note, origen: origen, fecha: new Date().toISOString() });
    saveState();
    amtInput.value = ""; document.getElementById("emergNote").value = "";
    renderEmergCard(); renderHistory();
  });

  document.getElementById("investEntries").addEventListener("click", function(e){
    var id = e.target.getAttribute("data-del-invest");
    if (!id) return;
    state.entries.forEach(function(x){ if (x.id === id) aplicarSalidaCuenta(x.origen, x.cantidad); });
    state.entries = state.entries.filter(function(x){ return x.id !== id; });
    // Si era un traspaso desde el Fondo, el dinero vuelve al Fondo
    state.ventas = (state.ventas || []).filter(function(v){ return v.entryId !== id; });
    saveState(); renderInvestCard(); renderEmergCard(); renderHero(); renderHistory();
  });
  document.getElementById("emergEntries").addEventListener("click", function(e){
    var id = e.target.getAttribute("data-del-emerg");
    if (!id) return;
    state.emergEntries.forEach(function(x){ if (x.id === id) aplicarSalidaCuenta(x.origen, x.cantidad); });
    state.emergEntries = state.emergEntries.filter(function(x){ return x.id !== id; });
    saveState(); renderEmergCard(); renderHistory();
  });

  document.querySelectorAll(".breakdown-toggle button").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".breakdown-toggle button").forEach(function(b){ b.classList.remove("active"); });
      btn.classList.add("active");
      breakdownScope = btn.getAttribute("data-scope");
      renderCategoryBreakdown();
    });
  });

  // ---- Fondo: en qué lo gastarás ----
    function fondoCatSeleccionada(){
      var c = document.getElementById("emergCat").value;
      if (c === "__nueva__"){ addFondoCategory(); c = document.getElementById("emergCat").value; }
      return c === "__nueva__" ? "" : c;
    }
    function addFondoCategory(){
      var input = document.getElementById("emergNewCatInput");
      var name = input.value.trim();
      if (!name) return;
      state.fondoCategorias = state.fondoCategorias || [];
      if (state.fondoCategorias.indexOf(name) < 0) state.fondoCategorias.push(name);
      input.value = "";
      document.getElementById("emergNewCatRow").classList.remove("show");
      saveState();
      renderEmergCard();
      document.getElementById("emergCat").value = name;
    }
    document.getElementById("emergCat").addEventListener("change", function(){
      var row = document.getElementById("emergNewCatRow");
      if (this.value === "__nueva__"){ row.classList.add("show"); document.getElementById("emergNewCatInput").focus(); }
      else { row.classList.remove("show"); }
    });
    document.getElementById("emergNewCatConfirm").addEventListener("click", addFondoCategory);
    document.getElementById("fondoCatChips").addEventListener("click", function(e){
      var c = e.target.getAttribute("data-del-fcat");
      if (c == null) return;
      pedirConfirmacion(c, function(){
        state.fondoCategorias = (state.fondoCategorias || []).filter(function(x){ return x !== c; });
        saveState();
        renderEmergCard();
      });
    });
    function pedirConfirmacion(nombre, alConfirmar){
      var modal = document.getElementById("confirmModal");
      document.getElementById("confirmText").textContent = "¿Estás seguro de que quieres eliminar «" + nombre + "»?";
      modal.hidden = false;
      document.getElementById("confirmNo").focus();
      function cerrar(){ modal.hidden = true; document.removeEventListener("keydown", onKey); }
      function onKey(ev){ if (ev.key === "Escape") cerrar(); }
      document.getElementById("confirmNo").onclick = cerrar;
      modal.onclick = function(ev){ if (ev.target === modal) cerrar(); };
      document.getElementById("confirmYes").onclick = function(){ cerrar(); alConfirmar(); };
      document.addEventListener("keydown", onKey);
    }
    // ---- Meses de emergencia ----
    document.getElementById("gastosInput").addEventListener("input", function(){
      var v = this.value === "" ? null : parseFloat(this.value);
      if (v != null && (isNaN(v) || v < 0)) return;
      state.gastosMensuales = v; saveState(); renderCobertura();
    });
    document.getElementById("mesesMetaInput").addEventListener("input", function(){
      var v = parseInt(this.value, 10);
      if (isNaN(v) || v < 1 || v > 24) return;
      state.mesesMeta = v; saveState(); renderCobertura();
    });
    // ---- Simulador ----
    ["simInicial", "simAporte", "simRent", "simAnos"].forEach(function(id){
      document.getElementById(id).addEventListener("input", function(){
        var v = parseFloat(this.value);
        var lim = { simInicial: 1e9, simAporte: 1e7, simRent: 30, simAnos: 60 }[id];
        if (isNaN(v) || v < 0 || v > lim || (id === "simAnos" && v < 1)) return;
        var d = simDatos();
        d[{ simInicial: "inicial", simAporte: "aporte", simRent: "rent", simAnos: "anos" }[id]] = id === "simAnos" ? Math.round(v) : v;
        state.sim = d; saveState(); renderSim();
      });
    });
    // ---- Aportación automática ----
    document.getElementById("planTipo").addEventListener("change", renderPlan);
    document.getElementById("planForm").addEventListener("submit", function(e){
      e.preventDefault();
      var tipo = document.getElementById("planTipo").value, cat = document.getElementById("planCat").value;
      var amt = parseFloat(document.getElementById("planAmt").value);
      if (!cat || isNaN(amt) || amt <= 0) return;
      state.plan = state.plan || [];
      var ya = state.plan.filter(function(p){ return p.tipo === tipo && p.categoria === cat; })[0];
      if (ya) ya.cantidad = amt; else state.plan.push({ id: uid(), tipo: tipo, categoria: cat, cantidad: amt });
      document.getElementById("planAmt").value = "";
      saveState(); renderPlan();
    });
    document.getElementById("planItems").addEventListener("click", function(e){
      var id = e.target.getAttribute("data-del-plan");
      if (!id) return;
      state.plan = (state.plan || []).filter(function(p){ return p.id !== id; });
      saveState(); renderPlan();
    });
    document.getElementById("planApplyBtn").addEventListener("click", function(){
      var items = state.plan || [];
      if (!items.length || planHecho(currentMonth)) return;
      var origen = document.getElementById("planOrigen").value, total = planTotal();
      var falta = faltaDinero(origen, total);
      if (falta){ showLimitMsg("planMsg", falta); return; }
      hideLimitMsg("planMsg");
      var fecha = new Date().toISOString();
      items.forEach(function(it){
        var e2 = { id: uid(), mes: currentMonth, categoria: it.categoria, cantidad: it.cantidad, nota: "Plan mensual", origen: origen, fecha: fecha, plan: true };
        if (it.tipo === "invest") state.entries.push(e2); else state.emergEntries.push(e2);
      });
      aplicarSalidaCuenta(origen, -total);
      saveState(); render();
    });
    document.getElementById("metaForm").addEventListener("submit", function(e){
      e.preventDefault();
      var cat = document.getElementById("metaCat").value;
      var amt = parseFloat(document.getElementById("metaAmt").value);
      var fecha = document.getElementById("metaFecha").value;
      if (!cat || isNaN(amt) || amt <= 0) return;
      if (fecha && !/^\d{4}-\d{2}$/.test(fecha)) fecha = "";
      state.metas = state.metas || {};
      state.metas[cat] = { objetivo: amt, fecha: fecha || null };
      document.getElementById("metaAmt").value = ""; document.getElementById("metaFecha").value = "";
      saveState(); renderMetas();
    });
    document.getElementById("metasList").addEventListener("click", function(e){
      var c = e.target.getAttribute("data-del-meta");
      if (c == null) return;
      pedirConfirmacion(c, function(){
        if (state.metas) delete state.metas[c];
        saveState(); renderMetas();
      });
    });
    document.getElementById("emergNewCatInput").addEventListener("keydown", function(e){
      if (e.key === "Enter"){ e.preventDefault(); addFondoCategory(); }
    });
    // ---- Vender inversiones / sacar del fondo ----
    document.getElementById("sellToggle").addEventListener("click", function(){
      var f = document.getElementById("sellForm"); f.hidden = !f.hidden; hideLimitMsg("sellMsg");
    });
    document.getElementById("withdrawToggle").addEventListener("click", function(){
      var f = document.getElementById("withdrawForm"); f.hidden = !f.hidden; hideLimitMsg("withdrawMsg");
    });
    document.getElementById("sellForm").addEventListener("submit", function(e){
      e.preventDefault();
      var cat = document.getElementById("sellCat").value;
      var amt = parseFloat(document.getElementById("sellAmt").value);
      if (!cat){ showLimitMsg("sellMsg", "No tienes inversiones que vender."); return; }
      if (isNaN(amt) || amt <= 0) return;
      var disponible = investHolding(cat);
      if (amt > disponible + 0.001){ showLimitMsg("sellMsg", "Solo tienes " + fmtEur(disponible) + " en " + cat + "."); return; }
      hideLimitMsg("sellMsg");
      state.ventas = state.ventas || [];
      state.ventas.push({ id: uid(), mes: currentMonth, tipo: "invest", categoria: cat, cantidad: amt, nota: document.getElementById("sellNote").value.trim(), fecha: new Date().toISOString() });
      saveState();
      document.getElementById("sellAmt").value = ""; document.getElementById("sellNote").value = "";
      document.getElementById("sellForm").hidden = true;
      renderInvestCard(); renderHistory();
    });
    document.getElementById("withdrawForm").addEventListener("submit", function(e){
      e.preventDefault();
      var cat = document.getElementById("withdrawCat").value;
      var amt = parseFloat(document.getElementById("withdrawAmt").value);
      if (isNaN(amt) || amt <= 0) return;
      var disponible = emergFundTotal();
      if (amt > disponible + 0.001){ showLimitMsg("withdrawMsg", "En el fondo solo hay " + fmtEur(disponible) + "."); return; }
      hideLimitMsg("withdrawMsg");
      state.ventas = state.ventas || [];
      state.ventas.push({ id: uid(), mes: currentMonth, tipo: "fondo", categoria: cat, cantidad: amt, nota: document.getElementById("withdrawNote").value.trim(), fecha: new Date().toISOString() });
      saveState();
      document.getElementById("withdrawAmt").value = ""; document.getElementById("withdrawNote").value = "";
      document.getElementById("withdrawForm").hidden = true;
      renderEmergCard(); renderHistory();
    });
    ["investEntries", "emergEntries"].forEach(function(listId){
      document.getElementById(listId).addEventListener("click", function(e){
        var vid = e.target.getAttribute("data-del-venta");
        if (!vid) return;
        state.ventas = (state.ventas || []).filter(function(x){ return x.id !== vid; });
        // Si el retiro era un traspaso a Inversión, se borra también la inversión enlazada
        state.entries = state.entries.filter(function(x){ return x.ventaId !== vid; });
        saveState(); renderInvestCard(); renderEmergCard(); renderHistory();
      });
    });
    document.querySelectorAll("#fondoScopeToggle button").forEach(function(b){
      b.addEventListener("click", function(){
        document.querySelectorAll("#fondoScopeToggle button").forEach(function(x){ x.classList.remove("active"); });
        b.classList.add("active");
        fondoScope = b.getAttribute("data-fscope");
        renderFondoBreakdown();
      });
    });
    // ---- Plegables: Inversión, Fondo y Gráficos ----
    function prefGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
    function prefSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
    document.querySelectorAll(".card.fold").forEach(function(card){
      var head = card.querySelector(".fold-head");
      var key = "libroFold-" + card.id;
      function set(open){
        card.classList.toggle("collapsed", !open);
        head.setAttribute("aria-expanded", open ? "true" : "false");
      }
      set(prefGet(key) === "open");
      function toggle(){ var open = card.classList.contains("collapsed"); set(open); prefSet(key, open ? "open" : "closed"); }
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); } });
    });
    (function(){
      var btn = document.getElementById("chartsToggle");
      var label = btn.querySelector(".ct-text b");
      function set(open, scroll){
        document.querySelectorAll(".chart-card").forEach(function(c){ c.hidden = !open; });
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        label.textContent = open ? "Ocultar gráficos" : "Ver gráficos";
        if (open){ renderHistory(); if (scroll) document.getElementById("chartsStart").scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
      set(false, false);
      btn.addEventListener("click", function(){ set(btn.getAttribute("aria-expanded") !== "true", true); });
    })();
    document.getElementById("goalInput").addEventListener("input", function(){
      var v = this.value === "" ? 0 : parseFloat(this.value);
      if (isNaN(v) || v < 0) return;
      state.totalMensual = v;
      if (state.investObjetivo > v) state.investObjetivo = v;
      saveState(); renderGoal();
    });
    // ---- Tu dinero ----
    document.getElementById("saldoInput").addEventListener("input", function(){
      var v = this.value === "" ? null : parseFloat(this.value);
      if (v != null && (isNaN(v) || v < 0)) return;
      state.saldoCuenta = v;
      saveState(); renderMoney();
    });
    document.getElementById("invValues").addEventListener("change", function(e){
      var cat = e.target.getAttribute("data-valor-cat");
      if (!cat) return;
      var v = parseFloat(e.target.value);
      if (isNaN(v) || v < 0) return;
      state.valorInversiones = state.valorInversiones || {};
      state.valorInversiones[cat] = { valor: v, base: investHolding(cat), fecha: new Date().toISOString() };
      saveState(); e.target.blur(); renderMoney();
    });
    document.getElementById("invValues").addEventListener("keydown", function(e){
      if (e.key === "Enter" && e.target.getAttribute("data-valor-cat")) e.target.blur();
    });
    document.getElementById("invValues").addEventListener("focusout", function(){ setTimeout(renderMoney, 0); });
    document.getElementById("fijaForm").addEventListener("submit", function(e){
      e.preventDefault();
      var nombre = document.getElementById("fijaNombre").value.trim() || "Nómina";
      var amt = parseFloat(document.getElementById("fijaAmt").value);
      if (isNaN(amt) || amt <= 0) return;
      state.entradasFijas = state.entradasFijas || [];
      state.entradasFijas.push({ id: uid(), nombre: nombre, cantidad: amt, desde: currentMonth, hasta: null });
      document.getElementById("fijaNombre").value = ""; document.getElementById("fijaAmt").value = "";
      saveState(); renderMoney();
    });
    document.getElementById("fijasList").addEventListener("click", function(e){
      var id = e.target.getAttribute("data-del-fija");
      if (!id) return;
      var f = (state.entradasFijas || []).filter(function(x){ return x.id === id; })[0];
      if (!f) return;
      pedirConfirmacion(f.nombre, function(){
        // Deja de contar desde este mes; los meses anteriores se conservan
        if (f.desde >= currentMonth) state.entradasFijas = state.entradasFijas.filter(function(x){ return x.id !== id; });
        else f.hasta = addMonths(currentMonth, -1);
        saveState(); renderMoney();
      });
    });
    document.getElementById("interesForm").addEventListener("submit", function(e){
      e.preventDefault();
      var amt = parseFloat(document.getElementById("interesAmt").value);
      if (isNaN(amt) || amt <= 0) return;
      state.intereses = state.intereses || [];
      state.intereses.push({ id: uid(), mes: currentMonth, origen: document.getElementById("interesOrigen").value, cantidad: amt, nota: document.getElementById("interesNote").value.trim(), fecha: new Date().toISOString() });
      document.getElementById("interesAmt").value = ""; document.getElementById("interesNote").value = "";
      saveState(); renderMoney();
    });
    document.getElementById("interesesList").addEventListener("click", function(e){
      var id = e.target.getAttribute("data-del-interes");
      if (!id) return;
      state.intereses = (state.intereses || []).filter(function(x){ return x.id !== id; });
      saveState(); renderMoney();
    });
    document.getElementById("exportBtn").addEventListener("click", function(){
    var json = JSON.stringify(state, null, 2);
    var filename = "libro-ahorro-" + todayMonthKey() + ".json";
    try {
      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e){
      alert("No se pudo exportar la copia en esta vista.");
    }
  });
  // ---- Exportar a Excel (CSV con ; y decimales con coma, como usa Excel en español) ----
  function csvCell(v){
    if (v == null) v = "";
    if (typeof v === "number") return String(Math.round(v * 100) / 100).replace(".", ",");
    v = String(v);
    // Evita "inyección de fórmulas" al abrir el archivo en Excel
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function fechaCorta(iso){ return iso ? String(iso).slice(0, 10) : ""; }
  document.getElementById("exportCsvBtn").addEventListener("click", function(){
    var rows = [["Fecha", "Mes", "Tipo", "Categoría", "Origen", "Cantidad (€)", "Nota"]];
    var movs = [];
    state.entries.forEach(function(e){ movs.push([e.fecha, e.mes, "Inversión", e.categoria, origenLabel(e.origen), e.cantidad, e.nota]); });
    state.emergEntries.forEach(function(e){ movs.push([e.fecha, e.mes, "Fondo", e.categoria || "Aportación", origenLabel(e.origen), e.cantidad, e.nota]); });
    (state.ventas || []).forEach(function(v){ movs.push([v.fecha, v.mes, v.tipo === "invest" ? "Venta de inversión" : "Retiro del fondo", v.categoria, "", -v.cantidad, v.nota]); });
    (state.intereses || []).forEach(function(i){ movs.push([i.fecha, i.mes, "Cuenta remunerada", i.origen, "", i.cantidad, i.nota]); });
    movs.sort(function(a, b){ return String(a[0]).localeCompare(String(b[0])); });
    movs.forEach(function(m){ m[0] = fechaCorta(m[0]); rows.push(m); });
    rows.push([]);
    rows.push(["Resumen mensual"]);
    rows.push(["Mes", "Inversión (€)", "Fondo (€)", "Total ahorrado (€)", "Ventas y retiros (€)"]);
    allMonthsWithData().forEach(function(m){
      var inv = investTotalMonth(m), em = emergTotalMonth(m);
      var out = sum(ventasDe("invest", m), "cantidad") + sum(ventasDe("fondo", m), "cantidad");
      if (inv || em || out) rows.push([m, inv, em, inv + em, -out]);
    });
    rows.push([]);
    rows.push(["Situación actual"]);
    rows.push(["Saldo en la cuenta", state.saldoCuenta || 0]);
    rows.push(["Inversiones (valor hoy)", totalValorInv()]);
    rows.push(["Fondo", emergFundTotal()]);
    var csv = "﻿" + rows.map(function(r){ return r.map(csvCell).join(";"); }).join("\r\n");
    try {
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "libro-ahorro-" + todayMonthKey() + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e){
      alert("No se pudo exportar la copia en esta vista.");
    }
  });
  // ---- Validar una copia importada: solo se aceptan datos con la forma esperada ----
  function validarCopia(raw){
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("formato");
    var MES_RE = /^\d{4}-\d{2}$/;
    function txt(v, max){ return typeof v === "string" ? v.slice(0, max || 200) : ""; }
    function num(v){ v = Number(v); return isFinite(v) && v >= 0 && v < 1e12 ? v : null; }
    function lista(a, limpiar){
      if (!Array.isArray(a)) return [];
      return a.slice(0, 20000).map(limpiar).filter(Boolean);
    }
    function mov(e){
      if (!e || typeof e !== "object") return null;
      var c = num(e.cantidad);
      if (c == null || !MES_RE.test(e.mes)) return null;
      var o = { id: txt(e.id, 40) || uid(), mes: e.mes, categoria: txt(e.categoria, 80), cantidad: c, nota: txt(e.nota, 300), fecha: txt(e.fecha, 40) || new Date().toISOString() };
      if (e.origen) o.origen = txt(e.origen, 100);
      if (e.ventaId) o.ventaId = txt(e.ventaId, 40);
      if (e.entryId) o.entryId = txt(e.entryId, 40);
      if (e.tipo === "invest" || e.tipo === "fondo") o.tipo = e.tipo;
      if (e.plan === true) o.plan = true;
      return o;
    }
    var d = defaultState();
    d.totalMensual = num(raw.totalMensual) || 0;
    d.investObjetivo = num(raw.investObjetivo) || 0;
    if (Array.isArray(raw.categorias)) d.categorias = raw.categorias.filter(function(c){ return typeof c === "string"; }).map(function(c){ return c.slice(0, 80); }).slice(0, 100);
    if (Array.isArray(raw.fondoCategorias)) d.fondoCategorias = raw.fondoCategorias.filter(function(c){ return typeof c === "string"; }).map(function(c){ return c.slice(0, 80); }).slice(0, 100);
    d.entries = lista(raw.entries, mov);
    d.emergEntries = lista(raw.emergEntries, mov);
    d.ventas = lista(raw.ventas, function(v){ var o = mov(v); return o && o.tipo ? o : null; });
    d.intereses = lista(raw.intereses, mov);
    d.saldoCuenta = raw.saldoCuenta == null ? null : num(raw.saldoCuenta);
    d.entradasFijas = lista(raw.entradasFijas, function(f){
      if (!f || typeof f !== "object" || num(f.cantidad) == null || !MES_RE.test(f.desde)) return null;
      return { id: txt(f.id, 40) || uid(), nombre: txt(f.nombre, 80) || "Nómina", cantidad: num(f.cantidad), desde: f.desde, hasta: MES_RE.test(f.hasta) ? f.hasta : null };
    });
    if (raw.valorInversiones && typeof raw.valorInversiones === "object"){
      Object.keys(raw.valorInversiones).slice(0, 100).forEach(function(k){
        var v = raw.valorInversiones[k];
        if (v && num(v.valor) != null && isFinite(Number(v.base))) d.valorInversiones[k.slice(0, 80)] = { valor: num(v.valor), base: Number(v.base), fecha: txt(v.fecha, 40) };
      });
    }
    if (raw.metas && typeof raw.metas === "object"){
      Object.keys(raw.metas).slice(0, 100).forEach(function(k){
        var m = raw.metas[k];
        if (m && num(m.objetivo)) d.metas[k.slice(0, 80)] = { objetivo: num(m.objetivo), fecha: MES_RE.test(m.fecha) ? m.fecha : null };
      });
    }
    d.gastosMensuales = raw.gastosMensuales == null ? null : num(raw.gastosMensuales);
    var mm = parseInt(raw.mesesMeta, 10); d.mesesMeta = mm >= 1 && mm <= 24 ? mm : 6;
    if (raw.sim && typeof raw.sim === "object"){
      var sm = { inicial: num(raw.sim.inicial), aporte: num(raw.sim.aporte), rent: num(raw.sim.rent), anos: num(raw.sim.anos) };
      if (sm.inicial != null && sm.aporte != null && sm.rent != null && sm.rent <= 30 && sm.anos >= 1 && sm.anos <= 60) d.sim = sm;
    }
    d.plan = lista(raw.plan, function(it){
      if (!it || (it.tipo !== "invest" && it.tipo !== "fondo") || !num(it.cantidad)) return null;
      return { id: txt(it.id, 40) || uid(), tipo: it.tipo, categoria: txt(it.categoria, 80), cantidad: num(it.cantidad) };
    }).slice(0, 50);
    return d;
  }
  document.getElementById("importBtn").addEventListener("click", function(){
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", function(e){
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    if (file.size > 5 * 1024 * 1024){ alert("No se pudo leer el archivo. Asegúrate de que es una copia exportada desde esta misma app."); e.target.value = ""; return; }
    reader.onload = function(ev){
      try {
        var data = validarCopia(JSON.parse(ev.target.result));
        state = data;
        saveState();
        render();
        alert("Copia importada correctamente.");
      } catch(err){
        alert("No se pudo leer el archivo. Asegúrate de que es una copia exportada desde esta misma app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------- autenticación ----------
  function showAuthGate(){
    document.body.classList.add("auth-out");
    document.getElementById("authGate").hidden = false;
    document.getElementById("appRoot").hidden = true;
    document.getElementById("accountBar").hidden = true;
  }
  async function showApp(user){
    document.body.classList.remove("auth-out");
    document.getElementById("authGate").hidden = true;
    document.getElementById("appRoot").hidden = false;
    document.getElementById("accountBar").hidden = false;
    document.getElementById("accountEmail").textContent = user.email || "";
    setSyncStatus(true, "cargando tus datos…");
    state = await loadStateForUser(user);
    saveLocalState();
    setSyncStatus(true, "guardado en tu cuenta");
    render();
  }
  function authMsg(text){
    var el = document.getElementById("authMsg");
    el.textContent = text;
    el.hidden = false;
  }

  if (!sb) {
    // No se pudo cargar el cliente de Supabase (sin red, CDN bloqueado, etc.):
    // seguimos funcionando solo con este navegador para no dejar la app inservible.
    state = loadLocalState();
    document.getElementById("authGate").hidden = true;
    document.getElementById("appRoot").hidden = false;
    setSyncStatus(false, "sin conexión con la cuenta, guardado local");
    document.getElementById("deleteAccountBtn").hidden = true;
    render();
  } else {
    var authMode = "login";
    var recovering = /type=recovery/.test(location.hash);
    function setAuthMode(m){
      authMode = m;
      var titles = { login: "Inicia sesión", recover: "Recuperar contraseña", newpass: "Elige una nueva contraseña" };
      document.getElementById("authHeading").textContent = titles[m];
      document.getElementById("authForm").hidden = (m === "newpass");
      document.getElementById("newPassForm").hidden = (m !== "newpass");
      var pw = document.getElementById("authPassword");
      pw.hidden = (m === "recover");
      pw.required = (m === "login");
      document.getElementById("authSignupBtn").hidden = (m !== "login");
      document.getElementById("authLoginBtn").textContent = m === "recover" ? "Enviar enlace de recuperación" : "Iniciar sesión";
      document.getElementById("forgotBtn").textContent = m === "recover" ? "← Volver a iniciar sesión" : "¿Olvidaste tu contraseña?";
      document.getElementById("authMsg").hidden = true;
    }
    document.getElementById("forgotBtn").addEventListener("click", function(){
      setAuthMode(authMode === "recover" ? "login" : "recover");
    });
    document.getElementById("newPassForm").addEventListener("submit", async function(e){
      e.preventDefault();
      var btn = document.getElementById("newPassSubmit");
      btn.disabled = true;
      var res = await sb.auth.updateUser({ password: document.getElementById("newPassword").value });
      if (res.error) { authMsg(res.error.message || "No se pudo cambiar la contraseña."); btn.disabled = false; return; }
      authMsg("Contraseña actualizada. Entrando…");
      recovering = false;
      setTimeout(function(){ location.replace(location.pathname); }, 800);
    });
    document.getElementById("authForm").addEventListener("submit", async function(e){
      e.preventDefault();
      document.getElementById("authMsg").hidden = true;
      var email = document.getElementById("authEmail").value.trim();
      var password = document.getElementById("authPassword").value;
      if (authMode === "recover") {
        var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        authMsg(r.error ? (r.error.message || "No se pudo enviar el correo.") : "Si hay una cuenta con ese correo, te hemos enviado un enlace para cambiar la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.");
        return;
      }
      var res = await sb.auth.signInWithPassword({ email: email, password: password });
      if (res.error) authMsg(res.error.message || "No se pudo iniciar sesión.");
    });
    document.getElementById("authSignupBtn").addEventListener("click", async function(){
      document.getElementById("authMsg").hidden = true;
      var email = document.getElementById("authEmail").value.trim();
      var password = document.getElementById("authPassword").value;
      if (!email || password.length < 6){
        authMsg("Escribe un correo y una contraseña de al menos 6 caracteres.");
        return;
      }
      var res = await sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (res.error) authMsg(res.error.message || "No se pudo crear la cuenta.");
      else if (!res.data.session) authMsg("Cuenta creada. Ya puedes iniciar sesión.");
    });
    // Derecho de supresión (RGPD): borra los datos y la cuenta
    document.getElementById("deleteAccountBtn").addEventListener("click", async function(){
      if (!currentUser) return;
      var escrito = prompt("Esto borrará para siempre tu cuenta y todos tus datos. Para confirmar, escribe ELIMINAR");
      if (escrito == null) return;
      if (escrito.trim().toUpperCase() !== "ELIMINAR"){ alert("No se ha borrado nada."); return; }
      var res = await sb.rpc("eliminar_mi_cuenta");
      if (res.error){
        // Si la función aún no existe en Supabase, al menos borramos los datos guardados
        var del = await sb.from(SUPABASE_TABLE).delete().eq("user_id", currentUser.id);
        if (del.error){ alert("No se pudo borrar la cuenta. Inténtalo más tarde."); return; }
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch(e){}
      state = defaultState();
      alert("Tu cuenta y tus datos se han eliminado.");
      await sb.auth.signOut({ scope: "local" });
    });
    document.getElementById("signOutBtn").addEventListener("click", async function(){
      await sb.auth.signOut({ scope: "local" });
    });

    sb.auth.onAuthStateChange(function(event, session){
      if (event === "PASSWORD_RECOVERY") recovering = true;
      if (recovering && session) { showAuthGate(); setAuthMode("newpass"); return; }
      if (session && session.user) {
        // Si solo se renovó el token del mismo usuario, no recargamos la app
        var sameUser = currentUser && currentUser.id === session.user.id;
        currentUser = session.user;
        if (!sameUser) showApp(session.user);
      } else {
        currentUser = null;
        showAuthGate();
      }
    });
    sb.auth.getSession().then(function(res){
      if (!res.data || !res.data.session) showAuthGate();
    });
  }
})();
