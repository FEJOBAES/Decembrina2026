
// ==========================================
// CONFIGURACIÓN
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbzKD7nYVzpinWuY1TObdXh0_a-OKUXyEjgM0spwRG135IeEHuu1m9Y7g61f_i_u5R-v/exec";

let datosAdmin = {
    estadisticas: {},
    participantes: [],
    talleres: []
};

let participantesFiltrados = [];
let paginaActual = 1;
const participantesPorPagina = 10;



// ==========================================
// CONTROL DE ACCESO
// ==========================================

const PALABRA_CLAVE_ADMIN = "2026fejobaes";

document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.getElementById("form-acceso");

    formulario.addEventListener("submit", function (event) {

        event.preventDefault();

        const clave = document.getElementById("clave-admin").value;
        const mensaje = document.getElementById("error-acceso");

        if (clave === PALABRA_CLAVE_ADMIN) {

            // Acceso correcto
            document.getElementById("pantalla-acceso").remove();

            // Inicializar el panel
            inicializarPanel();

        } else {

            // Acceso incorrecto
            mensaje.textContent = "Palabra clave incorrecta.";

            document.getElementById("clave-admin").value = "";
            document.getElementById("clave-admin").focus();

        }

    });

});


// ==========================================
// INICIALIZAR PANEL ADMINISTRATIVO
// ==========================================

function inicializarPanel() {

    configurarNavegacion();
    configurarModales();
    configurarFiltros();
    configurarMenuMovil();

    const btnRecargar = document.getElementById("btn-recargar");

    if (btnRecargar) {
        btnRecargar.addEventListener("click", cargarDatosAdmin);
    }

    // Los datos solamente se consultan después
    // de introducir correctamente la palabra clave.

    cargarDatosAdmin();
}



// ==========================================
// CONSULTAR DATOS DEL BACKEND
// ==========================================


async function cargarDatosAdmin() {
    try {
        const url = `${API_URL}?action=admin&timestamp=${Date.now()}`;

        console.log("Consultando API:", url);

        const response = await fetch(url);

        console.log("Estado HTTP:", response.status);

        const texto = await response.text();

        console.log("Respuesta original:", texto);

        const data = JSON.parse(texto);

        console.log("Datos recibidos:", data);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        if (data.success === false) {
            throw new Error(data.error || "El servidor devolvió un error.");
        }

        if (!Array.isArray(data.participantes) ||
            !Array.isArray(data.talleres)) {
            throw new Error("La respuesta no contiene participantes y talleres en el formato esperado.");
        }

        datosAdmin = data;

        actualizarResumen(data);
        actualizarFiltros(data);

        // Inicializar la lista de participantes filtrados.
        participantesFiltrados = [...data.participantes];
        paginaActual = 1;

        renderizarParticipantes();
        renderizarTalleres();

        console.log("Panel cargado correctamente.");

    } catch (error) {
        console.error("Error al cargar el panel:", error);
        mostrarError(error.message);
    }
}



// ==========================================
// ESTADO DE CARGA
// ==========================================

function mostrarEstadoCarga() {

    const tabla = document.getElementById("tabla-participantes");

    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="admin-empty">
                    Cargando participantes...
                </td>
            </tr>
        `;
    }

    const talleres = document.getElementById("admin-talleres-container");

    if (talleres) {
        talleres.innerHTML = `
            <p class="admin-empty">Cargando talleres...</p>
        `;
    }
}


// ==========================================
// MOSTRAR ERRORES
// ==========================================

function mostrarError(mensaje) {

    const tabla = document.getElementById("tabla-participantes");

    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="admin-empty">
                    ${escaparHTML(mensaje)}
                </td>
            </tr>
        `;
    }

    const talleres = document.getElementById("admin-talleres-container");

    if (talleres) {
        talleres.innerHTML = `
            <p class="admin-empty">${escaparHTML(mensaje)}</p>
        `;
    }
}


// ==========================================
// ACTUALIZAR RESUMEN GENERAL
// ==========================================

