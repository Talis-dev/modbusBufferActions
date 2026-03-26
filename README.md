# SmartConveyor 🚀

Sistema completo de gerenciamento de esteira distribuidora com comunicação Modbus TCP bidirecional, controle de filas inteligente, logging persistente e interface web em tempo real.

## 🎯 Características

- **Comunicação Modbus TCP Dupla**: Conexões independentes para Slave Pool (leitura) e CLP (escrita)
- **Modo Client/Server Configurável**: Suporte dinâmico para ambos os modos em cada conexão
- **Gerenciamento de Filas Inteligente**: Filas por saída com delay automático baseado em distância física
- **Endereços de Coil Individuais**: Cada saída tem inputAddress e outputAddress configuráveis independentemente
- **HR por Saída**: Cada saída possui motorTimeHRAddress individual para controle preciso do CLP
- **Sistema Nunca Para**: Em caso de falha de conexão, sistema permanece ativo e reconecta automaticamente
- **Reconexão Automática**: Backoff exponencial (5s → 30s) com singleton global persistente entre hot-reloads
- **Logging Persistente**: Logs salvos em arquivos JSONL com rotação automática de 3 dias
- **Interface de Logs**: Página estilo terminal com filtros, busca, deleção por categoria/nível e exportação
- **Interface em Tempo Real**: Dashboard com atualização automática e monitoramento de conexões
- **Configuração Flexível**: Todos os parâmetros ajustáveis via interface web
- **Modo Limpeza (Fachina)**: Controle dedicado para modo de limpeza via coil configurável
- **Rastreamento de Conexões**: Monitor em tempo real de clientes TCP conectados
- **Alertas Críticos**: Sistema de alertas com severidade e reconhecimento

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── modbus/            # status, control, read-hr, test-clp
│   │   ├── config/            # GET/POST/PUT configuração
│   │   ├── queue/             # estado das filas
│   │   ├── logs/              # GET/DELETE logs (por data, categoria, nível)
│   │   └── system/            # connections, alerts, restart
│   ├── dashboard/             # Monitoramento principal
│   ├── config/                # Configurações do sistema (Settings)
│   ├── logs/                  # Visualizador de logs (estilo terminal)
│   ├── test-clp/              # Teste do CLP/Slave
│   └── page.tsx               # Página inicial
├── components/
│   ├── ConveyorMonitor.tsx    # Monitor de status
│   ├── QueueVisualization.tsx # Visualização de filas
│   ├── SystemControl.tsx      # Controles start/stop
│   ├── ConfigPanel.tsx        # Painel de configuração
│   ├── CleaningModeControl.tsx # Controle modo fachina
│   └── SystemLogs.tsx         # Widget de logs
├── lib/
│   ├── modbus-client.ts       # Cliente Modbus TCP (singleton global)
│   ├── modbus-server.ts       # Servidor Modbus TCP
│   ├── queue-manager.ts       # Gerenciador de filas
│   ├── conveyor-controller.ts # Controlador principal
│   ├── system-logger.ts       # Logger com persistência JSONL
│   ├── connection-tracker.ts  # Rastreador de conexões TCP
│   ├── critical-alerts.ts     # Sistema de alertas
│   ├── config-manager.ts      # Gerenciador de configuração
│   ├── default-config.ts      # Configuração padrão do sistema
│   └── server-state.ts        # Estado global do servidor
└── types/
    └── index.ts               # Interfaces TypeScript
