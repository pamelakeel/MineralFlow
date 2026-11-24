
// ==========================================
// MINERALFLOW - SISTEMA DE LOGÍSTICA MINERAL
// ==========================================

let mapa = null;
let camadaMinas = null;
let camadaDestinos = null;
let camadaTerminais = null;
let camadaFluxos = null;

let graficoProducao = null;
let graficoCustos = null;

let dadosSistema = {
    minas: [],
    destinos: [],
    terminais: [],
    matriz: []
};

const CORES = {
    azul: "#477fae",
    azulEscuro: "#315f87",
    azulClaro: "#83b5dc",
    dourado: "#d9aa50",
    verde: "#6dd4ab",
    texto: "#adc3d2",
    grade: "#274251"
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", iniciarSistema);

async function iniciarSistema() {
    iniciarMapa();
    configurarEventos();

    await carregarDados();
    await carregarMatrizEFluxos();

    aplicarCamadaMapa("geral");

    if (mapa) {
        const marcadores = [
            camadaMinas,
            camadaDestinos,
            camadaTerminais
        ].flatMap(camada => camada.getLayers());

        const limites = L.featureGroup(marcadores).getBounds();

        if (limites.isValid()) {
            mapa.fitBounds(limites, {
                padding: [45, 45],
                maxZoom: 9
            });
        }
    }

    setTimeout(() => {
        if (mapa) mapa.invalidateSize();
    }, 500);
}

// ==========================================
// ESTILO DOS NOMES DO MAPA
// ==========================================

function configurarEstiloNomes() {
    if (document.getElementById("estilo-nomes-mapa")) return;

    const estilo = document.createElement("style");
    estilo.id = "estilo-nomes-mapa";

    estilo.textContent = `
        .nome-mapa-tooltip {
            background: rgba(255,255,255,0.94) !important;
            color: #263e52 !important;
            border: 1px solid #d4e0e9 !important;
            border-radius: 4px !important;
            padding: 2px 5px !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
            font-weight: 700 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.16) !important;
            white-space: nowrap !important;
            pointer-events: none !important;
        }

        .nome-mapa-tooltip::before {
            display: none !important;
        }
    `;

    document.head.appendChild(estilo);
}

// Posiciona os nomes em direções diferentes
function adicionarRotulo(marcador, nome, grupo, indice) {
    let direcao = "top";
    let deslocamento = [0, -7];

    if (grupo === "minas") {
        direcao = indice % 2 === 0 ? "left" : "right";
        deslocamento = indice % 2 === 0 ? [-7, 0] : [7, 0];
    }

    if (grupo === "destinos") {
        direcao = "bottom";
        deslocamento = [0, 7];
    }

    if (grupo === "terminais") {
        direcao = indice % 2 === 0 ? "top" : "bottom";
        deslocamento = indice % 2 === 0 ? [0, -7] : [0, 7];
    }

    marcador.bindTooltip(nome, {
        permanent: true,
        direction: direcao,
        offset: deslocamento,
        className: "nome-mapa-tooltip"
    });

    return marcador;
}

// ==========================================
// MAPA
// ==========================================

function iniciarMapa() {
    const elemento = document.getElementById("mapa");

    if (!elemento || typeof L === "undefined") {
        console.error("Mapa ou biblioteca Leaflet não encontrados.");
        return;
    }

    if (mapa) return;

    configurarEstiloNomes();

    mapa = L.map(elemento).setView([-6.0675, -49.9037], 9);

    const ruas = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }
    );

    const satelite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Esri, Maxar, Earthstar Geographics e comunidade GIS",
            maxZoom: 19
        }
    ).addTo(mapa);

    L.control.layers({
        "Satélite": satelite,
        "Ruas": ruas
    }).addTo(mapa);

    L.control.scale({
        imperial: false
    }).addTo(mapa);

    camadaMinas = L.layerGroup().addTo(mapa);
    camadaDestinos = L.layerGroup().addTo(mapa);
    camadaTerminais = L.layerGroup().addTo(mapa);
    camadaFluxos = L.layerGroup().addTo(mapa);

    setTimeout(() => mapa.invalidateSize(), 500);
}

// ==========================================
// EVENTOS
// ==========================================

