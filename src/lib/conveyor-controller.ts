// ============================================
// CONTROLADOR PRINCIPAL DA ESTEIRA
// ============================================

import { modbusManager } from "./modbus-client";
import { ModbusServer } from "./modbus-server";
import { QueueManager } from "./queue-manager";
import { SystemConfig, SystemState, OutputSensor } from "@/types";

export class ConveyorController {
  private config: SystemConfig;
  private queueManager: QueueManager;
  private running: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private modbusServer: ModbusServer | null = null; // Servidor para CLP
  private slavePoolServer: ModbusServer | null = null; // Servidor para Slave Pool
  private lastErrorLog: number = 0;
  private errorCount: number = 0;
  private firstErrorTime?: number;
  private autoStopScheduled: boolean = false;
  private cleaningMode: boolean = false; // Modo fachina

  // Estado dos sensores de entrada (últimos valores lidos)
  private lastInputStates: boolean[] = [];

  // Estado dos sensores de saída
  private outputSensors: Map<number, OutputSensor> = new Map();

  constructor(config: SystemConfig) {
    this.config = config;
    this.queueManager = new QueueManager(config.outputs);

    // Inicializa sensores de saída
    config.outputs.forEach((output) => {
      this.outputSensors.set(output.id, {
        outputId: output.id,
        activated: false,
        lastActivation: 0,
      });
    });
  }

  /**
   * Inicia o controlador
   */
  async start(): Promise<boolean> {
    if (this.running) {
      console.log("[Controller] Já está em execução");
      return true;
    }

    try {
      // CONEXÃO SLAVE POOL - Configurável (Client ou Server)
      if (this.config.slaveMode === "client") {
        // Modo Client: Conecta ao Slave Pool
        const slaveClient = modbusManager.getSlaveClient(
          this.config.slaveIp,
          this.config.slavePort,
          this.config.slaveTimeout,
        );
        await slaveClient.connect();
        console.log(
          `[Controller] Conectado ao Slave Pool (Client) ${this.config.slaveIp}:${this.config.slavePort}`,
        );
      } else {
        // Modo Server: Aguarda Slave Pool conectar
        if (!this.slavePoolServer) {
          this.slavePoolServer = new ModbusServer(this.config.slavePort);
        }
        await this.slavePoolServer.start();
        console.log(
          `[Controller] ✅ Servidor Slave Pool iniciado na porta ${this.config.slavePort}`,
        );
        console.log(
          `[Controller] Aguardando Slave Pool conectar em 0.0.0.0:${this.config.slavePort}`,
        );
      }

      // CONEXÃO CLP - Configurável (Client ou Server)
      if (this.config.clpMode === "server") {
        // Modo Server: Aguarda CLP conectar
        this.modbusServer = new ModbusServer(this.config.clpPort);
        await this.modbusServer.start();

        // Configura tempos de motor ativo nos holding registers
        const engineDurations = this.config.outputs.map(
          (output) => output.activeEngineDuration,
        );
        this.modbusServer.setEngineActiveDurations(engineDurations);

        console.log(
          `[Controller] Aguardando CLP conectar (Server) na porta ${this.config.clpPort}`,
        );
      } else {
        // Modo Client: Conecta no CLP
        const clpClient = modbusManager.getCLPClient(
          this.config.clpIp,
          this.config.clpPort,
          this.config.clpTimeout,
        );
        await clpClient.connect();
        console.log(
          `[Controller] Conectado ao CLP (Client) ${this.config.clpIp}:${this.config.clpPort}`,
        );
      }

      this.running = true;
      this.startCycle();

      console.log("[Controller] Sistema iniciado com sucesso");
      return true;
    } catch (error: any) {
      console.error("[Controller] Erro ao iniciar sistema:", error.message);
      return false;
    }
  }