```

## 🔧 Configuração

### Modos de Conexão

**Slave Pool** (leitura de pulsos de entrada):
| Modo | Descrição | Porta padrão |
|------|-----------|--------------|
| `server` | Sistema aguarda o cliente pulsador conectar | `503` |
| `client` | Sistema conecta ao Slave Pool remoto | Configurável |

**CLP** (escrita de comandos de saída):
| Modo | Descrição | Padrão |
|------|-----------|--------|
| `client` | Sistema conecta ao CLP | `192.168.3.115:504` |
| `server` | Sistema aguarda o CLP conectar | Porta configurável |

### Configuração de Saídas

Cada saída possui configuração individual e independente:

| Campo                  | Descrição                                                |
| ---------------------- | -------------------------------------------------------- |
| `inputAddress`         | Endereço da coil de entrada (pulso recebido do pulsador) |
| `outputAddress`        | Endereço da coil de saída (pulso enviado ao CLP)         |
| `motorTimeHRAddress`   | Endereço do Holding Register com tempo de motor ativo    |
| `delayTime`            | Tempo de delay calculado pela distância física (s)       |
| `toleranceTime`        | Tolerância para chegada do produto (s)                   |
| `pulseDuration`        | Duração do pulso de saída (ms)                           |
| `activeEngineDuration` | Tempo que o motor fica ativo no CLP (ms)                 |

### Parâmetros da Esteira

- **Comprimento**: 15 metros (padrão)
- **Velocidade**: 0.5 m/s (padrão)
- **Cálculo de Delay**: Automático baseado em `distância / velocidade`
- **Ciclo de Leitura**: 100ms (10 leituras/segundo)

### Configuração de Exemplo (Saída 1)

```json
{
  "id": 1,
  "name": "Saída 1",
  "delayTime": 4,
  "toleranceTime": 1,
  "pulseDuration": 500,
  "activeEngineDuration": 30,
  "motorTimeHRAddress": 1,
  "inputAddress": 0,
  "outputAddress": 0,
  "enabled": true
}
```

## 📡 API Endpoints

### Status do Sistema

```
GET /api/modbus/status
```

### Controle do Sistema

```
POST /api/modbus/control
Body: { "action": "start" | "stop" | "toggleCleaning" }
```

### Configuração

```
GET  /api/config          # Obter configuração atual
POST /api/config          # Atualizar configuração
PUT  /api/config          # Resetar para padrão
```

### Logs

```
GET    /api/logs?source=memory                # Logs em memória
GET    /api/logs?source=file&date=YYYY-MM-DD  # Logs de arquivo
GET    /api/logs?source=file                  # Datas disponíveis
DELETE /api/logs                              # Limpar memória
DELETE /api/logs?category={cat}              # Deletar por categoria
DELETE /api/logs?level={level}               # Deletar por nível
```

### Leitura de Holding Registers

```
GET /api/modbus/read-hr?addresses=1,2,3
```

### Conexões Ativas

```
GET /api/system/connections
```

### Alertas Críticos

```
GET  /api/system/alerts?unacknowledged=true
POST /api/system/alerts    # Reconhecer alerta
```

### Reiniciar Sistema

```
POST /api/system/restart
```

### Teste CLP/Slave

```
POST /api/modbus/test-clp
Body: { "action": "connect" | "disconnect" | "pulse" | "set" | "read" | "readHR", ... }
```

## 📊 Sistema de Logs

O sistema possui logging centralizado com persistência em disco:

- **Formato**: JSONL (uma linha por log) em `logs/log-YYYY-MM-DD.jsonl`
- **Rotação**: Automática a cada 3 dias
- **Escrita em lote**: Buffer de 5 segundos para otimização de I/O
- **Níveis**: `info`, `success`, `warning`, `error`, `debug`
- **Interface**: Página `/logs` com estilo terminal

### Página de Logs (`/logs`)

- Visualização estilo console/terminal com fundo escuro
- Cores por nível: 🔵 info · 🟢 success · 🟡 warning · 🔴 error · 🟣 debug
- Linhas expansíveis para visualizar payload JSON
- Filtros por: nível, categoria, data, texto livre
- Deleção por categoria ou nível
- Exportação em JSON
- Auto-refresh configurável (3s)
- Atualização manual

## 🔄 Fluxo de Funcionamento

```
Pulsador/Sensor → [coil inputAddress] → Servidor Slave Pool
                                              ↓
                                    Sistema detecta borda de subida
                                              ↓
                                    Produto adicionado à fila
                                    com delay calculado
                                              ↓
                                    Timer expira (produto chegou)
                                              ↓
