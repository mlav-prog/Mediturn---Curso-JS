//arrays para los turnos médicos
const nombresMedicos = [
    "Dr. Pérez - Clínico", 
    "Dra. Johnson - Pediatra", 
    "Dr. Lee - Cardiólogo", 
    "Dra. Brown - Dermatóloga",
    "Dr. Fernández - Traumatólogo",
    "Dra. Alvarez - Ginecóloga"
];

const horariosTurnos = [
    "Lunes 9:00",
    "Lunes 10:30",
    "Martes 15:00",
    "Miércoles 11:15",
    "Jueves 17:30",
    "Viernes 8:45",
];

//Storage

const storage_Key = "turnosReservados";
let turnosReservados = cargarTurnosDesdeStorage();

//Referencias al DOM

const formTurno = document.getElementById("formTurno");
const inputPaciente = document.getElementById("paciente");
const selectMedico = document.getElementById("medico");
const selectHorario = document.getElementById("horario");
const divListaTurnos = document.getElementById("listaTurnos");
const pMensaje = document.getElementById("mensaje");

//Inicialización

cargarOpciones();
renderTurnos();

//Eventos

//Evento principal: reservar turnos desde el formulario
formTurno.addEventListener("submit", (e) => {
    e.preventDefault();

    //entrada de datos desde el DOM
    const paciente = inputPaciente.value.trim();
    const medico = selectMedico.value;
    const horario = selectHorario.value;

    //validación básica
    if (!paciente || !medico || !horario) {
        mostrarMensaje("Completá los campos ⚠️", true);
        return;
    }

    //Validación extra: evitar duplicar turnos reservados
    const yaExiste = turnosReservados.some(t => t.medico === medico && t.horario === horario);
    if (yaExiste) {
        mostrarMensaje("Ese turno ya fue reservado. Elegí otro horario.", true);
        return; 
    }

    //crear el objeto turno

    const turno = {
        id: crearId(),
        paciente,
        medico,
        horario
    };

    // Proceso: actualizar estado y persistencia
    turnosReservados.push(turno);
    guardarTurnosEnStorage(turnosReservados);

    // Salida: Renderizar en pantalla y mensaje de éxito
    renderTurnos();
    formTurno.reset();
    mostrarMensaje("Turno reservado con éxito ✅");
});

// Evento secundario: eliminar turno
divListaTurnos.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;

    const id = btn.getAttribute("data-id");

    // Proceso: eliminar del array
    turnosReservados = turnosReservados.filter(t => t.id !== id);
    guardarTurnosEnStorage(turnosReservados);
    
    // Salida: Renderizar en pantalla y mensaje de éxito
    renderTurnos();
    mostrarMensaje("Turno eliminado 🗑️");
});

//Funciones

function cargarOpciones() {

    //Cargar opciones de médicos
    selectMedico.innerHTML = `<option value="">Seleccione un profesional</option>`;
    for (const medico of nombresMedicos) {
        const option = document.createElement("option");
        option.value = medico;
        option.textContent = medico;
        selectMedico.appendChild(option);
    }
    
    //Cargar opciones de horarios
    selectHorario.innerHTML = `<option value="">Seleccione un horario</option>`;
    for (const horario of horariosTurnos) {
        const option = document.createElement("option");
        option.value = horario;
        option.textContent = horario;
        selectHorario.appendChild(option);
    }
}


function renderTurnos() {
    // Si no hay turnos, mostrar mensaje
    if (turnosReservados.length === 0) {
        divListaTurnos.innerHTML = "<p>No hay turnos reservados.</p>";
        return;
    }

    // Generamos HTML dinamico desde el array de objetos
    divListaTurnos.innerHTML = turnosReservados.map((t) => {
        return `
            <article class="turno">
                <h3>${t.medico}</h3>
                <p><strong>Paciente:</strong> ${t.paciente}</p>
                <p><strong>Horario:</strong> ${t.horario}</p>
                <button type="button" data-id="${t.id}">Eliminar turno</button>
            </article>`;
    }).join("");
}


function mostrarMensaje(texto, esError = false) {
    pMensaje.textContent = texto;
    pMensaje.classList.toggle("error", esError);

    // Ocultar mensaje después de 3 segundos
    clearTimeout(mostrarMensaje._t);
    mostrarMensaje._t = setTimeout(() => {
        pMensaje.textContent = "";
        pMensaje.classList.remove("error");
    }, 3000);
}

function guardarTurnosEnStorage(turnos) {
    localStorage.setItem(storage_Key, JSON.stringify(turnos));
}

function cargarTurnosDesdeStorage() {
    const data = localStorage.getItem(storage_Key);
    return data ? JSON.parse(data) : [];
}

function crearId() {
    // Genera un ID único simple basado en la fecha y hora actual
    return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
}