const request = require('supertest');

// -----------------------------------------------------------
// FÜGGŐSÉGEK MOCKOLÁSA (Mindig az app importálása előtt!)
// -----------------------------------------------------------

// 1. Mongoose Mockolása (megoldva a Schema.Types.ObjectId hibát)
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(), // Kapcsolódás mockolása
  
  // A sémák deklarálásához kell (Konyv.js és Konyvtar.js)
  Schema: function() { return { paths: {} }; }, // Konstruktor mockolása
  
  // Szükséges a ref mező miatt a Konyv.js-ben
  Types: {
    ObjectId: {
        toString: () => 'ObjectId' 
    }
  },
  model: jest.fn(() => ({})), // Model metódus mockolása
  set: jest.fn(), // Ha esetleg használná (bár a server.js-ben nincs)
}));

// 2. Konyvtar Modell Mockolása
jest.mock('../models/Konyvtar', () => {
    // Ezt az objektumot adja vissza a require('../models/Konyvtar')
    return {
        // A teszteléshez szükséges metódusok mockolása
        findByIdAndDelete: jest.fn(),
    };
});

// 3. Konyv Modell Mockolása (a server.js betölti, ezért ez is kell)
jest.mock('../models/Konyv', () => ({}));

// 4. .env fájl (dotenv) mockolása
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Mockoljuk a .env változókat (a server.js-ben szerepelnek)
process.env.MONGO_URI = 'mongodb://mock.uri';
process.env.PORT = 3000;
process.env.NODE_ENV = 'test'; // Biztosítja, hogy a szerver ne induljon el a teszt alatt

// -----------------------------------------------------------
// IMPORTOK
// -----------------------------------------------------------

const Konyvtar = require('../models/Konyvtar'); // A mockolt modell
const app = require('../server'); // A tesztelendő Express alkalmazás

// -----------------------------------------------------------
// TESZTEK
// -----------------------------------------------------------

beforeEach(() => {
  // Minden teszt előtt töröljük a mock hívási előzményeket
  jest.clearAllMocks();
});

describe('DELETE /api/konyvtarak/:id', () => {

  // 1 — Sikeres törlés
  it('törli a könyvtárat és 200-at ad vissza sikeres törlés esetén', async () => {
    // Mivel a végpont nem ellenőrzi a visszatérési értéket, csak a hibaállapotot, 
    // a mock-nak csak fel kell oldódnia.
    Konyvtar.findByIdAndDelete.mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });

    const res = await request(app).delete('/api/konyvtarak/507f1f77bcf86cd799439011');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Könyvtár törölve' });
  });

  // 2 — Ha nincs találat (a MongoDB szabványa szerint)
  it('200-at ad, és visszaigazolja a törlést akkor is, ha az ID létezik, de a könyvtár nem található (null)', async () => {
    // A findByIdAndDelete metódus 'null'-t ad vissza, ha nem talál dokumentumot.
    // A server.js végpontja (server.js:140) ilyenkor is 200-at ad vissza.
    Konyvtar.findByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete('/api/konyvtarak/507f1f77bcf86cd799439012');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Könyvtár törölve');
  });

  // 3 — Hibás ID / Mongoose hiba → 400
  it('400-at ad, ha a findByIdAndDelete Mongoose hibával (pl. hibás ID) oldódik fel', async () => {
    const error = new Error('Cast to ObjectId failed for value "invalid-id"');
    // A server.js 142. sorában lévő catch blokk elkapja a hibát
    Konyvtar.findByIdAndDelete.mockRejectedValue(error);

    const res = await request(app).delete('/api/konyvtarak/invalid-id');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(error.message); 
  });

  // 4 — findByIdAndDelete meghívásának ellenőrzése
  it('megfelelő paraméterrel hívja meg a Konyvtar.findByIdAndDelete metódust', async () => {
    const testId = '60c728b7e231f80015f6f1c1';
    Konyvtar.findByIdAndDelete.mockResolvedValue({}); 

    await request(app).delete(`/api/konyvtarak/${testId}`);

    expect(Konyvtar.findByIdAndDelete).toHaveBeenCalledTimes(1);
    expect(Konyvtar.findByIdAndDelete).toHaveBeenCalledWith(testId);
  });

});