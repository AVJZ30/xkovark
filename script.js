/* ============ DATOS DE PRODUCTO ============
   Reemplaza "images" por tus URLs reales (1 a 3 fotos por producto).
   availability: "stock" | "pocas" | "agotado"
   tags: cualquier combinación de "destacado", "nuevo", "oferta"
*/
const PRODUCTS = [
  // JOYERÍA
  { id:"cadena-cubana", categoria:"joyeria", nombre:"Cadena Cubana", desc:"Eslabones macizos, baño de oro 18k.", precio:260, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:3 },
  { id:"pulsera-cubana", categoria:"joyeria", nombre:"Pulsera Cubana", desc:"El mismo eslabón de la cadena, en pulso.", precio:150, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"pulsera-moisanita", categoria:"joyeria", nombre:"Pulsera de Moisanita", desc:"El brillo de un diamante, engaste cerrado.", precio:210, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:3 },
  { id:"aretes-moisanita", categoria:"joyeria", nombre:"Aretes de Moisanita", desc:"Talla brillante, para toda ocasión.", precio:175, precioAntes:210, tags:["oferta"], disponibilidad:"pocas", images:2 },
  { id:"pulsera-trebol", categoria:"joyeria", nombre:"Pulsera Trébol", desc:"Motivo trébol en baño de plata, cierre oculto.", precio:195, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:2 },
  { id:"grillz", categoria:"joyeria", nombre:"Grillz", desc:"Molde a medida, acabado espejo.", precio:180, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"reloj", categoria:"joyeria", nombre:"Reloj XKOVARK", desc:"Caja de acero, cristal zafiro.", precio:340, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:3 },

  // GAFAS
  { id:"gafas-deportivas", categoria:"gafas", nombre:"Gafas Deportivas", desc:"Marco envolvente, lente polarizada.", precio:85, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"gafas-piloto", categoria:"gafas", nombre:"Gafas Piloto Metálicas", desc:"Puente fino, acabado plateado.", precio:120, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:2 },
  { id:"gafas-brasilenas", categoria:"gafas", nombre:"Gafas Brasileñas", desc:"Silueta oversize, estilo urbano.", precio:78, precioAntes:95, tags:["oferta"], disponibilidad:"stock", images:2 },

  // VESTIMENTA
  { id:"camisa", categoria:"vestimenta", nombre:"Camisa Manifiesto", desc:"Bordado frontal, tipografía en la espalda.", precio:95, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:2 },
  { id:"buzo", categoria:"vestimenta", nombre:"Buzo Oversize", desc:"Algodón pesado, capucha forrada.", precio:130, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:3 },
  { id:"joggers", categoria:"vestimenta", nombre:"Jogger Estructurado", desc:"Caída recta, cintura ajustable.", precio:110, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"bermuda", categoria:"vestimenta", nombre:"Bermuda Cargo", desc:"Bolsillos utilitarios, corte relajado.", precio:88, precioAntes:null, tags:[], disponibilidad:"pocas", images:2 },
  { id:"conjunto", categoria:"vestimenta", nombre:"Conjunto Buzo + Jogger", desc:"El set completo, a juego exacto.", precio:220, precioAntes:250, tags:["oferta"], disponibilidad:"stock", images:3 },
  { id:"gorra", categoria:"vestimenta", nombre:"Gorra Sin Costuras", desc:"Punto denso, calce cerrado.", precio:58, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"pasamontanas", categoria:"vestimenta", nombre:"Pasamontañas", desc:"Punto grueso, dos aberturas.", precio:45, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:2 },
  { id:"durag", categoria:"vestimenta", nombre:"Durag Satinado", desc:"Compresión suave, amarre largo.", precio:25, precioAntes:null, tags:[], disponibilidad:"stock", images:1 },

  // BOLSOS
  { id:"mochila", categoria:"bolsos", nombre:"Mochila Módulo", desc:"Compartimentos internos, base reforzada.", precio:220, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"bandolera", categoria:"bolsos", nombre:"Bandolera Cruzada", desc:"Correa ajustable, broche macizo.", precio:190, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },
  { id:"cartera-mujer", categoria:"bolsos", nombre:"Cartera de Mujer", desc:"Piel suave, cierre de marco.", precio:165, precioAntes:null, tags:["nuevo"], disponibilidad:"stock", images:2 },
  { id:"billetera", categoria:"bolsos", nombre:"Billetera Bimaterial", desc:"Piel y acero, perfil delgado.", precio:96, precioAntes:null, tags:[], disponibilidad:"stock", images:2 },

  // EXTRAS
  { id:"perfume", categoria:"extras", nombre:"Eau de XKOVARK", desc:"Madera, cuero, ámbar de fondo.", precio:130, precioAntes:null, tags:["destacado"], disponibilidad:"stock", images:2 },
  { id:"vape", categoria:"extras", nombre:"Vape Edición 01", desc:"Aluminio cepillado, grabado numerado.", precio:65, precioAntes:null, tags:[], disponibilidad:"agotado", images:1 },
  { id:"tatuajes", categoria:"extras", nombre:"Set Tatuajes Temporales", desc:"6 diseños, tinta de larga duración.", precio:22, precioAntes:null, tags:[], disponibilidad:"stock", images:1 },
  { id:"valquin", categoria:"extras", nombre:"Valquín", desc:"Pieza exclusiva de la línea XKOVARK.", precio:75, precioAntes:null, tags:["nuevo"], disponibilidad:"pocas", images:1 },
];

