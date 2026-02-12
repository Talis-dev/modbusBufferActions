"use client";

// ============================================
// COMPONENTE - MONITOR DA ESTEIRA
// ============================================

import { useEffect, useState } from "react";
import { SystemState } from "@/types";
import {
  SignalIcon,
  SignalSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { cn, formatTime } from "@/lib/utils";

export default function ConveyorMonitor() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();

      // Apenas usar dados se sistema está realmente rodando
      if (data.running && data.state) {
        setSystemState(data.state);
      } else {
        setSystemState(null);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      setSystemState(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  if (!systemState) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Sistema não conectado</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Monitor do Sistema</h2>
        <div className="flex items-center gap-2">
          {systemState.connected ? (
            <span className="flex items-center gap-2 text-green-600 font-medium">
              <SignalIcon className="w-5 h-5" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-600 font-medium">
              <SignalSlashIcon className="w-5 h-5" />
              Desconectado
            </span>
          )}
        </div>
      </div>

      {/* Status das Conexões */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={cn(
            "p-4 rounded-lg border-2",
            systemState.slaveConnected
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              Slave Pool (
              {systemState.slaveMode === "server" ? "Server" : "Client"})
            </span>
            {systemState.slaveConnected ? (
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            )}
          </div>
          <p
            className={cn(
              "text-sm mt-1",
              systemState.slaveConnected ? "text-green-600" : "text-red-600",
            )}
          >
            {systemState.slaveConnected ? "Conectado" : "Desconectado"}
          </p>
        </div>

        <div
          className={cn(
            "p-4 rounded-lg border-2",
            systemState.clpConnected
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              CLP ({systemState.clpMode === "server" ? "Server" : "Client"})
            </span>
            {systemState.clpConnected ? (
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            )}
          </div>
          <p
            className={cn(
              "text-sm mt-1",
              systemState.clpConnected ? "text-green-600" : "text-red-600",
            )}
          >
            {systemState.clpConnected ? "Conectado" : "Desconectado"}
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-gray-500">Produtos Processados</p>
          <p className="text-2xl font-bold text-green-600">
            {systemState.totalProductsProcessed}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Produtos Cancelados</p>
          <p className="text-2xl font-bold text-red-600">
            {systemState.totalProductsCancelled}
          </p>
        </div>
      </div>

      {/* Última atualização */}
      <div className="pt-2 border-t">
        <p className="text-xs text-gray-400">
          Última atualização: {formatTime(systemState.lastUpdate)}
        </p>
      </div>
    </div>
  );
}
