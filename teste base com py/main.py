from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusIOException
import time
from collections import deque

IP_SLAVE = "192.168.5.254"  # IP do servidor Modbus Slave
PORTA_SLAVE = 504           # Porta do servidor Modbus Slave

IP_CLP = "192.168.5.25"     # IP do servidor Modbus do CLP
PORTA_CLP = 504             # Porta do servidor Modbus do CLP

TIMEOUT = 5

REGISTROS_LEITURA_SLAVE = [1, 2, 3, 4, 5, 6, 7]  # Entradas do Slave (0 ou 1)
REGISTROS_ESCRITA_CLP = [6, 7, 8, 9, 10, 11, 12]  # Saídas do CLP (0 ou 1)

# Fila de produtos por saída (uma fila para cada saída)
FILAS_PRODUTOS = {saida: deque() for saida in range(len(REGISTROS_ESCRITA_CLP))}



def ler_entradas(cliente):
    try:
        leitura = cliente.read_holding_registers(address=REGISTROS_LEITURA_SLAVE[0], count=len(REGISTROS_LEITURA_SLAVE))
        if leitura.isError():
            print("Erro ao ler entradas:", leitura)
            return []
        return leitura.registers
    except ModbusIOException as e:
        print(f"Erro de comunicação ao ler entradas: {e}")
        return []


def atualizar_saidas(cliente, saidas):
    for i, valor in enumerate(saidas):
        try:
            endereco = REGISTROS_ESCRITA_CLP[i]
            escrita = cliente.write_register(address=endereco, value=valor)
            if escrita.isError():
                print(f"Erro ao atualizar saída {endereco}: {escrita}")
            else:
                print(f"Saída {endereco} atualizada para {valor}")
        except ModbusIOException as e:
            print(f"Erro de comunicação ao atualizar saída {endereco}: {e}")


def logica_de_classificacao(entradas):

    if entradas[0] == 1:
        FILAS_PRODUTOS[1].append(time.time() + 4)
        print("Produto classificado para saída 1 (4 segundos).")

    if entradas[1] == 1:
        FILAS_PRODUTOS[2].append(time.time() + 5)
        print("Produto classificado para saída 2 (5 segundos).")
        
    if entradas[2] == 1:        
        FILAS_PRODUTOS[3].append(time.time() + 5)
        print("Produto classificado para saída 3 (5 segundos).")

    if entradas[3] == 1:        
        FILAS_PRODUTOS[4].append(time.time() + 5)
        print("Produto classificado para saída 4 (5 segundos).")
        
    if entradas[4] == 1:        
        FILAS_PRODUTOS[5].append(time.time() + 5)
        print("Produto classificado para saída 5 (5 segundos).")        
        
    if entradas[5] == 1:        
        FILAS_PRODUTOS[6].append(time.time() + 5)
        print("Produto classificado para saída 6 (5 segundos).")

def logica_de_controle(saidas):
    """
    Verifica as filas de produtos e ativa as saídas no momento correto.
    """
    tempo_atual = time.time()

    for saida, fila in FILAS_PRODUTOS.items():
        if fila and fila[0] <= tempo_atual:
            # Ativa a saída correspondente
            saidas[saida] = 1
            print(f"Saída {saida + 1} ativada para liberar produto!")
            fila.popleft()  # Remove o produto da fila
        else:
            # Garante que a saída está desativada caso não haja produto
            saidas[saida] = 0

    return saidas


def sincronizar_modbus():
    cliente_slave = ModbusTcpClient(IP_SLAVE, port=PORTA_SLAVE, timeout=TIMEOUT)
    cliente_clp = ModbusTcpClient(IP_CLP, port=PORTA_CLP, timeout=TIMEOUT)

    if cliente_slave.connect() and cliente_clp.connect():
        print("Conectado ao Slave e ao CLP!")
        saidas = [0] * len(REGISTROS_ESCRITA_CLP)

        try:
            while True:
                # Ler entradas do Slave
                entradas = ler_entradas(cliente_slave)
                if not entradas:
                    continue

                print(f"Entradas lidas: {entradas}")

                # Classificar produtos
                logica_de_classificacao(entradas)

                # Atualizar lógica de controle (ativar/desativar saídas)
                saidas = logica_de_controle(saidas)

                # Enviar saídas para o CLP
                atualizar_saidas(cliente_clp, saidas)

                time.sleep(0.3)

        except KeyboardInterrupt:
            print("\nEncerrando sincronização...")
        finally:
            cliente_slave.close()
            cliente_clp.close()
            print("Conexão encerrada.")
    else:
        print("Não foi possível conectar ao Slave ou ao CLP!")


if __name__ == "__main__":
    sincronizar_modbus()
