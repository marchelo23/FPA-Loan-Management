# Flujo del Sistema de Gestión de Préstamos

A continuación se detalla el ciclo de vida principal (Core Lifecycle) y el flujo de los datos dentro del sistema, desde la creación de un cliente hasta la liquidación del préstamo.

## Diagrama de Flujo Principal

```mermaid
flowchart TD
    %% Usuarios y Roles
    Admin([Administrador / Analista])
    
    %% Módulo de Clientes
    subgraph Gestión de Clientes
        A1[Registro de Cliente] --> A2{Validación}
        A2 -->|Aprobado| A3[Cliente Activo]
    end
    
    Admin -->|Crea Perfil| A1
    
    %% Módulo de Préstamos
    subgraph Ciclo de Vida del Préstamo
        B1(Simulación de Cuotas) --> B2(Solicitud: REQUESTED)
        B2 --> B3{Decisión Crediticia}
        
        B3 -->|Rechazar| B4[Estado: REJECTED]
        B3 -->|Aprobar| B5[Estado: APPROVED]
        
        B5 -->|Desembolso| B6[Estado: DISBURSED]
        B6 --> B7[Generación: Tabla de Amortización]
    end
    
    A3 -->|Solicita Préstamo| B1
    
    %% Módulo de Pagos y Mora
    subgraph Pagos y Amortización
        C1{Monitoreo de Fechas}
        C2[Estado: IN_MORA]
        C3[Cálculo de Interés Moratorio]
        
        C4[Ingreso de Pago Parcial/Total]
        C5{¿Cubre toda la deuda?}
        C6[Actualizar Cuotas y Saldo]
        C7[Estado: LIQUIDATED]
    end
    
    B7 --> C1
    B7 --> C4
    
    %% Lógica de Mora
    C1 -->|Pasa fecha de pago| C2
    C2 --> C3
    C3 -.-> C4
    
    %% Lógica de Pagos
    C4 --> C5
    C5 -->|No| C6
    C6 -.-> C1
    C5 -->|Sí| C7
```

## Fases del Proceso:

1. **Gestión de Clientes:** Todo proceso comienza cuando un miembro del personal registra un nuevo cliente verificando su Buró de Crédito y estableciendo su Límite Crediticio.
2. **Ciclo del Préstamo:** Se puede utilizar un endpoint de simulación para ver cómo quedarán las cuotas mensuales (usando la fórmula de amortización francesa). Una vez se está conforme, el préstamo pasa a estado **REQUESTED**. Un Analista lo evalúa y puede cambiar su estado a **APPROVED** o **REJECTED**.
3. **Desembolso:** Cuando se entrega el dinero físico/transferencia al cliente, el préstamo se marca como **DISBURSED**. En este instante la Base de Datos automáticamente genera las cuotas con sus fechas de vencimiento.
4. **Cobros y Liquidación:** A partir del desembolso, el sistema espera recibir pagos a través del registro en caja. Cada pago descuenta en orden de prioridad: *Intereses de Mora, Intereses Ordinarios y finalmente el Capital principal*. Si se vence el tiempo, el estado del préstamo cambia a **IN_MORA**. Cuando todo el capital se cancela, pasa exitosamente a **LIQUIDATED**.
