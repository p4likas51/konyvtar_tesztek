// könyv.test.js (Kizárólag POST és PUT tesztek)
const request = require('supertest');

// --- MOCKOLÁS ---

// Mongoose mock a kapcsolat és az ObjectId kezeléséhez
jest.mock('mongoose', () => {
  // A mongoose.Types.ObjectId.isValid és isValidObjectId-hez
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

  // Jest spy-t adunk vissza a Konyv konstruktornak, hogy megfelelően kezelje a .toHaveBeenCalledWith-t
  const Konyv = jest.fn(function(data) {
    // Automatikus ID a sikeres POST tesztekhez
    this._id = '654321098765432109876543'; 
    // Az adatok a mock objektum gyökerére kerülnek a válasz teszteléséhez
    Object.assign(this, data); 
    // A save promise-t ad vissza, ami az új objektummal oldódik fel
    this.save = save.mockResolvedValue(this); 
    return this; // Konstruktorként is működnie kell
  });
  
  // Mockoljuk a Mongoose statikus metódusait
  Konyv.find = jest.fn();
  Konyv.findById = jest.fn();
  Konyv.findByIdAndUpdate = jest.fn();
  Konyv.findByIdAndDelete = jest.fn();

  // Exportáljuk a save mock-ot az egyedi hibák teszteléséhez
  Konyv.__saveMock = save;

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

  it('1. Sikeres könyvlétrehozás esetén 201-et ad vissza', async () => {
    // Visszaállítjuk a save mockot a sikeres resolve-ra
    Konyv.__saveMock.mockResolvedValueOnce({ _id: '123456789012345678901234', ...newBook });

    const res = await request(app)
      .post('/api/konyvek')
      .send(newBook);

    expect(res.status).toBe(201);
    // JAVÍTÁS: Mivel Konyv most már jest.fn(), használhatjuk a toHaveBeenCalledWith-t
    expect(Konyv).toHaveBeenCalledWith(newBook);
    expect(Konyv.__saveMock).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveProperty('cim', newBook.cim);
  });

  it('2. Hiányzó kötelező mező (cim) esetén 400-at ad vissza', async () => {
    const invalidBook = { ...newBook, cim: undefined };
    
    // Mockoljuk a save hiba dobását a validációs hiba szimulálására
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

    // Mockoljuk a save hiba dobását a Cast/Validációs hiba szimulálására
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
    const mockId = '123456789012345678901234';
    // Módosítjuk a mock-ot, hogy egy specifikus ID-vel térjen vissza
    Konyv.__saveMock.mockResolvedValueOnce({ _id: mockId, ...newBook });
    
    const res = await request(app)
      .post('/api/konyvek')
      .send(newBook);

    expect(res.status).toBe(201);
    // Ellenőrizzük, hogy a válasz tartalmazza a létrehozott objektum kulcsait és a mock ID-t
    expect(res.body).toEqual(expect.objectContaining({
      _id: mockId,
      cim: newBook.cim,
      szerzo: newBook.szerzo,
      kiadas_eve: newBook.kiadas_eve
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
    // Mockoljuk a Mongoose frissítési függvényt a frissített objektummal
    Konyv.findByIdAndUpdate.mockResolvedValue(updatedBook);

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    // Ellenőrizzük, hogy a metódus a helyes paraméterekkel lett hívva
    expect(Konyv.findByIdAndUpdate).toHaveBeenCalledWith(
      validId, 
      updateData, 
      { new: true } // Fontos a { new: true } opció ellenőrzése
    );
    expect(res.body.cim).toBe(updateData.cim);
  });
  
  it('2. Nem található könyv (null a válasz) esetén 200-at ad vissza null testtel', async () => {
    // A szerver.js kódja nem ellenőrzi, hogy a visszatérés null-e PUT-nál, így res.json(null) történik.
    Konyv.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(updateData);

    expect(res.status).toBe(200);
    // JAVÍTÁS: res.json(null) esetén null érkezik a body-ba.
    expect(res.body).toBe(null); 
  });

  it('3. Hibás (nem Mongoose) ID formátum esetén 400-at ad vissza', async () => {
    const invalidId = 'rosszID';
    // Mongoose CastError-t szimulálunk (a catch blokkba fut)
    Konyv.findByIdAndUpdate.mockRejectedValue(new Error('CastError: Bad ObjectId'));

    const res = await request(app)
      .put(`/api/konyvek/${invalidId}`)
      .send(updateData);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('CastError');
  });

  it('4. Validációs hiba (pl. kötelező mező érvénytelenítése) esetén 400-at ad vissza', async () => {
    const invalidUpdate = { szerzo: null }; // próbáljuk null-ra állítani a kötelező mezőt
    
    // Mockoljuk a Mongoose validációs hiba dobását
    Konyv.findByIdAndUpdate.mockRejectedValue(new Error('Könyv validációs hiba: szerzo: Path `szerzo` is required.'));

    const res = await request(app)
      .put(`/api/konyvek/${validId}`)
      .send(invalidUpdate);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('required');
  });
});