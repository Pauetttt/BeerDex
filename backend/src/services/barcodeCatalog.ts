// Módulo ligero de validación y alias de códigos de barras para runtime (sin historias ni seeds completos).
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(code[12]);
}

export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i += 1) {
    const digit = Number(code[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(code[7]);
}

export function isValidGtin14(code: string): boolean {
  if (!/^\d{14}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const digit = Number(code[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(code[13]);
}

export function expandUpceToEan13(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const ns = code[0];
  const d1 = code[1];
  const d2 = code[2];
  const d3 = code[3];
  const d4 = code[4];
  const d5 = code[5];
  const d6 = code[6];
  const chk = code[7];
  let upca11: string;
  if (d6 === '0' || d6 === '1' || d6 === '2') {
    upca11 = `${ns}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  } else if (d6 === '3') {
    upca11 = `${ns}${d1}${d2}${d3}00000${d4}${d5}`;
  } else if (d6 === '4') {
    upca11 = `${ns}${d1}${d2}${d3}${d4}00000${d5}`;
  } else {
    upca11 = `${ns}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
  const ean13 = `0${upca11}${chk}`;
  return isValidEan13(ean13) ? ean13 : null;
}

export function isValidUpce(code: string): boolean {
  return expandUpceToEan13(code) !== null;
}

export function isValidEan(code: string): boolean {
  return isValidEan13(code) || isValidEan8(code) || isValidUpce(code) || isValidGtin14(code);
}

export const GS1_PREFIX_TO_BRAND: Array<{
  prefix: string;
  brandName: string;
  defaultBeerName: string;
  relatedBrandNames?: string[];
}> = [
  // 9-digit sub-prefixes (longest match first)
  { prefix: '841079303', brandName: 'Voll-Damm', defaultBeerName: 'Voll-Damm Doble Malta Botellín', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841079322', brandName: 'Victoria', defaultBeerName: 'Victoria Málaga Clásica Botellín', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841079363', brandName: 'Victoria', defaultBeerName: 'Victoria Málaga Clásica Botellín', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841079364', brandName: 'Victoria', defaultBeerName: 'Victoria Málaga Clásica Botellín', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841079317', brandName: 'Keler', defaultBeerName: 'Keler 18 Lata', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841079318', brandName: 'Keler', defaultBeerName: 'Keler 18 Lata', relatedBrandNames: ['Estrella Damm'] },
  { prefix: '841319409', brandName: 'Turia', defaultBeerName: 'Turia Märzen Botellín', relatedBrandNames: ['Estrella de Levante'] },
  { prefix: '841059010', brandName: 'El Águila', defaultBeerName: 'El Águila Sin Filtrar Botellín', relatedBrandNames: ['Tropical'] },
  { prefix: '841059011', brandName: 'El Águila', defaultBeerName: 'El Águila Sin Filtrar Botellín', relatedBrandNames: ['Tropical'] },
  { prefix: '841059031', brandName: 'El Águila', defaultBeerName: 'El Águila Sin Filtrar Botellín', relatedBrandNames: ['Tropical'] },
  { prefix: '841059001', brandName: 'Tropical', defaultBeerName: 'Tropical Pilsen Botellín', relatedBrandNames: ['El Águila'] },
  { prefix: '841059004', brandName: 'Tropical', defaultBeerName: 'Tropical Pilsen Botellín', relatedBrandNames: ['El Águila'] },
  { prefix: '841059020', brandName: 'Tropical', defaultBeerName: 'Tropical Pilsen Botellín', relatedBrandNames: ['El Águila'] },
  { prefix: '841460674', brandName: 'La Salve', defaultBeerName: 'La Salve Lager Auténtica Botellín', relatedBrandNames: ['La Virgen'] },

  // 7-digit brewery prefixes (all 41 brands)
  { prefix: '8412598', brandName: 'Estrella Galicia', defaultBeerName: 'Estrella Galicia Especial Botellín', relatedBrandNames: ['1906'] },
  { prefix: '8410521', brandName: 'Estrella Galicia', defaultBeerName: 'Estrella Galicia Especial Botellín', relatedBrandNames: ['1906'] },
  { prefix: '8411327', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Lata' },
  { prefix: '3458327', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Lata' },
  { prefix: '8410085', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Botellín' },
  { prefix: '8413681', brandName: 'Alhambra', defaultBeerName: 'Alhambra Especial Lata' },
  { prefix: '8414606', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín', relatedBrandNames: ['La Salve'] },
  { prefix: '8437012', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín' },
  { prefix: '8437019', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín' },
  { prefix: '8410793', brandName: 'Estrella Damm', defaultBeerName: 'Estrella Damm Mediterránea Lata', relatedBrandNames: ['Voll-Damm', 'Victoria', 'Keler'] },
  { prefix: '8410105', brandName: 'Estrella Damm', defaultBeerName: 'Estrella Damm Mediterránea Botellín' },
  { prefix: '8410655', brandName: 'San Miguel', defaultBeerName: 'San Miguel Especial Lata' },
  { prefix: '8410261', brandName: 'San Miguel', defaultBeerName: 'San Miguel Especial Botellín' },
  { prefix: '8411090', brandName: 'Cruzcampo', defaultBeerName: 'Cruzcampo Pilsen Lata', relatedBrandNames: ['El Águila'] },
  { prefix: '8410285', brandName: 'Cruzcampo', defaultBeerName: 'Cruzcampo Pilsen Botellín' },
  { prefix: '8410700', brandName: 'Ámbar', defaultBeerName: 'Ámbar Especial Botellín', relatedBrandNames: ['Moritz'] },
  { prefix: '8410709', brandName: 'Ámbar', defaultBeerName: 'Ámbar Export Botellín' },
  { prefix: '8410412', brandName: 'Ámbar', defaultBeerName: 'Ámbar Especial Botellín' },
  { prefix: '8410590', brandName: 'El Águila', defaultBeerName: 'El Águila Sin Filtrar Botellín', relatedBrandNames: ['Tropical'] },
  { prefix: '8413194', brandName: 'Estrella de Levante', defaultBeerName: 'Estrella de Levante Clásica Botellín', relatedBrandNames: ['Turia'] },
  { prefix: '8410569', brandName: 'Amstel', defaultBeerName: 'Amstel Original Botellín', relatedBrandNames: ['Heineken'] },
  { prefix: '8414161', brandName: 'Dorada', defaultBeerName: 'Dorada Pilsen Botellín' },
  { prefix: '8413510', brandName: 'El Alcázar', defaultBeerName: 'El Alcázar Especial Botellín' },
  { prefix: '8437010', brandName: 'El Alcázar', defaultBeerName: 'El Alcázar Especial Botellín' },
  { prefix: '8437011', brandName: 'La Sagra', defaultBeerName: 'La Sagra Original Botellín' },
  { prefix: '8712000', brandName: 'Heineken', defaultBeerName: 'Heineken Original Lata', relatedBrandNames: ['Amstel', 'Desperados'] },
  { prefix: '3119780', brandName: 'Desperados', defaultBeerName: 'Desperados Original Botellín', relatedBrandNames: ['Heineken'] },
  { prefix: '3155930', brandName: 'Desperados', defaultBeerName: 'Desperados Original Botellín', relatedBrandNames: ['Heineken'] },
  { prefix: '5000213', brandName: 'Guinness', defaultBeerName: 'Guinness Draught Lata' },
  { prefix: '5052542', brandName: 'Guinness', defaultBeerName: 'Guinness West Indies Porter Botellín' },
  { prefix: '4053400', brandName: 'Guinness', defaultBeerName: 'Guinness Hop House 13 Botellín' },
  { prefix: '5410218', brandName: 'Guinness', defaultBeerName: 'Guinness Special Export Stout Botellín' },
  { prefix: '4066600', brandName: 'Paulaner', defaultBeerName: 'Paulaner Hefe-Weißbier Botellín' },
  { prefix: '4072700', brandName: 'Franziskaner', defaultBeerName: 'Franziskaner Hefe-Weissbier Naturtrüb Botellín' },
  { prefix: '4072100', brandName: 'Franziskaner', defaultBeerName: 'Franziskaner Hefe-Weissbier Naturtrüb Botellín' },
  { prefix: '5410228', brandName: 'Leffe', defaultBeerName: 'Leffe Blonde Botellín', relatedBrandNames: ['Stella Artois', 'Budweiser', 'Corona'] },
  { prefix: '5412186', brandName: 'Delirium Tremens', defaultBeerName: 'Delirium Tremens Botellín' },
  { prefix: '5056025', brandName: 'BrewDog', defaultBeerName: 'BrewDog Punk IPA Lata' },
  { prefix: '5060154', brandName: 'BrewDog', defaultBeerName: 'BrewDog Punk IPA Botellín' },
  { prefix: '7501064', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín', relatedBrandNames: ['Modelo'] },
  { prefix: '7503034', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '7503038', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '7504167', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '7503281', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '7503392', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '7501376', brandName: 'Corona', defaultBeerName: 'Corona Extra Botellín' },
  { prefix: '0080660', brandName: 'Modelo', defaultBeerName: 'Modelo Especial Botellín', relatedBrandNames: ['Corona'] },
  { prefix: '0033544', brandName: 'Modelo', defaultBeerName: 'Modelo Chelada Limón y Sal Lata', relatedBrandNames: ['Corona'] },
  { prefix: '0018200', brandName: 'Budweiser', defaultBeerName: 'Budweiser Original Botellín', relatedBrandNames: ['Stella Artois'] },
  { prefix: '5014379', brandName: 'Budweiser', defaultBeerName: 'Budweiser Original Botellín', relatedBrandNames: ['Stella Artois'] },
  { prefix: '5010017', brandName: 'Stella Artois', defaultBeerName: 'Stella Artois Original Botellín', relatedBrandNames: ['Budweiser'] },
  { prefix: '0786150', brandName: 'Stella Artois', defaultBeerName: 'Stella Artois Original Botellín', relatedBrandNames: ['Budweiser'] },
  { prefix: '5740600', brandName: 'Carlsberg', defaultBeerName: 'Carlsberg Danish Pilsner Lata' },
  { prefix: '3080216', brandName: 'Carlsberg', defaultBeerName: 'Carlsberg Danish Pilsner Botellín' },
  { prefix: '5010153', brandName: 'Carlsberg', defaultBeerName: 'Carlsberg Danish Pilsner Lata' },
  { prefix: '4101010', brandName: 'Carlsberg', defaultBeerName: 'Carlsberg 0,0 Sin Alcohol Lata' },
  { prefix: '8594404', brandName: 'Pilsner Urquell', defaultBeerName: 'Pilsner Urquell Original Botellín' },
  { prefix: '8008440', brandName: 'Peroni', defaultBeerName: 'Peroni Nastro Azzurro Botellín', relatedBrandNames: ['Asahi'] },
  { prefix: '5014138', brandName: 'Peroni', defaultBeerName: 'Peroni Nastro Azzurro Botellín' },
  { prefix: '4901004', brandName: 'Asahi', defaultBeerName: 'Asahi Super Dry Lata' },
  { prefix: '4904230', brandName: 'Asahi', defaultBeerName: 'Asahi Dry Zero 0,0% Lata' },
  { prefix: '5060006', brandName: 'Asahi', defaultBeerName: 'Asahi Super Dry Lata' },
  { prefix: '0038766', brandName: 'Asahi', defaultBeerName: 'Asahi Dry Black Botellín' },
  { prefix: '4901880', brandName: 'Sapporo', defaultBeerName: 'Sapporo Premium Beer Lata' },
  { prefix: '0087975', brandName: 'Sapporo', defaultBeerName: 'Sapporo Premium Beer Botellín' },
  { prefix: '0056910', brandName: 'Sapporo', defaultBeerName: 'Sapporo Premium Beer Botellín' },
  { prefix: '5601164', brandName: 'Super Bock', defaultBeerName: 'Super Bock Original Botellín' },
  { prefix: '5601146', brandName: 'Sagres', defaultBeerName: 'Sagres Branca Original Botellín' },
];

export const EXTRA_BARCODE_TO_BEER_NAME: Record<string, { brandName: string; beerName: string }> = {
  "10170134": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "13226060": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro 0,0 Tostada Botellín"
  },
  "15879716": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "16011465": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "54018037": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "56001259": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Lata"
  },
  "56002621": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "56004854": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Abadia Botellín"
  },
  "56004861": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Green Limón Botellín"
  },
  "56018448": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Preta Botellín"
  },
  "56018837": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
  },
  "56028874": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Tango Grosella Botellín"
  },
  "56029246": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
  },
  "56045567": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "56075557": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
  },
  "56090710": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "56090727": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "56093254": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "59595847": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "75002121": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "75013769": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "75030889": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "75031602": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "75032814": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "75033927": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "75037062": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "75041670": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "78935495": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "80063483": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "80066583": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "80067436": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "80067900": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "81120703": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "84105905": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "84107046": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Botellín"
  },
  "84107091": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Export Botellín"
  },
  "84107107": {
    "brandName": "Ámbar",
    "beerName": "Ámbar 1900 Sin Filtrar Botellín"
  },
  "84107114": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Botellín"
  },
  "84107268": {
    "brandName": "Moritz",
    "beerName": "Moritz Original Botellín"
  },
  "84107275": {
    "brandName": "Moritz",
    "beerName": "Moritz 0,0 Sin Alcohol Botellín"
  },
  "84107282": {
    "brandName": "Moritz",
    "beerName": "Moritz Epidor Tostada Botellín"
  },
  "84107312": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Sin Gluten Botellín"
  },
  "84152657": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Botellín"
  },
  "84153128": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Botellín"
  },
  "84198532": {
    "brandName": "Dorada",
    "beerName": "Dorada Especial Original Botellín"
  },
  "87120103": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "87120158": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "87120332": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "91405852": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8412598004018": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598000515": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004056": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598001772": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004032": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598007903": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598800146": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598005404": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598008030": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598000553": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598006111": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004650": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "1457190001758": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8410521001011": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598023170": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598001765": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598021312": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598000034": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8410521001028": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598001024": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598000775": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8410521001066": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Litrona"
  },
  "8412598000485": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Lata"
  },
  "8410521001035": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Lata"
  },
  "8412598001666": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Botellín"
  },
  "9417198007659": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Botellín"
  },
  "8412598008863": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Tostada Botellín"
  },
  "8412598006418": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Negra Botellín"
  },
  "8412598002526": {
    "brandName": "Estrella Galicia",
    "beerName": "La Estrella de Galicia Receta Original Botellín"
  },
  "8412598005619": {
    "brandName": "Estrella Galicia",
    "beerName": "La Estrella de Galicia Receta Original Botellín"
  },
  "8411327131018": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327131063": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327131124": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327001656": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327121019": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "09095726": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327152013": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Lata"
  },
  "8411327122122": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Lata"
  },
  "8411327032018": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327052016": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327031240": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327022125": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Lata"
  },
  "6418311052016": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Lata"
  },
  "8411327008235": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Session IPA Botellín"
  },
  "8411327001960": {
    "brandName": "Mahou",
    "beerName": "Mahou Maestra Doble Lúpulo Botellín"
  },
  "8411327002721": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327012263": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327007771": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327004138": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411547210487": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "3458327002745": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327002639": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "3458327722018": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "8411327731065": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Botellín"
  },
  "8411327011037": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Botellín"
  },
  "8411327000086": {
    "brandName": "Mahou",
    "beerName": "Mahou Radler Limón Lata"
  },
  "8411327000161": {
    "brandName": "Mahou",
    "beerName": "Mahou Radler Limón Lata"
  },
  "8413681300482": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Lata"
  },
  "8413681241112": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Lata"
  },
  "8413681305678": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681305500": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681306392": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681307733": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681300864": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681301106": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681301014": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Litrona"
  },
  "8413681010275": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Tradicional Botellín"
  },
  "8413681001105": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Tradicional Botellín"
  },
  "8413681301267": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva 1925 Botellín"
  },
  "8413681021820": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva 1925 Botellín"
  },
  "8413681305692": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva Roja Botellín"
  },
  "8413681309652": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva Roja Botellín"
  },
  "8413681310658": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Baltic Porter Botellín"
  },
  "8413681401233": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Radler Limón Lata"
  },
  "8437019189426": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Madrid Lager Botellín"
  },
  "8437012004016": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Madrid Lager Botellín"
  },
  "8437012004061": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Madrid Lager Lata"
  },
  "8437012004023": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Jamonera Tostada Botellín"
  },
  "8437012004030": {
    "brandName": "La Virgen",
    "beerName": "La Virgen 360 IPA Lata"
  },
  "8437012004047": {
    "brandName": "La Virgen",
    "beerName": "La Virgen IPA Botellín"
  },
  "8437012004054": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Negra Botellín"
  },
  "8437012004078": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Trigo 0,0 Lata"
  },
  "8410793541109": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793022943": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793023841": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793023858": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793676139": {
    "brandName": "Estrella Damm",
    "beerName": "Free Damm 0,0 Lata"
  },
  "8410793076137": {
    "brandName": "Estrella Damm",
    "beerName": "Free Damm 0,0 Lata"
  },
  "8410793071101": {
    "brandName": "Estrella Damm",
    "beerName": "Free Damm 0,0 Botellín"
  },
  "8410793333179": {
    "brandName": "Estrella Damm",
    "beerName": "Inedit Damm Trigo y Especias Botellín"
  },
  "8410793091932": {
    "brandName": "Estrella Damm",
    "beerName": "Inedit Damm Trigo y Especias Botellín"
  },
  "8410793333834": {
    "brandName": "Estrella Damm",
    "beerName": "Inedit Damm Trigo y Especias Botellín"
  },
  "8410793081933": {
    "brandName": "Estrella Damm",
    "beerName": "Daura Damm Sin Gluten Botellín"
  },
  "8410793021939": {
    "brandName": "Estrella Damm",
    "beerName": "Bock-Damm Negra Botellín"
  },
  "8410793041937": {
    "brandName": "Estrella Damm",
    "beerName": "AK Damm Alsaciana Botellín"
  },
  "8410793176134": {
    "brandName": "Estrella Damm",
    "beerName": "Damm Lemon Clara Mediterránea Lata"
  },
  "8410793013842": {
    "brandName": "Estrella Damm",
    "beerName": "Xibeca Damm Suave Lata"
  },
  "7410794016126": {
    "brandName": "Estrella Damm",
    "beerName": "Xibeca Damm Suave Lata"
  },
  "8410655000409": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000799": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655010552": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000553": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000584": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000393": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000416": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655001413": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655627316": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "5010153773671": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "5010153771677": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "01414107": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000874": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655000430": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655007019": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655006388": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655001147": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379029758": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379030020": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379029864": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5010153771615": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379012866": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379029833": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655001772": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8992756035332": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655002502": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Litrona"
  },
  "8992756333520": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Litrona"
  },
  "8410655071287": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "8410655011221": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "8410655002663": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "5010153871148": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "8410655006173": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Botellín"
  },
  "8410655100284": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Botellín"
  },
  "8410655006821": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Manila IPA Botellín"
  },
  "8410655007125": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Magna Lata"
  },
  "8410655006432": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Radler Limón 0,0 Lata"
  },
  "8410655001932": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Fresca Botellín"
  },
  "8420417193812": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090006018": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "08633965": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090106251": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090710021": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Lata"
  },
  "8411090171327": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Lata"
  },
  "8411090032000": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Litrona"
  },
  "8411090024005": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Litrona"
  },
  "5035766065401": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Litrona"
  },
  "8412881119122": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Gran Reserva Botellín"
  },
  "8411090114331": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Gran Reserva Lata"
  },
  "8411090411478": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Radler Limón Lata"
  },
  "8410700001016": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Botellín"
  },
  "00005760": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Export Botellín"
  },
  "8410700002310": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Negra Botellín"
  },
  "2000000049656": {
    "brandName": "Ámbar",
    "beerName": "Ámbar 0,0 Sin Alcohol Lata"
  },
  "8410700001559": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Triple Zero 0,0 Botellín"
  },
  "8410700004734": {
    "brandName": "Ámbar",
    "beerName": "Ámbar IPA Botellín"
  },
  "8410700001818": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Sin Gluten Botellín"
  },
  "8410700002396": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Radler Limón Lata"
  },
  "8410700001917": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Radler Limón Lata"
  },
  "8410700006028": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Morena Tostada Lata"
  },
  "8410700005113": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Morena Tostada Lata"
  },
  "8712000020309": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000018986": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000009014": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000900298": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780015207": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780243570": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780265794": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780259069": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000031053": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780268306": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000018825": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000900205": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000030599": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "7610055000318": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780259007": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780268368": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780268276": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000035457": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000009021": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000011079": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780268801": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "7030019532103": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000028268": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000901394": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5901559951162": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5942105000941": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "0086428430506": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "0072890000026": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780259700": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8850571930334": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3830001714692": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5035766062752": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5998818171096": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000011413": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000320003": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050146": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000043865": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000009038": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050702": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000043858": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000009045": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000058012": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Botellín"
  },
  "8712000009052": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Botellín"
  },
  "8712000058029": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Lata"
  },
  "8712000009069": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Lata"
  },
  "8712000009076": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "5000213009420": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213006566": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213021293": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213015506": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213026205": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213021774": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213029671": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "0083820725520": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "0083820181012": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "4751017241998": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213023525": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213014912": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "7503028270187": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000196000537": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000210014168": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "0083820123937": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213016107": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213101872": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Lata"
  },
  "8888017620051": {
    "brandName": "Guinness",
    "beerName": "Guinness Foreign Extra Stout Botellín"
  },
  "5000213027714": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "8801027884961": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "6034000106701": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "4751017242827": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "4742024130603": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213025062": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "7798339251523": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "4066600601920": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600611301": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600641995": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600298113": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600060741": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600251101": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600233008": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600611363": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600211815": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600601111": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600641100": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600601333": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600011026": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600601128": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Salvator Doppelbock Botellín"
  },
  "4066600641605": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Oktoberfest Bier Botellín"
  },
  "4066600245919": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier 0,0 Lata"
  },
  "4066600641919": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600145257": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600192510": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600301011": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600641018": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600601050": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600345251": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600145264": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600645245": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600642022": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600198598": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "5410228233077": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228258698": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228222583": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228102762": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228280538": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228142089": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228208358": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228280545": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5014379023152": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228203582": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228303947": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228216568": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228237501": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228254065": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228012016": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228188223": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228145554": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228225355": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228228011": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228280170": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228241553": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228319573": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228218067": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228204831": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228215479": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228091448": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228232520": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228240556": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228215578": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228225768": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228283324": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228225348": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228257967": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228222941": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228224020": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228012023": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228222286": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228174073": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228142164": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228012030": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228161790": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228147213": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228244028": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228307280": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228307235": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228233626": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228254966": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228255000": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228012047": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228195832": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228209447": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228239802": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228202608": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228191551": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228191568": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228012054": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228242000": {
    "brandName": "Leffe",
    "beerName": "Leffe Ambrée Botellín"
  },
  "5410228242055": {
    "brandName": "Leffe",
    "beerName": "Leffe Ambrée Botellín"
  },
  "5410228238058": {
    "brandName": "Leffe",
    "beerName": "Leffe Ambrée Botellín"
  },
  "5410228256649": {
    "brandName": "Leffe",
    "beerName": "Leffe Ambrée Botellín"
  },
  "5410228319566": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228319085": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228012061": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228243267": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228243281": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228267171": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228267447": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228261063": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228261094": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228304586": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228253563": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228012078": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228230441": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby 0,0 Botellín"
  },
  "5410228308324": {
    "brandName": "Leffe",
    "beerName": "Leffe Nectar Miel Botellín"
  },
  "5410228206217": {
    "brandName": "Leffe",
    "beerName": "Leffe Nectar Miel Botellín"
  },
  "5410228258384": {
    "brandName": "Leffe",
    "beerName": "Leffe Nectar Miel Botellín"
  },
  "5060154914030": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "0542111866378": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025440449": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025413054": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Elvis Juice Lata"
  },
  "5056025453302": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "4260649360033": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "5056025438118": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "5056025471375": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Black Heart Lata"
  },
  "4260649362976": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Black Heart Lata"
  },
  "5056025459014": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Black Heart Lata"
  },
  "5056025421370": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk AF 0,5 Lata"
  },
  "5056025429017": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk AF 0,5 Lata"
  },
  "0842817101552": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk AF 0,5 Lata"
  },
  "5056025481145": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Wingman Session IPA Lata"
  },
  "5056025461017": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Wingman Session IPA Lata"
  },
  "5060154911794": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Dead Pony Club Pale Ale Lata"
  },
  "5060154910247": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Dead Pony Club Pale Ale Lata"
  },
  "08066145": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067382406": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5410228309451": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7503034941200": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "4100130010224": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191329": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0080660956084": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0080660956053": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379025422": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191466": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191527": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191503": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5410228235927": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064192081": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067382338": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067382444": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "4100130011788": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5507464196454": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379012507": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064196690": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379014440": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7503038290809": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191572": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5410228277743": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956411": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956855": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956435": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0033544000830": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "7891991305846": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956800": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "5014379023503": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "5410228313854": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "5410228291886": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "7501064199127": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "7501064196485": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "5410228237471": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "5410228242307": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "8008440222008": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440012661": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212061": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440512093": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212511": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440414014": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212498": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212771": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212726": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "0181954001012": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "5000016870456": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440015013": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440522016": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440512543": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440012012": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440412423": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440512468": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440222015": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440015020": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440212115": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440412164": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440514004": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440512499": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440512604": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "0181954001067": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "7594443023298": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8594404023304": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440222107": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440015037": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440219589": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440215024": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440311009": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440015044": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440312006": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Rossa Botellín"
  },
  "8008440015051": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Rossa Botellín"
  },
  "8008440313003": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Puro Malto Botellín"
  },
  "8008440219886": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Puro Malto Botellín"
  },
  "8008440515018": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Puro Malto Botellín"
  },
  "8008440111661": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440015068": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440412416": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440215017": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440512420": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440210081": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440210531": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440111005": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440111012": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Lata"
  },
  "8008440015075": {
    "brandName": "Peroni",
    "beerName": "Peroni Stile Capri Botellín"
  },
  "8008440212313": {
    "brandName": "Peroni",
    "beerName": "Peroni Senza Glutine Sin Gluten Botellín"
  },
  "8008440510303": {
    "brandName": "Peroni",
    "beerName": "Peroni Senza Glutine Sin Gluten Botellín"
  },
  "8008440114006": {
    "brandName": "Peroni",
    "beerName": "Peroni Senza Glutine Sin Gluten Botellín"
  },
  "8008440512581": {
    "brandName": "Peroni",
    "beerName": "Peroni Chill Lemon Radler Botellín"
  },
  "8008440115003": {
    "brandName": "Peroni",
    "beerName": "Peroni Chill Lemon Radler Botellín"
  },
  "8411090115093": {
    "brandName": "El Águila",
    "beerName": "El Águila Dorada Lata"
  },
  "8410590110010": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8410590111086": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8410590111208": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8411090115161": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8410590111109": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Lata"
  },
  "8410590000021": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Lata"
  },
  "8411090115277": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Lata"
  },
  "8411090310207": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar 0,0 Lata"
  },
  "5414493706137": {
    "brandName": "Estrella de Levante",
    "beerName": "Estrella de Levante 0,0 Lata"
  },
  "8410793226433": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Clásica Lata"
  },
  "8410569005651": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "8712000020569": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "8410569000649": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569015698": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059125": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000038557": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8606105157513": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059118": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000057114": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "5035766061199": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569020012": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Litrona"
  },
  "8712000053185": {
    "brandName": "Amstel",
    "beerName": "Amstel 0,0 Sin Alcohol Lata"
  },
  "8712000059323": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler 0,0 Limón Lata"
  },
  "8410569320037": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro 0,0 Tostada Botellín"
  },
  "8410569310014": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro 0,0 Tostada Botellín"
  },
  "8410569620007": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler Limón Botellín"
  },
  "8410569615232": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler Limón Botellín"
  },
  "8410569510018": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler 0,0 Limón Botellín"
  },
  "8712000052461": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler 0,0 Limón Botellín"
  },
  "07289440": {
    "brandName": "Amstel",
    "beerName": "Amstel Light Botellín"
  },
  "8414161000007": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Botellín"
  },
  "8414161001097": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Lata"
  },
  "8410590011416": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Botellín"
  },
  "8410590012543": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Botellín"
  },
  "8410590200087": {
    "brandName": "Tropical",
    "beerName": "Tropical Limón Botellín"
  },
  "8410590200094": {
    "brandName": "Tropical",
    "beerName": "Tropical Limón Lata"
  },
  "8410700003911": {
    "brandName": "Moritz",
    "beerName": "Moritz Original Botellín"
  },
  "8410700005359": {
    "brandName": "Moritz",
    "beerName": "Moritz Original Lata"
  },
  "8410700002372": {
    "brandName": "Moritz",
    "beerName": "Moritz Original Lata"
  },
  "8410700007001": {
    "brandName": "Moritz",
    "beerName": "Moritz 0,0 Tostada Botellín"
  },
  "8410700005052": {
    "brandName": "Moritz",
    "beerName": "Moritz Radler Limón Lata"
  },
  "8410700005038": {
    "brandName": "Moritz",
    "beerName": "Moritz Radler Limón Lata"
  },
  "8410793186126": {
    "brandName": "Keler",
    "beerName": "Keler 18 Lata"
  },
  "8413510010018": {
    "brandName": "El Alcázar",
    "beerName": "El Alcázar Especial Botellín"
  },
  "8437011685087": {
    "brandName": "La Sagra",
    "beerName": "La Sagra Original Botellín"
  },
  "8437011685940": {
    "brandName": "La Sagra",
    "beerName": "La Sagra Original Botellín"
  },
  "8410793032935": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793031969": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793037336": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793000958": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793033840": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793033123": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793036230": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Lata"
  },
  "8410793036124": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Lata"
  },
  "8412598033117": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005060": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598000966": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005008": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598001871": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598445484": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598008542": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005121": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598034213": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8441277034213": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598008047": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8410521001042": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598031311": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598003462": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598004933": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005879": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598005015": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598004896": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598006050": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8410521001073": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598002298": {
    "brandName": "1906",
    "beerName": "1906 Black Coupage Botellín"
  },
  "8412598006043": {
    "brandName": "1906",
    "beerName": "1906 Black Coupage Botellín"
  },
  "8410521001059": {
    "brandName": "1906",
    "beerName": "1906 Black Coupage Botellín"
  },
  "8412598007514": {
    "brandName": "1906",
    "beerName": "1906 Galician Irish Red Ale Botellín"
  },
  "5014379002973": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379003161": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379004601": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379109597": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5410228268666": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "6003326012614": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "0718603727001": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379004519": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379020458": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379007237": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "0018200000164": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379013740": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01801828": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "7802130002540": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "7891991010481": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01812620": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5010017116378": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01821220": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379004465": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "0312379524958": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Zero 0,0 Lata"
  },
  "0018200008337": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "0018200530302": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "0018200531682": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "5014379028508": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "01840623": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Select Botellín"
  },
  "01840128": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Select Botellín"
  },
  "0018200532184": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "0018200533150": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "01853821": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "0018200149900": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0018200189920": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Platinum Botellín"
  },
  "5410228141235": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228144755": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228147916": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "0786150000250": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5010017109776": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228264323": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228264743": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228170440": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228147855": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228141327": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228217718": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228217732": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5010017109820": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5014379003475": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5998817521953": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228283317": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "3850131486009": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "3800052304111": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "0018200261237": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228260516": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228280156": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "0786150000236": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228217695": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228104520": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228294207": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Gluten Free Botellín"
  },
  "5014379012934": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Gluten Free Botellín"
  },
  "5014379017137": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Litrona"
  },
  "3080216055084": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216055114": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5010153763634": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5740600020637": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5010153855193": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5900014005280": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Lata"
  },
  "4770349231620": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Lata"
  },
  "8007950015025": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Unfiltered Botellín"
  },
  "8007950013717": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 1883 Amber Lager Botellín"
  },
  "3080216054094": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 1883 Amber Lager Botellín"
  },
  "5740700987182": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 1883 Amber Lager Botellín"
  },
  "5010153812547": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Export Lata"
  },
  "5740600510008": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Lata"
  },
  "9421030100057": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Lata"
  },
  "3080216047102": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Lata"
  },
  "4072700803829": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072700001249": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072100001726": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4100130003868": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072700311034": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700011637": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700802525": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700001195": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Zitrone 0,0 Botellín"
  },
  "4072700001065": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Holunder 0,0 Botellín"
  },
  "3155930005650": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3155930005964": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780257546": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780268382": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780268405": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8411090070057": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000060671": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3420652887977": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780250110": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000039837": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000055745": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119783018373": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3155930234609": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "5035766064190": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000038175": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119780266401": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119780251889": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119780260119": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "5035766064213": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000036072": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Botellín"
  },
  "8712000035884": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "4823077614989": {
    "brandName": "Desperados",
    "beerName": "Desperados Black Botellín"
  },
  "3119789830061": {
    "brandName": "Desperados",
    "beerName": "Desperados Tropical Botellín"
  },
  "3119789831402": {
    "brandName": "Desperados",
    "beerName": "Desperados Tropical Botellín"
  },
  "8712000051976": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "8712000055530": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "5410263929201": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "3119780257829": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Lata"
  },
  "8712000056025": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Lata"
  },
  "5901559952503": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Lata"
  },
  "3119783021502": {
    "brandName": "Desperados",
    "beerName": "Desperados Virgin 0,0 Lata"
  },
  "8712000060701": {
    "brandName": "Desperados",
    "beerName": "Desperados Virgin 0,0 Lata"
  },
  "8712000054526": {
    "brandName": "Desperados",
    "beerName": "Desperados Ginger & Lime Botellín"
  },
  "3119789828921": {
    "brandName": "Desperados",
    "beerName": "Desperados Virgin Fresh Berry 0,0 Botellín"
  },
  "5412186000043": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Tremens Botellín"
  },
  "8594404115122": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "8594404014623": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "8594404110110": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "0072311130011": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "8594404115115": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Lata"
  },
  "8594404010816": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Lata"
  },
  "08066446": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "0080660957555": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "7501064108242": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "0080660956886": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "0080660957760": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "0080660957609": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "08066349": {
    "brandName": "Modelo",
    "beerName": "Negra Modelo Botellín"
  },
  "0033544001790": {
    "brandName": "Modelo",
    "beerName": "Modelo Chelada Limón y Sal Lata"
  },
  "8008440549426": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8008440346001": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8008440249203": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "0309002006585": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8329662018904": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4901004006813": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "8008440149121": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "5060006410017": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "9329982021058": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4901004006820": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "0038766302700": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Litrona"
  },
  "5060006410208": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Litrona"
  },
  "0038766000002": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry 0,0% Lata"
  },
  "0056910600007": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "5011046008368": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "9310441003005": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "0087975003502": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "0087975073505": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "0056910605002": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "8936061260096": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "8936061260218": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "0087975726500": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Silver Can 65cl"
  },
  "4901880833794": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Silver Can 65cl"
  },
  "5601164900349": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164902312": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164112308": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164401204": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5425025122035": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Lata"
  },
  "5601164594401": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Abadia Botellín"
  },
  "8622942054570": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "5601164852471": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Preta Botellín"
  },
  "5601164867420": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Lata"
  },
  "5601146000104": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003006": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146001224": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146103010": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003020": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146570027": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146700066": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146703463": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146703401": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146000425": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003013": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146713509": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146707003": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Lata"
  },
  "5601146310104": {
    "brandName": "Sagres",
    "beerName": "Sagres 0,0% Sem Álcool Botellín"
  },
  "5601146111008": {
    "brandName": "Sagres",
    "beerName": "Sagres Radler Limón Botellín"
  },
  "5601146012114": {
    "brandName": "Sagres",
    "beerName": "Sagres Radler Limón Botellín"
  },
  "0624140011001": {
    "brandName": "Sagres",
    "beerName": "Sagres Radler Limón Botellín"
  }
};
