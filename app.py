from flask import Flask, render_template, request, jsonify
import math
import heapq

app = Flask(__name__)

# ==========================================
# DADOS DO SISTEMA
# ==========================================

MINAS = [
    {
        "id": 1,
        "nome": "Complexo Minerador de Carajás",
        "latitude": -6.0675,
        "longitude": -50.1750,
        "producao": 120000,
        "mineral": "Ferro"
    },
    {
        "id": 2,
        "nome": "Mina de Parauapebas",
        "latitude": -6.0755,
        "longitude": -49.8760,
        "producao": 85000,
        "mineral": "Ferro"
    },
    {
        "id": 3,
        "nome": "Projeto Mineral de Canaã",
        "latitude": -6.4970,
        "longitude": -49.8770,
        "producao": 65000,
        "mineral": "Cobre"
    }
]

USINAS = [
    {
        "id": 1,
        "nome": "Usina de Beneficiamento de Carajás",
        "latitude": -6.1200,
        "longitude": -50.1500
    },
    {
        "id": 2,
        "nome": "Usina de Canaã dos Carajás",
        "latitude": -6.4900,
        "longitude": -49.8500
    }
]

DESTINOS = [
    {
        "id": 1,
        "nome": "Terminal Ferroviário de Marabá",
        "latitude": -5.3686,
        "longitude": -49.1178
    },
    {
        "id": 2,
        "nome": "Porto de Ponta da Madeira",
        "latitude": -2.5667,
        "longitude": -44.3667
    }
]

TARIFAS = {
    "rodovia": 0.32,
    "ferrovia": 0.18
}

# Distâncias demonstrativas em quilômetros
DISTANCIAS = {
    "1-1": {"rodovia": 220, "ferrovia": 190},
    "1-2": {"rodovia": 890, "ferrovia": 850},
    "2-1": {"rodovia": 180, "ferrovia": 210},
    "2-2": {"rodovia": 870, "ferrovia": 830},
    "3-1": {"rodovia": 260, "ferrovia": 300},
    "3-2": {"rodovia": 950, "ferrovia": 900}
}

TERMINAIS = [
    {
        "id": "A",
        "nome": "Terminal de Marabá",
        "latitude": -5.3686,
        "longitude": -49.1178,
        "capacidade": 100000,
        "acesso": 90
    },
    {
        "id": "B",
        "nome": "Terminal de Parauapebas",
        "latitude": -6.0675,
        "longitude": -49.9037,
        "capacidade": 150000,
        "acesso": 95
    },
    {
        "id": "C",
        "nome": "Terminal de Canaã dos Carajás",
        "latitude": -6.4970,
        "longitude": -49.8770,
        "capacidade": 80000,
        "acesso": 78
    }
]


# ==========================================
# FUNÇÕES AUXILIARES
# ==========================================

def distancia_geografica(lat1, lon1, lat2, lon2):
    raio = 6371

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return raio * c


def buscar_mina(identificador):
    return next(
        (mina for mina in MINAS if str(mina["id"]) == str(identificador)),
        None
    )


def buscar_destino(identificador):
    return next(
        (destino for destino in DESTINOS
         if str(destino["id"]) == str(identificador)),
        None
    )


# ==========================================
# PÁGINA PRINCIPAL
# ==========================================

@app.route("/")
def inicio():
    return render_template(
        "index.html",
        minas=MINAS,
        destinos=DESTINOS
    )


# ==========================================
# DADOS GERAIS
# ==========================================

@app.route("/api/dados")
def obter_dados():
    return jsonify({
        "minas": MINAS,
        "usinas": USINAS,
        "destinos": DESTINOS,
        "terminais": TERMINAIS,
        "indicadores": {
            "total_minas": len(MINAS),
            "total_usinas": len(USINAS),
            "total_destinos": len(DESTINOS),
            "producao_total": sum(m["producao"] for m in MINAS)
        }
    })


# ==========================================
# CÁLCULO DE ROTAS E CUSTOS
# ==========================================