function configurarEventos() {
    const formulario = document.getElementById("formRota");

    if (formulario) {
        formulario.addEventListener("submit", calcularRota);
    }

    const botaoTerminais = document.getElementById("btnTerminais");

    if (botaoTerminais) {
        botaoTerminais.addEventListener("click", analisarTerminais);
    }

    function atualizarMenu() {
        const destino = window.location.hash || "#inicio";

        document.querySelectorAll(".sidebar nav a").forEach(link => {
            const ativo = link.hash === destino;

            link.classList.toggle("active", ativo);

            if (ativo) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    atualizarMenu();
    window.addEventListener("hashchange", atualizarMenu);

    document.querySelectorAll(".map-filter").forEach(botao => {
        botao.addEventListener("click", () => {
            aplicarCamadaMapa(botao.dataset.camada);

            document.querySelectorAll(".map-filter").forEach(item => {
                item.classList.remove("active");
                item.setAttribute("aria-pressed", "false");
            });

            botao.classList.add("active");
            botao.setAttribute("aria-pressed", "true");
        });
    });
}

// ==========================================
// FILTROS DO MAPA
// ==========================================

function aplicarCamadaMapa(tipo) {
    if (!mapa) return;

    [
        camadaMinas,
        camadaDestinos,
        camadaTerminais,
        camadaFluxos
    ].forEach(camada => {
        if (camada && mapa.hasLayer(camada)) {
            mapa.removeLayer(camada);
        }
    });

    switch (tipo) {
        case "minas":
            mapa.addLayer(camadaMinas);
            break;

        case "destinos":
            mapa.addLayer(camadaDestinos);
            break;

        case "terminais":
            mapa.addLayer(camadaTerminais);
            break;

        case "fluxos":
            mapa.addLayer(camadaFluxos);
            break;

        default:
            mapa.addLayer(camadaMinas);
            mapa.addLayer(camadaDestinos);
            mapa.addLayer(camadaTerminais);
            mapa.addLayer(camadaFluxos);
    }

    setTimeout(() => mapa.invalidateSize(), 100);
}

// ==========================================
// CARREGAR DADOS
// ==========================================

async function carregarDados() {
    try {
        const resposta = await fetch("/api/dados");

        if (!resposta.ok) {
            throw new Error("Erro ao carregar os dados do sistema.");
        }

        const dados = await resposta.json();

        dadosSistema.minas = dados.minas || [];
        dadosSistema.destinos = dados.destinos || [];
        dadosSistema.terminais = dados.terminais || [];

        preencherSeletores();
        adicionarMarcadores();
        atualizarIndicadores(dados);
        atualizarGraficoProducao(dados);

    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
    }
}

// ==========================================
// INDICADORES
// ==========================================

function atualizarIndicadores(dados) {
    const indicadores = dados.indicadores || {};

    const totalMinas = document.getElementById("totalMinas");
    const totalProducao = document.getElementById("totalProducao");
    const totalDestinos = document.getElementById("totalDestinos");

    if (totalMinas) {
        totalMinas.textContent = formatarNumero(
            indicadores.total_minas ?? dados.minas?.length ?? 0
        );
    }

    if (totalProducao) {
        totalProducao.textContent = formatarNumero(
            indicadores.producao_total ??
            dados.minas?.reduce((total, mina) => {
                return total + Number(mina.producao || 0);
            }, 0) ?? 0
        );
    }

    if (totalDestinos) {
        totalDestinos.textContent = formatarNumero(
            indicadores.total_destinos ?? dados.destinos?.length ?? 0
        );
    }
}

// ==========================================
// SELETORES
// ==========================================

function preencherSeletores() {
    const origem = document.getElementById("origem");
    const destino = document.getElementById("destino");

    if (origem) {
        origem.innerHTML = '<option value="">Selecione a origem</option>';

        dadosSistema.minas.forEach((mina, indice) => {
            const opcao = document.createElement("option");
            opcao.value = mina.id || indice + 1;
            opcao.textContent = mina.nome;
            origem.appendChild(opcao);
        });
    }

    if (destino) {
        destino.innerHTML = '<option value="">Selecione o destino</option>';

        dadosSistema.destinos.forEach((item, indice) => {
            const opcao = document.createElement("option");
            opcao.value = item.id || indice + 1;
            opcao.textContent = item.nome;
            destino.appendChild(opcao);
        });
    }
}

// ==========================================
// MARCADORES DO MAPA
// ==========================================

function adicionarMarcadores() {
    if (!mapa) return;

    camadaMinas.clearLayers();
    camadaDestinos.clearLayers();
    camadaTerminais.clearLayers();

    dadosSistema.minas.forEach((mina, indice) => {
        const latitude = Number(mina.latitude);
        const longitude = Number(mina.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const marcador = L.circleMarker([latitude, longitude], {
            radius: 9,
            color: "#ffffff",
            weight: 2,
            fillColor: CORES.dourado,
            fillOpacity: 1
        });

        adicionarRotulo(marcador, mina.nome, "minas", indice);

        marcador.bindPopup(`
            <strong>${mina.nome}</strong><br>
            Origem mineral<br>
            Mineral: ${mina.mineral || "Não informado"}<br>
            Produção: ${formatarNumero(mina.producao)} toneladas
        `);

        marcador.addTo(camadaMinas);
    });

    dadosSistema.destinos.forEach((destino, indice) => {
        const latitude = Number(destino.latitude);
        const longitude = Number(destino.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const marcador = L.circleMarker([latitude, longitude], {
            radius: 8,
            color: "#ffffff",
            weight: 2,
            fillColor: "#71b9ec",
            fillOpacity: 1
        });

        adicionarRotulo(marcador, destino.nome, "destinos", indice);

        marcador.bindPopup(`
            <strong>${destino.nome}</strong><br>
            Destino logístico
        `);

        marcador.addTo(camadaDestinos);
    });

    dadosSistema.terminais.forEach((terminal, indice) => {
        const latitude = Number(terminal.latitude);
        const longitude = Number(terminal.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const marcador = L.circleMarker([latitude, longitude], {
            radius: 8,
            color: "#ffffff",
            weight: 2,
            fillColor: CORES.verde,
            fillOpacity: 1
        });

        adicionarRotulo(marcador, terminal.nome, "terminais", indice);

        marcador.bindPopup(`
            <strong>${terminal.nome}</strong><br>
            Capacidade: ${formatarNumero(terminal.capacidade)} toneladas<br>
            Acesso logístico: ${terminal.acesso}/100
        `);

        marcador.addTo(camadaTerminais);
    });
}

// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
}

// ==========================================
// GRÁFICOS
// ==========================================

function opcoesGrafico() {
    return {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            intersect: false,
            mode: "index"
        },

        plugins: {
            legend: {
                labels: {
                    color: CORES.texto,
                    usePointStyle: true,
                    pointStyle: "circle",
                    padding: 20,
                    font: {
                        family: "Inter",
                        size: 11,
                        weight: "600"
                    }
                }
            },

            tooltip: {
                backgroundColor: "#ffffff",
                titleColor: CORES.azulEscuro,
                bodyColor: CORES.texto,
                borderColor: "#dce8f2",
                borderWidth: 1,
                padding: 12,
                displayColors: true
            }
        },

        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: CORES.texto,
                    font: {
                        family: "Inter",
                        size: 10
                    }
                },
                border: {
                    display: false
                }
            },

            y: {
                beginAtZero: true,
                grid: {
                    color: CORES.grade,
                    drawBorder: false
                },
                ticks: {
                    color: CORES.texto,
                    font: {
                        family: "Inter",
                        size: 10
                    }
                },
                border: {
                    display: false
                }
            }
        }
    };
}

// ==========================================
// CALCULAR ROTA
// ==========================================

async function calcularRota(evento) {
    if (evento) evento.preventDefault();

    const origem = document.getElementById("origem")?.value;
    const destino = document.getElementById("destino")?.value;
    const toneladas = document.getElementById("toneladas")?.value;
    const resultado = document.getElementById("resultadoRota");

    if (!origem || !destino || !toneladas || Number(toneladas) <= 0) {
        if (resultado) {
            resultado.innerHTML = `
                <p class="erro">Preencha todos os campos com valores válidos.</p>
            `;
        }
        return;
    }

    if (resultado) {
        resultado.innerHTML = "<p>Calculando melhor rota...</p>";
    }

    try {
        const resposta = await fetch("/api/rota", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                origem,
                destino,
                toneladas: Number(toneladas)
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível calcular a rota.");
        }

        const rota = dados.melhor_rota || dados;

        if (resultado) {
            resultado.innerHTML = `
                <h3>Resultado da simulação</h3>

                <p><strong>Origem:</strong> ${dados.origem || origem}</p>
                <p><strong>Destino:</strong> ${dados.destino || destino}</p>

                <p><strong>Quantidade:</strong>
                    ${formatarNumero(dados.toneladas || toneladas)} toneladas
                </p>

                <p><strong>Distância:</strong>
                    ${rota.distancia_km ?? "--"} km
                </p>

                <p><strong>Modal recomendado:</strong>
                    ${rota.modal || "--"}
                </p>

                <p><strong>Custo por tonelada:</strong>
                    ${formatarMoeda(rota.custo_por_tonelada)}
                </p>

                <p><strong>Custo total:</strong>
                    ${formatarMoeda(rota.custo_total)}
                </p>

                <h4>Comparação entre alternativas</h4>

                ${(dados.alternativas || []).map(alternativa => `
                    <div class="terminal-card">
                        <strong>${alternativa.modal}</strong>
                        <p>Distância: ${alternativa.distancia_km} km</p>
                        <p>Custo por tonelada:
                            ${formatarMoeda(alternativa.custo_por_tonelada)}
                        </p>
                        <p>Custo total:
                            ${formatarMoeda(alternativa.custo_total)}
                        </p>
                    </div>
                `).join("")}

                <p class="notice">
                    ${dados.aviso || "Estimativa demonstrativa do sistema."}
                </p>
            `;
        }

    } catch (erro) {
        if (resultado) {
            resultado.innerHTML = `<p class="erro">${erro.message}</p>`;
        }

        console.error("Erro ao calcular rota:", erro);
    }
}

// ==========================================
// ANÁLISE DE TERMINAIS
// ==========================================

async function analisarTerminais() {
    const resultado = document.getElementById("resultadoTerminais");

    if (!resultado) return;

    resultado.innerHTML = "<p>Analisando alternativas de localização...</p>";

    try {
        const resposta = await fetch("/api/terminais");

        if (!resposta.ok) {
            throw new Error("Não foi possível analisar os terminais.");
        }

        const dados = await resposta.json();
        const candidatos = dados.candidatos || [];

        resultado.innerHTML = `
            <h3>Alternativas de localização</h3>

            ${
                candidatos.length
                    ? candidatos.map(candidato => `
                        <div class="terminal-card">
                            <strong>${candidato.nome || "Candidato " + candidato.id}</strong>

                            <p>Acesso logístico:
                                ${candidato.acesso ?? "--"}/100
                            </p>

                            <p>Distância ponderada:
                                ${candidato.distancia_ponderada_km ?? "--"} km
                            </p>

                            <p>Capacidade:
                                ${formatarNumero(candidato.capacidade)} toneladas
                            </p>

                            <p>Pontuação:
                                ${candidato.pontuacao ?? candidato.score ?? "--"}/100
                            </p>
                        </div>
                    `).join("")
                    : "<p>Nenhuma alternativa encontrada.</p>"
            }

            <p class="notice">${dados.aviso || ""}</p>
            <p class="notice">
                Método: ${dados.metodo || "Análise ponderada demonstrativa."}
            </p>
        `;

        if (mapa && camadaTerminais) {
            camadaTerminais.clearLayers();

            candidatos.forEach((candidato, indice) => {
                const latitude = Number(candidato.latitude);
                const longitude = Number(candidato.longitude);

                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

                const marcador = L.circleMarker([latitude, longitude], {
                    radius: 11,
                    color: "#ffffff",
                    weight: 2,
                    fillColor: CORES.verde,
                    fillOpacity: 0.95
                });

                adicionarRotulo(
                    marcador,
                    candidato.nome || "Candidato " + candidato.id,
                    "terminais",
                    indice
                );

                marcador.bindPopup(`
                    <strong>${candidato.nome || "Candidato " + candidato.id}</strong><br>
                    Pontuação: ${candidato.pontuacao ?? candidato.score ?? "--"}<br>
                    Distância ponderada: ${candidato.distancia_ponderada_km ?? "--"} km
                `);

                marcador.addTo(camadaTerminais);
            });

            const filtroAtivo = document.querySelector(".map-filter.active");

            if (filtroAtivo?.dataset.camada === "terminais") {
                aplicarCamadaMapa("terminais");
            }
        }

    } catch (erro) {
        resultado.innerHTML = `<p class="erro">${erro.message}</p>`;
        console.error("Erro na análise de terminais:", erro);
    }
}

// ==========================================
// MATRIZ E FLUXOS
// ==========================================

async function carregarMatrizEFluxos() {
    const secaoFluxos = document.getElementById("fluxos-section");

    if (!secaoFluxos) return;

    let painel = document.getElementById("painelAnaliseLogistica");

    if (!painel) {
        painel = document.createElement("section");
        painel.id = "painelAnaliseLogistica";

        painel.innerHTML = `
            <h2>Matriz de Origem e Destino</h2>

            <p>
                Comparação das distâncias e dos custos entre minas e destinos logísticos.
            </p>

            <div id="tabelaMatriz">Carregando matriz...</div>

            <hr>

            <h2>Fluxos Minerais</h2>

            <p>
                Relação entre produção das minas e destinos de escoamento.
            </p>

            <div id="tabelaFluxos">Carregando fluxos...</div>

            <p class="notice">
                Dados demonstrativos. Distâncias e fluxos não representam trajetos reais validados.
            </p>
        `;

        secaoFluxos.append(painel);
    }

    try {
        const [respostaMatriz, respostaFluxos] = await Promise.all([
            fetch("/api/matriz"),
            fetch("/api/fluxos")
        ]);

        if (!respostaMatriz.ok || !respostaFluxos.ok) {
            throw new Error("Erro ao carregar matriz e fluxos.");
        }

        const dadosMatriz = await respostaMatriz.json();
        const dadosFluxos = await respostaFluxos.json();

        const matriz = dadosMatriz.matriz || [];
        const fluxos = dadosFluxos.fluxos || [];

        dadosSistema.matriz = matriz;

        atualizarIndicadorRotas(matriz.length);
        atualizarGraficoCustos(matriz);

        const tabelaMatriz = document.getElementById("tabelaMatriz");

        if (tabelaMatriz) {
            tabelaMatriz.innerHTML = `
                <div class="table-scroll" tabindex="0">
                    <table>
                        <thead>
                            <tr>
                                <th>Origem</th>
                                <th>Destino</th>
                                <th>Rodovia (km)</th>
                                <th>Ferrovia (km)</th>
                                <th>Custo rodoviário/t</th>
                                <th>Custo ferroviário/t</th>
                                <th>Menor custo</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${matriz.map(item => `
                                <tr>
                                    <td>${item.origem}</td>
                                    <td>${item.destino}</td>
                                    <td>${item.distancia_rodoviaria_km} km</td>
                                    <td>${item.distancia_ferroviaria_km} km</td>
                                    <td>${formatarMoeda(item.custo_rodoviario_tonelada)}</td>
                                    <td>${formatarMoeda(item.custo_ferroviario_tonelada)}</td>
                                    <td><strong>${item.modal_mais_economico || "--"}</strong></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const tabelaFluxos = document.getElementById("tabelaFluxos");

        if (tabelaFluxos) {
            tabelaFluxos.innerHTML = `
                <div class="table-scroll" tabindex="0">
                    <table>
                        <thead>
                            <tr>
                                <th>Origem</th>
                                <th>Destino</th>
                                <th>Produção</th>
                                <th>Rodovia</th>
                                <th>Ferrovia</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${fluxos.map(item => `
                                <tr>
                                    <td>${item.origem}</td>
                                    <td>${item.destino}</td>
                                    <td>${formatarNumero(item.producao_toneladas)} toneladas</td>
                                    <td>${item.distancia_rodoviaria_km} km</td>
                                    <td>${item.distancia_ferroviaria_km} km</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        if (mapa && camadaFluxos) {
            camadaFluxos.clearLayers();

            fluxos.forEach(item => {
                const coordenadas = [
                    [
                        Number(item.latitude_origem),
                        Number(item.longitude_origem)
                    ],
                    [
                        Number(item.latitude_destino),
                        Number(item.longitude_destino)
                    ]
                ];

                if (!coordenadas.every(ponto =>
                    Number.isFinite(ponto[0]) &&
                    Number.isFinite(ponto[1])
                )) return;

                L.polyline(coordenadas, {
                    color: "#79e2cf",
                    weight: 3,
                    opacity: 0.7,
                    dashArray: "8,6"
                })
                .bindPopup(`
                    <strong>Fluxo mineral demonstrativo</strong><br>
                    Origem: ${item.origem}<br>
                    Destino: ${item.destino}<br>
                    Produção: ${formatarNumero(item.producao_toneladas)} toneladas
                `)
                .addTo(camadaFluxos);
            });
        }

    } catch (erro) {
        const tabelaMatriz = document.getElementById("tabelaMatriz");
        const tabelaFluxos = document.getElementById("tabelaFluxos");

        if (tabelaMatriz) {
            tabelaMatriz.innerHTML = `<p class="erro">${erro.message}</p>`;
        }

        if (tabelaFluxos) {
            tabelaFluxos.innerHTML = `<p class="erro">${erro.message}</p>`;
        }

        console.error("Erro nas análises:", erro);
    }
}

// ==========================================
// INDICADOR DE ROTAS
// ==========================================

function atualizarIndicadorRotas(quantidade) {
    const elemento = document.getElementById("totalRotas");

    if (elemento) {
        elemento.textContent = formatarNumero(quantidade);
    }
}

// ==========================================
// GRÁFICO DE PRODUÇÃO
// ==========================================

function atualizarGraficoProducao(dados) {
    if (typeof Chart === "undefined") {
        console.error("Biblioteca Chart.js não encontrada.");
        return;
    }

    const minas = dados.minas || [];
    const elemento = document.getElementById("graficoProducao");

    if (!elemento) return;

    if (graficoProducao) {
        graficoProducao.destroy();
    }

    graficoProducao = new Chart(elemento, {
        type: "bar",

        data: {
            labels: minas.map(mina => mina.nome),

            datasets: [{
                label: "Produção mineral",
                data: minas.map(mina =>
                    Number(mina.producao_toneladas ?? mina.producao ?? 0)
                ),

                backgroundColor: [
                    "#477fae",
                    "#83b5dc",
                    "#d9aa50",
                    "#43a582",
                    "#6b91b4"
                ],

                borderRadius: 7,
                borderSkipped: false,
                maxBarThickness: 48,
                hoverBackgroundColor: "#315f87"
            }]
        },

        options: {
            ...opcoesGrafico(),

            plugins: {
                ...opcoesGrafico().plugins,

                legend: {
                    display: false
                },

                tooltip: {
                    ...opcoesGrafico().plugins.tooltip,

                    callbacks: {
                        label: contexto =>
                            formatarNumero(contexto.raw) + " toneladas"
                    }
                }
            },

            scales: {
                ...opcoesGrafico().scales,

                y: {
                    ...opcoesGrafico().scales.y,

                    ticks: {
                        ...opcoesGrafico().scales.y.ticks,
                        callback: valor => formatarNumero(valor)
                    }
                }
            }
        }
    });
}

// ==========================================
// GRÁFICO DE CUSTOS
// ==========================================

function atualizarGraficoCustos(matriz) {
    if (typeof Chart === "undefined") return;

    const elemento = document.getElementById("graficoCustos");

    if (!elemento || !matriz || matriz.length === 0) return;

    const custosRodoviarios = matriz
        .map(item => Number(item.custo_rodoviario_tonelada))
        .filter(Number.isFinite);

    const custosFerroviarios = matriz
        .map(item => Number(item.custo_ferroviario_tonelada))
        .filter(Number.isFinite);

    const media = valores => {
        if (valores.length === 0) return 0;

        return valores.reduce((total, valor) => total + valor, 0)
            / valores.length;
    };

    const custoRodoviario = media(custosRodoviarios);
    const custoFerroviario = media(custosFerroviarios);

    if (graficoCustos) {
        graficoCustos.destroy();
    }

    graficoCustos = new Chart(elemento, {
        type: "bar",

        data: {
            labels: ["Rodoviário", "Ferroviário"],

            datasets: [{
                label: "Custo médio por tonelada",

                data: [
                    custoRodoviario,
                    custoFerroviario
                ],

                backgroundColor: [
                    "#83b5dc",
                    "#477fae"
                ],

                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 65
            }]
        },

        options: {
            ...opcoesGrafico(),

            plugins: {
                ...opcoesGrafico().plugins,

                legend: {
                    display: false
                },

                tooltip: {
                    ...opcoesGrafico().plugins.tooltip,

                    callbacks: {
                        label: contexto => formatarMoeda(contexto.raw)
                    }
                }
            },

            scales: {
                ...opcoesGrafico().scales,

                y: {
                    ...opcoesGrafico().scales.y,

                    ticks: {
                        ...opcoesGrafico().scales.y.ticks,
                        callback: valor => formatarMoeda(valor)
                    }
                }
            }
        }
    });
}

console.log("MineralFlow: sistema carregado com sucesso.");


