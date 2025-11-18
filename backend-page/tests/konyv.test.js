const request = require('supertest');

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(),
  Schema: function () { return {}; },
  model: jest.fn(() => ({})),
  Types: { ObjectId: jest.fn() }
}));

jest.mock('../models/Konyv', () => {
  const save = jest.fn();

  function Konyv(data) {
    this.data = data;
    this.save = save;
  }

  Konyv.find = jest.fn();
  Konyv.findById = jest.fn();
  Konyv.findByIdAndUpdate = jest.fn();
  Konyv.findByIdAndDelete = jest.fn();

  Konyv.__saveMock = save;

  return Konyv;
});

const Konyv = require('../models/Konyv');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/konyvek', () => {
  it('visszaadja az összes könyvet', async () => {
    const populateMock = jest.fn().mockResolvedValue([
      { _id: '1', cim: 'Teszt könyv', szerzo: 'Teszt Szerző' }
    ]);
    Konyv.find.mockReturnValue({ populate: populateMock });

    const res = await request(app).get('/api/konyvek');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].cim).toBe('Teszt könyv');
  });

  it('üres tömb esetén is működik', async () => {
    const populateMock = jest.fn().mockResolvedValue([]);

    Konyv.find.mockReturnValue({ populate: populateMock });

    const res = await request(app).get('/api/konyvek');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('hiba esetén 500-at adjon vissza', async () => {
    const populateMock = jest.fn().mockRejectedValue(new Error('DB hiba'));

    Konyv.find.mockReturnValue({ populate: populateMock });

    const res = await request(app).get('/api/konyvek');

    expect(res.status).toBe(500);
  });

  it('helyes JSON formátumot ad vissza', async () => {
    const populateMock = jest.fn().mockResolvedValue([
      { _id: '1', cim: 'A', szerzo: 'B' }
    ]);

    Konyv.find.mockReturnValue({ populate: populateMock });

    const res = await request(app).get('/api/konyvek');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(typeof res.body[0].cim).toBe('string');
  });
});
