/**
 * Script de test pour simuler les webhooks de remboursement Stripe
 * Utilisez ce script pour tester la gestion des remboursements
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:2024/api';

// Simulation d'un webhook de remboursement créé
async function testRefundCreated() {
  const webhookPayload = {
    id: 'evt_test_refund_created',
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 're_test_refund_123',
        object: 'refund',
        amount: 5000, // 50€ en centimes
        currency: 'eur',
        payment_intent: 'pi_test_payment_intent_123', // Remplacer par un vrai payment_intent
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000)
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test_123',
      idempotency_key: null
    },
    type: 'refund.created'
  };

  try {
    console.log('🔄 Test du webhook refund.created...');
    const response = await axios.post(`${API_BASE_URL}/payments/webhook`, webhookPayload, {
      headers: {
        'stripe-signature': 'test_signature',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Webhook refund.created traité:', response.data);
  } catch (error) {
    console.error('❌ Erreur lors du test refund.created:', error.response?.data || error.message);
  }
}

// Simulation d'un webhook de remboursement complété
async function testRefundCompleted() {
  const webhookPayload = {
    id: 'evt_test_refund_completed',
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'ch_test_charge_123',
        object: 'charge',
        amount: 5000,
        currency: 'eur',
        payment_intent: 'pi_test_payment_intent_123', // Remplacer par un vrai payment_intent
        refunded: true,
        refunds: {
          data: [{
            id: 're_test_refund_123',
            amount: 5000,
            status: 'succeeded'
          }]
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test_456',
      idempotency_key: null
    },
    type: 'charge.refunded'
  };

  try {
    console.log('✅ Test du webhook charge.refunded...');
    const response = await axios.post(`${API_BASE_URL}/payments/webhook`, webhookPayload, {
      headers: {
        'stripe-signature': 'test_signature',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Webhook charge.refunded traité:', response.data);
  } catch (error) {
    console.error('❌ Erreur lors du test charge.refunded:', error.response?.data || error.message);
  }
}

// Test de l'API de visualisation des emails
async function testMailPreview() {
  try {
    console.log('📧 Test de l\'API de visualisation des emails...');
    const response = await axios.get(`${API_BASE_URL}/mail-test/preview`);
    console.log('✅ Emails récupérés:', response.data);
  } catch (error) {
    console.error('❌ Erreur lors du test mail preview:', error.response?.data || error.message);
  }
}

// Test d'envoi d'email de test
async function testSendEmail() {
  const emailData = {
    to: 'test@example.com',
    subject: 'Test de remboursement',
    message: 'Ceci est un test de remboursement via webhook Stripe.'
  };

  try {
    console.log('📤 Test d\'envoi d\'email...');
    const response = await axios.post(`${API_BASE_URL}/mail-test/send-test`, emailData);
    console.log('✅ Email envoyé:', response.data);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi d\'email:', error.response?.data || error.message);
  }
}

// Fonction principale
async function runTests() {
  console.log('🚀 Démarrage des tests de remboursement Stripe...\n');
  
  await testMailPreview();
  console.log('');
  
  await testSendEmail();
  console.log('');
  
  await testRefundCreated();
  console.log('');
  
  await testRefundCompleted();
  console.log('');
  
  console.log('✅ Tous les tests terminés !');
}

// Exécution des tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testRefundCreated,
  testRefundCompleted,
  testMailPreview,
  testSendEmail
}; 