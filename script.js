/* ============================================================
   CONFIGURACIÓN - CAMBIA ESTA URL POR LA TUYA
   ============================================================ */
// 📌 PASO 1: Publica tu hoja de Google Sheets como CSV
// Ve a Archivo > Compartir > Publicar en la web > Hoja completa > CSV
// Copia la URL y pégala abajo:

const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/https://script.google.com/macros/s/AKfycbx0gPeRzKW24nS82HQUs9qNLyJ3Vn27uQ7V1H7WGrlFpEbuCXUYH8pKEUwmTEVyIKxH7Q/exec/export?format=csv&gid=0";
//                                ↑ Reemplaza ### con tu ID de hoja

// ============================================================
//  CARGA DE DATOS DESDE GOOGLE SHEETS
// ============================================================

let PRODUCTS = [];
let allProductsLoaded = false;

async function loadProductsFromSheet() {
  try {
    const response = await fetch(SPREADSHEET_URL);
    if (!response.ok) throw new Error("Error al cargar la hoja de cálculo");
    const csvData = await response.text();
    const rows = csvToArray(csvData);
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    // Mapeo de columnas esperadas
    const colMap = {};
    headers.forEach((h, i) => {
      if (h === "nombre_producto") colMap.nombre = i;
      else if (h === "categoria") colMap.categoria = i;
      else if (h === "descripcion") colMap.descripcion = i;
      else if (h === "precio") colMap.precio = i;
      else if (h === "en_oferta") colMap.en_oferta = i;
      else if (h === "imagen_frente") colMap.imagen_frente = i;
      else if (h === "imagen_espalda") colMap.imagen_espalda = i;
      else if (h === "disponibilidad") colMap.disponibilidad = i;
    });

    // Verificar columnas requeridas
    const required = ["nombre", "categoria", "descripcion", "precio", "disponibilidad"];
    const missing = required.filter(r => !(r in colMap));
    if (missing.length) {
      console.warn("Faltan columnas en la hoja:", missing);
    }

    // Procesar datos
    const products = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every(cell => cell.trim() === "")) continue;
      
      const nombre = row[colMap.nombre]?.trim() || "";
      if (!nombre) continue; // Saltar filas sin nombre
      
      const categoria = row[colMap.categoria]?.trim().toLowerCase() || "extras";
      const descripcion = row[colMap.descripcion]?.trim() || "";
      const precio = parseFloat(row[colMap.precio]?.trim()) || 0;
      const en_oferta = row[colMap.en_oferta]?.trim().toLowerCase() === "true" || 
                        row[colMap.en_oferta]?.trim() === "TRUE" || 
                        row[colMap.en_oferta]?.trim() === "1";
      const imagen_frente = row[colMap.imagen_frente]?.trim() || "";
      const imagen_espalda = row[colMap.imagen_espalda]?.trim() || "";
      const disponibilidad = row[colMap.disponibilidad]?.trim().toLowerCase() || "stock";
      
      // Crear ID único basado en el nombre
      const id = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      // Determinar tags
      const tags = [];
      if (en_oferta) tags.push("oferta");
      // Las primeras 3 filas con imágenes se marcan como destacadas
      if (i <= 3 && imagen_frente) tags.push("destacado");
      // Novedades: marcar como nuevo si tiene imagen_espalda y no es oferta
      if (imagen_espalda && !en_oferta && i <= 5) tags.push("nuevo");
      
      // Construir objeto producto
      const imagenes = [];
      if (imagen_frente) imagenes.push(imagen_frente);
      if (imagen_espalda) imagenes.push(imagen_espalda);
      
      products.push({
        id: id,
        categoria: categoria,
        nombre: nombre,
        desc: descripcion,
        precio: precio,
        precioAntes: en_oferta ? Math.round(precio * 1.2) : null, // Simular precio anterior
        tags: tags,
        disponibilidad: disponibilidad,
        images: imagenes.length > 0 ? imagenes : [] // Array de URLs
      });
    }
    
    PRODUCTS = products;
    allProductsLoaded = true;
    return products;
  } catch (error) {
    console.error("Error cargando productos desde Google Sheets:", error);
    // Usar datos de respaldo
    PRODUCTS = getFallbackProducts();
    allProductsLoaded = true;
    return PRODUCTS;
  }
}

// ============================================================
//  UTILIDAD: Convertir CSV a Array
// ============================================================
function csvToArray(csv) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    
    if (char === '"') {
      if (insideQuotes && csv[i+1] === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && i+1 < csv.length && csv[i+1] === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }
  
  // Última fila
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== "")) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

// ============================================================
//  DATOS DE RESPALDO (si falla la carga de Google Sheets)
// ============================================================
function getFallbackProducts() {
  return [
    { id:"cadena-cubana", categoria:"joyeria", nombre:"Cadena Cubana", desc:"Eslabones macizos, baño de oro 18k.", precio:260, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:[] },
    { id:"pulsera-cubana", categoria:"joyeria", nombre:"Pulsera Cubana", desc:"El mismo eslabón de la cadena, en pulso.", precio:150, precioAntes:null, tags:[], disponibilidad:"stock", images:[] },
    { id:"pulsera-moisanita", categoria:"joyeria", nombre:"Pulsera de Moisanita", desc:"El brillo de un diamante, engaste cerrado.", precio:210, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:[] },
    { id:"aretes-moisanita", categoria:"joyeria", nombre:"Aretes de Moisanita", desc:"Talla brillante, para toda ocasión.", precio:175, precioAntes:210, tags:["oferta"], disponibilidad:"pocas", images:[] },
  ];
}

