// ============================================
// API DE TESTE DO CLP
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { ModbusServer } from "@/lib/modbus-server";
import { updateTestServerState, getTestServerState } from "@/lib/server-state";

let testServer: ModbusServer | null = null;
let testStartTime: number = 0;
let testHistory: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port, coilAddress, value } = body;

    // Iniciar servidor de teste
    if (action === "start") {
      // Verificar estado persistente
      const savedState = getTestServerState();
      if (testServer || savedState.running) {
        return NextResponse.json(
          { error: "Servidor de teste já está rodando" },
          { status: 400 },
        );
      }

      testServer = new ModbusServer(port || 502);
      await testServer.start();
      testStartTime = Date.now();
      testHistory = [];

      // Salvar estado
      updateTestServerState(true, port || 502, testStartTime);

      testHistory.push({
        timestamp: Date.now(),
        action: "start",
        message: `Servidor de teste iniciado na porta ${port || 502}`,
      });

      return NextResponse.json({
        success: true,
        message: "Servidor de teste iniciado",
        port: port || 502,
      });
    }

    // Parar servidor de teste
    if (action === "stop") {
      if (!testServer) {
        return NextResponse.json(
          { error: "Servidor de teste não está rodando" },
          { status: 400 },
        );
      }

      await testServer.stop();
      const uptime = Date.now() - testStartTime;

      testHistory.push({
        timestamp: Date.now(),
        action: "stop",
        message: `Servidor parado após ${(uptime / 1000).toFixed(1)}s`,
      });

      testServer = null;
      testStartTime = 0;

      // Atualizar estado
      updateTestServerState(false, 502, 0);

      return NextResponse.json({
        success: true,
        message: "Servidor de teste parado",
        uptime,
      });
    }

    // Enviar pulso em um coil
    if (action === "pulse") {
      if (!testServer) {
        return NextResponse.json(
          { error: "Servidor de teste não está rodando" },
          { status: 400 },
        );
      }

      const address = parseInt(coilAddress);
      const duration = parseInt(value) || 1000;

      // Liga coil
      testServer.writeCoil(address, true);

      testHistory.push({
        timestamp: Date.now(),
        action: "pulse_start",
        coil: address,
        duration,
        message: `Pulso iniciado no coil ${address} por ${duration}ms`,
      });

      // Desliga depois do tempo
      setTimeout(() => {
        if (testServer) {
          testServer.writeCoil(address, false);
          testHistory.push({
            timestamp: Date.now(),
            action: "pulse_end",
            coil: address,
            message: `Pulso finalizado no coil ${address}`,
          });
        }
      }, duration);

      return NextResponse.json({
        success: true,
        message: `Pulso de ${duration}ms enviado para coil ${address}`,
        coil: address,
        duration,
        hasClients: testServer.hasClients(),
      });
    }

    // Definir coil (ligar/desligar)
    if (action === "set") {
      if (!testServer) {
        return NextResponse.json(
          { error: "Servidor de teste não está rodando" },
          { status: 400 },
        );
      }

      const address = parseInt(coilAddress);
      const state = value === true || value === "true";

      testServer.writeCoil(address, state);

      testHistory.push({
        timestamp: Date.now(),
        action: "set",
        coil: address,
        value: state,
        message: `Coil ${address} definido para ${state ? "ON" : "OFF"}`,
      });

      return NextResponse.json({
        success: true,
        message: `Coil ${address} definido para ${state ? "ON" : "OFF"}`,
        coil: address,
        value: state,
        hasClients: testServer.hasClients(),
      });
    }

    // Obter status
    if (action === "status") {
      return NextResponse.json({
        running: testServer !== null,
        uptime: testServer ? Date.now() - testStartTime : 0,
        hasClients: testServer ? testServer.hasClients() : false,
        history: testHistory.slice(-50), // Últimos 50 eventos
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Test CLP] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Verificar estado real
  const savedState = getTestServerState();
  const actuallyRunning = testServer !== null;

  // Se o estado salvo diz que está rodando mas não está, corrigir
  if (savedState.running && !actuallyRunning) {
    updateTestServerState(false, 502, 0);
  }

  // Se está rodando mas startTime é 0, usar o salvo
  const startTime = testStartTime || savedState.startTime;

  return NextResponse.json({
    running: actuallyRunning,
    uptime: actuallyRunning ? Date.now() - startTime : 0,
    hasClients: testServer ? testServer.hasClients() : false,
    history: testHistory.slice(-50),
    savedState: savedState,
  });
}
