const mongoose = require('mongoose');

const konyvSchema = new mongoose.Schema({
  cim: { type: String, required: true },
  szerzo: { type: String, required: true },
  kiadas_eve: { type: Number, required: true },
  konyvtar_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Konyvtar', required: true }
});

module.exports = mongoose.model('Konyv', konyvSchema, 'books');
