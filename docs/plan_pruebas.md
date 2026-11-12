# Plan de Pruebas Manuales - Botica Nova Salud

| ID Prueba | Módulo / Componente | Descripción de la Prueba | Resultado Esperado | Resultado Real | Estado |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **P-01** | Autenticación | Iniciar sesión con credenciales correctas de administrador. | Acceso concedido al panel principal de stock y ventas. | El sistema redirige al dashboard correctamente. | **ÉXITO** |
| **P-02** | Inventario | Registrar la entrada de 20 unidades de un medicamento. | El stock total se incrementa de forma automática en la base de datos. | El stock se actualiza en tiempo real. | **ÉXITO** |
| **P-03** | Alertas de Stock | Consultar un producto con stock menor al mínimo. | La interfaz muestra una etiqueta visual de alerta (Stock Bajo). | Muestra alerta de advertencia. | **ÉXITO** |
| **P-04** | Ventas | Registrar una venta de 3 productos descontando las existencias. | El stock disminuye exactamente y genera comprobante. | Inventario descontado con éxito. | **ÉXITO** |
| **P-05** | Resiliencia (Backend Apagado) | Intentar realizar una consulta con el backend apagado. | El frontend muestra un mensaje claro de error de conexión sin colapsar. | Muestra mensaje de "Error de conexión". | **ÉXITO** |
