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
  // Sub-prefijos largos (9-10 dígitos, coincidencia más larga primero)
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
  { prefix: '8437019189', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín' },
  { prefix: '8437019693', brandName: 'La Sagra', defaultBeerName: 'La Sagra Original Botellín' },
  { prefix: '8437025695', brandName: 'La Sagra', defaultBeerName: 'La Sagra Original Botellín' },
  { prefix: '843659820', brandName: 'La Salve', defaultBeerName: 'La Salve Lager Auténtica Botellín' },

  // Prefijos de fabricante (7 dígitos, 41 marcas)
  { prefix: '8412598', brandName: 'Estrella Galicia', defaultBeerName: 'Estrella Galicia Especial Botellín', relatedBrandNames: ['1906'] },
  { prefix: '8410521', brandName: 'Estrella Galicia', defaultBeerName: 'Estrella Galicia Especial Botellín', relatedBrandNames: ['1906'] },
  { prefix: '8411327', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Lata' },
  { prefix: '3458327', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Lata' },
  { prefix: '8410085', brandName: 'Mahou', defaultBeerName: 'Mahou Cinco Estrellas Botellín' },
  { prefix: '8413681', brandName: 'Alhambra', defaultBeerName: 'Alhambra Especial Lata' },
  { prefix: '8414606', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín', relatedBrandNames: ['La Salve'] },
  { prefix: '8437012', brandName: 'La Virgen', defaultBeerName: 'La Virgen Madrid Lager Botellín' },
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
  { prefix: '0080157', brandName: 'Paulaner', defaultBeerName: 'Paulaner Hefe-Weißbier Botellín' },
  { prefix: '0083820', brandName: 'Guinness', defaultBeerName: 'Guinness Draught Lata' },
  { prefix: '3119783', brandName: 'Desperados', defaultBeerName: 'Desperados Original Botellín', relatedBrandNames: ['Heineken'] },
  { prefix: '3119789', brandName: 'Desperados', defaultBeerName: 'Desperados Original Botellín', relatedBrandNames: ['Heineken'] },
  { prefix: '4260473', brandName: 'BrewDog', defaultBeerName: 'BrewDog Punk IPA Lata' },
  { prefix: '4260649', brandName: 'BrewDog', defaultBeerName: 'BrewDog Punk IPA Lata' },
  { prefix: '0815184', brandName: 'Delirium Tremens', defaultBeerName: 'Delirium Tremens Botellín' },
  { prefix: '7503024', brandName: 'Modelo', defaultBeerName: 'Modelo Especial Botellín', relatedBrandNames: ['Corona'] },
];
export const EXTRA_BARCODE_TO_BEER_NAME: Record<string, { brandName: string; beerName: string }> = {
  "10170134": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "10666074": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "13226060": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro 0,0 Tostada Lata"
  },
  "15879716": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "16011465": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "16834552": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "42278047": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "54004207": {
    "brandName": "Guinness",
    "beerName": "Guinness Special Export Stout Botellín"
  },
  "56001259": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
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
    "beerName": "Super Bock Selecção 1927 Munich Dunkel Botellín"
  },
  "56028874": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Tango Grosella Botellín"
  },
  "56029246": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
  },
  "56030891": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Green Limón Botellín"
  },
  "56043600": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Botellín"
  },
  "56045567": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "56075557": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Selecção 1927 Munich Dunkel Botellín"
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
  "56096316": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Preta Botellín"
  },
  "59494287": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier Dunkel Botellín"
  },
  "59595847": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
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
  "75039851": {
    "brandName": "Corona",
    "beerName": "Corona Light Botellín"
  },
  "75041670": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "78935495": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "80066583": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "80067900": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "81120703": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "84105691": {
    "brandName": "Amstel",
    "beerName": "Amstel Clásica Litrona"
  },
  "84105905": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "84107015": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Lata"
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
  "84107312": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Especial Sin Gluten Botellín"
  },
  "84151087": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Litrona"
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
    "beerName": "Dorada Pilsen Botellín"
  },
  "87120103": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
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
    "beerName": "Mahou Rosé Lata"
  },
  "00005760": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Export Botellín"
  },
  "01414107": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "01801624": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01801828": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01812620": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "01821220": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "01824324": {
    "brandName": "Budweiser",
    "beerName": "Bud Ice Lata"
  },
  "01840128": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Select Botellín"
  },
  "01840623": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Select Botellín"
  },
  "01840827": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "01845628": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "01848926": {
    "brandName": "Budweiser",
    "beerName": "Bud Ice Lata"
  },
  "01853821": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "06663964": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "07289440": {
    "brandName": "Amstel",
    "beerName": "Amstel Light Botellín"
  },
  "08066145": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "08066242": {
    "brandName": "Corona",
    "beerName": "Corona Light Botellín"
  },
  "08066349": {
    "brandName": "Modelo",
    "beerName": "Negra Modelo Botellín"
  },
  "08496247": {
    "brandName": "Corona",
    "beerName": "Corona Light Botellín"
  },
  "08633965": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "09095726": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "0018200000164": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "0018200001635": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "0018200001789": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0018200002236": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0018200004957": {
    "brandName": "Budweiser",
    "beerName": "Bud Ice Lata"
  },
  "0018200007699": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "0018200008337": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "0018200110368": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "0018200110474": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "0018200149900": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0018200189920": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Platinum Botellín"
  },
  "0018200201882": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Solstice Lager Botellín"
  },
  "0018200201899": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Solstice Lager Botellín"
  },
  "0018200250002": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Litrona"
  },
  "0018200250095": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0018200261237": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "0018200261244": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Litrona"
  },
  "0018200530302": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "0018200531682": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "0018200532184": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "0018200533150": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "0018200969348": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0033544000557": {
    "brandName": "Modelo",
    "beerName": "Modelo Chelada Limón y Sal Lata"
  },
  "0033544000830": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0033544001301": {
    "brandName": "Modelo",
    "beerName": "Modelo Chelada Limón y Sal Lata"
  },
  "0033544001622": {
    "brandName": "Modelo",
    "beerName": "Modelo Oro Lata"
  },
  "0033544002100": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "0033544002483": {
    "brandName": "Modelo",
    "beerName": "Modelo Oro Botellín"
  },
  "0033544950401": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0033544950463": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0038766000002": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry 0,0% Lata"
  },
  "0056910600007": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "0056910605002": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "0062067382338": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067382406": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067382444": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0062067422638": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lime Lata"
  },
  "0070234445809": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Litrona"
  },
  "0072311130011": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "0072890000026": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "0080660954080": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0080660956053": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0080660956084": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "0080660956411": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956435": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956756": {
    "brandName": "Corona",
    "beerName": "Corona Light Botellín"
  },
  "0080660956800": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660956855": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "0080660957555": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "0080660957760": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "0080660957777": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Litrona"
  },
  "0083820123937": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "0083820125375": {
    "brandName": "Guinness",
    "beerName": "Guinness Cold Brew Coffee Beer Lata"
  },
  "0083820181012": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "0083820725520": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "0086428430506": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "0087975003502": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "0087975033509": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "0087975726500": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "0181954001012": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "0181954001067": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "0309002006585": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "0312379524958": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Zero 0,0 Lata"
  },
  "0542111866378": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "0608782522002": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Christmas Noël Botella 75cl"
  },
  "0608782527328": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Red Botella 75cl"
  },
  "0786150000052": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "0786150000236": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "0786150000250": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "0786150000571": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Litrona"
  },
  "0945454695610": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "3080216004983": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "3080216008622": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216027104": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216027647": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216041148": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216047072": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Botellín"
  },
  "3080216053660": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "3080216053677": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "3080216054094": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 1883 Amber Lager Botellín"
  },
  "3080216055022": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Unfiltered Botellín"
  },
  "3080216055084": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "3080216055909": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "3119780015030": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780250110": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780251889": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780256068": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Botellín"
  },
  "3119780256136": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "3119780256150": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "3119780257546": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780259007": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780259069": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780259625": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780259700": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780260119": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119780260614": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "3119780261635": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "3119780264261": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "3119780264285": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "3119780265794": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780266401": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119780266982": {
    "brandName": "Desperados",
    "beerName": "Desperados Sangré Botellín"
  },
  "3119780268306": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3119780268382": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780268405": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3119780268788": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "3119780268801": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780268825": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "3119780273904": {
    "brandName": "Desperados",
    "beerName": "Desperados Virgin 0,0 Botellín"
  },
  "3119783018373": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3119789830061": {
    "brandName": "Desperados",
    "beerName": "Desperados Tropical Botellín"
  },
  "3155930001324": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3155930005568": {
    "brandName": "Desperados",
    "beerName": "Desperados Litrona 65cl"
  },
  "3155930005964": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3155930006633": {
    "brandName": "Desperados",
    "beerName": "Desperados Litrona 65cl"
  },
  "3155930234609": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "3420652887977": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "3458327002745": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "3800052304111": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "3800069003397": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Botellín"
  },
  "3830001714692": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "3850131486009": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "4066600010050": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600011026": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600011989": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600060741": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600145257": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600145264": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600198598": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4066600203308": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4066600203711": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4066600207405": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600233008": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600241195": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Natur-Radler Limón Botellín"
  },
  "4066600292531": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600298113": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600299905": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600301011": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600301110": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Lata"
  },
  "4066600341123": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4066600345251": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600345916": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600392811": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Lata"
  },
  "4066600545255": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600601050": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600601333": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600601920": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Lata"
  },
  "4066600603405": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4066600610663": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Oktoberfest Bier Litrona"
  },
  "4066600611028": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600611301": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600611349": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Salvator Doppelbock Botellín"
  },
  "4066600611363": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600641018": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Alkoholfrei Botellín"
  },
  "4066600641100": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Münchner Hell Botellín"
  },
  "4066600641919": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Alkoholfrei Botellín"
  },
  "4066600641964": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600641971": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier Dunkel Botellín"
  },
  "4066600641995": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600642022": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600645245": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Weißbier-Zitrone 0,0 Botellín"
  },
  "4066600811985": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Hefe-Weißbier Botellín"
  },
  "4066600941910": {
    "brandName": "Paulaner",
    "beerName": "Paulaner Zwickl Kellerbier Botellín"
  },
  "4072100001726": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072700001126": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072700001249": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4072700001454": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Zitrone 0,0 Botellín"
  },
  "4072700001508": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Zitrone 0,0 Botellín"
  },
  "4072700002451": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Blutorange 0,0 Botellín"
  },
  "4072700002475": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Alkoholfrei Blutorange 0,0 Botellín"
  },
  "4072700006152": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Oktoberfestbier Botellín"
  },
  "4072700006350": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Lata"
  },
  "4072700011637": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700311034": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700802525": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín"
  },
  "4072700803829": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Lata"
  },
  "4100130003868": {
    "brandName": "Franziskaner",
    "beerName": "Franziskaner Hefe-Weissbier Naturtrüb Botellín"
  },
  "4100130010224": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "4100130011788": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "4101010010624": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Botellín"
  },
  "4101010011508": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Botellín"
  },
  "4260649360033": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "4260649360255": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "4260649360279": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "4260649360507": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "4260649360552": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "4399112426003": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Red Botella 75cl"
  },
  "4514603252712": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4514603322118": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4514603343717": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4514603345117": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4514603431810": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Litrona"
  },
  "4514603434019": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4582409175191": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4582409187910": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4589850828232": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4589850828447": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4589850829833": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4742024130603": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "4751017241998": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "4751017242827": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "4823077614989": {
    "brandName": "Desperados",
    "beerName": "Desperados Black Botellín"
  },
  "4901004006677": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4901004006813": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4901004006820": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4901004037404": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4901340064645": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4901340079144": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "4901880110093": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Yebisu Premium Botellín"
  },
  "4901880110666": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Silver Can 65cl"
  },
  "4901880192310": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Classic Lata"
  },
  "4901880200985": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4901880207182": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4901880208226": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4901880209049": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4901880833794": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4901880916688": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Yebisu Premium Lata"
  },
  "4902471018583": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4902471100660": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "4904230052326": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4904230062875": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "4904230067375": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "5000016870456": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "5000196000537": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000210014168": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213000700": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Lata"
  },
  "5000213002339": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213006566": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213008232": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213009420": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213009437": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213010785": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213011942": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213012017": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213012611": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213014905": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213014912": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213015438": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213015452": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213015506": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213016107": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213016114": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213018958": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213020708": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "5000213021774": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213023525": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213025413": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213025420": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213026038": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213026205": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213027356": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213027455": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213027684": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213027707": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213027714": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213027738": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213028612": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Botellín"
  },
  "5000213029381": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "5000213029596": {
    "brandName": "Guinness",
    "beerName": "Guinness Original Extra Stout Lata"
  },
  "5000213029626": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5000213029671": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Lata"
  },
  "5000213030707": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "5010017109615": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5010017116378": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5010153763634": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5010153771615": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "5010153771622": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5010153771677": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "5010153773671": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Litrona"
  },
  "5010153791194": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "5010153812547": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Export Lata"
  },
  "5010153870899": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5010153871148": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "5014379002973": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379003161": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379003475": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5014379004465": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379004502": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379004519": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379004533": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Litrona"
  },
  "5014379004601": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379005370": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Botellín"
  },
  "5014379007237": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379008630": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379012507": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379012866": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379012934": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Gluten Free Botellín"
  },
  "5014379012958": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Litrona"
  },
  "5014379013740": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379013979": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379014440": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379014457": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379015591": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "5014379017663": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5014379020458": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379020496": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379023152": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5014379023503": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "5014379025422": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5014379025439": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "5014379028508": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "5014379029758": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379029833": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379029864": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379030020": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "5014379030549": {
    "brandName": "Budweiser",
    "beerName": "Bud Light Lata"
  },
  "5014379030556": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5014379030884": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5014379109597": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5035766061199": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "5035766062752": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5035766064190": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "5035766064213": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "5039303007954": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Black Heart Lata"
  },
  "5052542000012": {
    "brandName": "Guinness",
    "beerName": "Guinness Dublin Porter Botellín"
  },
  "5054637339779": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "5056025412163": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Botellín"
  },
  "5056025412194": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "5056025412866": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025413054": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Elvis Juice Lata"
  },
  "5056025421370": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk AF 0,5 Lata"
  },
  "5056025421387": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk AF 0,5 Lata"
  },
  "5056025435568": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025440272": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "5056025440449": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025440487": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025440494": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Botellín"
  },
  "5056025453272": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Lost Lager Lata"
  },
  "5056025453838": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025456570": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Hazy Jane Botellín"
  },
  "5056025462083": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025462113": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025462120": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025468504": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Hazy Jane Lata"
  },
  "5056025477551": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Wingman Session IPA Lata"
  },
  "5056025478275": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5056025481176": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Wingman Session IPA Lata"
  },
  "5060006410000": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "5060006410017": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "5060006410024": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "5060006410208": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Litrona"
  },
  "5060154910018": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Botellín"
  },
  "5060154911183": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5060154911794": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Dead Pony Club Pale Ale Lata"
  },
  "5060154914030": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "5060154914689": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Dead Pony Club Pale Ale Lata"
  },
  "5410228091448": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228104520": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228129684": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228141235": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228141327": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228142089": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228142119": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228142164": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228143567": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228145554": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228146162": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228147213": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228147855": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228147916": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228166665": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228166672": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228170440": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228171065": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228174073": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228191551": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228195825": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228195832": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228197089": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228202608": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228203582": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228204831": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228208358": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228209447": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228215479": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228215530": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228215578": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228217312": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228217602": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228217695": {
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
  "5410228218067": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228222262": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Lata"
  },
  "5410228222583": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228222590": {
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
  "5410228225348": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228225355": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228225768": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228228011": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228230441": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby 0,0 Botellín"
  },
  "5410228230762": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228232520": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228233077": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228233626": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228235927": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5410228237501": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228238058": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228239802": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228241553": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228242000": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228242307": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "5410228243267": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228243847": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228243946": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228244028": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228245377": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228253563": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228254065": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228254263": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228256649": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228258384": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Lata"
  },
  "5410228258537": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228258698": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228260516": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228261063": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Lata"
  },
  "5410228261094": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228264323": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228264743": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "5410228267171": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228267447": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Botellín"
  },
  "5410228268666": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "5410228269342": {
    "brandName": "Leffe",
    "beerName": "Leffe Rituel 9 Botellín"
  },
  "5410228272489": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois 0,0 Sin Alcohol Botellín"
  },
  "5410228277743": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "5410228280156": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228280170": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228280538": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228280712": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228282327": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby 0,0 Botellín"
  },
  "5410228282587": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Litrona"
  },
  "5410228283317": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5410228291886": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "5410228292876": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "5410228300366": {
    "brandName": "Leffe",
    "beerName": "Leffe Triple Botellín"
  },
  "5410228303947": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228304531": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228304579": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Botellín"
  },
  "5410228304586": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde 0,0 Lata"
  },
  "5410228307112": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228307235": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228307280": {
    "brandName": "Leffe",
    "beerName": "Leffe Ruby Botellín"
  },
  "5410228309451": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5410228310419": {
    "brandName": "Leffe",
    "beerName": "Leffe Blonde Lata"
  },
  "5410228313861": {
    "brandName": "Corona",
    "beerName": "Corona Cero Botellín"
  },
  "5410228319566": {
    "brandName": "Leffe",
    "beerName": "Leffe Royale Whitbread Golding Botellín"
  },
  "5410228321873": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune Botellín"
  },
  "5410228324881": {
    "brandName": "Corona",
    "beerName": "Corona Cero Lata"
  },
  "5410228327264": {
    "brandName": "Corona",
    "beerName": "Corona Cero Lata"
  },
  "5410228332817": {
    "brandName": "Corona",
    "beerName": "Corona Cero Lata"
  },
  "5410228367505": {
    "brandName": "Leffe",
    "beerName": "Leffe Brune 0,0 Botellín"
  },
  "5410263929201": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "5412186002344": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Tremens Botella 75cl"
  },
  "5412186011711": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Deliria Botellín"
  },
  "5414493706137": {
    "brandName": "Estrella de Levante",
    "beerName": "Estrella de Levante 0,0 Lata"
  },
  "5425025122035": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Lata"
  },
  "5473242080706": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "5507464196454": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "5601146000906": {
    "brandName": "Sagres",
    "beerName": "Sagres Preta Negra Botellín"
  },
  "5601146001224": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003006": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003013": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146003020": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146100101": {
    "brandName": "Sagres",
    "beerName": "Sagres Bohemia Original Botellín"
  },
  "5601146100118": {
    "brandName": "Sagres",
    "beerName": "Sagres Bohemia Original Botellín"
  },
  "5601146103010": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146111008": {
    "brandName": "Sagres",
    "beerName": "Sagres Radler Limón Botellín"
  },
  "5601146120215": {
    "brandName": "Sagres",
    "beerName": "Sagres Bohemia Puro Malte Botellín"
  },
  "5601146310104": {
    "brandName": "Sagres",
    "beerName": "Sagres 0,0% Sem Álcool Botellín"
  },
  "5601146570027": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146700066": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146703401": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146703463": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146707003": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Lata"
  },
  "5601146713509": {
    "brandName": "Sagres",
    "beerName": "Sagres Branca Original Botellín"
  },
  "5601146800018": {
    "brandName": "Sagres",
    "beerName": "Sagres Preta Negra Lata"
  },
  "5601164112506": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164114203": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164114708": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Lata"
  },
  "5601164164703": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5601164164741": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5601164204232": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "5601164594203": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Abadia Botellín"
  },
  "5601164824478": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Preta Botellín"
  },
  "5601164852471": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Preta Botellín"
  },
  "5601164867420": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "5601164900349": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164901094": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Litrona"
  },
  "5601164901100": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Green Limón Botellín"
  },
  "5601164902312": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Original Botellín"
  },
  "5601164904774": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Sem Glúten Botellín"
  },
  "5601164906471": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Lata"
  },
  "5601164907119": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Coruja IPA Lata"
  },
  "5601164907157": {
    "brandName": "Super Bock",
    "beerName": "Super Bock Stout Lata"
  },
  "5740600020637": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5740600400415": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Lata"
  },
  "5740600510008": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Elephant Strong Lata"
  },
  "5740600510350": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "5740600514143": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "5740700987182": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 1883 Amber Lager Botellín"
  },
  "5900014005280": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg 0,0 Sin Alcohol Lata"
  },
  "5901559951162": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "5901559952503": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "5942045145504": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Litrona"
  },
  "5998817521953": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Lata"
  },
  "5998818171096": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "6034000106701": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "6418311052016": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Lata"
  },
  "7030019532103": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "7044610874999": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "7310070000361": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "7310070003010": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "7310070003577": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "7401000701288": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Lata"
  },
  "7410794016126": {
    "brandName": "Estrella Damm",
    "beerName": "Xibeca Damm Suave Lata"
  },
  "7463172803177": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "7501064103100": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064108242": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Botellín"
  },
  "7501064112546": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Lata"
  },
  "7501064191329": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191503": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191527": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064191572": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064192081": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064193040": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064195129": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064196454": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064196485": {
    "brandName": "Corona",
    "beerName": "Coronita Extra Botellín 21cl"
  },
  "7501064196690": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7501064199141": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Botellín"
  },
  "7503024460162": {
    "brandName": "Modelo",
    "beerName": "Modelo Pura Malta Botellín"
  },
  "7503028270187": {
    "brandName": "Guinness",
    "beerName": "Guinness Draught Botellín"
  },
  "7503038290809": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7503038290816": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "7772622220038": {
    "brandName": "Modelo",
    "beerName": "Modelo Especial Litrona"
  },
  "7792798004652": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "7792798011179": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Botellín"
  },
  "7792798014378": {
    "brandName": "Stella Artois",
    "beerName": "Stella Artois Original Litrona"
  },
  "7793147573126": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "7798339251523": {
    "brandName": "Guinness",
    "beerName": "Guinness Hop House 13 Botellín"
  },
  "7802130002540": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "7891991010481": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Lata"
  },
  "7891991298445": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Zero 0,0 Botellín"
  },
  "7891991305846": {
    "brandName": "Corona",
    "beerName": "Corona Extra Lata"
  },
  "8000483152007": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Litrona"
  },
  "8007950015018": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "8007950015025": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  },
  "8008440000026": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440010117": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440012012": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440012661": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440022004": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440049186": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440049575": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440112965": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440122087": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440122230": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440144003": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry 0,0% Botellín"
  },
  "8008440149121": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "8008440210456": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440210586": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212115": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440212214": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212313": {
    "brandName": "Peroni",
    "beerName": "Peroni Senza Glutine Sin Gluten Botellín"
  },
  "8008440212375": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212412": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212467": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212481": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212498": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212511": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212702": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440212726": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212771": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440212825": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440214065": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440215024": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440215062": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440219480": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440219589": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Doppio Malto Botellín"
  },
  "8008440219886": {
    "brandName": "Peroni",
    "beerName": "Peroni Gran Riserva Puro Malto Botellín"
  },
  "8008440222015": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440246066": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440249012": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440249036": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440249203": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8008440249227": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440249371": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440249425": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440346001": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8008440410016": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440410214": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440412164": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440412423": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440414014": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440449108": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Lata"
  },
  "8008440510013": {
    "brandName": "Peroni",
    "beerName": "Peroni Original Etiqueta Roja Botellín"
  },
  "8008440510044": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440510303": {
    "brandName": "Peroni",
    "beerName": "Peroni Senza Glutine Sin Gluten Botellín"
  },
  "8008440512093": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440512420": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440512468": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Lata"
  },
  "8008440512499": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440512543": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440512604": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440514004": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8008440522009": {
    "brandName": "Peroni",
    "beerName": "Peroni Tradizionale Litrona"
  },
  "8008440522016": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440522931": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440549204": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "8008440549426": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8151840010390": {
    "brandName": "Delirium Tremens",
    "beerName": "Delirium Red Lata"
  },
  "8329662018904": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "8410569000649": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569005125": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569005651": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569015698": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8410569020012": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Litrona"
  },
  "8410569037553": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Litrona"
  },
  "8410569120026": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro Tostada Lata"
  },
  "8410569320037": {
    "brandName": "Amstel",
    "beerName": "Amstel Oro 0,0 Tostada Lata"
  },
  "8410569615232": {
    "brandName": "Amstel",
    "beerName": "Amstel Radler Limón Lata"
  },
  "8410590011416": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Botellín"
  },
  "8410590012550": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Lata"
  },
  "8410590111086": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8410590111109": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Lata"
  },
  "8410590111178": {
    "brandName": "El Águila",
    "beerName": "El Águila Dorada Lata"
  },
  "8410590200087": {
    "brandName": "Tropical",
    "beerName": "Tropical Limón Botellín"
  },
  "8410590200094": {
    "brandName": "Tropical",
    "beerName": "Tropical Limón Botellín"
  },
  "8410590504727": {
    "brandName": "Tropical",
    "beerName": "Tropical Limón Botellín"
  },
  "8410655000393": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000409": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000430": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655000553": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000584": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000799": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655000874": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655001147": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655001772": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655001789": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Sin Gluten Botellín"
  },
  "8410655002083": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Eco Bio Botellín"
  },
  "8410655002502": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Litrona"
  },
  "8410655006173": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Botellín"
  },
  "8410655006388": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655006890": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Radler Limón Lata"
  },
  "8410655007019": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8410655010552": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410655011221": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "8410655071287": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Lata"
  },
  "8410655100284": {
    "brandName": "San Miguel",
    "beerName": "San Miguel 0,0 Botellín"
  },
  "8410655627316": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Botellín"
  },
  "8410700003911": {
    "brandName": "Moritz",
    "beerName": "Moritz Original Botellín"
  },
  "8410700004734": {
    "brandName": "Ámbar",
    "beerName": "Ámbar IPA Botellín"
  },
  "8410700005038": {
    "brandName": "Moritz",
    "beerName": "Moritz Radler Limón Botellín"
  },
  "8410700005335": {
    "brandName": "Moritz",
    "beerName": "Moritz 7 Botellín"
  },
  "8410700005915": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Morena Tostada Lata"
  },
  "8410700008367": {
    "brandName": "Moritz",
    "beerName": "Moritz 7 Botellín"
  },
  "8410700009234": {
    "brandName": "Ámbar",
    "beerName": "Ámbar Triple Zero Tostada 0,0 Lata"
  },
  "8410793000958": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793002129": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "8410793013842": {
    "brandName": "Estrella Damm",
    "beerName": "Xibeca Damm Suave Lata"
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
  "8410793026125": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Lata"
  },
  "8410793026132": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Lata"
  },
  "8410793032935": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793033123": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793033840": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793036124": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Lata"
  },
  "8410793036230": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Lata"
  },
  "8410793037336": {
    "brandName": "Voll-Damm",
    "beerName": "Voll-Damm Doble Malta Botellín"
  },
  "8410793153135": {
    "brandName": "Estrella Damm",
    "beerName": "Damm Lemon Clara Mediterránea Botellín"
  },
  "8410793183842": {
    "brandName": "Keler",
    "beerName": "Keler 18 Botellín"
  },
  "8410793183941": {
    "brandName": "Keler",
    "beerName": "Keler 18 Botellín"
  },
  "8410793186126": {
    "brandName": "Keler",
    "beerName": "Keler 18 Lata"
  },
  "8410793226334": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Clásica Lata"
  },
  "8410793226433": {
    "brandName": "Victoria",
    "beerName": "Victoria Málaga Clásica Lata"
  },
  "8410793246134": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Lata"
  },
  "8410793283931": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793286130": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Lata"
  },
  "8410793522436": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793523143": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Botellín"
  },
  "8410793606136": {
    "brandName": "Estrella Damm",
    "beerName": "Estrella Damm Mediterránea Lata"
  },
  "8410793630131": {
    "brandName": "Victoria",
    "beerName": "Victoria Sin 0,0 Botellín"
  },
  "8410793630155": {
    "brandName": "Victoria",
    "beerName": "Victoria Sin 0,0 Botellín"
  },
  "8410793633842": {
    "brandName": "Victoria",
    "beerName": "Victoria Sin 0,0 Botellín"
  },
  "8411090006018": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090014518": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Especial Botellín"
  },
  "8411090019100": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090019384": {
    "brandName": "El Alcázar",
    "beerName": "El Alcázar Especial Lata"
  },
  "8411090030105": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Litrona"
  },
  "8411090070057": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8411090101331": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Lata"
  },
  "8411090106251": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090110005": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8411090115161": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Botellín"
  },
  "8411090120004": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Especial Botellín"
  },
  "8411090171327": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Lata"
  },
  "8411090174120": {
    "brandName": "El Águila",
    "beerName": "El Águila Dorada Lata"
  },
  "8411090174144": {
    "brandName": "El Águila",
    "beerName": "El Águila Sin Filtrar Lata"
  },
  "8411090310603": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8411090617214": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8411090670004": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "8411090710021": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Lata"
  },
  "8411327001656": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327001717": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "8411327002639": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "8411327002721": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327002844": {
    "brandName": "Mahou",
    "beerName": "Mahou Maestra Doble Lúpulo Lata"
  },
  "8411327004046": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327007276": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "8411327007771": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327008235": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Session IPA Botellín"
  },
  "8411327010160": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Sin Filtrar Lata"
  },
  "8411327011037": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Botellín"
  },
  "8411327012263": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8411327013376": {
    "brandName": "Corona",
    "beerName": "Corona Extra Botellín"
  },
  "8411327013567": {
    "brandName": "Tropical",
    "beerName": "Tropical Pilsen Botellín"
  },
  "8411327013758": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Lata"
  },
  "8411327022125": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327031240": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327032018": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327052016": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327100076": {
    "brandName": "Mahou",
    "beerName": "Mahou Clásica Botellín"
  },
  "8411327121019": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327122122": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Lata"
  },
  "8411327131063": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Botellín"
  },
  "8411327132015": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Lata"
  },
  "8411327152013": {
    "brandName": "Mahou",
    "beerName": "Mahou Cinco Estrellas Lata"
  },
  "8411327221016": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Botellín"
  },
  "8411327731065": {
    "brandName": "Mahou",
    "beerName": "Mahou Sin (La Sin) Botellín"
  },
  "8411547210487": {
    "brandName": "Mahou",
    "beerName": "Mahou 0,0 Tostada Lata"
  },
  "8412598000072": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598000096": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598000485": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Lata"
  },
  "8412598000515": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598000775": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598000966": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598001024": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Lata"
  },
  "8412598001666": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Botellín"
  },
  "8412598001758": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598001765": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598001772": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598001819": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004018": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004025": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004032": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004056": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004650": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598004766": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598004896": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598005015": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598005060": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005121": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598005404": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598005480": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Tostada Botellín"
  },
  "8412598005831": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598005855": {
    "brandName": "Estrella Galicia",
    "beerName": "La Estrella de Galicia Receta Original Botellín"
  },
  "8412598005879": {
    "brandName": "1906",
    "beerName": "1906 Black Coupage Botellín"
  },
  "8412598006036": {
    "brandName": "1906",
    "beerName": "1906 Black Coupage Botellín"
  },
  "8412598006050": {
    "brandName": "1906",
    "beerName": "1906 Red Vintage Botellín"
  },
  "8412598006081": {
    "brandName": "1906",
    "beerName": "1906 Galician Irish Red Ale Botellín"
  },
  "8412598006111": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598007316": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Sin Gluten Botellín"
  },
  "8412598007903": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598008030": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598021312": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598023170": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8412598033117": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8412598800146": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia Especial Botellín"
  },
  "8413194676432": {
    "brandName": "Estrella de Levante",
    "beerName": "Estrella de Levante 0,0 Tostada Lata"
  },
  "8413510010001": {
    "brandName": "El Alcázar",
    "beerName": "El Alcázar Especial Botellín"
  },
  "8413681010473": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva 1925 Botellín"
  },
  "8413681010794": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Sin 0,0 Botellín"
  },
  "8413681021820": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva 1925 Botellín"
  },
  "8413681110791": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Sin 0,0 Botellín"
  },
  "8413681241112": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Lata"
  },
  "8413681300239": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Tradicional Botellín"
  },
  "8413681300482": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Lata"
  },
  "8413681300864": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681305500": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681305678": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681305692": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Reserva Roja Botellín"
  },
  "8413681306392": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8413681306408": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Lata"
  },
  "8413681307733": {
    "brandName": "Alhambra",
    "beerName": "Alhambra Especial Botellín"
  },
  "8414161001073": {
    "brandName": "Dorada",
    "beerName": "Dorada Especial Original Botellín"
  },
  "8414161001103": {
    "brandName": "Dorada",
    "beerName": "Dorada Pilsen Lata"
  },
  "8414161500286": {
    "brandName": "Dorada",
    "beerName": "Dorada Especial Original Botellín"
  },
  "8414606328659": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Jamonera Tostada Botellín"
  },
  "8414606911899": {
    "brandName": "La Virgen",
    "beerName": "La Virgen IPA Botellín"
  },
  "8420417193812": {
    "brandName": "Cruzcampo",
    "beerName": "Cruzcampo Pilsen Botellín"
  },
  "8436598200027": {
    "brandName": "La Salve",
    "beerName": "La Salve Lucía Roja Botellín"
  },
  "8436598200072": {
    "brandName": "La Salve",
    "beerName": "La Salve Lager Auténtica Botellín"
  },
  "8437010749032": {
    "brandName": "El Alcázar",
    "beerName": "El Alcázar Especial Lata"
  },
  "8437019189280": {
    "brandName": "La Virgen",
    "beerName": "La Virgen IPA Botellín"
  },
  "8437019189310": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Madrid Lager Botellín"
  },
  "8437019189433": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Madrid Lager Botellín"
  },
  "8437019189440": {
    "brandName": "La Virgen",
    "beerName": "La Virgen Jamonera Tostada Botellín"
  },
  "8437019693381": {
    "brandName": "La Sagra",
    "beerName": "La Sagra 0,0 Sin Alcohol Botellín"
  },
  "8437019693930": {
    "brandName": "La Sagra",
    "beerName": "La Sagra Sin Gluten Botellín"
  },
  "8441277034213": {
    "brandName": "1906",
    "beerName": "1906 Reserva Especial Botellín"
  },
  "8594404010816": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Lata"
  },
  "8594404014623": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "8594404023304": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro 0,0 Botellín"
  },
  "8594404110110": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Botellín"
  },
  "8594404115115": {
    "brandName": "Pilsner Urquell",
    "beerName": "Pilsner Urquell Original Lata"
  },
  "8606105157513": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8622942054570": {
    "brandName": "Super Bock",
    "beerName": "Super Bock 0,0% Sem Álcool Botellín"
  },
  "8712000011079": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000011413": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000014605": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "8712000018825": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000020309": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000020569": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Botellín"
  },
  "8712000022662": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "8712000026783": {
    "brandName": "Amstel",
    "beerName": "Amstel Light Botellín"
  },
  "8712000028268": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000030599": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000030810": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "8712000031053": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000031312": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000035457": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000035884": {
    "brandName": "Desperados",
    "beerName": "Desperados Red Botellín"
  },
  "8712000036072": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Botellín"
  },
  "8712000038175": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000038557": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000039837": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000039967": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000039981": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000050023": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050030": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050078": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050092": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050139": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050146": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000050702": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000050719": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000051273": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000051976": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "8712000052034": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000052317": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "8712000052508": {
    "brandName": "Heineken",
    "beerName": "Heineken Litrona"
  },
  "8712000052706": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000055349": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000055530": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Lata"
  },
  "8712000055745": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000056049": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000057114": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000057817": {
    "brandName": "Amstel",
    "beerName": "Amstel 0,0 Sin Alcohol Botellín"
  },
  "8712000057916": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Botellín"
  },
  "8712000058173": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Botellín"
  },
  "8712000058678": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000058852": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000058869": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000058937": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000058999": {
    "brandName": "Heineken",
    "beerName": "Heineken Silver Lata"
  },
  "8712000059026": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059040": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059057": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000059064": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000059118": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059125": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059149": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000059156": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000059293": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000059415": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000059804": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000059897": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Lata"
  },
  "8712000060275": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Lata"
  },
  "8712000060343": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000060596": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000060633": {
    "brandName": "Desperados",
    "beerName": "Desperados Lime Botellín"
  },
  "8712000060640": {
    "brandName": "Desperados",
    "beerName": "Desperados Virgin 0,0 Botellín"
  },
  "8712000060671": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000061081": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "8712000061098": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "8712000061135": {
    "brandName": "Desperados",
    "beerName": "Desperados Mojito Botellín"
  },
  "8712000061159": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8712000061425": {
    "brandName": "Desperados",
    "beerName": "Desperados Original Botellín"
  },
  "8712000061548": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000061647": {
    "brandName": "Amstel",
    "beerName": "Amstel Original Lata"
  },
  "8712000320003": {
    "brandName": "Heineken",
    "beerName": "Heineken 0,0 Botellín"
  },
  "8712000900205": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000900298": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Botellín"
  },
  "8712000901394": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8718969637459": {
    "brandName": "BrewDog",
    "beerName": "BrewDog Punk IPA Lata"
  },
  "8801027884961": {
    "brandName": "Guinness",
    "beerName": "Guinness 0,0 Lata"
  },
  "8850571930334": {
    "brandName": "Heineken",
    "beerName": "Heineken Original Lata"
  },
  "8888017620051": {
    "brandName": "Guinness",
    "beerName": "Guinness Foreign Extra Stout Botellín"
  },
  "8908000596276": {
    "brandName": "Budweiser",
    "beerName": "Budweiser Original Litrona"
  },
  "8936061260096": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "8936061260218": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Lata"
  },
  "8992756035332": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Lata"
  },
  "8992756333520": {
    "brandName": "San Miguel",
    "beerName": "San Miguel Especial Litrona"
  },
  "9310441003005": {
    "brandName": "Sapporo",
    "beerName": "Sapporo Premium Beer Botellín"
  },
  "9320000180467": {
    "brandName": "Peroni",
    "beerName": "Peroni Nastro Azzurro Botellín"
  },
  "9329982021058": {
    "brandName": "Asahi",
    "beerName": "Asahi Super Dry Botellín"
  },
  "9417198007659": {
    "brandName": "Estrella Galicia",
    "beerName": "Estrella Galicia 0,0 Botellín"
  },
  "9421030100057": {
    "brandName": "Carlsberg",
    "beerName": "Carlsberg Danish Pilsner Lata"
  }
};
