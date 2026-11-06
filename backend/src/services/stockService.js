const Product = require('../models/Product');

// Atomically reserve stock for each line. Rolls back on failure. Returns { ok, failedSku }.
async function reserve(lines) {
  const done = [];
  for (const line of lines) {
    const res = await Product.updateOne(
      {
        _id: line.product,
        isActive: true,
        variants: { $elemMatch: { sku: line.sku, isActive: true, stock: { $gte: line.quantity } } },
      },
      { $inc: { 'variants.$.stock': -line.quantity, soldCount: line.quantity } }
    );
    if (res.modifiedCount !== 1) {
      await release(done);
      return { ok: false, failedSku: line.sku };
    }
    done.push(line);
  }
  return { ok: true };
}

async function release(lines) {
  for (const line of lines) {
    await Product.updateOne(
      { _id: line.product },
      { $inc: { 'variants.$[v].stock': line.quantity, soldCount: -line.quantity } },
      { arrayFilters: [{ 'v.sku': line.sku }] }
    );
  }
}

module.exports = { reserve, release };
