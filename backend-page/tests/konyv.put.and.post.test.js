// könyv.test.js (Kizárólag POST és PUT tesztek)
const request = require('supertest');

// --- MOCKOLÁS ---

// Mongoose mock a kapcsolat és az ObjectId kezeléséhez
jest.mock('mongoose', () => {
  const isValidObjectId = jest.fn((id) => typeof id === 'string' && id.length === 24);

  return {
    connect: jest.fn().mockResolvedValue(),
    Schema: function () { return {}; },
    model: jest.fn(() => ({})),
    Types: {
      ObjectId: { isValid: isValidObjectId } 
    },
    isValidObjectId 
  };
});


// Konyv modell mock-ja a CRUD metódusok szimulálásához
jest.mock('../models/Konyv', () => {
  const save = jest.fn();
  // Meghatározzuk a FIX mock ID-t, amit a konstruktor használni fog
  const MOCK_NEW_ID = '654321098765432109876543'; 

  const Konyv = jest.fn(function(data) {
    // FIX ID beállítása, amit a tesztek is várnak
    this._id = MOCK_NEW_ID; 
    Object.assign(this, data); 
    // A save visszatér az aktuális objektummal
    this.save = save.mockResolvedValue(this); 
    return this; 
  });
  
  Konyv.find = jest.fn();
  Konyv.findById = jest.fn();
  Konyv.findByIdAndUpdate = jest.fn();
  Konyv.findByIdAndDelete = jest.fn();

  Konyv.__saveMock = save;
  // Külön exportáljuk a FIX ID-t, hogy a tesztek hivatkozhassanak rá
  Konyv.MOCK_NEW_ID = MOCK_NEW_ID;

  return Konyv;
});

const Konyv = require('../models/Konyv');
const app = require('../server'); // Feltételezve, hogy a server.js exportálja az app-ot

beforeEach(() => {
  jest.clearAllMocks();
});

// ----------------------------------------------------
// 📚 POST /api/konyvek tesztek (Létrehozás)
// ----------------------------------------------------

describe('POST /api/konyvek', () => {
  const newBook = {
    cim: 'Új Könyv Címe',
    szerzo: 'Gipsz Jakab',
    kiadas_eve: 2023,
    konyvtar_id: '507f1f77bcf86cd799439011'
  };
  // Hivatkozás a fix mock ID-ra
  const mockId = Konyv.MOCK_NEW_ID; 

  it('1. Sikeres könyvlétrehozás esetén 201-et ad vissza', async () => {
    // A save-nek vissza kell térnie egy objektummal (ez a Konyv konstruktorban beállított alapértelmezett)

    const res = await request(app)
      .post('/api/konyvek')
      .send(newBook);

    expect(res.status).toBe(201);
    expect(Konyv).toHaveBeenCalledWith(newBook);
    expect(Konyv.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('cim', newBook.cim);
  });

  it('2. Hiányzó kötelező mező (cim) esetén 400-at ad vissza', async () => {
    const invalidBook = { ...newBook, cim: undefined };
    
    Konyv.__saveMock.mockRejectedValueOnce(new Error('Könyv validációs hiba: Path `cim` is required.'));

    const res = await request(app)
      .post('/api/konyvek')
      .send(invalidBook);

    expect(res.status).toBe(400);
    expect(Konyv.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('required');
  });

  it('3. Hibás adattípus (kiadas_eve string) esetén 400-at ad vissza', async () => {
    const invalidBook = { ...newBook, kiadas_eve: 'nem szám' };

    Konyv.__saveMock.mockRejectedValueOnce(new Error('Könyv validációs hiba: kiadas_eve: Cast to Number failed.'));

    const res = await request(app)
      .post('/api/konyvek')
      .send(invalidBook);

    expect(res.status).toBe(400);
    expect(Konyv.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('failed');
  });
  
  it('4. Helyes JSON formátummal tér vissza, tartalmazza az új _id-t', async () => {
    // A save-nek vissza kell térnie egy objektummal, ami tartalmazza a mockId-t és az adatokat (ezt már a mock konstruktor garantálja)
    
    const res = await request(app)
      .post('/api/konyvek')
      .send(newBook);

    expect(res.status).toBe(201);
    // Várjuk a fix mock ID-t és az adatokat
    expect(res.body).toEqual(expect.objectContaining({
      _id: mockId, // Ezt a FIX ID-t várjuk!
      cim: newBook.cim,
      szerzo: newBook.szerzo,
      kiadas_eve: newBook.kiadas_eve,
      konyvtar_id: newBook.konyvtar_id 
    }));
  });
});

// ----------------------------------------------------
// ✏️ PUT /api/konyvek/:id tesztek (Frissítés)
// ----------------------------------------------------

describe('PUT /api/konyvek/:id', () => {
  const validId = '507f1f77bcf86cd799439011';
  const updateData = { cim: 'Frissített Cím', kiadas_eve: 2024 };
  const updatedBook = {
    _id: validId,
    cim: updateData.cim,
    szerzo: 'Eredeti Szerző',
    kiadas_eve: updateData.kiadas_eve,
    konyvtar_id: 'konyvtar_id'
  };

  it('1. Sikeres frissítés esetén 200-at és a frissített könyvet adja vissza', async () => {
    Konyv.findByIdAndUpdate.mockResolvedValue(updatedBook);

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(Konyv.findByIdAndUpdate).toHaveBeenCalledWith(
      validId, 
      updateData, 
      { new: true }
    );
    expect(res.body.cim).toBe(updateData.cim);
  });
  
  it('2. Nem található könyv (null a válasz) esetén 200-at ad vissza null testtel', async () => {
    Konyv.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(res.body).toBe(null); 
  });

  it('3. Hibás (nem Mongoose) ID formátum esetén 400-at ad vissza', async () => {
    const invalidId = 'rosszID';
    Konyv.findByIdAndUpdate.mockRejectedValue(new Error('CastError: Bad ObjectId'));

    const res = await request(app)
      .put(`/api/konyvek/${invalidId}`)
      .send(updateData);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('CastError');
  });

  it('4. Validációs hiba (pl. kötelező mező érvénytelenítése) esetén 400-at ad vissza', async () => {
    const invalidUpdate = { szerzo: null }; 
    
    Konyv.findByIdAndUpdate.mockRejectedValue(new Error('Könyv validációs hiba: szerzo: Path `szerzo` is required.'));

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(invalidUpdate);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('required');
  });
});