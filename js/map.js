// ==========================================
// LOCUS School - Mapa principal y Métricas
// ==========================================

let capaColegios;
let escenario = "E1";
let colegioSeleccionado = null; // Almacena el colegio actualmente activo
let ranking = []; // Almacena la lista ordenada de colegios

// Inicialización global de instancias de Gráficos (Chart.js)
let graficoPotencial = null;
let graficoHistograma = null;

// Crear mapa y centrar por defecto
const map = L.map("map").setView([-33.45, -70.65], 11);

// Mapa base OpenStreetMap
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);


// ==========================================
// ESCALA GRÁFICA Y NORTE (Leaflet)
// ==========================================

// 1. Agregar Escala Gráfica (Métrica por defecto)
L.control.scale({
    imperial: false,     // Desactiva millas/pies (solo muestra metros/km)
    position: 'bottomleft' // Se ubica abajo a la izquierda
}).addTo(map);

// 2. Agregar Flecha de Norte dinámicamente
const northControl = L.control({ position: 'topleft' });

northControl.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'leaflet-north-arrow');
    // Generamos un contenedor con un SVG vectorizado de la flecha de Norte para que no dependa de imágenes externas
    div.innerHTML = `
        <div class="north-arrow-container" style="background: white; padding: 6px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <span style="font-size: 9px; font-weight: 800; line-height: 1; margin-bottom: 2px; color: #333;">N</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
        </div>
    `;
    return div;
};

northControl.addTo(map);

//------------------------------------------
// LEYENDA DEL MAPA (Control Flotante Leaflet)
//------------------------------------------
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = '<h4>Potencial Competitivo</h4>';

    const niveles = [
        { etiqueta: 'Muy Alto', color: 'var(--pot-muy-alto, #2E7D32)' },
        { etiqueta: 'Alto', color: 'var(--pot-alto, #7CB342)' },
        { etiqueta: 'Medio', color: 'var(--pot-medio, #D8C9A5)' },
        { etiqueta: 'Bajo', color: 'var(--pot-bajo, #F57C00)' },
        { etiqueta: 'Muy Bajo', color: 'var(--pot-muy-bajo, #C62828)' }
    ];

    niveles.forEach(nivel => {
        div.innerHTML += `
            <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 4px;">
                <span class="legend-color" style="background-color: ${nivel.color}; width: 12px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 50%;"></span>
                <span>${nivel.etiqueta}</span>
            </div>
        `;
    });

    div.innerHTML += `
        <div class="legend-item" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border, #ccc);">
            <img src="assets/marker_estudio.png" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;">
            <span style="font-size: 11.5px; font-weight: 600;">Liceo de Referencia</span>
        </div>
    `;

    return div;
};

legend.addTo(map);


