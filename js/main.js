const STORAGE_KEY = "turnosPaciente";
const { DateTime } = luxon;

const app = document.getElementById("app");
let listaTurnos = null;

let config = null;
let medicos = [];
let turnosPaciente = cargarTurnosPaciente();
let offsetSemana = 0;
let medicoSeleccionadoId = null;
let fechaSeleccionada = null;
let horaSeleccionada = null;

// ===== Inicio =====

init();

async function init() {
    try {
        const res = await fetch("./data/medicos.json");
        if (!res.ok) throw new Error("No se pudo cargar medicos.json");
        const data = await res.json();

        config = data.config;
        medicos = data.medicos;

        renderUI();
        renderDoctorCard();
        renderSemana();
        renderTurnosPaciente();
        actualizarBotonReservar();
    } catch (err) {
        Swal.fire("Error", "No se pudieron cargar los datos. Abrí con Live Server.", "error");
    }
}

// ===== UI =====

function renderUI() {
    app.innerHTML = `
    <section class="card grid">
        <div class="row">
            <label>
                <strong>Paciente</strong><br>
                <input id="paciente" type="text" placeholder="Nombre y Apellido" autocomplete="name" />
            </label>

            <label>
                <strong>Profesional</strong><br>
                <select id="medicoSelect">
                    <option value="">Seleccione un médico</option>
                    ${medicos.map(m => `<option value="${m.id}">${m.nombre} — ${m.especialidad}</option>`).join("")}
                </select>
            </label>

            <div class="week-controls">
                <button id="btnPrev" type="button">« Semana Anterior</button>
                <button id="btnSemana" type="button">Semana Actual</button>
                <button id="btnNext" type="button">Semana Siguiente »</button>
            </div> 
        </div>
    
        <div id="doctorCard" class="doctor-card">
            <p class="doctor-empty">Seleccioná un profesional para ver su información.</p>
        </div>

        <div id="panelSemana" class="week"></div>

        <div class="row">
            <button id="btnReservar" type="button" disabled>Reservar turno</button>
        </div>
    </section>

    <section class="card">
        <h2>Mis Turnos</h2>
        <div id="listaTurnos" class="lista-turnos"></div>
    </section>
  `;
  
    listaTurnos = document.getElementById("listaTurnos");

    document.getElementById("medicoSelect").addEventListener("change", (e) => {
        medicoSeleccionadoId = Number(e.target.value) || null;
        limpiarSeleccion();
        renderDoctorCard();
        renderSemana();
        actualizarBotonReservar();
    });
    // Semana Anterior
    document.getElementById("btnPrev").addEventListener("click", () => {
        offsetSemana-= 1;
        limpiarSeleccion();
        renderSemana();
        actualizarBotonReservar();

        Toastify({
            text: "Mostrando semana anterior ⬅️",
            duration: 1500,
            gravity: "top",
            position: "right",
        }).showToast();
    });
    // Semana Actual
    document.getElementById("btnSemana").addEventListener("click", () => {
        offsetSemana = 0;
        limpiarSeleccion();
        renderSemana();
        actualizarBotonReservar();

        Toastify({
            text: "Mostrando semana actual 📅",
            duration: 1500,
            gravity: "top",
            position: "right",
        }).showToast();
    });
    // Semana Siguiente
    document.getElementById("btnNext").addEventListener("click", () => {
        offsetSemana+= 1;
        limpiarSeleccion();
        renderSemana();
        actualizarBotonReservar();

        Toastify({
            text: "Mostrando semana siguiente ➡️",
            duration: 1500,
            gravity: "top",
            position: "right",
        }).showToast();
    });

    document.getElementById("btnReservar").addEventListener("click", () => {
        reservarTurno();
    });

    // Listener una sola vez 

    document.getElementById("panelSemana").addEventListener("click", onClickSlot);
    
    listaTurnos.addEventListener("click", (e) => {
        const del = e.target.closest("button[data-del]");
        const ics = e.target.closest("button[data-ics]");

        if (del) cancelarTurno(del.dataset.del);
        if (ics) descargarICS(ics.dataset.ics);
    });
}


