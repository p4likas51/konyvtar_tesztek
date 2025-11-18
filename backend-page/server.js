require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Konyv = require('./models/Konyv');
const Konyvtar = require('./models/Konyvtar');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Atlas kapcsolódás
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Kapcsolódva a MongoDB Atlas-hoz'))
  .catch(err => console.error('❌ Hiba a kapcsolódáskor:', err));

// -----------------
// 📚 KÖNYV CRUD
// -----------------

// CREATE
app.post('/api/konyvek', async (req, res) => {
  try {
    const konyv = new Konyv(req.body);
    await konyv.save();
    res.status(201).json(konyv);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// READ – összes könyv
app.get('/api/konyvek', async (req, res) => {
  const konyvek = await Konyv.find().populate('konyvtar_id');
  res.json(konyvek);
});

// READ – egy könyv
app.get('/api/konyvek/:id', async (req, res) => {
  try {
    const konyv = await Konyv.findById(req.params.id).populate('konyvtar_id');
    if (!konyv) return res.status(404).json({ message: 'Könyv nem található' });
    res.json(konyv);
  } catch {
    res.status(400).json({ message: 'Hibás ID' });
  }
});

// UPDATE
app.put('/api/konyvek/:id', async (req, res) => {
  try {
    const konyv = await Konyv.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(konyv);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
app.delete('/api/konyvek/:id', async (req, res) => {
  try {
    await Konyv.findByIdAndDelete(req.params.id);
    res.json({ message: 'Könyv törölve' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// -----------------
// 🏛️ KÖNYVTÁR CRUD
// -----------------

// CREATE
app.post('/api/konyvtarak', async (req, res) => {
  try {
    const konyvtar = new Konyvtar(req.body);
    await konyvtar.save();
    res.status(201).json(konyvtar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// READ – összes könyvtár
app.get('/api/konyvtarak', async (req, res) => {
  const konyvtarak = await Konyvtar.find();
  res.json(konyvtarak);
});

// READ – egy könyvtár
app.get('/api/konyvtarak/:id', async (req, res) => {
  try {
    const konyvtar = await Konyvtar.findById(req.params.id);
    if (!konyvtar) return res.status(404).json({ message: 'Könyvtár nem található' });
    res.json(konyvtar);
  } catch {
    res.status(400).json({ message: 'Hibás ID' });
  }
});

// UPDATE
app.put('/api/konyvtarak/:id', async (req, res) => {
  try {
    const konyvtar = await Konyvtar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(konyvtar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
app.delete('/api/konyvtarak/:id', async (req, res) => {
  try {
    await Konyvtar.findByIdAndDelete(req.params.id);
    res.json({ message: 'Könyvtár törölve' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// -----------------
// Szerver indítása
// -----------------

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🌍 Szerver fut a http://localhost:${PORT} címen`);
  });
}

module.exports = app;;
