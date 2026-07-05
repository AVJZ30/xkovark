/* ============================================================
   🚀 XKOVARK - Script principal para la tienda online
   ============================================================
   CONFIGURACIÓN - Cambia esta URL por la de tu Apps Script
   ============================================================ */

// ✅ REEMPLAZA con la URL de tu Apps Script (la que copiaste al implementar)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbx0gPeRzKW24nS82HQUs9qNLyJ3Vn27uQ7V1H7WGrlFpEbuCXUYH8pKEUwmTEVyIKxH7Q/exec";

// Número de WhatsApp para recibir pedidos del carrito (mismo que el resto del sitio)
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
//  CARGA DE PRODUCTOS DESDE APPS SCRIPT
// ============================================================

async function loadProductsFromSheet() {
  try {
    console.log("🔄 Cargando productos desde Apps Script...");
    console.log("📡 URL:", SPREADSHEET_URL);
    
    const response = await fetch(SPREADSHEET_URL);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("✅ Datos recibidos:", data);
    
    // Verificar si es un array
    if (!Array.isArray(data)) {
      throw new Error("Los datos recibidos no son un array válido");
    }
    
    if (data.length === 0) {
      throw new Error("La hoja está vacía, no hay productos para mostrar");
    }
    
    // Mapear los datos al formato que espera la tienda
    PRODUCTS = data.map((item, index) => {
      // Determinar tags
      const tags = [];
      if (item.en_oferta === true || item.en_oferta === "true") {
        tags.push("oferta");
      }
      
      // Crear array de imágenes
      const images = [];
      if (item.imagen_frente && item.imagen_frente.trim() !== "") {
        images.push(item.imagen_frente);
      }
      if (item.imagen_espalda && item.imagen_espalda.trim() !== "") {
        images.push(item.imagen_espalda);
      }
      
      // Determinar precio anterior (para ofertas)
      let precioAntes = null;
      if (item.en_oferta === true || item.en_oferta === "true") {
        const precioActual = parseFloat(item.precio) || 0;
        precioAntes = Math.round(precioActual * 1.2);
      }
      
      // Validar que los campos requeridos existan
      if (!item.nombre_producto && !item.nombre) {
        console.warn(`⚠️ Producto en fila ${index + 2} sin nombre, saltando...`);
        return null;
      }
      
      return {
        id: item.id || item.nombre_producto?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `producto-${index}`,
        categoria: item.categoria?.toLowerCase() || "extras",
        nombre: item.nombre_producto || item.nombre || "Producto sin nombre",
        desc: item.descripcion || "",
        precio: parseFloat(item.precio) || 0,
        precioAntes: precioAntes,
        tags: tags,
        disponibilidad: item.disponibilidad?.toLowerCase() || "stock",
        images: images
      };
    }).filter(p => p !== null); // Eliminar productos nulos
    
    // Agregar tags automáticos (destacados, novedades)
    PRODUCTS.forEach((p, i) => {
      // Los primeros 3 con imágenes son destacados
      if (i < 3 && p.images.length > 0 && !p.tags.includes("destacado")) {
        p.tags.push("destacado");
      }
      // Los siguientes 3 sin oferta son novedades
      if (i >= 3 && i < 6 && p.images.length > 0 && !p.tags.includes("oferta") && !p.tags.includes("destacado")) {
        p.tags.push("nuevo");
      }
    });
    
    allProductsLoaded = true;
    console.log(`✅ ${PRODUCTS.length} productos cargados desde Apps Script`);
    console.log("📦 Tags disponibles:", [...new Set(PRODUCTS.flatMap(p => p.tags))]);
    return PRODUCTS;
    
  } catch (error) {
    console.error("❌ Error cargando productos:", error);
    allProductsLoaded = false;
    
    // Mostrar mensaje de error en la página
    showError("No se pudieron cargar los productos. Por favor, intenta de nuevo más tarde.");
    
    return [];
  }
}

// ============================================================
//  MOSTRAR ERROR EN LA PÁGINA
// ============================================================

