const request = require('supertest');

// --- mongoose mock (javított) ---
jest.mock('mongoose', () => {
  const isValidObjectId = jest.fn(
    (id) => typeof id === 'string' && id.length === 24
  );

  // Schema mock – kell, hogy legyen rajta Types.ObjectId
  const Schema = function () { return {}; };
  Schema.Types = {
    ObjectId: jest.fn()
  };

  return {
    connect: jest.fn().mockResolvedValue(),
    Schema,
    model: jest.fn(() => ({})),
    Types: {
      ObjectId: { isValid: isValidObjectId }
    },
    isValidObjectId
  };
});

// --- Konyvtar model mock ---
jest.mock('../models/Konyvtar', () => {
  const save = jest.fn();

  function Konyvtar(data) {
    this.data = data;
    this.save = save;
  }

  Konyvtar.find = jest.fn();
  Konyvtar.findById = jest.fn();
  Konyvtar.findByIdAndUpdate = jest.fn();
  Konyvtar.findByIdAndDelete = jest.fn();

  Konyvtar.__saveMock = save;

  return Konyvtar;
});

const Konyvtar = require('../models/Konyvtar');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

//
// GETALL – GET /api/konyvtarak
//
describe('GET /api/konyvtarak', () => {
  it('visszaadja az összes könyvtárat', async () => {
    Konyvtar.find.mockResolvedValue([
      { _id: '1', nev: 'Fővárosi Könyvtár', varos: 'Budapest', alapitas_eve: 1900 }
    ]);

    const res = await request(app).get('/api/konyvtarak');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nev).toBe('Fővárosi Könyvtár');
  });

  it('üres tömb esetén is működik', async () => {
    Konyvtar.find.mockResolvedValue([]);

    const res = await request(app).get('/api/konyvtarak');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('hiba esetén 500-at adjon vissza', async () => {
    Konyvtar.find.mockRejectedValue(new Error('DB hiba'));

    const res = await request(app).get('/api/konyvtarak');

    expect(res.status).toBe(500);
  });

  it('helyes JSON formátumot ad vissza', async () => {
    Konyvtar.find.mockResolvedValue([
      { _id: '1', nev: 'A Könyvtár', varos: 'B Város', alapitas_eve: 1999 }
    ]);

    const res = await request(app).get('/api/konyvtarak');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(typeof res.body[0].nev).toBe('string');
    expect(typeof res.body[0].varos).toBe('string');
    expect(typeof res.body[0].alapitas_eve).toBe('number');
  });
});

//
// GET – GET /api/konyvtarak/:id
//
describe('GET /api/konyvtarak/:id', () => {
  const validId = '507f1f77bcf86cd799439011';

  it('visszaad egy könyvtárat id alapján', async () => {
    Konyvtar.findById.mockResolvedValue({
      _id: validId,
      nev: 'X Könyvtár',
      varos: 'Y Város',
      alapitas_eve: 2000
    });

    const res = await request(app).get(`/api/konyvtarak/${validId}`);

    expect(res.status).toBe(200);
    expect(res.body.nev).toBe('X Könyvtár');
  });

  it('nem található könyvtárnál 404', async () => {
    Konyvtar.findById.mockResolvedValue(null);

    const res = await request(app).get(`/api/konyvtarak/${validId}`);

    expect(res.status).toBe(404);
  });

  it('hibás ID esetén 400', async () => {
    Konyvtar.findById.mockRejectedValue(new Error('hibás ID'));

    const res = await request(app).get('/api/konyvtarak/xxx');

    expect(res.status).toBe(400);
  });

  it('helyes adatstruktúrával tér vissza', async () => {
    Konyvtar.findById.mockResolvedValue({
      _id: validId,
      nev: 'Teszt Könyvtár',
      varos: 'Tesztváros',
      alapitas_eve: 1980
    });

    const res = await request(app).get(`/api/konyvtarak/${validId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nev');
    expect(res.body).toHaveProperty('varos');
    expect(res.body).toHaveProperty('alapitas_eve');
  });
});
