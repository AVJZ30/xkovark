/* ============================================================
   ⭐ XKOVARK - Opiniones (conectado a Supabase)
   ============================================================
   CONFIGURACIÓN
   1. Crea un proyecto en https://supabase.com
   2. Ve a Table Editor y crea una tabla llamada "opiniones" con:
        - id            uuid   (primary key, default: uuid_generate_v4())
        - nombre        text
        - calificacion  int2
        - comentario    text
        - created_at    timestamptz  (default: now())
   3. Ve a Authentication > Policies (o "RLS") y activa Row Level
      Security en la tabla, con estas 2 políticas:
        - SELECT: permitir a "anon" leer todas las filas
        - INSERT: permitir a "anon" insertar filas
      (Sin esto, Supabase bloquea todo por defecto y esta página
      no podrá leer ni guardar opiniones.)
   4. Ve a Project Settings > API y copia:
        - Project URL       → pégalo en SUPABASE_URL
        - anon / public key → pégalo en SUPABASE_ANON_KEY
   ============================================================ */

const SUPABASE_URL = "PON-AQUI-TU-SUPABASE-URL";       // ej: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = "PON-AQUI-TU-SUPABASE-ANON-KEY";
const TABLE_NAME = "opiniones";

let supabaseClient = null;
let selectedRating = 0;

// ============================================================
//  INICIALIZAR CLIENTE DE SUPABASE
// ============================================================

function initSupabaseClient() {
  if (typeof supabase === "undefined") {
    console.error("❌ No se cargó la librería de Supabase (revisa el <script> del CDN en el HTML).");
    return null;
  }
  if (SUPABASE_URL.includes("PON-AQUI") || SUPABASE_ANON_KEY.includes("PON-AQUI")) {
    console.warn("⚠️ Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en opiniones.js");
    return null;
  }
  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================================
//  ESTRELLAS (SVG reutilizable)
// ============================================================

function starSVG(filled, small) {
  return `
    <svg class="star ${filled ? "filled" : ""} ${small ? "small" : ""}" viewBox="0 0 24 24">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6L12 2z"/>
    </svg>
  `;
}

function starsRow(rating, small) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += starSVG(i <= rating, small);
  }
  return html;
}

// ============================================================
//  CARGAR Y MOSTRAR OPINIONES
// ============================================================

async function loadOpiniones() {
  const grid = document.getElementById("reviewsGrid");
  if (grid) {
    grid.innerHTML = `<div class="reviews-loading">Cargando opiniones...</div>`;
  }

  if (!supabaseClient) {
    showConfigWarning();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderSummary(data || []);
    renderReviews(data || []);
  } catch (err) {
    console.error("Error cargando opiniones:", err);
    if (grid) {
      grid.innerHTML = `
        <div class="reviews-error">
          No se pudieron cargar las opiniones ahora mismo.<br>
          <a href="#" onclick="location.reload();return false;">Reintentar</a>
        </div>`;
    }
  }
}

function renderSummary(list) {
  const scoreEl = document.getElementById("ratingScore");
  const starsEl = document.getElementById("ratingStarsSummary");
  const countEl = document.getElementById("ratingCount");
  if (!scoreEl || !starsEl || !countEl) return;

  if (list.length === 0) {
    scoreEl.textContent = "—";
    starsEl.innerHTML = starsRow(0, false);
    countEl.textContent = "Todavía no hay opiniones. ¡Sé el primero!";
    return;
  }

  const avg = list.reduce((sum, r) => sum + (Number(r.calificacion) || 0), 0) / list.length;
  scoreEl.textContent = avg.toFixed(1);
  starsEl.innerHTML = starsRow(Math.round(avg), false);
  countEl.textContent = `Basado en ${list.length} ${list.length === 1 ? "opinión" : "opiniones"}`;
}