//------------------------------------------
// Icono establecimiento de estudio (Liceo)
//------------------------------------------
const iconoLiceo = L.icon({
    iconUrl: "assets/marker_estudio.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

// Cargar Liceo de estudio de forma independiente
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
// Inicialización de Gráficos de Chart.js
//------------------------------------------
function inicializarGraficos() {
    const ctxPotencial = document.getElementById('chartPotencial');
    if (ctxPotencial) {
        graficoPotencial = new Chart(ctxPotencial, {
            type: 'bar',
            data: {
                labels: ['Muy Alto', 'Alto', 'Medio', 'Bajo', 'Muy Bajo'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: ['#2E7D32', '#7CB342', '#D8C9A5', '#FB8C00', '#D84343']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    const ctxHistograma = document.getElementById("chartHistograma");
    if (ctxHistograma) {
        graficoHistograma = new Chart(ctxHistograma, {
            type: "bar",
            data: {
                labels: ["0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1"],
                datasets: [{
                    label: "Índice",
                    backgroundColor: "#5C6F91",
                    data: [0, 0, 0, 0, 0]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}


//------------------------------------------
// Carga de Colegios y Configuración de Eventos
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
                actualizarPopup(layer);

                layer.on("click", function(){
                    colegioSeleccionado = layer;

                    const potencial = escenario === "E1" ? feature.properties.Pot_E1 : feature.properties.Pot_E2;
                    const indice = escenario === "E1" ? feature.properties.Ind_E1 : feature.properties.Ind_E2;

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

        // Renderizar componentes dependientes de los datos una vez cargados
        inicializarGraficos();
        actualizarYMostrarRanking();
        actualizarGraficosYKPIs();

        if (capaColegios.getBounds().isValid()) {
            map.fitBounds(capaColegios.getBounds());
        }
    })
    .catch(err => console.error("Error cargando Colegios_Plataforma.geojson:", err));


// Función auxiliar para actualizar popups en mapa
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
// Lógica y construcción del Ranking Top 10
//------------------------------------------
function actualizarYMostrarRanking() {
    if (!capaColegios) return;

    ranking = [];

    capaColegios.eachLayer(function(layer) {
        const props = layer.feature.properties;
        const indiceActual = escenario === "E1" ? props.Ind_E1 : props.Ind_E2;

        ranking.push({
            layer: layer,
            nombre: props.Nombre,
            indice: indiceActual
        });
    });

    ranking.sort((a, b) => b.indice - a.indice);
    mostrarRankingTop10();
}

function mostrarRankingTop10() {
    const rankingEl = document.getElementById("rankingPanel");
    if (!rankingEl) return;

    let html = `<h4 style="margin-bottom: 12px; font-size: 15px; color: var(--blue);">Top 10 Establecimientos</h4>`;

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

    coincidentes.sort((a, b) => b.indice - a.indice);

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

    resultadosEl.querySelectorAll(".search-result-item").forEach(function(div, index) {
        div.onclick = function() {
            const item = coincidentes[index];
            map.flyTo(item.layer.getLatLng(), 16, { duration: 1.2 });
            item.layer.fire("click");
            
            if (inputBuscar) inputBuscar.value = "";
            filtrarYMostrarResultados("");
        };
        div.onmouseenter = function() { this.style.background = "#f1f5f9"; this.style.borderColor = "#94a3b8"; };
        div.onmouseleave = function() { this.style.background = "#fff"; this.style.borderColor = "#ddd"; };
    });
}


//------------------------------------------
// Listeners Buscador
//------------------------------------------
const inputBuscar = document.getElementById("buscador");

if (inputBuscar) {
    inputBuscar.addEventListener("input", function() {
        filtrarYMostrarResultados(this.value);
    });

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
                    map.flyTo(layer.getLatLng(), 16, { duration: 1.2 });
                    layer.fire("click");

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
// Procesamiento de Datos Metodológicos y Gráficos
//------------------------------------------
function calcularResumen(capas, campoIndice) {
    const resumen = {
        total: 0, // Empezamos en 0 para contar solo los válidos
        muyAlto: 0,
        alto: 0,
        medio: 0,
        bajo: 0,
        muyBajo: 0,
        promedio: 0,
        maximo: 0,
        valores: []
    };

    let suma = 0;

    capas.forEach(layer => {
        const props = layer.feature.properties;
        
        // ==========================================
        // EJEMPLO DE FILTRO: Aplica aquí tu regla de exclusión
        // (por ejemplo: omitir si no tiene matrícula o si el índice es 0)
        // ==========================================
        if (props.MAT_TOTAL === 0 || props[campoIndice] === null) {
            return; // Salta este colegio y no lo suma a los KPIs ni gráficos
        }

        // Si pasa el filtro, lo procesamos:
        resumen.total++; 
        const valor = Number(props[campoIndice]);

        if (isNaN(valor)) return;

        resumen.valores.push(valor);
        suma += valor;

        if (valor > resumen.maximo) {
            resumen.maximo = valor;
        }

        if (valor >= 0.80)      resumen.muyAlto++;
        else if (valor >= 0.60) resumen.alto++;
        else if (valor >= 0.40) resumen.medio++;
        else if (valor >= 0.20) resumen.bajo++;
        else                    resumen.muyBajo++;
    });

    resumen.promedio = resumen.valores.length > 0 ? (suma / resumen.valores.length) : 0;
    return resumen;
}

function actualizarKPIs(resumen) {
    // 1. Sincronizar tarjeta superior de "Analizados"
    const kpiTotalSuperior = document.getElementById("kpiTotalSuperior");
    if (kpiTotalSuperior) {
        kpiTotalSuperior.textContent = resumen.total;
    }

    // 2. Sincronizar las métricas de la sección inferior (Resumen del Escenario)
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiMuyAlto = document.getElementById("kpiMuyAlto");
    const kpiPromedio = document.getElementById("kpiPromedio");
    const kpiMaximo = document.getElementById("kpiMaximo");

    if (kpiTotal) kpiTotal.textContent = resumen.total;
    if (kpiMuyAlto) kpiMuyAlto.textContent = resumen.muyAlto;
    if (kpiPromedio) kpiPromedio.textContent = resumen.promedio.toFixed(3);
    if (kpiMaximo) kpiMaximo.textContent = resumen.maximo.toFixed(3);
}

function actualizarGraficosYKPIs() {
    if (!capaColegios) return;

    const capas = capaColegios.getLayers();
    const campoIndice = escenario === "E1" ? "Ind_E1" : "Ind_E2";

    // 1. Cálculos de estadísticas generales
    const resumen = calcularResumen(capas, campoIndice);

    // 2. Pintar KPIs
    actualizarKPIs(resumen);

    // 3. Modificar gráfico de barras principal (Distribución de Potencial)
    if (graficoPotencial) {
        graficoPotencial.data.datasets[0].data = [
            resumen.muyAlto,
            resumen.alto,
            resumen.medio,
            resumen.bajo,
            resumen.muyBajo
        ];
        graficoPotencial.update();
    }

    // 4. Calcular Bins para el Histograma
    const bins = [0, 0, 0, 0, 0];
    resumen.valores.forEach(v => {
        if (v < 0.2)       bins[0]++;
        else if (v < 0.4)  bins[1]++;
        else if (v < 0.6)  bins[2]++;
        else if (v < 0.8)  bins[3]++;
        else               bins[4]++;
    });

    // 5. Modificar Histograma
    if (graficoHistograma) {
        graficoHistograma.data.datasets[0].data = bins;
        graficoHistograma.update();
    }
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
            
            // 1. Repintar círculos en mapa
            capaColegios.eachLayer(function(layer){
                layer.setStyle({
                    fillColor: colorPotencial(layer.feature)
                });
                actualizarPopup(layer);
            });

            // 2. Refrescar listas y estadísticas analíticas
            actualizarYMostrarRanking();
            actualizarGraficosYKPIs();

            // 3. Adaptar filtrado si hay texto activo
            if (inputBuscar && inputBuscar.value !== "") {
                filtrarYMostrarResultados(inputBuscar.value);
            }

            // 4. Refrescar ficha técnica activa
            if (colegioSelectedActive()) {
                colegioSeleccionado.fire("click");
            }
        }
    });
}

function colegioSelectedActive() {
    return colegioSeleccionado !== null && colegioSeleccionado !== undefined;
}