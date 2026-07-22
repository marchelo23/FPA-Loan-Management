#!/bin/bash

# test-api.sh - Script para probar ABSOLUTAMENTE TODOS los endpoints de la API

API_URL="http://localhost:3000"

echo "========================================================="
echo "🧪 INICIANDO PRUEBAS EXHAUSTIVAS DE LA API"
echo "========================================================="

if ! command -v jq &> /dev/null; then
    echo "❌ 'jq' no está instalado. Instálalo con: sudo apt install jq"
    exit 1
fi

RAND_ID=$RANDOM

echo -e "\n1️⃣ AUTENTICACIÓN Y ROLES"
curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{
    "username": "superadmin'$RAND_ID'",
    "password": "Password123!",
    "fullName": "Super Administrador",
    "role": "admin"
  }' > /dev/null

echo ">> POST /auth/login (Login Admin)"
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{
    "username": "superadmin'$RAND_ID'",
    "password": "Password123!"
  }' | jq -r '.access_token')
echo "Token obtenido."

echo ">> GET /auth/profile (Perfil del Admin)"
curl -s -X GET "$API_URL/auth/profile" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{username, role}'

echo ">> POST /auth/create-user (Crear Analista)"
ANALYST_ID=$(curl -s -X POST "$API_URL/auth/create-user" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{
    "username": "analyst'$RAND_ID'",
    "password": "Password123!",
    "fullName": "Analista Juan",
    "role": "credit_analyst"
  }' | jq -r '.id')
echo "Analista Creado ID: $ANALYST_ID"


echo -e "\n2️⃣ GESTIÓN DE CLIENTES"
echo ">> POST /clients (Crear Cliente 1 - Principal)"
CLIENT_1_ID=$(curl -s -X POST "$API_URL/clients" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{
    "identificationNumber": "1000'$RAND_ID'",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan'$RAND_ID'@correo.com",
    "phone": "0991234567",
    "address": "Calle Falsa 123"
  }' | jq -r '.id')

echo ">> POST /clients (Crear Cliente 2 - Para pruebas de rechazo)"
CLIENT_2_ID=$(curl -s -X POST "$API_URL/clients" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{
    "identificationNumber": "2000'$RAND_ID'",
    "firstName": "María",
    "lastName": "Gómez",
    "email": "maria'$RAND_ID'@correo.com"
  }' | jq -r '.id')

echo ">> GET /clients (Listar Clientes)"
curl -s -X GET "$API_URL/clients" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Total clientes: \(.)"'

echo ">> GET /clients/:id (Ver Cliente 1)"
curl -s -X GET "$API_URL/clients/$CLIENT_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{id, firstName}'

echo ">> GET /clients/identification/:id (Buscar Cliente 1 por Cédula)"
curl -s -X GET "$API_URL/clients/identification/1000$RAND_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{id, identificationNumber}'

echo ">> PUT /clients/:id (Actualizar Cliente 1)"
curl -s -X PUT "$API_URL/clients/$CLIENT_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"address": "Nueva Dirección 456"}' | jq '{address}'

echo ">> PUT /clients/:id/credit-score (Actualizar Score Cliente 1 a 850)"
curl -s -X PUT "$API_URL/clients/$CLIENT_1_ID/credit-score" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"score": 850}' | jq '{creditScore}'

echo ">> PUT /clients/:id/credit-limit (Actualizar Límite Cliente 1 a $20k)"
curl -s -X PUT "$API_URL/clients/$CLIENT_1_ID/credit-limit" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"limit": 20000}' | jq '{creditLimit}'

echo ">> DELETE /clients/:id (Desactivar Cliente 2)"
curl -s -X DELETE "$API_URL/clients/$CLIENT_2_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{isActive}'

echo ">> PUT /clients/:id (Re-activar Cliente 2 para préstamos)"
curl -s -X PUT "$API_URL/clients/$CLIENT_2_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"isActive": true, "creditLimit": 5000}' > /dev/null


echo -e "\n3️⃣ SIMULACIÓN Y SOLICITUD DE PRÉSTAMOS"
echo ">> POST /loans/simulate (Simular Préstamo)"
curl -s -X POST "$API_URL/loans/simulate" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"amount": 5000,"annualInterestRate": 15,"termMonths": 12}' | jq '{monthlyPayment, totalAmount}'

