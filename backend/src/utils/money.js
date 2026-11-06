// Money helpers. Amounts are INR numbers rounded to 2 decimals.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const toPaise = (n) => Math.round(Number(n) * 100);
module.exports = { round2, toPaise };