const CATEGORY_LABELS = {
  joyeria:"Joyería", gafas:"Gafas", vestimenta:"Vestimenta", bolsos:"Bolsos", extras:"Extras"
};
const AVAIL_LABELS = { stock:"En stock", pocas:"Pocas unidades", agotado:"Agotado" };

/* ============ RENDER DE TARJETA ============ */
function cardHTML(p){
  const badge = p.disponibilidad === "agotado" ? `<span class="badge agotado">Agotado</span>`
    : p.tags.includes("oferta") ? `<span class="badge oferta">Oferta</span>`
    : p.tags.includes("nuevo") ? `<span class="badge nuevo">Nuevo</span>` : "";

  const dots = Array.from({length:p.images}).map((_,i)=>
    `<span class="gdot ${i===0?'active':''}" data-idx="${i}"></span>`).join("");

  const priceHTML = p.precioAntes
    ? `<span class="price-old">$${p.precioAntes}</span><span class="price">$${p.precio}</span>`
    : `<span class="price">$${p.precio}</span>`;

  return `
  <div class="card reveal ${p.disponibilidad==='agotado'?'is-agotado':''}" data-id="${p.id}" data-categoria="${p.categoria}" id="${p.id}">
    <div class="card-img">
      <div class="placeholder" data-photo="1">
        <div class="placeholder-label">SUSTITUIR FOTO<br>${p.nombre}<br><span class="photo-count">Foto 1/${p.images}</span></div>
      </div>
      ${badge}
      ${p.images > 1 ? `<div class="gallery-dots">${dots}</div>` : ""}
    </div>
    <div class="card-body">
      <span class="name">${p.nombre}</span>
      <span class="desc">${p.desc}</span>
      <div class="card-foot">
        <div class="price-wrap">${priceHTML}</div>
        <span class="availability"><span class="dot-status ${p.disponibilidad}"></span>${AVAIL_LABELS[p.disponibilidad]}</span>
      </div>
    </div>
  </div>`;
}

function renderGrid(containerId, list){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = list.length
    ? list.map(cardHTML).join("")
    : `<div class="empty-state">No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría.</div>`;
}

/* ============ SECCIONES CURADAS ============ */
function renderCurated(){
  renderGrid("destacados-grid", PRODUCTS.filter(p=>p.tags.includes("destacado")).slice(0,5));
  renderGrid("novedades-grid", PRODUCTS.filter(p=>p.tags.includes("nuevo")));
  renderGrid("ofertas-grid", PRODUCTS.filter(p=>p.tags.includes("oferta")));
}

