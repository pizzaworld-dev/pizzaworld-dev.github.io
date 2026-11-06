/* Pizza World Cagnes-sur-Mer — interactions
   Navigation mobile, horaires en direct (heure de Paris), rubriques de la carte,
   animations et commande par WhatsApp. */
(function () {
  "use strict";

  /* ---------- Réglages de la commande ---------- */
  var WHATSAPP = "33493208108";     // 04 93 20 81 08 au format international, sans + ni 0
  var EXTRA_EPAISSE = 2;            // supplément pâte épaisse, en euros
  var ZONES = ["Cagnes-sur-Mer", "Villeneuve-Loubet", "La Colle-sur-Loup"];
  // Suppléments proposés sur les pizzas et les bruschettas (menu déroulant de chaque plat dans « Ma commande »),
  // rangés par famille. Le chiffre est le prix en euros : 1.5 = 1,50 €. 0 = offert.
  // null = prix pas encore fixé : le supplément est proposé sans prix et n'entre pas dans le total.
  // Pour retirer un supplément, effacez sa ligne.
  // Prix repris du logiciel de caisse (liste des produits finis, prix de vente TTC) le 04/11/2026.
  var SUPPLEMENTS = {
    "Fromages": {
      "Bleu": 1.5,
      "Camembert": 4,
      "Cheddar": 1.5,
      "Chèvre": 2,
      "Raclette": 2,
      "Reblochon": 3,
      "Double fromage": 3
    },
    "Viandes et œuf": {
      "Jambon": 2,
      "Jambon cru": 1.5,
      "Lardons": 1.5,
      "Poulet": 2,
      "Tenders de poulet": 3,
      "Viande hachée": 3,
      "Merguez": 1.5,
      "Chorizo": 1.5,
      "Kebab": 3,
      "Œuf": 1
    },
    "Poissons et fruits de mer": {
      "Anchois": 1,
      "Thon": 3,
      "Saumon": 3,
      "Scampis": 2.5,
      "Fruits de mer": 5
    },
    "Légumes et fruits": {
      "Champignons": 1.5,
      "Sanguins": null,
      "Poivrons": 1.5,
      "Oignons": 1,
      "Olives": 0,
      "Artichauts": 1.5,
      "Aubergines": 1,
      "Courgettes": 1.5,
      "Tomates fraîches": 1,
      "Maïs": null,
      "Pomme de terre": null,
      "Frites": 1.5,
      "Câpres": 0.5,
      "Ananas": 1.5
    },
    "Sauces": {
      "Sauce tomate": 0,
      "Crème": 0,
      "Ketchup": 1,
      "Guacamole": 1,
      "Miel": 1.5
    },
    "Herbes et épices": {
      "Basilic": 0,
      "Origan": 0,
      "Persillade": 0,
      "Aneth": null,
      "Cumin": null,
      "Piment calabrais": null,
      "Épices mexicaines": null,
      "Coco râpé": null
    }
  };
  var STORE_KEY = "pizzaworld-commande";
  var CLIENT_KEY = "pizzaworld-client";   // coordonnées et dernière commande, si le client a coché « Mémoriser »

  var doc = document;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Navigation mobile ---------- */
  var toggle = doc.querySelector(".nav-toggle");
  var mobileNav = doc.getElementById("mobile-nav");

  function setNav(open) {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    mobileNav.hidden = !open;
    doc.body.classList.toggle("nav-open", open);
  }

  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 1080px)").addEventListener("change", function (e) {
      if (e.matches) setNav(false);
    });
  }

  /* ---------- En-tête et bouton « haut de page » ---------- */
  var header = doc.querySelector(".site-header");
  var toTop = doc.querySelector(".to-top");

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 900);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Horaires : jour en cours, ouvert / fermé ----------
     Les créneaux sont lus dans le tableau du pied de page (attribut data-hours),
     il n'y a donc qu'un seul endroit à modifier. */
  var DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var rows = [].slice.call(doc.querySelectorAll("[data-hours-table] tr[data-day]"));
  var currentStatus = null;

  if (rows.length) {
    var schedule = {};
    rows.forEach(function (row) {
      schedule[row.getAttribute("data-day")] = (row.getAttribute("data-hours") || "")
        .split(/\s+/)
        .filter(Boolean)
        .map(function (slot) { return slot.split("-").map(toMinutes); });
    });

    var now = parisNow();
    rows.forEach(function (row) {
      if (Number(row.getAttribute("data-day")) === now.day) {
        row.classList.add("is-today");
        var th = row.querySelector("th");
        if (th) th.insertAdjacentHTML("beforeend", '<span class="sr-only"> (aujourd’hui)</span>');
      }
    });

    currentStatus = computeStatus(schedule, now);
    doc.querySelectorAll("[data-open-status]").forEach(function (el) {
      el.textContent = currentStatus.label;
      el.classList.toggle("is-open", currentStatus.open);
      el.hidden = false;
    });
  }

  function toMinutes(hhmm) {
    var p = hhmm.split(":");
    return Number(p[0]) * 60 + (Number(p[1]) || 0);
  }

  function formatTime(minutes) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return h + "h" + (m ? String(m).padStart(2, "0") : "");
  }

  function parisNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    var get = function (type) {
      var part = parts.filter(function (p) { return p.type === type; })[0];
      return part ? part.value : "";
    };
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
      minutes: Number(get("hour")) * 60 + Number(get("minute"))
    };
  }

  function computeStatus(sched, at) {
    var today = sched[at.day] || [];
    var i;
    for (i = 0; i < today.length; i++) {
      if (at.minutes >= today[i][0] && at.minutes < today[i][1]) {
        return { open: true, label: "Ouvert · jusqu’à " + formatTime(today[i][1]) };
      }
    }
    for (i = 0; i < today.length; i++) {
      if (at.minutes < today[i][0]) {
        return { open: false, label: "Fermé · ouvre à " + formatTime(today[i][0]) };
      }
    }
    for (var d = 1; d <= 7; d++) {
      var day = (at.day + d) % 7;
      var slots = sched[day] || [];
      if (slots.length) {
        return {
          open: false,
          label: "Fermé · ouvre " + (d === 1 ? "demain" : DAY_NAMES[day]) + " à " + formatTime(slots[0][0])
        };
      }
    }
    return { open: false, label: "Fermé" };
  }

  /* ---------- Carte : rubrique active dans la barre de navigation ---------- */
  var catNav = doc.querySelector("[data-cat-nav]");
  if (catNav) {
    var scroller = catNav.querySelector("ul");
    var links = [].slice.call(catNav.querySelectorAll("a[href^='#']"));
    var sections = links
      .map(function (a) { return doc.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    var current = null;
    var ticking = false;

    var setActive = function (id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", on);
        if (on) {
          a.setAttribute("aria-current", "true");
          var left = a.offsetLeft - (scroller.clientWidth - a.offsetWidth) / 2;
          scroller.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
        } else {
          a.removeAttribute("aria-current");
        }
      });
    };

    var update = function () {
      ticking = false;
      if (!sections.length) return;
      var offset = (header ? header.offsetHeight : 0) + catNav.offsetHeight + 40;
      var id = sections[0].id;
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top - offset <= 0) id = s.id;
      });
      setActive(id);
    };

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ---------- Année du copyright ---------- */
  doc.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Promotions ----------
     La liste est dans assets/js/promos.js. Les promos actives s'affichent dans la
     section de l'accueil, dans le bandeau défilant et en haut de la carte. */
  var TICKER_SPEED = 39;   // vitesse du bandeau défilant, en pixels par seconde
  var promos = activePromos(window.PROMOS);

  function clean(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  // Espaces insécables autour des nombres : « 1 boisson », « de 11h30 » restent sur la même ligne
  function keep(s) { return s.replace(/(\d) /g, "$1 ").replace(/ (\d)/g, " $1"); }
  function isOff(v) { return v === false || /^(false|non|0)$/i.test(clean(v)); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  // "01/11/2026" ou "2026-11-01" -> "2026-11-01"
  function isoDate(v) {
    var s = clean(v), m;
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + "-" + pad2(m[2]) + "-" + pad2(m[1]);
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return m[1] + "-" + pad2(m[2]) + "-" + pad2(m[3]);
    return "";
  }
  function parisDate() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    var get = function (type) {
      var part = parts.filter(function (p) { return p.type === type; })[0];
      return part ? part.value : "";
    };
    return get("year") + "-" + get("month") + "-" + get("day");
  }
  function activePromos(list) {
    if (!Array.isArray(list)) return [];
    var today = parisDate();
    return list.filter(function (p) {
      if (!p || isOff(p.actif) || !clean(p.titre)) return false;
      var from = isoDate(p.du), to = isoDate(p.au);
      return !(from && today < from) && !(to && today > to);
    });
  }

  var promoSection = doc.querySelector("[data-promos]");
  if (promoSection && promos.length) {
    promoSection.querySelector("[data-promos-list]").innerHTML = promos.map(function (p) {
      return '<li class="promo-item"><article class="promo">' +
        '<div class="promo-main">' +
          '<p class="promo-tag">Promo</p>' +
          (clean(p.quand) ? '<p class="promo-when">' + esc(keep(clean(p.quand))) + "</p>" : "") +
          '<h3 class="promo-title">' + esc(keep(clean(p.titre))) + "</h3>" +
          (clean(p.details) ? '<p class="promo-details">' + esc(keep(clean(p.details))) + "</p>" : "") +
        "</div>" +
        '<div class="promo-stub">' +
          '<a class="link-arrow" href="carte.html#commander">Commander <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
          '<a class="promo-phone" href="tel:+33493208108">ou au 04 93 20 81 08</a>' +
        "</div>" +
      "</article></li>";
    }).join("");
    promoSection.hidden = false;
    // Lien direct vers la section (ex. index.html#promotions depuis la carte) : elle était
    // encore cachée quand le navigateur a cherché l'ancre
    if (window.location.hash === "#promotions") {
      var jumpToPromos = function () {
        var html = doc.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        promoSection.scrollIntoView();
        html.style.scrollBehavior = prev;
        return window.scrollY;
      };
      var landed = jumpToPromos();
      window.addEventListener("load", function () {
        if (Math.abs(window.scrollY - landed) < 2) jumpToPromos();   // sauf si le visiteur a déjà défilé
      });
    }
  }
  doc.querySelectorAll("[data-promos-link]").forEach(function (a) { a.hidden = !promos.length; });

  var promoStrip = doc.querySelector("[data-promos-strip]");
  if (promoStrip && promos.length) {
    promoStrip.innerHTML = promos.map(function (p) {
      return '<p class="promo-strip-item"><span class="promo-tag">Promo</span>' +
        '<strong class="promo-strip-title">' + esc(keep(clean(p.titre))) + "</strong>" +
        (clean(p.quand) ? '<span class="promo-strip-when">' + esc(keep(clean(p.quand))) + "</span>" : "") + "</p>";
    }).join("");
    promoStrip.hidden = false;
  }

  // Bandeau défilant : les promos juste après « Ouvert / Fermé », dans les deux listes
  var tickerTrack = doc.querySelector(".header-ticker-track");
  if (tickerTrack && promos.length) {
    tickerTrack.querySelectorAll("ul").forEach(function (ul) {
      var ref = ul.firstElementChild ? ul.firstElementChild.nextElementSibling : null;
      promos.forEach(function (p) {
        var li = doc.createElement("li");
        li.className = "is-promo";
        li.textContent = clean(p.bandeau) || clean(p.titre);
        ul.insertBefore(li, ref);
      });
    });
    // Même vitesse de défilement, quelle que soit la longueur du bandeau
    var setTickerSpeed = function () {
      var list = tickerTrack.querySelector("ul");
      if (list && list.offsetWidth) tickerTrack.style.animationDuration = Math.round(list.offsetWidth / TICKER_SPEED) + "s";
    };
    setTickerSpeed();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(setTickerSpeed);
  }

  /* ---------- Apparition au défilement ----------
     Seuls les éléments encore hors écran sont masqués : sans JavaScript,
     ou si le visiteur réduit les animations, tout reste visible. */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    doc.querySelectorAll(".food-card, .menu-row, .drink-group, .menu-index-list li, .story-media, .perk, .promo-item, .about-facts > div, .condition, .steps li")
      .forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;
        var index = el.parentElement ? [].indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty("--reveal-delay", (index % 3) * 80 + "ms");
        el.classList.add("reveal");
        revealIO.observe(el);
      });
  }

  /* ==========================================================================
     Commande par WhatsApp
     Les plats, prix et descriptions sont lus directement dans la page :
     modifier un prix dans le HTML suffit, la commande suit.
     ========================================================================== */
  var ICON = {
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    minus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 6.5 12.5 13.5 4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></g></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-whatsapp"/></svg>'
  };

  function textOf(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  function parsePrice(text) {
    var n = parseFloat(String(text).replace(/[^\d,.]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  function money(n) { return n.toFixed(2).replace(".", ",") + " €"; }
  function moneyPlain(n) { return n.toFixed(2).replace(".", ",") + " €"; }
  function slug(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // « lardons ou poulet », « fruits rouges ou chocolat »… : le client devra préciser son choix
  function choiceHint(desc, whole) {
    if (!/\bou\b/i.test(desc)) return "";
    if (whole) return desc;
    var seg = desc.split(",").filter(function (s) { return /\bou\b/i.test(s); })[0];
    return seg ? seg.trim() : "";
  }

  /* ---- Catalogue : un bouton « Ajouter » par plat ---- */
  var catalogue = {};

  function register(item, host, small) {
    catalogue[item.id] = item;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "add-btn" + (small ? " add-btn--sm" : "");
    btn.setAttribute("data-add", item.id);
    btn.setAttribute("aria-label", "Ajouter " + item.name + " à la commande");
    btn.innerHTML = ICON.plus + (small ? "" : '<span class="add-label">Ajouter</span>');
    host.appendChild(btn);
  }

  function kindOf(el) {
    var holder = el.closest("[data-kind]");
    return holder ? holder.getAttribute("data-kind") : "autre";
  }

  doc.querySelectorAll(".food-card").forEach(function (card) {
    var foot = card.querySelector(".food-foot");
    var title = card.querySelector(".food-title h3");
    var priceEl = card.querySelector(".price");
    if (!foot || !title || !priceEl) return;
    var kind = kindOf(card);
    var base = textOf(title);
    var id = slug(kind + "-" + base);
    // Pizzas déjà « base blanche » (badge ou mention dans la catégorie) : pas d'option à proposer
    var blanche = /base blanche/i.test(textOf(card.querySelector(".food-title")) + " " + textOf(card.querySelector(".food-kicker")));
    // Garniture au choix : attribut data-choices="Lardons|Poulet" sur la carte du plat
    var choices = (card.getAttribute("data-choices") || "").split("|")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    register({
      id: id,
      name: kind === "bruschetta" ? "Bruschetta " + base : base,
      kind: kind,
      unit: parsePrice(priceEl.textContent),
      hint: choices.length ? "" : choiceHint(textOf(card.querySelector(".food-desc")), false),
      blanche: blanche,
      choices: choices
    }, foot, false);
    if (choices.length) {
      var picker = doc.createElement("div");
      picker.className = "choice-picker";
      picker.setAttribute("role", "radiogroup");
      picker.setAttribute("aria-label", "Au choix pour " + base);
      picker.innerHTML = '<span class="choice-label">Au choix</span>' + choices.map(function (c, n) {
        return '<label class="chip' + (n === 0 ? " is-on" : "") + '"><input type="radio" name="choix-' + id +
          '" value="' + esc(c) + '"' + (n === 0 ? " checked" : "") + ">" + esc(c) + "</label>";
      }).join("");
      foot.parentNode.insertBefore(picker, foot);
    }
  });

  // Pastilles « radio » : la pastille cochée passe en bleu
  function syncRadioChips(group) {
    if (!group) return;
    group.querySelectorAll("label").forEach(function (l) {
      var input = l.querySelector("input");
      l.classList.toggle("is-on", !!(input && input.checked));
    });
  }
  doc.addEventListener("change", function (e) {
    var picker = e.target.closest(".choice-picker");
    if (picker) syncRadioChips(picker);
  });

  doc.querySelectorAll(".menu-list .menu-row").forEach(function (row) {
    var kind = kindOf(row);
    var base = textOf(row.querySelector("h3"));
    var desc = textOf(row.querySelector(":scope > p"));
    row.querySelectorAll(".menu-prices li").forEach(function (li) {
      var size = textOf(li.querySelector(".size"));
      var name = size ? base + " (" + size + ")" : base;
      register({
        id: slug(kind + "-" + name),
        name: name,
        kind: kind,
        unit: parsePrice(textOf(li.querySelector(".price"))),
        hint: choiceHint(desc, true) || (kind === "tex-mex" ? "sauce ketchup, mayonnaise ou barbecue" : "")
      }, li, true);
    });
  });

  doc.querySelectorAll(".drink-group").forEach(function (group) {
    var heading = textOf(group.querySelector("h3"));
    var groupSize = (heading.match(/\d+(?:,\d+)?\s?(?:cl|L)\b/) || [""])[0];
    group.querySelectorAll("li").forEach(function (li) {
      var nameEl = li.querySelector(".drink-name");
      var priceEl = li.querySelector(".price");
      if (!nameEl || !priceEl) return;
      var main = textOf(nameEl.firstChild);
      var small = textOf(nameEl.querySelector("small"));
      var isChoice = /\bou\b/i.test(small);
      var name = main;
      if (groupSize && main.indexOf(groupSize) === -1 && small.indexOf(groupSize) === -1) name += " " + groupSize;
      if (small && !isChoice) name += " (" + small.charAt(0).toLowerCase() + small.slice(1) + ")";
      var end = doc.createElement("span");
      end.className = "line-end";
      li.insertBefore(end, priceEl);
      end.appendChild(priceEl);
      register({
        id: slug("boisson-" + name),
        name: name,
        kind: "boisson",
        unit: parsePrice(priceEl.textContent),
        hint: isChoice ? small : "",
        alcool: group.hasAttribute("data-alcool")   // bières et vins : rappel « interdit aux mineurs »
      }, end, true);
    });
  });

  /* ---- Suppléments : liste à plat, et liste dépliable sur la carte ---- */
  var SUPPS = [];
  var SUPP_GROUPS = Object.keys(SUPPLEMENTS).filter(function (groupe) {
    Object.keys(SUPPLEMENTS[groupe]).forEach(function (nom) {
      var prix = SUPPLEMENTS[groupe][nom];
      SUPPS.push({ nom: nom, groupe: groupe, prix: typeof prix === "number" && prix >= 0 ? prix : null });
    });
    return Object.keys(SUPPLEMENTS[groupe]).length > 0;
  });

  var suppList = doc.querySelector("[data-supplements-list]");
  if (suppList && SUPPS.length) {
    suppList.querySelector(".supps-list-body").innerHTML = SUPP_GROUPS.map(function (g) {
      return '<div class="supps-group"><h3>' + esc(g) + "</h3><ul>" +
        SUPPS.filter(function (s) { return s.groupe === g; }).map(function (s) {
          return "<li><span>" + esc(s.nom) + "</span>" +
            (s.prix !== null ? '<span class="price">' + esc(s.prix === 0 ? "offert" : money(s.prix)) + "</span>" : "") + "</li>";
        }).join("") + "</ul></div>";
    }).join("");
    var priced = SUPPS.filter(function (s) { return s.prix > 0; }).map(function (s) { return s.prix; });
    var offered = SUPPS.some(function (s) { return s.prix === 0; });
    suppList.querySelector("[data-supplements-meta]").textContent = SUPPS.length + " ingrédients · " +
      (priced.length ? "dès " + money(Math.min.apply(null, priced)) + (offered ? " · certains offerts" : "") : "tarifs à venir");
    suppList.hidden = false;
  }

  /* ---- Tableau des allergènes (carte), données dans assets/js/allergenes.js ----
     Pizzas et bruschettas : allergènes de la base + ceux des ingrédients cités dans
     la description. Autres plats : liste donnée plat par plat. */
  var allergenBox = doc.querySelector("[data-allergens-table]");
  if (allergenBox && window.ALLERGENES) renderAllergens(allergenBox, window.ALLERGENES);

  function renderAllergens(box, A) {
    var LIST = ["Gluten", "Crustacés", "Œufs", "Poissons", "Arachides", "Soja", "Lait", "Fruits à coque",
      "Céleri", "Moutarde", "Sésame", "Sulfites", "Lupin", "Mollusques"];
    var norm = function (s) {
      return String(s).toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/’/g, "'").replace(/\s+/g, " ").trim();
    };
    var keys = LIST.map(norm);
    var verified = A.verifie === true;
    // Ajoute une liste comme ["lait", "?soja"] : un allergène sûr l'emporte sur un « ? »
    function add(acc, list) {
      (list || []).forEach(function (raw) {
        var s = String(raw).trim(), unsure = s.charAt(0) === "?";
        var i = keys.indexOf(norm(unsure ? s.slice(1) : s));
        if (i === -1) return;
        if (!unsure || verified) acc[i] = true;
        else if (acc[i] !== true) acc[i] = "?";
      });
      return acc;
    }
    var ingredients = Object.keys(A.ingredients || {}).map(function (k) { return { key: norm(k), list: A.ingredients[k] }; });
    var plats = {};
    Object.keys(A.plats || {}).forEach(function (k) { plats[norm(k)] = A.plats[k]; });

    function dish(el, kind) {
      var name = textOf(el.querySelector(".food-title h3") || el.querySelector("h3"));
      var listed = plats[norm(name)];
      if (listed) return { name: name, acc: add({}, listed) };
      if (!kind || !A.base || !A.base[kind]) return { name: name, acc: null };   // non renseigné
      var acc = add({}, A.base[kind]);
      var desc = norm(textOf(el.querySelector(".food-desc")));
      ingredients.forEach(function (it) { if (desc.indexOf(it.key) !== -1) add(acc, it.list); });
      return { name: name, acc: acc };
    }
    var groups = [];
    function section(id, selector, kind) {
      var sec = doc.getElementById(id);
      if (!sec) return;
      groups.push({
        title: textOf(sec.querySelector("h2")),
        rows: [].map.call(sec.querySelectorAll(selector), function (el) { return dish(el, kind); })
      });
    }
    section("classiques", ".food-card", "pizza");
    section("monde", ".food-card", "pizza");
    section("bruschettas", ".food-card", "bruschetta");
    section("enfants", ".food-card", null);
    section("tex-mex", ".menu-row", null);
    if (A.sauces) {
      groups.push({ title: "Sauces du Tex-Mex", rows: Object.keys(A.sauces).map(function (k) { return { name: k, acc: add({}, A.sauces[k]) }; }) });
    }
    section("desserts", ".menu-row", null);
    section("boissons", ".drink-group", null);

    var cols = LIST.length + 1;
    var head = '<tr><th scope="col" class="allergens-dish">Plat</th>' +
      LIST.map(function (a) { return '<th scope="col"><span>' + esc(a) + "</span></th>"; }).join("") + "</tr>";
    var body = groups.map(function (g) {
      return '<tr class="allergens-group"><th scope="colgroup" colspan="' + cols + '"><span>' + esc(g.title) + "</span></th></tr>" +
        g.rows.map(function (r) {
          if (!r.acc) {
            return '<tr><th scope="row">' + esc(r.name) + '</th><td colspan="' + LIST.length + '" class="allergens-missing">À demander au 04 93 20 81 08</td></tr>';
          }
          return '<tr><th scope="row">' + esc(r.name) + "</th>" + LIST.map(function (a, i) {
            if (r.acc[i] === true) return '<td class="is-yes"><span aria-hidden="true">●</span><span class="sr-only">oui</span></td>';
            if (r.acc[i] === "?") return '<td class="is-maybe"><span aria-hidden="true">?</span><span class="sr-only">à confirmer</span></td>';
            return "<td></td>";
          }).join("") + "</tr>";
        }).join("");
    }).join("");
    box.innerHTML = '<table class="allergens-table"><caption class="sr-only">Allergènes présents dans chaque plat</caption>' +
      "<thead>" + head + "</thead><tbody>" + body + "</tbody></table>";
    var draft = doc.querySelector("[data-allergens-draft]");
    if (draft) draft.hidden = verified;
  }

  /* ---- Panier, conservé sur l'appareil du client ---- */
  var DEFAULT_FORM = {
    mode: "livraison", name: "", address: "", city: ZONES[0], time: "",
    payment: "especes", bill50: false, coupons: false, note: "", remember: false
  };

  // Coordonnées mémorisées : seulement si le client coche « Mémoriser mes coordonnées sur cet appareil ».
  // Elles restent dans son navigateur, avec sa dernière commande ; rien n'est envoyé en ligne.
  var REMEMBERED = ["mode", "name", "address", "city", "payment"];
  var client = loadClient();
  var cart = loadCart();

  function loadClient() {
    try {
      var data = JSON.parse(window.localStorage.getItem(CLIENT_KEY) || "null");
      if (data && data.form) return data;
    } catch (e) { /* stockage indisponible */ }
    return null;
  }
  function saveClient() {
    var data = { form: {}, last: { date: new Date().toISOString(), items: cart.items } };
    REMEMBERED.forEach(function (k) { data.form[k] = cart.form[k]; });
    try {
      window.localStorage.setItem(CLIENT_KEY, JSON.stringify(data));
      client = JSON.parse(JSON.stringify(data));
    } catch (e) { /* ignoré */ }
  }
  function forgetClient() {
    try { window.localStorage.removeItem(CLIENT_KEY); } catch (e) { /* ignoré */ }
    client = null;
  }
  // Panier vide, pré-rempli avec les coordonnées mémorisées s'il y en a
  function freshCart() {
    var form = Object.assign({}, DEFAULT_FORM);
    if (client) {
      REMEMBERED.forEach(function (k) { if (client.form[k] !== undefined) form[k] = client.form[k]; });
      form.remember = true;
    }
    return { items: [], form: form };
  }
  function loadCart() {
    try {
      var data = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null");
      if (data && Array.isArray(data.items)) {
        if (data.sentAt) {
          // Commande déjà envoyée : on repart d'un panier vide, et on efface l'ancienne de l'appareil
          var fresh = freshCart();
          window.localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
          return fresh;
        }
        data.form = Object.assign({}, DEFAULT_FORM, data.form || {});
        return data;
      }
    } catch (e) { /* stockage indisponible : panier en mémoire */ }
    return freshCart();
  }
  function saveCart() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* ignoré */ }
  }
  // Prix et noms à jour si le plat est présent sur la page
  function refreshItem(it) {
    var c = catalogue[it.id];
    if (c) { it.unit = c.unit; it.name = c.name; it.hint = c.hint; it.blanche = c.blanche; it.choices = c.choices; it.alcool = !!c.alcool; }
  }
  cart.items.forEach(refreshItem);

  function lineName(it) { return it.name + (it.choice ? " (" + it.choice.toLowerCase() + ")" : ""); }
  function missingChoice(it) { return !!(it.choices && it.choices.length && it.choices.indexOf(it.choice) === -1); }

  function suppOf(name) {
    return SUPPS.filter(function (s) { return s.nom === name; })[0] || null;
  }
  // Prix affiché d'un supplément : « +1,50 € », ou « offert » s'il est gratuit
  function suppPriceText(p) { return p === 0 ? "offert" : "+" + moneyPlain(p); }
  // Suppléments choisis encore présents dans la liste
  function lineSupps(it) {
    return (it.supps || []).filter(function (n) { return !!suppOf(n); });
  }
  // Suppléments proposés sur les pizzas et les bruschettas
  function takesSupps(it) { return it.kind === "pizza" || it.kind === "bruschetta"; }
  // Un supplément sans prix (null) est envoyé « prix à confirmer »
  function unpricedSupps(it) {
    return takesSupps(it) && lineSupps(it).some(function (n) { return suppOf(n).prix === null; });
  }
  function lineUnit(it) {
    if (!takesSupps(it)) return it.unit;
    return it.unit + (it.kind === "pizza" && it.opts.epaisse ? EXTRA_EPAISSE : 0) +
      lineSupps(it).reduce(function (sum, n) { return sum + (suppOf(n).prix || 0); }, 0);
  }

  function totals() {
    var count = 0, sub = 0, pizzas = [], unpriced = false;
    cart.items.forEach(function (it) {
      count += it.qty;
      sub += lineUnit(it) * it.qty;
      if (it.kind === "pizza") for (var i = 0; i < it.qty; i++) pizzas.push(it.unit);
      if (unpricedSupps(it)) unpriced = true;
    });
    var discount = 0, couponNote = "";
    if (cart.form.coupons) {
      if (!pizzas.length) couponNote = "Ajoutez au moins une pizza pour utiliser vos coupons.";
      else if (count < 2) couponNote = "La pizza offerte doit être accompagnée d’un achat.";
      else discount = Math.min.apply(null, pizzas);
    }
    return { count: count, sub: sub, discount: discount, total: Math.max(0, sub - discount), couponNote: couponNote, unpriced: unpriced };
  }

  function addItem(id, choice) {
    var c = catalogue[id];
    if (!c) return;
    choice = choice || (c.choices && c.choices[0]) || "";
    var line = cart.items.filter(function (it) {
      return it.id === id && (it.choice || "") === choice &&
        !it.opts.epaisse && !it.opts.blanche && !it.opts.cuisson && !it.note && !lineSupps(it).length;
    })[0];
    if (line) line.qty += 1;
    else cart.items.push({
      id: id, name: c.name, kind: c.kind, unit: c.unit, hint: c.hint, blanche: !!c.blanche, alcool: !!c.alcool,
      choices: c.choices || [], choice: choice, qty: 1,
      opts: { epaisse: false, blanche: false, cuisson: "" }, note: ""
    });
    saveCart();
    renderLines();
    renderTotals(true);
    var t = totals();
    announce(c.name + (choice ? " (" + choice.toLowerCase() + ")" : "") + " ajouté à la commande. " +
      t.count + " article" + (t.count > 1 ? "s" : "") + ", " + moneyPlain(t.total) + ".");
  }

  /* ---- Interface : bouton panier, panneau, formulaire ---- */
  var live = doc.createElement("p");
  live.className = "sr-only";
  live.setAttribute("aria-live", "polite");
  doc.body.appendChild(live);
  function announce(msg) { live.textContent = ""; window.setTimeout(function () { live.textContent = msg; }, 60); }

  var fab = doc.createElement("button");
  fab.type = "button";
  fab.className = "cart-fab";
  fab.innerHTML = ICON.bag + '<span>Ma commande</span><span class="cart-count">0</span><span class="cart-sum">0,00 €</span>';
  doc.body.appendChild(fab);

  var callbar = doc.querySelector(".callbar");
  var callbarBtn = null;
  if (callbar) {
    callbarBtn = doc.createElement("button");
    callbarBtn.type = "button";
    callbarBtn.className = "btn callbar-cart";
    callbarBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:10px">' + ICON.bag + 'Ma commande <span class="cart-count">0</span></span><span class="cart-sum">0,00 €</span>';
    callbar.insertBefore(callbarBtn, callbar.firstChild);
  }

  var backdrop = doc.createElement("div");
  backdrop.className = "cart-backdrop";
  doc.body.appendChild(backdrop);

  var zoneOptions = ZONES.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + "</option>"; }).join("");
  var drawer = doc.createElement("aside");
  drawer.className = "cart-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "cart-title");
  drawer.innerHTML =
    '<div class="cart-head"><h2 id="cart-title">Ma commande</h2>' +
      '<button type="button" class="cart-close" aria-label="Fermer la commande">' + ICON.close + "</button></div>" +
    '<div class="cart-body">' +
      '<p class="cart-notice" data-closed-notice hidden></p>' +
      '<div class="cart-empty" hidden><p>Votre commande est vide. Ajoutez des pizzas, du Tex-Mex ou des boissons avec les boutons +.</p>' +
        '<a class="btn btn-blue" href="carte.html">Voir la carte</a>' +
        '<button type="button" class="btn btn-ghost-dark btn-reorder" data-reorder hidden></button></div>' +
      '<div class="cart-filled">' +
        '<ul class="cart-lines"></ul>' +
        '<div class="cart-totals"></div>' +
        '<p class="cart-alcohol" data-alcohol-note hidden>Votre commande contient de l’alcool&nbsp;: la vente est interdite aux mineurs de moins de 18 ans, une pièce d’identité peut vous être demandée. L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>' +
        '<form class="cart-form" novalidate>' +
          '<p class="cart-remembered" data-remembered hidden><span data-remembered-text></span> ' +
            '<button type="button" class="link-btn" data-forget>Effacer mes informations</button></p>' +
          "<h3>Livraison ou à emporter</h3>" +
          '<div class="segmented" role="radiogroup" aria-label="Mode de commande">' +
            '<label><input type="radio" name="mode" value="livraison">Livraison</label>' +
            '<label><input type="radio" name="mode" value="emporter">À emporter</label></div>' +
          '<div class="field"><label class="field-label" for="cmd-name">Nom</label>' +
            '<input class="field-input" id="cmd-name" name="name" autocomplete="name" maxlength="60">' +
            '<p class="field-error" data-error="name" hidden>Indiquez votre nom.</p></div>' +
          '<div class="field" data-when="livraison"><label class="field-label" for="cmd-address">Adresse de livraison</label>' +
            '<input class="field-input" id="cmd-address" name="address" autocomplete="street-address" maxlength="160" placeholder="N°, rue, bâtiment, étage, digicode">' +
            '<p class="field-error" data-error="address" hidden>Indiquez l’adresse de livraison.</p></div>' +
          '<div class="field" data-when="livraison"><label class="field-label" for="cmd-city">Commune</label>' +
            '<select class="field-input" id="cmd-city" name="city">' + zoneOptions + "</select>" +
            '<p class="field-note">Livraison gratuite.</p></div>' +
          '<div class="field" data-when="emporter"><p class="field-note">À retirer au 52 avenue de Grasse, 06800 Cagnes-sur-Mer.</p></div>' +
          '<div class="field"><label class="field-label" for="cmd-time">Heure souhaitée <small>(facultatif)</small></label>' +
            '<input class="field-input" id="cmd-time" name="time" type="time" step="300">' +
            '<p class="field-note">Laissez vide pour « dès que possible ».</p></div>' +
          "<h3>Paiement</h3>" +
          '<div class="field"><label class="field-label" for="cmd-payment">Moyen de paiement</label>' +
            '<select class="field-input" id="cmd-payment" name="payment">' +
              '<option value="especes">Espèces</option><option value="cb">Carte bancaire</option><option value="tr">Tickets restaurant</option>' +
            "</select></div>" +
          '<label class="check" data-when-pay="especes"><input type="checkbox" name="bill50"><span>Je paierai avec un billet de 50 €' +
            "<small>Les billets de 100, 200 et 500 € ne sont pas acceptés.</small></span></label>" +
          '<label class="check"><input type="checkbox" name="coupons"><span>J’utilise mes 15 coupons rouges' +
            "<small>1 pizza offerte : la moins chère de la commande.</small></span></label>" +
          '<p class="field-error" data-coupon-note hidden></p>' +
          '<div class="field"><label class="field-label" for="cmd-note">Remarque <small>(facultatif)</small></label>' +
            '<textarea class="field-input" id="cmd-note" name="note" rows="3" maxlength="300" placeholder="Allergies, interphone, code d’accès…"></textarea>' +
            '<p class="field-note">Une allergie&nbsp;? Précisez-la ici et consultez le <a href="carte.html#allergenes">tableau des allergènes</a>.</p></div>' +
          '<label class="check check-remember"><input type="checkbox" name="remember"><span>Mémoriser mes coordonnées sur cet appareil' +
            "<small>Nom, adresse et paiement pré-remplis la prochaine fois, et votre dernière commande à reprendre en un clic. " +
            "Tout reste sur cet appareil&nbsp;: rien n’est envoyé en ligne.</small></span></label>" +
        "</form>" +
      "</div>" +
      '<div class="cart-done" hidden>' +
        '<span class="cart-done-icon">' + ICON.check + "</span>" +
        "<h3>Votre commande est prête dans WhatsApp</h3>" +
        "<p>Il ne reste qu’à appuyer sur « Envoyer » dans WhatsApp. Nous vous répondons pour confirmer la commande et le délai.</p>" +
        '<div class="cart-done-actions"><button type="button" class="btn btn-blue" data-new-order>Nouvelle commande</button>' +
          '<button type="button" class="btn btn-ghost-dark" data-back>Revoir ma commande</button></div>' +
      "</div>" +
    "</div>" +
    '<div class="cart-foot">' +
      '<p class="cart-foot-total"><span data-foot-label>Total estimé</span><strong data-foot-total>0,00 €</strong></p>' +
      '<p class="field-error" data-foot-error role="alert" hidden></p>' +
      '<a class="btn btn-send" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + ICON.whatsapp + "Envoyer sur WhatsApp</a>" +
      '<p class="footnote">WhatsApp s’ouvre avec votre commande déjà écrite. En l’envoyant, vous acceptez nos <a href="mentions-legales.html#conditions">conditions de vente</a>.</p>' +
    "</div>";
  doc.body.appendChild(drawer);

  var linesEl = drawer.querySelector(".cart-lines");
  var totalsEl = drawer.querySelector(".cart-totals");
  var form = drawer.querySelector(".cart-form");
  var emptyEl = drawer.querySelector(".cart-empty");
  var filledEl = drawer.querySelector(".cart-filled");
  var doneEl = drawer.querySelector(".cart-done");
  var footEl = drawer.querySelector(".cart-foot");
  var sendBtn = drawer.querySelector(".btn-send");
  var footError = drawer.querySelector("[data-foot-error]");

  function chip(i, opt, label, on) {
    return '<label class="chip' + (on ? " is-on" : "") + '"><input type="checkbox" data-line="' + i +
      '" data-opt="' + opt + '"' + (on ? " checked" : "") + ">" + esc(label) + "</label>";
  }
  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (value === selected ? " selected" : "") + ">" + esc(label) + "</option>";
  }

  // Menu déroulant « Ajouter un supplément » (par famille) et suppléments choisis, retirables
  function suppsBlock(it, i) {
    if (!SUPPS.length) return "";
    var chosen = lineSupps(it);
    var select = '<select class="supp-select" data-line="' + i + '" data-supp-add aria-label="Ajouter un supplément : ' + esc(it.name) + '">' +
      '<option value="">+ Ajouter un supplément</option>' +
      SUPP_GROUPS.map(function (g) {
        return '<optgroup label="' + esc(g) + '">' + SUPPS.filter(function (s) { return s.groupe === g; }).map(function (s) {
          var on = chosen.indexOf(s.nom) !== -1;
          return '<option value="' + esc(s.nom) + '"' + (on ? " disabled" : "") + ">" + esc(s.nom) +
            (s.prix !== null ? " (" + esc(suppPriceText(s.prix)) + ")" : "") + (on ? " ✓" : "") + "</option>";
        }).join("") + "</optgroup>";
      }).join("") + "</select>";
    var list = chosen.length
      ? '<ul class="supp-chosen">' + chosen.map(function (n) {
          var p = suppOf(n).prix;
          return '<li><span class="supp-name">' + esc(n) + (p !== null ? " <small>" + esc(suppPriceText(p)) + "</small>" : "") + "</span>" +
            '<button type="button" class="supp-remove" data-line="' + i + '" data-supp-remove="' + esc(n) + '" aria-label="Retirer le supplément ' + esc(n) + '">' +
            ICON.close + "</button></li>";
        }).join("") + "</ul>"
      : "";
    var note = unpricedSupps(it) ? '<p class="supp-note">Prix ' + (chosen.length > 1 ? "des suppléments" : "du supplément") + " confirmé par le restaurant.</p>" : "";
    return '<div class="supps">' + select + list + note + "</div>";
  }
  function refreshLine(i, focusSel) {
    saveCart();
    renderLines();
    renderTotals(false);
    var el = linesEl.querySelector('[data-index="' + i + '"] ' + focusSel);
    if (el) el.focus();
  }

  function renderLines() {
    linesEl.innerHTML = cart.items.map(function (it, i) {
      var isPizza = it.kind === "pizza";
      var options = (isPizza
        ? '<div class="chips">' +
            chip(i, "epaisse", "Pâte épaisse +" + moneyPlain(EXTRA_EPAISSE), it.opts.epaisse) +
            (it.blanche ? "" : chip(i, "blanche", "Base blanche", it.opts.blanche)) +
            '<select class="chip-select" data-line="' + i + '" data-opt="cuisson" aria-label="Cuisson : ' + esc(it.name) + '">' +
              option("", "Cuisson normale", it.opts.cuisson) +
              option("bien dorée", "Bien dorée", it.opts.cuisson) +
              option("pas trop cuite", "Pas trop cuite", it.opts.cuisson) +
            "</select></div>"
        : "") + (takesSupps(it) ? suppsBlock(it, i) : "");
      var hint = it.hint ? "Précisez : " + it.hint : (takesSupps(it) ? "Précision (ex. sans olives)" : "Précision (facultatif)");
      var choiceGroup = it.choices && it.choices.length
        ? '<div class="chips choice-picker" role="radiogroup" aria-label="Au choix : ' + esc(it.name) + '">' +
            '<span class="choice-label">Au choix</span>' +
            it.choices.map(function (c) {
              var on = it.choice === c;
              return '<label class="chip' + (on ? " is-on" : "") + '"><input type="radio" name="ligne-' + i +
                '" data-line="' + i + '" data-choice="' + esc(c) + '"' + (on ? " checked" : "") + ">" + esc(c) + "</label>";
            }).join("") + "</div>"
        : "";
      return '<li class="cart-line" data-index="' + i + '">' +
        '<div class="cart-line-top"><div><p class="cart-line-name">' + esc(it.name) + "</p>" +
          '<p class="cart-line-unit">' + money(lineUnit(it)) + " l’unité</p></div>" +
          '<p class="cart-line-total">' + money(lineUnit(it) * it.qty) + "</p></div>" +
        choiceGroup +
        options +
        '<input class="field-input line-note" type="text" maxlength="120" data-line="' + i + '" data-opt="note" value="' +
          esc(it.note) + '" placeholder="' + esc(hint) + '" aria-label="Précision : ' + esc(it.name) + '">' +
        '<div class="cart-line-ctrl"><div class="qty">' +
          '<button type="button" data-qty="-1" data-line="' + i + '" aria-label="Un ' + esc(it.name) + ' de moins">' + ICON.minus + "</button>" +
          '<span class="qty-value">' + it.qty + "</span>" +
          '<button type="button" data-qty="1" data-line="' + i + '" aria-label="Un ' + esc(it.name) + ' de plus">' + ICON.plus + "</button></div>" +
          '<button type="button" class="cart-remove" data-remove="' + i + '">Supprimer</button></div>' +
      "</li>";
    }).join("");
  }

  function updateLine(i) {
    var it = cart.items[i];
    var li = linesEl.querySelector('[data-index="' + i + '"]');
    if (!it || !li) return;
    li.querySelector(".cart-line-unit").textContent = money(lineUnit(it)) + " l’unité";
    li.querySelector(".cart-line-total").textContent = money(lineUnit(it) * it.qty);
    li.querySelector(".qty-value").textContent = String(it.qty);
  }

  function renderTotals(bumpIt) {
    var t = totals();
    var has = t.count > 0;
    totalsEl.innerHTML =
      (t.discount
        ? "<div><span>Sous-total</span><span>" + money(t.sub) + "</span></div>" +
          '<div class="discount"><span>Pizza offerte (15 coupons)</span><span>−' + money(t.discount) + "</span></div>"
        : "") +
      '<div class="grand"><span>Total estimé' + (t.unpriced ? " <small>hors suppléments</small>" : "") + "</span><span>" + money(t.total) + "</span></div>" +
      '<p class="cart-totals-note">Le restaurant vous confirme le montant sur WhatsApp.</p>';
    drawer.querySelector("[data-foot-total]").textContent = money(t.total);
    drawer.querySelector("[data-foot-label]").textContent = t.unpriced ? "Total estimé, hors suppléments" : "Total estimé";
    var couponNote = drawer.querySelector("[data-coupon-note]");
    couponNote.textContent = t.couponNote;
    couponNote.hidden = !t.couponNote;
    drawer.querySelector("[data-alcohol-note]").hidden = !cart.items.some(function (it) { return it.alcool; });

    [fab, callbarBtn].forEach(function (el) {
      if (!el) return;
      el.querySelector(".cart-count").textContent = String(t.count);
      el.querySelector(".cart-sum").textContent = money(t.total);
      el.setAttribute("aria-label", "Ouvrir ma commande : " + t.count + " article" + (t.count > 1 ? "s" : "") + ", " + moneyPlain(t.total));
      if (bumpIt && !reduceMotion) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }
    });
    fab.classList.toggle("is-visible", has);
    if (callbar) callbar.classList.toggle("has-cart", has);
    doc.body.classList.toggle("has-cart", has);

    var showDone = !doneEl.hidden;
    emptyEl.hidden = has || showDone;
    filledEl.hidden = !has || showDone;
    footEl.hidden = !has || showDone;

    // « Reprendre ma dernière commande », si elle a été mémorisée
    var reorder = emptyEl.querySelector("[data-reorder]");
    var last = client && client.last && Array.isArray(client.last.items) ? client.last.items : [];
    var n = last.reduce(function (sum, it) { return sum + (it.qty || 0); }, 0);
    reorder.hidden = !n;
    if (n) reorder.textContent = "Reprendre ma dernière commande (" + n + " article" + (n > 1 ? "s" : "") + ")";
  }

  function syncForm() {
    var f = cart.form;
    form.querySelectorAll('input[name="mode"]').forEach(function (r) {
      r.checked = r.value === f.mode;
      r.parentElement.classList.toggle("is-on", r.checked);
    });
    ["name", "address", "city", "time", "payment", "note"].forEach(function (k) {
      var el = form.elements[k];
      if (el) el.value = f[k];
    });
    form.elements.bill50.checked = !!f.bill50;
    form.elements.coupons.checked = !!f.coupons;
    form.elements.remember.checked = !!f.remember;
    var memo = form.querySelector("[data-remembered]");
    memo.hidden = !client;
    if (client) {
      var who = (client.form.name || "").trim();
      form.querySelector("[data-remembered-text]").textContent =
        (who ? "Bonjour " + who + " ! " : "") + "Vos coordonnées mémorisées sont pré-remplies.";
    }
    form.querySelectorAll("[data-when]").forEach(function (el) { el.hidden = el.getAttribute("data-when") !== f.mode; });
    form.querySelectorAll("[data-when-pay]").forEach(function (el) { el.hidden = el.getAttribute("data-when-pay") !== f.payment; });
  }

  function buildMessage() {
    var t = totals();
    var f = cart.form;
    var L = ["*Commande Pizza World Cagnes-sur-Mer*", ""];
    cart.items.forEach(function (it) {
      L.push(it.qty + " × " + lineName(it) + " — " + moneyPlain(lineUnit(it) * it.qty));
      var extras = [];
      if (it.kind === "pizza" && it.opts.epaisse) extras.push("pâte épaisse (+" + moneyPlain(EXTRA_EPAISSE) + ")");
      var supps = takesSupps(it) ? lineSupps(it) : [];
      if (supps.length) {
        extras.push((supps.length > 1 ? "suppléments : " : "supplément : ") + supps.map(function (n) {
          var p = suppOf(n).prix;
          return n + (p !== null ? " (" + suppPriceText(p) + ")" : " (prix à confirmer)");
        }).join(", "));
      }
      if (it.kind === "pizza") {
        if (it.opts.blanche) extras.push("base blanche");
        if (it.opts.cuisson) extras.push("cuisson " + it.opts.cuisson);
      }
      if (it.note.trim()) extras.push(it.note.trim());
      if (extras.length) L.push("    · " + extras.join(", "));
    });
    L.push("");
    if (t.discount) {
      L.push("Sous-total : " + moneyPlain(t.sub));
      L.push("Pizza offerte (15 coupons rouges) : −" + moneyPlain(t.discount));
    }
    L.push("*Total estimé : " + moneyPlain(t.total) + "*" + (t.unpriced ? " (hors suppléments)" : ""), "");
    if (f.mode === "livraison") L.push("*Livraison* : " + f.address.trim() + ", " + f.city);
    else L.push("*À emporter* (52 avenue de Grasse)");
    L.push("Nom : " + f.name.trim());
    L.push("Heure souhaitée : " + (f.time ? f.time.replace(":", "h") : "dès que possible"));
    var pay = { especes: "espèces", cb: "carte bancaire", tr: "tickets restaurant" }[f.payment] || f.payment;
    if (f.payment === "cb" && f.mode === "livraison") pay += " (merci d’apporter le terminal de paiement)";
    if (f.payment === "especes" && f.bill50) pay += " (je paierai avec un billet de 50 €)";
    L.push("Paiement : " + pay);
    if (f.coupons) L.push("J’utilise mes 15 coupons rouges : 1 pizza offerte");
    if (f.note.trim()) L.push("Remarque : " + f.note.trim());
    L.push("", "Merci de me confirmer la commande et le délai.");
    return L.join("\n");
  }

  function validate() {
    var f = cart.form;
    var problems = [];
    var checks = [
      { key: "name", ok: f.name.trim().length > 0 },
      { key: "address", ok: f.mode !== "livraison" || f.address.trim().length > 4 }
    ];
    // Plats à garniture au choix (ex. lardons ou poulet) : le choix est obligatoire
    var missing = cart.items.filter(missingChoice)[0];
    if (missing) {
      footError.textContent = "Choisissez " + missing.choices.join(" ou ").toLowerCase() + " pour " + missing.name + ".";
      var radio = linesEl.querySelector('[data-index="' + cart.items.indexOf(missing) + '"] [data-choice]');
      if (radio) problems.push(radio);
    }
    footError.hidden = !missing;
    checks.forEach(function (c) {
      var input = form.elements[c.key];
      var err = form.querySelector('[data-error="' + c.key + '"]');
      input.setAttribute("aria-invalid", c.ok ? "false" : "true");
      if (err) err.hidden = c.ok;
      if (!c.ok) problems.push(input);
    });
    if (problems.length) problems[0].focus();
    return problems.length === 0 && !missing;
  }

  /* ---- Ouverture / fermeture ---- */
  var lastFocus = null;

  function openCart() {
    lastFocus = doc.activeElement;
    doneEl.hidden = true;
    renderLines();
    syncForm();
    renderTotals(false);
    var notice = drawer.querySelector("[data-closed-notice]");
    if (currentStatus && !currentStatus.open) {
      notice.textContent = "Nous sommes fermés pour le moment (" + currentStatus.label.replace("Fermé · ", "") +
        "). Vous pouvez préparer votre commande et choisir une heure.";
      notice.hidden = false;
    } else {
      notice.hidden = true;
    }
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    doc.body.classList.add("cart-open");
    setNav(false);
    window.setTimeout(function () { drawer.querySelector(".cart-close").focus(); }, 50);
  }

  function closeCart() {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    doc.body.classList.remove("cart-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  fab.addEventListener("click", openCart);
  if (callbarBtn) callbarBtn.addEventListener("click", openCart);
  backdrop.addEventListener("click", closeCart);
  drawer.querySelector(".cart-close").addEventListener("click", closeCart);
  doc.querySelectorAll("[data-open-cart]").forEach(function (el) { el.addEventListener("click", openCart); });

  doc.addEventListener("keydown", function (e) {
    if (!drawer.classList.contains("is-open")) return;
    if (e.key === "Escape") { closeCart(); return; }
    if (e.key !== "Tab") return;
    var focusable = [].filter.call(
      drawer.querySelectorAll("a[href], button, input, select, textarea"),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---- Boutons « Ajouter » ---- */
  doc.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    var picked = btn.closest(".food-card, .hero-spin");
    picked = picked && picked.querySelector(".choice-picker input:checked");
    addItem(btn.getAttribute("data-add"), picked ? picked.value : "");
    btn.classList.add("is-added");
    var plus = btn.querySelector("svg");
    if (plus) plus.outerHTML = ICON.check;
    var label = btn.querySelector(".add-label");
    if (label) label.textContent = "Ajouté";
    window.clearTimeout(btn._pwTimer);
    btn._pwTimer = window.setTimeout(function () {
      btn.classList.remove("is-added");
      var check = btn.querySelector("svg");
      if (check) check.outerHTML = ICON.plus;
      if (label) label.textContent = "Ajouter";
    }, 1300);
  });

  /* ---- Lignes du panier ---- */
  drawer.addEventListener("click", function (e) {
    var q = e.target.closest("[data-qty]");
    var rm = e.target.closest("[data-remove]");
    var rmSupp = e.target.closest("[data-supp-remove]");
    if (rmSupp) {
      var at = Number(rmSupp.getAttribute("data-line"));
      var line = cart.items[at];
      var name = rmSupp.getAttribute("data-supp-remove");
      if (!line) return;
      line.supps = lineSupps(line).filter(function (n) { return n !== name; });
      refreshLine(at, "[data-supp-add]");
      announce(name + " retiré des suppléments.");
    } else if (q) {
      var i = Number(q.getAttribute("data-line"));
      var it = cart.items[i];
      if (!it) return;
      it.qty += Number(q.getAttribute("data-qty"));
      if (it.qty <= 0) {
        cart.items.splice(i, 1);
        renderLines();
        var next = linesEl.querySelector("[data-qty]") || drawer.querySelector(".cart-close");
        next.focus();
      } else {
        updateLine(i);
      }
      saveCart();
      renderTotals(false);
    } else if (rm) {
      cart.items.splice(Number(rm.getAttribute("data-remove")), 1);
      saveCart();
      renderLines();
      renderTotals(false);
      (linesEl.querySelector("[data-remove]") || drawer.querySelector(".cart-close")).focus();
    } else if (e.target.closest("[data-new-order]")) {
      cart = freshCart();
      saveCart();
      doneEl.hidden = true;
      renderLines();
      syncForm();
      renderTotals(false);
      closeCart();
    } else if (e.target.closest("[data-back]")) {
      doneEl.hidden = true;
      renderTotals(false);
    } else if (e.target.closest("[data-reorder]")) {
      if (!client || !client.last) return;
      cart.items = JSON.parse(JSON.stringify(client.last.items || []));
      cart.items.forEach(refreshItem);
      delete cart.sentAt;
      saveCart();
      renderLines();
      renderTotals(true);
      announce("Votre dernière commande est dans le panier. Vérifiez-la avant de l’envoyer.");
      var firstControl = linesEl.querySelector("button, select, input");
      if (firstControl) firstControl.focus();
    } else if (e.target.closest("[data-forget]")) {
      forgetClient();
      REMEMBERED.forEach(function (k) { cart.form[k] = DEFAULT_FORM[k]; });
      cart.form.remember = false;
      saveCart();
      syncForm();
      renderTotals(false);
      announce("Vos informations ont été effacées de cet appareil.");
      form.elements.name.focus();
    }
  });

  drawer.addEventListener("change", function (e) {
    var el = e.target;
    if (el.hasAttribute("data-choice")) {
      var chosen = cart.items[Number(el.getAttribute("data-line"))];
      if (!chosen) return;
      chosen.choice = el.getAttribute("data-choice");
      syncRadioChips(el.closest(".choice-picker"));
      footError.hidden = true;
      saveCart();
      return;
    }
    if (el.hasAttribute("data-supp-add")) {
      var at = Number(el.getAttribute("data-line"));
      var line = cart.items[at];
      var name = el.value;
      if (!line || !suppOf(name)) return;
      line.supps = lineSupps(line).filter(function (n) { return n !== name; }).concat(name);
      refreshLine(at, "[data-supp-add]");
      announce(name + " ajouté en supplément.");
      return;
    }
    if (!el.hasAttribute("data-opt")) return;
    var i = Number(el.getAttribute("data-line"));
    var it = cart.items[i];
    if (!it) return;
    var opt = el.getAttribute("data-opt");
    if (opt === "epaisse" || opt === "blanche") {
      it.opts[opt] = el.checked;
      el.parentElement.classList.toggle("is-on", el.checked);
    } else if (opt === "cuisson") {
      it.opts.cuisson = el.value;
    }
    updateLine(i);
    saveCart();
    renderTotals(false);
  });

  drawer.addEventListener("input", function (e) {
    var el = e.target;
    if (el.getAttribute("data-opt") === "note") {
      var it = cart.items[Number(el.getAttribute("data-line"))];
      if (it) { it.note = el.value; saveCart(); }
    }
  });

  /* ---- Formulaire ---- */
  function onFormEdit(e) {
    var el = e.target;
    if (!el.name || !(el.name in cart.form)) return;
    cart.form[el.name] = el.type === "checkbox" ? el.checked : el.value;
    if (el.name === "mode" || el.name === "payment") syncForm();
    if (el.name === "remember" && !el.checked && client) {
      forgetClient();
      syncForm();
      renderTotals(false);
      announce("Vos informations mémorisées ont été effacées de cet appareil.");
    }
    if (el.getAttribute("aria-invalid") === "true") {
      el.setAttribute("aria-invalid", "false");
      var err = form.querySelector('[data-error="' + el.name + '"]');
      if (err) err.hidden = true;
    }
    saveCart();
    if (el.name === "coupons") renderTotals(false);
  }
  form.addEventListener("input", onFormEdit);
  form.addEventListener("change", onFormEdit);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  sendBtn.addEventListener("click", function (e) {
    if (!cart.items.length || !validate()) {
      e.preventDefault();
      return;
    }
    sendBtn.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(buildMessage());
    // Commande envoyée : le panier repartira à vide à la prochaine visite.
    // Coordonnées et commande mémorisées seulement si le client l'a demandé.
    cart.sentAt = Date.now();
    if (cart.form.remember) saveClient(); else forgetClient();
    saveCart();
    window.setTimeout(function () {
      doneEl.hidden = false;
      renderTotals(false);
      drawer.querySelector(".cart-body").scrollTop = 0;
    }, 400);
  });

  renderTotals(false);

  /* ==========================================================================
     Pizza 3D de l'accueil : elle pivote et change de recette à chaque tour.
     Recettes : les pizzas de carte.html qui ont une photo vue du dessus
     (attribut data-disc). Le changement a lieu quand la pizza est de profil.
     ========================================================================== */
  var spin = doc.querySelector("[data-spin]");
  if (spin) initSpin(spin);

  function initSpin(root) {
    var HALF_TURN = 2600;            // durée d'un demi-tour (ms) : un tour complet = une recette
    var LAYERS = 12;                 // disques empilés qui donnent l'épaisseur de la pâte
    var KICKERS = { classiques: "Pizza classique", monde: "Pizza du monde", bruschettas: "Bruschetta" };
    var ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    var ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10l8-5-8-5Z" fill="currentColor"/></svg>';

    var disc = root.querySelector("[data-spin-disc]");
    var imgs = [].slice.call(root.querySelectorAll(".spin-face img"));
    var caption = root.querySelector("[data-spin-caption]");
    var out = {
      kicker: root.querySelector("[data-spin-kicker]"),
      name: root.querySelector("[data-spin-name]"),
      price: root.querySelector("[data-spin-price]")
    };
    var actions = root.querySelector(".spin-actions");
    var toggleBtn = root.querySelector("[data-spin-toggle]");
    var nextBtn = root.querySelector("[data-spin-next]");

    // Épaisseur : disques couleur croûte entre les deux faces, proportionnels à la taille
    var layers = [];
    for (var n = 0; n < LAYERS - 1; n++) {
      var layer = doc.createElement("div");
      layer.className = "spin-layer";
      disc.insertBefore(layer, disc.lastElementChild);
      layers.push(layer);
    }
    function sizeLayers() {
      var half = Math.max(4, Math.round(disc.offsetWidth * 0.02));
      root.style.setProperty("--half", half + "px");
      layers.forEach(function (l, i) {
        l.style.transform = "translateZ(" + (-half + (2 * half * (i + 1)) / LAYERS).toFixed(2) + "px)";
      });
    }
    sizeLayers();
    window.addEventListener("resize", sizeLayers);

    // Toutes les pizzas et bruschettas avec photo, ajoutées au catalogue de commande.
    // Photo vue du dessus (data-disc) si elle existe, sinon la photo de la carte, recadrée en rond.
    function collect(scope) {
      var list = [];
      scope.querySelectorAll(".food-card").forEach(function (c) {
        var kind = kindOf(c);
        if (kind !== "pizza" && kind !== "bruschetta") return;
        var discSrc = c.getAttribute("data-disc");
        var photo = c.querySelector("img.food-media");
        if (!discSrc && !photo) return;
        var base = textOf(c.querySelector(".food-title h3"));
        var section = c.closest("section[id]");
        var badges = [].map.call(c.querySelectorAll(".food-title .badge"), textOf);
        var kicker = textOf(c.querySelector(".food-kicker")) ||
          [KICKERS[section ? section.id : ""] || ""].concat(badges).filter(Boolean).join(" · ");
        var priceText = textOf(c.querySelector(".price"));
        var choices = (c.getAttribute("data-choices") || "").split("|")
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        var id = slug(kind + "-" + base);
        if (!catalogue[id]) {
          catalogue[id] = {
            id: id,
            name: kind === "bruschetta" ? "Bruschetta " + base : base,
            kind: kind,
            unit: parsePrice(priceText),
            hint: choices.length ? "" : choiceHint(textOf(c.querySelector(".food-desc")), false),
            blanche: /base blanche/i.test(badges.join(" ") + " " + kicker),
            choices: choices
          };
        }
        list.push({ id: id, name: base, kicker: kicker, price: priceText, img: discSrc || photo.getAttribute("src"), top: !!discSrc, choices: choices });
      });
      return list;
    }

    // Première recette : celle affichée dans le HTML (la Reine)
    var first = {
      id: "pizza-" + slug(textOf(out.name)),
      name: textOf(out.name),
      kicker: textOf(out.kicker),
      price: textOf(out.price),
      img: imgs[0].getAttribute("src"),
      top: true,
      choices: []
    };
    if (!catalogue[first.id]) {
      catalogue[first.id] = { id: first.id, name: first.name, kind: "pizza", unit: parsePrice(first.price), hint: "", blanche: false, choices: [] };
    }
    // Recettes inscrites dans l'accueil (fonctionne aussi sans serveur), puis celles de la carte
    function collectInline() {
      return [].map.call(root.querySelectorAll(".spin-list li[data-disc]"), function (li) {
        var name = li.getAttribute("data-name");
        var choices = (li.getAttribute("data-choices") || "").split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        var id = "pizza-" + slug(name);
        if (!catalogue[id]) {
          var kickerText = li.getAttribute("data-kicker") || "";
          catalogue[id] = { id: id, name: name, kind: "pizza", unit: parsePrice(li.getAttribute("data-price")), hint: "", blanche: /base blanche/i.test(kickerText), choices: choices };
        }
        return { id: id, name: name, kicker: li.getAttribute("data-kicker") || "", price: li.getAttribute("data-price") || "", img: li.getAttribute("data-disc"), top: true, choices: choices };
      });
    }
    var recipes = [first].concat(collectInline(), collect(doc)).filter(function (r, i, all) {
      return all.map(function (x) { return x.id; }).indexOf(r.id) === i;
    });
    var cur = 0;

    var addBtn = doc.createElement("button");
    addBtn.type = "button";
    addBtn.className = "add-btn";
    addBtn.innerHTML = ICON.plus + '<span class="add-label">Ajouter</span>';
    actions.insertBefore(addBtn, actions.firstChild);
    actions.hidden = false;

    function fill(r) {
      out.kicker.textContent = r.kicker;
      out.name.textContent = r.name;
      out.price.textContent = r.price;
      addBtn.setAttribute("data-add", r.id);
      addBtn.setAttribute("aria-label", "Ajouter " + r.name + " à la commande");
      var old = caption.querySelector(".choice-picker");
      if (old) old.remove();
      if (r.choices.length) {
        var picker = doc.createElement("div");
        picker.className = "choice-picker";
        picker.setAttribute("role", "radiogroup");
        picker.setAttribute("aria-label", "Au choix pour " + r.name);
        picker.innerHTML = '<span class="choice-label">Au choix</span>' + r.choices.map(function (c, i) {
          return '<label class="chip' + (i === 0 ? " is-on" : "") + '"><input type="radio" name="choix-pizza-3d" value="' +
            esc(c) + '"' + (i === 0 ? " checked" : "") + ">" + esc(c) + "</label>";
        }).join("");
        caption.appendChild(picker);
      }
    }

    function setRecipe(i) {
      cur = (i + recipes.length) % recipes.length;
      var r = recipes[cur];
      imgs.forEach(function (img) { img.src = r.img; });
      imgs[0].alt = "Pizza " + r.name;
      disc.classList.toggle("is-angled", !r.top);   // ancienne photo de biais : zoom + croûte dessinée
      caption.classList.add("is-changing");
      window.setTimeout(function () {
        fill(r);
        caption.classList.remove("is-changing");
      }, 200);
      var next = recipes[(cur + 1) % recipes.length];
      if (next) new Image().src = next.img;      // préchargement de la recette suivante
    }

    // Rotation : chaque demi-tour ralentit quand une face est de face, accélère de profil
    function ease(g) { return g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2; }
    function angleAt(ms) {
      var h = Math.floor(ms / HALF_TURN);
      return 180 * (h + ease((ms % HALF_TURN) / HALF_TURN));
    }
    var elapsed = 0, last = null, raf = 0, lastTurn = 0;
    var running = !reduceMotion, visible = true;

    function frame(now) {
      raf = 0;
      if (last !== null) elapsed += Math.min(now - last, 100);
      last = now;
      var theta = angleAt(elapsed);
      disc.style.transform = "rotateY(" + theta.toFixed(2) + "deg)";
      // À chaque fois que la pizza pivote, une nouvelle recette apparaît :
      // on change d'image quand la pizza est de profil (90°, 270°, 450°…)
      var turn = Math.floor((theta - 90) / 180) + 1;
      if (turn > lastTurn) { lastTurn = turn; if (recipes.length > 1) setRecipe(cur + 1); }
      if (running && visible && !doc.hidden) raf = window.requestAnimationFrame(frame);
      else last = null;
    }
    function start() {
      if (!raf && running && visible && !doc.hidden) raf = window.requestAnimationFrame(frame);
    }

    function setRunning(on) {
      running = on;
      toggleBtn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
      toggleBtn.setAttribute("aria-label", on ? "Mettre la pizza en pause" : "Faire tourner la pizza");
      start();
    }
    toggleBtn.addEventListener("click", function () { setRunning(!running); });
    nextBtn.addEventListener("click", function () { setRecipe(cur + 1); });
    doc.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        start();
      }).observe(root);
    }

    fill(recipes[0]);
    setRunning(running);

    // Toutes les recettes avec photo vue du dessus de la carte
    if (window.fetch && location.protocol !== "file:") {
      window.fetch("carte.html", { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error(String(r.status))); })
        .then(function (html) {
          var full = collect(new DOMParser().parseFromString(html, "text/html"));
          if (!full.length) return;
          var currentId = recipes[cur].id;
          recipes = full;
          cur = Math.max(0, recipes.map(function (r) { return r.id; }).indexOf(currentId));
          var next = recipes[(cur + 1) % recipes.length];
          if (next) new Image().src = next.img;
        })
        .catch(function () { /* sans serveur : la recette de l'accueil suffit */ });
    }
  }})();
