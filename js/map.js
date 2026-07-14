// ==========================================
// LOCUS School - Mapa principal
// ==========================================

let capaColegios;
let escenario = "E1";
let colegioSeleccionado = null; // Almacena el colegio actualmente activo
let ranking = []; // Almacena la lista ordenada de colegios

// Crear mapa y centrar por defecto
const map = L.map("map").setView([-33.45, -70.65], 11);

// Mapa base OpenStreetMap
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

//------------------------------------------
// Icono establecimiento de estudio (Liceo)
//------------------------------------------
const iconoLiceo = L.icon({
    iconUrl: "assets/marker_estudio.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

// Cargar Liceo de estudio
fetch("data/Liceo_estudio.geojson")
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng){
                return L.marker(latlng, { icon: iconoLiceo });
            },
            onEachFeature: function(feature, layer){
                layer.bindPopup(`
                    <b>${feature.properties.Name || "Establecimiento de Estudio"}</b><br>
                    Liceo de Referencia
                `);
            }
        }).addTo(map);
    })
    .catch(err => console.error("Error cargando Liceo_estudio.geojson:", err));


//------------------------------------------
// Colores según Potencial Competitivo
//------------------------------------------
function colorPotencial(feature){
    const valor = escenario === "E1" 
        ? feature.properties.Pot_E1 
        : feature.properties.Pot_E2;

    switch(valor){
        case "Muy Alto": return "#2E7D32";
        case "Alto":     return "#7CB342";
        case "Medio":    return "#D8C9A5";
        case "Bajo":     return "#F57C00";
        case "Muy Bajo": return "#C62828";
        default:         return "#7C94A3";
    }
}

//------------------------------------------
// Cargar Colegios y configurar interacciones
//------------------------------------------
fetch("data/Colegios_Plataforma.geojson")
    .then(response => response.json())
    .then(data => {
        capaColegios = L.geoJSON(data, {
            pointToLayer: function(feature, latlng){
                return L.circleMarker(latlng, {
                    radius: 7,
                    color: "#ffffff",
                    weight: 1,
                    fillColor: colorPotencial(feature),
                    fillOpacity: 0.95
                });
            },
            onEachFeature: function(feature, layer){
                // Vincular popup dinámico inicial
                actualizarPopup(layer);

                // Evento al hacer click en un colegio
                layer.on("click", function(){
                    colegioSeleccionado = layer;

                    const potencial = escenario === "E1" ? feature.properties.Pot_E1 : feature.properties.Pot_E2;
                    const indice = escenario === "E1" ? feature.properties.Ind_E1 : feature.properties.Ind_E2;

                    // Actualizar Panel de Información Detallada (Ficha Técnica)
                    const infoEl = document.getElementById("infoPanel");
                    if (infoEl) {
                        infoEl.innerHTML = `
                            <table class="tablaInfo">
                                <tr><td><b>Nombre</b></td><td>${feature.properties.Nombre}</td></tr>
                                <tr><td><b>Comuna</b></td><td>${feature.properties.Comuna}</td></tr>
                                <tr><td><b>Provincia</b></td><td>${feature.properties.Provincia}</td></tr>
                                <tr><td><b>RBD</b></td><td>${feature.properties.RBD}</td></tr>
                                <tr><td><b>Potencial</b></td><td><span class="badge" style="background-color:${colorPotencial(feature)}; color:#fff; padding: 2px 6px; border-radius:4px;">${potencial}</span></td></tr>
                                <tr><td><b>Índice</b></td><td>${indice.toFixed(3)}</td></tr>
                                <tr><td><b>Matrícula</b></td><td>${feature.properties.MAT_TOTAL}</td></tr>
                                <tr><td><b>Demanda entorno</b></td><td>${feature.properties.Demanda_Entorno}</td></tr>
                                <tr><td><b>Distancia al liceo</b></td><td>${(feature.properties.Distancia_Liceo_m / 1000).toFixed(1)} km</td></tr>
                            </table>
                        `;
                    }
                });
            }
        }).addTo(map);

        // Generar y ordenar el ranking inicial
        actualizarYMostrarRanking();

        // Ajustar zoom automáticamente al cargar los datos
        if (capaColegios.getBounds().isValid()) {
            map.fitBounds(capaColegios.getBounds());
        }
    })
    .catch(err => console.error("Error cargando Colegios_Plataforma.geojson:", err));


