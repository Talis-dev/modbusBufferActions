"use client";

// ============================================
// COMPONENTE - PAINEL DE CONFIGURAÇÃO
// ============================================

import { useState, useEffect } from "react";
import { SystemConfig, OutputConfig } from "@/types";
import {
  CogIcon,
  ArrowPathIcon,
  CheckIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ConfigPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Configuração salva com sucesso!");
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    if (!confirm("Resetar para configuração padrão?")) return;

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
      });

      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        alert("Configuração resetada!");
      }
    } catch (error: any) {
      alert(`Erro ao resetar: ${error.message}`);
    }
  };

  if (loading || !config) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CogIcon className="w-6 h-6" />
          Configuração do Sistema
        </h2>
        <div className="flex gap-2">
          <Link
            href="/test-clp"
            className="px-4 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
          >
            <BeakerIcon className="w-4 h-4" />
            Teste CLP
          </Link>
          <button
            onClick={resetConfig}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Resetar
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckIcon className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Conexões Modbus */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Conexões Modbus
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP do Slave
              </label>
              <input
                type="text"
                value={config.slaveIp}
                onChange={(e) =>
                  setConfig({ ...config, slaveIp: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta do Slave
              </label>
              <input
                type="number"
                value={config.slavePort}
                onChange={(e) =>
                  setConfig({ ...config, slavePort: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP do CLP
              </label>
              <input
                type="text"
                value={config.clpIp}
                onChange={(e) =>
                  setConfig({ ...config, clpIp: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta do CLP
              </label>
              <input
                type="number"
                value={config.clpPort}
                onChange={(e) =>
                  setConfig({ ...config, clpPort: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Configurações da Esteira */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Esteira</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprimento (m)
              </label>
              <input
                type="number"
                value={config.conveyorLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    conveyorLength: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocidade (m/s)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.conveyorSpeed}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    conveyorSpeed: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciclo de Leitura (ms)
              </label>
              <input
                type="number"
                value={config.readCycleMs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    readCycleMs: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Saídas */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Saídas Laterais
          </h3>
          <div className="grid grid-cols-8 gap-3 mb-2 text-xs font-semibold text-gray-600 px-3">
            <div>Nome</div>
            <div>Delay (s)</div>
            <div>Tolerância (s)</div>
            <div>Pulso (ms)</div>
            <div>Coil Entrada</div>
            <div>Coil Saída</div>
            <div>Motor Ativo (ms)</div>
            <div className="text-center">Ativo</div>
          </div>
          <div className="space-y-3">
            {config.outputs.map((output, index) => (
              <OutputConfigRow
                key={output.id}
                output={output}
                onChange={(updated) => {
                  const newOutputs = [...config.outputs];
                  newOutputs[index] = updated;
                  setConfig({ ...config, outputs: newOutputs });
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function OutputConfigRow({
  output,
  onChange,
}: {
  output: OutputConfig;
  onChange: (output: OutputConfig) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <input
          type="text"
          value={output.name}
          onChange={(e) => onChange({ ...output, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Nome"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.delayTime}
          onChange={(e) =>
            onChange({ ...output, delayTime: parseFloat(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Delay"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.toleranceTime}
          onChange={(e) =>
            onChange({ ...output, toleranceTime: parseFloat(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Tolerância"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.pulseDuration}
          onChange={(e) =>
            onChange({ ...output, pulseDuration: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-yellow-50"
          placeholder="Pulso"
          title="Duração do pulso de saída em milissegundos"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.inputAddress}
          onChange={(e) =>
            onChange({ ...output, inputAddress: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50"
          placeholder="Entrada"
          title="Coil que RECEBE pulsos (1-6)"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.outputAddress}
          onChange={(e) =>
            onChange({ ...output, outputAddress: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-green-50"
          placeholder="Saída"
          title="Coil que ENVIA pulsos ao CLP (6-11)"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.activeEngineDuration}
          onChange={(e) =>
            onChange({ ...output, activeEngineDuration: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-orange-50"
          placeholder="Motor"
          title="Tempo que o motor ficará ativo (ms) - escrito em holding register para CLP ler"
        />
      </div>
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={output.enabled}
          onChange={(e) => onChange({ ...output, enabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded"
        />
      </div>
    </div>
  );
}
