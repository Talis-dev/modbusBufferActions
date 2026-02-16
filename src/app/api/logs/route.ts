// ============================================
// API DE LEITURA DE LOGS DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { systemLogger } from "@/lib/system-logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const source = searchParams.get("source") || "memory"; // memory ou file

    if (source === "file") {
      if (!date) {
        // Retorna lista de datas disponíveis
        const availableDates = systemLogger.getAvailableDates();
        return NextResponse.json({
          success: true,
          dates: availableDates,
        });
      }

      // Lê logs de um arquivo específico
      const [year, month, day] = date.split("-").map(Number);
      const targetDate = new Date(year, month - 1, day);
      const logs = systemLogger.readLogsFromFile(targetDate);

      return NextResponse.json({
        success: true,
        date,
        count: logs.length,
        logs,
      });
    } else {
      // Retorna logs em memória (últimos 1000)
      const logs = systemLogger.getLogs();

      return NextResponse.json({
        success: true,
        source: "memory",
        count: logs.length,
        logs,
      });
    }
  } catch (error: any) {
    console.error("[API] Erro ao buscar logs:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar logs" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    systemLogger.clearLogs();
    return NextResponse.json({
      success: true,
      message: "Logs em memória limpos com sucesso",
    });
  } catch (error: any) {
    console.error("[API] Erro ao limpar logs:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao limpar logs" },
      { status: 500 },
    );
  }
}