  /**
   * Para o controlador
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }

    // Para o servidor Modbus CLP e aguarda fechar
    if (this.modbusServer) {
      await this.modbusServer.stop();
      this.modbusServer = null;
    }

    // Para o servidor Modbus Slave Pool e aguarda fechar
    if (this.slavePoolServer) {
      await this.slavePoolServer.stop();
      this.slavePoolServer = null;
    }

    modbusManager.disconnectAll();
    console.log("[Controller] Sistema parado completamente");
  }

  /**
   * Inicia o ciclo de leitura/escrita
   */
  private startCycle(): void {
    this.cycleInterval = setInterval(async () => {
      await this.executeCycle();
    }, this.config.readCycleMs);
  }

  /**
   * Executa um ciclo completo
   */
  private async executeCycle(): Promise<void> {
    try {
      // 1. Ler sensores de entrada (pulsos de produtos)
      await this.readInputSensors();

      // 2. Processar filas e determinar ativações
      const activations = this.queueManager.processQueues();

      // 3. Enviar comandos para o CLP
      await this.writeOutputCommands(activations);
    } catch (error: any) {
      this.handleReadError(`Erro no ciclo: ${error.message}`);
    }
  }

  /**
   * Gerencia erros de leitura Modbus com auto-stop
   */
  private handleReadError(message: string): void {
    const now = Date.now();

    // Registra primeiro erro
    if (!this.firstErrorTime) {
      this.firstErrorTime = now;
      this.errorCount = 1;
      console.error(`[Controller] ⚠️  ERRO: ${message}`);
      return;
    }

    this.errorCount++;

    // Verifica se passou 10 segundos desde o primeiro erro
    const elapsedSeconds = (now - this.firstErrorTime) / 1000;

    if (elapsedSeconds > 10 && !this.autoStopScheduled) {
      this.autoStopScheduled = true;
      console.error(
        `\n[Controller] ❌ Sistema parado automaticamente após ${this.errorCount} erros em ${elapsedSeconds.toFixed(1)}s`,
      );
      console.error(
        `[Controller] 🔍 Verifique: endereços Modbus, conexão com Slave Pool, configuração do simulador\n`,
      );

      // Para o sistema
      this.stop().catch((err) =>
        console.error("[Controller] Erro ao parar sistema:", err),
      );
    } else if (!this.autoStopScheduled) {
      // Log silencioso - apenas a cada 3 segundos
      if (!this.lastErrorLog || now - this.lastErrorLog > 3000) {
        console.warn(
          `[Controller] Erros contínuos: ${this.errorCount} em ${elapsedSeconds.toFixed(1)}s (auto-stop em ${(10 - elapsedSeconds).toFixed(1)}s)`,
        );
        this.lastErrorLog = now;
      }
    }
  }

  /**
   * Reseta contador de erros após leitura bem-sucedida
   */
  private resetErrorCounter(): void {
    if (this.errorCount > 0) {
      console.log(`[Controller] ✅ Conexão restaurada`);
    }
    this.errorCount = 0;
    this.firstErrorTime = undefined;
    this.lastErrorLog = 0;
    this.autoStopScheduled = false;
  }

