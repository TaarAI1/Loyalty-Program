// ============================================================
// PATCH: button-hook.js  —  WhatsApp Transaction Receipt PDF
// Apply inside ButtonHooksManager.addHandler(['before_navPosTenderUpdateOnly'], ...)
// ============================================================
//
// STEP A ─ Add this function alongside buildItemsArray, postEarnTransaction, etc.
// ─────────────────────────────────────────────────────────────────────────────
//
// ── Step 5: Send WhatsApp Receipt (fire-and-forget) ──────────────────────────
function sendReceiptViaBackend(token, doc, items) {
  var phone = doc.bt_primary_phone_no || '';
  if (!phone) {
    console.log("No customer phone — skipping WhatsApp receipt");
    return;
  }

  var receiptItems = items.map(function (item) {
    return {
      name:      item.description || '',
      qty:       item.qty         || 0,
      unitPrice: item.unit_price  || 0,
      total:     item.total_price || 0
    };
  });

  $http({
    method: 'POST',
    url: LOYALTY_API_URL + '/api/configuration/whatsapp/send-receipt',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + token
    },
    data: {
      to:            phone,
      customerName:  ((doc.bt_first_name || '') + ' ' + (doc.bt_last_name || '')).trim(),
      storeName:     doc.store_name || session.store_name || '',
      transactionNo: doc.document_no || doc.receipt_no || String(doc.sid || ''),
      date:          doc.created_datetime || new Date().toISOString(),
      items:         receiptItems,
      subtotal:      (doc.transaction_total_amt - doc.transaction_total_tax_amt) || 0,
      discount:      doc.manual_disc_value || 0,
      tax:           doc.transaction_total_tax_amt || 0,
      gross:         doc.transaction_total_amt || 0
    }
  }).then(function () {
    console.log("WhatsApp receipt sent successfully to:", phone);
  }).catch(function (err) {
    // Fire-and-forget — log but never block the transaction
    console.error("WhatsApp receipt failed (non-blocking):", err);
  });
}
//
// ─────────────────────────────────────────────────────────────────────────────
//
// STEP B ─ In the earn-transaction success block, capture the token and call
//          sendReceiptViaBackend.  Find this EXISTING block in your file:
//
//   authenticateLoyaltyPro().then(function (token) {
//     return postEarnTransaction(token, earnPayload);
//   }).then(function (response) {
//     var msg = ...
//     Toast.Success('Loyalty Points', msg);
//     ...
//
//  Change it to:
// ─────────────────────────────────────────────────────────────────────────────
//
var receiptToken = null; // add this at the top of the handler (with the other var declarations)

authenticateLoyaltyPro().then(function (token) {
  receiptToken = token; // capture for receipt use
  return postEarnTransaction(token, earnPayload);
}).then(function (response) {

  var msg = (response && response.message) ? response.message : 'Loyalty points earned successfully';
  Toast.Success('Loyalty Points', msg);

  // ── Fire-and-forget WhatsApp receipt ─────────────────────────
  sendReceiptViaBackend(receiptToken, doc, buildItemsArray(doc.items || []));
  // ─────────────────────────────────────────────────────────────

  if (KIOSK_DEVICE_CODE) {
    showFeedbackDialog().then(function () { deferred.resolve(); });
  } else {
    deferred.resolve();
  }

}).catch(function (error) {
  console.error("Loyalty flow failed:", error);
  var msg = (error.data && error.data.message) ? error.data.message : 'Failed to process loyalty points';
  Toast.Error('Loyalty', msg);
  deferred.reject(error);
});