// ============================================================
//  CONSTANTES Y RENDER
// ============================================================
const CATEGORY_LABELS = {
  joyeria:"Joyería", gafas:"Gafas", vestimenta:"Vestimenta", bolsos:"Bolsos", extras:"Extras"
};
const AVAIL_LABELS = { stock:"En stock", pocas:"Pocas unidades", agotado:"Agotado" };

function cardHTML(p) {
  const badge = p.disponibilidad === "agotado" ? `<span class="badge agotado">Agotado</span>`
    : p.tags.includes("oferta") ? `<span class="badge oferta">Oferta</span>`
    : p.tags.includes("nuevo") ? `<span class="badge nuevo">Nuevo</span>` : "";

  // Generar imágenes de galería
  let imagesHTML = "";
  if (p.images && p.images.length > 0) {
    const imgs = p.images;
    const dots = imgs.map((_, i) => 
      `<span class="gdot ${i===0?'active':''}" data-idx="${i}"></span>`
    ).join("");
    
    imagesHTML = `
      <div class="product-gallery">
        <img src="${imgs[0]}" alt="${p.nombre}" class="gallery-main" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%231a1a17%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2396958c%22 font-family=%22monospace%22 font-size=%2212%22%3EFOTO%3C/text%3E%3C/svg%3E'">
        ${imgs.length > 1 ? `<div class="gallery-dots">${dots}</div>` : ""}
      </div>
    `;
  } else {
    // Placeholder si no hay imágenes
    imagesHTML = `
      <div class="placeholder">
        <div class="placeholder-label">${p.nombre}<br><span style="font-size:9px;">Sin imagen</span></div>
      </div>
    `;
  }

  const priceHTML = p.precioAntes
    ? `<span class="price-old">$${p.precioAntes}</span><span class="price">$${p.precio}</span>`
    : `<span class="price">$${p.precio}</span>`;

  return `
  <div class="card reveal ${p.disponibilidad==='agotado'?'is-agotado':''}" data-id="${p.id}" data-categoria="${p.categoria}" id="${p.id}">
    <div class="card-img">
      ${imagesHTML}
      ${badge}
    </div>
    <div class="card-body">
      <span class="name">${p.nombre}</span>
      <span class="desc">${p.desc}</span>
      <div class="card-foot">
        <div class="price-wrap">${priceHTML}</div>
        <span class="availability"><span class="dot-status ${p.disponibilidad}"></span>${AVAIL_LABELS[p.disponibilidad] || p.disponibilidad}</span>
      </div>
    </div>
  </div>`;
}

function renderGrid(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = list.length
    ? list.map(cardHTML).join("")
    : `<div class="empty-state">No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría.</div>`;
}

// ============================================================
//  SECCIONES CURADAS
// ============================================================
function renderCurated() {
  renderGrid("destacados-grid", PRODUCTS.filter(p => p.tags.includes("destacado")).slice(0,5));
  renderGrid("novedades-grid", PRODUCTS.filter(p => p.tags.includes("nuevo")));
  renderGrid("ofertas-grid", PRODUCTS.filter(p => p.tags.includes("oferta")));
}

// ============================================================
//  CATÁLOGO FILTRABLE
// ============================================================
let state = { search:"", categoria:"todas", soloStock:false, orden:"relevancia" };

function applyFilters() {
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
  attachGalleryDots();
}

function goToCatalog(categoria) {
  state.categoria = categoria;
  const catFilter = document.getElementById("categoryFilter");
  if (catFilter) catFilter.value = categoria;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.cat === categoria));
  applyFilters();
  document.getElementById("catalogo")?.scrollIntoView({behavior:"smooth"});
  closeDrawer();
}

// ============================================================
//  INTERACCIONES
// ============================================================
function initFilterBar() {
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categoryFilter");
  const stockCheck = document.getElementById("onlyStock");
  const sortSelect = document.getElementById("sortSelect");

  if (searchInput) searchInput.addEventListener("input", e => { state.search = e.target.value; applyFilters(); });
  if (categorySelect) {
    categorySelect.addEventListener("change", e => {
      state.categoria = e.target.value;
      document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.cat === e.target.value));
      applyFilters();
    });
  }
  if (stockCheck) stockCheck.addEventListener("change", e => { state.soloStock = e.target.checked; applyFilters(); });
  if (sortSelect) sortSelect.addEventListener("change", e => { state.orden = e.target.value; applyFilters(); });

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
        const imgs = card?.querySelectorAll(".gallery-main");
        if (img && imgs) {
          const idx = parseInt(dot.dataset.idx);
          // Si hay más imágenes en un array, aquí se podría cambiar la src
          // Para simplificar, solo cambiamos el dot activo
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
//  HEADER / DRAWER
// ============================================================
function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
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
  
  // Buscar en drawer
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

// ============================================================
//  INIT
// ============================================================
async function init() {
  // Cargar productos desde Google Sheets
  await loadProductsFromSheet();
  
  // Renderizar todo
  renderCurated();
  applyFilters();
  initFilterBar();
  initHeaderScroll();
  initDrawer();
  attachRevealObservers();

  // Eventos para navegación por categoría
  document.querySelectorAll("[data-goto-cat]").forEach(btn => {
    btn.addEventListener("click", () => goToCatalog(btn.dataset.gotoCat));
  });
}

document.addEventListener("DOMContentLoaded", init);
