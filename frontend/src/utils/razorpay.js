import { payments } from '../api';

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(s);
  });
}

// Opens Razorpay for an existing order. The server creates the payment and verifies the result;
// the browser callback alone never marks anything as paid.
export async function payForOrder(order, user) {
  const p = await payments.create(order._id);
  if (!p.keyId) throw new Error('Online payments are not available right now. Please choose Cash on Delivery.');
  await loadScript();
  const response = await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: p.keyId, amount: p.amount, currency: p.currency, order_id: p.providerOrderId, name: 'Gemica',
      description: `Order ${p.orderNumber}`, prefill: { name: user?.name, email: user?.email }, theme: { color: '#B8923A' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment was cancelled. You can pay again from your order page.')) },
    });
    rzp.on('payment.failed', () => reject(new Error('Payment failed. You can try again from your order page.')));
    rzp.open();
  });
  return payments.verify({
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature,
  });
}
