function divide(a, b) {
  return a / b;
}

function percentage(value, total) {
  return Math.round((value / total) * 100);
}

module.exports = { divide, percentage };
