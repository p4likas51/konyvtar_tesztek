// konyvtar.test.js (Kizárólag POST és PUT tesztek)
const request = require('supertest');

// --- MOCKOLÁS ---

// Mongoose mock a kapcsolat és az ObjectId kezeléséhez (JAVÍTOTT!)
jest.mock('mongoose', () => {
  const isValidObjectId = jest.fn((id) => typeof id === 'string' && id.length === 24);

  // A Mongoose Schema konstruktorának mockolása
  const MockSchema = jest.fn(function() {
    return {
      Types: {
        ObjectId: {
          isValid: isValidObjectId 
        }
      }
    };
  });
  // Hozzáadjuk a Types-t is a Schema-hoz, a statikus hivatkozásokhoz
  MockSchema.Types = { ObjectId: { isValid: isValidObjectId } };

  return {
    connect: jest.fn().mockResolvedValue(),
    // A Schema most már konstruktorként van definiálva
    Schema: MockSchema,
    model: jest.fn(() => ({})),
    // A Types a régi (mongoose.Types.ObjectId) hivatkozásokhoz
    Types: {
      ObjectId: { isValid: isValidObjectId } 
    },
    isValidObjectId 
  };
});

// Konyvtar modell mock-ja a CRUD metódusok szimulálásához
jest.mock('../models/Konyvtar', () => {
  const save = jest.fn();
  // Meghatározzuk a FIX mock ID-t, amit a konstruktor használni fog
  const MOCK_NEW_ID = '789012345678901234567890'; 

  const Konyvtar = jest.fn(function(data) {
    // FIX ID beállítása
    this._id = MOCK_NEW_ID; 
    Object.assign(this, data); 
    // A save visszatér az aktuális objektummal
    this.save = save.mockResolvedValue(this); 
    return this; 
  });
  
  // Mockoljuk a Mongoose statikus metódusait
  Konyvtar.find = jest.fn();
  Konyvtar.findById = jest.fn();
  Konyvtar.findByIdAndUpdate = jest.fn();
  Konyvtar.findByIdAndDelete = jest.fn();

  Konyvtar.__saveMock = save;
  Konyvtar.MOCK_NEW_ID = MOCK_NEW_ID;

  return Konyvtar;
});

const Konyvtar = require('../models/Konyvtar');
const app = require('../server'); // Feltételezve, hogy a server.js exportálja az app-ot

beforeEach(() => {
  jest.clearAllMocks();
});

// ----------------------------------------------------
// 🏛️ POST /api/konyvtarak tesztek (Létrehozás)
// ----------------------------------------------------

describe('POST /api/konyvtarak', () => {
  const newLibrary = {
    nev: 'Teszt Könyvtár',
    varos: 'Tesztváros',
    alapitas_eve: 1995
  };
  const mockId = Konyvtar.MOCK_NEW_ID;

  it('1. Sikeres könyvtár létrehozás esetén 201-et ad vissza', async () => {
    
    const res = await request(app)
      .post('/api/konyvtarak')
      .send(newLibrary);

    expect(res.status).toBe(201);
    expect(Konyvtar).toHaveBeenCalledWith(newLibrary);
    expect(Konyvtar.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('nev', newLibrary.nev);
    expect(res.body).toHaveProperty('_id', mockId);
  });

  it('2. Hiányzó kötelező mező (nev) esetén 400-at ad vissza', async () => {
    const invalidLibrary = { ...newLibrary, nev: undefined };
    
    // Mockoljuk a save hiba dobását a validációs hiba szimulálására
    Konyvtar.__saveMock.mockRejectedValueOnce(new Error('Könyvtár validációs hiba: Path `nev` is required.'));

    const res = await request(app)
      .post('/api/konyvtarak')
      .send(invalidLibrary);

    expect(res.status).toBe(400);
    expect(Konyvtar.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('required');
  });

  it('3. Hibás adattípus (alapitas_eve string) esetén 400-at ad vissza', async () => {
    const invalidLibrary = { ...newLibrary, alapitas_eve: 'nem szám' };

    // Mockoljuk a save hiba dobását a Cast/Validációs hiba szimulálására
    Konyvtar.__saveMock.mockRejectedValueOnce(new Error('Könyvtár validációs hiba: alapitas_eve: Cast to Number failed.'));

    const res = await request(app)
      .post('/api/konyvtarak')
      .send(invalidLibrary);

    expect(res.status).toBe(400);
    expect(Konyvtar.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('failed');
  });
  
  it('4. Helyes JSON formátummal tér vissza, tartalmazza az új _id-t', async () => {
    const res = await request(app)
      .post('/api/konyvtarak')
      .send(newLibrary);

    expect(res.status).toBe(201);
    // Várjuk a fix mock ID-t és az adatokat
    expect(res.body).toEqual(expect.objectContaining({
      _id: mockId,
      nev: newLibrary.nev,
      varos: newLibrary.varos,
      alapitas_eve: newLibrary.alapitas_eve
    }));
  });
});

// ----------------------------------------------------
// ✏️ PUT /api/konyvtarak/:id tesztek (Frissítés)
// ----------------------------------------------------

describe('PUT /api/konyvtarak/:id', () => {
  const validId = '507f1f77bcf86cd799439011';
  const updateData = { nev: 'Frissített Név', varos: 'Újváros' };
  const updatedLibrary = {
    _id: validId,
    nev: updateData.nev,
    varos: updateData.varos,
    alapitas_eve: 1995 
  };

  it('1. Sikeres frissítés esetén 200-at és a frissített könyvtárat adja vissza', async () => {
    Konyvtar.findByIdAndUpdate.mockResolvedValue(updatedLibrary);

    const res = await request(app)
      .put(`/api/konyvtarak/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(Konyvtar.findByIdAndUpdate).toHaveBeenCalledWith(
      validId, 
      updateData, 
      { new: true }
    );
    expect(res.body.nev).toBe(updateData.nev);
  });
  
  it('2. Nem található könyvtár (null a válasz) esetén 200-at ad vissza null testtel', async () => {
    // A szerver.js-ben a res.json(konyvtar) történik, ami null esetén null-ként tér vissza.
    Konyvtar.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/konyvtarak/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(res.body).toBe(null); 
  });

  it('3. Hibás (nem Mongoose) ID formátum esetén 400-at ad vissza', async () => {
    const invalidId = 'rosszID';
    // Mockoljuk a Mongoose hiba dobását a catch blokk szimulálására
    Konyvtar.findByIdAndUpdate.mockRejectedValue(new Error('CastError: Bad ObjectId'));

    const res = await request(app)
      .put(`/api/konyvtarak/${invalidId}`)
      .send(updateData);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('CastError');
  });

  it('4. Validációs hiba (pl. kötelező mező törlése) esetén 400-at ad vissza', async () => {
    const invalidUpdate = { varos: null }; // próbáljuk null-ra állítani a kötelező mezőt
    
    // Mockoljuk a Mongoose validációs hiba dobását
    Konyvtar.findByIdAndUpdate.mockRejectedValue(new Error('Könyvtár validációs hiba: varos: Path `varos` is required.'));

    const res = await request(app)
      .put(`/api/konyvtarak/${validId}`)
      .send(invalidUpdate);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('required');
  });
});