function renderReviews(list) {
  const grid = document.getElementById("reviewsGrid");
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<div class="reviews-empty">Todavía no hay opiniones. Sé el primero en dejar la tuya más abajo.</div>`;
    return;
  }

  grid.innerHTML = list.map(reviewCardHTML).join("");
}

function reviewCardHTML(r) {
  const fecha = r.created_at
    ? new Date(r.created_at).toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "numeric" })
    : "";
  const nombre = (r.nombre || "Cliente XKOVARK").toString();
  const comentario = (r.comentario || "").toString();
  const rating = Number(r.calificacion) || 0;
  const foto = (r.foto_url || "").toString().trim();

  const fotoHTML = foto
    ? `<img src="${foto}" alt="Foto de ${escapeHTML(nombre)}" class="review-photo" loading="lazy">`
    : "";

  return `
    <div class="review-card reveal in">
      ${fotoHTML}
      <div class="rating-stars">${starsRow(rating, true)}</div>
      <span class="review-name">${escapeHTML(nombre)}</span>
      <span class="review-date">${fecha}</span>
      <p class="review-comment">${escapeHTML(comentario)}</p>
    </div>
  `;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showConfigWarning() {
  const grid = document.getElementById("reviewsGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="reviews-error">
        Esta sección todavía no está conectada a Supabase.<br>
        Configura SUPABASE_URL y SUPABASE_ANON_KEY en <code>opiniones.js</code>.
      </div>`;
  }
  const countEl = document.getElementById("ratingCount");
  if (countEl) countEl.textContent = "Conecta Supabase para ver el promedio real.";
}

// ============================================================
//  SELECTOR DE ESTRELLAS EN EL FORMULARIO
// ============================================================

function initStarPicker() {
  const picker = document.getElementById("starPicker");
  if (!picker) return;

  const buttons = picker.querySelectorAll("button");

  function paint(rating) {
    buttons.forEach((btn, i) => {
      const star = btn.querySelector(".star");
      star.classList.toggle("filled", i < rating);
    });
  }

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      selectedRating = i + 1;
      paint(selectedRating);
    });
    btn.addEventListener("mouseenter", () => paint(i + 1));
  });

  picker.addEventListener("mouseleave", () => paint(selectedRating));
}

// ============================================================
//  PREVISUALIZAR FOTO ELEGIDA
// ============================================================

function initFilePreview() {
  const input = document.getElementById("reviewFoto");
  const preview = document.getElementById("filePreview");
  if (!input || !preview) return;

  input.addEventListener("change", () => {
    preview.innerHTML = "";
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFormMessage("La foto pesa más de 5 MB. Elige una más liviana.", "error");
      input.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    preview.appendChild(img);
  });
}

// ============================================================
//  SUBIR FOTO A SUPABASE STORAGE
// ============================================================

const FOTOS_BUCKET = "opiniones-fotos";

async function subirFotoOpinion(file) {
  if (!file) return null;

  const extension = file.name.split(".").pop();
  const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(FOTOS_BUCKET)
    .upload(nombreArchivo, file);

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage
    .from(FOTOS_BUCKET)
    .getPublicUrl(nombreArchivo);

  return data?.publicUrl || null;
}

// ============================================================
//  ENVIAR NUEVA OPINIÓN
// ============================================================

function showFormMessage(text, type) {
  const el = document.getElementById("formMessage");
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${type}`;
}

function initReviewForm() {
  const form = document.getElementById("reviewForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("reviewNombre").value.trim();
    const comentario = document.getElementById("reviewComentario").value.trim();
    const fotoInput = document.getElementById("reviewFoto");
    const submitBtn = document.getElementById("reviewSubmit");

    if (!nombre || !comentario || selectedRating === 0) {
      showFormMessage("Completa tu nombre, calificación y comentario antes de enviar.", "error");
      return;
    }

    if (!supabaseClient) {
      showFormMessage("Esta sección aún no está conectada a Supabase. Configura las claves en opiniones.js.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      let fotoUrl = null;
      const file = fotoInput.files[0];

      if (file) {
        submitBtn.textContent = "Subiendo foto...";
        fotoUrl = await subirFotoOpinion(file);
        submitBtn.textContent = "Guardando...";
      }

      const { error } = await supabaseClient.from(TABLE_NAME).insert([
        { nombre, calificacion: selectedRating, comentario, foto_url: fotoUrl }
      ]);

      if (error) throw error;

      showFormMessage("¡Gracias por tu opinión! Ya se agregó a la lista.", "success");
      form.reset();
      selectedRating = 0;
      document.querySelectorAll("#starPicker .star").forEach(s => s.classList.remove("filled"));
      document.getElementById("filePreview").innerHTML = "";
      loadOpiniones();
    } catch (err) {
      console.error("Error guardando opinión:", err);
      showFormMessage("No se pudo guardar tu opinión. Intenta de nuevo en un momento.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar opinión";
    }
  });
}

// ============================================================
//  INICIALIZACIÓN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient = initSupabaseClient();
  loadOpiniones();
  initStarPicker();
  initReviewForm();
  initFilePreview();
});