@app.route("/api/rota", methods=["POST"])
def calcular_rota():
    dados = request.get_json(silent=True) or {}

    origem_id = dados.get("origem")
    destino_id = dados.get("destino")

    try:
        toneladas = float(dados.get("toneladas", 1))
    except (TypeError, ValueError):
        return jsonify({"erro": "Quantidade de toneladas inválida."}), 400

    if toneladas <= 0:
        return jsonify({"erro": "Informe uma quantidade de toneladas maior que zero."}), 400

    mina = buscar_mina(origem_id)
    destino = buscar_destino(destino_id)

    if not mina or not destino:
        return jsonify({"erro": "Origem ou destino inválido."}), 400

    chave = f"{mina['id']}-{destino['id']}"
    distancias = DISTANCIAS.get(chave)

    if not distancias:
        return jsonify({"erro": "Distâncias não encontradas."}), 404

    custo_rodoviario = distancias["rodovia"] * TARIFAS["rodovia"]
    custo_ferroviario = distancias["ferrovia"] * TARIFAS["ferrovia"]

    alternativas = [
        {
            "modal": "Rodoviário",
            "distancia_km": distancias["rodovia"],
            "custo_por_tonelada": round(custo_rodoviario, 2),
            "custo_total": round(custo_rodoviario * toneladas, 2)
        },
        {
            "modal": "Ferroviário",
            "distancia_km": distancias["ferrovia"],
            "custo_por_tonelada": round(custo_ferroviario, 2),
            "custo_total": round(custo_ferroviario * toneladas, 2)
        }
    ]

    melhor = min(
        alternativas,
        key=lambda item: item["custo_por_tonelada"]
    )

    return jsonify({
        "origem": mina["nome"],
        "destino": destino["nome"],
        "toneladas": toneladas,
        "alternativas": alternativas,
        "melhor_rota": melhor,
        "aviso": "Cálculo demonstrativo com distâncias e tarifas simuladas."
    })


# ==========================================
# MATRIZ DE ORIGEM E DESTINO
# ==========================================

@app.route("/api/matriz")
def obter_matriz():
    matriz = []

    for mina in MINAS:
        for destino in DESTINOS:
            chave = f"{mina['id']}-{destino['id']}"
            valores = DISTANCIAS[chave]

            custo_rodoviario = valores["rodovia"] * TARIFAS["rodovia"]
            custo_ferroviario = valores["ferrovia"] * TARIFAS["ferrovia"]

            matriz.append({
                "origem": mina["nome"],
                "destino": destino["nome"],
                "distancia_rodoviaria_km": valores["rodovia"],
                "distancia_ferroviaria_km": valores["ferrovia"],
                "custo_rodoviario_tonelada": round(custo_rodoviario, 2),
                "custo_ferroviario_tonelada": round(custo_ferroviario, 2),
                "modal_mais_economico": (
                    "Rodoviário"
                    if custo_rodoviario < custo_ferroviario
                    else "Ferroviário"
                )
            })

    return jsonify({
        "matriz": matriz,
        "aviso": "Matriz demonstrativa baseada em distâncias simuladas."
    })


# ==========================================
# FLUXOS MINERAIS
# ==========================================

@app.route("/api/fluxos")
def obter_fluxos():
    fluxos = []

    for mina in MINAS:
        for destino in DESTINOS:
            chave = f"{mina['id']}-{destino['id']}"
            valores = DISTANCIAS[chave]

            fluxos.append({
                "origem": mina["nome"],
                "destino": destino["nome"],
                "latitude_origem": mina["latitude"],
                "longitude_origem": mina["longitude"],
                "latitude_destino": destino["latitude"],
                "longitude_destino": destino["longitude"],
                "producao_toneladas": mina["producao"],
                "distancia_rodoviaria_km": valores["rodovia"],
                "distancia_ferroviaria_km": valores["ferrovia"]
            })

    return jsonify({
        "fluxos": fluxos,
        "aviso": "Fluxos esquemáticos, sem representar trajetos reais."
    })


# ==========================================
# ANÁLISE DE NOVOS TERMINAIS
# ==========================================

@app.route("/api/terminais")
def analisar_terminais():
    candidatos = []

    producao_total = sum(m["producao"] for m in MINAS)

    for terminal in TERMINAIS:
        distancia_ponderada = 0

        for mina in MINAS:
            distancia = distancia_geografica(
                mina["latitude"],
                mina["longitude"],
                terminal["latitude"],
                terminal["longitude"]
            )

            peso = mina["producao"] / producao_total
            distancia_ponderada += distancia * peso

        pontuacao_proximidade = max(
            0,
            100 - (distancia_ponderada / 2)
        )

        pontuacao = (
            pontuacao_proximidade * 0.6
            + terminal["acesso"] * 0.4
        )

        candidatos.append({
            **terminal,
            "distancia_ponderada_km": round(distancia_ponderada, 2),
            "pontuacao": round(pontuacao, 2)
        })

    candidatos.sort(
        key=lambda item: item["pontuacao"],
        reverse=True
    )

    return jsonify({
        "candidatos": candidatos,
        "recomendacao": candidatos[0],
        "metodo": "Avaliação ponderada simplificada inspirada em p-mediana.",
        "aviso": "Estudo preliminar demonstrativo, sem validação ambiental, econômica ou operacional."
    })