// Función auxiliar para actualizar el contenido del popup dinámicamente
function actualizarPopup(layer) {
    const props = layer.feature.properties;
    const potencial = escenario === "E1" ? props.Pot_E1 : props.Pot_E2;
    const indice = escenario === "E1" ? props.Ind_E1 : props.Ind_E2;

    layer.bindPopup(`
        <b>${props.Nombre}</b><br>
        <b>Comuna:</b> ${props.Comuna}<br>
        <b>Potencial:</b> ${potencial}<br>
        <b>Índice:</b> ${indice.toFixed(3)}<br>
        <b>Matrícula:</b> ${props.MAT_TOTAL}
    `);
}

//------------------------------------------
//------------------------------------------
// Lógica y construcción del Ranking Top 10 (Estático)
//------------------------------------------
function actualizarYMostrarRanking() {
    if (!capaColegios) return;

    ranking = [];

    // Extraer y calcular los datos de todos los colegios cargados
    capaColegios.eachLayer(function(layer) {
        const props = layer.feature.properties;
        const indiceActual = escenario === "E1" ? props.Ind_E1 : props.Ind_E2;

        ranking.push({
            layer: layer,
            nombre: props.Nombre,
            indice: indiceActual
        });
    });

    // Ordenar de mayor a menor según el escenario activo
    ranking.sort((a, b) => b.indice - a.indice);

    // Renderizar siempre en el panel lateral derecho
    mostrarRankingTop10();
}

function mostrarRankingTop10() {
    const rankingEl = document.getElementById("rankingPanel");
    if (!rankingEl) return;

    let html = `<h4 style="margin-bottom: 12px; font-size: 15px; color: var(--blue);">Top 10 Establecimientos</h4>`;

    // Tomar estrictamente los 10 mejores
    ranking.slice(0, 10).forEach(function(item, i) {
        html += `
            <div class="ranking-item" data-index="${i}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin-bottom: 6px; border-radius: 6px; background: #f8f9fa; border: 1px solid #e9ecef; cursor: pointer; transition: background 0.2s;">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%; font-size: 12.5px;">
                    <strong style="color: var(--blue); margin-right: 4px;">${i + 1}.</strong> ${item.nombre}
                </div>
                <span style="font-weight: 700; color: #2E7D32; font-size: 13px;">${item.indice.toFixed(3)}</span>
            </div>
        `;
    });

    rankingEl.innerHTML = html;

    // Asignar los eventos de clic al Top 10 estático
    rankingEl.querySelectorAll(".ranking-item").forEach(function(div) {
        div.onclick = function() {
            const item = ranking[this.dataset.index];
            map.flyTo(item.layer.getLatLng(), 16, { duration: 1.2 });
            item.layer.fire("click");
        };
        div.onmouseenter = function() { this.style.background = "#eef2f3"; };
        div.onmouseleave = function() { this.style.background = "#f8f9fa"; };
    });
}

