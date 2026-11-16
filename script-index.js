
// ==========================================
// CONFIGURACIÓN DE LA API
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbzKD7nYVzpinWuY1TObdXh0_a-OKUXyEjgM0spwRG135IeEHuu1m9Y7g61f_i_u5R-v/exec";

// ==========================================
// CARGAR TALLERES
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    cargarTalleres();
});

async function cargarTalleres() {
  const contenedor = document.getElementById("talleres-container");
  if (!contenedor) return;

  contenedor.innerHTML = "<p>Cargando talleres...</p>";

  try {
    const respuesta = await fetch(`${API_URL}?action=talleres`);
    
    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    const talleres = await respuesta.json();

    if (!Array.isArray(talleres)) {
      throw new Error("La respuesta no es una lista válida de talleres.");
    }

    mostrarTalleres(talleres, contenedor);
  } catch (error) {
    console.error("Error al cargar talleres:", error);
    contenedor.innerHTML = `
      <p class="talleres-error">
        No fue posible cargar los talleres. Intenta nuevamente más tarde.
      </p>
    `;
  }
}


// ==========================================
// MOSTRAR TALLERES EN EL HTML
// ==========================================


function mostrarTalleres(talleres, contenedor) {
    if (!talleres || talleres.length === 0) {
        contenedor.innerHTML = `
            <p class="talleres-empty">
                Próximamente anunciaremos nuestros talleres.
            </p>
        `;
        return;
    }

    contenedor.innerHTML = "";

    talleres.forEach((taller, index) => {
        const disponibles = Number(taller.disponibles) || 0;
        const agotado = disponibles <= 0;

        const tarjeta = document.createElement("article");
        tarjeta.className = "taller-card";

        tarjeta.innerHTML = `
            <div class="taller-top">
                <span class="taller-label">TALLER ${String(index + 1).padStart(2, "0")}</span>
                <span class="taller-status ${agotado ? "agotado" : ""}">
                    ${agotado ? "Cupo agotado" : "Inscripciones abiertas"}
                </span>
            </div>

            <div class="taller-content">
                <h3>${escaparHTML(taller.nombre)}</h3>

                <p class="taller-instructor">
                    <span>Imparte</span>
                    ${escaparHTML(taller.tallerista)}
                </p>

                <p class="taller-description">
                    ${escaparHTML(taller.descripcion)}
                </p>
            </div>

            <div class="taller-bottom">
                <span class="taller-availability">
                    ${agotado
                        ? "Sin lugares disponibles"
                        : `${disponibles} lugares disponibles`}
                </span>
            </div>
        `;

        contenedor.appendChild(tarjeta);
    });
}


// ==========================================
// PROTECCIÓN DE TEXTO HTML
// ==========================================

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}