function actualizarResumen() {

    const stats = datosAdmin.estadisticas;

    asignarTexto("stat-participantes", stats.participantes || 0);
    asignarTexto("stat-talleres", stats.talleres || 0);
    asignarTexto("stat-ocupados", stats.ocupados || 0);
    asignarTexto("stat-disponibles", stats.disponibles || 0);

    asignarTexto("total-inscritos", stats.participantes || 0);
    asignarTexto("total-federaciones", stats.federaciones || 0);
    asignarTexto("total-zonas", stats.zonas || 0);

    asignarTexto(
        "resumen-total-participantes",
        stats.participantes || 0
    );

    asignarTexto("talleres-total", stats.talleres || 0);

    const disponibles = datosAdmin.talleres.filter(function(taller) {
        return taller.disponibles > 0;
    }).length;

    const llenos = datosAdmin.talleres.filter(function(taller) {
        return taller.disponibles <= 0;
    }).length;

    asignarTexto("talleres-disponibles", disponibles);
    asignarTexto("talleres-llenos", llenos);

    renderizarResumenTalleres();
}


// ==========================================
// RESUMEN DE OCUPACIÓN POR TALLER
// ==========================================

function renderizarResumenTalleres() {

    const contenedor = document.getElementById("resumen-talleres");

    if (!contenedor) return;

    if (!datosAdmin.talleres.length) {
        contenedor.innerHTML = `
            <p class="admin-empty">Todavía no hay talleres registrados.</p>
        `;
        return;
    }

    contenedor.innerHTML = datosAdmin.talleres.map(function(taller) {

        const porcentaje = taller.limite > 0
            ? Math.min(100, (taller.inscritos / taller.limite) * 100)
            : 0;

        return `
            <div class="workshop-summary-item">

                <div class="workshop-summary-info">
                    <strong>${escaparHTML(taller.nombre)}</strong>

                    <span>
                        ${taller.inscritos} / ${taller.limite} inscritos
                    </span>
                </div>

                <div class="workshop-progress">
                    <div
                        class="workshop-progress-bar"
                        style="width: ${porcentaje}%"
                    ></div>
                </div>

                <small>
                    ${taller.disponibles} cupos disponibles
                </small>

            </div>
        `;

    }).join("");
}


// ==========================================
// ACTUALIZAR FILTROS
// ==========================================

function actualizarFiltros() {

    const federaciones = [...new Set(
        datosAdmin.participantes
            .map(p => p.federacion)
            .filter(Boolean)
    )];

    const zonas = [...new Set(
        datosAdmin.participantes
            .map(p => p.zona)
            .filter(Boolean)
    )];

    llenarSelect("filtro-federacion", federaciones, "Todas las federaciones");
    llenarSelect("filtro-zona", zonas, "Todas las zonas");

    const talleres = datosAdmin.talleres.map(t => ({
        value: t.id,
        label: t.nombre
    }));

    llenarSelectObjetos(
        "filtro-taller",
        talleres,
        "Todos los talleres"
    );
}


function llenarSelect(id, valores, textoInicial) {

    const select = document.getElementById(id);

    if (!select) return;

    const valorAnterior = select.value;

    select.innerHTML = `
        <option value="">${escaparHTML(textoInicial)}</option>
    `;

    valores.sort().forEach(function(valor) {

        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;

        select.appendChild(option);
    });

    select.value = valorAnterior;
}


function llenarSelectObjetos(id, valores, textoInicial) {

    const select = document.getElementById(id);

    if (!select) return;

    const valorAnterior = select.value;

    select.innerHTML = `
        <option value="">${escaparHTML(textoInicial)}</option>
    `;

    valores.forEach(function(item) {

        const option = document.createElement("option");

        option.value = item.value;
        option.textContent = item.label;

        select.appendChild(option);
    });

    select.value = valorAnterior;
}


// ==========================================
// CONFIGURAR FILTROS
// ==========================================

function configurarFiltros() {

    const ids = [
        "buscar-participante",
        "filtro-autorizado",
        "filtro-federacion",
        "filtro-zona",
        "filtro-taller",
        "buscar-taller",
        "filtro-estado-taller"
    ];

    ids.forEach(function(id) {

        const elemento = document.getElementById(id);

        if (!elemento) return;

        elemento.addEventListener("input", function() {

            if (id === "buscar-taller" || id === "filtro-estado-taller") {
                renderizarTalleres();
            } else {
                paginaActual = 1;
                aplicarFiltrosParticipantes();
            }

        });

        elemento.addEventListener("change", function() {

            if (id === "buscar-taller" || id === "filtro-estado-taller") {
                renderizarTalleres();
            } else {
                paginaActual = 1;
                aplicarFiltrosParticipantes();
            }

        });
    });
}


// ==========================================
// FILTRAR PARTICIPANTES
// ==========================================