Sistema escreve pulso → [coil outputAddress] → CLP
CLP mantém motor ativo → [HR motorTimeHRAddress] ms
```

## 🛡️ Resiliência e Reconexão

O sistema foi projetado para nunca parar em modo operação:

- **Singleton global**: `ModbusManager` persiste entre hot-reloads do Next.js
- **Backoff exponencial**: 5s → 10s → 15s → 20s → 30s (máximo)
- **Verificação de socket**: Usa `socket.destroyed` ao invés de flags internas
- **Logs throttled**: Apenas 1 log de erro por sequência + 1 ao reconectar
- **Sistema continua**: Ciclos de leitura/escrita continuam mesmo sem conexão

## 🛠️ Tecnologias

| Tecnologia   | Versão  | Uso                          |
| ------------ | ------- | ---------------------------- |
| Next.js      | 15.5.12 | Framework React (App Router) |
| React        | 19      | Biblioteca UI                |
| TypeScript   | 5.3+    | Tipagem estática             |
| Tailwind CSS | 3.4     | Estilização                  |
| Heroicons    | 2.1     | Ícones                       |
| jsmodbus     | 4.0.6   | Modbus TCP client/server     |
| date-fns     | 3.x     | Manipulação de datas         |
| ESLint       | 9.17    | Linting                      |

## ⚠️ Requisitos

- Node.js 20+
- Rede TCP/IP configurada
- Permissão para escuta em portas configuradas (padrão 503, 504)

## 🗂️ Arquivos Persistidos (fora do git)

```
/data/system-config.json    # Configurações do sistema
/logs/log-YYYY-MM-DD.jsonl  # Arquivos de log diários
```

## 📝 Licença

Projeto desenvolvido para controle de esteira distribuidora industrial.

---

**SmartConveyor** — Desenvolvido com ❤️ usando Next.js e TypeScript

## 🎯 Características

- **Comunicação Modbus TCP Dupla**: Conexões independentes para Slave Pool e CLP
- **Modo Client/Server Configurável**: Suporte dinâmico para ambos os modos em cada conexão
- **Gerenciamento de Filas Inteligente**: Sistema de filas com delay automático baseado em distância física
- **Controle de Tempo Preciso**: Cálculo automático de delays baseado na velocidade e comprimento da esteira
- **Interface em Tempo Real**: Dashboard com atualização automática e monitoramento de conexões
- **Configuração Flexível**: Todos os parâmetros ajustáveis via interface web
- **Modo Limpeza (Fachina)**: Controle dedicado para modo de limpeza da esteira
- **Logs Completos**: Sistema de logs categorizado e alertas críticos
- **Rastreamento de Conexões**: Monitor em tempo real de clientes conectados

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── modbus/            # Endpoints Modbus (status, control, test-clp)
│   │   ├── config/            # Configuração do sistema
│   │   ├── queue/             # Gerenciamento de filas
│   │   ├── system/            # Sistema (connections, alerts, restart)
│   │   └── logs/              # Logs do sistema
│   ├── dashboard/             # Página de monitoramento principal
│   ├── settings/              # Página de configurações
│   ├── test-clp/              # Página de teste do CLP
│   └── page.tsx               # Página inicial
├── components/                # Componentes React
│   ├── ConveyorMonitor.tsx   # Monitor de status com modos
│   ├── QueueVisualization.tsx # Visualização de filas
│   ├── SystemControl.tsx      # Controles start/stop com timeout
│   ├── ConfigPanel.tsx        # Painel de configuração
│   ├── CleaningModeControl.tsx # Controle de modo fachina
│   └── SystemLogs.tsx         # Logs do sistema
├── lib/                       # Lógica de negócio
│   ├── modbus-client.ts      # Cliente Modbus TCP
│   ├── modbus-server.ts      # Servidor Modbus TCP
│   ├── modbus-manager.ts     # Gerenciador de clientes
│   ├── queue-manager.ts      # Gerenciador de filas
│   ├── conveyor-controller.ts # Controlador principal
│   ├── connection-tracker.ts  # Rastreador de conexões
│   ├── critical-alerts.ts    # Sistema de alertas
│   ├── system-logger.ts      # Logger do sistema
│   └── config-manager.ts     # Gerenciador de configuração
└── types/                     # TypeScript types
    └── index.ts
```

## 🔧 Configuração

### Modos de Conexão

O sistema suporta configuração dinâmica de modos client/server para ambas as conexões:

**Slave Pool (Leitura de Pulsos)**

- **Modo Server**: Sistema aguarda conexão do Slave Pool (ex: Modbus Poll)
  - Porta padrão: `503`
  - Sistema lê dos próprios buffers quando cliente escreve
- **Modo Client**: Sistema conecta ao Slave Pool
  - IP/Porta configuráveis
  - Sistema lê via cliente Modbus

**CLP (Escrita de Comandos)**

- **Modo Server**: Sistema aguarda conexão do CLP
  - Porta configurável
  - CLP lê dos buffers do sistema
- **Modo Client**: Sistema conecta ao CLP (modo atual)
  - IP padrão: `192.168.3.115`
  - Porta padrão: `504`
  - Sistema escreve via cliente Modbus

### Parâmetros da Esteira

- **Comprimento**: 15 metros (padrão)
- **Velocidade**: 0.5 m/s (padrão)
- **Cálculo de Delay**: Automático baseado em distância física
- **Tolerância**: 1 segundo por saída

