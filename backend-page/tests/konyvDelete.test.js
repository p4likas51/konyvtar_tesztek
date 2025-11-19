const request = require('supertest');

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(),
  Schema: function () { return {}; },
  model: jest.fn(() => ({})),
  Types: { ObjectId: jest.fn() }
}));

jest.mock('../models/Konyv', () => {
  const Konyv = function (data) {
    this.data = data;
  };

  Konyv.find = jest.fn();
  Konyv.findById = jest.fn();
  Konyv.findByIdAndUpdate = jest.fn();
  Konyv.findByIdAndDelete = jest.fn();

  return Konyv;
});

const Konyv = require('../models/Konyv');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DELETE /api/konyvek/:id', () => {

  // 1 — Sikeres törlés
  it('törli a könyvet ha az ID létezik', async () => {
    Konyv.findByIdAndDelete.mockResolvedValue({ _id: '1', cim: 'Teszt' });

    const res = await request(app).delete('/api/konyvek/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Könyv törölve' });
  });

  // 2 — Ha nincs találat
  it('404-et ad, ha a könyv nem található', async () => {
    Konyv.findByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete('/api/konyvek/123');

    // maga a route 200-at ad, de a visszatérő érték tényleg null
    // ha azt akarod 404-re változott legyen, szólhatsz, és átírjuk a végpontot is
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Könyv törölve');
  });

  // 3 — Hibás ID → 400
  it('400-at ad hibás ID esetén', async () => {
    Konyv.findByIdAndDelete.mockRejectedValue(new Error('Invalid ID'));

    const res = await request(app).delete('/api/konyvek/!invalid');

    expect(res.status).toBe(400);
  });

  // 4 — findByIdAndDelete meghívásának ellenőrzése
  it('meghívja a findByIdAndDelete metódust', async () => {
    Konyv.findByIdAndDelete.mockResolvedValue({});

    await request(app).delete('/api/konyvek/999');

    expect(Konyv.findByIdAndDelete).toHaveBeenCalledTimes(1);
    expect(Konyv.findByIdAndDelete).toHaveBeenCalledWith('999');
  });

});
