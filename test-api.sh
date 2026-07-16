#!/bin/bash

# test-api.sh - Script para probar todo el ciclo de vida del préstamo vía cURL

API_URL="http://localhost:3000"

echo "========================================================="
echo "🧪 INICIANDO PRUEBAS DE LA API DE PRÉSTAMOS"
echo "========================================================="

# Verificar si jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ 'jq' no está instalado. Instálalo con: sudo apt install jq"
    exit 1
fi

echo -e "\n1️⃣ AUTENTICACIÓN Y ROLES"
echo "Registrando Administrador..."
curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "Password123!",
    "fullName": "Super Administrador",
    "role": "admin"
  }' > /dev/null

echo "Iniciando sesión como Administrador..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "Password123!"
  }' | jq -r '.access_token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Fallo al iniciar sesión. ¿Está la API corriendo en $API_URL?"
    exit 1
fi
echo "✅ Token de Administrador obtenido."


echo -e "\n2️⃣ CREACIÓN DE CLIENTE"
# Usamos un número aleatorio para la identificación para no chocar si se corre múltiples veces
RAND_ID=$RANDOM
CLIENT_ID=$(curl -s -X POST "$API_URL/clients" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "identificationNumber": "1000'$RAND_ID'",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan'$RAND_ID'@correo.com",
    "phone": "0991234567",
    "address": "Calle Falsa 123",
    "creditScore": 850,
    "creditLimit": 15000
  }' | jq -r '.id')

echo "✅ Cliente Creado con ID: $CLIENT_ID"


echo -e "\n3️⃣ CREACIÓN Y SIMULACIÓN DE PRÉSTAMO"
echo "Simulando Préstamo de $5000 a 12 meses..."
curl -s -X POST "$API_URL/loans/simulate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "annualInterestRate": 15,
    "termMonths": 12
  }' | jq '{monthlyPayment, totalAmount, totalInterest}'

echo "Solicitando Préstamo..."
LOAN_ID=$(curl -s -X POST "$API_URL/loans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'$CLIENT_ID'",
    "amount": 5000,
    "annualInterestRate": 15,
    "termMonths": 12
  }' | jq -r '.id')

echo "✅ Préstamo Solicitado con ID: $LOAN_ID"


echo -e "\n4️⃣ APROBACIÓN Y DESEMBOLSO DE PRÉSTAMO"
echo "Aprobando el Préstamo..."
curl -s -X PUT "$API_URL/loans/$LOAN_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "superadmin"}' | jq '{status, approvedBy}'

echo "Desembolsando el Préstamo..."
curl -s -X PUT "$API_URL/loans/$LOAN_ID/disburse" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '{status, disbursementDate}'


echo -e "\n5️⃣ PAGOS Y AMORTIZACIÓN"
echo "Estado de Cuenta Actual:"
curl -s -X GET "$API_URL/payments/loan/$LOAN_ID/account-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{totalOutstanding, pendingInstallments, nextPayment}'

echo "Realizando un Pago Parcial de $500..."
curl -s -X POST "$API_URL/payments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loanId": "'$LOAN_ID'",
    "amount": 500,
    "notes": "Pago adelantado del cliente"
  }' | jq '{amount, principalApplied, interestApplied, paymentType}'

echo "Verificando Nuevo Estado de Cuenta:"
curl -s -X GET "$API_URL/payments/loan/$LOAN_ID/account-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{totalOutstanding, paidInstallments, pendingInstallments}'


echo -e "\n6️⃣ REPORTES"
echo "Reporte Resumen del Portafolio de la Empresa:"
curl -s -X GET "$API_URL/reports/portfolio-summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

echo "========================================================="
echo "🎉 PRUEBAS FINALIZADAS CON ÉXITO"
echo "========================================================="
