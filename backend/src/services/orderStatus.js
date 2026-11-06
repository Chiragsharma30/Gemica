// Pure order-status state machine.
const TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const CUSTOMER_CANCELLABLE = ['placed', 'confirmed'];

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { TRANSITIONS, CUSTOMER_CANCELLABLE, canTransition };
