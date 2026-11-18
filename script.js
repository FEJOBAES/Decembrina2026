// ==========================================
// CONFIGURACIÓN
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbzKD7nYVzpinWuY1TObdXh0_a-OKUXyEjgM0spwRG135IeEHuu1m9Y7g61f_i_u5R-v/exec";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const form = document.getElementById("formInscripcion");
const listaTalleres = document.getElementById("listaTalleres");
const mensaje = document.getElementById("mensaje");

// Elementos de la Modal
const modalEstado = document.getElementById("modalEstado");
const modalIcono = document.getElementById("modalIcono");
const modalTitulo = document.getElementById("modalTitulo");
const modalTexto = document.getElementById("modalTexto");
const btnCerrarModal = document.getElementById("btnCerrarModal");

// ==========================================
// CONTROL DE LA VENTANA MODAL INTERACTIVA
// ==========================================

// Variable de control para saber si el registro fue exitoso
let registroExitoso = false;

function abrirModalProcesando() {
    registroExitoso = false; // Reiniciamos el estado
    modalIcono.className = "modal-spinner";
    modalIcono.textContent = "";
    modalTitulo.textContent = "Procesando...";
    modalTexto.textContent = "Por favor, espera un momento mientras registramos tu solicitud de inscripción.";
    btnCerrarModal.style.display = "none";
    modalEstado.classList.add("active");
}

function actualizarModalResultado(exito, mensajePersonalizado) {
    registroExitoso = exito; // Guardamos si salió bien o mal

    if (exito) {
        modalIcono.className = "modal-icon-success";
        modalIcono.textContent = "✓";
        modalTitulo.textContent = "¡Solicitud de Inscripción Exitosa!";
        modalTexto.textContent = mensajePersonalizado || "Revisaremos tu documentación y te avisaremos por correo cuando todo esté listo para tu inscripción en la Concentración Decembrina 2026.";
        btnCerrarModal.textContent = "Volver al inicio"; // Texto personalizado para el éxito
    } else {
        modalIcono.className = "modal-icon-error";
        modalIcono.textContent = "✕";
        modalTitulo.textContent = "Hubo un problema";
        modalTexto.textContent = mensajePersonalizado || "No se pudo procesar tu registro. Por favor, inténtalo de nuevo. Si el error pesiste ponte en contacto con nosotros";
        btnCerrarModal.textContent = "Cerrar e intentar de nuevo"; // Texto para error
    }
    
    btnCerrarModal.style.display = "inline-block";
}

// Acción inteligente del botón de la modal
btnCerrarModal.addEventListener("click", () => {
    if (registroExitoso) {
        // Si se inscribió correctamente, redirige al index.html
        window.location.href = "index.html";
    } else {
        // Si hubo un error, solo cierra la ventana para que pueda corregir sus datos
        modalEstado.classList.remove("active");
    }
});


// ==========================================
// MOSTRAR MENSAJES (SISTEMA SECUNDARIO)
// ==========================================
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = tipo;
    mensaje.style.display = "block";
}

// ==========================================
// CONSULTAR TALLERES
// ==========================================
async function cargarTalleres(mostrarCarga = true) {
  try {
    if (mostrarCarga) {
      mostrarMensaje("Cargando talleres...", "info");
    }

    const response = await fetch(`${API_URL}?action=talleres`);
    if (!response.ok) {
      throw new Error("No se pudo establecer conexión con el servidor.");
    }

    const talleres = await response.json();

    // Verificamos que la respuesta realmente sea una lista (Array)
    if (!Array.isArray(talleres)) {
      throw new Error("El formato de los talleres recibidos no es válido.");
    }

    mostrarTalleres(talleres);

    if (mostrarCarga && typeof mensaje !== "undefined") {
      mensaje.style.display = "none";
    }

    return true;
  } catch (error) {
    console.error("Error al cargar talleres:", error);
    mostrarMensaje(error.message || "No fue posible cargar los talleres.", "error");
    return false;
  }
}


// ==========================================
// MOSTRAR TALLERES EN HTML
// ==========================================
function mostrarTalleres(talleres) {
    listaTalleres.replaceChildren();

    if (!talleres || talleres.length === 0) {
        listaTalleres.textContent = "No hay talleres disponibles.";
        return;
    }

    talleres.forEach(taller => {
        const limite = Number(taller.limite) || 0;
        const inscritos = Number(taller.inscritos) || 0;
        const disponibles = Math.max(0, Number(taller.disponibles) || 0);
        const agotado = disponibles <= 0;

        const porcentaje = limite > 0 ? Math.min(100, Math.max(0, (inscritos / limite) * 100)) : 0;

        const contenedor = document.createElement("div");
        contenedor.className = "taller-card";
        if (agotado) contenedor.classList.add("agotado");

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "tallerId";
        radio.value = taller.id;
        radio.id = `taller-${taller.id}`;
        radio.className = "taller-radio";
        radio.required = true;
        radio.disabled = agotado;

        const label = document.createElement("label");
        label.htmlFor = radio.id;
        label.className = "taller-content";

        const encabezado = document.createElement("div");
        encabezado.className = "taller-top";

        const nombre = document.createElement("h3");
        nombre.textContent = taller.nombre || "Taller sin nombre";

        const estado = document.createElement("span");
        estado.className = agotado ? "taller-estado agotado" : "taller-estado disponible";
        estado.textContent = agotado ? "Cupo agotado" : "Disponible";

        encabezado.append(nombre, estado);

        const tallerista = document.createElement("p");
        tallerista.className = "tallerista";
        tallerista.textContent = `${taller.tallerista || "Por confirmar"}`;

        const cupos = document.createElement("p");
        cupos.className = "taller-cupos";
        cupos.textContent = limite > 0 ? `${inscritos} de ${limite} participantes inscritos · ${disponibles} lugares disponibles` : "Cupo no especificado";

        const barra = document.createElement("div");
        barra.className = "taller-barra";

        const progreso = document.createElement("div");
        progreso.className = "taller-barra-progreso";
        progreso.style.width = `${porcentaje}%`;

        barra.appendChild(progreso);
        label.append(encabezado, tallerista, cupos, barra);
        contenedor.append(radio, label);
        listaTalleres.appendChild(contenedor);
    });
}