  /**
   * Lê os sensores de entrada (pulsos Modbus do Slave)
   */
  private async readInputSensors(): Promise<void> {
    try {
      let coilsData: boolean[] = [];

      // Determina de onde ler baseado no modo
      if (this.config.slaveMode === "server") {
        // Modo Server: lê dos buffers do próprio servidor
        if (!this.slavePoolServer) return;

        // Lê cada coil individualmente do buffer do servidor
        const startAddress = Math.min(
          ...this.config.inputSensors.map((s) => s.address),
        );
        const quantity = this.config.inputSensors.length;

        for (let i = 0; i < quantity; i++) {
          const coilValue = this.slavePoolServer.readCoil(startAddress + i);
          coilsData.push(coilValue);
        }
      } else {
        // Modo Client: lê do cliente Modbus conectado ao Slave Pool
        const slaveClient = modbusManager.getSlaveClient(
          this.config.slaveIp,
          this.config.slavePort,
          this.config.slaveTimeout,
        );

        if (!slaveClient.isConnected()) return;

        const startAddress = Math.min(
          ...this.config.inputSensors.map((s) => s.address),
        );
        const quantity = this.config.inputSensors.length;

        // Valida endereços antes de ler
        if (startAddress < 0 || quantity <= 0 || quantity > 2000) {
          this.handleReadError(
            `Endereços inválidos: start=${startAddress}, quantity=${quantity}`,
          );
          return;
        }

        const response = await slaveClient.readCoils(startAddress, quantity);

        if (!response.success || !response.coils) {
          this.handleReadError(
            `Falha ao ler sensores (addr: ${startAddress}, qty: ${quantity})`,
          );
          return;
        }

        coilsData = response.coils;
      }

      // Sucesso - reseta contador de erros
      this.resetErrorCounter();

      // Detecta pulsos (transição de 0 para 1)
      coilsData.forEach((currentState, index) => {
        const previousState = this.lastInputStates[index] || false;

        // Detectou pulso (borda de subida)
        if (currentState && !previousState) {
          const sensor = this.config.inputSensors[index];
          if (sensor) {
            console.log(
              `[Controller] Pulso detectado no sensor ${sensor.address} - Produto tipo ${sensor.productType}`,
            );

            // Adiciona produto à fila
            this.queueManager.addProduct(sensor.productType);
          }
        }
      });

      // Atualiza estados
      this.lastInputStates = coilsData;
    } catch (error: any) {
      this.handleReadError(error.message || "Erro desconhecido");
    }
  }

  /**
   * Envia comandos de ativação para o CLP
   */
  private async writeOutputCommands(
    activations: Map<number, boolean>,
  ): Promise<void> {
    try {
      // Determina como escrever baseado no modo CLP
      if (this.config.clpMode === "server") {
        // Modo Server: sistema aguarda CLP conectar, escreve nos buffers do servidor
        if (!this.modbusServer) return;

        for (const output of this.config.outputs) {
          const shouldActivate = activations.get(output.id) || false;
          this.modbusServer.writeCoil(output.outputAddress, shouldActivate);

          // Atualiza estado do sensor
          const sensor = this.outputSensors.get(output.id);
          if (sensor) {
            const wasActivated = sensor.activated;
            sensor.activated = shouldActivate;

            if (shouldActivate && !wasActivated) {
              const pulseDuration = output.pulseDuration || 500;
              sensor.lastActivation = Date.now();
              console.log(
                `[Controller] ➡️ Pulso ${pulseDuration}ms enviado para saída ${output.id} (${output.name}) - Coil ${output.outputAddress}`,
              );
            }
          }
        }
      } else {
        // Modo Client: sistema conecta ao CLP, escreve via cliente
        const clpClient = modbusManager.getCLPClient(
          this.config.clpIp,
          this.config.clpPort,
          this.config.clpTimeout,
        );

        if (!clpClient.isConnected()) return;

        for (const output of this.config.outputs) {
          const shouldActivate = activations.get(output.id) || false;

          // Escreve via cliente Modbus
          await clpClient.writeSingleCoil(output.outputAddress, shouldActivate);

          // Atualiza estado do sensor
          const sensor = this.outputSensors.get(output.id);
          if (sensor) {
            const wasActivated = sensor.activated;
            sensor.activated = shouldActivate;

            if (shouldActivate && !wasActivated) {
              const pulseDuration = output.pulseDuration || 500;
              sensor.lastActivation = Date.now();
              console.log(
                `[Controller] ➡️ Pulso ${pulseDuration}ms enviado para saída ${output.id} (${output.name}) - Coil ${output.outputAddress}`,
              );
            }
          }
        }
      }
    } catch (error: any) {
      this.handleReadError(`Erro ao escrever outputs: ${error.message}`);
    }
  }