echo ">> POST /loans (Solicitar Préstamo 1 - Cliente 1)"
LOAN_1_ID=$(curl -s -X POST "$API_URL/loans" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"clientId": "'$CLIENT_1_ID'","amount": 5000,"annualInterestRate": 15,"termMonths": 12}' | jq -r '.id')

echo ">> POST /loans (Solicitar Préstamo 2 - Cliente 2)"
LOAN_2_ID=$(curl -s -X POST "$API_URL/loans" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"clientId": "'$CLIENT_2_ID'","amount": 1000,"annualInterestRate": 10,"termMonths": 6}' | jq -r '.id')


echo -e "\n4️⃣ EVALUACIÓN, APROBACIÓN Y DESEMBOLSO"
echo ">> PUT /loans/:id/reject (Rechazar Préstamo 2)"
curl -s -X PUT "$API_URL/loans/$LOAN_2_ID/reject" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"reason": "Poco historial crediticio"}' | jq '{status, rejectedReason}'

echo ">> PUT /loans/:id/approve (Aprobar Préstamo 1)"
curl -s -X PUT "$API_URL/loans/$LOAN_1_ID/approve" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"approvedBy": "superadmin"}' | jq '{status}'

echo ">> PUT /loans/:id/disburse (Desembolsar Préstamo 1)"
curl -s -X PUT "$API_URL/loans/$LOAN_1_ID/disburse" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" | jq '{status}'

echo ">> PUT /loans/:id/update-status (Actualizar Estado del Préstamo 1 tras tiempo simulado)"
curl -s -X PUT "$API_URL/loans/$LOAN_1_ID/update-status" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" | jq '{status, daysOverdue}'

echo ">> GET /loans/:id/late-interest (Consultar interés moratorio)"
curl -s -X GET "$API_URL/loans/$LOAN_1_ID/late-interest" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .


echo -e "\n5️⃣ CONSULTAS DE PRÉSTAMOS"
echo ">> GET /loans (Listar Todos los Préstamos)"
curl -s -X GET "$API_URL/loans" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Total préstamos: \(.)"'

echo ">> GET /loans/:id (Ver Préstamo 1)"
curl -s -X GET "$API_URL/loans/$LOAN_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{id, status}'

echo ">> GET /loans/client/:id (Préstamos del Cliente 1)"
curl -s -X GET "$API_URL/loans/client/$CLIENT_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Préstamos Cliente 1: \(.)"'


echo -e "\n6️⃣ PAGOS"
echo ">> GET /payments/loan/:id/account-status (Estado de Cuenta)"
curl -s -X GET "$API_URL/payments/loan/$LOAN_1_ID/account-status" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{totalOutstanding, pendingInstallments}'

echo ">> POST /payments (Abonar \$500)"
PAYMENT_ID=$(curl -s -X POST "$API_URL/payments" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"loanId": "'$LOAN_1_ID'","amount": 500,"notes": "Abono a capital"}' | jq -r '.id')
echo "Pago realizado con ID: $PAYMENT_ID"

echo ">> GET /payments/:id (Consultar Recibo de Pago)"
curl -s -X GET "$API_URL/payments/$PAYMENT_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{amount, paymentType}'

echo ">> GET /payments/loan/:id (Historial de Pagos del Préstamo 1)"
curl -s -X GET "$API_URL/payments/loan/$LOAN_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Pagos realizados: \(.)"'

echo ">> GET /payments (Todos los pagos del sistema)"
curl -s -X GET "$API_URL/payments" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Total pagos en BD: \(.)"'


echo -e "\n7️⃣ REPORTES GERENCIALES"
echo ">> GET /reports/portfolio-summary (Resumen del Portafolio)"
curl -s -X GET "$API_URL/reports/portfolio-summary" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo ">> GET /reports/overdue-portfolio (Cartera en Mora)"
curl -s -X GET "$API_URL/reports/overdue-portfolio" -H "Authorization: Bearer $ADMIN_TOKEN" | jq 'length | "Préstamos en mora: \(.)"'

echo ">> GET /reports/client/:id (Portafolio del Cliente 1)"
curl -s -X GET "$API_URL/reports/client/$CLIENT_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{totalLoans, activeLoans, totalOutstandingPrincipal}'

echo ">> GET /reports/payment-history/:loanId (Historial Analítico del Préstamo 1)"
curl -s -X GET "$API_URL/reports/payment-history/$LOAN_1_ID" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo "========================================================="
echo "🎉 PRUEBAS FINALIZADAS CON ÉXITO"
echo "========================================================="
