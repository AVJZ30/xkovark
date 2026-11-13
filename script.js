/* ============================================================
   XKOVARK - Script principal para la tienda online
   ============================================================ */

// URL de tu Apps Script (la que copiaste al implementar)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbx0gPeRzKW24nS82HQUs9qNLyJ3Vn27uQ7V1H7WGrlFpEbuCXUYH8pKEUwmTEVyIKxH7Q/exec";

// Número de WhatsApp para recibir pedidos del carrito
const WHATSAPP_NUMBER = "593967071228";

// ============================================================
//  VARIABLES GLOBALES
// ============================================================

let PRODUCTS = [];
let allProductsLoaded = false;
let state = {
  search: "",
  categoria: "todas",
  soloStock: false,
  orden: "relevancia"
};

// ============================================================
//  CARGA DE PRODUCTOS (con caché local y petición temprana)
// ============================================================

const CACHE_KEY = "xkovark_productos_v1"; // si cambias la estructura de datos, cambia v1 por v2

function leerCache() {
  try {
    const txt = localStorage.getItem(CACHE_KEY);
    return txt ? JSON.parse(txt) : null;
  } catch (e) { return null; }
}

function guardarCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* ignorar */ }
}

// La petición arranca YA, en cuanto se carga este archivo
const peticionTemprana = fetch(SPREADSHEET_URL).then(res => {
  if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
  return res.json();
});
peticionTemprana.catch(() => {}); // evita aviso de error sin capturar; se maneja en init()