// ==========================================
// VALIDACIONES Y CONVERSIÓN DE ARCHIVOS
// ==========================================
function validarArchivo(archivo, nombreCampo) {
    if (!archivo || archivo.size === 0) return;

    if (archivo.size > MAX_FILE_SIZE) {
        throw new Error(`${nombreCampo}: el archivo supera el límite de 20 MB.`);
    }

    const extensionesPermitidas = ["pdf", "png", "jpg", "jpeg"];
    const extension = archivo.name.split(".").pop().toLowerCase();

    if (!extensionesPermitidas.includes(extension)) {
        throw new Error(`${nombreCampo}: formato no permitido. Usa PDF, PNG o JPG.`);
    }
}

function convertirArchivo(archivo) {
    return new Promise((resolve, reject) => {
        // Si el usuario no seleccionó ningún archivo, devolvemos null
        if (!archivo) {
            resolve(null);
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            // El resultado viene como "data:application/pdf;base64,JVBERi..."
            const partes = reader.result.split(",");
            const base64Puro = partes[1]; // Extraemos solo el código Base64 limpio

            // Estructuramos el objeto EXACTO que pide tu Code.gs
            resolve({
                data: base64Puro,
                name: archivo.name,
                type: archivo.type
            });
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(archivo);
    });
}


// ==========================================
// INTERCEPCIÓN Y VALIDACIÓN INTELIGENTE
// ==========================================
form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Detenemos el envío automático

    // 1. VALIDACIÓN MANUAL PARA MÓVILES Y ESCRITORIO
    if (!form.checkValidity()) {
        // Buscamos el primer campo obligatorio que esté vacío o inválido
        const primerCampoInvalido = form.querySelector(":invalid");

        if (primerCampoInvalido) {
            // Mostramos el mensaje de alerta justo arriba del botón (usando tu caja #mensaje)
            mostrarMensaje(
                "⚠️ Por favor, completa todos los campos obligatorios y selecciona un taller antes de continuar.",
                "error"
            );

            // Hacemos scroll suave hasta el campo que falta
            primerCampoInvalido.scrollIntoView({
                behavior: "smooth",
                block: "center" // Lo deja centrado en la pantalla del celular
            });

            // Si es un campo de texto/select, abrimos el teclado o lo marcamos
            if (primerCampoInvalido.type !== "radio" && primerCampoInvalido.type !== "file") {
                primerCampoInvalido.focus();
            }
        }
        return; // Detenemos la ejecución aquí para que no se abra la modal
    }

    // Si todo está lleno, ocultamos cualquier mensaje de error previo y abrimos la modal
    mensaje.style.display = "none";
    abrirModalProcesando();

    try {
        const fileCarta = document.getElementById("carta").files[0];
        const filePago = document.getElementById("pago").files[0];

        // Validaciones de peso y formato
        validarArchivo(fileCarta, "Carta de Acreditación");
        validarArchivo(filePago, "Comprobante de Pago");

        // Conversión a Base64 con el formato {data, name, type}
        const cartaObjeto = await convertirArchivo(fileCarta);
        const pagoObjeto = await convertirArchivo(filePago);

        // Recolección de datos
        const formData = new FormData(form);

        const datosEnvio = {
            action: "inscripcion",
            nombre: formData.get("nombre"),
            edad: formData.get("edad"),
            telefono: formData.get("telefono"),
            correo: formData.get("correo"),
            talla: formData.get("talla"),
            federacion: formData.get("federacion"),
            zona: formData.get("zona"),
            iglesia: formData.get("iglesia"),
            tallerId: formData.get("tallerId"),
            carta: cartaObjeto,
            pago: pagoObjeto
        };

        // Envío al servidor
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(datosEnvio)
        });

        if (!response.ok) throw new Error("Error en la comunicación con el servidor.");

        const resultado = await response.json();

        if (resultado.status === "success") {
            actualizarModalResultado(true, resultado.message);
            form.reset();
            cargarTalleres(false);
        } else {
            throw new Error(resultado.message || "Error al procesar el registro.");
        }

    } catch (error) {
        console.error("Error en el envío:", error);
        actualizarModalResultado(false, error.message);
    }
});


// Inicializar carga de talleres al abrir la página
document.addEventListener("DOMContentLoaded", () => {
    cargarTalleres(true);
});