/* ============ CATÁLOGO FILTRABLE ============ */
let state = { search:"", categoria:"todas", soloStock:false, orden:"relevancia" };

function applyFilters(){
  let list = PRODUCTS.filter(p=>{
    const matchSearch = (p.nombre + " " + p.desc).toLowerCase().includes(state.search.toLowerCase());
    const matchCat = state.categoria === "todas" || p.categoria === state.categoria;
    const matchStock = !state.soloStock || p.disponibilidad !== "agotado";
    return matchSearch && matchCat && matchStock;
  });

  if(state.orden === "precio-asc") list.sort((a,b)=>a.precio-b.precio);
  if(state.orden === "precio-desc") list.sort((a,b)=>b.precio-a.precio);

  renderGrid("catalogo-grid", list);
  document.getElementById("resultCount").textContent = list.length + (list.length===1 ? " pieza" : " piezas");
  attachRevealObservers();
  attachGalleryDots();
}

function goToCatalog(categoria){
  state.categoria = categoria;
  document.getElementById("categoryFilter").value = categoria;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.cat === categoria));
  applyFilters();
  document.getElementById("catalogo").scrollIntoView({behavior:"smooth"});
  closeDrawer();
}

/* ============ INTERACCIONES ============ */
function initFilterBar(){
  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categoryFilter");
  const stockCheck = document.getElementById("onlyStock");
  const sortSelect = document.getElementById("sortSelect");

  searchInput.addEventListener("input", e => { state.search = e.target.value; applyFilters(); });
  categorySelect.addEventListener("change", e => {
    state.categoria = e.target.value;
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.cat === e.target.value));
    applyFilters();
  });
  stockCheck.addEventListener("change", e => { state.soloStock = e.target.checked; applyFilters(); });
  sortSelect.addEventListener("change", e => { state.orden = e.target.value; applyFilters(); });

  document.querySelectorAll(".chip").forEach(chip=>{
    chip.addEventListener("click", () => {
      state.categoria = chip.dataset.cat;
      categorySelect.value = chip.dataset.cat;
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilters();
    });
  });
}

function attachGalleryDots(){
  document.querySelectorAll(".gallery-dots").forEach(wrap=>{
    wrap.querySelectorAll(".gdot").forEach(dot=>{
      dot.addEventListener("click", (e)=>{
        e.stopPropagation();
        wrap.querySelectorAll(".gdot").forEach(d=>d.classList.remove("active"));
        dot.classList.add("active");
        const card = wrap.closest(".card");
        const label = card.querySelector(".photo-count");
        const total = wrap.querySelectorAll(".gdot").length;
        label.textContent = `Foto ${parseInt(dot.dataset.idx)+1}/${total}`;
      });
    });
  });
}

function attachRevealObservers(){
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add("in"); observer.unobserve(entry.target); } });
  }, {threshold:0.12});
  document.querySelectorAll(".reveal:not(.in)").forEach(el=>observer.observe(el));
}

/* ============ HEADER / DRAWER ============ */
function initHeaderScroll(){
  const header = document.getElementById("siteHeader");
  window.addEventListener("scroll", ()=>{
    header.classList.toggle("scrolled", window.scrollY > 40);
  });
}

function openDrawer(){ document.getElementById("drawer").classList.add("open"); document.getElementById("scrim").classList.add("open"); }
function closeDrawer(){ document.getElementById("drawer").classList.remove("open"); document.getElementById("scrim").classList.remove("open"); }

function initDrawer(){
  document.getElementById("menuToggle").addEventListener("click", openDrawer);
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("scrim").addEventListener("click", closeDrawer);
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", ()=>{
  renderCurated();
  applyFilters();
  initFilterBar();
  initHeaderScroll();
  initDrawer();
  attachRevealObservers();

  document.querySelectorAll("[data-goto-cat]").forEach(btn=>{
    btn.addEventListener("click", () => goToCatalog(btn.dataset.gotoCat));
  });
});