function aplicarFiltrosParticipantes() {

    const busqueda = obtenerValor("buscar-participante").toLowerCase();
    const federacion = obtenerValor("filtro-federacion");
    const zona = obtenerValor("filtro-zona");
    const taller = obtenerValor("filtro-taller");
    const autorizado = obtenerValor("filtro-autorizado");

    participantesFiltrados = datosAdmin.participantes.filter(function(p) {

        const texto = [
            p.nombre,
            p.correo,
            p.telefono,
            p.iglesia,
            p.federacion,
            p.zona,
            p.taller
        ].join(" ").toLowerCase();

        const coincideBusqueda = texto.includes(busqueda);

        const coincideFederacion = !federacion ||
            p.federacion === federacion;

        const coincideZona = !zona ||
            p.zona === zona;

        const coincideTaller = !taller ||
            String(p.tallerID) === String(taller);

        const estadoAutorizacion = convertirBooleano(p.autorizado);

        const coincideAutorizacion = autorizado === "" ||
            estadoAutorizacion === (autorizado === "true");

        return (
            coincideBusqueda &&
            coincideFederacion &&
            coincideZona &&
            coincideTaller &&
            coincideAutorizacion
        );

    });

    paginaActual = 1;
    renderizarParticipantes();
}


// ==========================================
// RENDERIZAR TABLA DE PARTICIPANTES
// ==========================================

function renderizarParticipantes() {

    const tabla = document.getElementById("tabla-participantes");

    if (!tabla) return;

    const inicio = (paginaActual - 1) * participantesPorPagina;

    const participantes = participantesFiltrados.slice(
        inicio,
        inicio + participantesPorPagina
    );

    asignarTexto(
        "resultados-participantes",
        participantesFiltrados.length + " participantes encontrados"
    );

    if (!participantes.length) {

        tabla.innerHTML = `
            <tr>
                <td colspan="8" class="admin-empty">
                    No se encontraron participantes.
                </td>
            </tr>
        `;

        renderizarPaginacion();
        return;
    }

    tabla.innerHTML = participantes.map(function(p) {

        return `
            <tr>
                <td>
                    <strong>${escaparHTML(p.nombre)}</strong>
                </td>

                <td>${escaparHTML(p.federacion)}</td>

                <td>${escaparHTML(p.zona)}</td>

                <td>${escaparHTML(p.taller)}</td>

                <td>${escaparHTML(p.telefono)}</td>

                <td>${escaparHTML(p.correo)}</td>

                <td>
                    ${
                        convertirBooleano(p.autorizado)
                            ? `<span class="authorization-approved">✓ Autorizado</span>`
                            : `<span class="authorization-pending">Pendiente</span>`
                    }
                </td>

                <td>
                    <button
                        class="btn-view"
                        data-participante="${escaparHTML(p.id)}"
                    >
                        Ver ficha
                    </button>
                </td>
            </tr>
        `;

    }).join("");

    tabla.querySelectorAll("[data-participante]").forEach(function(btn) {

        btn.addEventListener("click", function() {
            abrirFichaParticipante(this.dataset.participante);
        });

    });

    renderizarPaginacion();
}


// ==========================================
// PAGINACIÓN
// ==========================================