# ==========================================
# ANÁLISE DE REDE LOGÍSTICA - DIJKSTRA
# ==========================================

def montar_rede_logistica():
    rede = []

    for chave, valores in DISTANCIAS.items():
        id_mina, id_destino = chave.split("-")

        origem = f"mina_{id_mina}"
        destino = f"destino_{id_destino}"

        rede.append({
            "origem": origem,
            "destino": destino,
            "distancia": valores["rodovia"],
            "modal": "rodoviario"
        })

        rede.append({
            "origem": origem,
            "destino": destino,
            "distancia": valores["ferrovia"],
            "modal": "ferroviario"
        })

    return rede


def calcular_menor_caminho(origem, destino, modal):
    rede = montar_rede_logistica()

    tarifa = (
        TARIFAS["rodovia"]
        if modal == "rodoviario"
        else TARIFAS["ferrovia"]
    )

    fila = [(0, origem)]
    menores_custos = {origem: 0}
    distancias = {origem: 0}
    anteriores = {}

    while fila:
        custo_atual, no_atual = heapq.heappop(fila)

        if no_atual == destino:
            break

        if custo_atual > menores_custos.get(no_atual, float("inf")):
            continue

        for conexao in rede:
            if conexao["modal"] != modal:
                continue

            if conexao["origem"] == no_atual:
                vizinho = conexao["destino"]
            elif conexao["destino"] == no_atual:
                vizinho = conexao["origem"]
            else:
                continue

            novo_custo = (
                custo_atual + conexao["distancia"] * tarifa
            )

            if novo_custo < menores_custos.get(
                vizinho, float("inf")
            ):
                menores_custos[vizinho] = novo_custo
                distancias[vizinho] = (
                    distancias[no_atual] + conexao["distancia"]
                )
                anteriores[vizinho] = no_atual

                heapq.heappush(
                    fila,
                    (novo_custo, vizinho)
                )

    if destino not in menores_custos:
        return None

    caminho = []
    atual = destino

    while atual != origem:
        caminho.append(atual)

        if atual not in anteriores:
            return None

        atual = anteriores[atual]

    caminho.append(origem)
    caminho.reverse()

    return {
        "caminho": caminho,
        "distancia_km": round(distancias[destino], 2),
        "custo_por_tonelada": round(
            menores_custos[destino], 2
        )
    }


@app.route("/api/rede", methods=["POST"])
def analisar_rede_logistica():
    dados = request.get_json(silent=True) or {}

    origem_id = str(dados.get("origem", ""))
    destino_id = str(dados.get("destino", ""))

    if not buscar_mina(origem_id):
        return jsonify({
            "erro": "Mina de origem inválida."
        }), 400

    if not buscar_destino(destino_id):
        return jsonify({
            "erro": "Destino inválido."
        }), 400

    origem = f"mina_{origem_id}"
    destino = f"destino_{destino_id}"

    alternativas = []

    for modal in ["rodoviario", "ferroviario"]:
        resultado = calcular_menor_caminho(
            origem,
            destino,
            modal
        )

        if resultado:
            resultado["modal"] = modal
            alternativas.append(resultado)

    if not alternativas:
        return jsonify({
            "erro": "Nenhuma rota encontrada."
        }), 404

    melhor_rota = min(
        alternativas,
        key=lambda item: item["custo_por_tonelada"]
    )

    return jsonify({
        "algoritmo": "Dijkstra",
        "origem": origem,
        "destino": destino,
        "alternativas": alternativas,
        "melhor_rota": melhor_rota,
        "aviso": "Rede demonstrativa com distâncias e custos simulados. Não representa trajetos reais validados."
    })


# ==========================================
# STATUS DO SISTEMA
# ==========================================

@app.route("/api/status")
def status_sistema():
    return jsonify({
        "sistema": "MineralFlow",
        "status": "operacional",
        "versao": "2.0",
        "quantidade_minas": len(MINAS),
        "quantidade_usinas": len(USINAS),
        "quantidade_destinos": len(DESTINOS),
        "modais": ["Rodoviário", "Ferroviário"]
    })


# ==========================================
# INICIALIZAÇÃO
# ==========================================

if __name__ == "__main__":
    app.run(debug=True)