function renderSemana() {
    const panel = document.getElementById("panelSemana");
    panel.innerHTML = "";

    if (!medicoSeleccionadoId) {
        panel.innerHTML = "<p>Por favor, seleccione un profesional para ver su disponibilidad.</p>";
        return;
    }

    const base = DateTime.local().startOf('week').plus({ weeks: offsetSemana });
    const dias = Array.from({ length: 5 }, (_, i) => base.plus({ days: i }));

    const slots = generarSlots(
        config.inicio,
        config.fin,
        config.duracion_turno
    );
    
    panel.innerHTML = dias.map((d) => {
        const iso = toISO(d);
        const titulo = tituloDia(d);

        const botones = slots.map((hora) => {
            const ocupado = estaOcupado(medicoSeleccionadoId, iso, hora);
            const selected = (fechaSeleccionada === iso && horaSeleccionada === hora);
            const cls = `slot ${ocupado ? "ocupado" : ""} ${selected ? "seleccionado" : ""}`.trim();

            return `
                <button 
                    type="button" 
                    class="${cls}" 
                    data-fecha="${iso}" 
                    data-hora="${hora}" 
                    ${ocupado ? "disabled" : ""}
                >
                    ${hora}
                </button>
            `;
        }).join("");
        return `
            <div class="daycol">
                <div class="daytitle">${titulo}</div>
                <div class="slots">${botones}</div>
            </div>
        `;
    }).join("");
}
function renderDoctorCard() {
    const card = document.getElementById("doctorCard");
    if (!card) return;

    if (!medicoSeleccionadoId) {
    card.innerHTML = `<p class="doctor-empty">Seleccioná un profesional para ver su información.</p>`;
    return;
    }

    const m = medicos.find(x => x.id === medicoSeleccionadoId);
    if (!m) {
    card.innerHTML = `<p class="doctor-empty">No se encontró información del profesional.</p>`;
    return;
    }

    card.innerHTML = `
    <div class="doctor-row">
        <img class="doctor-img" src="${m.foto}" alt="${m.nombre}">
        <div class="doctor-info">
            <h3 class="doctor-name">${m.nombre}</h3>
            <p class="doctor-spec">${m.especialidad}</p>
            <p class="doctor-bio">${m.biografia || ""}</p>
        </div>
    </div>
  `;
}


function onClickSlot(e) {
    const btn = e.target.closest("button[data-fecha][data-hora]");
    if (!btn) return;

    fechaSeleccionada = btn.dataset.fecha;
    horaSeleccionada = btn.dataset.hora;

    renderSemana();
    actualizarBotonReservar();

    Toastify({
        text: `Seleccionado: ${fechaSeleccionada} a las ${horaSeleccionada}`,
        duration: 1500,
        gravity: "top",
        position: "right",
    }).showToast();
}
    
function actualizarBotonReservar() {
    const btn = document.getElementById("btnReservar");
    if (!btn) return;
    btn.disabled = !(medicoSeleccionadoId && fechaSeleccionada && horaSeleccionada);
}

function limpiarSeleccion() {
    fechaSeleccionada = null;
    horaSeleccionada = null;
}

// ===== Reserva =====

function reservarTurno() {
    const paciente = document.getElementById("paciente").value.trim();

    if (!paciente) {
        Swal.fire("Faltan datos", "Por favor, ingrese su nombre y apellido.", "error");
        return;
    }

    if (!medicoSeleccionadoId || !fechaSeleccionada || !horaSeleccionada) {
        Swal.fire("Faltan datos", "Por favor, seleccione un profesional, fecha y hora.", "error");
        return;
    }

    const medico = medicos.find(m => m.id === medicoSeleccionadoId);

    Swal.fire({
        title: "Confirmar turno",
        html: `
            <p><strong>Paciente:</strong> ${paciente}</p>
            <p><strong>Profesional:</strong> ${medico.nombre} - ${medico.especialidad}</p>
            <p><strong>Fecha y Hora:</strong> ${fechaSeleccionada} a las ${horaSeleccionada}</p>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
    }).then((result) => {
        if (!result.isConfirmed) return;

        if (estaOcupado(medicoSeleccionadoId, fechaSeleccionada, horaSeleccionada)) {
            Swal.fire("Turno no disponible", "El turno seleccionado ya fue reservado por otro paciente.", "error");
            renderSemana();
            return;
        }

        const turno = {
            id: crearId(),
            paciente,
            medicoId: medicoSeleccionadoId,
            medico: medico.nombre,
            especialidad: medico.especialidad,
            fecha: fechaSeleccionada,
            hora: horaSeleccionada
        };

        turnosPaciente.push(turno);
        guardarTurnosPaciente(turnosPaciente);

        Toastify({
            text: "Turno reservado con éxito ✅",
            duration: 2200,
            gravity: "top",
            position: "right",
        }).showToast();

        limpiarSeleccion();
        renderSemana();
        renderTurnosPaciente();
        actualizarBotonReservar();
    });
}

    // ===== Turnos Paciente =====

function renderTurnosPaciente() {
    if (turnosPaciente.length === 0) {
        listaTurnos.innerHTML = "<p>No hay turnos reservados.</p>";
        return;
    }

    const ordenados = [...turnosPaciente].sort((a, b) =>
        `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)
    );

    listaTurnos.innerHTML = ordenados.map(t => `
        <div class="turno">
            <div><strong>${t.paciente}</strong></div>
            <div>${t.medico} — ${t.especialidad}</div>
            <div><strong>Fecha:</strong> ${t.fecha} <strong>Hora:</strong> ${t.hora}</div>

            <div class="acciones">
                <button type="button" class="btn-danger" data-del="${t.id}">Cancelar</button>
                <button type="button" data-ics="${t.id}">Agregar al calendario (.ics)</button>
            </div>
        </div>
    `).join("");
}