### Saídas Laterais

Configuração de 5 saídas com delays calculados automaticamente:

| Saída | Distância | Delay | Tolerância | Input | Output | Motor Ativo |
| ----- | --------- | ----- | ---------- | ----- | ------ | ----------- |
| 1     | 2m        | 4s    | 1s         | 1     | 1      | 20s         |
| 2     | 4m        | 8s    | 1s         | 2     | 2      | 20s         |
| 3     | 6m        | 12s   | 1s         | 3     | 3      | 20s         |
| 4     | 8m        | 16s   | 1s         | 4     | 4      | 20s         |
| 5     | 10m       | 20s   | 1s         | 5     | 5      | 20s         |

### Modo Fachina (Limpeza)

- **Coil**: 20 (padrão)
- **Ativação**: Via dashboard ou API
- **Função**: Ativa modo de limpeza da esteira

## 📡 API Endpoints

### Status do Sistema

```
GET /api/modbus/status
```

Retorna estado completo incluindo modos de conexão.

### Controle do Sistema

```
POST /api/modbus/control
Body: { "action": "start" | "stop" }
```

### Modo Fachina

```
POST /api/modbus/control
Body: { "action": "toggleCleaning" }
```

### Configuração

```
GET /api/config          # Obter configuração atual
POST /api/config         # Atualizar configuração
PUT /api/config          # Resetar para padrão
```

### Conexões Ativas

```
GET /api/system/connections  # Lista clientes conectados
```

### Alertas Críticos

```
GET /api/system/alerts?unacknowledged=true
POST /api/system/alerts      # Reconhecer alerta
```

### Reiniciar Sistema

```
POST /api/system/restart
```

### Teste CLP

```
POST /api/modbus/test-clp
Body: { "action": "connect" | "disconnect" | "writeCoil" | "readCoils", ... }
```

## 🎮 Como Usar

1. **Acesse a página inicial** (`http://localhost:3000`)
2. **Configure o sistema** (Settings)
   - Selecione modo Client/Server para cada conexão
   - Configure IPs e portas Modbus
   - Ajuste parâmetros da esteira (comprimento, velocidade)
   - Configure saídas e delays
3. **Inicie o monitoramento** (Dashboard)
   - Clique em "Iniciar Sistema"
   - Acompanhe status das conexões (Server/Client)
   - Monitore filas em tempo real
   - Ative/desative modo fachina
4. **Teste o CLP** (Test CLP)
   - Teste conexões em modo client ou server
   - Envie pulsos individuais ou alternados
   - Leia coils do CLP

## 🔄 Fluxo de Funcionamento

1. **Detecção de Produto**: Sensor de entrada envia pulso Modbus
2. **Classificação**: Sistema identifica tipo de produto (1-5)
3. **Enfileiramento**: Produto adicionado à fila com delay calculado
4. **Processamento**: Sistema monitora tempo de chegada
5. **Ativação**: No momento correto, envia pulso para CLP
6. **Duração Motor**: CLP mantém motor ativo pelo tempo configurado
7. **Validação**: Verifica chegada dentro da tolerância
8. **Timeout**: Cancela produto se ultrapassar tempo máximo

## 🛠️ Tecnologias

- **Next.js 15.1** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização utility-first
- **Heroicons v2** - Ícones
- **jsmodbus 4.0.6** - Cliente/Servidor Modbus TCP
- **date-fns** - Manipulação de datas

## ⚠️ Requisitos

- Node.js 20+
- Conexões Modbus TCP configuradas:
  - Slave Pool (client ou server)
  - CLP (client ou server)
- Rede TCP/IP configurada

## 🆕 Novidades

- ✅ Suporte dinâmico client/server em ambas conexões
- ✅ Dashboard mostra modo de cada conexão
- ✅ Cálculo automático de delays baseado em física
- ✅ Motor ativo configurável via holding registers
- ✅ Modo fachina (limpeza)
- ✅ Rastreamento de conexões TCP
- ✅ Sistema de alertas críticos
- ✅ Página de teste do CLP com modos dual
- ✅ Botão abortar para conexões travadas
- ✅ Timeout de 10s para estado "conectando"
- ✅ Auto-disconnect ao recarregar página

## 📝 Licença

Projeto desenvolvido para controle de esteira distribuidora industrial.

---

**SmartConveyor** - Desenvolvido com ❤️ usando Next.js e TypeScript
