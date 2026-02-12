# Sistema de Esteira Modbus - Next.js

Sistema completo de gerenciamento de esteira distribuidora com comunicação Modbus TCP, controle de filas inteligente e interface web em tempo real.

## 🎯 Características

- **Comunicação Modbus TCP**: Cliente robusto para leitura/escrita em servidores Modbus
- **Gerenciamento de Filas**: Sistema inteligente de filas para 6 saídas laterais
- **Controle de Tempo Preciso**: Temporização de 4s, 8s, 12s, 16s, 20s, 24s com tolerância de 1s
- **Interface em Tempo Real**: Dashboard com atualização automática
- **Configuração Flexível**: Todos os parâmetros ajustáveis via interface web
- **Logs Completos**: Sistema de logs categorizado por tipo de evento

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
│   │   ├── modbus/            # Endpoints Modbus
│   │   ├── config/            # Configuração
│   │   └── queue/             # Gerenciamento de filas
│   ├── dashboard/             # Página de monitoramento
│   ├── config/                # Página de configuração
│   └── page.tsx               # Página inicial
├── components/                # Componentes React
│   ├── ConveyorMonitor.tsx   # Monitor de status
│   ├── QueueVisualization.tsx # Visualização de filas
│   ├── SystemControl.tsx      # Controles start/stop
│   ├── ConfigPanel.tsx        # Painel de configuração
│   └── SystemLogs.tsx         # Logs do sistema
├── lib/                       # Lógica de negócio
│   ├── modbus-client.ts      # Cliente Modbus TCP
│   ├── queue-manager.ts      # Gerenciador de filas
│   ├── conveyor-controller.ts # Controlador principal
│   └── default-config.ts     # Configuração padrão
└── types/                     # TypeScript types
    └── index.ts
```

## 🔧 Configuração

### Conexões Modbus

**Slave (Leitura de Pulsos)**

- IP: `192.168.5.254`
- Porta: `504`
- Lê sensores de entrada (coils 1-6)
- Lê sensores de fila nas saídas (coils 100-105)

**CLP (Escrita de Comandos)**

- IP: `192.168.5.25`
- Porta: `504`
- Escreve nos sensores de liberação (coils 6-11)

### Saídas Laterais

| Saída | Tempo | Tolerância | Sensor | Fila | Motor |
| ----- | ----- | ---------- | ------ | ---- | ----- |
| 1     | 4s    | 1s         | 6      | 100  | 20    |
| 2     | 8s    | 1s         | 7      | 101  | 21    |
| 3     | 12s   | 1s         | 8      | 102  | 22    |
| 4     | 16s   | 1s         | 9      | 103  | 23    |
| 5     | 20s   | 1s         | 10     | 104  | 24    |
| 6     | 24s   | 1s         | 11     | 105  | 25    |

## 📡 API Endpoints

### Status do Sistema

```
GET /api/modbus/status
```

Retorna estado completo do sistema, filas e logs.

### Controle do Sistema

```
POST /api/modbus/control
Body: { "action": "start" | "stop" }
```

### Configuração

```
GET /api/config          # Obter configuração atual
POST /api/config         # Atualizar configuração
PUT /api/config          # Resetar para padrão
```

### Gerenciamento de Filas

```
POST /api/queue
Body: { "action": "clear", "outputId": 1 }  # Limpar fila específica
Body: { "action": "clear" }                  # Limpar todas as filas
Body: { "action": "clearLogs" }              # Limpar logs
```

## 🎮 Como Usar

1. **Acesse a página inicial** (`http://localhost:3000`)
2. **Configure o sistema** (Configurações)
   - Ajuste IPs e portas Modbus
   - Configure tempos e tolerâncias
   - Ajuste endereços de sensores
3. **Inicie o monitoramento** (Dashboard)
   - Clique em "Iniciar Sistema"
   - Acompanhe as filas em tempo real
   - Monitore logs e estatísticas

## 🔄 Fluxo de Funcionamento

1. **Detecção de Produto**: Sensor de entrada envia pulso Modbus (100ms)
2. **Classificação**: Sistema identifica qual saída o produto deve ir
3. **Enfileiramento**: Produto é adicionado à fila com tempo calculado
4. **Processamento**: Sistema monitora tempo de chegada
5. **Ativação**: No momento correto, envia comando para CLP
6. **Validação**: Verifica se produto chegou dentro da tolerância
7. **Timeout**: Cancela produto se ultrapassar tempo máximo

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização
- **Heroicons** - Ícones
- **jsmodbus** - Cliente Modbus TCP
- **Zustand** - (opcional) Gerenciamento de estado

## ⚠️ Requisitos

- Node.js 20+
- Servidor Modbus Slave (leitura)
- CLP com Modbus Master (escrita)
- Rede TCP/IP configurada

## 📝 Licença

Projeto desenvolvido para controle de esteira distribuidora industrial.

---

**Desenvolvido com ❤️ usando Next.js e TypeScript**
