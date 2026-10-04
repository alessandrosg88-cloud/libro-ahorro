(function(){
  var LANGS = ["es", "it", "en"];
  var NAMES = { es: "Español", it: "Italiano", en: "English" };
  // español: [italiano, inglés]
  var T = {
    "Libro de Ahorro": ["Libro dei Risparmi", "Savings Book"],
    "Tu dinero hoy": ["I tuoi soldi oggi", "Your money today"],
    "Cuenta": ["Conto", "Account"],
    "Inversiones (valor actual)": ["Investimenti (valore attuale)", "Investments (current value)"],
    "Saldo en la cuenta": ["Saldo sul conto", "Account balance"],
    "Dinero en tu cuenta ahora": ["Soldi sul tuo conto adesso", "Money in your account now"],
    "Se descuenta solo cuando inviertes o ahorras «de la cuenta».": ["Si scala da solo quando investi o risparmi «dal conto».", "It goes down automatically when you invest or save «from the account»."],
    "Valor actual de tus inversiones": ["Valore attuale dei tuoi investimenti", "Current value of your investments"],
    "Escribe cuánto valen hoy. El valor se mantiene los meses siguientes hasta que lo cambies; si aportas más, se suma solo.": ["Scrivi quanto valgono oggi. Il valore resta nei mesi successivi finché non lo cambi; se versi di più, si somma da solo.", "Enter what they're worth today. The value carries over to the next months until you change it; new contributions are added automatically."],
    "Entradas fijas": ["Entrate fisse", "Fixed income"],
    "(se repiten cada mes)": ["(si ripetono ogni mese)", "(repeat every month)"],
    "Intereses": ["Interessi", "Interest"],
    "Cuenta remunerada": ["Conto remunerato", "Interest-bearing account"],
    "(este mes)": ["(questo mese)", "(this month)"],
    "¿De dónde sale el dinero este mes?": ["Da dove escono i soldi questo mese?", "Where does the money come from this month?"],
    "Nómina": ["Stipendio", "Salary"],
    "€/mes": ["€/mese", "€/month"],
    "¿De dónde vienen?": ["Da dove arrivano?", "Where do they come from?"],
    "¿De dónde sale el dinero?": ["Da dove escono i soldi?", "Where does the money come from?"],
    "Cuando añadas una inversión podrás escribir aquí cuánto vale hoy.": ["Quando aggiungi un investimento potrai scrivere qui quanto vale oggi.", "Once you add an investment you can enter its current value here."],
    "Añade tu nómina u otras entradas que recibes cada mes.": ["Aggiungi lo stipendio o altre entrate che ricevi ogni mese.", "Add your salary or other income you receive every month."],
    "Sin intereses este mes.": ["Nessun interesse questo mese.", "No interest this month."],
    "Añade tus entradas fijas o intereses y, al invertir o ahorrar, elige de dónde sale.": ["Aggiungi entrate fisse o interessi e, quando investi o risparmi, scegli da dove escono.", "Add your fixed income or interest and, when you invest or save, choose where it comes from."],
    "De la cuenta": ["Dal conto", "From the account"],
    "Alquiler cobrado": ["Affitto incassato", "Rent received"],
    "Pensión": ["Pensione", "Pension"],
    "la cuenta": ["il conto", "the account"],
    "Ver gráficos": ["Vedi grafici", "View charts"],
    "Tienes en total": ["Hai in totale", "Your total"],
    "En la cuenta": ["Sul conto", "In the account"],
    "Invertido (vale hoy)": ["Investito (valore di oggi)", "Invested (worth today)"],
    "invertido en total": ["investito in totale", "invested in total"],
    "guardado en el fondo": ["messo da parte nel fondo", "saved in the fund"],
    "Más opciones": ["Altre opzioni", "More options"],
    "Mis ingresos": ["Le mie entrate", "My income"],
    "Ingresos fijos": ["Entrate fisse", "Fixed income"],
    "(cada mes)": ["(ogni mese)", "(every month)"],
    "Cuenta y valor de inversiones": ["Conto e valore degli investimenti", "Account and investment value"],
    "Escribe cuánto tienes ahora en el banco.": ["Scrivi quanto hai adesso in banca.", "Enter how much you have in the bank now."],
    "Escribe cuánto valen hoy. Se guarda para los próximos meses.": ["Scrivi quanto valgono oggi. Resta salvato per i prossimi mesi.", "Enter what they're worth today. It's kept for the next months."],
    "Escribe cuánto quieres ahorrar cada mes": ["Scrivi quanto vuoi risparmiare ogni mese", "Enter how much you want to save each month"],
    "¡Objetivo cumplido!": ["Obiettivo raggiunto!", "Goal reached!"],
    "Ocultar gráficos": ["Nascondi grafici", "Hide charts"],
    "Historial mensual y total ahorrado acumulado": ["Storico mensile e totale risparmiato accumulato", "Monthly history and total saved so far"],
    "Tú decides cuánto ahorras cada mes y cómo lo repartes.": ["Decidi tu quanto risparmiare ogni mese e come ripartirlo.", "You decide how much to save each month and how to split it."],
    "Tú decides cuánto ahorras cada mes y cómo lo repartes entre inversión y fondo.": ["Decidi tu quanto risparmiare ogni mese e come ripartirlo tra investimenti e fondo.", "You decide how much to save each month and how to split it between investments and fund."],
    "guardado en tu cuenta": ["salvato nel tuo account", "saved to your account"],
    "cargando…": ["caricamento…", "loading…"],
    "cargando tus datos…": ["caricamento dei tuoi dati…", "loading your data…"],
    "sin conexión, guardado local": ["offline, salvato in locale", "offline, saved locally"],
    "sin conexión con la cuenta, guardado local": ["nessuna connessione all'account, salvato in locale", "no connection to your account, saved locally"],
    "Cerrar sesión": ["Esci", "Sign out"],
    "Fija tu objetivo de ahorro mensual": ["Imposta il tuo obiettivo di risparmio mensile", "Set your monthly savings goal"],
    "Repártelo entre inversión y fondo": ["Ripartiscilo tra investimenti e fondo", "Split it between investments and fund"],
    "Guardado en tu cuenta: entra desde cualquier dispositivo": ["Salvato nel tuo account: accedi da qualsiasi dispositivo", "Saved to your account: sign in from any device"],
    "Inicia sesión": ["Accedi", "Sign in"],
    "Iniciar sesión": ["Accedi", "Sign in"],
    "Te pedimos tu correo solo para crear tu cuenta y guardar tu Libro de Ahorro de forma segura, así puedes verlo desde cualquier dispositivo. No lo usamos para nada más. Tu sesión se mantiene iniciada en este dispositivo hasta que pulses «Cerrar sesión»; solo te lo volveremos a pedir si la sesión caduca o cierras sesión.": ["Ti chiediamo l'email solo per creare il tuo account e salvare il tuo Libro dei Risparmi in modo sicuro, così puoi vederlo da qualsiasi dispositivo. Non la usiamo per nient'altro. La sessione resta attiva su questo dispositivo finché non premi «Esci»; te la richiederemo solo se la sessione scade o se esci.", "We only ask for your email to create your account and keep your Savings Book safe, so you can see it from any device. We don't use it for anything else. You stay signed in on this device until you press «Sign out»; we'll only ask again if your session expires or you sign out."],
    "Crear cuenta": ["Crea account", "Create account"],
    "¿Olvidaste tu contraseña?": ["Password dimenticata?", "Forgot your password?"],
    "Guardar nueva contraseña": ["Salva nuova password", "Save new password"],
    "Recuperar contraseña": ["Recupera password", "Reset password"],
    "Elige una nueva contraseña": ["Scegli una nuova password", "Choose a new password"],
    "Enviar enlace de recuperación": ["Invia link di recupero", "Send reset link"],
    "← Volver a iniciar sesión": ["← Torna all'accesso", "← Back to sign in"],
    "No se pudo cambiar la contraseña.": ["Impossibile cambiare la password.", "Couldn't change the password."],
    "Contraseña actualizada. Entrando…": ["Password aggiornata. Accesso in corso…", "Password updated. Signing in…"],
    "No se pudo enviar el correo.": ["Impossibile inviare l'email.", "Couldn't send the email."],
    "Si hay una cuenta con ese correo, te hemos enviado un enlace para cambiar la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.": ["Se esiste un account con questa email, ti abbiamo inviato un link per cambiare la password. Controlla la posta in arrivo e la cartella spam.", "If there's an account with that email, we've sent you a link to change your password. Check your inbox and spam folder."],
    "No se pudo iniciar sesión.": ["Impossibile accedere.", "Couldn't sign in."],
    "Escribe un correo y una contraseña de al menos 6 caracteres.": ["Scrivi un'email e una password di almeno 6 caratteri.", "Enter an email and a password of at least 6 characters."],
    "No se pudo crear la cuenta.": ["Impossibile creare l'account.", "Couldn't create the account."],
    "Cuenta creada. Ya puedes iniciar sesión.": ["Account creato. Ora puoi accedere.", "Account created. You can sign in now."],
    "hoy": ["oggi", "today"],
    "Objetivo de ahorro mensual": ["Obiettivo di risparmio mensile", "Monthly savings goal"],
    "Escribe cuánto quieres ahorrar este mes y ajusta el reparto abajo": ["Scrivi quanto vuoi risparmiare questo mese e regola la ripartizione qui sotto", "Enter how much you want to save this month and adjust the split below"],
    "Inversión": ["Investimenti", "Investments"],
    "Fondo": ["Fondo", "Fund"],
    "Total": ["Totale", "Total"],
    "Acciones": ["Azioni", "Stocks"],
    "+ nueva categoría": ["+ nuova categoria", "+ new category"],
    "Añadir": ["Aggiungi", "Add"],
    "crear": ["crea", "create"],
    "invertido en total (descontando ventas)": ["investito in totale (al netto delle vendite)", "invested in total (minus sales)"],
    "− Registrar una venta": ["− Registra una vendita", "− Record a sale"],
    "Vender": ["Vendi", "Sell"],
    "este mes": ["questo mese", "this month"],
    "histórico": ["storico", "all time"],
    "Sin datos todavía.": ["Ancora nessun dato.", "No data yet."],
    "Todavía no has añadido inversiones este mes.": ["Non hai ancora aggiunto investimenti questo mese.", "You haven't added any investments this month yet."],
    "Todavía no has añadido nada al fondo este mes.": ["Non hai ancora aggiunto nulla al fondo questo mese.", "You haven't added anything to the fund this month yet."],
    "acumulado en el fondo (todos los meses)": ["accumulato nel fondo (tutti i mesi)", "accumulated in the fund (all months)"],
    "Imprevistos": ["Imprevisti", "Emergencies"],
    "Viajes": ["Viaggi", "Travel"],
    "Coche": ["Auto", "Car"],
    "Casa": ["Casa", "Home"],
    "Salud": ["Salute", "Health"],
    "− Sacar dinero del fondo": ["− Preleva dal fondo", "− Withdraw from the fund"],
    "Sacar": ["Preleva", "Withdraw"],
    "Aportación": ["Versamento", "Contribution"],
    "Cancelar": ["Annulla", "Cancel"],
    "Privacidad y cookies": ["Privacy e cookie", "Privacy & cookies"],
    "Términos de uso": ["Termini d'uso", "Terms of use"],
    "Términos de uso y aviso legal": ["Termini d'uso e note legali", "Terms of use & legal notice"],
    "Al crear una cuenta aceptas los términos de uso y la política de privacidad.": ["Creando un account accetti i termini d'uso e l'informativa sulla privacy.", "By creating an account you accept the terms of use and the privacy policy."],
    "Al crear una cuenta aceptas la política de privacidad": ["Creando un account accetti l'informativa sulla privacy", "By creating an account you accept the privacy policy"],
    "Más información": ["Maggiori informazioni", "More info"],
    "Compartir": ["Condividi", "Share"],
    "Más opciones…": ["Altre opzioni…", "More options…"],
    "Mensaje de texto": ["Messaggio di testo", "Text message"],
    "Correo": ["Email", "Email"],
    "Copiar enlace": ["Copia link", "Copy link"],
    "Enlace copiado.": ["Link copiato.", "Link copied."],
    "Enlace copiado. Pégalo en Instagram (en un mensaje o en tu historia).": ["Link copiato. Incollalo su Instagram (in un messaggio o nella tua storia).", "Link copied. Paste it on Instagram (in a message or your story)."],
    "Registro del fondo por categoría": ["Registro del fondo per categoria", "Fund record by category"],
    "Sin categoría": ["Senza categoria", "Uncategorized"],
    "Tus aportaciones anteriores no se borran.": ["I versamenti precedenti non vengono cancellati.", "Your previous contributions won't be deleted."],
    "Categorías del fondo:": ["Categorie del fondo:", "Fund categories:"],
    "no tienes inversiones": ["non hai investimenti", "you have no investments"],
    "No tienes inversiones que vender.": ["Non hai investimenti da vendere.", "You have no investments to sell."],
    "Historial mensual": ["Storico mensile", "Monthly history"],
    "objetivo": ["obiettivo", "target"],
    "Mes": ["Mese", "Month"],
    "Estado": ["Stato", "Status"],
    "cumplido": ["raggiunto", "met"],
    "por debajo": ["sotto", "below"],
    "Total ahorrado acumulado": ["Totale risparmiato accumulato", "Total saved so far"],
    "Suma de todo lo que has aportado mes a mes, restando lo que has vendido o sacado del fondo.": ["Somma di tutto ciò che hai versato mese per mese, meno ciò che hai venduto o prelevato dal fondo.", "Everything you've contributed month by month, minus what you've sold or withdrawn from the fund."],
    "Tus datos se guardan en tu cuenta. Usa «Exportar copia» para descargar una copia de seguridad en cualquier momento (o para pasarlos a otro dispositivo con «Importar copia»).": ["I tuoi dati sono salvati nel tuo account. Usa «Esporta copia» per scaricare un backup in qualsiasi momento (o per trasferirli su un altro dispositivo con «Importa copia»).", "Your data is saved to your account. Use «Export backup» to download a backup at any time (or to move it to another device with «Import backup»)."],
    "Exportar copia": ["Esporta copia", "Export backup"],
    "Importar copia": ["Importa copia", "Import backup"],
    "No se pudo exportar la copia en esta vista.": ["Impossibile esportare la copia in questa vista.", "Couldn't export the backup in this view."],
    "Copia importada correctamente.": ["Copia importata correttamente.", "Backup imported successfully."],
    "No se pudo leer el archivo. Asegúrate de que es una copia exportada desde esta misma app.": ["Impossibile leggere il file. Assicurati che sia una copia esportata da questa stessa app.", "Couldn't read the file. Make sure it's a backup exported from this same app."],
    "Este sitio usa cookies y almacenamiento local para mantener tu sesión y guardar tus datos. Al registrarte o iniciar sesión con tu email, aceptas su uso.": ["Questo sito usa cookie e archiviazione locale per mantenere la sessione e salvare i tuoi dati. Registrandoti o accedendo con la tua email, ne accetti l'uso.", "This site uses cookies and local storage to keep you signed in and save your data. By signing up or signing in with your email, you accept their use."],
    "Aceptar": ["Accetta", "Accept"],
    "Correo electrónico": ["Email", "Email"],
    "Contraseña": ["Password", "Password"],
    "Nueva contraseña (mínimo 6 caracteres)": ["Nuova password (minimo 6 caratteri)", "New password (at least 6 characters)"],
    "Mes anterior": ["Mese precedente", "Previous month"],
    "Mes siguiente": ["Mese successivo", "Next month"],
    "nota (opcional)": ["nota (facoltativa)", "note (optional)"],
    "nombre de la categoría": ["nome della categoria", "category name"],
    "€ vendidos": ["€ venduti", "€ sold"],
    "Eliminar": ["Elimina", "Delete"],
    "¿En qué lo gastarás?": ["In cosa lo spenderai?", "What will you spend it on?"],
    "¿en qué lo gastarás? (p. ej. Vacaciones)": ["in cosa lo spenderai? (es. Vacanze)", "what will you spend it on? (e.g. Holidays)"],
    "Exportar a Excel": ["Esporta in Excel", "Export to Excel"],
    "Rentabilidad total": ["Rendimento totale", "Total return"],
    "Metas de ahorro": ["Obiettivi di risparmio", "Savings goals"],
    "¿Para qué ahorras?": ["Per cosa risparmi?", "What are you saving for?"],
    "€ meta": ["€ obiettivo", "€ goal"],
    "¿Para cuándo?": ["Per quando?", "By when?"],
    "Guardar meta": ["Salva obiettivo", "Save goal"],
    "Elige una categoría del fondo, cuánto quieres juntar y para cuándo. Te decimos cuánto apartar cada mes.": ["Scegli una categoria del fondo, quanto vuoi mettere da parte e per quando. Ti diciamo quanto accantonare ogni mese.", "Pick a fund category, how much you want to save and by when. We'll tell you how much to set aside each month."],
    "Aún no tienes metas. Por ejemplo: Viajes, 1.500 € para junio.": ["Non hai ancora obiettivi. Ad esempio: Viaggi, 1.500 € per giugno.", "No goals yet. For example: Travel, €1,500 by June."],
    "¡Meta conseguida!": ["Obiettivo raggiunto!", "Goal reached!"],
    "crea antes una categoría": ["crea prima una categoria", "create a category first"],
    "Aportación automática": ["Versamento automatico", "Automatic contribution"],
    "Define una vez lo que apartas cada mes y regístralo todo con un solo botón.": ["Definisci una volta quanto metti da parte ogni mese e registra tutto con un solo pulsante.", "Set once what you put aside each month and record it all with one button."],
    "¿Inversión o fondo?": ["Investimento o fondo?", "Investment or fund?"],
    "Categoría": ["Categoria", "Category"],
    "Añadir al plan": ["Aggiungi al piano", "Add to plan"],
    "Añade lo que quieres apartar cada mes, por ejemplo 200 € a ETF y 100 € a Imprevistos.": ["Aggiungi quanto vuoi mettere da parte ogni mese, ad esempio 200 € in ETF e 100 € in Imprevisti.", "Add what you want to set aside each month, e.g. €200 to ETF and €100 to Emergencies."],
    "Plan de este mes ya registrado ✓": ["Piano di questo mese già registrato ✓", "This month's plan already recorded ✓"],
    "Plan mensual": ["Piano mensile", "Monthly plan"],
    "Meses de emergencia cubiertos": ["Mesi di emergenza coperti", "Emergency months covered"],
    "Tus gastos al mes": ["Le tue spese mensili", "Your monthly expenses"],
    "Meta": ["Obiettivo", "Goal"],
    "meses": ["mesi", "months"],
    "Escribe cuánto gastas al mes y te diremos cuántos meses podrías vivir con tu fondo.": ["Scrivi quanto spendi al mese e ti diremo quanti mesi potresti vivere con il tuo fondo.", "Enter how much you spend per month and we'll tell you how many months your fund would last."],
    "Simulador de interés compuesto": ["Simulatore di interesse composto", "Compound interest calculator"],
    "Empiezas con": ["Parti con", "Starting amount"],
    "Inviertes al mes": ["Investi al mese", "Monthly investment"],
    "Rentabilidad al año": ["Rendimento annuo", "Yearly return"],
    "Durante": ["Per", "For"],
    "años": ["anni", "years"],
    "Tendrás": ["Avrai", "You'll have"],
    "Aportado por ti": ["Versato da te", "Contributed by you"],
    "Ganado con intereses": ["Guadagnato con gli interessi", "Earned from interest"],
    "Es una estimación: supone la misma rentabilidad todos los años, sin comisiones ni impuestos. La rentabilidad real sube y baja.": ["È una stima: presuppone lo stesso rendimento ogni anno, senza commissioni né tasse. Il rendimento reale sale e scende.", "This is an estimate: it assumes the same return every year, with no fees or taxes. Real returns go up and down."],
    "Instalar app": ["Installa app", "Install app"],
    "Eliminar mi cuenta y mis datos": ["Elimina il mio account e i miei dati", "Delete my account and data"],
    "Esto borrará para siempre tu cuenta y todos tus datos. Para confirmar, escribe ELIMINAR": ["Questo cancellerà per sempre il tuo account e tutti i tuoi dati. Per confermare, scrivi ELIMINAR", "This will permanently delete your account and all your data. To confirm, type ELIMINAR"],
    "No se ha borrado nada.": ["Non è stato cancellato nulla.", "Nothing was deleted."],
    "No se pudo borrar la cuenta. Inténtalo más tarde.": ["Impossibile eliminare l'account. Riprova più tardi.", "Couldn't delete the account. Please try again later."],
    "Tu cuenta y tus datos se han eliminado.": ["Il tuo account e i tuoi dati sono stati eliminati.", "Your account and data have been deleted."]
  };
  var MES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var MES_T = [
    ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],
    ["January","February","March","April","May","June","July","August","September","October","November","December"]
  ];
  var ABR = { ENE:["GEN","JAN"], FEB:["FEB","FEB"], MAR:["MAR","MAR"], ABR:["APR","APR"], MAY:["MAG","MAY"], JUN:["GIU","JUN"], JUL:["LUG","JUL"], AGO:["AGO","AUG"], SEP:["SET","SEP"], OCT:["OTT","OCT"], NOV:["NOV","NOV"], DIC:["DIC","DEC"] };
  var RULES = [
    [/^Llevas (.+) de (.+) este mes$/, ["Hai risparmiato $1 su $2 questo mese", "You've saved $1 of $2 this month"]],
    [/^Registrar el plan de este mes \((.+)\)$/, ["Registra il piano di questo mese ($1)", "Record this month's plan ($1)"]],
    [/^(.+) en (\d+) años$/, ["$1 in $2 anni", "$1 in $2 years"]],
    [/^([\d.,]+) meses$/, ["$1 mesi", "$1 months"]],
    [/^¡Meta cumplida! Tu fondo cubre tus gastos de (\d+) meses\.$/, ["Obiettivo raggiunto! Il tuo fondo copre le spese di $1 mesi.", "Goal reached! Your fund covers $1 months of expenses."]],
    [/^Te faltan (.+) para cubrir (\d+) meses\.$/, ["Ti mancano $1 per coprire $2 mesi.", "$1 to go to cover $2 months."]],
    [/^Te faltan (.+)$/, ["Ti mancano $1", "$1 to go"]],
    [/^Faltan (.+)$/, ["Mancano $1", "$1 to go"]],
    [/^Aparta (.+)\/mes hasta (.+)$/, ["Metti da parte $1/mese fino a $2", "Set aside $1/month until $2"]],
    [/^Fecha pasada · faltan (.+)$/, ["Data superata · mancano $1", "Date passed · $1 to go"]],
    [/^aportado (.+) · vale (.+)$/, ["versato $1 · vale $2", "contributed $1 · worth $2"]],
    [/^\+(.+)\/mes$/, ["+$1/mese", "+$1/month"]],
    [/^Sale de: (.+?) \(quedan (.+)\)$/, ["Esce da: $1 (restano $2)", "From: $1 ($2 left)"]],
    [/^Sale de: (.+?) \((.+)\)$/, ["Esce da: $1 ($2)", "From: $1 ($2)"]],
    [/^Sale de: (.+)$/, ["Esce da: $1", "From: $1"]],
    [/^([^:]+): (−?-?[\d.,]+ €)$/, ["$1: $2", "$1: $2"]],
    [/^· de la cuenta$/, ["· dal conto", "· from the account"]],
    [/^· de (.+)$/, ["· da $1", "· from $1"]],
    [/^· desde (.+)$/, ["· da $1", "· since $1"]],
    [/^· aportado (.+)$/, ["· versato $1", "· contributed $1"]],
    [/^entra (.+) · ahorrado (.+)$/, ["entra $1 · risparmiato $2", "in $1 · saved $2"]],
    [/^quedan (.+)$/, ["restano $1", "left $1"]],
    [/^usado (.+)$/, ["usato $1", "used $1"]],
    [/^Entra este mes (.+) · ahorrado (.+)$/, ["Entra questo mese $1 · risparmiato $2", "In this month $1 · saved $2"]],
    [/^Sin asignar (.+)$/, ["Non assegnato $1", "Unassigned $1"]],
    [/^En la cuenta solo tienes (.+)\.$/, ["Sul conto hai solo $1.", "You only have $1 in the account."]],
    [/^De (.+) solo te quedan (.+) este mes\.$/, ["Da $1 ti restano solo $2 questo mese.", "Only $2 left from $1 this month."]],
    [/^objetivo total (.+)\/mes$/, ["obiettivo totale $1/mese", "total target $1/month"]],
    [/^objetivo (.+)$/, ["obiettivo $1", "target $1"]],
    [/^Eso supera tu objetivo de inversión \((.+)\)\. Te quedan (.+) libres este mes\.$/, ["Supera il tuo obiettivo di investimento ($1). Ti restano $2 liberi questo mese.", "That's over your investment target ($1). You have $2 left this month."]],
    [/^Eso supera tu objetivo de fondo \((.+)\)\. Te quedan (.+) libres este mes\.$/, ["Supera il tuo obiettivo del fondo ($1). Ti restano $2 liberi questo mese.", "That's over your fund target ($1). You have $2 left this month."]],
    [/^Solo tienes (.+) en (.+)\.$/, ["Hai solo $1 in $2.", "You only have $1 in $2."]],
    [/^En el fondo solo hay (.+)\.$/, ["Nel fondo ci sono solo $1.", "The fund only has $1."]]
  ];
  var lang = "es";
  try { lang = localStorage.getItem("libroLang") || "es"; } catch (e) {}
  if (LANGS.indexOf(lang) < 0) lang = "es";

  function trCore(c, li){
    if (T[c]) return T[c][li];
    var mm = c.match(/^([a-zA-ZñÑ]+) (\d{4})$/);
    if (mm){ var k = MES.indexOf(mm[1].toLowerCase()); if (k >= 0) return MES_T[li][k] + " " + mm[2]; }
    if (ABR[c]) return ABR[c][li];
    var cm = c.match(/^¿Estás seguro de que quieres eliminar «([\s\S]*)»\?$/);
    if (cm){ var nm = T[cm[1]] ? T[cm[1]][li] : cm[1]; return (li === 0 ? "Sei sicuro di voler eliminare «" : "Are you sure you want to delete «") + nm + "»?"; }
    var vm = c.match(/^(Venta|Retiro) · ([\s\S]*)$/);
    if (vm) return (vm[1] === "Venta" ? ["Vendita", "Sale"] : ["Prelievo", "Withdrawal"])[li] + " · " + (T[vm[2]] ? T[vm[2]][li] : vm[2]);
    for (var i = 0; i < RULES.length; i++){
      var rm = c.match(RULES[i][0]);
      if (rm) return RULES[i][1][li].replace(/\$(\d)/g, function(_, d){
        var g = rm[+d] || "";
        var tg = trCore(g, li);
        return tg == null ? g : tg;
      });
    }
    return null;
  }
  function tr(s){
    if (lang === "es" || !s) return s;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2]) return s;
    var out = trCore(m[2], lang === "it" ? 0 : 1);
    return out == null ? s : m[1] + out + m[3];
  }

  var ATTRS = ["placeholder", "title", "aria-label"];
  var btn = document.createElement("button");
  function apply(){
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())){
      var p = n.parentNode;
      if (!p || p === btn || p.nodeName === "SCRIPT" || p.nodeName === "STYLE") continue;
      if (n.__tr !== n.nodeValue) n.__es = n.nodeValue;
      var t = tr(n.__es);
      if (t !== n.nodeValue) n.nodeValue = t;
      n.__tr = t;
    }
    document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(function(el){
      if (el === btn) return;
      el.__esA = el.__esA || {}; el.__trA = el.__trA || {};
      ATTRS.forEach(function(a){
        var v = el.getAttribute(a);
        if (v == null) return;
        if (el.__trA[a] !== v) el.__esA[a] = v;
        var t = tr(el.__esA[a]);
        if (t !== v) el.setAttribute(a, t);
        el.__trA[a] = t;
      });
    });
    document.title = tr("Libro de Ahorro");
    document.documentElement.lang = lang;
  }

  var OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  var pending = false;
  var obs = new MutationObserver(function(){
    if (pending) return;
    pending = true;
    requestAnimationFrame(function(){
      pending = false;
      obs.disconnect();
      apply();
      obs.observe(document.body, OPTS);
    });
  });

  btn.type = "button";
  btn.id = "langBtn";
  btn.className = "ghost-btn lang-btn";
  function label(){
    btn.textContent = "🌐 " + NAMES[lang];
    btn.title = { es: "Cambiar idioma", it: "Cambia lingua", en: "Change language" }[lang];
  }
  btn.addEventListener("click", function(){
    lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    try { localStorage.setItem("libroLang", lang); } catch (e) {}
    label();
    obs.disconnect();
    apply();
    obs.observe(document.body, OPTS);
  });
  var bar = document.createElement("div");
  bar.className = "lang-bar";
  bar.appendChild(btn);
  var sheet = document.querySelector(".sheet") || document.body;
  sheet.insertBefore(bar, sheet.firstChild);

  var _alert = window.alert;
  window.alert = function(m){ return _alert.call(window, tr(String(m))); };
  var _prompt = window.prompt;
  window.prompt = function(m, d){ return _prompt.call(window, tr(String(m)), d); };

  label();
  apply();
  obs.observe(document.body, OPTS);
})();
