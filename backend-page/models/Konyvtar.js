const mongoose = require('mongoose');

const konyvtarSchema = new mongoose.Schema({
  nev: { type: String, required: true },
  varos: { type: String, required: true },
  alapitas_eve: { type: Number, required: true }
});

module.exports = mongoose.model('Konyvtar', konyvtarSchema, 'libraries');