//------------------------------------------
// Lógica de Búsqueda Dinámica y Coincidencias
//------------------------------------------
function filtrarYMostrarResultados(textoBusqueda) {
    const resultadosEl = document.getElementById("resultadosBusqueda");
    if (!resultadosEl) return;

    const busqueda = textoBusqueda.toUpperCase().trim();

    // Si el buscador está vacío, ocultamos los resultados y restauramos la opacidad total en el mapa
    if (busqueda === "") {
        resultadosEl.innerHTML = "";
        resultadosEl.style.display = "none";
        
        if (capaColegios) {
            capaColegios.eachLayer(function(layer) {
                layer.setStyle({ fillOpacity: 0.95, opacity: 1 });
            });
        }
        return;
    }

    const coincidentes = [];

    // Recorrer el mapa para alternar la opacidad y recopilar coincidencias
    if (capaColegios) {
        capaColegios.eachLayer(function(layer) {
            const props = layer.feature.properties;
            const nombreCoincide = props.Nombre.toUpperCase().includes(busqueda);

            if (nombreCoincide) {
                layer.setStyle({ fillOpacity: 0.95, opacity: 1 });
                const indiceActual = escenario === "E1" ? props.Ind_E1 : props.Ind_E2;
                coincidentes.push({
                    layer: layer,
                    nombre: props.Nombre,
                    indice: indiceActual
                });
            } else {
                layer.setStyle({ fillOpacity: 0.15, opacity: 0.15 });
            }
        });
    }

    // Ordenar coincidencias por índice competitivo para el listado del buscador
    coincidentes.sort((a, b) => b.indice - a.indice);

    // Mostrar el panel de resultados
    resultadosEl.style.display = "block";
    let html = `<h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--blue);">Coincidencias encontradas (${coincidentes.length})</h4>`;

    if (coincidentes.length === 0) {
        html += `<p style="font-size: 13px; color: #888; margin: 0;">No se encontraron establecimientos.</p>`;
    } else {
        html += `<div style="max-height: 200px; overflow-y: auto;">`;
        coincidentes.forEach(function(item, i) {
            html += `
                <div class="search-result-item" data-id="${i}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin-bottom: 5px; border-radius: 6px; background: #fff; border: 1px solid #ddd; cursor: pointer; transition: 0.15s; font-size: 13px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">
                        🔍 ${item.nombre}
                    </span>
                    <strong style="color: #1565C0;">${item.indice.toFixed(3)}</strong>
                </div>
            `;
        });
        html += `</div>`;
    }

    resultadosEl.innerHTML = html;

    // Configurar eventos para los elementos de coincidencia filtrados
    resultadosEl.querySelectorAll(".search-result-item").forEach(function(div, index) {
        div.onclick = function() {
            const item = coincidentes[index];
            map.flyTo(item.layer.getLatLng(), 16, { duration: 1.2 });
            item.layer.fire("click");
            
            // Limpiar buscador y colapsar contenedor de resultados
            if (inputBuscar) inputBuscar.value = "";
            filtrarYMostrarResultados("");
        };
        div.onmouseenter = function() { this.style.background = "#f1f5f9"; this.style.borderColor = "#94a3b8"; };
        div.onmouseleave = function() { this.style.background = "#fff"; this.style.borderColor = "#ddd"; };
    });
}

//------------------------------------------
//------------------------------------------
// Buscador de Establecimientos (Listeners de Eventos)
//------------------------------------------
// CORRECCIÓN: Se cambia "buscarColegio" por "buscador" para coincidir con el HTML
const inputBuscar = document.getElementById("buscador");

if (inputBuscar) {
    // 1. Filtrado en tiempo real al escribir
    inputBuscar.addEventListener("input", function() {
        filtrarYMostrarResultados(this.value);
    });

    // 2. Acción clásica al presionar la tecla Enter
    inputBuscar.addEventListener("keyup", function(e){
        if(e.key !== "Enter") return;

        const texto = this.value.trim().toUpperCase();
        if(texto === "") return;

        let encontrado = false;

        if (capaColegios) {
            capaColegios.eachLayer(function(layer){
                const nombre = layer.feature.properties.Nombre.toUpperCase();

                if(nombre.includes(texto) && !encontrado){
                    encontrado = true;
                    // Centrar mapa de manera suave en el primer colegio coincidente
                    map.flyTo(layer.getLatLng(), 16, { duration: 1.2 });
                    layer.fire("click");

                    // Limpiar entrada
                    inputBuscar.value = "";
                    filtrarYMostrarResultados("");
                }
            });
        }

        if(!encontrado){
            alert("No se encontró el establecimiento con ese nombre.");
        }
    });
}

//------------------------------------------
// Cambio de Escenario (E1 / E2)
//------------------------------------------
const selector = document.getElementById("escenarioSelect");
if (selector) {
    selector.addEventListener("change", function(){
        escenario = this.value;

        if (capaColegios) {
            map.closePopup(); // Evitar popup desactualizado en pantalla
            
            // 1. Repintar círculos y refrescar popups internos
            capaColegios.eachLayer(function(layer){
                layer.setStyle({
                    fillColor: colorPotencial(layer.feature)
                });
                actualizarPopup(layer);
            });

            // 2. Recalcular y mantener el Top 10 estático actualizado
            actualizarYMostrarRanking();

            // 3. Si hay una búsqueda corriendo al cambiar de escenario, actualizar los resultados
            if (inputBuscar && inputBuscar.value !== "") {
                filtrarYMostrarResultados(inputBuscar.value);
            }

            // 4. Si hay un colegio activo en la ficha, recargarla con los nuevos cálculos de inmediato
            if (colegioSelectedActive()) {
                colegioSeleccionado.fire("click");
            }
        }
    });
}

function colegioSelectedActive() {
    return colegioSeleccionado !== null && colegioSeleccionado !== undefined;
}