function showError(message) {
  const containers = [
    "destacados-grid",
    "novedades-grid", 
    "ofertas-grid",
    "catalogo-grid"
  ];
  
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--grey);">
          <p style="font-size: 18px; margin-bottom: 12px;">⚠️ ${message}</p>
          <p style="font-size: 13px; color: var(--grey-dim);">Verifica que tu hoja de Google Sheets esté publicada correctamente.</p>
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
  joyeria: "Joyería", 
  pulseras: "Pulseras",
  gafas: "Gafas", 
  vestimenta: "Vestimenta", 
  bolsos: "Bolsos", 
  extras: "Extras"
};

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
      : p.tags.includes("nuevo") 
        ? `<span class="badge nuevo">Nuevo</span>` 
        : "";

  let imagesHTML = "";
  if (p.images && p.images.length > 0) {
    const imgs = p.images;
    const dots = imgs.map((_, i) => 
      `<span class="gdot ${i===0?'active':''}" data-idx="${i}"></span>`
    ).join("");
    
    imagesHTML = `
      <div class="product-gallery">
        <img src="${imgs[0]}" alt="${p.nombre}" class="gallery-main" loading="lazy" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%231a1a17%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2396958c%22 font-family=%22monospace%22 font-size=%2212%22%3ESin%20imagen%3C/text%3E%3C/svg%3E'">
        ${imgs.length > 1 ? `<div class="gallery-dots">${dots}</div>` : ""}
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
    <div class="card reveal ${agotado ? 'is-agotado' : ''}" 
         data-id="${p.id}" data-categoria="${p.categoria}" id="${p.id}">
      <div class="card-img">
        ${imagesHTML}
        ${badge}
      </div>
      <div class="card-body">
        <span class="name">${p.nombre}</span>
        <span class="desc">${p.desc}</span>
        <div class="card-foot">
          <div class="price-wrap">${priceHTML}</div>
          <span class="availability">
            <span class="dot-status ${p.disponibilidad}"></span>
            ${AVAIL_LABELS[p.disponibilidad] || p.disponibilidad}
          </span>
        </div>
        <div class="qty-row">
          <div class="qty-stepper" data-id="${p.id}">
            <button class="qty-btn qty-minus" type="button" aria-label="Restar cantidad">−</button>
            <span class="qty-value">1</span>
            <button class="qty-btn qty-plus" type="button" aria-label="Sumar cantidad">+</button>
          </div>
          <button class="btn-add-cart" type="button" data-id="${p.id}" ${agotado ? "disabled" : ""}>
            ${agotado ? "Agotado" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
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
  attachGalleryDots();
}

function renderCurated() {
  if (!allProductsLoaded || PRODUCTS.length === 0) return;
  
  const destacados = PRODUCTS.filter(p => p.tags.includes("destacado"));
  const novedades = PRODUCTS.filter(p => p.tags.includes("nuevo"));
  const ofertas = PRODUCTS.filter(p => p.tags.includes("oferta"));
  
  renderGrid("destacados-grid", destacados.slice(0, 5));
  renderGrid("novedades-grid", novedades);
  renderGrid("ofertas-grid", ofertas);
}

// ============================================================
//  FILTROS Y BÚSQUEDA
// ============================================================

function applyFilters() {
  if (!allProductsLoaded || PRODUCTS.length === 0) return;
  
  let list = PRODUCTS.filter(p => {
    const matchSearch = (p.nombre + " " + p.desc).toLowerCase().includes(state.search.toLowerCase());
    const matchCat = state.categoria === "todas" || p.categoria === state.categoria;
    const matchStock = !state.soloStock || p.disponibilidad !== "agotado";
    return matchSearch && matchCat && matchStock;
  });

  if (state.orden === "precio-asc") list.sort((a, b) => a.precio - b.precio);
  if (state.orden === "precio-desc") list.sort((a, b) => b.precio - a.precio);

  renderGrid("catalogo-grid", list);
  
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
      applyFilters(); 
    });
  }
  
  if (categorySelect) {
    categorySelect.addEventListener("change", e => {
      state.categoria = e.target.value;
      document.querySelectorAll(".chip").forEach(c => {
        c.classList.toggle("active", c.dataset.cat === e.target.value);
      });
      applyFilters();
    });
  }
  
  if (stockCheck) {
    stockCheck.addEventListener("change", e => { 
      state.soloStock = e.target.checked; 
      applyFilters(); 
    });
  }
  
  if (sortSelect) {
    sortSelect.addEventListener("change", e => { 
      state.orden = e.target.value; 
      applyFilters(); 
    });
  }

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      state.categoria = chip.dataset.cat;
      if (categorySelect) categorySelect.value = chip.dataset.cat;
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilters();
    });
  });
}

function attachGalleryDots() {
  document.querySelectorAll(".gallery-dots").forEach(wrap => {
    wrap.querySelectorAll(".gdot").forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        wrap.querySelectorAll(".gdot").forEach(d => d.classList.remove("active"));
        dot.classList.add("active");
        
        const card = wrap.closest(".card");
        const img = card?.querySelector(".gallery-main");
        if (img) {
          const idx = parseInt(dot.dataset.idx);
          const productId = card.dataset.id;
          const product = PRODUCTS.find(p => p.id === productId);
          if (product && product.images && product.images[idx]) {
            img.src = product.images[idx];
          }
        }
      });
    });
  });
}

function attachRevealObservers() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  
  document.querySelectorAll(".reveal:not(.in)").forEach(el => observer.observe(el));
}

// ============================================================
//  HEADER Y DRAWER (MENÚ MÓVIL)
// ============================================================

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  });
}

function openDrawer() {
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("scrim")?.classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer")?.classList.remove("open");
  document.getElementById("scrim")?.classList.remove("open");
}

function initDrawer() {
  document.getElementById("menuToggle")?.addEventListener("click", openDrawer);
  document.getElementById("drawerClose")?.addEventListener("click", closeDrawer);
  document.getElementById("scrim")?.addEventListener("click", closeDrawer);
  
  const drawerSearch = document.getElementById("drawerSearch");
  if (drawerSearch) {
    drawerSearch.addEventListener("input", (e) => {
      const mainSearch = document.getElementById("searchInput");
      if (mainSearch) {
        mainSearch.value = e.target.value;
        state.search = e.target.value;
        applyFilters();
      }
    });
  }
}

/* ============================================================
   🛒 CARRITO DE COMPRAS
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
  return PRODUCTS.find(p => p.id === id);
}

function addToCart(id, cantidad) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.cantidad += cantidad;
  } else {
    cart.push({ id, cantidad });
  }
  saveCart();
  renderCart();
  bumpCartBadge();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
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
            <div class="cart-item-info">
              <span class="cart-item-name">${product.nombre}</span>
              <span class="cart-item-price">$${product.precio} c/u · Subtotal $${subtotal}</span>
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
  const lines = ["Hola XKOVARK, quiero hacer este pedido:", ""];
  cart.forEach(item => {
    const product = findProduct(item.id);
    if (!product) return;
    const subtotal = product.precio * item.cantidad;
    lines.push(`• ${product.nombre} x${item.cantidad} — $${subtotal}`);
  });
  lines.push("", `Total: $${cartTotal()}`);
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
    const cartQtyPlus = e.target.closest(".cart-qty-plus");
    const cartQtyMinus = e.target.closest(".cart-qty-minus");
    const cartRemoveBtn = e.target.closest(".cart-remove");

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
   🔍 LIGHTBOX: ampliar imagen de producto al hacer click
   ============================================================ */

function openLightbox(src, alt) {
  const img = document.getElementById("lightboxImg");
  const scrim = document.getElementById("lightboxScrim");
  if (!img || !scrim) return;
  img.src = src;
  img.alt = alt || "";
  scrim.classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightboxScrim")?.classList.remove("open");
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
    const img = e.target.closest(".gallery-main");
    if (img) openLightbox(img.src, img.alt);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

// ============================================================
//  INICIALIZACIÓN
// ============================================================

async function init() {
  console.log("🚀 Iniciando XKOVARK...");
  
  // Mostrar loader
  const loaderHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--grey);">
      <p style="font-size: 16px;"> Cargando productos...</p>
    </div>
  `;
  
  ["destacados-grid", "novedades-grid", "ofertas-grid", "catalogo-grid"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = loaderHTML;
  });
  
  // Cargar productos
  await loadProductsFromSheet();
  
  // Renderizar todo
  renderCurated();
  applyFilters();
  initFilterBar();
  initHeaderScroll();
  initDrawer();
  initCart();
  initLightbox();
  attachRevealObservers();

  // Eventos de navegación por categoría
  document.querySelectorAll("[data-goto-cat]").forEach(btn => {
    btn.addEventListener("click", () => goToCatalog(btn.dataset.gotoCat));
  });
  
  if (allProductsLoaded && PRODUCTS.length > 0) {
    console.log(`✅ XKOVARK listo! ${PRODUCTS.length} productos cargados`);
  } else {
    console.warn("⚠️ XKOVARK iniciado sin productos");
  }

  // Si llegamos redirigidos desde otra página (ej. opiniones.html)
  // con una categoría pendiente, la aplicamos ahora.
  try {
    const pendingCat = localStorage.getItem("xkovark_pending_cat");
    if (pendingCat && document.getElementById("catalogo")) {
      localStorage.removeItem("xkovark_pending_cat");
      goToCatalog(pendingCat);
    }
  } catch (e) { /* ignorar */ }
}

// ============================================================
//  EJECUTAR CUANDO EL DOM ESTÉ LISTO
// ============================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