function renderizarPaginacion() {

    const contenedor = document.getElementById("paginacion-participantes");

    if (!contenedor) return;

    const totalPaginas = Math.ceil(
        participantesFiltrados.length / participantesPorPagina
    );

    if (totalPaginas <= 1) {
        contenedor.innerHTML = "";
        return;
    }

    let html = `
        <button
            class="pagination-btn"
            data-page="${paginaActual - 1}"
            ${paginaActual === 1 ? "disabled" : ""}
        >
            Anterior
        </button>
    `;

    for (let i = 1; i <= totalPaginas; i++) {

        html += `
            <button
                class="pagination-btn ${i === paginaActual ? "active" : ""}"
                data-page="${i}"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button
            class="pagination-btn"
            data-page="${paginaActual + 1}"
            ${paginaActual === totalPaginas ? "disabled" : ""}
        >
            Siguiente
        </button>
    `;

    contenedor.innerHTML = html;

    contenedor.querySelectorAll("[data-page]").forEach(function(btn) {

        btn.addEventListener("click", function() {

            const nuevaPagina = Number(this.dataset.page);

            if (
                nuevaPagina < 1 ||
                nuevaPagina > totalPaginas
            ) return;

            paginaActual = nuevaPagina;

            renderizarParticipantes();

        });

    });
}


// ==========================================
// ABRIR FICHA DE PARTICIPANTE
// ==========================================

function abrirFichaParticipante(id) {

    const participante = datosAdmin.participantes.find(function(p) {
        return String(p.id) === String(id);
    });

    if (!participante) return;

    const contenedor = document.getElementById("detalle-participante");

    if (!contenedor) return;

    contenedor.innerHTML = `

        <div class="participant-profile">

            <div class="participant-profile-header">
                <h2>${escaparHTML(participante.nombre)}</h2>
                <p>Ficha de inscripción</p>
            </div>

            <div class="participant-profile-grid">

                ${campoFicha("Edad", participante.edad)}
                ${campoFicha("Teléfono", participante.telefono)}
                ${campoFicha("Correo electrónico", participante.correo)}
                ${campoFicha("Talla", participante.talla)}
                ${campoFicha("Federación", participante.federacion)}
                ${campoFicha("Zona", participante.zona)}
                ${campoFicha("Iglesia", participante.iglesia)}
                ${campoFicha("Taller", participante.taller)}
                ${campoFicha("Tallerista", participante.tallerista)}
                ${campoFicha("Folio", participante.id)}
                ${campoFicha(
                    "Estado de autorización",
                    participante.autorizado ? "Autorizado" : "Pendiente de revisión"
                )}

            </div>

            <div class="participant-documents">

                <h3>Documentos</h3>

                <div class="participant-document-links">

                    ${enlaceDocumento("Carta de acreditación", participante.carta)}

                    ${enlaceDocumento("Comprobante de pago", participante.pago)}

                </div>

            </div>

            <div class="participant-authorization">

                ${
                    participante.autorizado
                        ? `
                            <div class="authorization-approved">
                                <span>✓</span>
                                Participante autorizado
                            </div>
                        `
                        : `
                            <button
                                type="button"
                                class="btn-authorize"
                                id="btn-autorizar-participante"
                                data-participante="${escaparHTML(participante.id)}"
                            >
                                Autorizar / Confirmar
                            </button>
                        `
                }

            </div>

        </div>

    `;

    abrirModal("modal-participante");

    const botonAutorizar = document.getElementById(
        "btn-autorizar-participante"
    );

    if (botonAutorizar) {

        botonAutorizar.addEventListener("click", function() {
            autorizarParticipante(this.dataset.participante);
        });

    }
}

// Cierre de la ficha del participante
document.addEventListener("click", function (event) {

    const botonCerrar = event.target.closest(
        "[data-close-modal], .modal-close"
    );

    if (botonCerrar) {
        const modal = botonCerrar.closest(".admin-modal") ||
            document.getElementById("modal-participante");

        if (modal) {
            modal.classList.remove("active");
        }

        return;
    }

    // Cerrar al hacer clic en el fondo del modal
    if (event.target.id === "modal-participante") {
        event.target.classList.remove("active");
    }

});


function campoFicha(titulo, valor) {

    return `
        <div class="participant-profile-field">
            <span>${escaparHTML(titulo)}</span>
            <strong>${escaparHTML(valor || "No disponible")}</strong>
        </div>
    `;
}


function enlaceDocumento(nombre, url) {

    if (!url) {
        return `
            <div class="participant-document">
                <span>${escaparHTML(nombre)}</span>
                <small>No se ha cargado</small>
            </div>
        `;
    }

    return `
        <a
            class="participant-document"
            href="${escaparHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            <span>${escaparHTML(nombre)}</span>
            <small>Ver documento ↗</small>
        </a>
    `;
}


// ==========================================
// RENDERIZAR TALLERES
// ==========================================

function renderizarTalleres() {

    const contenedor = document.getElementById("admin-talleres-container");

    if (!contenedor) return;

    const busqueda = obtenerValor("buscar-taller").toLowerCase();
    const estado = obtenerValor("filtro-estado-taller");

    const talleres = datosAdmin.talleres.filter(function(taller) {

        const coincideNombre = (
            taller.nombre + " " + taller.tallerista
        ).toLowerCase().includes(busqueda);

        const lleno = taller.disponibles <= 0;

        const coincideEstado =
            !estado ||
            (estado === "lleno" && lleno) ||
            (estado === "disponible" && !lleno);

        return coincideNombre && coincideEstado;
    });

    if (!talleres.length) {

        contenedor.innerHTML = `
            <p class="admin-empty">No se encontraron talleres.</p>
        `;

        return;
    }

    contenedor.innerHTML = talleres.map(function(taller) {

        const porcentaje = taller.limite > 0
            ? Math.min(100, (taller.inscritos / taller.limite) * 100)
            : 0;

        const lleno = taller.disponibles <= 0;

        return `

            <article class="admin-workshop-card">

                <div class="admin-workshop-header">

                    <div>
                        <h3>${escaparHTML(taller.nombre)}</h3>

                        <p>
                            Tallerista:
                            ${escaparHTML(taller.tallerista)}
                        </p>
                    </div>

                    <span class="workshop-status ${lleno ? "full" : "available"}">
                        ${lleno ? "Cupo lleno" : "Disponible"}
                    </span>

                </div>

                <p class="admin-workshop-description">
                    ${escaparHTML(taller.descripcion)}
                </p>

                <div class="workshop-summary-info">

                    <strong>Ocupación</strong>

                    <span>
                        ${taller.inscritos} / ${taller.limite}
                    </span>

                </div>

                <div class="workshop-progress">
                    <div
                        class="workshop-progress-bar"
                        style="width: ${porcentaje}%"
                    ></div>
                </div>

                <div class="admin-workshop-footer">

                    <span>
                        ${taller.disponibles} cupos disponibles
                    </span>

                    <button
                        class="btn-view"
                        data-taller="${escaparHTML(taller.id)}"
                    >
                        Ver inscritos
                    </button>

                </div>

            </article>

        `;

    }).join("");

    contenedor.querySelectorAll("[data-taller]").forEach(function(btn) {

        btn.addEventListener("click", function() {
            abrirDetalleTaller(this.dataset.taller);
        });

    });
}


// ==========================================
// DETALLE DE TALLER
// ==========================================

function abrirDetalleTaller(id) {

    const taller = datosAdmin.talleres.find(function(t) {
        return String(t.id) === String(id);
    });

    if (!taller) return;

    const detalle = document.getElementById("detalle-taller");
    const tabla = document.getElementById("tabla-participantes-taller");

    if (detalle) {

        detalle.innerHTML = `

            <h2>${escaparHTML(taller.nombre)}</h2>

            <p>${escaparHTML(taller.descripcion)}</p>

            <div class="workshop-detail-stats">

                <div>
                    <strong>${taller.inscritos}</strong>
                    <span>Inscritos</span>
                </div>

                <div>
                    <strong>${taller.limite}</strong>
                    <span>Cupo total</span>
                </div>

                <div>
                    <strong>${taller.disponibles}</strong>
                    <span>Disponibles</span>
                </div>

            </div>

            <p>
                Tallerista:
                <strong>${escaparHTML(taller.tallerista)}</strong>
            </p>

        `;
    }

    if (tabla) {

        if (!taller.participantes.length) {

            tabla.innerHTML = `
                <tr>
                    <td colspan="6" class="admin-empty">
                        Este taller todavía no tiene participantes.
                    </td>
                </tr>
            `;

        } else {

            tabla.innerHTML = taller.participantes.map(function(p) {

                return `
                    <tr>
                        <td>${escaparHTML(p.nombre)}</td>
                        <td>${escaparHTML(p.federacion)}</td>
                        <td>${escaparHTML(p.zona)}</td>
                        <td>${escaparHTML(p.telefono)}</td>
                        <td>
                            <button
                                class="btn-view"
                                data-participante="${escaparHTML(p.id)}"
                            >
                                Ver ficha
                            </button>
                        </td>
                    </tr>
                `;

            }).join("");

            tabla.querySelectorAll("[data-participante]").forEach(function(btn) {

                btn.addEventListener("click", function() {

                    cerrarModal("modal-taller");

                    abrirFichaParticipante(this.dataset.participante);

                });

            });
        }
    }

    abrirModal("modal-taller");
}


// ==========================================
// NAVEGACIÓN
// ==========================================

function configurarNavegacion() {

    document.querySelectorAll("[data-section]").forEach(function(btn) {

        btn.addEventListener("click", function() {
            cambiarSeccion(this.dataset.section);
        });

    });

    document.querySelectorAll("[data-go]").forEach(function(btn) {

        btn.addEventListener("click", function() {
            cambiarSeccion(this.dataset.go);
        });

    });
}


function cambiarSeccion(seccion) {

    document.querySelectorAll(".admin-section").forEach(function(elemento) {
        elemento.classList.remove("active");
    });

    document.querySelectorAll("[data-section]").forEach(function(elemento) {
        elemento.classList.remove("active");
    });

    const destino = document.getElementById(seccion);

    if (destino) {
        destino.classList.add("active");
    }

    const boton = document.querySelector(
        '[data-section="' + seccion + '"]'
    );

    if (boton) {
        boton.classList.add("active");
    }

    cerrarMenuMovil();
}


// ==========================================
// MODALES
// ==========================================

function configurarModales() {

    document.querySelectorAll("[data-close-modal]").forEach(function(btn) {

        btn.addEventListener("click", function() {
            cerrarModal(this.dataset.closeModal);
        });

    });

    document.querySelectorAll(".admin-modal").forEach(function(modal) {

        modal.addEventListener("click", function(event) {

            if (event.target === modal) {
                modal.classList.remove("active");
            }

        });

    });

    document.addEventListener("keydown", function(event) {

        if (event.key === "Escape") {

            document.querySelectorAll(".admin-modal.active").forEach(function(modal) {
                modal.classList.remove("active");
            });

        }

    });
}


function abrirModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add("active");
    }
}


function cerrarModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove("active");
    }
}


// ==========================================
// MENÚ MÓVIL
// ==========================================

function configurarMenuMovil() {

    const boton = document.getElementById("menu-toggle");
    const overlay = document.getElementById("sidebar-overlay");

    if (boton) {
        boton.addEventListener("click", function() {
            document.getElementById("sidebar")?.classList.toggle("open");
            overlay?.classList.toggle("active");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", cerrarMenuMovil);
    }
}


function cerrarMenuMovil() {

    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.remove("active");
}


// ==========================================
// UTILIDADES
// ==========================================

function obtenerValor(id) {

    const elemento = document.getElementById(id);

    return elemento ? elemento.value.trim() : "";
}

function convertirBooleano(valor) {

    if (typeof valor === "boolean") {
        return valor;
    }

    return String(valor).trim().toLowerCase() === "true";
}


function asignarTexto(id, valor) {

    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}


function escaparHTML(valor) {

    return String(valor ?? "").replace(/[&<>"']/g, function(caracter) {

        const entidades = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entidades[caracter];
    });
}

// ==========================================
// AUTORIZAR / CONFIRMAR PARTICIPANTE
// ==========================================

async function autorizarParticipante(id) {

    const participante = datosAdmin.participantes.find(function(p) {
        return String(p.id) === String(id);
    });

    if (!participante) {
        alert("No se encontró al participante.");
        return;
    }

    if (participante.autorizado) {
        alert("Este participante ya está autorizado.");
        return;
    }

    const confirmar = confirm(
        `¿Deseas autorizar la inscripción de ${participante.nombre}?\n\nSe enviará un correo electrónico de confirmación.`
    );

    if (!confirmar) return;

    const boton = document.getElementById("btn-autorizar-participante");

    try {

        if (boton) {
            boton.disabled = true;
            boton.textContent = "Autorizando...";
        }

        const response = await fetch(API_URL, {
            method: "POST",

            // text/plain evita el preflight OPTIONS
            // que puede causar problemas con Apps Script.
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({
                action: "autorizar",
                jovenID: id
            })
        });

        const texto = await response.text();
        const resultado = JSON.parse(texto);

        if (!response.ok || resultado.success === false) {
            throw new Error(
                resultado.error || "No fue posible autorizar al participante."
            );
        }

        if (!resultado.autorizado) {
            throw new Error(
                resultado.mensaje || "El servidor no confirmó la autorización."
            );
        }

        // Actualizar el estado local del participante.
        participante.autorizado = true;

        // Actualizar también su registro dentro del taller.
        datosAdmin.talleres.forEach(function(taller) {

            taller.participantes?.forEach(function(p) {

                if (String(p.id) === String(id)) {
                    p.autorizado = true;
                }

            });

        });

        // Actualizar la tabla y volver a abrir la ficha.
        renderizarParticipantes();
        abrirFichaParticipante(id);

        alert(
            resultado.correoEnviado
                ? "¡Participante autorizado! Se envió el correo de confirmación."
                : resultado.mensaje || "Participante autorizado."
        );

    } catch (error) {

        console.error("Error al autorizar participante:", error);

        alert("No se pudo completar la autorización: " + error.message);

        if (boton) {
            boton.disabled = false;
            boton.textContent = "Autorizar / Confirmar";
        }

    }
}