// Convierte los datos crudos de la hoja al formato de la tienda
function mapearProductos(data) {
  const lista = data.map((item, index) => {
    const enOferta = item.en_oferta === true || String(item.en_oferta).toLowerCase() === "true";
    const tags = [];
    if (enOferta) tags.push("oferta");

    const images = [];
    if (item.imagen_frente && String(item.imagen_frente).trim() !== "") images.push(String(item.imagen_frente).trim());
    if (item.imagen_espalda && String(item.imagen_espalda).trim() !== "") images.push(String(item.imagen_espalda).trim());

    let precioAntes = null;
    if (enOferta) {
      const precioActual = parseFloat(item.precio) || 0;
      precioAntes = Math.round(precioActual * 1.2);
    }

    if (!item.nombre_producto && !item.nombre) {
      console.warn(`Producto en fila ${index + 2} sin nombre, saltando...`);
      return null;
    }

    return {
      id: item.id || String(item.nombre_producto || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || `producto-${index}`,
      categoria: item.categoria ? String(item.categoria).toLowerCase().trim() : "otros",
      nombre: item.nombre_producto || item.nombre || "Producto sin nombre",
      desc: item.descripcion || "",
      codigo: String(item.codigo_producto ?? item.codigo ?? item.sku ?? item.referencia ?? item.id ?? item.nombre_producto ?? `producto-${index + 2}`).trim(),
      precio: parseFloat(item.precio) || 0,
      precioAntes: precioAntes,
      tags: tags,
      disponibilidad: item.disponibilidad ? String(item.disponibilidad).toLowerCase().trim() : "stock",
      images: images
    };
  }).filter(p => p !== null);

  return lista;
}

// Mezcla el catálogo en cada visita o recarga (Fisher-Yates).
// Se conserva el orden durante la visita, incluso si se actualizan los datos del caché.
const ordenAleatorioVisita = new Map();
function mezclarProductos(productos) {
  const nuevos = productos.filter(p => !ordenAleatorioVisita.has(p.id));
  // Asignamos una prioridad aleatoria estable a cada producto durante esta visita.
  nuevos.forEach(p => ordenAleatorioVisita.set(p.id, Math.random()));
  return productos.sort((a, b) =>
    ordenAleatorioVisita.get(a.id) - ordenAleatorioVisita.get(b.id)
  );
}

// Guarda los productos en memoria y repinta todo
function aplicarDatos(data) {
  PRODUCTS = mezclarProductos(mapearProductos(data));
  allProductsLoaded = PRODUCTS.length > 0;
  renderDrawerSearchResults();
  renderCurated();
  applyFilters();
  renderCart(); // el total del carrito depende de los precios
  attachRevealObservers();
}

// ============================================================
//  MOSTRAR ERROR EN LA PÁGINA
// ============================================================

function showError(message) {
  const containers = [
    "ofertas-grid",
    "catalogo-grid"
  ];

  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--grey);">
          <p style="font-size: 18px; margin-bottom: 12px;">${message}</p>
          <p style="font-size: 13px; color: var(--grey-dim);">Verifica tu conexión e inténtalo otra vez.</p>
          <p style="font-size: 12px; margin-top: 16px; color: var(--grey-dim);">
            <a href="#" onclick="location.reload()" style="color: var(--gold); text-decoration: underline;">Recargar página</a>
          </p>
        </div>
      `;
    }
  });
}

// ============================================================
//  CONSTANTES DE ETIQUETAS
// ============================================================

const CATEGORY_LABELS = {
  cadenas: "Cadenas",
  aretes: "Aretes",
  anillos: "Anillos",
  relojes: "Relojes",
  pulseras: "Pulseras",
  gafas: "Gafas",
  mochilas: "Mochilas",
  bandoleras: "Bandoleras",
  bolsos: "Bolsos",
  gorras: "Gorras",
  joggers: "Joggers",
  camisas: "Camisas",
  busos: "Busos",
  pasamontanas: "Pasamontañas",
  vapes: "Vapes",
  cinturon: "Cinturones",
  perfumes: "Perfumes",
  tatuajes: "Tatuajes",
  grillz: "Grillz",
  grills: "Grillz",
  grill: "Grillz"
};

// Unifica términos comerciales y variantes de escritura para ambos buscadores.
function normalizeProductSearch(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function productSearchTerms(value) {
  return normalizeProductSearch(value).split(/\s+/).filter(Boolean).map(term =>
    /^(grillz|grills|grill|grilz|gril|grillss)$/.test(term) ? "grill" : term
  );
}
function productSearchText(product) {
  const raw = [product.nombre, product.desc, product.codigo, product.categoria, CATEGORY_LABELS[product.categoria]].join(" ");
  const normalized = normalizeProductSearch(raw);
  // Solo añade la equivalencia si el producto está etiquetado como grill/grillz.
  const hasGrill = /\bgrill(?:z|s)?\b|\bgrilz\b/i.test(normalized);
  return normalized + (hasGrill ? " grill grillz grills grilz " : "");
}
function productMatchesSearch(product, terms) {
  const searchable = productSearchText(product);
  return terms.every(term => searchable.includes(term));
}

const AVAIL_LABELS = {
  stock: "En stock",
  pocas: "Pocas unidades",
  agotado: "Agotado"
};

// ============================================================
//  RENDER DE TARJETAS DE PRODUCTO
// ============================================================

function cardHTML(p) {
  const badge = p.disponibilidad === "agotado"
    ? `<span class="badge agotado">Agotado</span>`
    : p.tags.includes("oferta")
      ? `<span class="badge oferta">Oferta</span>`
      : "";

  let imagesHTML = "";
  if (p.images && p.images.length > 0) {
    const imgs = p.images;
    const dots = imgs.map((_, i) =>
      `<span class="gdot ${i===0?'active':''}" data-idx="${i}"></span>`
    ).join("");
    imagesHTML = `
      <div class="product-gallery" data-total="${imgs.length}" data-index="0">
        <div class="gallery-track" style="width:${imgs.length * 100}%;">
          ${imgs.map(src => `
        <div class="gallery-slide" style="width:${100 / imgs.length}%">
          <img src="${src}" alt="${p.nombre}" class="gallery-main" loading="lazy" decoding="async" draggable="false"
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%231a1a17%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2396958c%22 font-family=%22monospace%22 font-size=%2212%22%3ESin%20imagen%3C/text%3E%3C/svg%3E'">
        </div>`).join("")}
        </div>
        ${imgs.length > 1 ? `
        <button class="gallery-arrow prev" type="button" aria-label="Imagen anterior">
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <button class="gallery-arrow next" type="button" aria-label="Imagen siguiente">
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <div class="gallery-dots">${dots}</div>` : ""}
      </div>
    `;
  } else {
    imagesHTML = `
      <div class="placeholder">
        <div class="placeholder-label">${p.nombre}<br><span style="font-size:9px;">Sin imagen</span></div>
      </div>
    `;
  }

  const priceHTML = p.precioAntes
    ? `<span class="price-old">$${p.precioAntes}</span><span class="price">$${p.precio}</span>`
    : `<span class="price">$${p.precio}</span>`;

  const agotado = p.disponibilidad === "agotado";

  return `
    <article class="card reveal ${agotado ? 'is-agotado' : ''}"
         data-id="${p.id}" data-categoria="${p.categoria}" id="${p.id}" tabindex="0" aria-label="Ver detalles de ${p.nombre}">
      <div class="card-img">
        ${imagesHTML}
        ${badge}
      </div>
      <div class="card-body">
        <div class="card-copy">
          <span class="name">${p.nombre}</span>
          <div class="card-foot"><div class="price-wrap">${priceHTML}</div></div>
        </div>
        <button class="card-quick-add" type="button" data-id="${p.id}"
          aria-label="${agotado ? 'Producto agotado' : 'Agregar ' + p.nombre + ' al carrito'}"
          title="${agotado ? 'Agotado' : 'Agregar al carrito'}" ${agotado ? "disabled" : ""}>${agotado ? '×' : '+'}</button>
      </div>
    </article>
  `;
}

// ============================================================
//  FUNCIONES DE RENDERIZADO
// ============================================================

function renderGrid(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!allProductsLoaded || list.length === 0) {
    if (allProductsLoaded) {
      el.innerHTML = `<div class="empty-state">No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría.</div>`;
    }
    return;
  }

  el.innerHTML = list.map(cardHTML).join("");
  // Un ligero desfase entre tarjetas crea el efecto de aparición en cascada.
  el.querySelectorAll(".card.reveal").forEach((card, index) => {
    card.style.setProperty("--card-reveal-delay", ((index % 4) * 65) + "ms");
  });
  attachGalleryDots();
  // Las tarjetas recién mostradas también reciben la iluminación correcta.
  requestAnimationFrame(updateProductPhotoLighting);
}

function renderCurated() {
  if (!allProductsLoaded || PRODUCTS.length === 0) return;

  const ofertas = PRODUCTS.filter(p => p.tags.includes("oferta"));

  renderGrid("ofertas-grid", ofertas);
}

// ============================================================
//  FILTROS Y BÚSQUEDA
// ============================================================

const CATALOG_PAGE_SIZE = 13;
let visibleCatalogCount = CATALOG_PAGE_SIZE;
function resetCatalogPage() { visibleCatalogCount = CATALOG_PAGE_SIZE; }

// ============================================================
//  FILTROS Y BÚSQUEDA
// ============================================================

function applyFilters() {
  if (!allProductsLoaded || PRODUCTS.length === 0) return;

  // Coincidencias reales: todos los términos deben estar presentes, con o sin tildes.
  const normalizeSearch = normalizeProductSearch;
  const query = normalizeSearch(state.search);
  const terms = productSearchTerms(state.search);
  let list = PRODUCTS.filter(p => {
    const matchSearch = productMatchesSearch(p, terms);
    const matchCat = state.categoria === "todas" || p.categoria === state.categoria;
    const matchStock = !state.soloStock || p.disponibilidad !== "agotado";
    return matchSearch && matchCat && matchStock;
  });
  if (terms.length && state.orden === "relevancia") {
    list.sort((a, b) => {
      const score = p => {
        const name = normalizeSearch(p.nombre);
        return (name === query ? 100 : 0) + (name.startsWith(query) ? 50 : 0) +
          terms.filter(term => name.includes(term)).length * 10;
      };
      return score(b) - score(a);
    });
  }
  const catalog = document.getElementById("catalogo");
  if (catalog) catalog.classList.toggle("search-active", !!query);
  const searchHeader = document.getElementById("searchResultIntro");
  const searchLabel = document.getElementById("searchResultLabel");
  if (searchHeader) searchHeader.hidden = !query;
  if (searchLabel) searchLabel.textContent = query
    ? `Resultados para “${state.search.trim()}” · ${list.length} ${list.length === 1 ? "producto" : "productos"}`
    : "";
  // Evita que las ofertas ajenas a la búsqueda parezcan resultados.
  const offers = document.getElementById("ofertas");
  if (offers) offers.hidden = !!query;

  if (state.orden === "precio-asc") list.sort((a, b) => a.precio - b.precio);
  if (state.orden === "precio-desc") list.sort((a, b) => b.precio - a.precio);

  const visibleItems = list.slice(0, visibleCatalogCount);
  renderGrid("catalogo-grid", visibleItems);
  const pagination = document.getElementById("catalogPagination");
  const showMore = document.getElementById("catalogShowMore");
  const progress = document.getElementById("catalogPaginationCount");
  if (pagination) pagination.hidden = list.length <= CATALOG_PAGE_SIZE;
  if (showMore) showMore.hidden = visibleItems.length >= list.length;
  if (progress) progress.textContent = "Mostrando " + visibleItems.length + " de " + list.length + " productos";

  // Cantidades reales obtenidas de la hoja de productos, sin números inventados.
  const counts = new Map();
  PRODUCTS.forEach(p => {
    counts.set(p.categoria, (counts.get(p.categoria) || 0) + 1);
  });
  document.querySelectorAll(".chip[data-cat]").forEach(chip => {
    const cat = chip.dataset.cat;
    const total = cat === "todas" ? PRODUCTS.length : (counts.get(cat) || 0);
    const badge = chip.querySelector(".chip-count");
    if (badge) badge.textContent = String(total);
    chip.classList.toggle("active", cat === state.categoria);
    chip.setAttribute("aria-pressed", String(cat === state.categoria));
  });

  const countEl = document.getElementById("resultCount");
  if (countEl) {
    countEl.textContent = list.length + (list.length === 1 ? " pieza" : " piezas");
  }

  attachRevealObservers();
}

function goToCatalog(categoria) {
  const catalogSection = document.getElementById("catalogo");

  // Si no estamos en la página que tiene el catálogo (ej. opiniones.html),
  // guardamos la categoría elegida y redirigimos al inicio.
  if (!catalogSection) {
    try { localStorage.setItem("xkovark_pending_cat", categoria); } catch (e) { /* ignorar */ }
    window.location.href = "index.html#catalogo";
    return;
  }

  state.categoria = categoria;
  resetCatalogPage();
  const catFilter = document.getElementById("categoryFilter");
  if (catFilter) catFilter.value = categoria;

  document.querySelectorAll(".chip").forEach(c => {
    c.classList.toggle("active", c.dataset.cat === categoria);
  });

  applyFilters();
  catalogSection.scrollIntoView({ behavior: "smooth" });
  closeDrawer();
}

// ============================================================
//  INTERACCIONES Y EVENTOS
// ============================================================

function initFilterBar() {
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categoryFilter");
  const stockCheck = document.getElementById("onlyStock");
  const sortSelect = document.getElementById("sortSelect");

  if (searchInput) {
    searchInput.addEventListener("input", e => {
      state.search = e.target.value;
      // Cada búsqueda nueva usa todas las categorías.
      state.categoria = "todas";
      if (categorySelect) categorySelect.value = "todas";
      const drawerSearch = document.getElementById("drawerSearch");
      if (drawerSearch && drawerSearch.value !== state.search) drawerSearch.value = state.search;
      renderDrawerSearchResults();
      resetCatalogPage();
      applyFilters();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", e => {
      state.categoria = e.target.value;
      resetCatalogPage();
      document.querySelectorAll(".chip").forEach(c => {
        c.classList.toggle("active", c.dataset.cat === e.target.value);
      });
      applyFilters();
    });
  }

  if (stockCheck) {
    stockCheck.addEventListener("change", e => {
      state.soloStock = e.target.checked;
      resetCatalogPage();
      applyFilters();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", e => {
      state.orden = e.target.value;
      resetCatalogPage();
      applyFilters();
    });
  }

  document.getElementById("clearCatalogSearch")?.addEventListener("click", () => {
    state.search = "";
    state.categoria = "todas";
    if (searchInput) searchInput.value = "";
    const drawer = document.getElementById("drawerSearch");
    if (drawer) drawer.value = "";
    if (categorySelect) categorySelect.value = "todas";
    resetCatalogPage();
    applyFilters();
  });
  document.getElementById("catalogShowMore")?.addEventListener("click", () => {
    visibleCatalogCount += CATALOG_PAGE_SIZE;
    applyFilters();
  });

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      state.categoria = chip.dataset.cat;
      resetCatalogPage();
      if (categorySelect) categorySelect.value = chip.dataset.cat;
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilters();
    });
  });
}

function goToGallerySlide(gallery, index) {
  const track = gallery.querySelector(".gallery-track");
  const total = parseInt(gallery.dataset.total, 10);
  if (!track || !total) return;

  const clamped = ((index % total) + total) % total; // permite ciclar y "regresar"
  gallery.dataset.index = clamped;
  track.style.transform = `translateX(-${clamped * (100 / total)}%)`;

  gallery.querySelectorAll(".gdot").forEach((d, i) => {
    d.classList.toggle("active", i === clamped);
  });
}

function attachGalleryDots() {
  document.querySelectorAll(".product-gallery").forEach(gallery => {
    // Las tarjetas usan fondo blanco uniforme; no hace falta descargar
    // las fotos por segunda vez ni analizarlas mediante canvas.
    const current = parseInt(gallery.dataset.index || "0", 10);
    goToGallerySlide(gallery, current);

    gallery.querySelectorAll(".gdot").forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goToGallerySlide(gallery, parseInt(dot.dataset.idx, 10));
      });
    });

    gallery.querySelector(".gallery-arrow.prev")?.addEventListener("click", (e) => {
      e.stopPropagation();
      goToGallerySlide(gallery, parseInt(gallery.dataset.index, 10) - 1);
    });

    gallery.querySelector(".gallery-arrow.next")?.addEventListener("click", (e) => {
      e.stopPropagation();
      goToGallerySlide(gallery, parseInt(gallery.dataset.index, 10) + 1);
    });
  });
}

// Entrada progresiva de las tarjetas mientras se recorre la colección.
let catalogRevealObserver = null;
function attachRevealObservers() {
  const targets = document.querySelectorAll(".reveal:not(.in)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window) || reducedMotion) {
    targets.forEach(el => el.classList.add("in"));
    return;
  }
  if (!catalogRevealObserver) {
    catalogRevealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px 55px 0px", threshold: 0.06 });
  }
  targets.forEach(el => catalogRevealObserver.observe(el));
}

// ============================================================
//  HEADER Y DRAWER (MENÚ MÓVIL)
// ============================================================

function updateProductPhotoLighting() {
  if (!document.getElementById("catalogo-grid")) return;
  const viewportHeight = window.innerHeight || 800;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("#catalogo-grid .card-img, #ofertas-grid .card-img").forEach(frame => {
    const rect = frame.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > viewportHeight + 100) return;
    // En la parte inferior se ve completamente blanca; al subir la tarjeta
    // aparece humo negro en los bordes. Al retroceder, desaparece de nuevo.
    const center = (rect.top + rect.bottom) / 2;
    const progress = Math.max(0, Math.min(1, (viewportHeight * .82 - center) / (viewportHeight * .67)));
    frame.style.setProperty("--xk-smoke", (reducedMotion ? 0 : progress).toFixed(3));
  });
}

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  let scrollFrame = 0;
  const update = () => {
    scrollFrame = 0;
    header.classList.toggle("scrolled", window.scrollY > 40);
    updateProductPhotoLighting();
  };
  const schedule = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive:true });
  window.addEventListener("resize", schedule, { passive:true });
  update();
}

function openDrawer() {
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("scrim")?.classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer")?.classList.remove("open");
  document.getElementById("scrim")?.classList.remove("open");
}

// Muestra resultados directamente debajo del buscador del menú móvil.
function renderDrawerSearchResults() {
  const input = document.getElementById("drawerSearch");
  const panel = document.getElementById("drawerLiveResults");
  const results = document.getElementById("drawerResultsList");
  const title = document.getElementById("drawerResultsTitle");
  const allButton = document.getElementById("drawerResultsAll");
  const categories = document.querySelector("#drawer .drawer-categories");
  if (!input || !panel || !results) return;
  const query = String(input.value || "").trim();
  panel.hidden = !query;
  if (categories) categories.hidden = !!query;
  if (!query) {
    results.innerHTML = "";
    if (allButton) allButton.hidden = true;
    return;
  }
  if (!allProductsLoaded) {
    results.innerHTML = '<p class="drawer-results-empty">Cargando productos...</p>';
    if (title) title.textContent = "Buscando...";
    if (allButton) allButton.hidden = true;
    return;
  }
  const normal = normalizeProductSearch;
  const words = productSearchTerms(query);
  const matches = PRODUCTS.filter(p => productMatchesSearch(p, words));
  matches.sort((a,b) => {
    const score = p => normal(p.nombre).startsWith(normal(query)) ? 1 : 0;
    return score(b)-score(a);
  });
  if (title) title.textContent = matches.length + (matches.length === 1 ? " resultado" : " resultados");
  const shown = matches.slice(0, 6);
  if (!matches.length) {
    results.innerHTML = '<p class="drawer-results-empty">No encontramos productos con ese nombre. Prueba con otra palabra.</p>';
  } else {
    results.innerHTML = shown.map(p => {
      const photo = p.images?.[0] ? safeProductImage(p.images[0]) : "";
      return `<button type="button" class="drawer-result" data-product-id="${escapeShopText(p.id)}">
        ${photo ? `<img src="${photo}" alt="" loading="lazy" decoding="async">` : '<span class="drawer-result-no-photo">XK</span>'}
        <span class="drawer-result-copy"><strong>${escapeShopText(p.nombre)}</strong><small>Código: ${escapeShopText(p.codigo || p.id)}</small><em>$${Number(p.precio).toFixed(2)}</em></span>
        <span class="drawer-result-arrow" aria-hidden="true">↗</span>
      </button>`;
    }).join("");
  }
  if (allButton) allButton.hidden = matches.length <= 6;
}
function initDrawer() {
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    openDrawer();
    renderDrawerSearchResults();
  });
  document.getElementById("drawerClose")?.addEventListener("click", closeDrawer);
  document.getElementById("scrim")?.addEventListener("click", closeDrawer);

  const drawerSearch = document.getElementById("drawerSearch");
  if (drawerSearch) {
    drawerSearch.addEventListener("input", e => {
      state.search = e.target.value;
      state.categoria = "todas";
      const mainSearch = document.getElementById("searchInput");
      if (mainSearch) mainSearch.value = state.search;
      const categories = document.getElementById("categoryFilter");
      if (categories) categories.value = "todas";
      resetCatalogPage();
      applyFilters();
      renderDrawerSearchResults();
    });
    drawerSearch.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        closeDrawer();
        document.getElementById("catalogo")?.scrollIntoView({ behavior:"smooth", block:"start" });
      }
    });
  }
  document.getElementById("drawerResultsClear")?.addEventListener("click", () => {
    if (!drawerSearch) return;
    drawerSearch.value = "";
    drawerSearch.dispatchEvent(new Event("input", { bubbles:true }));
    drawerSearch.focus();
  });
  document.getElementById("drawerResultsAll")?.addEventListener("click", () => {
    closeDrawer();
    document.getElementById("catalogo")?.scrollIntoView({ behavior:"smooth", block:"start" });
  });
  document.getElementById("drawerResultsList")?.addEventListener("click", e => {
    const result = e.target.closest(".drawer-result");
    if (!result) return;
    closeDrawer();
    openProductDetail(result.dataset.productId);
  });
}

/* ============================================================
   CARRITO DE COMPRAS
   ============================================================
   - Cada producto tiene un selector de cantidad y un botón
     "Agregar" que suma esa cantidad al carrito.
   - El carrito se guarda en localStorage, así que sobrevive
     si el visitante recarga la página o vuelve más tarde.
   - El botón "Finalizar por WhatsApp" arma un mensaje con el
     detalle del pedido y abre WhatsApp con ese número.
   ============================================================ */

let cart = [];

function loadCart() {
  try {
    const saved = localStorage.getItem("xkovark_cart");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn("No se pudo leer el carrito guardado:", e);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("xkovark_cart", JSON.stringify(cart));
  } catch (e) {
    console.warn("No se pudo guardar el carrito:", e);
  }
}

function findProduct(id) {
  // La hoja puede devolver IDs numéricos, pero data-id y localStorage usan texto.
  return PRODUCTS.find(p => String(p.id) === String(id));
}

function addToCart(id, cantidad) {
  const product = findProduct(id);
  if (!product || product.disponibilidad === "agotado") return false;
  const key = String(product.id);
  const qty = Math.max(1, Math.floor(Number(cantidad) || 1));
  const existing = cart.find(i => String(i.id) === key);
  if (existing) {
    existing.id = key;
    existing.cantidad = Math.max(0, Number(existing.cantidad) || 0) + qty;
  } else {
    cart.push({ id: key, cantidad: qty });
  }
  saveCart();
  renderCart();
  bumpCartBadge();
  return true;
}

function removeFromCart(id) {
  cart = cart.filter(i => String(i.id) !== String(id));
  saveCart();
  renderCart();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => String(i.id) === String(id));
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    removeFromCart(id);
  } else {
    saveCart();
    renderCart();
  }
}

function cartTotal() {
  return cart.reduce((sum, item) => {
    const product = findProduct(item.id);
    return sum + (product ? product.precio * item.cantidad : 0);
  }, 0);
}

function cartItemCount() {
  return cart.reduce((sum, item) => sum + item.cantidad, 0);
}

function escapeShopText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]
  );
}
function safeProductImage(url) {
  const value = String(url || "").trim();
  return /^https:\/\//i.test(value) ? escapeShopText(value) : "";
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const badge = document.getElementById("cartBadge");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (container) {
    if (cart.length === 0) {
      container.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Agrega productos desde el catálogo.</div>`;
    } else {
      container.innerHTML = cart.map(item => {
        const product = findProduct(item.id);
        if (!product) return "";
        const subtotal = product.precio * item.cantidad;
        return `
          <div class="cart-item" data-id="${item.id}">
            ${product.images?.[0] ? `<img class="cart-product-thumb" src="${safeProductImage(product.images[0])}" alt="Foto de ${escapeShopText(product.nombre)}" loading="lazy">` : '<div class="cart-product-thumb cart-product-placeholder" aria-hidden="true">XK</div>'}
            <div class="cart-item-info">
              <span class="cart-item-name">${escapeShopText(product.nombre)}</span>
              <span class="cart-item-code">Código: ${escapeShopText(product.codigo || product.id)}</span>
              <span class="cart-item-price">${product.precio} c/u · Subtotal ${subtotal.toFixed(2)}</span>
            </div>
            <div class="cart-item-actions">
              <button class="cart-qty-btn cart-qty-minus" type="button" data-id="${item.id}">−</button>
              <span class="cart-qty-value">${item.cantidad}</span>
              <button class="cart-qty-btn cart-qty-plus" type="button" data-id="${item.id}">+</button>
              <button class="cart-remove" type="button" data-id="${item.id}" title="Quitar del carrito">✕</button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  const total = cartTotal();
  if (totalEl) totalEl.textContent = `$${total}`;

  const count = cartItemCount();
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  }

  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
}

function bumpCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  badge.classList.add("bump");
  setTimeout(() => badge.classList.remove("bump"), 250);
}

function openCartDrawer() {
  document.getElementById("cartDrawer")?.classList.add("open");
  document.getElementById("cartScrim")?.classList.add("open");
}

function closeCartDrawer() {
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("cartScrim")?.classList.remove("open");
}

function buildWhatsAppOrderMessage() {
  const lines = ["Hola XKOVARK, quiero realizar este pedido:", ""];
  cart.forEach((item, index) => {
    const product = findProduct(item.id);
    if (!product) return;
    const subtotal = product.precio * item.cantidad;
    lines.push(`${index + 1}. ${product.nombre}`);
    lines.push(`Código: ${product.codigo || product.id}`);
    lines.push(`Cantidad: ${item.cantidad} · Subtotal: $${subtotal.toFixed(2)}`);
    // Enlace compacto a la ficha con fotos, sin pegar la URL extensa de la imagen.
    // El código identifica el producto y conserva la foto visible en la tienda.
    if (product.images?.[0]) {
      const productLink = new URL(window.location.pathname, window.location.origin);
      productLink.searchParams.set("p", product.codigo || product.id);
      lines.push(`Foto del producto: ${productLink.href}`);
    }
    lines.push("");
  });
  lines.push(`TOTAL: $${cartTotal().toFixed(2)} USD`);
  lines.push("Por favor, confirmen disponibilidad, pago y envío.");
  return lines.join("\n");
}

function checkoutViaWhatsApp() {
  if (cart.length === 0) return;
  const message = encodeURIComponent(buildWhatsAppOrderMessage());
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
}

function initCart() {
  cart = loadCart();
  renderCart();

  document.getElementById("cartToggle")?.addEventListener("click", () => {
    renderCart();
    openCartDrawer();
  });
  document.getElementById("cartClose")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cartScrim")?.addEventListener("click", closeCartDrawer);
  document.getElementById("checkoutBtn")?.addEventListener("click", checkoutViaWhatsApp);

  // Delegación de eventos: funciona aunque las tarjetas se
  // vuelvan a dibujar al buscar, filtrar u ordenar.
  document.addEventListener("click", (e) => {
    const plusBtn = e.target.closest(".qty-plus");
    const minusBtn = e.target.closest(".qty-minus");
    const addBtn = e.target.closest(".btn-add-cart");
    const quickAddBtn = e.target.closest(".card-quick-add");
    const cartQtyPlus = e.target.closest(".cart-qty-plus");
    const cartQtyMinus = e.target.closest(".cart-qty-minus");
    const cartRemoveBtn = e.target.closest(".cart-remove");

    if (quickAddBtn) {
      if (quickAddBtn.disabled) return;
      const id = quickAddBtn.dataset.id;
      if (!addToCart(id, 1)) return;
      quickAddBtn.textContent = "✓";
      quickAddBtn.classList.add("added");
      window.setTimeout(() => {
        if (!quickAddBtn.isConnected) return;
        quickAddBtn.textContent = "+";
        quickAddBtn.classList.remove("added");
      }, 1100);
      return;
    }

    if (plusBtn || minusBtn) {
      const stepper = (plusBtn || minusBtn).closest(".qty-stepper");
      const valueEl = stepper?.querySelector(".qty-value");
      if (!valueEl) return;
      let val = parseInt(valueEl.textContent) || 1;
      val = plusBtn ? val + 1 : Math.max(1, val - 1);
      valueEl.textContent = val;
      return;
    }

    if (addBtn) {
      if (addBtn.disabled) return;
      const card = addBtn.closest(".card");
      if (!card) return;
      const id = card.dataset.id;
      const qty = parseInt(card.querySelector(".qty-value")?.textContent) || 1;
      addToCart(id, qty);

      const originalText = addBtn.textContent;
      addBtn.textContent = "Agregado ✓";
      addBtn.classList.add("added");
      setTimeout(() => {
        addBtn.textContent = originalText;
        addBtn.classList.remove("added");
      }, 1200);
      return;
    }

    if (cartQtyPlus || cartQtyMinus) {
      const id = (cartQtyPlus || cartQtyMinus).dataset.id;
      changeCartQty(id, cartQtyPlus ? 1 : -1);
      return;
    }

    if (cartRemoveBtn) {
      removeFromCart(cartRemoveBtn.dataset.id);
      return;
    }
  });
}

/* ============================================================
   LIGHTBOX: ampliar imagen de producto al hacer click
   ============================================================ */

function openLightbox(src, alt) {
  const img = document.getElementById("lightboxImg");
  const scrim = document.getElementById("lightboxScrim");
  if (!img || !scrim) return;
  img.loading = "eager";
  img.decoding = "async";
  img.src = src;
  img.alt = alt || "";
  scrim.classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightboxScrim")?.classList.remove("open");
}

// Vista de producto inspirada en las fichas de tiendas de streetwear.
let detailProduct = null;
let detailImagePosition = 0;
let detailPreviousFocus = null;

function setProductDetailPhoto(position) {
  if (!detailProduct) return;
  const images = detailProduct.images || [];
  const img = document.getElementById("detailProductImage");
  const photoFrame = document.querySelector(".product-detail-photo");
  if (!images.length) {
    if (img) { img.removeAttribute("src"); img.alt = "Sin imagen disponible"; }
    if (photoFrame) photoFrame.classList.add("detail-photo-empty");
    document.getElementById("detailImageIndex").textContent = "Sin imagen";
    document.getElementById("detailPrev").hidden = true;
    document.getElementById("detailNext").hidden = true;
    return;
  }
  if (photoFrame) photoFrame.classList.remove("detail-photo-empty");
  detailImagePosition = (position + images.length) % images.length;
  if (img) {
    img.decoding = "async";
    img.loading = "eager";
    img.src = images[detailImagePosition];
    img.alt = detailProduct.nombre + " — foto " + (detailImagePosition + 1);
  }
  document.getElementById("detailImageIndex").textContent = (detailImagePosition + 1) + " / " + images.length;
  document.getElementById("detailPrev").hidden = images.length < 2;
  document.getElementById("detailNext").hidden = images.length < 2;
}

function openProductDetail(id) {
  const p = PRODUCTS.find(item => String(item.id) === String(id));
  if (!p) return;
  detailProduct = p;
  detailPreviousFocus = document.activeElement;
  document.getElementById("detailProductName").textContent = p.nombre;
  document.getElementById("detailProductCategory").textContent = CATEGORY_LABELS[p.categoria] || p.categoria;
  document.getElementById("detailProductPrice").textContent = "$" + Number(p.precio).toFixed(2);
  const oldPrice = document.getElementById("detailProductOldPrice");
  oldPrice.textContent = p.precioAntes ? "$" + Number(p.precioAntes).toFixed(2) : "";
  oldPrice.hidden = !p.precioAntes;
  document.getElementById("detailProductStock").textContent = AVAIL_LABELS[p.disponibilidad] || p.disponibilidad;
  document.getElementById("detailProductDescription").textContent = p.desc || "Consulta los detalles de esta pieza con nuestro equipo.";
  document.getElementById("detailQuantity").value = "1";
  const add = document.getElementById("detailAddCart");
  add.disabled = p.disponibilidad === "agotado";
  add.textContent = add.disabled ? "Agotado" : "Agregar al carrito";
  setProductDetailPhoto(0);
  const overlay = document.getElementById("productDetailOverlay");
  overlay.hidden = false;
  document.body.classList.add("product-detail-open");
  document.getElementById("productDetailClose").focus();
}
function closeProductDetail() {
  const overlay = document.getElementById("productDetailOverlay");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("product-detail-open");
  detailProduct = null;
  if (detailPreviousFocus?.isConnected) detailPreviousFocus.focus();
}
// Al abrir el enlace corto desde WhatsApp, muestra directamente la foto y ficha.
let linkedProductOpened = false;
function openLinkedProductIfAvailable() {
  if (linkedProductOpened) return;
  const code = new URLSearchParams(window.location.search).get("p");
  if (!code) return;
  const product = PRODUCTS.find(item => String(item.codigo || "") === code || String(item.id) === code);
  if (!product || !document.getElementById("productDetailOverlay")) return;
  linkedProductOpened = true;
  openProductDetail(product.id);
}

function initProductDetail() {
  const overlay = document.getElementById("productDetailOverlay");
  if (!overlay) return;
  overlay.querySelectorAll("[data-detail-close]").forEach(el => el.addEventListener("click", closeProductDetail));
  document.getElementById("productDetailClose").addEventListener("click", closeProductDetail);
  document.getElementById("detailPrev").addEventListener("click", () => setProductDetailPhoto(detailImagePosition - 1));
  document.getElementById("detailNext").addEventListener("click", () => setProductDetailPhoto(detailImagePosition + 1));
  document.getElementById("detailQtyMinus").addEventListener("click", () => {
    const q = document.getElementById("detailQuantity");
    q.value = Math.max(1, Math.min(99, Number(q.value || 1) - 1));
  });
  document.getElementById("detailQtyPlus").addEventListener("click", () => {
    const q = document.getElementById("detailQuantity");
    q.value = Math.max(1, Math.min(99, Number(q.value || 1) + 1));
  });
  document.getElementById("detailAddCart").addEventListener("click", () => {
    if (!detailProduct || detailProduct.disponibilidad === "agotado") return;
    const q = document.getElementById("detailQuantity");
    const amount = Math.max(1, Math.min(99, Math.floor(Number(q.value) || 1)));
    if (!addToCart(detailProduct.id, amount)) return;
    closeProductDetail();
    openCartDrawer();
  });
  document.addEventListener("keydown", e => {
    if (overlay.hidden) return;
    if (e.key === "Escape") closeProductDetail();
    if (e.key === "ArrowLeft") setProductDetailPhoto(detailImagePosition - 1);
    if (e.key === "ArrowRight") setProductDetailPhoto(detailImagePosition + 1);
    if (e.key === "Tab") {
      const focusable = [...overlay.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled])')].filter(x => x.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

function initLightbox() {
  document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);

  document.getElementById("lightboxScrim")?.addEventListener("click", (e) => {
    // Cierra si se hace click en el fondo oscuro, no en la imagen
    if (e.target.id === "lightboxScrim") closeLightbox();
  });

  // Delegación: funciona con cualquier imagen de producto, incluso
  // las que se vuelven a dibujar al buscar o filtrar.
  document.addEventListener("click", (e) => {
    const card = e.target.closest("#catalogo-grid .card, #ofertas-grid .card");
    if (card && !e.target.closest(".gallery-arrow, .gdot, .qty-row, .btn-add-cart, .card-quick-add")) {
      openProductDetail(card.dataset.id);
    }
  });
  document.addEventListener("keydown", (e) => {
    const card = e.target.closest("#catalogo-grid .card, #ofertas-grid .card");
    if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openProductDetail(card.dataset.id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

// ============================================================
//  INICIALIZACIÓN
// ============================================================

async function init() {
  console.log("Iniciando XKOVARK...");

  const cacheado = leerCache();

  if (cacheado && cacheado.length) {
    // Visita repetida: se pinta al instante con lo guardado
    aplicarDatos(cacheado);
  } else {
    // Primera visita: mensaje mientras llega la respuesta
    const loaderHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--grey);">
        <p style="font-size: 16px;">Cargando productos...</p>
      </div>
    `;
    ["ofertas-grid", "catalogo-grid"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = loaderHTML;
    });
  }

  // Todo lo demás se inicializa sin esperar a la red
  initFilterBar();
  initHeaderScroll();
  initDrawer();
  initCart();
  initLightbox();
  initProductDetail();
  openLinkedProductIfAvailable();
  attachRevealObservers();

  // Eventos de navegación por categoría
  document.querySelectorAll("[data-goto-cat]").forEach(btn => {
    btn.addEventListener("click", () => goToCatalog(btn.dataset.gotoCat));
  });

  // Si llegamos redirigidos desde otra página (ej. opiniones.html)
  // con una categoría pendiente, la aplicamos ahora.
  try {
    const pendingCat = localStorage.getItem("xkovark_pending_cat");
    if (pendingCat && document.getElementById("catalogo")) {
      localStorage.removeItem("xkovark_pending_cat");
      goToCatalog(pendingCat);
    }
  } catch (e) { /* ignorar */ }

  // Datos frescos en segundo plano
  try {
    const frescos = await peticionTemprana;
    if (!Array.isArray(frescos) || frescos.length === 0) {
      throw new Error("La hoja está vacía o la respuesta no es válida");
    }
    // Solo repinta si algo cambió en la hoja
    if (JSON.stringify(frescos) !== JSON.stringify(cacheado)) {
      guardarCache(frescos);
      aplicarDatos(frescos);
      openLinkedProductIfAvailable();
      console.log(`${PRODUCTS.length} productos actualizados`);
    }
  } catch (error) {
    console.error("Error cargando productos:", error);
    if (!cacheado) showError("No se pudieron cargar los productos. Por favor, intenta de nuevo más tarde.");
    // Si había caché, el visitante sigue viendo los productos guardados
  }
}

// ============================================================
//  EJECUTAR CUANDO EL DOM ESTÉ LISTO
// ============================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
