# MINERALFLOW
## Sistema Inteligente de Logística e Escoamento Mineral

### 1. Apresentação
O MineralFlow é um sistema desenvolvido para apoiar o planejamento logístico do transporte mineral, permitindo visualizar minas, destinos logísticos, comparar modais de transporte e analisar alternativas para instalação de novos terminais.

O projeto foi desenvolvido como protótipo acadêmico relacionado ao Tema 23 – Logística de Escoamento Mineral.

### 2. Objetivo geral
Analisar alternativas de transporte e localização de terminais para apoiar a otimização do escoamento da produção mineral.

### 3. Funcionalidades
- Visualização de minas e destinos em mapa interativo.
- Apresentação de indicadores de produção mineral.
- Simulação de rotas entre minas e destinos.
- Comparação de transporte rodoviário e ferroviário.
- Cálculo demonstrativo de custo por tonelada.
- Análise comparativa de alternativas para novos terminais.
- Gráficos de produção e custos logísticos.

### 4. Tecnologias utilizadas
- Python
- Flask
- HTML5
- CSS3
- JavaScript
- Leaflet
- OpenStreetMap
- Chart.js

### 5. Organização do projeto
- app.py: aplicação e rotas do servidor.
- templates/: páginas HTML.
- static/css/: estilos visuais.
- static/js/: funcionalidades JavaScript.
- dados/: armazenamento de dados.
- mapas/: arquivos cartográficos.
- relatorios/: documentos e resultados.

### 6. Como executar
1. Abrir o terminal Ubuntu (WSL).
2. Acessar a pasta do projeto.
3. Ativar o ambiente virtual.
4. Instalar as dependências.
5. Executar o servidor Flask.

Comandos:

```bash
cd /mnt/c/Users/pamel/LogisticaMineral
source .venv/bin/activate
pip install -r requirements.txt
python app.py