  /**
   * Obtém o estado atual do sistema
   */
  getSystemState(): SystemState {
    const slaveClient = modbusManager.getSlaveClient(
      this.config.slaveIp,
      this.config.slavePort,
      this.config.slaveTimeout,
    );

    const stats = this.queueManager.getStats();

    // Slave Pool conectado depende do modo:
    // - Modo Server: verifica se tem clientes conectados
    // - Modo Client: verifica se o cliente está conectado
    let slaveConnected = false;
    if (this.config.slaveMode === "server") {
      slaveConnected = this.slavePoolServer?.hasClients() || false;
    } else {
      // Modo client: verificar se o cliente Slave está conectado
      slaveConnected = slaveClient.isConnected();
    }

    // CLP conectado depende do modo:
    // - Modo Server: verifica se tem clientes conectados
    // - Modo Client: verifica se o cliente está conectado
    let clpConnected = false;
    if (this.config.clpMode === "server") {
      clpConnected = this.modbusServer?.hasClients() || false;
    } else {
      // Modo client: verificar se o cliente CLP está conectado
      const clpClient = modbusManager.getCLPClient(
        this.config.clpIp,
        this.config.clpPort,
        this.config.clpTimeout,
      );
      clpConnected = clpClient.isConnected();
    }

    return {
      connected: this.running,
      slaveConnected: slaveConnected,
      clpConnected: clpConnected,
      slaveMode: this.config.slaveMode,
      clpMode: this.config.clpMode,
      cleaningMode: this.cleaningMode,
      queues: this.queueManager.getAllQueues(),
      sensors: Array.from(this.outputSensors.values()),
      totalProductsProcessed: stats.totalProcessed,
      totalProductsCancelled: stats.totalCancelled,
      lastUpdate: Date.now(),
      errors: [],
    };
  }

  /**
   * Obtém o gerenciador de filas
   */
  getQueueManager(): QueueManager {
    return this.queueManager;
  }

  /**
   * Atualiza a configuração
   */
  updateConfig(config: SystemConfig): void {
    this.config = config;
    // Reinicializa o queue manager com as novas configurações
    this.queueManager = new QueueManager(config.outputs);

    // Atualiza tempos de motor ativo nos holding registers
    if (this.modbusServer) {
      const engineDurations = config.outputs.map(
        (output) => output.activeEngineDuration,
      );
      this.modbusServer.setEngineActiveDurations(engineDurations);
    }

    console.log("[Controller] Configuração atualizada");
  }

  /**
   * Alterna o modo fachina (limpeza)
   */
  toggleCleaningMode(): boolean {
    if (!this.running) {
      console.warn(
        "[Controller] Não é possível alternar modo fachina - sistema não está rodando",
      );
      return false;
    }

    this.cleaningMode = !this.cleaningMode;

    // Escreve no coil configurado baseado no modo CLP
    if (this.config.clpMode === "server") {
      // Modo Server: escreve nos buffers do servidor
      if (!this.modbusServer) return false;
      this.modbusServer.writeCoil(
        this.config.cleaningModeCoil,
        this.cleaningMode,
      );
    } else {
      // Modo Client: escreve via cliente
      const clpClient = modbusManager.getCLPClient(
        this.config.clpIp,
        this.config.clpPort,
        this.config.clpTimeout,
      );
      if (!clpClient.isConnected()) return false;
      clpClient.writeSingleCoil(
        this.config.cleaningModeCoil,
        this.cleaningMode,
      );
    }

    console.log(
      `[Controller] Modo fachina ${this.cleaningMode ? "ATIVADO" : "DESATIVADO"}`,
    );
    return this.cleaningMode;
  }

  /**
   * Obtém estado do modo fachina
   */
  isCleaningMode(): boolean {
    return this.cleaningMode;
  }
}