function cancelarTurno(id) {
    Swal.fire({
        title: "Cancelar turno",
        text: "¿Está seguro que desea cancelar este turno?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, cancelar",
        cancelButtonText: "Volver",
    }).then((r) => {
        if (!r.isConfirmed) return;

        turnosPaciente = turnosPaciente.filter(t => t.id !== id);
        guardarTurnosPaciente(turnosPaciente);

        Toastify({
            text: "Turno cancelado 🗑️",
            duration: 1800,
            gravity: "top",
            position: "right",
        }).showToast();

        renderSemana();
        renderTurnosPaciente();
        actualizarBotonReservar();
    });
}

// ===== Disponibilidad (localStorage) =====
        
function estaOcupado(medicoId, fechaISO, hora) {
    return turnosPaciente.some(t =>
        t.medicoId === medicoId && t.fecha === fechaISO && t.hora === hora
    );
}

// ===== Utilidades =====    

function generarSlots(inicio, fin, pasoMin) {
    const toMin = (hhmm) => {
        const [hh, mm] = hhmm.split(":").map(Number);
        return hh * 60 + mm;
    };

    const toHHMM = (min) => {
        const hh = String(Math.floor(min / 60)).padStart(2, "0");
        const mm = String(min % 60).padStart(2, "0");
        return `${hh}:${mm}`;
    };

    const slots = [];
    for (let t = toMin(inicio); t <= toMin(fin); t += pasoMin) {
        slots.push(toHHMM(t));
    }
    return slots;
}

function obtenerLunes(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function sumarDias(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toISO(dt) {
    return dt.toISODate();
}

function tituloDia(dt) {
    return dt.setLocale('es').toFormat('cccc dd/MM');
}

function guardarTurnosPaciente(turnos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turnos));
}

function cargarTurnosPaciente() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function crearId() {
    // Genera un ID único simple basado en la fecha y hora actual
    return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
}

// ===== Exportar .ICS =====

function descargarICS(turnoId) {
    const turno = turnosPaciente.find(t => t.id === turnoId);
    if (!turno) return;

    const dtStart = toICSDateTime(turno.fecha, turno.hora);
    const dtEnd = toICSDateTimeFin(turno.fecha, turno.hora, config.duracion_turno);

    const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mediturn Pro//ES
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${turno.id}@mediturnpro
DTSTAMP:${icsNow()}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:Turno con ${turno.medico} (${turno.especialidad})
DESCRIPTION:Paciente: ${turno.paciente}\\nProfesional: ${turno.medico} - ${turno.especialidad}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `turno_${turno.fecha}_${turno.hora.replace(":", "")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    Toastify({
        text: "Archivo .ics descargado 📅",
        duration: 2000,
        gravity: "top",
        position: "right",
    }).showToast();
}

function icsNow() {
    const d = new Date();
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function toICSDateTime(fechaISO, horaHHMM) {
    const [y, m, d] = fechaISO.split("-").map(Number);
    const [hh, min] = horaHHMM.split(":").map(Number);
    const dt = new Date(y, m - 1, d, hh, min, 0);
    return toICSLocal (dt);
}

    
function toICSDateTimeFin(fechaISO, horaHHMM, durMin) {
    const [y, m, d] = fechaISO.split("-").map(Number);
    const [hh, min] = horaHHMM.split(":").map(Number);
    const dt = new Date(y, m - 1, d, hh, min, 0);
    dt.setMinutes (dt.getMinutes() + durMin);
    return toICSLocal(dt);
}

function toICSLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
