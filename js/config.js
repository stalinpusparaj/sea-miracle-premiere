/*
 * Sea Miracle Premiere AR — event configuration.
 * Edit this file before the screening; nothing else needs to change.
 */
window.SM_CONFIG = {
  // Sales WhatsApp number in international format, digits only (e.g. '919876543210').
  // REQUIRED before the event: leads open a WhatsApp chat with this number.
  whatsappNumber: '33766901866',   // +33 7 66 90 18 66

  // Shown on the splash screen and inside WhatsApp messages.
  eventName: 'Sea Miracle Premiere',

  // Text on the Premiere Partner Pass that unlocks after all 5 stars.
  // Confirm the actual offer with Sea Miracle before the event.
  passOffer: 'Show this pass to the Sea Miracle team to claim your premiere partner offer.',

  // Profit calculator defaults (owners change these with sliders; all figures are their own estimates).
  calculator: {
    clients: 60,        // pedicure clients per month
    uptake: 40,         // % who add the Heel Peel ritual
    price: 900,         // add-on price charged to the client (₹)
    cost: 150,          // product + consumables per treatment (₹) — owner's estimate
    retail: 8,          // retail bottles sold per month
    margin: 250,        // margin per retail bottle (₹)
  },
};
