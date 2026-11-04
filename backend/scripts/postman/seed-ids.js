/** Deterministic ids created by scripts/seed.js (same algorithm), used as Postman variables. */
const crypto = require('crypto');

const oid = (key) => crypto.createHash('md5').update(`medfind:${key}`).digest('hex').slice(0, 24);

module.exports = {
  napaId: oid('medicine:Napa'),
  zimaxId: oid('medicine:Zimax 500'),
  secloId: oid('medicine:Seclo 20'),
  ostocalId: oid('medicine:Ostocal'),
  lazzId: oid('pharmacy:lazz'),
  tamannaId: oid('pharmacy:tamanna'),
  careId: oid('pharmacy:care'),
  greenId: oid('pharmacy:green'),
  shaplaId: oid('pharmacy:shapla'),
  dhanmondiId: oid('pharmacy:dhanmondi'),
  mirpur10AreaId: oid('area:Mirpur 10'),
  lazzNapaItemId: oid('item:Lazz Pharma:Napa'),
};
