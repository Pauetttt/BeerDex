import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  expandUpceToEan13,
  EXTRA_BARCODE_TO_BEER_NAME,
  GS1_PREFIX_TO_BRAND,
  isValidEan,
  isValidEan8,
  isValidEan13,
  isValidGtin14,
  isValidUpce,
} from '../services/barcodeCatalog';
import { invalidateCatalogCache } from '../services/catalogCache';
import { AppDatabase, schema } from './index';
import {
  ACHIEVEMENTS_SEED,
  COSMETICS_SEED,
  ICONS_SEED,
  TITLES_SEED,
} from './fase2Seeds';

export {
  ACHIEVEMENTS_SEED,
  COSMETICS_SEED,
  expandUpceToEan13,
  EXTRA_BARCODE_TO_BEER_NAME,
  GS1_PREFIX_TO_BRAND,
  ICONS_SEED,
  isValidEan,
  isValidEan8,
  isValidEan13,
  isValidGtin14,
  isValidUpce,
  TITLES_SEED,
};

export interface SeedSummary {
  icons: number;
  titles: number;
  cosmetics: number;
  achievements: number;
  brands: number;
  beers: number;
}

export interface BeerSeedItem {
  name: string;
  format: 'lata' | 'botellin' | 'litrona';
  barcode: string;
  extraBarcodes?: string[];
  shortHistory: string;
  style: string;
  abv: string;
  country: string;
}

export interface BrandSeedInput {
  name: string;
  logoUrl: string;
  history: string;
  beers: BeerSeedItem[];
}

export const TOTAL_SEEDED_BEERS = 473;

export const BRANDS_SEED: BrandSeedInput[] = [
  {
    "name": "Estrella Galicia",
    "logoUrl": "brand://estrella-galicia",
    "history": "Fundada en A Coruña en 1906 por José María Rivera Corral, mantiene la tradición cervecera gallega con maduración lenta y lúpulo cultivado en Galicia.",
    "beers": [
      {
        "name": "Estrella Galicia Especial Botellín",
        "format": "botellin",
        "barcode": "8412598000089",
        "extraBarcodes": [
          "8412598004018",
          "8412598000515",
          "8412598004056",
          "8412598001772",
          "8412598004032",
          "8412598007903",
          "8412598800146",
          "8412598005404",
          "8412598008030",
          "8412598006111",
          "8412598004650",
          "15879716",
          "8412598023170",
          "8412598001765",
          "8412598001758",
          "8412598005831",
          "8412598021312",
          "8412598001819",
          "8412598004025",
          "8412598000096"
        ],
        "shortHistory": "Nacida en A Coruña en 1906, esta lager dorada madura durante semanas con lúpulo Nugget gallego para ofrecer un amargor equilibrado y limpio.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Estrella Galicia Especial Lata",
        "format": "lata",
        "barcode": "8412598000010",
        "extraBarcodes": [
          "8412598001024",
          "8412598000775",
          "8412598000072"
        ],
        "shortHistory": "La misma receta coruñesa de malta Pilsen y lúpulos aromáticos en lata de 33 cl, protegida de la luz para conservar intacta su frescura lupulada.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Estrella Galicia 0,0 Lata",
        "format": "lata",
        "barcode": "8412598000478",
        "extraBarcodes": [
          "8412598000485"
        ],
        "shortHistory": "Elaborada mediante fermentación interrumpida en A Coruña para conservar el aroma floral del lúpulo y un cuerpo maltoso pleno sin nada de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella Galicia 0,0 Botellín",
        "format": "botellin",
        "barcode": "8412598001659",
        "extraBarcodes": [
          "8412598001666",
          "9417198007659"
        ],
        "shortHistory": "Versión en botellín de vidrio de la sin alcohol coruñesa, con malta Pilsen gallega y lúpulo Nugget que mantienen intacto su frescor cervecero.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella Galicia 0,0 Tostada Botellín",
        "format": "botellin",
        "barcode": "8412598005473",
        "extraBarcodes": [
          "8412598005480"
        ],
        "shortHistory": "Cerveza tostada sin alcohol elaborada en Galicia con un coupage de seis maltas y lúpulos nobles que aportan notas de caramelo, cereal y pan.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella Galicia 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8412598007767",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de la 0,0 Tostada gallega de seis maltas, equilibrando el dulzor tostado del grano con un amargor refrescante sin gota de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella Galicia 0,0 Negra Botellín",
        "format": "botellin",
        "barcode": "8412598005398",
        "extraBarcodes": [],
        "shortHistory": "Cerveza negra sin alcohol nacida en A Coruña con cuatro maltas tostadas y torrefactas que despliegan aromas intensos a café, cacao y avellana.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella Galicia Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8412598002304",
        "extraBarcodes": [
          "8412598007316"
        ],
        "shortHistory": "Receta original de Estrella Galicia tratada con enzimas naturales para eliminar el gluten conservando todo su sabor dorado y amargor gallego.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Estrella Galicia Sin Gluten Lata",
        "format": "lata",
        "barcode": "8412598007309",
        "extraBarcodes": [],
        "shortHistory": "Lata de 33 cl con el sello de la espiga barrada, ofreciendo a los celíacos el carácter auténtico de la lager especial de Hijos de Rivera.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "La Estrella de Galicia Receta Original Botellín",
        "format": "botellin",
        "barcode": "8412598005848",
        "extraBarcodes": [
          "8412598005855"
        ],
        "shortHistory": "Inspirada en la primera receta alemana de primera generación de 1906 en A Coruña, una Pilsen suave, aromática y floral de trago muy fresco.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Shandy Estrella Galicia Limón Lata",
        "format": "lata",
        "barcode": "8412598001956",
        "extraBarcodes": [],
        "shortHistory": "Refrescante combinación de Estrella Galicia Especial con un toque cítrico de limón natural, ligera en alcohol y muy chispeante en el paladar.",
        "style": "Lager",
        "abv": "0.90",
        "country": "España"
      }
    ]
  },
  {
    "name": "Mahou",
    "logoUrl": "brand://mahou",
    "history": "Desde 1890 en la calle Amaniel de Madrid, Mahou ha acompañado las barras y terrazas españolas con recetas que combinan tradición cervecera alemana y carácter madrileño.",
    "beers": [
      {
        "name": "Mahou Cinco Estrellas Botellín",
        "format": "botellin",
        "barcode": "8411327131018",
        "extraBarcodes": [
          "8411327131063",
          "8411327001656",
          "8411327121019",
          "09095726",
          "8411327004046"
        ],
        "shortHistory": "Lanzada en 1969, esta lager madrileña de espuma cremosa combina lúpulos aromáticos y levadura propia para lograr un sabor suave y refrescante.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Lata",
        "format": "lata",
        "barcode": "8411327122016",
        "extraBarcodes": [
          "8411327152013",
          "8411327122122",
          "8411327132015"
        ],
        "shortHistory": "El icono dorado de Mahou nacido en 1969 en formato lata, ideal para enfriar rápido y disfrutar de su equilibrio entre cereal tostado y amargor fino.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Litrona",
        "format": "litrona",
        "barcode": "8411327131124",
        "extraBarcodes": [],
        "shortHistory": "Botella de un litro de Mahou Cinco Estrellas para compartir el sabor intenso y dorado de la receta madrileña de 1969 en cualquier reunión.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Clásica Botellín",
        "format": "botellin",
        "barcode": "8411327031066",
        "extraBarcodes": [
          "8411327032018",
          "8411327052016",
          "8411327031240",
          "8411327022125",
          "8411327100076"
        ],
        "shortHistory": "El sabor original de Mahou desde 1890 en botellín verde, una lager dorada, suave y muy equilibrada que forma parte de la historia de Madrid.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Mahou Clásica Lata",
        "format": "lata",
        "barcode": "8411327022019",
        "extraBarcodes": [
          "6418311052016"
        ],
        "shortHistory": "La clásica lata verde madrileña de trago fácil y refrescante, con aroma frutal sutil y burbuja viva perfecta para el aperitivo de cada día.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Mahou Clásica Litrona",
        "format": "litrona",
        "barcode": "8411327011013",
        "extraBarcodes": [],
        "shortHistory": "La receta madrileña original de 1890 en botella de litro, ligera y chispeante, pensada para compartir en sobremesas largas con amigos y buena música.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Session IPA Botellín",
        "format": "botellin",
        "barcode": "8411327004480",
        "extraBarcodes": [
          "8411327008235"
        ],
        "shortHistory": "Creada junto a los fundadores de Founders Brewing, esta Session IPA une el alma de Mahou con lúpulos americanos cítricos, resinosos y frescos.",
        "style": "IPA",
        "abv": "4.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Session IPA Lata",
        "format": "lata",
        "barcode": "8411327004503",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de la Session IPA de Mahou, con dry hopping de lúpulos aromáticos que regalan notas a pino, pomelo y fruta tropical muy bebible.",
        "style": "IPA",
        "abv": "4.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Sin Filtrar Botellín",
        "format": "botellin",
        "barcode": "8411327010139",
        "extraBarcodes": [],
        "shortHistory": "Receta de Cinco Estrellas sin filtrar que conserva la levadura en suspensión, luciendo una turbidez dorada natural y mayor sedosidad en boca.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Sin Filtrar Lata",
        "format": "lata",
        "barcode": "8411327010153",
        "extraBarcodes": [
          "8411327010160"
        ],
        "shortHistory": "Formato lata de Mahou Sin Filtrar, se recomienda girar suavemente antes de servir para despertar toda la cremosidad de su levadura y malta.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Sin Gluten Lata",
        "format": "lata",
        "barcode": "8411327001885",
        "extraBarcodes": [],
        "shortHistory": "Elaborada con el mismo carácter dorado y cremoso de la Cinco Estrellas madrileña pero apta para celíacos gracias a un proceso enzimático cuidadoso.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Cinco Estrellas Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8411327001908",
        "extraBarcodes": [],
        "shortHistory": "El botellín sin gluten de Mahou Cinco Estrellas que mantiene intacto su perfil de malta tostada ligera, espuma blanca firme y frescura.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Mahou Maestra Dunkel Botellín",
        "format": "botellin",
        "barcode": "8411327003971",
        "extraBarcodes": [],
        "shortHistory": "Creada por los maestros cerveceros de Madrid con tres tipos de malta tostada, despliega aromas a caramelo, pan horneado y un final seco elegante.",
        "style": "Tostada",
        "abv": "6.10",
        "country": "España"
      },
      {
        "name": "Mahou Maestra Doble Lúpulo Botellín",
        "format": "botellin",
        "barcode": "8411327001960",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada de doble lúpulo e intenso color ámbar cobrizo, con amargor sedoso, cuerpo envolvente y matices a café suave, miel y cítricos.",
        "style": "Tostada",
        "abv": "7.50",
        "country": "España"
      },
      {
        "name": "Mahou Maestra Doble Lúpulo Lata",
        "format": "lata",
        "barcode": "8411327002004",
        "extraBarcodes": [
          "8411327002844"
        ],
        "shortHistory": "La intensidad de Mahou Maestra Doble Lúpulo en lata de 33 cl, combinando lúpulos amargos y aromáticos en dos fases de ebullición.",
        "style": "Tostada",
        "abv": "7.50",
        "country": "España"
      },
      {
        "name": "Mahou 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8411327002745",
        "extraBarcodes": [
          "8411327002721",
          "8411327012263",
          "8411327007771",
          "8411547210487",
          "3458327002745"
        ],
        "shortHistory": "Mezcla de maltas caramelo y tostadas sin alcohol que mantiene matices dulces de cereal y un amargor sutil perfecto para cualquier hora del día.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Mahou 0,0 Tostada Botellín",
        "format": "botellin",
        "barcode": "8411327004428",
        "extraBarcodes": [],
        "shortHistory": "La 0,0 Tostada líder en España en botellín de vidrio, con aroma complejo a malta tostada, notas herbales de lúpulo y cuerpo sorprendente.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Mahou Sin (La Sin) Lata",
        "format": "lata",
        "barcode": "8411327722018",
        "extraBarcodes": [
          "8411327002639",
          "8411327001717",
          "8411327013758",
          "8411327007276"
        ],
        "shortHistory": "La histórica cerveza rubia sin alcohol de Mahou en lata azul, ligera, dorada y refrescante con todo el sabor tradicional a cereal malteado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Mahou Sin (La Sin) Botellín",
        "format": "botellin",
        "barcode": "8411327732017",
        "extraBarcodes": [
          "8411327731065",
          "8411327011037"
        ],
        "shortHistory": "El clásico botellín azul de Mahou Sin alcohol nacido en Madrid, manteniendo su cuerpo ligero de malta pálida y su espuma blanca refrescante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Mahou Barrica Original Botellín",
        "format": "botellin",
        "barcode": "8411327002523",
        "extraBarcodes": [],
        "shortHistory": "Lager envejecida en barricas de roble que aporta notas sutiles de vainilla, almendra y madera tostada sin perder la frescura característica de Mahou.",
        "style": "Tostada",
        "abv": "6.10",
        "country": "España"
      },
      {
        "name": "Mahou Barrica Bourbon Botellín",
        "format": "botellin",
        "barcode": "8411327002806",
        "extraBarcodes": [],
        "shortHistory": "Envejecida en barricas de roble americano que contuvieron bourbon, ofreciendo notas intensas de coco, vainilla, caramelo y cereal tostado.",
        "style": "Tostada",
        "abv": "6.60",
        "country": "España"
      },
      {
        "name": "Mahou Rosé Lata",
        "format": "lata",
        "barcode": "8411327010436",
        "extraBarcodes": [
          "91405852"
        ],
        "shortHistory": "Lager rosada y afrutada con infusión de frutos rojos como frambuesa y cereza, de burbuja chispeante, dulzor suave y acabado muy refrescante.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Mahou Radler Limón Lata",
        "format": "lata",
        "barcode": "8411327003308",
        "extraBarcodes": [],
        "shortHistory": "Combinación refrescante de cerveza Mahou con zumo natural de limón, ideal para los días de calor por su acidez cítrica y baja graduación.",
        "style": "Lager",
        "abv": "2.20",
        "country": "España"
      },
      {
        "name": "Mahou Negra Botellín",
        "format": "botellin",
        "barcode": "8411327521017",
        "extraBarcodes": [],
        "shortHistory": "Clásica cerveza negra madrileña estilo Munich Dunkel nacida en 1908, con espuma cremosa color marfil y aromas a café, regaliz y malta torrefacta.",
        "style": "Negra",
        "abv": "5.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "Alhambra",
    "logoUrl": "brand://alhambra",
    "history": "Nacida en Granada en 1925 al pie de Sierra Nevada, Cervezas Alhambra apuesta por procesos pausados, fermentaciones cuidadas y botellas icónicas sin prisas.",
    "beers": [
      {
        "name": "Alhambra Especial Lata",
        "format": "lata",
        "barcode": "8413681301236",
        "extraBarcodes": [
          "8413681300482",
          "8413681241112",
          "8413681306408"
        ],
        "shortHistory": "Elaborada en Granada con agua de Sierra Nevada y lúpulo Saaz, esta lager suave ofrece notas herbáceas ligeras y un frescor muy agradable en boca.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Alhambra Especial Botellín",
        "format": "botellin",
        "barcode": "8413681307719",
        "extraBarcodes": [
          "8413681305678",
          "8413681305500",
          "8413681306392",
          "8413681307733",
          "8413681300864"
        ],
        "shortHistory": "La clásica rubia de Granada en botellín de vidrio, de color dorado brillante y sabor equilibrado entre malta suave y notas florales de lúpulo.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Alhambra Especial Litrona",
        "format": "litrona",
        "barcode": "8413681110227",
        "extraBarcodes": [],
        "shortHistory": "Formato de un litro de Alhambra Especial para compartir el carácter dorado y pausado de las terrazas granadinas al pie de Sierra Nevada.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Alhambra Tradicional Litrona",
        "format": "litrona",
        "barcode": "8413681010152",
        "extraBarcodes": [],
        "shortHistory": "Herencia granadina desde 1925 en formato litrona clásica, con cuerpo medio, burbuja fina y un equilibrio dorado entre malta pálida y amargor suave.",
        "style": "Lager",
        "abv": "4.60",
        "country": "España"
      },
      {
        "name": "Alhambra Tradicional Botellín",
        "format": "botellin",
        "barcode": "8413681010275",
        "extraBarcodes": [
          "8413681300239"
        ],
        "shortHistory": "Botellín de la receta tradicional granadina de 1925, una pilsen ligera, limpia y muy refrescante pensada para el tapeo andaluz diario.",
        "style": "Lager",
        "abv": "4.60",
        "country": "España"
      },
      {
        "name": "Alhambra Reserva 1925 Botellín",
        "format": "botellin",
        "barcode": "8413681308655",
        "extraBarcodes": [
          "8413681021820",
          "8413681010473"
        ],
        "shortHistory": "Inspirada en los orígenes de 1925 y vestida con su célebre vidrio verde grabado, destaca por su lenta fermentación y sus notas florales intensas.",
        "style": "Lager",
        "abv": "6.40",
        "country": "España"
      },
      {
        "name": "Alhambra Reserva 1925 Lata",
        "format": "lata",
        "barcode": "8413681308631",
        "extraBarcodes": [],
        "shortHistory": "La emblemática receta granadina de fermentación lenta en lata verde mate, conservando sus matices a flor de azahar y caramelo dorado en cada trago.",
        "style": "Lager",
        "abv": "6.40",
        "country": "España"
      },
      {
        "name": "Alhambra Reserva Roja Botellín",
        "format": "botellin",
        "barcode": "8413681305746",
        "extraBarcodes": [
          "8413681305692"
        ],
        "shortHistory": "Reinterpretación granadina del estilo Bock con tono cobrizo profundo, aroma a frutos secos y cereal tostado y una calidez alcohólica muy redonda.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Alhambra Reserva Citra IPA Botellín",
        "format": "botellin",
        "barcode": "8413681307153",
        "extraBarcodes": [],
        "shortHistory": "IPA monovarietal elaborada en Granada exclusivamente con lúpulo Citra, desplegando intensos aromas a cítricos maduros y fruta tropical fresca.",
        "style": "IPA",
        "abv": "6.50",
        "country": "España"
      },
      {
        "name": "Alhambra Baltic Porter Botellín",
        "format": "botellin",
        "barcode": "8413681306378",
        "extraBarcodes": [],
        "shortHistory": "Cerveza negra de baja fermentación envejecida sin prisas en Granada, repleta de matices de chocolate negro, pasas, toffee y un final aterciopelado.",
        "style": "Negra",
        "abv": "7.80",
        "country": "España"
      },
      {
        "name": "Alhambra Sin 0,0 Lata",
        "format": "lata",
        "barcode": "8413681210743",
        "extraBarcodes": [],
        "shortHistory": "Opción sin alcohol de Granada elaborada con malta tostada y lúpulos aromáticos que aporta frescor floral y un cuerpo redondo sorprendentemente vivo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Alhambra Sin 0,0 Botellín",
        "format": "botellin",
        "barcode": "8413681308334",
        "extraBarcodes": [
          "8413681110791",
          "8413681010794"
        ],
        "shortHistory": "Botellín sin alcohol de Cervezas Alhambra, manteniendo el aroma herbal del lúpulo Saaz y una textura sedosa para disfrutar sin prisas.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Alhambra Especial Radler Limón Lata",
        "format": "lata",
        "barcode": "8413681306903",
        "extraBarcodes": [],
        "shortHistory": "Alhambra Especial mezclada con zumo natural de limón y ligeras notas de cardamomo, logrando una radler andaluza fragante y muy refrescante.",
        "style": "Lager",
        "abv": "2.60",
        "country": "España"
      },
      {
        "name": "Alhambra Numerada Barrica de Ron Botellín",
        "format": "botellin",
        "barcode": "8413681306989",
        "extraBarcodes": [],
        "shortHistory": "Edición de autor envejecida en barricas que contuvieron ron granadino, aportando notas cálidas de caña de azúcar, vainilla, coco y madera.",
        "style": "Tostada",
        "abv": "6.90",
        "country": "España"
      },
      {
        "name": "Alhambra Numerada Amontillado Botellín",
        "format": "botellin",
        "barcode": "8413681316650",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de guarda criada en botas de vino amontillado del Marco de Jerez, con aromas elegantes a avellana, roble viejo y caramelo salino.",
        "style": "Tostada",
        "abv": "6.60",
        "country": "España"
      }
    ]
  },
  {
    "name": "La Virgen",
    "logoUrl": "brand://la-virgen",
    "history": "Proyecto cervecero nacido en Madrid en 2011 con espíritu artesanal, agua pura de la sierra y recetas honestas sin filtrar ni pasteurizar.",
    "beers": [
      {
        "name": "La Virgen Madrid Lager Botellín",
        "format": "botellin",
        "barcode": "8414606328635",
        "extraBarcodes": [
          "8437019189433",
          "8437019189310"
        ],
        "shortHistory": "Lager artesanal madrileña elaborada con agua de la sierra, cuatro maltas seleccionadas y guarda en frío prolongada para un trago limpio y directo.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "La Virgen Jamonera Tostada Botellín",
        "format": "botellin",
        "barcode": "8437019189426",
        "extraBarcodes": [
          "8414606328659",
          "8437019189440"
        ],
        "shortHistory": "Amber Ale tostada pensada para maridar con tapeo madrileño, rica en maltas caramelo que aportan dulzor ligero y un final seco muy gastronómico.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "La Virgen IPA Botellín",
        "format": "botellin",
        "barcode": "8437019189006",
        "extraBarcodes": [
          "8437019189280",
          "8414606911899"
        ],
        "shortHistory": "Clásica IPA de corte americano elaborada en Madrid sin filtrar, con amargor firme resinoso y equilibrio de malta pálida para amantes del lúpulo.",
        "style": "IPA",
        "abv": "6.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "Estrella Damm",
    "logoUrl": "brand://estrella-damm",
    "history": "Fundada en Barcelona en 1876 por August Kuentzmann Damm, elabora cervezas mediterráneas con cebada de proximidad, arroz y lúpulo en la costa catalana.",
    "beers": [
      {
        "name": "Estrella Damm Mediterránea Botellín",
        "format": "botellin",
        "barcode": "8410793021946",
        "extraBarcodes": [
          "8410793022943",
          "8410793023841",
          "8410793023858",
          "8410793283931",
          "8410793522436",
          "8410793523143"
        ],
        "shortHistory": "Elaborada en Barcelona desde 1876 con malta de cebada, arroz y lúpulo, esta lager mediterránea resulta brillante, fresca y muy fácil de beber.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Estrella Damm Mediterránea Lata",
        "format": "lata",
        "barcode": "8410793546135",
        "extraBarcodes": [
          "8410793026125",
          "8410793246134",
          "8410793286130",
          "8410793606136"
        ],
        "shortHistory": "La cerveza clásica de Barcelona en lata roja de 33 cl, con burbuja vivaz y aroma limpio a cereal blanco perfecta para acompañar tardes de terraza.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Free Damm 0,0 Lata",
        "format": "lata",
        "barcode": "8410793066138",
        "extraBarcodes": [],
        "shortHistory": "Cerveza mediterránea 0,0 % elaborada mediante destilación al vacío para conservar los aromas naturales de la malta y el frescor del lúpulo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Free Damm 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410793063847",
        "extraBarcodes": [],
        "shortHistory": "Versión en botellín de vidrio de Free Damm 0,0 %, limpia, dorada y refrescante con todas las notas florales y de cereal recién malteado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Free Damm Tostada 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410793673848",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada 0,0 % de Damm elaborada con maltas torrefactas que aportan aromas a café suave, cacao y caramelo sin nada de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Free Damm Tostada 0,0 Lata",
        "format": "lata",
        "barcode": "8410793676139",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Free Damm Tostada 0,0 %, equilibrando matices de cereal tostado y maíz con un amargor delicado y espuma muy cremosa.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Free Damm Limón 0,0 Lata",
        "format": "lata",
        "barcode": "8410793296139",
        "extraBarcodes": [],
        "shortHistory": "Clara mediterránea 0,0 % elaborada con Free Damm y zumo de limones maduros y limas, ofreciendo una frescura cítrica intensa sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Complot IPA Botellín",
        "format": "botellin",
        "barcode": "8410793121936",
        "extraBarcodes": [],
        "shortHistory": "Primera IPA mediterránea de Damm elaborada con lúpulo cultivado en Prades, combinando notas cítricas de naranja madura y amargor limpio.",
        "style": "IPA",
        "abv": "6.60",
        "country": "España"
      },
      {
        "name": "Complot IPA Lata",
        "format": "lata",
        "barcode": "8410793126139",
        "extraBarcodes": [],
        "shortHistory": "La IPA mediterránea de Prades en lata de 33 cl, con ocho variedades de lúpulo que despiertan intensas notas de pomelo, pino y fruta tropical.",
        "style": "IPA",
        "abv": "6.60",
        "country": "España"
      },
      {
        "name": "Inedit Damm Trigo y Especias Botellín",
        "format": "botellin",
        "barcode": "8410793331939",
        "extraBarcodes": [],
        "shortHistory": "Creada por Ferran Adrià y los maestros de Damm con cebada, trigo, piel de naranja, cilantro y regaliz para la alta gastronomía mediterránea.",
        "style": "Trigo",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Daura Damm Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8410793262936",
        "extraBarcodes": [],
        "shortHistory": "La cerveza sin gluten más premiada del mundo, elaborada en Barcelona con malta de cebada manteniendo todo el sabor de una lager mediterránea.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Daura Damm Sin Gluten Lata",
        "format": "lata",
        "barcode": "8410793266132",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Daura Damm apta para celíacos, con menos de tres partes por millón de gluten y un perfil dorado, fresco y muy equilibrado.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Daura Märzen Doble Malta Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8410793491930",
        "extraBarcodes": [],
        "shortHistory": "Cerveza doble malta sin gluten de Damm, con potente cuerpo tostado, siete grados y notas intensas a cereal caramelizado para celíacos.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Bock-Damm Negra Botellín",
        "format": "botellin",
        "barcode": "8410793041944",
        "extraBarcodes": [],
        "shortHistory": "Cerveza negra estilo Munich Bock nacida en Barcelona en 1888, elaborada con tres maltas que brindan notas de cacao, café tostado y caramelo.",
        "style": "Negra",
        "abv": "5.90",
        "country": "España"
      },
      {
        "name": "AK Damm Alsaciana Botellín",
        "format": "botellin",
        "barcode": "8410793162939",
        "extraBarcodes": [],
        "shortHistory": "Homenaje a August Kuentzmann Damm que une el carácter alsaciano de pura malta con la ligereza mediterránea en una rubia fina y aromática.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Damm Lemon Clara Mediterránea Lata",
        "format": "lata",
        "barcode": "8410793156136",
        "extraBarcodes": [],
        "shortHistory": "La clásica clara barcelonesa elaborada con seis partes de Estrella Damm y cuatro de limones del Mediterráneo con un toque sutil de lima.",
        "style": "Lager",
        "abv": "3.20",
        "country": "España"
      },
      {
        "name": "Xibeca Damm Suave Lata",
        "format": "lata",
        "barcode": "8410793016133",
        "extraBarcodes": [
          "8410793013842",
          "7410794016126"
        ],
        "shortHistory": "Mítica Pilsen catalana nacida en los años treinta como cerveza de mesa para compartir, de sabor muy suave, dorado y ligeramente lupulado.",
        "style": "Lager",
        "abv": "4.60",
        "country": "España"
      },
      {
        "name": "Xibeca Damm Tradicional Litrona",
        "format": "litrona",
        "barcode": "8410793013118",
        "extraBarcodes": [],
        "shortHistory": "La emblemática botella de un litro de Xibeca Damm que popularizó el formato familiar en Cataluña, fresca, ligera y perfecta en la mesa.",
        "style": "Lager",
        "abv": "4.60",
        "country": "España"
      },
      {
        "name": "Damm Lemon Clara Mediterránea Botellín",
        "format": "botellin",
        "barcode": "8410793153845",
        "extraBarcodes": [
          "8410793153135"
        ],
        "shortHistory": "Clara mediterránea en botellín elaborada con Estrella Damm y zumo de limones y limas del Mediterráneo para una frescura cítrica equilibrada.",
        "style": "Lager",
        "abv": "3.20",
        "country": "España"
      }
    ]
  },
  {
    "name": "San Miguel",
    "logoUrl": "brand://san-miguel",
    "history": "Con raíces viajeras desde 1890 y arraigo en España desde 1957, San Miguel destaca por su espíritu explorador y amplia variedad de estilos.",
    "beers": [
      {
        "name": "San Miguel Especial Botellín",
        "format": "botellin",
        "barcode": "8410655008993",
        "extraBarcodes": [
          "8410655000409",
          "8410655000799",
          "8410655010552",
          "8410655000553",
          "8410655000584",
          "8410655000393",
          "8410655627316",
          "5010153771677",
          "01414107",
          "8410655000874",
          "8410655006388"
        ],
        "shortHistory": "Lager dorada nacida en 1957 con equilibrio entre malta tostada ligera y lúpulos aromáticos, ofreciendo un trago suave y un final refrescante.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "San Miguel Especial Lata",
        "format": "lata",
        "barcode": "8410655000010",
        "extraBarcodes": [
          "8410655000430",
          "8410655007019",
          "8410655001147",
          "5014379029758",
          "5014379030020",
          "5014379029864",
          "5014379012866",
          "5014379029833",
          "8410655001772",
          "8992756035332"
        ],
        "shortHistory": "Formato lata de la icónica San Miguel Especial, de color oro brillante, espuma blanca consistente y notas suaves a cereal y fruta blanca.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "San Miguel Especial Litrona",
        "format": "litrona",
        "barcode": "8410655007163",
        "extraBarcodes": [
          "8410655002502",
          "8992756333520",
          "5010153773671"
        ],
        "shortHistory": "La botella de un litro más viajera de las barras españolas, con el equilibrio clásico de San Miguel entre dulzor de malta y amargor sutil.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "San Miguel 0,0 Lata",
        "format": "lata",
        "barcode": "8410655006142",
        "extraBarcodes": [
          "8410655071287",
          "8410655011221",
          "5010153871148",
          "5010153771615"
        ],
        "shortHistory": "Pionera en España desde 2001 entre las cervezas sin alcohol, mantiene un perfil limpio a cebada malteada y lúpulo herbal sin nada de etanol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410655009006",
        "extraBarcodes": [
          "8410655006173",
          "8410655100284"
        ],
        "shortHistory": "Botellín de vidrio de San Miguel 0,0 %, con aromas suaves a malta pálida, notas florales y un paso por boca fresco y muy equilibrado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8410655008290",
        "extraBarcodes": [],
        "shortHistory": "Cerveza sin alcohol tostada con tres tipos de malta que aportan color ámbar brillante y notas intensas a caramelo, cereal y frutos secos.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel 0,0 Tostada Botellín",
        "format": "botellin",
        "barcode": "8410655008337",
        "extraBarcodes": [],
        "shortHistory": "Formato botellín de la 0,0 Tostada de San Miguel, combinando el carácter de las maltas torrefactas con un amargor suave sin graduación.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel Selecta Tostada Botellín",
        "format": "botellin",
        "barcode": "8410655001208",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada madurada en bodega con tres tipos de lúpulo centroeuropeo y maltas caramelizadas que evocan frutos secos y pan recién hecho.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "España"
      },
      {
        "name": "San Miguel Selecta Tostada Lata",
        "format": "lata",
        "barcode": "8410655001222",
        "extraBarcodes": [],
        "shortHistory": "La intensa Selecta XV de San Miguel en lata de 33 cl, con tres variedades de malta y tres de lúpulo maduradas lentamente para mayor cuerpo.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "España"
      },
      {
        "name": "San Miguel Manila IPA Botellín",
        "format": "botellin",
        "barcode": "8410655006821",
        "extraBarcodes": [],
        "shortHistory": "Homenaje a sus orígenes con lúpulos aromáticos de aroma tropical, combinando notas a maracuyá, pomelo y resina con un cuerpo maltoso firme.",
        "style": "IPA",
        "abv": "5.80",
        "country": "España"
      },
      {
        "name": "San Miguel Magna Botellín",
        "format": "botellin",
        "barcode": "8410655007088",
        "extraBarcodes": [],
        "shortHistory": "Golden Lager lupulada en tres tiempos con un toque extra de intensidad aromática, pensada para disfrutar despacio de su sabor tostado y herbal.",
        "style": "Lager",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "San Miguel Magna Lata",
        "format": "lata",
        "barcode": "8410655007101",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de Magna de San Miguel, una Golden Lager contemporánea con lupulado tardío que realza sus notas herbales y de malta dorada.",
        "style": "Lager",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "San Miguel Magna Tostada 0,0 Lata",
        "format": "lata",
        "barcode": "8410655007415",
        "extraBarcodes": [],
        "shortHistory": "La intensidad de Magna en versión 0,0 % tostada, elaborada con maltas seleccionadas y lupulado en tres tiempos para un sabor complejo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel Radler Limón Lata",
        "format": "lata",
        "barcode": "8410655006432",
        "extraBarcodes": [
          "8410655006890"
        ],
        "shortHistory": "Combinación de San Miguel Especial con zumo natural de limón, logrando una radler luminosa, cítrica y muy refrescante para cualquier momento.",
        "style": "Lager",
        "abv": "2.60",
        "country": "España"
      },
      {
        "name": "San Miguel Radler Limón 0,0 Lata",
        "format": "lata",
        "barcode": "8410655003486",
        "extraBarcodes": [],
        "shortHistory": "Toda la frescura del zumo natural de limón unido a San Miguel 0,0 %, una alternativa cítrica y chispeante con cero por ciento de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "San Miguel Especial Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8410655002410",
        "extraBarcodes": [
          "8410655001789"
        ],
        "shortHistory": "La receta clásica de San Miguel Especial adaptada para personas celíacas, manteniendo intactos su brillo dorado, espuma y sabor equilibrado.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "San Miguel Eco Bio Botellín",
        "format": "botellin",
        "barcode": "8410655001215",
        "extraBarcodes": [
          "8410655002083"
        ],
        "shortHistory": "Elaborada con maltas y lúpulos procedentes de agricultura ecológica certificada, ofreciendo una lager fresca, limpia y respetuosa.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "San Miguel Fresca Botellín",
        "format": "botellin",
        "barcode": "8410655001932",
        "extraBarcodes": [],
        "shortHistory": "Lager estival en botella transparente pensada para beber muy fría con una rodaja de lima, de trago suave, cítrico y sumamente ligero.",
        "style": "Lager",
        "abv": "4.40",
        "country": "España"
      }
    ]
  },
  {
    "name": "Cruzcampo",
    "logoUrl": "brand://cruzcampo",
    "history": "Nacida en Sevilla en 1904 junto al templete de la Cruz del Campo, representa la tradición cervecera andaluza pensada para servirse muy fría.",
    "beers": [
      {
        "name": "Cruzcampo Pilsen Botellín",
        "format": "botellin",
        "barcode": "8411090010046",
        "extraBarcodes": [
          "8420417193812",
          "8411090006018",
          "08633965",
          "59595847",
          "8411090106251",
          "8411090019100",
          "8411090110005"
        ],
        "shortHistory": "Pilsen sevillana desde 1904 ligera y chispeante, elaborada para servirse bajo cero con un amargor amable y refrescante frente al calor andaluz.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Cruzcampo Pilsen Lata",
        "format": "lata",
        "barcode": "8411090010107",
        "extraBarcodes": [
          "8411090710021",
          "8411090171327",
          "8411090101331"
        ],
        "shortHistory": "El sabor clásico sevillano en lata de 33 cl, con burbuja fina, notas sutiles a manzana verde y un paso ligero ideal para el aperitivo diario.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Cruzcampo Pilsen Litrona",
        "format": "litrona",
        "barcode": "8411090032000",
        "extraBarcodes": [
          "8411090030105"
        ],
        "shortHistory": "La clásica litrona de Cruzcampo Pilsen presente en toda Andalucía, ligera, rubia y muy refrescante cuando se sirve a temperatura glacial.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Cruzcampo Especial Lata",
        "format": "lata",
        "barcode": "8411090112009",
        "extraBarcodes": [],
        "shortHistory": "Receta Especial de Cruzcampo elaborada con el sol de Andalucía, combinando malta caramelizada ligera y mayor cuerpo sin perder su frescura.",
        "style": "Lager",
        "abv": "5.60",
        "country": "España"
      },
      {
        "name": "Cruzcampo Especial Botellín",
        "format": "botellin",
        "barcode": "8411090014525",
        "extraBarcodes": [
          "8411090120004",
          "8411090014518"
        ],
        "shortHistory": "Botellín de Cruzcampo Especial con lúpulo Perle y levadura seleccionada en Sevilla, logrando un color dorado cálido y sabor muy equilibrado.",
        "style": "Lager",
        "abv": "5.60",
        "country": "España"
      },
      {
        "name": "Cruzcampo Gran Reserva Botellín",
        "format": "botellin",
        "barcode": "8411090110388",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada de color ámbar brillante y largo reposo en bodega en Sevilla, con matices intensos a malta caramelizada, fruta madura y regaliz.",
        "style": "Tostada",
        "abv": "6.40",
        "country": "España"
      },
      {
        "name": "Cruzcampo Gran Reserva Lata",
        "format": "lata",
        "barcode": "8411090111347",
        "extraBarcodes": [],
        "shortHistory": "La Gran Reserva sevillana de tres maltas en lata de 33 cl, con espuma cremosa color marfil, aroma tostado intenso y amargor aromático.",
        "style": "Tostada",
        "abv": "6.40",
        "country": "España"
      },
      {
        "name": "Cruzcampo 0,0 Lata",
        "format": "lata",
        "barcode": "8411090310139",
        "extraBarcodes": [],
        "shortHistory": "Versión sin alcohol de espíritu sevillano con fermentación controlada para mantener su frescor dorado y suavidad característica en cada sorbo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Cruzcampo 0,0 Botellín",
        "format": "botellin",
        "barcode": "8411090306255",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Cruzcampo 0,0 % pensado para servirse muy frío en barra o terraza, con notas frutales suaves y cero por ciento de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Cruzcampo Andalusian IPA Botellín",
        "format": "botellin",
        "barcode": "8411090019131",
        "extraBarcodes": [],
        "shortHistory": "IPA elaborada en la microcervecería sevillana La Fábrica con lúpulos cítricos y aroma a naranja andaluza que suaviza su amargor lupulado.",
        "style": "IPA",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Cruzcampo IPA Lata",
        "format": "lata",
        "barcode": "8411090017113",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de la IPA de Cruzcampo con lúpulos aromáticos americanos que aportan frescor cítrico, notas de mango y un amargor accesible.",
        "style": "IPA",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Cruzcampo Trigo Botellín",
        "format": "botellin",
        "barcode": "8411090617139",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo de inspiración artesana nacida en Sevilla, turbia, sedosa y aromática con notas especiadas de clavo y fruta madura.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Cruzcampo Tremenda Lata",
        "format": "lata",
        "barcode": "8411090024241",
        "extraBarcodes": [],
        "shortHistory": "Lager ligera con la mitad de alcohol pero todo el carácter cervecero de Cruzcampo, utilizando levadura propia y lúpulos aromáticos seleccionados.",
        "style": "Lager",
        "abv": "2.40",
        "country": "España"
      },
      {
        "name": "Cruzcampo Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8411090611014",
        "extraBarcodes": [],
        "shortHistory": "Todo el sabor refrescante de Cruzcampo en versión apta para celíacos, conservando su ligereza pilsen y su espuma blanca muy cremosa.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Cruzcampo Radler Limón Lata",
        "format": "lata",
        "barcode": "8411090419054",
        "extraBarcodes": [],
        "shortHistory": "Cruzcampo mezclada con zumo natural de limón andaluz, ofreciendo una bebida refrescante, cítrica y ligera perfecta para combatir el calor.",
        "style": "Lager",
        "abv": "2.00",
        "country": "España"
      }
    ]
  },
  {
    "name": "Ámbar",
    "logoUrl": "brand://ambar",
    "history": "Fundada en Zaragoza en 1900 como La Zaragozana, es una de las cerveceras independientes más antiguas de España y pionera en estilos especiales.",
    "beers": [
      {
        "name": "Ámbar Especial Botellín",
        "format": "botellin",
        "barcode": "8410700003461",
        "extraBarcodes": [
          "84107114"
        ],
        "shortHistory": "Elaborada en Zaragoza desde 1900 con lúpulo recién molido, destaca por su color dorado intenso y un equilibrio redondo entre malta y amargor.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "Ámbar Especial Lata",
        "format": "lata",
        "barcode": "8410700001023",
        "extraBarcodes": [
          "84107015"
        ],
        "shortHistory": "La lager aragonesa de referencia en lata, conservando intactos los aceites esenciales de su lúpulo recién molido para un aroma fresco y vivo.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "Ámbar 1900 Sin Filtrar Botellín",
        "format": "botellin",
        "barcode": "8410700008718",
        "extraBarcodes": [
          "84107107"
        ],
        "shortHistory": "Pale Ale aragonesa inspirada en los orígenes de 1900 con una mezcla de maltas tostadas, toque afrutado suave y amargor floral elegante.",
        "style": "Tostada",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Ámbar 1900 Sin Filtrar Lata",
        "format": "lata",
        "barcode": "8410700008732",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de Ámbar 1900 Sin Filtrar, una Pale Ale de alta fermentación con velo natural de levadura y notas frescas a cereal y flor.",
        "style": "Tostada",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Ámbar Export Botellín",
        "format": "botellin",
        "barcode": "8410700002273",
        "extraBarcodes": [
          "84107091",
          "00005760"
        ],
        "shortHistory": "Tres maltas y doble periodo de fermentación en Zaragoza dan vida a esta cerveza tostada robusta con notas a pan torrado, caramelo y fruta seca.",
        "style": "Tostada",
        "abv": "7.00",
        "country": "España"
      },
      {
        "name": "Ámbar Export Lata",
        "format": "lata",
        "barcode": "8410700002242",
        "extraBarcodes": [],
        "shortHistory": "El icono de tres maltas de Zaragoza en lata roja y dorada, con siete grados de cuerpo cremoso, color rojizo y largo final tostado.",
        "style": "Tostada",
        "abv": "7.00",
        "country": "España"
      },
      {
        "name": "Ámbar Negra Botellín",
        "format": "botellin",
        "barcode": "8410700001368",
        "extraBarcodes": [],
        "shortHistory": "Cerveza negra aragonesa única con un toque de azúcar de caña y maltas torrefactas que mezclan recuerdos de regaliz negro, café y chocolate.",
        "style": "Negra",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Ámbar 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8410700003645",
        "extraBarcodes": [],
        "shortHistory": "Primera cerveza sin alcohol con fibra alimentaria elaborada en Zaragoza, ofreciendo sabor tostado ligero y un final seco sin graduación.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Ámbar Triple Zero 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410700007957",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Ámbar Triple Zero sin alcohol, sin azúcar y baja en calorías, elaborada con lúpulo recién molido en Zaragoza para máximo aroma.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Ámbar Triple Zero Tostada 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410700006219",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada Triple Zero de Ámbar sin alcohol ni azúcares, rica en matices de malta caramelizada y pan tostado con total ligereza.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Ámbar Triple Zero Tostada 0,0 Lata",
        "format": "lata",
        "barcode": "8410700006240",
        "extraBarcodes": [
          "8410700009234"
        ],
        "shortHistory": "Formato lata de Ámbar Triple Zero Tostada 0,0 %, ideal para disfrutar en frío del carácter de las maltas tostadas aragonesas sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Ámbar IPA Botellín",
        "format": "botellin",
        "barcode": "8410700004703",
        "extraBarcodes": [
          "8410700004734"
        ],
        "shortHistory": "India Pale Ale aragonesa con lúpulos americanos recién molidos que aportan explosión cítrica, matices resinosos y un cuerpo ámbar muy bebible.",
        "style": "IPA",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "Ámbar IPA Lata",
        "format": "lata",
        "barcode": "8410700008145",
        "extraBarcodes": [],
        "shortHistory": "La IPA de Ámbar en lata de 33 cl, conservando la intensidad aromática de sus flores de lúpulo recién molidas con notas tropicales y florales.",
        "style": "IPA",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "Ámbar Caesaraugusta Trigo Botellín",
        "format": "botellin",
        "barcode": "8410700002471",
        "extraBarcodes": [],
        "shortHistory": "Primera cerveza española de trigo inspirada en las recetas romanas de Zaragoza, suave, turbia y refrescante con notas de fruta blanca y clavo.",
        "style": "Trigo",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "Ámbar Especial Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8410700002426",
        "extraBarcodes": [
          "84107312"
        ],
        "shortHistory": "Lanzada en 2008 como pionera mundial para celíacos, mantiene intacto el perfil dorado y lupulado de Ámbar Especial libre de gluten.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "Ámbar Radler Limón Lata",
        "format": "lata",
        "barcode": "8410700003799",
        "extraBarcodes": [],
        "shortHistory": "Ámbar Especial combinada con zumo natural de limón mediterráneo, refrescante, ligera y con un equilibrio cítrico muy natural en boca.",
        "style": "Lager",
        "abv": "2.50",
        "country": "España"
      },
      {
        "name": "Ámbar Morena Tostada Lata",
        "format": "lata",
        "barcode": "8410700008282",
        "extraBarcodes": [
          "8410700005915"
        ],
        "shortHistory": "Lager tostada elaborada en Zaragoza con maltas secadas a fuego lento durante veinticuatro horas, de color ámbar intenso y sabor muy redondo.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "Heineken",
    "logoUrl": "brand://heineken",
    "history": "Creada en Ámsterdam en 1873 por Gerard Adriaan Heineken, famosa por su levadura A exclusiva y sus icónicos envases verdes reconocidos mundialmente.",
    "beers": [
      {
        "name": "Heineken Original Botellín",
        "format": "botellin",
        "barcode": "8712000900304",
        "extraBarcodes": [
          "8712000020309",
          "8712000900298",
          "3119780265794",
          "3119780259069",
          "8712000031053",
          "3119780268306",
          "8712000018825",
          "8712000900205",
          "8712000030599",
          "78935495",
          "81120703",
          "3119780259007",
          "3830001714692"
        ],
        "shortHistory": "Pilsener neerlandesa elaborada desde 1873 únicamente con agua, cebada malteada, lúpulo y su levadura tipo A de notas ligeramente afrutadas.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken Original Lata",
        "format": "lata",
        "barcode": "8712000900045",
        "extraBarcodes": [
          "8712000035457",
          "8712000011079",
          "3119780268801",
          "87120158",
          "7030019532103",
          "8712000028268",
          "8712000901394",
          "5901559951162",
          "0086428430506",
          "0072890000026",
          "3119780259700",
          "8850571930334",
          "5035766062752",
          "5998818171096",
          "8712000011413",
          "3119780268825",
          "3119780015030",
          "3119780259625",
          "8712000031312",
          "8712000055349",
          "8712000058852",
          "8712000058869",
          "8712000058937",
          "8712000059057",
          "8712000059064",
          "8712000060343",
          "8712000061159",
          "87120103"
        ],
        "shortHistory": "La emblemática lata verde de Ámsterdam que protege la cerveza de la luz para mantener constante su frescor herbal y su espuma blanca fina.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken 0,0 Botellín",
        "format": "botellin",
        "barcode": "8712000053116",
        "extraBarcodes": [
          "8712000320003",
          "8712000050146",
          "8712000050030",
          "8712000050139",
          "8712000050023",
          "8712000050078",
          "8712000050092",
          "8712000051273",
          "8712000056049"
        ],
        "shortHistory": "Elaborada dos veces y desalcoholizada suavemente en Países Bajos para preservar las notas frutales de la levadura A con solo 69 calorías.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken 0,0 Lata",
        "format": "lata",
        "barcode": "8712000310011",
        "extraBarcodes": [
          "8411090310603",
          "8712000039967",
          "8712000039981",
          "8712000050719",
          "8712000052034",
          "8712000052706",
          "8712000059897",
          "8712000050702",
          "8712000058678",
          "8712000059804"
        ],
        "shortHistory": "Formato lata azul de la 0,0 neerlandesa, pensada para disfrutar de una lager ligera, limpia y malteada en cualquier momento sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken Silver Botellín",
        "format": "botellin",
        "barcode": "8712000620011",
        "extraBarcodes": [
          "8712000058173",
          "8712000057916"
        ],
        "shortHistory": "Madurada a menos un grado centígrado para lograr una lager extra refrescante con menor amargor y un trago sumamente suave y cristalino.",
        "style": "Lager",
        "abv": "4.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken Silver Lata",
        "format": "lata",
        "barcode": "8712000610012",
        "extraBarcodes": [
          "8712000058999"
        ],
        "shortHistory": "La versión helada y ligera de Heineken en lata plateada, ideal para servir muy fría y disfrutar de un acabado limpio sin amargor marcado.",
        "style": "Lager",
        "abv": "4.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken Litrona",
        "format": "litrona",
        "barcode": "3119780015306",
        "extraBarcodes": [
          "3119780260614",
          "3119780268788",
          "8712000022662",
          "8712000052317",
          "8712000052508",
          "8712000030810",
          "7793147573126"
        ],
        "shortHistory": "Formato de gran capacidad de la lager neerlandesa de fermentación horizontal, manteniendo su sabor equilibrado con notas a malta dulce.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Países Bajos"
      },
      {
        "name": "Heineken Pure Malt Lata",
        "format": "lata",
        "barcode": "5942105000941",
        "extraBarcodes": [],
        "shortHistory": "Edición cien por cien pura malta de Heineken en lata verde clásica, destacando por su espuma blanca persistente y aroma limpio a cereal.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Países Bajos"
      }
    ]
  },
  {
    "name": "Guinness",
    "logoUrl": "brand://guinness",
    "history": "Nacida en St. James’s Gate en Dublín en 1759 cuando Arthur Guinness firmó el famoso contrato de 9000 años, referente mundial de la cerveza negra.",
    "beers": [
      {
        "name": "Guinness Draught Lata",
        "format": "lata",
        "barcode": "5000213008515",
        "extraBarcodes": [
          "5000213009420",
          "5000213006566",
          "5000213015506",
          "5000213026205",
          "5000213021774",
          "5000213029671",
          "0083820725520",
          "0083820181012",
          "4751017241998",
          "5000213009437",
          "5000213026038",
          "5000213027738"
        ],
        "shortHistory": "La célebre Irish Dry Stout de Dublín con cápsula de nitrógeno en lata que recrea su cascada cremosa y notas suaves a café tostado y malta.",
        "style": "Negra",
        "abv": "4.20",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Draught Botellín",
        "format": "botellin",
        "barcode": "5000213004807",
        "extraBarcodes": [
          "5000213023525",
          "5000213016114",
          "7503028270187",
          "5000213002339",
          "5000213014905",
          "5000213015438",
          "5000213015452",
          "5000213029626",
          "5000213030707",
          "5000213016107"
        ],
        "shortHistory": "Formato en vidrio oscuro de la clásica irlandesa nacida en 1759, equilibrando la cebada tostada amarga con una textura ligera y cremosa.",
        "style": "Negra",
        "abv": "4.20",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Original Extra Stout Botellín",
        "format": "botellin",
        "barcode": "5000213014165",
        "extraBarcodes": [
          "5000213014912",
          "5000196000537",
          "5000210014168",
          "0083820123937",
          "5000213012017",
          "5000213027455",
          "5000213028612"
        ],
        "shortHistory": "Descendiente directa de la receta dublinesa de 1821, carbonatada de forma tradicional con mayor cuerpo, intensidad lupulada y notas a regaliz.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Original Extra Stout Lata",
        "format": "lata",
        "barcode": "5000213024782",
        "extraBarcodes": [
          "5000213029596"
        ],
        "shortHistory": "La receta tradicional de Guinness Original en lata sin nitrógeno, de burbuja viva, amargor torrefacto firme y carácter clásico irlandés.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Foreign Extra Stout Botellín",
        "format": "botellin",
        "barcode": "4053400211428",
        "extraBarcodes": [
          "8888017620051"
        ],
        "shortHistory": "Elaborada originalmente para largos viajes marítimos desde Dublín, ofrece mayor graduación, amargor profundo y toques a cacao amargo y pasas.",
        "style": "Negra",
        "abv": "7.50",
        "country": "Irlanda"
      },
      {
        "name": "Guinness 0,0 Lata",
        "format": "lata",
        "barcode": "5000213024959",
        "extraBarcodes": [
          "5000213027714",
          "8801027884961",
          "6034000106701",
          "4751017242827",
          "4742024130603",
          "5000213027356",
          "5000213027684",
          "5000213027707",
          "5000213029381",
          "5000213025413",
          "5000213025420"
        ],
        "shortHistory": "Stout irlandesa sin alcohol filtrada en frío en St. James’s Gate para conservar intactos la espuma cremosa y el aroma a cebada torrefacta.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Hop House 13 Botellín",
        "format": "botellin",
        "barcode": "4053400206714",
        "extraBarcodes": [
          "7798339251523",
          "5000213008232",
          "5000213011942",
          "5000213012611",
          "5000213018958",
          "5000213020708",
          "5000213010785"
        ],
        "shortHistory": "Lager dorada creada en la cervecería experimental Open Gate de Dublín con cebada irlandesa y lúpulos Galaxy y Mosaic de aroma afrutado.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Hop House 13 Lata",
        "format": "lata",
        "barcode": "5000213021934",
        "extraBarcodes": [
          "5000213000700"
        ],
        "shortHistory": "Formato lata de Hop House 13 Lager de Guinness, doblemente lupulada con notas frescas de albaricoque, melocotón y malta irlandesa.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness West Indies Porter Botellín",
        "format": "botellin",
        "barcode": "5052542000074",
        "extraBarcodes": [],
        "shortHistory": "Basada en los diarios cerveceros de 1801 en Dublín, esta porter oscura despliega notas complejas de toffee, chocolate negro y malta tostada.",
        "style": "Negra",
        "abv": "6.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Dublin Porter Botellín",
        "format": "botellin",
        "barcode": "5000196000124",
        "extraBarcodes": [
          "5052542000012"
        ],
        "shortHistory": "Inspirada en las recetas dublinesas de 1796, una porter suave y sedosa con recuerdos dulces de malta caramelo, cacao y lúpulo inglés.",
        "style": "Negra",
        "abv": "3.80",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Special Export Stout Botellín",
        "format": "botellin",
        "barcode": "5410218005523",
        "extraBarcodes": [
          "54004207"
        ],
        "shortHistory": "Encargada en 1912 por John Martin para Bélgica desde Dublín, una stout de ocho grados densa, cálida y repleta de café tostado y regaliz.",
        "style": "Negra",
        "abv": "8.00",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Nitro IPA Lata",
        "format": "lata",
        "barcode": "5000213021293",
        "extraBarcodes": [],
        "shortHistory": "India Pale Ale nitrogenada elaborada en Dublín con cinco lúpulos aromáticos que combinan notas cítricas de pino con una espuma aterciopelada.",
        "style": "IPA",
        "abv": "5.80",
        "country": "Irlanda"
      },
      {
        "name": "Guinness Cold Brew Coffee Beer Lata",
        "format": "lata",
        "barcode": "0083820125368",
        "extraBarcodes": [
          "0083820125375"
        ],
        "shortHistory": "Fusión de Guinness Draught con extracto de café preparado en frío, potenciando las notas de espresso tostado, chocolate y crema sedosa.",
        "style": "Negra",
        "abv": "4.00",
        "country": "Irlanda"
      }
    ]
  },
  {
    "name": "Paulaner",
    "logoUrl": "brand://paulaner",
    "history": "Fundada en Múnich en 1634 por monjes de la orden de los Mínimos, es uno de los pilares históricos del Oktoberfest y de las cervezas de trigo bávaras.",
    "beers": [
      {
        "name": "Paulaner Hefe-Weißbier Botellín",
        "format": "botellin",
        "barcode": "4066600611981",
        "extraBarcodes": [
          "4066600611301",
          "4066600641995",
          "4066600298113",
          "4066600060741",
          "4066600207405",
          "4066600292531",
          "4066600641964",
          "4066600811985",
          "06663964",
          "16834552",
          "4066600299905",
          "4066600011989"
        ],
        "shortHistory": "Cerveza de trigo bávara sin filtrar de Múnich con turbidez dorada natural y aromas inconfundibles a plátano maduro, clavo de olor y pan tierno.",
        "style": "Trigo",
        "abv": "5.50",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Hefe-Weißbier Lata",
        "format": "lata",
        "barcode": "4066600201922",
        "extraBarcodes": [
          "4066600392811",
          "4066600601920"
        ],
        "shortHistory": "La reina bávara del trigo en formato lata de medio litro o 33 cl, refrescante y sedosa con abundante espuma blanca y matices frutales suaves.",
        "style": "Trigo",
        "abv": "5.50",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Weißbier Dunkel Botellín",
        "format": "botellin",
        "barcode": "4066600941972",
        "extraBarcodes": [
          "4066600641971",
          "59494287"
        ],
        "shortHistory": "Trigo oscuro elaborado en Múnich con gran proporción de malta tostada, ofreciendo cuerpo cremoso y sabores suaves a cacao, avellana y caramelo.",
        "style": "Negra",
        "abv": "5.30",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Weißbier Kristallklar Botellín",
        "format": "botellin",
        "barcode": "4066600641902",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo bávara filtrada hasta lucir cristalina y brillante, manteniendo el frescor frutal de la levadura con una burbuja muy viva.",
        "style": "Trigo",
        "abv": "5.50",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Münchner Hell Botellín",
        "format": "botellin",
        "barcode": "4066600251101",
        "extraBarcodes": [
          "4066600233008",
          "4066600611363",
          "4066600641100",
          "4066600601333",
          "4066600011026",
          "4066600611028",
          "4066600010050"
        ],
        "shortHistory": "Clásica Helles de Múnich dorada y cristalina bajo la Ley de Pureza de 1516, suave en boca con protagonismo de la malta pálida bávara.",
        "style": "Lager",
        "abv": "4.90",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Münchner Hell Lata",
        "format": "lata",
        "barcode": "4066600211815",
        "extraBarcodes": [
          "4066600301110"
        ],
        "shortHistory": "La lager rubia más popular de Múnich en lata, limpia, floral y perfectamente equilibrada entre dulzor de malta y lúpulo Hallertau.",
        "style": "Lager",
        "abv": "4.90",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Salvator Doppelbock Botellín",
        "format": "botellin",
        "barcode": "4066600641803",
        "extraBarcodes": [
          "4066600611349"
        ],
        "shortHistory": "La receta original de los monjes paulinos desde hace más de 375 años: tostada, potente, con notas a caramelo oscuro, ciruela y lúpulo noble.",
        "style": "Tostada",
        "abv": "7.90",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Oktoberfest Bier Botellín",
        "format": "botellin",
        "barcode": "4066600612049",
        "extraBarcodes": [],
        "shortHistory": "Cerveza festiva de Múnich elaborada especialmente para el Oktoberfest, con perfecto equilibrio entre dulzor de malta dorada y amargor ligero.",
        "style": "Lager",
        "abv": "6.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Oktoberfest Bier Litrona",
        "format": "litrona",
        "barcode": "0080157175240",
        "extraBarcodes": [
          "4066600610663"
        ],
        "shortHistory": "El mítico formato de un litro del Oktoberfest de Múnich, lleno de cuerpo dorado y malta festiva bávara al más puro estilo de las carpas.",
        "style": "Lager",
        "abv": "6.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Weißbier 0,0 Lata",
        "format": "lata",
        "barcode": "4066600192510",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo isotónica sin alcohol de Múnich que mantiene los matices frutales de la levadura bávara y gran poder refrescante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Hefe-Weißbier Alkoholfrei Botellín",
        "format": "botellin",
        "barcode": "4066600242918",
        "extraBarcodes": [
          "4066600641919",
          "4066600145257",
          "4066600345916"
        ],
        "shortHistory": "Botellín de trigo bávaro sin alcohol elaborado en Múnich, rico en vitaminas y con todo el carácter turbio y frutal de una Hefe-Weißbier.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Münchner Hell Alkoholfrei Botellín",
        "format": "botellin",
        "barcode": "4066600231011",
        "extraBarcodes": [
          "4066600301011",
          "4066600641018",
          "4066600601050"
        ],
        "shortHistory": "La Helles rubia de Múnich en versión sin alcohol, manteniendo su perfil limpio de malta bávara y un final floral muy refrescante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Weißbier-Zitrone 0,0 Botellín",
        "format": "botellin",
        "barcode": "4066600242024",
        "extraBarcodes": [
          "4066600345251",
          "4066600145264",
          "4066600645245",
          "4066600642022",
          "4066600545255"
        ],
        "shortHistory": "Combinación isotónica sin alcohol de Paulaner Weißbier con limonada natural de limones maduros, frutal, turbia y sumamente refrescante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Natur-Radler Limón Botellín",
        "format": "botellin",
        "barcode": "4066600145196",
        "extraBarcodes": [
          "4066600241195"
        ],
        "shortHistory": "Mezcla tradicional bávara de Münchner Hell con zumo natural de limón sin conservantes, con turbidez cítrica y solo dos coma cinco grados.",
        "style": "Lager",
        "abv": "2.50",
        "country": "Alemania"
      },
      {
        "name": "Paulaner Zwickl Kellerbier Botellín",
        "format": "botellin",
        "barcode": "4066600198291",
        "extraBarcodes": [
          "4066600198598",
          "4066600203308",
          "4066600203711",
          "4066600341123",
          "4066600603405",
          "4066600941910",
          "10666074"
        ],
        "shortHistory": "Especialidad de bodega muniquesa sin filtrar de color ámbar natural, cremosa y con notas de pan recién horneado, caramelo y lúpulo.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "Alemania"
      }
    ]
  },
  {
    "name": "Leffe",
    "logoUrl": "brand://leffe",
    "history": "Herencia de la abadía belga de Notre-Dame de Leffe fundada en 1240 en Dinant, famosa por sus cervezas de alta fermentación llenas de matices especiados.",
    "beers": [
      {
        "name": "Leffe Blonde Botellín",
        "format": "botellin",
        "barcode": "5410228142218",
        "extraBarcodes": [
          "5410228233077",
          "5410228222583",
          "5410228280538",
          "5410228142089",
          "5410228208358",
          "5014379023152",
          "5410228203582",
          "5410228303947",
          "5410228237501",
          "5410228254065",
          "5410228145554",
          "5410228225355",
          "5410228228011",
          "5410228280170",
          "5410228241553",
          "5410228204831",
          "5410228215479",
          "5410228232520",
          "5410228215578",
          "5410228225768",
          "5410228225348",
          "5410228215530",
          "5410228243267",
          "5410228166665",
          "5410228222590",
          "5410228280712",
          "5410228230762",
          "5410228304531",
          "5410228304579",
          "5410228091448"
        ],
        "shortHistory": "Icónica cerveza belga de abadía dorada con notas cálidas a vainilla, clavo y miel suave, redondeadas por un final ligeramente seco y especiado.",
        "style": "Lager",
        "abv": "6.60",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Blonde Lata",
        "format": "lata",
        "barcode": "5410228201205",
        "extraBarcodes": [
          "5410228222941",
          "5410228224020",
          "5410228174073",
          "5410228171065",
          "5410228218067",
          "5410228310419"
        ],
        "shortHistory": "Formato práctico de la tradicional abadía de Dinant que preserva el bouquet especiado y afrutado de esta cerveza dorada de alta fermentación.",
        "style": "Lager",
        "abv": "6.60",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Brune Botellín",
        "format": "botellin",
        "barcode": "5410228236702",
        "extraBarcodes": [
          "5410228166672",
          "5410228146162",
          "5410228142119",
          "5410228321873",
          "5410228245377"
        ],
        "shortHistory": "Abadía belga oscura de color caoba profundo elaborada con maltas tostadas que aportan recuerdos a caramelo quemado, café suave y manzana asada.",
        "style": "Negra",
        "abv": "6.50",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Brune Lata",
        "format": "lata",
        "barcode": "5410228201236",
        "extraBarcodes": [],
        "shortHistory": "La clásica Leffe Brune de abadía en lata, conservando su espuma densa color crema y sus notas cálidas de malta torrefacta y toffee.",
        "style": "Negra",
        "abv": "6.50",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Triple Botellín",
        "format": "botellin",
        "barcode": "5410228145912",
        "extraBarcodes": [
          "5410228147213",
          "5410228244028",
          "5410228129684",
          "5410228300366"
        ],
        "shortHistory": "Abadía belga rubia con segunda fermentación en botella, compleja y robusta con notas de cilantro, piel de naranja y ocho coma cinco grados.",
        "style": "Tostada",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Ruby Botellín",
        "format": "botellin",
        "barcode": "5410228233633",
        "extraBarcodes": [
          "5410228239802",
          "5410228307112",
          "5410228195825",
          "5410228307280",
          "5410228307235",
          "5410228233626",
          "5410228209447",
          "5410228202608",
          "5410228254263",
          "5410228195832"
        ],
        "shortHistory": "Receta belga afrutada de intenso tono rubí que combina la base clásica de abadía con zumo natural de frutos rojos y un toque floral a saúco.",
        "style": "Tostada",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Ruby Lata",
        "format": "lata",
        "barcode": "5410228213451",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Leffe Ruby, ideal para enfriar y disfrutar de su equilibrio entre especias de abadía belga y aromas de frambuesa y fresa.",
        "style": "Tostada",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Rituel 9 Botellín",
        "format": "botellin",
        "barcode": "5410228191568",
        "extraBarcodes": [
          "5410228191551",
          "5014379030884",
          "5410228143567",
          "5410228217602",
          "5410228238058",
          "5410228243847",
          "5410228243946",
          "5410228256649",
          "5410228258537",
          "5410228269342",
          "5410228142164",
          "5410228217312",
          "5410228242000",
          "5410228258698",
          "5410228197089"
        ],
        "shortHistory": "Cerveza belga de alta graduación con nueve grados, aroma complejo a grano especiado, fruta escarchada y un amargor cálido muy persistente.",
        "style": "Tostada",
        "abv": "9.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Rituel 9 Lata",
        "format": "lata",
        "barcode": "5410228308386",
        "extraBarcodes": [
          "5410228222262",
          "5410228258384"
        ],
        "shortHistory": "La potente Leffe Rituel de nueve grados en formato lata dorada, de color cobre intenso y largo posgusto especiado de alta fermentación.",
        "style": "Tostada",
        "abv": "9.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Ambrée Botellín",
        "format": "botellin",
        "barcode": "5410228242079",
        "extraBarcodes": [],
        "shortHistory": "Cerveza belga de abadía color ámbar cobrizo con aromas a malta tostada, piel de naranja confitada y especias dulces muy gastronómicas.",
        "style": "Tostada",
        "abv": "6.60",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Royale Whitbread Golding Botellín",
        "format": "botellin",
        "barcode": "5410228188537",
        "extraBarcodes": [
          "5410228319566"
        ],
        "shortHistory": "Elaborada con tres variedades de lúpulo encabezadas por el Whitbread Golding, aporta notas cítricas a limón y resina sobre base de abadía belga.",
        "style": "IPA",
        "abv": "7.50",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Blonde 0,0 Botellín",
        "format": "botellin",
        "barcode": "5410228253556",
        "extraBarcodes": [
          "5410228267171",
          "5410228267447",
          "5410228261094",
          "5410228253563"
        ],
        "shortHistory": "Cerveza de abadía belga desalcoholizada cuidadosamente para conservar los matices de vainilla, plátano maduro y especias sin nada de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Blonde 0,0 Lata",
        "format": "lata",
        "barcode": "5410228253624",
        "extraBarcodes": [
          "5410228304586",
          "5410228261063"
        ],
        "shortHistory": "Formato lata de Leffe Blonde 0,0 %, permitiendo disfrutar del bouquet afrutado y especiado de la abadía de Dinant con cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Brune 0,0 Botellín",
        "format": "botellin",
        "barcode": "5410228275381",
        "extraBarcodes": [
          "5410228367505"
        ],
        "shortHistory": "Versión 0,0 % de la Leffe Brune oscura, conservando sus aromas de malta torrefacta, caramelo y café suave sin graduación alcohólica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Ruby 0,0 Botellín",
        "format": "botellin",
        "barcode": "5410228281955",
        "extraBarcodes": [
          "5410228230441",
          "5410228282327"
        ],
        "shortHistory": "Toda la frescura de los frutos rojos y especias de abadía de Leffe Ruby en versión 0,0 % sin alcohol, ligera, afrutada y de color rubí.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Leffe Nectar Miel Botellín",
        "format": "botellin",
        "barcode": "5410228292357",
        "extraBarcodes": [],
        "shortHistory": "Especialidad de abadía belga aromatizada con miel de flores silvestres, desplegando notas florales dulces y una textura redonda y dorada.",
        "style": "Lager",
        "abv": "5.50",
        "country": "Bélgica"
      }
    ]
  },
  {
    "name": "BrewDog",
    "logoUrl": "brand://brewdog",
    "history": "Nacida en Escocia en 2007 en un garaje de Fraserburgh, BrewDog impulsó la revolución craft europea apostando por lúpulos expresivos y latas atrevidas.",
    "beers": [
      {
        "name": "BrewDog Punk IPA Lata",
        "format": "lata",
        "barcode": "5056025440432",
        "extraBarcodes": [
          "5060154914030",
          "0542111866378",
          "5056025440449",
          "5056025440487",
          "5056025453838",
          "5060154911183",
          "4260649360279",
          "4260649360507",
          "4260649360552",
          "5014379017663",
          "5056025412866",
          "5056025435568",
          "5056025462083",
          "5056025462113",
          "5056025462120",
          "5056025478275",
          "8718969637459",
          "4260649360255"
        ],
        "shortHistory": "Buque insignia escocés nacido en 2007 con lúpulos del Nuevo Mundo que estallan en notas de pomelo, piña y lichi sobre un amargor seco final.",
        "style": "IPA",
        "abv": "5.40",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Punk IPA Botellín",
        "format": "botellin",
        "barcode": "5060154910216",
        "extraBarcodes": [
          "5056025440494",
          "5060154910018"
        ],
        "shortHistory": "La mítica IPA rebelde de Aberdeenshire en botella, combinando maltas doradas ligeras con una explosión tropical y resinosa de seis lúpulos.",
        "style": "IPA",
        "abv": "5.40",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Elvis Juice Lata",
        "format": "lata",
        "barcode": "5056025413061",
        "extraBarcodes": [
          "5056025413054"
        ],
        "shortHistory": "American IPA infusionada con cáscara de pomelo rojo sobre malta caramelo, ofreciendo un equilibrio vibrante entre acidez cítrica y lúpulo pino.",
        "style": "IPA",
        "abv": "6.50",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Elvis Juice Botellín",
        "format": "botellin",
        "barcode": "5060154917741",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Elvis Juice de BrewDog, donde el pomelo fresco y la naranja sanguina se funden con lúpulos americanos intensos y resinosos.",
        "style": "IPA",
        "abv": "6.50",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Hazy Jane Lata",
        "format": "lata",
        "barcode": "4260649360545",
        "extraBarcodes": [
          "5056025468504"
        ],
        "shortHistory": "New England IPA turbia y sedosa elaborada en Escocia con avena y trigo, cargada de aromas a melocotón, mango y fruta de la pasión sin amargor duro.",
        "style": "IPA",
        "abv": "5.00",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Hazy Jane Botellín",
        "format": "botellin",
        "barcode": "5056025434578",
        "extraBarcodes": [
          "5056025456570"
        ],
        "shortHistory": "La New England IPA jugosa de BrewDog en botella, sin filtrar para conservar su textura cremosa y su explosión tropical de piña y mango.",
        "style": "IPA",
        "abv": "5.00",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Lost Lager Lata",
        "format": "lata",
        "barcode": "5056025454552",
        "extraBarcodes": [
          "4260649360033",
          "5056025412194",
          "5056025440272",
          "5056025453272"
        ],
        "shortHistory": "Pilsner artesanal escocesa de corte alemán elaborada con lúpulos Saphir y Select que aportan toques cítricos y florales muy refrescantes.",
        "style": "Lager",
        "abv": "4.50",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Lost Lager Botellín",
        "format": "botellin",
        "barcode": "5056025412170",
        "extraBarcodes": [
          "5056025412163"
        ],
        "shortHistory": "Botellín de Lost Lager de BrewDog, una Pilsner sostenible elaborada con energía eólica, pan excedente y lúpulo bávaro fresco y crujiente.",
        "style": "Lager",
        "abv": "4.50",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Black Heart Lata",
        "format": "lata",
        "barcode": "5056025471368",
        "extraBarcodes": [
          "5039303007954"
        ],
        "shortHistory": "Dry Stout escocesa con nitrógeno de espuma densa y aterciopelada que envuelve el paladar con notas a chocolate negro, café expreso y cacao.",
        "style": "Negra",
        "abv": "4.10",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Punk AF 0,5 Lata",
        "format": "lata",
        "barcode": "5056025434530",
        "extraBarcodes": [
          "5056025421370",
          "5056025421387"
        ],
        "shortHistory": "Versión sin alcohol de la Punk IPA con ocho lúpulos en dry hopping que conservan intactos los aromas a fruta tropical, pino y hierba fresca.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Hazy AF Sin Alcohol Lata",
        "format": "lata",
        "barcode": "4260473891581",
        "extraBarcodes": [],
        "shortHistory": "New England IPA sin alcohol de BrewDog elaborada con avena, trigo y lúpulos jugosos que brindan todo el carácter frutal de Hazy Jane.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Wingman Session IPA Lata",
        "format": "lata",
        "barcode": "5056025475861",
        "extraBarcodes": [
          "5056025477551",
          "5056025481176"
        ],
        "shortHistory": "Session IPA escocesa presidida por el águila de BrewDog, muy fácil de beber con notas refrescantes de cítricos, melocotón y pino suave.",
        "style": "IPA",
        "abv": "4.30",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Dead Pony Club Pale Ale Lata",
        "format": "lata",
        "barcode": "5056025412903",
        "extraBarcodes": [
          "5060154911794",
          "5060154914689"
        ],
        "shortHistory": "Session Pale Ale californiana cargada de lúpulos Simcoe, Citra y Mosaic que ofrecen enorme aroma a pomelo y flor con baja graduación.",
        "style": "IPA",
        "abv": "3.80",
        "country": "Reino Unido"
      },
      {
        "name": "BrewDog Nanny State 0,5 Botellín",
        "format": "botellin",
        "barcode": "5060154910674",
        "extraBarcodes": [],
        "shortHistory": "Clásica Hoppy Ale sin alcohol de BrewDog elaborada con cinco maltas especiales y lúpulos norteamericanos de amargor intenso y aromático.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Reino Unido"
      }
    ]
  },
  {
    "name": "Corona",
    "logoUrl": "brand://corona",
    "history": "Elaborada en Ciudad de México desde 1925 por Grupo Modelo, es la lager mexicana más icónica del mundo, servida tradicionalmente con una rodaja de lima.",
    "beers": [
      {
        "name": "Corona Extra Botellín",
        "format": "botellin",
        "barcode": "7501064191299",
        "extraBarcodes": [
          "75041670",
          "75032814",
          "08066145",
          "75033927",
          "0062067382406",
          "75013769",
          "5410228309451",
          "75037062",
          "7501064191329",
          "0080660956084",
          "0080660956053",
          "5014379025422",
          "7501064191527",
          "7501064191503",
          "5410228235927",
          "7501064192081",
          "0062067382338",
          "0062067382444",
          "4100130011788",
          "5507464196454",
          "5014379012507",
          "7501064196690",
          "5014379014440",
          "7503038290809",
          "7501064191572",
          "0033544000830",
          "0033544950401",
          "0080660954080",
          "7501064103100",
          "7501064193040",
          "7501064195129",
          "7501064196454",
          "7503038290816",
          "8411327013376",
          "5014379014457"
        ],
        "shortHistory": "Lager mexicana dorada elaborada desde 1925 en botella transparente, suave y ligera con notas dulces de maíz y cebada ideal para servir con lima.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Corona Extra Lata",
        "format": "lata",
        "barcode": "8411327013345",
        "extraBarcodes": [
          "5410228277743",
          "0080660956411",
          "0080660956855",
          "0080660956435",
          "7891991305846",
          "0080660956800",
          "5014379023503",
          "0033544950463",
          "4100130010224",
          "5014379025439"
        ],
        "shortHistory": "El sabor refrescante mexicano en lata blanca y azul, con carbonatación viva y un cuerpo ligero pensado para días soleados y comida picante.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Corona Cero Botellín",
        "format": "botellin",
        "barcode": "5410228291879",
        "extraBarcodes": [
          "5410228291886",
          "5410228292876",
          "5410228313861"
        ],
        "shortHistory": "Alternativa sin alcohol que reproduce la suavidad y frescura veraniega de la receta mexicana original con solo ingredientes naturales.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "México"
      },
      {
        "name": "Corona Cero Lata",
        "format": "lata",
        "barcode": "5410228313854",
        "extraBarcodes": [
          "5410228324881",
          "5410228327264",
          "5410228332817"
        ],
        "shortHistory": "Versión 0,0 % en lata lista para enfriar rápido y disfrutar del trago ligero, limpio y cítrico característico de Corona sin graduación.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "México"
      },
      {
        "name": "Corona Familiar Litrona",
        "format": "litrona",
        "barcode": "0080660956831",
        "extraBarcodes": [],
        "shortHistory": "Tradicional botella ámbar de gran formato en México conocida como caguama, protegiendo de la luz una lager suave de trago largo y compartido.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Corona Light Botellín",
        "format": "botellin",
        "barcode": "7070292933723",
        "extraBarcodes": [
          "0080660956756",
          "08066242",
          "08496247",
          "75039851"
        ],
        "shortHistory": "Lager mexicana reducida en calorías y cuerpo ultraligero, manteniendo notas limpias de malta dulce y una refrescante sensación burbujeante.",
        "style": "Lager",
        "abv": "4.00",
        "country": "México"
      },
      {
        "name": "Corona Light Lata",
        "format": "lata",
        "barcode": "7501064107153",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Corona Light elaborada en México, con menos de cien calorías y un acabado crujiente ideal para tardes de playa y terraza.",
        "style": "Lager",
        "abv": "4.00",
        "country": "México"
      },
      {
        "name": "Corona Sunbrew 0,0 Botellín",
        "format": "botellin",
        "barcode": "7891991304184",
        "extraBarcodes": [],
        "shortHistory": "Cerveza sin alcohol enriquecida con vitamina D que conserva la ligereza dorada mexicana y un perfil refrescante perfecto para cualquier tarde.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "México"
      },
      {
        "name": "Coronita Extra Botellín 21cl",
        "format": "botellin",
        "barcode": "7501064198076",
        "extraBarcodes": [
          "7501064196485",
          "75030889",
          "5410228242307"
        ],
        "shortHistory": "El formato pequeño de veintiún centilitros con el que Corona se hizo famosa en España, manteniendo su frescor dorado para beber bien fría.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      }
    ]
  },
  {
    "name": "Peroni",
    "logoUrl": "brand://peroni",
    "history": "Nacida en Vigevano en 1846 por Francesco Peroni y perfeccionada en Roma, simboliza el estilo cervecero italiano limpio, seco y elegante.",
    "beers": [
      {
        "name": "Peroni Nastro Azzurro Botellín",
        "format": "botellin",
        "barcode": "8008440512024",
        "extraBarcodes": [
          "8008440012661",
          "8008440512093",
          "8008440212511",
          "8008440414014",
          "8008440212498",
          "8008440212771",
          "8008440212726",
          "0181954001012",
          "5000016870456",
          "80066583",
          "8008440522016",
          "8008440512543",
          "8008440012012",
          "8008440010117",
          "8008440022004",
          "8008440049575",
          "8008440112965",
          "8008440122087",
          "8008440210456",
          "8008440210586",
          "8008440212825",
          "8008440219480",
          "8008440249012",
          "8008440249036",
          "8008440249227",
          "8008440249425",
          "8008440510044",
          "8008440512420",
          "8008440522931",
          "8008440549204",
          "9320000180467",
          "8008440000026"
        ],
        "shortHistory": "Lager italiana premium elaborada desde 1963 con maíz nostrano de Lombardía para lograr un sabor seco, crujiente y delicadamente cítrico.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Italia"
      },
      {
        "name": "Peroni Nastro Azzurro Lata",
        "format": "lata",
        "barcode": "8008440412508",
        "extraBarcodes": [
          "8008440412423",
          "8008440512468",
          "8008440212115",
          "8008440049186",
          "8008440122230",
          "8008440410016",
          "8008440410214"
        ],
        "shortHistory": "Elegante lata italiana de la Nastro Azzurro con aroma sutil a lúpulo Saaz y notas refrescantes a cáscara de limón ideal para aperitivos.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Italia"
      },
      {
        "name": "Peroni Nastro Azzurro 0,0 Botellín",
        "format": "botellin",
        "barcode": "8008440212542",
        "extraBarcodes": [
          "8008440412164",
          "8008440514004",
          "8008440512499",
          "8008440512604",
          "0181954001067",
          "8594404023304",
          "8008440214065"
        ],
        "shortHistory": "Versión sin alcohol elaborada en Italia manteniendo el mismo maíz nostrano y lúpulos aromáticos para ofrecer un acabado seco y refinado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Italia"
      },
      {
        "name": "Peroni Nastro Azzurro 0,0 Lata",
        "format": "lata",
        "barcode": "8008440412355",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Peroni Nastro Azzurro 0,0 %, conservando intacto el carácter crujiente y cítrico de la receta romana con cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Italia"
      },
      {
        "name": "Peroni Gran Riserva Doppio Malto Botellín",
        "format": "botellin",
        "barcode": "8008440215208",
        "extraBarcodes": [
          "8008440219589",
          "8008440215024",
          "8008440215062"
        ],
        "shortHistory": "Cerveza italiana de doble malta con larga maduración en frío, presentando un color ámbar dorado y notas cálidas a cereal tostado y especias.",
        "style": "Tostada",
        "abv": "6.60",
        "country": "Italia"
      },
      {
        "name": "Peroni Gran Riserva Rossa Botellín",
        "format": "botellin",
        "barcode": "8008440013002",
        "extraBarcodes": [],
        "shortHistory": "Estilo Vienna Lager italiano de tonalidad rubí cobriza y malta especial tostada que aporta suavidad cremosa con aromas a caramelo y pan.",
        "style": "Tostada",
        "abv": "5.20",
        "country": "Italia"
      },
      {
        "name": "Peroni Gran Riserva Puro Malto Botellín",
        "format": "botellin",
        "barcode": "8008440019066",
        "extraBarcodes": [
          "8008440219886"
        ],
        "shortHistory": "Premium Lager elaborada en Roma con malta cien por cien italiana dorada, destacando por su aroma a miel suave, especias y lúpulo aromático.",
        "style": "Lager",
        "abv": "5.20",
        "country": "Italia"
      },
      {
        "name": "Peroni Tradizionale Litrona",
        "format": "litrona",
        "barcode": "8008440120908",
        "extraBarcodes": [
          "80067900",
          "8008440212214",
          "8008440212375",
          "8008440212412",
          "8008440212467",
          "8008440212481",
          "8008440212702",
          "8008440222015",
          "8008440246066",
          "8008440249371",
          "8008440522009"
        ],
        "shortHistory": "Receta clásica italiana nacida en 1846 en formato familiar de gran tamaño, con amargor moderado y gran frescura para acompañar pizzas y pasta.",
        "style": "Lager",
        "abv": "4.70",
        "country": "Italia"
      },
      {
        "name": "Peroni Original Etiqueta Roja Botellín",
        "format": "botellin",
        "barcode": "8008440222008",
        "extraBarcodes": [
          "8008440510013"
        ],
        "shortHistory": "La cerveza cotidiana más querida de Italia desde 1846 con su etiqueta roja clásica, suave, dorada y de amargor muy ligero y refrescante.",
        "style": "Lager",
        "abv": "4.70",
        "country": "Italia"
      },
      {
        "name": "Peroni Original Etiqueta Roja Lata",
        "format": "lata",
        "barcode": "8008440510129",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de la tradicional Peroni italiana de 1846, perfecta para enfriar rápido y acompañar una pizza recién horneada con amigos.",
        "style": "Lager",
        "abv": "4.70",
        "country": "Italia"
      },
      {
        "name": "Peroni Stile Capri Botellín",
        "format": "botellin",
        "barcode": "8008440249135",
        "extraBarcodes": [],
        "shortHistory": "Lager mediterránea ligera con un sutil toque natural de hoja de olivo y limón italiano que evoca los atardeceres de verano en la costa amalfitana.",
        "style": "Lager",
        "abv": "4.20",
        "country": "Italia"
      },
      {
        "name": "Peroni Senza Glutine Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8008440212450",
        "extraBarcodes": [
          "8008440212313",
          "8008440510303"
        ],
        "shortHistory": "La receta clásica de Peroni garantizada por la asociación italiana de celíacos, conservando su redondez de malta italiana sin gluten.",
        "style": "Lager",
        "abv": "4.70",
        "country": "Italia"
      },
      {
        "name": "Peroni Chill Lemon Radler Botellín",
        "format": "botellin",
        "barcode": "8008440219008",
        "extraBarcodes": [],
        "shortHistory": "Radler italiana elaborada con cerveza Peroni y zumo de limones cien por cien italianos, ofreciendo un aroma cítrico intenso y soleado.",
        "style": "Lager",
        "abv": "2.00",
        "country": "Italia"
      }
    ]
  },
  {
    "name": "El Águila",
    "logoUrl": "brand://el-aguila",
    "history": "Nacida en Madrid en 1900 de la mano de Augusto Comas y recuperada con espíritu modernista, destaca por sus recetas equilibradas y su icónica Sin Filtrar.",
    "beers": [
      {
        "name": "El Águila Dorada Botellín",
        "format": "botellin",
        "barcode": "8410590101148",
        "extraBarcodes": [],
        "shortHistory": "Inspirada en los métodos tradicionales de 1900 en Madrid, combina malta caramelizada y lúpulo Lemondrop en una lager dorada muy fácil de beber.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "El Águila Dorada Lata",
        "format": "lata",
        "barcode": "8411090115093",
        "extraBarcodes": [
          "8411090174120",
          "8410590111178"
        ],
        "shortHistory": "La lager dorada madrileña El Águila en formato lata, con reflejos ambarinos, espuma consistente y delicadas notas cítricas de lúpulo Lemondrop.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar Botellín",
        "format": "botellin",
        "barcode": "8410590111017",
        "extraBarcodes": [
          "8410590111086",
          "8411090115161",
          "0945454695610"
        ],
        "shortHistory": "Cerveza turbia inspirada en recetas de 1900 que conserva sus levaduras en suspensión; gírala suavemente antes de abrir para despertar aromas.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar Lata",
        "format": "lata",
        "barcode": "8410590111031",
        "extraBarcodes": [
          "8410590111109",
          "8411090174144"
        ],
        "shortHistory": "Versión en lata de El Águila Sin Filtrar, conservando la intensidad maltosa, frescura de levadura viva y amargor suave listos para cualquier ocasión.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410590310021",
        "extraBarcodes": [],
        "shortHistory": "La experiencia turbia y aromática de El Águila Sin Filtrar sin alcohol, elaborada con malta tostada y notas herbales suaves para disfrutar sin límite.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar 0,0 Lata",
        "format": "lata",
        "barcode": "8411090310207",
        "extraBarcodes": [],
        "shortHistory": "Lata de El Águila Sin Filtrar 0,0 %, manteniendo el cuerpo turbio característico, espuma densa y frescor cítrico con cero grados alcohólicos.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar Limón Botellín",
        "format": "botellin",
        "barcode": "8411090617269",
        "extraBarcodes": [],
        "shortHistory": "Cerveza sin filtrar de El Águila combinada con zumo natural de limón, naranja, lima y acerola: refrescante, turbia y suave con 2,3 % vol.",
        "style": "Lager",
        "abv": "2.30",
        "country": "España"
      },
      {
        "name": "El Águila Sin Filtrar Limón Lata",
        "format": "lata",
        "barcode": "8411090617306",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de El Águila Sin Filtrar Limón, con levadura en suspensión y notas cítricas naturales de limón y lima, ligera y muy refrescante.",
        "style": "Lager",
        "abv": "2.30",
        "country": "España"
      }
    ]
  },
  {
    "name": "Turia",
    "logoUrl": "brand://turia",
    "history": "Fundada en València en 1935 como símbolo cervecero del Mediterráneo levantino, es célebre por su Märzenbier de malta tostada pensada para maridar con gastronomía.",
    "beers": [
      {
        "name": "Turia Märzen Botellín",
        "format": "botellin",
        "barcode": "8413194091945",
        "extraBarcodes": [],
        "shortHistory": "Tostada valenciana nacida en 1935 y elaborada con malta tostada a fuego suave, logrando un color ámbar cobrizo con notas cítricas y gran redondez.",
        "style": "Tostada",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Turia Märzen Lata",
        "format": "lata",
        "barcode": "8413194096131",
        "extraBarcodes": [],
        "shortHistory": "La cerveza tostada de València en formato lata de 33 cl, equilibrando sabores a cereal caramelizado, frescor cítrico y un amargor amable en boca.",
        "style": "Tostada",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Turia 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8413194776132",
        "extraBarcodes": [],
        "shortHistory": "Cerveza tostada 0,0 % valenciana en lata refrescante, pensada para acompañar tapas y aperitivos mediterráneos con todo el aroma del cereal tostado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Turia Stark Botellín",
        "format": "botellin",
        "barcode": "8413194733845",
        "extraBarcodes": [],
        "shortHistory": "Recuperación de una receta histórica valenciana estilo Dortmunder Export, lager rubia de cuerpo generoso, espuma cremosa y equilibrio limpio.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "Estrella de Levante",
    "logoUrl": "brand://estrella-de-levante",
    "history": "Elaborada en Espinardo (Murcia) desde 1963 con cebada de campos locales y agua de manantial, es la cerveza emblemática de la Región de Murcia y el Sureste.",
    "beers": [
      {
        "name": "Estrella de Levante Clásica Botellín",
        "format": "botellin",
        "barcode": "8413194000244",
        "extraBarcodes": [],
        "shortHistory": "Pilsner murciana nacida en 1963 en Espinardo con arroz y cebada del entorno, ofreciendo un color dorado brillante, frescor limpio y amargor elegante.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Clásica Lata",
        "format": "lata",
        "barcode": "8413194006338",
        "extraBarcodes": [],
        "shortHistory": "La clásica rubia murciana en lata de 33 cl, muy refrescante con notas herbales suaves y una burbuja viva pensada para el clima mediterráneo.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Litrona",
        "format": "litrona",
        "barcode": "8413194000305",
        "extraBarcodes": [],
        "shortHistory": "Botella clásica de un litro con la receta murciana de 1963 para compartir en barra y reuniones, manteniendo su perfil dorado, suave y crujiente.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Estrella de Levante 0,0 Botellín",
        "format": "botellin",
        "barcode": "8413194014241",
        "extraBarcodes": [],
        "shortHistory": "Cerveza sin alcohol elaborada en Murcia que respeta las notas de malta Pilsen y lúpulo floral sin presencia alcohólica para cualquier ocasión.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella de Levante 0,0 Lata",
        "format": "lata",
        "barcode": "8413194106137",
        "extraBarcodes": [
          "5414493706137"
        ],
        "shortHistory": "Versión sin alcohol en lata de la murciana Estrella de Levante, ligera, brillante y de trago refrescante ideal para comidas y días calurosos.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Punta Este Botellín",
        "format": "botellin",
        "barcode": "8413194143842",
        "extraBarcodes": [],
        "shortHistory": "Tostada murciana inspirada en la receta Märzen con maltas de la propia maltería de Murcia, desplegando notas a caramelo tostado y cuerpo intenso.",
        "style": "Tostada",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Punta Este Lata",
        "format": "lata",
        "barcode": "8413194146232",
        "extraBarcodes": [],
        "shortHistory": "Lata de Punta Este Tostada elaborada en Murcia, con color cobrizo cálido, espuma cremosa y equilibrio armónico entre cereal tostado y amargor.",
        "style": "Tostada",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Verna Limón Lata",
        "format": "lata",
        "barcode": "8413194156132",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de la clara murciana elaborada con Estrella de Levante y zumo natural de limones Verna de Murcia para refrescar cada encuentro.",
        "style": "Lager",
        "abv": "3.20",
        "country": "España"
      },
      {
        "name": "Estrella de Levante 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8413194676135",
        "extraBarcodes": [
          "8413194676432"
        ],
        "shortHistory": "Lata de la variedad tostada 0,0 % de Espinardo con maltas caramelizadas que evocan aromas suaves a cereal tostado y pan horneado sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Estrella de Levante Reserva 60 Aniversario Botellín",
        "format": "botellin",
        "barcode": "8413194133133",
        "extraBarcodes": [],
        "shortHistory": "Edición conmemorativa de la fábrica murciana nacida en 1963 con mayor contenido de malta, carácter tostado suave y larga maduración tradicional.",
        "style": "Tostada",
        "abv": "6.00",
        "country": "España"
      }
    ]
  },
  {
    "name": "Victoria",
    "logoUrl": "brand://victoria",
    "history": "Fundada en Málaga en 1928 por Luis Franquelo Carrasco y famosa por su lema «Malagueña y exquisita», madura lentamente durante doce días al estilo clásico alemán.",
    "beers": [
      {
        "name": "Victoria Málaga Clásica Botellín",
        "format": "botellin",
        "barcode": "8410793223845",
        "extraBarcodes": [],
        "shortHistory": "Malagueña y exquisita desde 1928, esta lager dorada de maduración lenta ofrece burbuja fina, amargor suave y un equilibrio limpio muy refrescante.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Victoria Málaga Clásica Lata",
        "format": "lata",
        "barcode": "8410793226136",
        "extraBarcodes": [
          "8410793226433",
          "8410793226334"
        ],
        "shortHistory": "Formato lata de la cerveza histórica de Málaga nacida en 1928, lista para disfrutar bien fría con su sabor equilibrado a cereal y amargor sutil.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Victoria Málaga Litrona",
        "format": "litrona",
        "barcode": "8410793223111",
        "extraBarcodes": [
          "0070234445809",
          "5410228282587",
          "8000483152007"
        ],
        "shortHistory": "Botella de un litro de la emblemática rubia de Málaga para brindar en compañía, conservando su frescura dorada y sus doce días de guarda tradicional.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Victoria Sin 0,0 Lata",
        "format": "lata",
        "barcode": "8410793636133",
        "extraBarcodes": [],
        "shortHistory": "La cerveza sin alcohol de Málaga elaborada con ingredientes naturales para conservar toda la suavidad, aroma herbal y frescor sin gota de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Victoria Sin 0,0 Botellín",
        "format": "botellin",
        "barcode": "8410793631947",
        "extraBarcodes": [
          "8410793633842",
          "8410793630131",
          "8410793630155"
        ],
        "shortHistory": "Botellín de Victoria 0,0 %, dorado, ligero y con amargor delicado para quienes desean disfrutar del sabor malagueño sin contenido alcohólico.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Victoria Marengo Negra Botellín",
        "format": "botellin",
        "barcode": "8410793646132",
        "extraBarcodes": [],
        "shortHistory": "Cerveza negra estilo Stout homenaje a los pescadores de El Perchel en Málaga, con cinco maltas que aportan notas a cacao, café suave y toffee.",
        "style": "Negra",
        "abv": "5.60",
        "country": "España"
      },
      {
        "name": "Victoria Malacatí Trigo Botellín",
        "format": "botellin",
        "barcode": "8410793591937",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo malagueña turbia y cremosa con aromas frutales de plátano y clavo, refrescante y sedosa en homenaje al carácter andaluz.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Victoria Vendeja IPA Botellín",
        "format": "botellin",
        "barcode": "8410793771933",
        "extraBarcodes": [],
        "shortHistory": "IPA elaborada en Málaga en homenaje a las mujeres vendejas del siglo XIX, con aroma intenso a mango y cítricos y amargor lupulado moderado.",
        "style": "IPA",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "Victoria Diez Doble Malta Botellín",
        "format": "botellin",
        "barcode": "8410793931238",
        "extraBarcodes": [],
        "shortHistory": "Helles Bock malagueña inspirada en las primeras recetas de 1928, con doble malta tostada suave, espuma densa y cálido cuerpo dorado de 6,2 grados.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "España"
      },
      {
        "name": "Victoria Pasos Largos Limón Lata",
        "format": "lata",
        "barcode": "8410793666130",
        "extraBarcodes": [],
        "shortHistory": "Lata de la clara malagueña Pasos Largos con zumo natural de limón, ideal para disfrutar bien fría con aroma cítrico intenso y trago ligero.",
        "style": "Lager",
        "abv": "3.20",
        "country": "España"
      }
    ]
  },
  {
    "name": "Amstel",
    "logoUrl": "brand://amstel",
    "history": "Fundada en Ámsterdam en 1870 junto al río Amstel y profundamente arraigada en España, destaca por su catálogo 100 % malta y sus populares gamas Oro y Radler.",
    "beers": [
      {
        "name": "Amstel Original Botellín",
        "format": "botellin",
        "barcode": "8410569005637",
        "extraBarcodes": [
          "84105905",
          "8712000020569",
          "8712000014605"
        ],
        "shortHistory": "Receta nacida en 1870 junto al río Amstel elaborada 100 % con malta de cebada, logrando un equilibrio clásico entre notas herbales y cuerpo dorado.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Amstel Original Lata",
        "format": "lata",
        "barcode": "8410569077467",
        "extraBarcodes": [
          "8410569000649",
          "8410569015698",
          "8712000059125",
          "8712000038557",
          "8606105157513",
          "8712000059118",
          "87120332",
          "8712000057114",
          "5035766061199",
          "8410569005651",
          "8712000061548",
          "8712000061647",
          "8410569005125",
          "8712000059026",
          "8712000059040",
          "8712000059149"
        ],
        "shortHistory": "Cerveza dorada 100 % malta en formato lata, refrescante y con todo el carácter balanceado de la tradición cervecera neerlandesa en España.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Amstel Original Litrona",
        "format": "litrona",
        "barcode": "8410569005521",
        "extraBarcodes": [
          "8410569020012",
          "8410569037553",
          "84151087"
        ],
        "shortHistory": "Botella familiar de un litro de Amstel Original 100 % malta, ideal para mesas compartidas por su trago suave, dorado y bien equilibrado.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Amstel Clásica Lata",
        "format": "lata",
        "barcode": "8410569015650",
        "extraBarcodes": [],
        "shortHistory": "La popular versión española de Amstel más ligera y fácil de beber, perfecta para tomar muy fría como acompañante diario del aperitivo.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Amstel Oro Tostada Lata",
        "format": "lata",
        "barcode": "8410569110119",
        "extraBarcodes": [
          "8410569120026"
        ],
        "shortHistory": "Elaborada mediante un proceso exclusivo de tostado de malta en tres tiempos que aporta color oro viejo, aromas tostados y sabor intenso y cremoso.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "España"
      },
      {
        "name": "Amstel Oro Tostada Botellín",
        "format": "botellin",
        "barcode": "8410569110133",
        "extraBarcodes": [],
        "shortHistory": "Versión en botellín de Amstel Oro con tres golpes de tostado en malta, equilibrando dulzor acaramelado con notas cálidas de grano torrefacto.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "España"
      },
      {
        "name": "Amstel Oro 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8410569310014",
        "extraBarcodes": [
          "13226060",
          "8410569320037"
        ],
        "shortHistory": "Todo el carácter de la malta tostada en tres tiempos de Amstel Oro ahora en formato 0,0 %, con cuerpo sedoso, notas de café y cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8410569310649",
        "extraBarcodes": [],
        "shortHistory": "Cerveza rubia 0,0 % elaborada 100 % con malta de cebada para ofrecer un sabor cervecero refrescante y auténtico sin contenido alcohólico.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "8712000052348",
        "extraBarcodes": [
          "8712000057817"
        ],
        "shortHistory": "Botellín de Amstel 0,0 % sin alcohol, brillante y aromático con notas sutiles de cereal tostado y amargor limpio para cualquier momento del día.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel Radler Limón Lata",
        "format": "lata",
        "barcode": "8410569615614",
        "extraBarcodes": [
          "8410569615232"
        ],
        "shortHistory": "Mezcla doblemente refrescante de cerveza Amstel con auténtico zumo natural de limón, baja graduación de 2,0 % y explosivo frescor cítrico.",
        "style": "Lager",
        "abv": "2.00",
        "country": "España"
      },
      {
        "name": "Amstel Radler 0,0 Limón Lata",
        "format": "lata",
        "barcode": "8410569510001",
        "extraBarcodes": [],
        "shortHistory": "Combinación de cerveza Amstel 0,0 % y zumo natural de limón para disfrutar del frescor cítrico de una clara sin nada de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel Clásica Litrona",
        "format": "litrona",
        "barcode": "8410569037577",
        "extraBarcodes": [
          "84105691"
        ],
        "shortHistory": "Botella de un litro de la popular Amstel Clásica española, ligera, refrescante y pensada para compartir en mesas y reuniones cotidianas.",
        "style": "Lager",
        "abv": "4.80",
        "country": "España"
      },
      {
        "name": "Amstel Oro 0,0 Tostada Botellín",
        "format": "botellin",
        "barcode": "8410569320020",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Amstel Oro 0,0 % elaborado con malta tostada en tres tiempos para lograr cuerpo cremoso y aroma tostado sin gota de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel Radler Limón Botellín",
        "format": "botellin",
        "barcode": "8410569620014",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Amstel Radler que une cerveza rubia y zumo natural de limón para brindar frescor inmediato con baja graduación de 2,0 % vol.",
        "style": "Lager",
        "abv": "2.00",
        "country": "España"
      },
      {
        "name": "Amstel Radler 0,0 Limón Botellín",
        "format": "botellin",
        "barcode": "8712000034177",
        "extraBarcodes": [],
        "shortHistory": "Versión en botellín de Amstel Radler 0,0 %, combinando cerveza sin alcohol y zumo natural de limón con acabado ligero y sumamente refrescante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel Radler Tostada 0,0% Lata",
        "format": "lata",
        "barcode": "8410569520017",
        "extraBarcodes": [],
        "shortHistory": "Original combinación de cerveza tostada sin alcohol Amstel y zumo natural de limón, fusionando notas caramelizadas con chispa cítrica 0,0 %.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Amstel Light Botellín",
        "format": "botellin",
        "barcode": "8712000026776",
        "extraBarcodes": [
          "07289440",
          "8712000026783"
        ],
        "shortHistory": "Versión ligera internacional de Amstel de cuerpo ágil, amargor sutil y menor aporte calórico elaborada con cebada seleccionada de primavera.",
        "style": "Lager",
        "abv": "3.50",
        "country": "Países Bajos"
      }
    ]
  },
  {
    "name": "Dorada",
    "logoUrl": "brand://dorada",
    "history": "Elaborada en Santa Cruz de Tenerife desde 1939 por Compañía Cervecera de Canarias, representa el carácter isleño con recetas desde su clásica Pilsen hasta gama Especial.",
    "beers": [
      {
        "name": "Dorada Pilsen Botellín",
        "format": "botellin",
        "barcode": "8414161001028",
        "extraBarcodes": [
          "84153128",
          "84198532"
        ],
        "shortHistory": "La rubia histórica de Tenerife desde 1939, una Pilsen luminosa y ligera con equilibrio perfecto entre malta suave y amargor isleño muy refrescante.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Dorada Pilsen Lata",
        "format": "lata",
        "barcode": "8414161001059",
        "extraBarcodes": [
          "7401000701288",
          "8410793026132",
          "8414161001103"
        ],
        "shortHistory": "Versión en lata de Dorada Pilsen canaria, dorada y burbujeante para disfrutar bien fría frente al Atlántico en cualquier época del año.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Dorada Especial Original Botellín",
        "format": "botellin",
        "barcode": "8414161001141",
        "extraBarcodes": [
          "8414161001073",
          "8414161500286"
        ],
        "shortHistory": "Lager especial tinerfeña de maduración prolongada con sabor intenso, notas florales de lúpulo y un color ámbar dorado premiado con medallas.",
        "style": "Lager",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "Dorada Especial Roja Botellín",
        "format": "botellin",
        "barcode": "8414161000038",
        "extraBarcodes": [],
        "shortHistory": "Variedad especial canaria de tonalidad cobriza intensa y maltas caramelizadas que brindan notas cálidas a cereal tostado y amargor muy redondo.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Dorada Especial Trigo Botellín",
        "format": "botellin",
        "barcode": "8414161001172",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo de la colección Dorada Especial en Canarias, suavemente turbia, refrescante y con delicados aromas frutales a plátano y especias.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "Dorada Especial Negra Botellín",
        "format": "botellin",
        "barcode": "8414161001202",
        "extraBarcodes": [],
        "shortHistory": "Receta negra isleña de Dorada Especial elaborada con maltas oscuras torrefactas que despliegan matices elegantes de café tostado, cacao y caramelo.",
        "style": "Negra",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Dorada Sin 0,0 Lata",
        "format": "lata",
        "barcode": "8414161001080",
        "extraBarcodes": [],
        "shortHistory": "Cerveza canaria sin alcohol ligera y dorada que conserva el sabor malteado y la frescura atlántica de Dorada Pilsen sin graduación alcohólica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Dorada Sin con Limón 0,0 Lata",
        "format": "lata",
        "barcode": "8414161000007",
        "extraBarcodes": [],
        "shortHistory": "Mezcla sin alcohol de cerveza Dorada y refrescante zumo de limón natural, creando una clara isleña cítrica y chispeante con cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Dorada Pilsen Litrona",
        "format": "litrona",
        "barcode": "8414161001097",
        "extraBarcodes": [],
        "shortHistory": "Botella de un litro de la histórica Dorada Pilsen de Tenerife para compartir bien fría, conservando su equilibrio dorado y burbuja isleña.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Dorada Especial Original Lata",
        "format": "lata",
        "barcode": "8414161001219",
        "extraBarcodes": [],
        "shortHistory": "Lata de Dorada Especial Original tinerfeña con maduración prolongada, cuerpo intenso y delicadas notas florales premiadas internacionalmente.",
        "style": "Lager",
        "abv": "5.70",
        "country": "España"
      },
      {
        "name": "Dorada Especial Roja Lata",
        "format": "lata",
        "barcode": "8414161001615",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de la cerveza tostada Dorada Especial Roja con reflejos cobrizos, dulzor de maltas caramelizadas y final redondo y cálido.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Dorada Sin 0,0 Botellín",
        "format": "botellin",
        "barcode": "8414161001042",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Dorada Sin 0,0 % tinerfeña que conserva el frescor atlántico y el sabor maltoso tradicional completamente libre de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Dorada Sin con Limón 0,0 Botellín",
        "format": "botellin",
        "barcode": "8414161000052",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Dorada Sin con Limón 0,0 %, fusionando cerveza canaria sin alcohol y zumo cítrico para ofrecer una bebida ligera y vibrante.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Dorada Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8414161041185",
        "extraBarcodes": [],
        "shortHistory": "Versión apta para celíacos de Dorada Pilsen elaborada en Tenerife, manteniendo intacta su ligereza brillante y suave amargor tradicional.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      }
    ]
  },
  {
    "name": "Tropical",
    "logoUrl": "brand://tropical",
    "history": "Nacida en Las Palmas de Gran Canaria en 1924 con su inconfundible perro Dogo en la etiqueta, es la cerveza icono de la provincia de Las Palmas y el sol canario.",
    "beers": [
      {
        "name": "Tropical Pilsen Botellín",
        "format": "botellin",
        "barcode": "8410590011379",
        "extraBarcodes": [
          "84152657",
          "8410590011416",
          "8411327013567"
        ],
        "shortHistory": "La cerveza de Gran Canaria desde 1924, lager Pilsen ligera y cristalina con suave aroma floral y un punto amargo refrescante para climas cálidos.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Tropical Pilsen Lata",
        "format": "lata",
        "barcode": "8410590012543",
        "extraBarcodes": [
          "8410590012550"
        ],
        "shortHistory": "Lata icónica con el perro Dogo grancanario, guardando la clásica lager dorada ligera pensada para disfrutar bien fría junto al mar.",
        "style": "Lager",
        "abv": "4.70",
        "country": "España"
      },
      {
        "name": "Tropical Limón Botellín",
        "format": "botellin",
        "barcode": "8410590200131",
        "extraBarcodes": [
          "8410590200087",
          "8410590504727",
          "8410590200094"
        ],
        "shortHistory": "La cerveza Tropical grancanaria combinada con zumo natural de limón, ofreciendo una bebida cítrica, ligera y llena de frescura veraniega.",
        "style": "Lager",
        "abv": "2.00",
        "country": "España"
      },
      {
        "name": "Tropical Limón Lata",
        "format": "lata",
        "barcode": "8410590200117",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de Tropical Limón con el equilibrio justo entre malta suave y limón mediterráneo-atlántico para refrescar cualquier tarde.",
        "style": "Lager",
        "abv": "2.00",
        "country": "España"
      },
      {
        "name": "Tropical 1924 Especial Botellín",
        "format": "botellin",
        "barcode": "8410590040195",
        "extraBarcodes": [],
        "shortHistory": "Homenaje al año fundacional de 1924 en Gran Canaria, una cerveza dorada con doble lúpulo, espuma persistente y mayor carácter en cada sorbo.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Tropical 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8410590015544",
        "extraBarcodes": [],
        "shortHistory": "Alternativa sin alcohol de la histórica cerveza de Las Palmas, conservando su ligereza brillante y sus notas sutiles de cereal dulce sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Tropical 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "8410590015476",
        "extraBarcodes": [],
        "shortHistory": "Botellín de Tropical 0,0 % elaborada en Las Palmas, conservando el paso suave, dorado limpio y frescura isleña sin presencia alcohólica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      }
    ]
  },
  {
    "name": "Moritz",
    "logoUrl": "brand://moritz",
    "history": "Fundada en Barcelona en 1856 por el alsaciano Louis Moritz con agua del manantial del Montseny y flor de lúpulo Saaz sin pasteurizar en sus cervezas frescas.",
    "beers": [
      {
        "name": "Moritz Original Botellín",
        "format": "botellin",
        "barcode": "8410700005632",
        "extraBarcodes": [
          "84107268",
          "8410700003911"
        ],
        "shortHistory": "La clásica barcelonesa creada en 1856 con agua blanda del Montseny y lúpulo en flor de Saaz, suave, dorada y de elegante frescor aromático.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Moritz Original Lata",
        "format": "lata",
        "barcode": "8410700002136",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de 33 cl de la icónica Moritz de Barcelona, manteniendo el aroma floral del lúpulo checo y su trago ligero y equilibrado.",
        "style": "Lager",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Moritz 7 Botellín",
        "format": "botellin",
        "barcode": "8410700005328",
        "extraBarcodes": [
          "8410700005335",
          "8410700008367"
        ],
        "shortHistory": "Lager especial barcelonesa 100 % malta nacida tras dos años de pruebas, combinando dos maltas y equilibrio amable entre dulzor y amargor limpio.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Moritz Epidor Tostada Botellín",
        "format": "botellin",
        "barcode": "8410700003591",
        "extraBarcodes": [],
        "shortHistory": "Receta histórica de Moritz con 7,2 % vol., elaborada con malta caramelo para desplegar un color ámbar oscuro y sabores intensos y licorosos.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Moritz 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "8410700002372",
        "extraBarcodes": [
          "84107275"
        ],
        "shortHistory": "Conocida como Aigua de Moritz sin alcohol, se elabora con agua del Montseny y lúpulo Saaz ofreciendo ligereza floral con cero grados.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Moritz 0,0 Tostada Botellín",
        "format": "botellin",
        "barcode": "8410700007001",
        "extraBarcodes": [],
        "shortHistory": "Versión tostada 0,0 % de la histórica casa barcelonesa, combinando cuatro maltas caramelizadas que evocan aromas a pan tostado y caramelo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Moritz Radler Limón Lata",
        "format": "lata",
        "barcode": "8410700005052",
        "extraBarcodes": [],
        "shortHistory": "Fusión mediterránea de Moritz con zumo natural de limón al 50 %, logrando una clara fresca de 2,8 grados con fragancia cítrica inmediata.",
        "style": "Lager",
        "abv": "2.80",
        "country": "España"
      },
      {
        "name": "Moritz Red IPA Botellín",
        "format": "botellin",
        "barcode": "8410700004215",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de alta fermentación y tono rojizo elaborada en Barcelona con cinco lúpulos americanos, rica en notas de fruta tropical y amargor firme.",
        "style": "IPA",
        "abv": "5.40",
        "country": "España"
      },
      {
        "name": "Moritz Negra Botellín",
        "format": "botellin",
        "barcode": "8410700005953",
        "extraBarcodes": [],
        "shortHistory": "Cerveza oscura barcelonesa elaborada con mezcla de maltas torrefactas que despliega espuma crema y matices tostados de cacao y café espresso.",
        "style": "Negra",
        "abv": "4.50",
        "country": "España"
      },
      {
        "name": "Moritz 7 Lata",
        "format": "lata",
        "barcode": "8410700005359",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de Moritz 7 100 % malta de Barcelona, combinando dos maltas en un cuerpo dorado amable y amargor limpio para cualquier plan.",
        "style": "Lager",
        "abv": "5.50",
        "country": "España"
      },
      {
        "name": "Moritz Epidor Tostada Lata",
        "format": "lata",
        "barcode": "8410700003577",
        "extraBarcodes": [],
        "shortHistory": "Lata de la histórica receta barcelonesa Epidor con 7,2 % vol., destacando su color ámbar intenso y notas cálidas de caramelo tostado.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Moritz 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8410700003133",
        "extraBarcodes": [],
        "shortHistory": "Aigua de Moritz sin alcohol en formato lata, elaborada con agua mineral del Montseny y lúpulo Saaz aromático para ofrecer ligereza 0,0 %.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Moritz 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8410700007018",
        "extraBarcodes": [],
        "shortHistory": "Lata de Moritz 0,0 % Tostada elaborada con cuatro maltas caramelizadas que evocan aromas a pan horneado y toffee con cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Moritz Radler Limón Botellín",
        "format": "botellin",
        "barcode": "8410700005021",
        "extraBarcodes": [
          "8410700005038"
        ],
        "shortHistory": "Botellín de Moritz Radler mezclada con auténtico zumo natural de limón, ofreciendo frescura cítrica inmediata y 2,8 % grados alcohólicos.",
        "style": "Lager",
        "abv": "2.80",
        "country": "España"
      }
    ]
  },
  {
    "name": "Keler",
    "logoUrl": "brand://keler",
    "history": "Creada en Donostia-San Sebastián en 1872 por los hermanos alemanes Juan y Teodoro Kutz, famosa por su clásica Keler 18 de mayor cuerpo y receta tradicional vasca.",
    "beers": [
      {
        "name": "Keler 18 Botellín",
        "format": "botellin",
        "barcode": "8410793181947",
        "extraBarcodes": [
          "8410793183842",
          "8410793183941"
        ],
        "shortHistory": "Creada en San Sebastián por maestros alemanes de la familia Kutz, combina malta, maíz y lúpulo aromático en una lager intensa de 6,5 % vol.",
        "style": "Lager",
        "abv": "6.50",
        "country": "España"
      },
      {
        "name": "Keler 18 Lata",
        "format": "lata",
        "barcode": "8410793186133",
        "extraBarcodes": [
          "8410793186126"
        ],
        "shortHistory": "Versión en lata de la donostiarra Keler 18, manteniendo su densidad sedosa, espuma cremosa consistente y sabor contundente de estilo vasco-alemán.",
        "style": "Lager",
        "abv": "6.50",
        "country": "España"
      },
      {
        "name": "Keler 0,0 Tostada Lata",
        "format": "lata",
        "barcode": "8410793906137",
        "extraBarcodes": [],
        "shortHistory": "Alternativa sin alcohol de la marca guipuzcoana elaborada con maltas tostadas que conservan notas profundas a café, caramelo y cereal.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "Keler 18 Litrona",
        "format": "litrona",
        "barcode": "8410793173119",
        "extraBarcodes": [],
        "shortHistory": "Botella de un litro de la emblemática Keler 18 vasca, perfecta para compartir su carácter intenso de 6,5 % vol. y densa espuma cremosa.",
        "style": "Lager",
        "abv": "6.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "La Salve",
    "logoUrl": "brand://la-salve",
    "history": "Cervecera bilbaína fundada en 1886 junto a la ría y renacida en 2014 con cebada alavesa, manteniendo la tradición cervecera local de Bilbao sin pasteurizar.",
    "beers": [
      {
        "name": "La Salve Lager Auténtica Botellín",
        "format": "botellin",
        "barcode": "8414606746880",
        "extraBarcodes": [
          "8436598200072"
        ],
        "shortHistory": "Elaborada en Bilbao con cebada alavesa y lúpulo noble, esta lager 100 % malta luce color dorado brillante con aromas herbales y fruta blanca.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Salve Lager Auténtica Lata",
        "format": "lata",
        "barcode": "8436598200058",
        "extraBarcodes": [],
        "shortHistory": "La rubia auténtica de Bilbao en formato lata de 33 cl, manteniendo la frescura sin conservantes ni azúcares añadidos de la ría vizcaína.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Salve Botxo Trigo con Naranja Botellín",
        "format": "botellin",
        "barcode": "8414606747054",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo bilbaína aromatizada con piel de naranja dulce y amarga, ofreciendo textura sedosa, turbidez natural y final cítrico vibrante.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Salve Lucía Roja Botellín",
        "format": "botellin",
        "barcode": "8436598200010",
        "extraBarcodes": [
          "8436598200027"
        ],
        "shortHistory": "Homenaje a Lucía Yarza, primera mujer al frente de la fábrica en 1916; una cerveza tostada ambarina con notas suaves a malta dulce y caramelo.",
        "style": "Tostada",
        "abv": "5.20",
        "country": "España"
      }
    ]
  },
  {
    "name": "El Alcázar",
    "logoUrl": "brand://el-alcazar",
    "history": "Icono cervecero de Jaén nacido en 1928 en la fábrica de La Imora, rescatado con su emblemático vidrio verde y su lúpulo añadido en frío.",
    "beers": [
      {
        "name": "El Alcázar Especial Botellín",
        "format": "botellin",
        "barcode": "8413510010018",
        "extraBarcodes": [
          "8413510010001"
        ],
        "shortHistory": "Elaborada en Jaén inspirándose en su receta histórica de 1928 con malta Biscuit y técnica late hopping de lúpulo Citra que aporta 6 % vol.",
        "style": "Lager",
        "abv": "6.00",
        "country": "España"
      },
      {
        "name": "El Alcázar Especial Lata",
        "format": "lata",
        "barcode": "8411090019346",
        "extraBarcodes": [
          "8411090019384",
          "8437010749032"
        ],
        "shortHistory": "Formato lata de la cerveza jiennense de 6 % vol., conservando sus reflejos ambarinos profundos y su aroma cítrico tropical gracias al lúpulo Citra.",
        "style": "Lager",
        "abv": "6.00",
        "country": "España"
      }
    ]
  },
  {
    "name": "La Sagra",
    "logoUrl": "brand://la-sagra",
    "history": "Cervecera independiente nacida en Numancia de la Sagra (Toledo) en 2011 que fusiona tradiciones cerveceras globales bajo el lema «El sabor es sagrado».",
    "beers": [
      {
        "name": "La Sagra Original Botellín",
        "format": "botellin",
        "barcode": "8437011685018",
        "extraBarcodes": [],
        "shortHistory": "Rubia artesanal toledana de fermentación limpia con cuatro maltas y lúpulos nobles que equilibran notas frutales con un paso sedoso.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "La Sagra Bohemia Lager Botellín",
        "format": "botellin",
        "barcode": "8593868005857",
        "extraBarcodes": [],
        "shortHistory": "Lager checa elaborada con malta de Bohemia y lúpulo Saaz para lograr un perfil dorado tradicional muy refrescante y de amargor elegante.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Sagra Doble Malta Botellín",
        "format": "botellin",
        "barcode": "8437019693596",
        "extraBarcodes": [],
        "shortHistory": "Cerveza castellana de doble malta y color oro cobrizo intenso con aroma tostado a caramelo, pan artesanal y cuerpo equilibrado de 6,4 % vol.",
        "style": "Tostada",
        "abv": "6.40",
        "country": "España"
      },
      {
        "name": "La Sagra Criolla Roja Botellín",
        "format": "botellin",
        "barcode": "8437011685032",
        "extraBarcodes": [],
        "shortHistory": "Cerveza roja artesanal de alta fermentación con reflejos cobrizos, cuerpo medio y notas golosas a frutos rojos y caramelo suave de malta.",
        "style": "Tostada",
        "abv": "6.10",
        "country": "España"
      },
      {
        "name": "La Sagra IPA Botellín",
        "format": "botellin",
        "barcode": "8437011685100",
        "extraBarcodes": [],
        "shortHistory": "India Pale Ale nacida en Toledo con una generosa carga de lúpulos cítricos y florales que despiertan aromas a pomelo, pino y frutas exóticas.",
        "style": "IPA",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "La Sagra Blanca de Trigo Botellín",
        "format": "botellin",
        "barcode": "8437011685094",
        "extraBarcodes": [],
        "shortHistory": "Blanca estilo belga elaborada en La Sagra con trigo, semillas de cilantro y piel de naranja creando un trago cítrico, especiado y refrescante.",
        "style": "Trigo",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "La Sagra Mulata Negra Botellín",
        "format": "botellin",
        "barcode": "8437019693206",
        "extraBarcodes": [],
        "shortHistory": "Porter oscura de color casi negro y espuma color moca con intensos aromas a cacao, café tostado y un sutil retrogusto acaramelado.",
        "style": "Negra",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Sagra Sin Gluten Botellín",
        "format": "botellin",
        "barcode": "8437019693251",
        "extraBarcodes": [
          "8437019693930"
        ],
        "shortHistory": "Receta toledana certificada sin gluten elaborada con maltas de cebada tratadas suavemente manteniendo aroma limpio y frescor dorado.",
        "style": "Lager",
        "abv": "4.90",
        "country": "España"
      },
      {
        "name": "La Sagra 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "8437025695171",
        "extraBarcodes": [
          "8437019693381"
        ],
        "shortHistory": "Alternativa sin alcohol elaborada en Toledo para conservar aromas maltosos limpios y amargor ligero sin presencia alcohólica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "La Sagra Summer Ale Botellín",
        "format": "botellin",
        "barcode": "8437011685179",
        "extraBarcodes": [],
        "shortHistory": "Edición veraniega toledana aromática y refrescante con toque cítrico de limón y lúpulos ligeros pensada para tardes soleadas.",
        "style": "Lager",
        "abv": "4.50",
        "country": "España"
      },
      {
        "name": "La Sagra Original Lata",
        "format": "lata",
        "barcode": "8593868005833",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de la rubia artesanal toledana con cuatro maltas y paso sedoso, manteniendo intactos sus aromas florales y frutales.",
        "style": "Lager",
        "abv": "5.20",
        "country": "España"
      },
      {
        "name": "La Sagra Bohemia Lager Lata",
        "format": "lata",
        "barcode": "8593868008377",
        "extraBarcodes": [],
        "shortHistory": "Lata de La Sagra Bohemia Lager elaborada con malta checa y lúpulo Saaz para brindar un trago dorado limpio y amargor refinado.",
        "style": "Lager",
        "abv": "5.00",
        "country": "España"
      },
      {
        "name": "La Sagra 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8437025695195",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de La Sagra 0,0 % pensada para disfrutar de aromas limpios a cereal malteado y lúpulo suave sin gota de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "España"
      },
      {
        "name": "La Sagra Calabaza Especiada Botellín",
        "format": "botellin",
        "barcode": "8437011685155",
        "extraBarcodes": [],
        "shortHistory": "Edición estacional toledana elaborada con auténtica calabaza asada, canela y clavo, convirtiéndose en un clásico otoñal muy aromático.",
        "style": "Tostada",
        "abv": "6.50",
        "country": "España"
      }
    ]
  },
  {
    "name": "Voll-Damm",
    "logoUrl": "brand://voll-damm",
    "history": "Lanzada en Barcelona en 1953 por maestros cerveceros de Damm siguiendo el estilo alemán Märzenbier, es la cerveza de doble malta más icónica y premiada de España.",
    "beers": [
      {
        "name": "Voll-Damm Doble Malta Botellín",
        "format": "botellin",
        "barcode": "8410793031945",
        "extraBarcodes": [
          "8410793032935",
          "8410793037336",
          "8410793000958",
          "8410793033840",
          "8410793033123"
        ],
        "shortHistory": "Nacida en 1953 como Märzenbier con el doble de malta, ofrece cuerpo denso, color cobrizo brillante y notas intensas a fruta madura y lúpulo Nugget.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Voll-Damm Doble Malta Lata",
        "format": "lata",
        "barcode": "8410793036131",
        "extraBarcodes": [
          "8410793036230",
          "8410793036124"
        ],
        "shortHistory": "La potente Märzenbier barcelonesa de doble malta en formato lata, ideal para paladares que buscan sabor intenso, espuma persistente y gran cuerpo.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "Voll-Damm Doble Malta Litrona",
        "format": "litrona",
        "barcode": "8410793031969",
        "extraBarcodes": [],
        "shortHistory": "Formato de gran capacidad de la icónica Voll-Damm Märzenbier de doble malta y 7,2 % vol., pensada para compartir su carácter intenso y cobrizo.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "España"
      }
    ]
  },
  {
    "name": "1906",
    "logoUrl": "brand://1906",
    "history": "La familia reserva nacida en A Coruña homenajea el año fundacional de Hijos de Rivera con largas maduraciones en bodega, maltas especiales y carácter premiado.",
    "beers": [
      {
        "name": "1906 Reserva Especial Botellín",
        "format": "botellin",
        "barcode": "8412598004964",
        "extraBarcodes": [
          "8412598033117",
          "8412598005060",
          "8412598000966",
          "8412598005121",
          "8441277034213",
          "8412598004766"
        ],
        "shortHistory": "Homenaje al año de fundación de Hijos de Rivera, combina maltas tostadas y lúpulos Perle y Nugget en una cerveza ámbar intensa de largo posgusto.",
        "style": "Tostada",
        "abv": "6.50",
        "country": "España"
      },
      {
        "name": "1906 Reserva Especial Lata",
        "format": "lata",
        "barcode": "8412598004933",
        "extraBarcodes": [],
        "shortHistory": "La célebre Helles Bock gallega de 1906 en lata dorada, con aromas cálidos a malta caramelizada, notas florales y espuma cremosa persistente.",
        "style": "Tostada",
        "abv": "6.50",
        "country": "España"
      },
      {
        "name": "1906 Red Vintage Botellín",
        "format": "botellin",
        "barcode": "8412598001437",
        "extraBarcodes": [
          "8412598005015",
          "8412598004896",
          "8412598006050"
        ],
        "shortHistory": "Recuperación de la mítica receta La Colorada, una Doppelbock intensa con tonos rubíes, aroma tostado profundo y un final licoroso equilibrado.",
        "style": "Tostada",
        "abv": "8.00",
        "country": "España"
      },
      {
        "name": "1906 Red Vintage Lata",
        "format": "lata",
        "barcode": "8412598004872",
        "extraBarcodes": [],
        "shortHistory": "La potente Doppelbock gallega La Colorada en formato lata, con ocho grados de carácter maltoso, notas a caramelo tostado y amargor elegante.",
        "style": "Tostada",
        "abv": "8.00",
        "country": "España"
      },
      {
        "name": "1906 Black Coupage Botellín",
        "format": "botellin",
        "barcode": "8412598001628",
        "extraBarcodes": [
          "8412598005879",
          "8412598006036"
        ],
        "shortHistory": "Cerveza negra estilo Dunkel elaborada con cuatro maltas torrefactas y lúpulos nobles que aportan notas de café recién molido, cacao y regaliz.",
        "style": "Negra",
        "abv": "7.20",
        "country": "España"
      },
      {
        "name": "1906 Galician Irish Red Ale Botellín",
        "format": "botellin",
        "barcode": "8412598006074",
        "extraBarcodes": [
          "8412598006081"
        ],
        "shortHistory": "Alianza entre la tradición gallega e irlandesa con cuatro maltas y cuatro lúpulos que brindan color cobrizo, espuma seca y toque acaramelado.",
        "style": "Tostada",
        "abv": "5.00",
        "country": "España"
      }
    ]
  },
  {
    "name": "Budweiser",
    "logoUrl": "brand://budweiser",
    "history": "Nacida en San Luis (EE. UU.) en 1876 por Adolphus Busch, esta lager americana famosa como The King of Beers madura sobre virutas de madera de haya.",
    "beers": [
      {
        "name": "Budweiser Original Botellín",
        "format": "botellin",
        "barcode": "0018200001819",
        "extraBarcodes": [
          "5014379002973",
          "5014379004601",
          "5014379109597",
          "5410228268666",
          "5014379004519",
          "5014379020458",
          "5014379007237",
          "5010017109615",
          "5014379008630",
          "5014379020496",
          "5014379030556",
          "7792798011179",
          "0018200110368",
          "01812620"
        ],
        "shortHistory": "Elaborada desde 1876 con malta de cebada, arroz seleccionado y maduración sobre madera de haya para lograr una lager nítida, suave y refrescante.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Budweiser Original Lata",
        "format": "lata",
        "barcode": "5014379003130",
        "extraBarcodes": [
          "5014379013740",
          "01801828",
          "7802130002540",
          "7891991010481",
          "5010017116378",
          "01821220",
          "5014379004465",
          "10170134",
          "0018200000164",
          "0018200001635",
          "0018200110474",
          "01801624",
          "5014379003161",
          "5014379004502",
          "5014379013979",
          "5014379015591",
          "7792798004652"
        ],
        "shortHistory": "La icónica lata roja americana conocida como The King of Beers, ligera y crujiente con notas limpias de malta dulce y final muy seco.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Budweiser Zero 0,0 Lata",
        "format": "lata",
        "barcode": "0018200200380",
        "extraBarcodes": [
          "0312379524958"
        ],
        "shortHistory": "Alternativa americana sin alcohol y sin azúcar añadida que reproduce la frescura ligera y el acabado limpio de la Budweiser clásica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Budweiser Zero 0,0 Botellín",
        "format": "botellin",
        "barcode": "5410228337577",
        "extraBarcodes": [
          "7891991298445"
        ],
        "shortHistory": "Versión sin alcohol en botellín de vidrio pensada para disfrutar el clásico perfil lager norteamericano con cero gramos de azúcar y cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Light Lata",
        "format": "lata",
        "barcode": "0018200530470",
        "extraBarcodes": [
          "0018200008337",
          "0018200530302",
          "0018200531682",
          "5014379028508",
          "5014379030549"
        ],
        "shortHistory": "Lanzada en 1982 como la light lager más vendida de Estados Unidos, caracterizada por su extrema ligereza, suavidad y baja carga calórica.",
        "style": "Lager",
        "abv": "4.20",
        "country": "Estados Unidos"
      },
      {
        "name": "Budweiser Select Botellín",
        "format": "botellin",
        "barcode": "0018200030437",
        "extraBarcodes": [
          "01840623",
          "01840128"
        ],
        "shortHistory": "Lager norteamericana de perfil estilizado y fermentación prolongada con menos hidratos de carbono y un trago limpio de amargor delicado.",
        "style": "Lager",
        "abv": "4.30",
        "country": "Estados Unidos"
      },
      {
        "name": "Budweiser Original Litrona",
        "format": "litrona",
        "barcode": "8902246000597",
        "extraBarcodes": [
          "0018200250002",
          "5014379004533",
          "8908000596276"
        ],
        "shortHistory": "Botella de gran formato de la clásica lager norteamericana madurada en madera de haya, ideal para compartir su trago nítido y crujiente.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Light Botellín",
        "format": "botellin",
        "barcode": "0018200250019",
        "extraBarcodes": [
          "0018200532184",
          "0018200533150",
          "01853821",
          "0018200007699",
          "5014379005370",
          "01845628",
          "01840827"
        ],
        "shortHistory": "Botellín de la célebre light lager estadounidense con malta de cebada, arroz y menor contenido calórico para un paso suave y refrescante.",
        "style": "Lager",
        "abv": "4.20",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Light Lime Lata",
        "format": "lata",
        "barcode": "0018200962943",
        "extraBarcodes": [
          "0018200149900",
          "0018200001789",
          "0018200002236",
          "0018200250095",
          "0018200969348",
          "0062067422638"
        ],
        "shortHistory": "Versión cítrica de Bud Light con un toque natural de lima verde que realza su ligereza brillante para tardes cálidas de verano.",
        "style": "Lager",
        "abv": "4.20",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Ice Lata",
        "format": "lata",
        "barcode": "0018200250064",
        "extraBarcodes": [
          "0018200004957",
          "01824324",
          "01848926"
        ],
        "shortHistory": "Lager filtrada bajo cero durante el proceso de ice brewing en Estados Unidos para intensificar suavidad y alcanzar 5,5 % grados.",
        "style": "Lager",
        "abv": "5.50",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Light Platinum Botellín",
        "format": "botellin",
        "barcode": "0018200009075",
        "extraBarcodes": [
          "0018200189920"
        ],
        "shortHistory": "Presentada en característica botella azul cobalto, combina la ligereza limpia de Bud Light con una mayor graduación alcohólica de 6,0 %.",
        "style": "Lager",
        "abv": "6.00",
        "country": "Estados Unidos"
      },
      {
        "name": "Bud Light Next Lata",
        "format": "lata",
        "barcode": "0018200262920",
        "extraBarcodes": [],
        "shortHistory": "Innovadora lager norteamericana sin carbohidratos elaborada tras diez años de desarrollo para ofrecer frescor ligero con solo 80 calorías.",
        "style": "Lager",
        "abv": "4.00",
        "country": "Estados Unidos"
      }
    ]
  },
  {
    "name": "Stella Artois",
    "logoUrl": "brand://stella-artois",
    "history": "Creada originalmente en Lovaina (Bélgica) en 1926 como cerveza navideña bajo raíces cerveceras de 1366, famosa por su cáliz dorado y lúpulo europeo Saaz.",
    "beers": [
      {
        "name": "Stella Artois Original Botellín",
        "format": "botellin",
        "barcode": "5410228141266",
        "extraBarcodes": [
          "5410228141235",
          "5410228147916",
          "0786150000250",
          "5410228264323",
          "5410228264743",
          "5410228170440",
          "5410228147855",
          "0786150000052",
          "7501064199141"
        ],
        "shortHistory": "Pilsner belga elaborada en Lovaina con lúpulo checo Saaz y cebada malteada, brindando un equilibrio clásico entre aroma floral y amargor seco.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Original Lata",
        "format": "lata",
        "barcode": "5410228141303",
        "extraBarcodes": [
          "5410228141327",
          "5410228217718",
          "5410228217732",
          "5014379003475",
          "5998817521953",
          "5410228283317",
          "3850131486009",
          "3800052304111",
          "0018200261237",
          "5410228260516",
          "5410228280156",
          "0786150000236",
          "5410228217695",
          "5410228104520"
        ],
        "shortHistory": "La clásica pilsner belga en lata blanca con ribetes dorados, conservando la frescura herbácea del lúpulo Saaz y una espuma firme y elegante.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "5410228279518",
        "extraBarcodes": [
          "5410228272489"
        ],
        "shortHistory": "Versión sin alcohol nacida en Lovaina con los mismos ingredientes de la receta belga original, conservando notas secas de cereal y lúpulo Saaz.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "8600105005218",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Stella Artois sin alcohol con solo sesenta calorías por unidad y un acabado seco y crujiente idóneo para el aperitivo.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Unfiltered Botellín",
        "format": "botellin",
        "barcode": "5014379017687",
        "extraBarcodes": [],
        "shortHistory": "Lager belga sin filtrar de aspecto dorado naturalmente turbio, más jugosa y aromática con notas de manzana verde y cereal fresco de malta.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Gluten Free Botellín",
        "format": "botellin",
        "barcode": "5014379006605",
        "extraBarcodes": [
          "5014379012934"
        ],
        "shortHistory": "Variante certificada sin gluten elaborada en Bélgica manteniendo todo el perfil floral del lúpulo Saaz y la finura clásica del cáliz dorado.",
        "style": "Lager",
        "abv": "4.80",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Original Litrona",
        "format": "litrona",
        "barcode": "5410228143376",
        "extraBarcodes": [
          "0018200261244",
          "0786150000571",
          "5014379012958",
          "7792798014378"
        ],
        "shortHistory": "Botella de gran formato de la clásica pilsner belga de Lovaina con lúpulo checo Saaz, ideal para servir fría en mesas compartidas.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Unfiltered Lata",
        "format": "lata",
        "barcode": "5014379017106",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Stella Artois sin filtrar, conservando turbidez natural, notas frescas de cereal y aroma floral más expresivo.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Solstice Lager Botellín",
        "format": "botellin",
        "barcode": "0018200260391",
        "extraBarcodes": [
          "0018200201882",
          "0018200201899"
        ],
        "shortHistory": "Edición dorada de triple filtrado creada por los maestros belgas de Lovaina con notas sutiles cítricas y un final aún más suave y limpio.",
        "style": "Lager",
        "abv": "4.50",
        "country": "Bélgica"
      },
      {
        "name": "Stella Artois Midnight Lager Botellín",
        "format": "botellin",
        "barcode": "0018200203084",
        "extraBarcodes": [],
        "shortHistory": "Lager oscura especial de Lovaina elaborada con cebada malteada tostada que combina color negro profundo con suavidad belga tradicional.",
        "style": "Negra",
        "abv": "5.40",
        "country": "Bélgica"
      }
    ]
  },
  {
    "name": "Carlsberg",
    "logoUrl": "brand://carlsberg",
    "history": "Fundada por J. C. Jacobsen en Copenhague en 1847, revolucionó la industria mundial aislando la levadura pura de fermentación baja Saccharomyces carlsbergensis.",
    "beers": [
      {
        "name": "Carlsberg Danish Pilsner Botellín",
        "format": "botellin",
        "barcode": "5740600510602",
        "extraBarcodes": [
          "3080216008622",
          "3080216027647",
          "3080216041148",
          "3080216027104",
          "3080216055084",
          "5010153791194",
          "5740600514143",
          "8411327221016",
          "8410793002129",
          "7044610874999"
        ],
        "shortHistory": "Creada en Copenhague en 1847 con levadura pura propia, esta Pilsner danesa equilibra frescor herbal, notas sutiles de manzana y amargor limpio.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Danish Pilsner Lata",
        "format": "lata",
        "barcode": "5740600371685",
        "extraBarcodes": [
          "5010153763634",
          "5740600020637",
          "3080216004983",
          "3080216053660",
          "5010153771622",
          "5010153870899",
          "5601164164703",
          "5601164164741",
          "5740600510350",
          "7310070000361",
          "7310070003010",
          "7310070003577",
          "8007950015018",
          "8007950015025",
          "9421030100057",
          "3080216053677",
          "3080216055909",
          "42278047"
        ],
        "shortHistory": "La icónica lata verde danesa con corona real, conservando intacto su paso ligero, malta Pilsen y aroma fresco a lúpulo europeo.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg 0,0 Sin Alcohol Lata",
        "format": "lata",
        "barcode": "3080216055893",
        "extraBarcodes": [
          "5900014005280"
        ],
        "shortHistory": "Versión sin alcohol de la pilsner de Copenhague con aroma fresco a cereal, flores blancas y un acabado seco que mantiene su chispa cervecera.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg 0,0 Sin Alcohol Botellín",
        "format": "botellin",
        "barcode": "3080216050447",
        "extraBarcodes": [
          "3800069003397",
          "4101010010624",
          "4101010011508"
        ],
        "shortHistory": "Botellín sin alcohol de la casa danesa Carlsberg, ligero en boca y refrescante para conservar la tradición cervecera nórdica con cero grados.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Elephant Strong Botellín",
        "format": "botellin",
        "barcode": "5740600400507",
        "extraBarcodes": [
          "3080216047072"
        ],
        "shortHistory": "Lanzada en 1959 inspirada en la célebre Puerta de los Elefantes de Copenhague, lager fuerte de 7,2 % con dulzor maltoso y cálido final.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Unfiltered Botellín",
        "format": "botellin",
        "barcode": "3080216054162",
        "extraBarcodes": [
          "3080216055022"
        ],
        "shortHistory": "Versión sin filtrar de la casa Carlsberg de aspecto suavemente velado, aroma lupulado fresco y textura maltosa más redonda y jugosa.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg 1883 Amber Lager Botellín",
        "format": "botellin",
        "barcode": "3080216055053",
        "extraBarcodes": [
          "5740700987182",
          "3080216054094"
        ],
        "shortHistory": "Recreada con la histórica levadura original de 1883 descubierta en el laboratorio Carlsberg, ofreciendo tono ambarino suave y notas a caramelo.",
        "style": "Tostada",
        "abv": "4.60",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Danish Pilsner Litrona",
        "format": "litrona",
        "barcode": "5942045145016",
        "extraBarcodes": [
          "5942045145504"
        ],
        "shortHistory": "Botella de gran formato de la histórica Pilsner danesa nacida en Copenhague, pensada para compartir su frescor herbal y paso ligero.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Export Lata",
        "format": "lata",
        "barcode": "5010153812561",
        "extraBarcodes": [
          "5010153812547"
        ],
        "shortHistory": "Receta premiada nacida en Dinamarca con mayor protagonismo de malta dulce y cuerpo equilibrado frente a la versión Pilsner clásica.",
        "style": "Lager",
        "abv": "4.80",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Export Litrona",
        "format": "litrona",
        "barcode": "5010153812578",
        "extraBarcodes": [],
        "shortHistory": "Botella de 66 cl de Carlsberg Export, ofreciendo la suavidad maltosa danesa y final amargo noble en formato grande para compartir.",
        "style": "Lager",
        "abv": "4.80",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Elephant Strong Lata",
        "format": "lata",
        "barcode": "5740600371807",
        "extraBarcodes": [
          "5740600400415",
          "5740600510008"
        ],
        "shortHistory": "Lata de la potente cerveza danesa Elephant de 7,2 % vol., conservando sus notas cálidas de manzana madura, caramelo y carácter robusto.",
        "style": "Tostada",
        "abv": "7.20",
        "country": "Dinamarca"
      },
      {
        "name": "Carlsberg Special Brew Lata",
        "format": "lata",
        "barcode": "5010153766277",
        "extraBarcodes": [],
        "shortHistory": "Creada en 1950 en honor a Winston Churchill, esta strong lager de 7,5 % destaca por su cuerpo pleno, notas de coñac suave y malta dulce.",
        "style": "Tostada",
        "abv": "7.50",
        "country": "Dinamarca"
      }
    ]
  },
  {
    "name": "Franziskaner",
    "logoUrl": "brand://franziskaner",
    "history": "Cervecera muniquesa nacida en 1363 frente al convento franciscano de Múnich, referente mundial indiscutible en cervezas de trigo Weissbier bajo la Ley de Pureza.",
    "beers": [
      {
        "name": "Franziskaner Hefe-Weissbier Naturtrüb Botellín",
        "format": "botellin",
        "barcode": "4072700003649",
        "extraBarcodes": [
          "4072700001249",
          "4072100001726",
          "4100130003868",
          "4072700001126"
        ],
        "shortHistory": "Cerveza de trigo muniquesa turbia sin filtrar desde 1363, famosa por su corona espumosa abundante y aromas sedosos a plátano maduro y clavo.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Hefe-Weissbier Naturtrüb Lata",
        "format": "lata",
        "barcode": "4072700001775",
        "extraBarcodes": [
          "4072700006350",
          "4072700803829"
        ],
        "shortHistory": "La clásica Weissbier bávara de trigo en lata de 50 cl, protegiendo de la luz toda su frescura cremosa y su perfume afrutado bávaro.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Hefe-Weissbier Dunkel Botellín",
        "format": "botellin",
        "barcode": "4072700001188",
        "extraBarcodes": [],
        "shortHistory": "Weissbier oscura bávara elaborada con mayor proporción de malta de trigo y cebada tostada, desplegando notas a pan negro, nuez y cacao suave.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Weissbier Kristallklar Botellín",
        "format": "botellin",
        "barcode": "4072700001072",
        "extraBarcodes": [],
        "shortHistory": "Cerveza de trigo filtrada hasta alcanzar transparencia dorada cristalina, conservando la efervescencia viva y matices cítricos de Múnich.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Weissbier Alkoholfrei 0,0 Botellín",
        "format": "botellin",
        "barcode": "4072700318675",
        "extraBarcodes": [
          "4072700311034",
          "4072700802525",
          "4072700011637"
        ],
        "shortHistory": "Isotónica natural sin alcohol elaborada en Múnich con trigo malteado y lúpulos aromáticos que mantienen el sabor dulce y frutal sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Alkoholfrei Zitrone 0,0 Botellín",
        "format": "botellin",
        "barcode": "4072700001195",
        "extraBarcodes": [
          "4072700001454",
          "4072700001508"
        ],
        "shortHistory": "Combinación sin alcohol de cerveza de trigo Franziskaner con refrescante toque natural de limón, baja en calorías e ideal tras hacer deporte.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Alkoholfrei Blutorange 0,0 Botellín",
        "format": "botellin",
        "barcode": "4072700002574",
        "extraBarcodes": [
          "4072700002475",
          "4072700002451"
        ],
        "shortHistory": "Cerveza de trigo bávara sin alcohol aromatizada con zumo de naranja sanguina que aporta color rojizo vibrante y sabor frutal equilibrado.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Alkoholfrei Holunder 0,0 Botellín",
        "format": "botellin",
        "barcode": "4072700001485",
        "extraBarcodes": [],
        "shortHistory": "Especialidad bávara 0,0 % que mezcla la suavidad cremosa del trigo con notas florales y ácidas de flor de saúco natural de Baviera.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Royal Weissbier Botellín",
        "format": "botellin",
        "barcode": "4072700311027",
        "extraBarcodes": [],
        "shortHistory": "Edición especial muniquesa de cuerpo generoso y tonos cobrizos cálidos con 6,0 % vol., repleta de fruta madura, melón y especias dulces.",
        "style": "Trigo",
        "abv": "6.00",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Weissbier Leicht Botellín",
        "format": "botellin",
        "barcode": "4072700802518",
        "extraBarcodes": [],
        "shortHistory": "Versión ligera bávara con menos alcohol y calorías que conserva el carácter frutal tradicional del trigo alemán con solo 2,9 % vol.",
        "style": "Trigo",
        "abv": "2.90",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Natur Russ Radler Botellín",
        "format": "botellin",
        "barcode": "4072700003908",
        "extraBarcodes": [],
        "shortHistory": "Clásico bávaro Russ que mezcla cerveza de trigo Hefe-Weissbier con refrescante limonada natural para un trago turbio cítrico de 2,5 %.",
        "style": "Trigo",
        "abv": "2.50",
        "country": "Alemania"
      },
      {
        "name": "Franziskaner Oktoberfestbier Botellín",
        "format": "botellin",
        "barcode": "4072700001089",
        "extraBarcodes": [
          "4072700006152"
        ],
        "shortHistory": "Edición estacional bávara elaborada para el Oktoberfest de Múnich, de tonalidad ambarina dorada, malta rica y cuerpo equilibrado festivo.",
        "style": "Tostada",
        "abv": "5.50",
        "country": "Alemania"
      }
    ]
  },
  {
    "name": "Desperados",
    "logoUrl": "brand://desperados",
    "history": "Inventada en Alsacia (Francia) en 1995 como la primera cerveza del mundo aromatizada con tequila, fusionando carácter festivo, cítricos y sabores atrevidos.",
    "beers": [
      {
        "name": "Desperados Original Botellín",
        "format": "botellin",
        "barcode": "3155930006015",
        "extraBarcodes": [
          "3155930005964",
          "3119780257546",
          "3119780268382",
          "3119780268405",
          "8411090070057",
          "8712000060671",
          "3420652887977",
          "3119780250110",
          "8712000039837",
          "3155930001324",
          "3119780251889",
          "8712000059156",
          "8712000061425",
          "8712000060596"
        ],
        "shortHistory": "Creada en Francia en 1995 uniendo una lager dorada con aroma de tequila mexicano y notas cítricas picantes para lograr un sabor inconfundible.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Original Lata",
        "format": "lata",
        "barcode": "3155930001355",
        "extraBarcodes": [
          "8712000055745",
          "3119783018373",
          "3155930234609",
          "5035766064190",
          "8712000038175",
          "3119780266401",
          "3119780260119",
          "5035766064213",
          "8411090617214",
          "8712000059293",
          "8712000059415",
          "8712000060275"
        ],
        "shortHistory": "Formato lata de la mítica cerveza con toque de tequila nacida en Alsacia, lista para enfriar rápido con su perfil dulce, cítrico y rebelde.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Litrona 65cl",
        "format": "litrona",
        "barcode": "3119780266463",
        "extraBarcodes": [
          "3155930005568",
          "3155930006633"
        ],
        "shortHistory": "La clásica botella grande de sesenta y cinco centilitros de Desperados con aroma de tequila, ideal para compartir en fiestas y festivales.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Mojito Botellín",
        "format": "botellin",
        "barcode": "8712000050382",
        "extraBarcodes": [
          "8411090670004",
          "8712000061098",
          "8712000061135",
          "3119780264261",
          "3119780264285",
          "8712000061081"
        ],
        "shortHistory": "Refrescante edición de Desperados inspirada en el cóctel cubano combinando aroma de tequila con lima ácida y hojas frescas de hierbabuena.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Lime Botellín",
        "format": "botellin",
        "barcode": "8712000056797",
        "extraBarcodes": [
          "8712000036072",
          "3119780256068",
          "8712000060633"
        ],
        "shortHistory": "Cerveza dorada aromatizada con tequila, lima y notas suaves de flor de cactus logrando un perfil más ácido, ligero y refrescante con 3 % vol.",
        "style": "Lager",
        "abv": "3.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Red Botellín",
        "format": "botellin",
        "barcode": "3119780248186",
        "extraBarcodes": [
          "8712000035884",
          "5901559952503",
          "3119780256136",
          "3119780261635",
          "3119780256150",
          "5054637339779"
        ],
        "shortHistory": "Mezcla vibrante de tonalidad rojiza que combina cerveza Desperados con aroma de tequila, guaraná amazónico y cachaza brasileña en boca.",
        "style": "Tostada",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Sangré Botellín",
        "format": "botellin",
        "barcode": "3119780264742",
        "extraBarcodes": [
          "3119780266982"
        ],
        "shortHistory": "Edición festiva de tonalidad rubí inspirada en los sabores ibéricos con toque de uva roja, cítricos y aroma exótico de especias y tequila.",
        "style": "Tostada",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Virgin 0,0 Botellín",
        "format": "botellin",
        "barcode": "3119783021502",
        "extraBarcodes": [
          "8712000060640",
          "3119780273904"
        ],
        "shortHistory": "Versión sin alcohol que conserva la frescura del limón verde y los matices aromáticos del tequila y especias con cero graduación alcohólica.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Black Botellín",
        "format": "botellin",
        "barcode": "3119780260560",
        "extraBarcodes": [
          "4823077614989"
        ],
        "shortHistory": "Edición nocturna elaborada con tequila añejado que despliega aromas tostados intensos y un trago cálido de carácter oscuro y licoroso.",
        "style": "Negra",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Tropical Botellín",
        "format": "botellin",
        "barcode": "0113196730061",
        "extraBarcodes": [
          "3119789830061"
        ],
        "shortHistory": "Combinación exótica de cerveza dorada con aroma de tequila, fruta de la pasión y lima para disfrutar sabores dulces y veraniegos al instante.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Mojito Lata",
        "format": "lata",
        "barcode": "3119780264308",
        "extraBarcodes": [
          "8712000051976",
          "8712000055530",
          "5410263929201"
        ],
        "shortHistory": "Formato lata de Desperados Mojito con aroma de tequila, zumo de lima verde y menta fresca listo para enfriar rápido en fiestas.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Lime Lata",
        "format": "lata",
        "barcode": "3119780259489",
        "extraBarcodes": [],
        "shortHistory": "Lata de la variedad Lime con aroma a tequila, lima ácida y toque de cactus que brinda una bebida fresca más ligera de 3,0 % vol.",
        "style": "Lager",
        "abv": "3.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Red Lata",
        "format": "lata",
        "barcode": "5410263931518",
        "extraBarcodes": [],
        "shortHistory": "Versión en lata de Desperados Red con guaraná amazónico y aroma de cachaza y tequila, ofreciendo energía frutal de color rubí brillante.",
        "style": "Tostada",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Virgin 0,0 Lata",
        "format": "lata",
        "barcode": "5900699104971",
        "extraBarcodes": [],
        "shortHistory": "Lata sin alcohol de Desperados Virgin 0,0 % manteniendo el frescor cítrico de limón verde y el toque especiado clásico sin alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Ginger & Lime Botellín",
        "format": "botellin",
        "barcode": "8712000054526",
        "extraBarcodes": [],
        "shortHistory": "Edición especiada de Desperados que une aroma de tequila con jengibre picante y limón verde para lograr un contraste chispeante.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Nocturno Botellín",
        "format": "botellin",
        "barcode": "5900699102229",
        "extraBarcodes": [],
        "shortHistory": "Variedad nocturna de cuerpo más oscuro e intenso con aroma de tequila añejo, agave tostado y toques cálidos de madera y especias.",
        "style": "Negra",
        "abv": "6.00",
        "country": "Francia"
      },
      {
        "name": "Desperados Flare Botellín",
        "format": "botellin",
        "barcode": "8712000039080",
        "extraBarcodes": [],
        "shortHistory": "Llamativa edición con partículas doradas nacaradas y sabor dulce de melocotón, maracuyá y tequila para crear efecto visual al agitar.",
        "style": "Lager",
        "abv": "5.90",
        "country": "Francia"
      },
      {
        "name": "Desperados Virgin Fresh Berry 0,0 Botellín",
        "format": "botellin",
        "barcode": "3119789828938",
        "extraBarcodes": [],
        "shortHistory": "Versión sin alcohol 0,0 % de Desperados enriquecida con frutos rojos frescos y toque cítrico dulce pensada para disfrutar sin límites.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Francia"
      }
    ]
  },
  {
    "name": "Delirium Tremens",
    "logoUrl": "brand://delirium-tremens",
    "history": "Elaborada por la cervecería familiar Huyghe en Melle (Bélgica) e inmortalizada por su elefante rosa y su icónica botella de cerámica pintada blanca.",
    "beers": [
      {
        "name": "Delirium Tremens Botellín",
        "format": "botellin",
        "barcode": "5412186000098",
        "extraBarcodes": [],
        "shortHistory": "Belgian Strong Blond Ale nacida en 1988 con tres levaduras distintas que liberan notas especiadas, cítricas y cálido picor alcohólico de 8,5 %.",
        "style": "Lager",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Tremens Botella 75cl",
        "format": "litrona",
        "barcode": "5412186000043",
        "extraBarcodes": [
          "5412186002344"
        ],
        "shortHistory": "Formato de tres cuartos de litro ideal para brindar en mesa compartiendo la famosa Blonde Ale belga del elefante rosa con refermentación.",
        "style": "Lager",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Nocturnum Botellín",
        "format": "botellin",
        "barcode": "5412186000715",
        "extraBarcodes": [],
        "shortHistory": "Belgian Strong Dark Ale nacida para el décimo aniversario del elefante rosa, repleta de pasas, chocolate negro, regaliz y especias cálidas.",
        "style": "Negra",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Red Botellín",
        "format": "botellin",
        "barcode": "5412186002436",
        "extraBarcodes": [],
        "shortHistory": "Cerveza frutal belga elaborada con zumo de guinda ácida y saúco sobre base fuerte de malta, equilibrando dulzor frutal intenso y final seco.",
        "style": "Tostada",
        "abv": "8.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Argentum IPA Botellín",
        "format": "botellin",
        "barcode": "5412186003594",
        "extraBarcodes": [],
        "shortHistory": "Creada para celebrar el 25 aniversario con seis lúpulos americanos en dry-hopping, combinando cuerpo belga caramelo y aroma explosivo a pomelo.",
        "style": "IPA",
        "abv": "7.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Christmas Noël Botellín",
        "format": "botellin",
        "barcode": "5412186001071",
        "extraBarcodes": [],
        "shortHistory": "Edición invernal navideña de Brouwerij Huyghe de tono ámbar rubí intenso y diez grados alcohólicos cargada de frutos secos y caramelo tostado.",
        "style": "Tostada",
        "abv": "10.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Tremens Lata",
        "format": "lata",
        "barcode": "5412186002900",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de la mítica Strong Blond belga del elefante rosa con triple fermentación, manteniendo sus especias y notas cítricas vivas.",
        "style": "Lager",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Nocturnum Botella 75cl",
        "format": "litrona",
        "barcode": "5412186000722",
        "extraBarcodes": [],
        "shortHistory": "Botella de 75 cl de la potente Dark Ale belga Delirium Nocturnum con notas complejas de pasas oscuras, chocolate negro, cilantro y regaliz.",
        "style": "Negra",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Red Botella 75cl",
        "format": "litrona",
        "barcode": "0815184010253",
        "extraBarcodes": [
          "0608782527328",
          "4399112426003"
        ],
        "shortHistory": "Botella cerámica grande de 75 cl de la fuerte cerveza frutal belga con guinda ácida y saúco de ocho grados y aroma intenso a almendra.",
        "style": "Tostada",
        "abv": "8.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Red Lata",
        "format": "lata",
        "barcode": "0815184010390",
        "extraBarcodes": [
          "8151840010390"
        ],
        "shortHistory": "Versión en lata de Delirium Red manteniendo el equilibrio entre dulzor de cereza ácida belga, color rubí vivo y ocho grados alcohólicos.",
        "style": "Tostada",
        "abv": "8.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Argentum IPA Botella 75cl",
        "format": "litrona",
        "barcode": "5412186003600",
        "extraBarcodes": [],
        "shortHistory": "Botella de 75 cl de la IPA belga de Huyghe con seis lúpulos aromáticos americanos, equilibrando caramelo tostado y amargor cítrico seco.",
        "style": "IPA",
        "abv": "7.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Christmas Noël Botella 75cl",
        "format": "litrona",
        "barcode": "5412186000975",
        "extraBarcodes": [
          "0608782522002"
        ],
        "shortHistory": "Gran formato navideño de 75 cl de Brouwerij Huyghe de diez grados, ideal para compartir en invierno sus aromas especiados y afrutados.",
        "style": "Tostada",
        "abv": "10.00",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Deliria Botellín",
        "format": "botellin",
        "barcode": "5412186002924",
        "extraBarcodes": [
          "5412186011711"
        ],
        "shortHistory": "Edición anual elaborada exclusivamente por mujeres cerveceras en Huyghe cada 8 de marzo, de equilibrio floral, afrutado y 8,5 % vol.",
        "style": "Lager",
        "abv": "8.50",
        "country": "Bélgica"
      },
      {
        "name": "Delirium Black Barrel Aged Botellín",
        "format": "botellin",
        "barcode": "5412186005574",
        "extraBarcodes": [],
        "shortHistory": "Edición especial de reserva envejecida nueve meses en barricas de bourbon Buffalo Trace, ganando intensas notas de vainilla, roble y 11,5 %.",
        "style": "Negra",
        "abv": "11.50",
        "country": "Bélgica"
      }
    ]
  },
  {
    "name": "Pilsner Urquell",
    "logoUrl": "brand://pilsner-urquell",
    "history": "Nacida en Plzeň (Bohemia) en 1842 por Josef Groll, dio origen histórico al estilo Pilsner mundial usando agua blanda checa, malta de Moravia y lúpulo Saaz.",
    "beers": [
      {
        "name": "Pilsner Urquell Original Botellín",
        "format": "botellin",
        "barcode": "8594404110127",
        "extraBarcodes": [
          "8594404014623",
          "8594404110110",
          "0072311130011"
        ],
        "shortHistory": "La primera Pilsner dorada de la historia creada en Plzeň en 1842 con lúpulo floral Saaz y triple decocción que aporta caramelo y amargor noble.",
        "style": "Lager",
        "abv": "4.40",
        "country": "República Checa"
      },
      {
        "name": "Pilsner Urquell Original Lata",
        "format": "lata",
        "barcode": "8594404005829",
        "extraBarcodes": [
          "8594404115115",
          "8594404010816"
        ],
        "shortHistory": "Formato lata de la icónica Pilsner checa de Bohemia, protegiendo de la luz su perfume inconfundible a lúpulo Saaz y su espuma densa de barril.",
        "style": "Lager",
        "abv": "4.40",
        "country": "República Checa"
      }
    ]
  },
  {
    "name": "Modelo",
    "logoUrl": "brand://modelo",
    "history": "Lanzada en Ciudad de México en 1925 por Cervecería Modelo, es referente mundial con su emblemática botella dorada de Especial y la histórica Munich Dunkel Negra Modelo.",
    "beers": [
      {
        "name": "Modelo Especial Botellín",
        "format": "botellin",
        "barcode": "0080660957579",
        "extraBarcodes": [
          "75031602",
          "7501064108242"
        ],
        "shortHistory": "Pilsner mexicana nacida en 1925 con botella icónica coronada de papel dorado, ofreciendo sabor rico a malta dulce con toque herbal equilibrado.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Modelo Especial Lata",
        "format": "lata",
        "barcode": "0080660957159",
        "extraBarcodes": [
          "0080660957760",
          "7501064112546",
          "0080660957555",
          "0033544002100",
          "7463172803177"
        ],
        "shortHistory": "La popular Pilsner mexicana en lata azul y blanca, manteniendo su carbonatación chispeante, espuma generosa y notas limpias a miel de azahar.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Negra Modelo Botellín",
        "format": "botellin",
        "barcode": "6539670490803",
        "extraBarcodes": [
          "08066349"
        ],
        "shortHistory": "Cerveza mexicana estilo Munich Dunkel lanzada en 1925 y conocida como la crema de la cerveza por sus notas sedosas a caramelo y malta oscura.",
        "style": "Negra",
        "abv": "5.40",
        "country": "México"
      },
      {
        "name": "Modelo Pura Malta Botellín",
        "format": "botellin",
        "barcode": "7503024460155",
        "extraBarcodes": [
          "7503024460162"
        ],
        "shortHistory": "Receta mexicana elaborada exclusivamente con malta de cebada sin adjuntos de maíz, destacando por su cuerpo dorado intenso y final amargo fino.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Modelo Oro Lata",
        "format": "lata",
        "barcode": "0033544001615",
        "extraBarcodes": [
          "0033544001622"
        ],
        "shortHistory": "Lager ultraligera mexicana con solo noventa calorías por lata pensada para disfrutar la suavidad dorada de Modelo con mínimo cuerpo.",
        "style": "Lager",
        "abv": "4.00",
        "country": "México"
      },
      {
        "name": "Modelo Chelada Limón y Sal Lata",
        "format": "lata",
        "barcode": "0033544950609",
        "extraBarcodes": [
          "0033544000557",
          "0033544001301"
        ],
        "shortHistory": "Clásica cerveza Modelo Especial mezclada en origen con auténtico zumo de limón verde y una pizca de sal marina al estilo michelada fresca.",
        "style": "Lager",
        "abv": "3.50",
        "country": "México"
      },
      {
        "name": "Modelo Chelada Sandía Picante Lata",
        "format": "lata",
        "barcode": "0033544001875",
        "extraBarcodes": [],
        "shortHistory": "Atrevida michelada mexicana de Cerveza Modelo combinada con zumo jugoso de sandía madura, toque de limón verde y chile picante en lata.",
        "style": "Lager",
        "abv": "3.50",
        "country": "México"
      },
      {
        "name": "Modelo Chelada Piña Picante Lata",
        "format": "lata",
        "barcode": "0033544000809",
        "extraBarcodes": [],
        "shortHistory": "Michelada mexicana preparada con Modelo Especial, piña tropical dulce y especias de chile suave para un contraste dulce-picante en lata.",
        "style": "Lager",
        "abv": "3.50",
        "country": "México"
      },
      {
        "name": "Modelo Especial Litrona",
        "format": "litrona",
        "barcode": "7501064198519",
        "extraBarcodes": [
          "0080660957777",
          "7772622220038"
        ],
        "shortHistory": "Presentación caguama familiar de gran tamaño de Modelo Especial nacida en México, conservando su frescor dorado y espuma cremosa clásica.",
        "style": "Lager",
        "abv": "4.50",
        "country": "México"
      },
      {
        "name": "Negra Modelo Lata",
        "format": "lata",
        "barcode": "7501064196935",
        "extraBarcodes": [],
        "shortHistory": "Lata de la emblemática Munich Dunkel mexicana Negra Modelo, manteniendo sus notas cremosas a malta tostada, caramelo y suave chocolate.",
        "style": "Negra",
        "abv": "5.40",
        "country": "México"
      },
      {
        "name": "Modelo Oro Botellín",
        "format": "botellin",
        "barcode": "0033544002414",
        "extraBarcodes": [
          "0033544002483"
        ],
        "shortHistory": "Botellín de Modelo Oro de cuerpo ultraligero y noventa calorías, pensado para ofrecer frescura dorada limpia con 4,0 % de alcohol.",
        "style": "Lager",
        "abv": "4.00",
        "country": "México"
      }
    ]
  },
  {
    "name": "Asahi",
    "logoUrl": "brand://asahi",
    "history": "Nacida en Osaka en 1889 y mundialmente célebre tras lanzar Asahi Super Dry en 1987, instauró el estilo japonés Karakuchi de final limpio y ultra seco.",
    "beers": [
      {
        "name": "Asahi Super Dry Botellín",
        "format": "botellin",
        "barcode": "8008440246004",
        "extraBarcodes": [
          "8008440549426",
          "8008440346001",
          "8008440249203",
          "0309002006585",
          "8329662018904",
          "4514603322118",
          "4514603343717",
          "4514603345117",
          "4514603434019",
          "4901340064645",
          "4901340079144",
          "5060006410000",
          "5060006410017",
          "9329982021058"
        ],
        "shortHistory": "Revolucionó Japón en 1987 inaugurando el estilo Karakuchi: fermentación atenuada con arroz para un trago chispeante, cristalino y de final seco.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Super Dry Lata",
        "format": "lata",
        "barcode": "4901004006714",
        "extraBarcodes": [
          "4901004006813",
          "8008440149121",
          "4901004006820",
          "4514603252712",
          "4901004006677",
          "4901004037404",
          "4904230052326",
          "4904230062875",
          "4904230067375",
          "5060006410024",
          "8008440449108"
        ],
        "shortHistory": "Lata plateada japonesa de Asahi Super Dry con gasificación viva y paso ultra seco diseñado para limpiar el paladar entre bocados de sushi.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Super Dry Litrona",
        "format": "litrona",
        "barcode": "0038766302700",
        "extraBarcodes": [
          "5060006410208",
          "4514603431810"
        ],
        "shortHistory": "Formato grande de botella japonesa pensado para compartir en izakayas la legendaria lager Karakuchi de fermentación limpia y seca.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Super Dry 0,0% Botellín",
        "format": "botellin",
        "barcode": "8008440244000",
        "extraBarcodes": [
          "8008440144003"
        ],
        "shortHistory": "Versión sin alcohol japonesa que conserva fielmente el perfil Karakuchi nítido y crujiente de Super Dry sin rastro de dulzor residual.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Dry Black Botellín",
        "format": "botellin",
        "barcode": "0038766651334",
        "extraBarcodes": [],
        "shortHistory": "Lager negra japonesa inspirada en la tecnología Karakuchi que combina maltas torrefactas con espuma cremosa y un sorprendente final seco.",
        "style": "Negra",
        "abv": "5.50",
        "country": "Japón"
      },
      {
        "name": "Asahi Super Dry Nama Jokki Lata",
        "format": "lata",
        "barcode": "4901004057044",
        "extraBarcodes": [],
        "shortHistory": "Famosa lata japonesa con tapa de apertura completa que genera al instante una densa corona de espuma cremosa como recién tirada de barril.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Dry Zero 0,0% Lata",
        "format": "lata",
        "barcode": "4904230029991",
        "extraBarcodes": [],
        "shortHistory": "Líder japonesa sin alcohol y sin calorías concebida para emular el paso nítido y ultra seco de Asahi Super Dry con cero gramos de azúcar.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Super Dry 0,0% Lata",
        "format": "lata",
        "barcode": "8008440242723",
        "extraBarcodes": [
          "0038766000002"
        ],
        "shortHistory": "Versión en lata internacional de Asahi Super Dry 0,0 %, conservando su burbuja fina, amargor limpio y final Karakuchi sin gota de alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Japón"
      },
      {
        "name": "Asahi The Rich Lata",
        "format": "lata",
        "barcode": "4901004050014",
        "extraBarcodes": [],
        "shortHistory": "Cerveza japonesa dorada con mayor proporción de malta de cebada y 6,0 % grados que brinda espuma lujosa y cuerpo pleno estilo premium.",
        "style": "Lager",
        "abv": "6.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Style Free Lata",
        "format": "lata",
        "barcode": "4901004027184",
        "extraBarcodes": [],
        "shortHistory": "Variante ligera japonesa reducida en carbohidratos con frescor crujiente, espuma consistente y suavidad pensada para consumo cotidiano.",
        "style": "Lager",
        "abv": "4.00",
        "country": "Japón"
      },
      {
        "name": "Asahi Dry Black Lata",
        "format": "lata",
        "barcode": "4901004033703",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de Asahi Super Dry Black que preserva la mezcla de maltas tostadas oscuras con el acabado japonés seco característico.",
        "style": "Negra",
        "abv": "5.50",
        "country": "Japón"
      },
      {
        "name": "Clear Asahi Lata",
        "format": "lata",
        "barcode": "4901004039798",
        "extraBarcodes": [],
        "shortHistory": "Popular cerveza japonesa cotidiana de la casa Asahi elaborada con malta tostada aromática para lograr suavidad ligera y sin retrogusto.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      }
    ]
  },
  {
    "name": "Sapporo",
    "logoUrl": "brand://sapporo",
    "history": "Fundada en Hokkaido en 1876 por Seibei Nakagawa tras formarse en Alemania, es la cervecera más antigua de Japón y emblema de la estrella polar dorada.",
    "beers": [
      {
        "name": "Sapporo Premium Beer Botellín",
        "format": "botellin",
        "barcode": "5011046008368",
        "extraBarcodes": [
          "0087975003502",
          "0087975033509",
          "9310441003005"
        ],
        "shortHistory": "La cerveza japonesa más antigua nacida en Hokkaido en 1876, combinando cebada, arroz y lúpulos selectos en una lager limpia y equilibrada.",
        "style": "Lager",
        "abv": "4.90",
        "country": "Japón"
      },
      {
        "name": "Sapporo Premium Beer Lata",
        "format": "lata",
        "barcode": "4901880861421",
        "extraBarcodes": [
          "0056910605002",
          "8936061260096",
          "8936061260218",
          "0056910600007",
          "0087975726500",
          "4582409175191",
          "4582409187910",
          "4589850828232",
          "4589850828447",
          "4589850829833",
          "4901880200985",
          "4901880207182",
          "4901880208226",
          "4901880209049",
          "4901880833794",
          "4902471018583",
          "4902471100660",
          "5473242080706"
        ],
        "shortHistory": "Lata japonesa adornada con la estrella dorada de los pioneros de Hokkaido, ofreciendo cuerpo suave y frescor limpio para acompañar comida asiática.",
        "style": "Lager",
        "abv": "4.90",
        "country": "Japón"
      },
      {
        "name": "Sapporo Premium Silver Can 65cl",
        "format": "litrona",
        "barcode": "0087975026501",
        "extraBarcodes": [
          "4901880110666"
        ],
        "shortHistory": "Famosa lata metálica gigante de acero cepillado de seiscientos cincuenta mililitros, todo un icono visual del diseño cervecero japonés.",
        "style": "Lager",
        "abv": "4.90",
        "country": "Japón"
      },
      {
        "name": "Sapporo Reserve Black Beer Lata",
        "format": "lata",
        "barcode": "0087975526506",
        "extraBarcodes": [],
        "shortHistory": "Versión japonesa de estilo oscuro inspirada en recetas clásicas bávaras, desplegando notas elegantes a malta tostada, café suave y caramelo.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Classic Lata",
        "format": "lata",
        "barcode": "4901880191313",
        "extraBarcodes": [
          "4901880192310"
        ],
        "shortHistory": "Elaborada originalmente solo para Hokkaido 100 % con malta de cebada y lúpulo Saaz sin adjuntos, celebrada por su pureza floral y cremosa.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Sorachi 1984 Lata",
        "format": "lata",
        "barcode": "4901880897260",
        "extraBarcodes": [],
        "shortHistory": "Homenaje al legendario lúpulo Sorachi Ace creado por Sapporo en Hokkaido en 1984, desplegando notas únicas de hierba limón, cedro y eneldo.",
        "style": "IPA",
        "abv": "5.50",
        "country": "Japón"
      },
      {
        "name": "Sapporo Gold Star Lata",
        "format": "lata",
        "barcode": "4901880896478",
        "extraBarcodes": [],
        "shortHistory": "Elaborada con malta de Sapporo Black Label y el lúpulo noble alemán de Yebisu para lograr una lager japonesa brillante de gran sabor.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Premium Alcohol Free Lata",
        "format": "lata",
        "barcode": "0056910035502",
        "extraBarcodes": [],
        "shortHistory": "Alternativa sin alcohol de la histórica casa japonesa de Hokkaido que mantiene un paso limpio a cereal pálido y suave frescura herbal.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Yebisu Premium Botellín",
        "format": "botellin",
        "barcode": "4901880111144",
        "extraBarcodes": [
          "4901880110093"
        ],
        "shortHistory": "Legendaria lager japonesa de lujo nacida en 1890 bajo la casa Sapporo con 100 % malta y prolongada maduración para sabor profundo y rico.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Yebisu Premium Lata",
        "format": "lata",
        "barcode": "4901880879884",
        "extraBarcodes": [
          "4901880916688"
        ],
        "shortHistory": "Icónica lata dorada de Yebisu elaborada por Sapporo con lúpulo bávaro aromático y cebada selecta logrando espuma densa y trago noble.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      },
      {
        "name": "Sapporo Kuro Label Draft Botellín",
        "format": "botellin",
        "barcode": "4901880851385",
        "extraBarcodes": [],
        "shortHistory": "Conocida en Japón como Etiqueta Negra, mantiene desde 1977 el equilibrio perfecto entre malta fresca de cebada y carbonatación cremosa.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Japón"
      }
    ]
  },
  {
    "name": "Super Bock",
    "logoUrl": "brand://super-bock",
    "history": "Creada en Oporto en 1927 y líder indiscutible del norte de Portugal, acumula decenas de medallas de oro consecutivas por su gama Original, Stout y Selecção 1927.",
    "beers": [
      {
        "name": "Super Bock Original Botellín",
        "format": "botellin",
        "barcode": "5601164112308",
        "extraBarcodes": [
          "56090710",
          "56090727",
          "56002621",
          "5601164900349",
          "5601164902312",
          "56093254",
          "5601164114203",
          "5601164112506"
        ],
        "shortHistory": "Nacida en Oporto en 1927, esta lager portuguesa dorada destaca por su equilibrio constante, espuma cremosa y decenas de medallas de oro mundiales.",
        "style": "Lager",
        "abv": "5.20",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Original Lata",
        "format": "lata",
        "barcode": "5601164113701",
        "extraBarcodes": [
          "5425025122035",
          "5601164114708"
        ],
        "shortHistory": "La lager insignia portuguesa en formato lata roja y dorada, manteniendo intacto su sabor intenso a malta ligera y final refrescante.",
        "style": "Lager",
        "abv": "5.20",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Original Litrona",
        "format": "litrona",
        "barcode": "5601164115606",
        "extraBarcodes": [
          "5601164901094"
        ],
        "shortHistory": "Botella de un litro para compartir el carácter dorado de Oporto en mesas familiares, reuniones y terrazas atlánticas portuguesas.",
        "style": "Lager",
        "abv": "5.20",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Stout Botellín",
        "format": "botellin",
        "barcode": "5601164404205",
        "extraBarcodes": [
          "56029246",
          "56001259",
          "56043600"
        ],
        "shortHistory": "Cerveza negra portuguesa elaborada con maltas especiales caramelo y torrefactas que aportan aroma intenso a café, cacao y espuma color crema.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Abadia Botellín",
        "format": "botellin",
        "barcode": "5601164594401",
        "extraBarcodes": [
          "56004854",
          "5601164594203"
        ],
        "shortHistory": "Inspirada en las recetas monásticas tradicionales con triple mezcla de maltas y trigo que aportan color rubí cobrizo, especias y 6,4 % vol.",
        "style": "Tostada",
        "abv": "6.40",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Green Limón Botellín",
        "format": "botellin",
        "barcode": "5601164104471",
        "extraBarcodes": [
          "5601164901100",
          "56004861",
          "56030891"
        ],
        "shortHistory": "Refrescante combinación de cerveza Super Bock con auténtico zumo de limón natural portugués, logrando un perfil chispeante de baja graduación.",
        "style": "Lager",
        "abv": "2.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Tango Grosella Botellín",
        "format": "botellin",
        "barcode": "5601164582200",
        "extraBarcodes": [
          "56028874"
        ],
        "shortHistory": "Inspirada en las tradicionales panachés portuguesas con zumo de grosella roja, destacando por su vivo color rubí y agradable frescor dulce.",
        "style": "Tostada",
        "abv": "4.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock 0,0% Sem Álcool Botellín",
        "format": "botellin",
        "barcode": "5601164204102",
        "extraBarcodes": [
          "56045567",
          "8622942054570",
          "5601164204232",
          "5601164867420"
        ],
        "shortHistory": "Versión sin alcohol de Oporto elaborada mediante extracción delicada para preservar aromas a malta pálida y amargor suave con cero alcohol.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock 0,0% Preta Botellín",
        "format": "botellin",
        "barcode": "5601164854475",
        "extraBarcodes": [
          "56018448",
          "5601164852471",
          "5601164824478",
          "56096316"
        ],
        "shortHistory": "Cerveza negra sin alcohol elaborada con maltas tostadas en Portugal, ofreciendo notas aromáticas a chocolate amargo y café con cero graduación.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Selecção 1927 Bavaria Weiss Botellín",
        "format": "botellin",
        "barcode": "5601164903586",
        "extraBarcodes": [],
        "shortHistory": "De la serie artesanal 1927, cerveza de trigo estilo bávaro sin filtrar con espuma densa, textura cremosa y aromas frutales a plátano y clavo.",
        "style": "Trigo",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Coruja IPA Botellín",
        "format": "botellin",
        "barcode": "5601164874466",
        "extraBarcodes": [],
        "shortHistory": "India Pale Ale portuguesa elaborada con dry-hopping de lúpulos cítricos y florales, logrando un amargor vibrante de perfil artesanal moderno.",
        "style": "IPA",
        "abv": "6.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Stout Lata",
        "format": "lata",
        "barcode": "5601164404700",
        "extraBarcodes": [
          "5601164907157",
          "5601164906471"
        ],
        "shortHistory": "Formato lata de la icónica cerveza negra portuguesa con maltas caramelo y tostadas, conservando notas de cacao oscuro y espuma cremosa.",
        "style": "Negra",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Abadia Lata",
        "format": "lata",
        "barcode": "5601164906808",
        "extraBarcodes": [],
        "shortHistory": "Lata de Super Bock Abadia elaborada con triple malta y trigo en estilo monástico, brindando tono rubí profundo y paso aromático cálido.",
        "style": "Tostada",
        "abv": "6.40",
        "country": "Portugal"
      },
      {
        "name": "Super Bock 0,0% Sem Álcool Lata",
        "format": "lata",
        "barcode": "5601164204133",
        "extraBarcodes": [],
        "shortHistory": "Lata sin alcohol de la lager líder de Oporto, manteniendo la suavidad dorada de sus maltas pálidas sin nada de contenido alcohólico.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Coruja IPA Lata",
        "format": "lata",
        "barcode": "5601164906044",
        "extraBarcodes": [
          "5601164907119"
        ],
        "shortHistory": "Lata de Coruja IPA portuguesa que preserva los aceites aromáticos del dry-hopping con notas de pino, mango y amargor seco moderado.",
        "style": "IPA",
        "abv": "6.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Coruja American Amber Botellín",
        "format": "botellin",
        "barcode": "5601164834460",
        "extraBarcodes": [],
        "shortHistory": "Cerveza ambarina artesanal de la línea Coruja de Oporto con lúpulo Cascade en frío que armoniza caramelo tostado y cítricos elegantes.",
        "style": "Tostada",
        "abv": "5.30",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Selecção 1927 Bengal Amber IPA Botellín",
        "format": "botellin",
        "barcode": "5601164874480",
        "extraBarcodes": [],
        "shortHistory": "De la serie Selecção 1927, India Pale Ale portuguesa de color ámbar dorado con amargor equilibrado, lúpulos nobles y notas florales.",
        "style": "IPA",
        "abv": "6.50",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Selecção 1927 Munich Dunkel Botellín",
        "format": "botellin",
        "barcode": "5601164154483",
        "extraBarcodes": [
          "56018837",
          "56075557"
        ],
        "shortHistory": "Lager oscura portuguesa estilo muniqués dentro de la colección 1927, con aromas complejos a pan tostado, chocolate y melaza de caña.",
        "style": "Negra",
        "abv": "6.00",
        "country": "Portugal"
      },
      {
        "name": "Super Bock Sem Glúten Botellín",
        "format": "botellin",
        "barcode": "5601164114579",
        "extraBarcodes": [
          "5601164904774"
        ],
        "shortHistory": "Variante portuguesa apta para celíacos que conserva intacto el sabor equilibrado y el frescor clásico de Super Bock Original en botellín.",
        "style": "Lager",
        "abv": "5.20",
        "country": "Portugal"
      }
    ]
  },
  {
    "name": "Sagres",
    "logoUrl": "brand://sagres",
    "history": "Nacida en 1940 para la Exposición del Mundo Portugués en Lisboa, representa la tradición cervecera lusa con su icónica Branca, su negra Preta y gama Bohemia.",
    "beers": [
      {
        "name": "Sagres Branca Original Botellín",
        "format": "botellin",
        "barcode": "5601146000302",
        "extraBarcodes": [
          "5601146003006",
          "5601146001224",
          "5601146103010",
          "16011465",
          "5601146003020",
          "5601146570027",
          "5601146700066",
          "5601146703463",
          "5601146703401",
          "5601146003013",
          "5601146713509"
        ],
        "shortHistory": "Lanzada en Lisboa en 1940 con ingredientes 100 % naturales, esta lager dorada portuguesa resulta seca, chispeante y de refrescante amargor.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Branca Original Lata",
        "format": "lata",
        "barcode": "5601146000319",
        "extraBarcodes": [
          "5601146707003"
        ],
        "shortHistory": "Formato lata de la histórica Sagres Branca lisboeta en 33 cl y 50 cl, manteniendo su frescor limpio y sabor clásico de taberna portuguesa.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Branca Original Litrona",
        "format": "litrona",
        "barcode": "5601146000104",
        "extraBarcodes": [],
        "shortHistory": "Botella de un litro para compartir en mesa la cerveza lisboeta nacida en 1940, ligera, seca y siempre presente en las celebraciones lusas.",
        "style": "Lager",
        "abv": "5.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Preta Negra Botellín",
        "format": "botellin",
        "barcode": "5601146001415",
        "extraBarcodes": [
          "5601146000906"
        ],
        "shortHistory": "Cerveza negra portuguesa de baja fermentación elaborada con malta tostada caramelo y cebada torrefacta, con aroma dulce a café suave y regaliz.",
        "style": "Negra",
        "abv": "4.10",
        "country": "Portugal"
      },
      {
        "name": "Sagres Bohemia Original Botellín",
        "format": "botellin",
        "barcode": "5601146200030",
        "extraBarcodes": [
          "5601146100101",
          "5601146100118"
        ],
        "shortHistory": "Especialidad portuguesa de tonalidad cobriza rubí con notas cálidas de malta caramelizada y lúpulo noble, pensada para acompañar alta cocina.",
        "style": "Tostada",
        "abv": "6.20",
        "country": "Portugal"
      },
      {
        "name": "Sagres Bohemia Puro Malte Botellín",
        "format": "botellin",
        "barcode": "5601146120208",
        "extraBarcodes": [
          "5601146120215"
        ],
        "shortHistory": "Elaborada íntegramente con malta de cebada dentro de la gama gastronómica Bohemia de Sagres, ofreciendo cuerpo pleno y espuma fina persistente.",
        "style": "Lager",
        "abv": "6.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres 0,0% Sem Álcool Botellín",
        "format": "botellin",
        "barcode": "5601146010103",
        "extraBarcodes": [
          "5601146310104"
        ],
        "shortHistory": "Versión sin alcohol de Sagres Branca con sabor limpio a cereal pálido y amargor equilibrado para brindar en cualquier ocasión con cero grados.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Radler Limón Botellín",
        "format": "botellin",
        "barcode": "5601146011001",
        "extraBarcodes": [
          "5601146111008"
        ],
        "shortHistory": "Refrescante fusión de cerveza Sagres con zumo natural de limón portugués, ofreciendo baja graduación alcohólica y un final deliciosamente cítrico.",
        "style": "Lager",
        "abv": "2.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Preta Negra Lata",
        "format": "lata",
        "barcode": "5601146100033",
        "extraBarcodes": [
          "5601146800018"
        ],
        "shortHistory": "Formato lata de la clásica cerveza negra portuguesa Sagres Preta con malta tostada caramelo y recuerdos suaves a café torrefacto y cacao.",
        "style": "Negra",
        "abv": "4.10",
        "country": "Portugal"
      },
      {
        "name": "Sagres 0,0% Sem Álcool Lata",
        "format": "lata",
        "barcode": "5601146010219",
        "extraBarcodes": [],
        "shortHistory": "Formato lata de la cerveza portuguesa sin alcohol Sagres 0,0 %, ligera y refrescante para disfrutar cualquier aperitivo sin graduación.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Radler 0,0% Limón Botellín",
        "format": "botellin",
        "barcode": "5601146012107",
        "extraBarcodes": [],
        "shortHistory": "Variante portuguesa sin alcohol de Sagres Radler con zumo natural de limón, chispeante y ligera para refrescar con cero grados alcohólicos.",
        "style": "0,0%",
        "abv": "0.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Radler Lima y Frutos Rojos Botellín",
        "format": "botellin",
        "barcode": "5601146217007",
        "extraBarcodes": [],
        "shortHistory": "Combinación portuguesa de cerveza Sagres con zumo natural de lima y frutos rojos que aporta tono rosado brillante y aroma ácido-dulce.",
        "style": "Tostada",
        "abv": "2.00",
        "country": "Portugal"
      },
      {
        "name": "Sagres Bohemia Trigo Botellín",
        "format": "botellin",
        "barcode": "5601146150359",
        "extraBarcodes": [],
        "shortHistory": "Especialidad de trigo de la gama gastronómica Sagres Bohemia con turbidez natural, espuma abundante y delicados aromas especiados a clavo.",
        "style": "Trigo",
        "abv": "5.50",
        "country": "Portugal"
      }
    ]
  }
];

export const BARCODE_TO_BEER_NAME: Record<string, { brandName: string; beerName: string }> = (() => {
  const map: Record<string, { brandName: string; beerName: string }> = {};
  for (const brand of BRANDS_SEED) {
    for (const beer of brand.beers) {
      map[beer.barcode] = { brandName: brand.name, beerName: beer.name };
      for (const extra of beer.extraBarcodes || []) {
        const clean = extra.trim();
        if (clean && !map[clean]) {
          map[clean] = { brandName: brand.name, beerName: beer.name };
        }
      }
    }
  }
  return map;
})();


function validateSeedCatalog(): void {
  const seenBarcodes = new Set<string>();
  for (const brand of BRANDS_SEED) {
    for (const beer of brand.beers) {
      if (!isValidEan13(beer.barcode)) {
        throw new Error(`Código de barras EAN-13 inválido en seed: ${beer.barcode} (${beer.name})`);
      }
      if (seenBarcodes.has(beer.barcode)) {
        throw new Error(`Código de barras duplicado en seed: ${beer.barcode} (${beer.name})`);
      }
      seenBarcodes.add(beer.barcode);
      for (const extra of beer.extraBarcodes ?? []) {
        const cleanExtra = extra.trim();
        if (!cleanExtra) continue;
        if (!isValidEan(cleanExtra)) {
          throw new Error(`Código alternativo inválido en seed: ${cleanExtra} (${beer.name})`);
        }
        if (seenBarcodes.has(cleanExtra)) {
          throw new Error(`Código alternativo duplicado en seed: ${cleanExtra} (${beer.name})`);
        }
        seenBarcodes.add(cleanExtra);
        const mappedExtra = EXTRA_BARCODE_TO_BEER_NAME[cleanExtra];
        if (!mappedExtra || mappedExtra.brandName !== brand.name || mappedExtra.beerName !== beer.name) {
          throw new Error(`Código alternativo ${cleanExtra} (${beer.name}) desincronizado en barcodeCatalog.ts.`);
        }
      }
      const len = beer.shortHistory.length;
      if (len < 120 || len > 150) {
        throw new Error(
          `shortHistory de "${beer.name}" tiene ${len} caracteres (debe estar entre 120 y 150).`
        );
      }
    }
  }
}

export async function seedDatabase(db: AppDatabase): Promise<SeedSummary> {
  validateSeedCatalog();

  // Paso 1: Insertar iconos, títulos y cosméticos sin FK circular
  for (const icon of ICONS_SEED) {
    await db
      .insert(schema.icons)
      .values({
        id: icon.id,
        name: icon.name,
        imageUrl: icon.imageUrl,
        isDefault: icon.isDefault,
        source: icon.source,
        priceChapas: icon.priceChapas,
        unlockAchievementId: null,
      })
      .onConflictDoUpdate({
        target: schema.icons.id,
        set: {
          name: icon.name,
          imageUrl: icon.imageUrl,
          isDefault: icon.isDefault,
          source: icon.source,
          priceChapas: icon.priceChapas,
        },
      });
  }

  for (const title of TITLES_SEED) {
    await db
      .insert(schema.titles)
      .values({
        id: title.id,
        name: title.name,
        isDefault: title.isDefault,
        source: title.source,
        priceChapas: title.priceChapas,
        unlockAchievementId: null,
      })
      .onConflictDoUpdate({
        target: schema.titles.id,
        set: {
          name: title.name,
          isDefault: title.isDefault,
          source: title.source,
          priceChapas: title.priceChapas,
        },
      });
  }

  for (const cos of COSMETICS_SEED) {
    await db
      .insert(schema.cosmetics)
      .values({
        id: cos.id,
        code: cos.code,
        type: cos.type,
        name: cos.name,
        description: cos.description,
        previewKey: cos.previewKey,
        source: cos.source,
        priceChapas: cos.priceChapas,
        unlockAchievementId: null,
        metadataJson: cos.metadataJson,
      })
      .onConflictDoUpdate({
        target: schema.cosmetics.id,
        set: {
          code: cos.code,
          type: cos.type,
          name: cos.name,
          description: cos.description,
          previewKey: cos.previewKey,
          source: cos.source,
          priceChapas: cos.priceChapas,
          metadataJson: cos.metadataJson,
        },
      });
  }

  // Paso 2: Proteger contra colisiones de UNIQUE(code) si existen logros de Fase 1 con otros IDs
  const targetById = new Map(ACHIEVEMENTS_SEED.map((a) => [a.id, a]));
  const existingAchs = await db
    .select({ id: schema.achievements.id, code: schema.achievements.code })
    .from(schema.achievements);

  const hasLegacyIdDrift = existingAchs.some((existing) => {
    const target = targetById.get(existing.id);
    return target && target.code !== existing.code;
  });

  if (hasLegacyIdDrift) {
    await db.execute(
      sql`UPDATE "achievements" SET "code" = 'legacy_' || "id"::text || '_' || "code"`
    );
    const unbackfilledUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.chapasBackfilled, false));
    if (unbackfilledUsers.length > 0) {
      await db.delete(schema.userAchievements).where(
        inArray(
          schema.userAchievements.userId,
          unbackfilledUsers.map((u) => u.id)
        )
      );
    }
  }

  // Insertar los 100 logros con sus recompensas
  for (const ach of ACHIEVEMENTS_SEED) {
    await db
      .insert(schema.achievements)
      .values({
        id: ach.id,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        targetValue: ach.targetValue,
        rewardChapas: ach.rewardChapas,
        rewardTitleId: ach.rewardTitleId,
        rewardIconId: ach.rewardIconId,
        rewardCosmeticId: ach.rewardCosmeticId,
      })
      .onConflictDoUpdate({
        target: schema.achievements.id,
        set: {
          code: ach.code,
          name: ach.name,
          description: ach.description,
          category: ach.category,
          targetValue: ach.targetValue,
          rewardChapas: ach.rewardChapas,
          rewardTitleId: ach.rewardTitleId,
          rewardIconId: ach.rewardIconId,
          rewardCosmeticId: ach.rewardCosmeticId,
        },
      });
  }

  // Paso 3: Completar FK inversa unlockAchievementId en iconos, títulos y cosméticos
  for (const icon of ICONS_SEED) {
    await db
      .update(schema.icons)
      .set({ unlockAchievementId: icon.unlockAchievementId })
      .where(eq(schema.icons.id, icon.id));
  }

  for (const title of TITLES_SEED) {
    await db
      .update(schema.titles)
      .set({ unlockAchievementId: title.unlockAchievementId })
      .where(eq(schema.titles.id, title.id));
  }

  for (const cos of COSMETICS_SEED) {
    await db
      .update(schema.cosmetics)
      .set({ unlockAchievementId: cos.unlockAchievementId })
      .where(eq(schema.cosmetics.id, cos.id));
  }

  // Paso 4: Upsert de todas las marcas primero para resolver brandId globalmente
  const brandIdByName = new Map<string, number>();
  for (const brandInput of BRANDS_SEED) {
    const [brand] = await db
      .insert(schema.brands)
      .values({
        name: brandInput.name,
        logoUrl: brandInput.logoUrl,
        history: brandInput.history,
      })
      .onConflictDoUpdate({
        target: schema.brands.name,
        set: {
          logoUrl: brandInput.logoUrl,
          history: brandInput.history,
        },
      })
      .returning();
    brandIdByName.set(brandInput.name, brand.id);
  }

  // Paso 5: Carga global única + conciliación en 2 pasadas (preserva IDs en mudanzas como 1906 y Voll-Damm)
  const allExistingBeers = await db.select().from(schema.beers);
  const matchedExistingIds = new Set<number>();

  interface TargetEntry {
    brandId: number;
    beerInput: BeerSeedItem;
    matchedExisting?: typeof allExistingBeers[number];
  }

  const targets: TargetEntry[] = [];
  for (const brandInput of BRANDS_SEED) {
    const brandId = brandIdByName.get(brandInput.name)!;
    for (const beerInput of brandInput.beers) {
      targets.push({ brandId, beerInput });
    }
  }

  // Pasada A: coincidencia por nombre exacto (prioritario para mudanzas entre marcas)
  for (const entry of targets) {
    const hit = allExistingBeers.find(
      (b) => !matchedExistingIds.has(b.id) && b.name === entry.beerInput.name
    );
    if (hit) {
      entry.matchedExisting = hit;
      matchedExistingIds.add(hit.id);
    }
  }

  // Pasada B: coincidencia por barcode primario o alternativo para filas aún sin emparejar
  for (const entry of targets) {
    if (entry.matchedExisting) continue;
    const hit = allExistingBeers.find(
      (b) =>
        !matchedExistingIds.has(b.id) &&
        (b.barcode === entry.beerInput.barcode ||
          (entry.beerInput.extraBarcodes ?? []).includes(b.barcode))
    );
    if (hit) {
      entry.matchedExisting = hit;
      matchedExistingIds.add(hit.id);
    }
  }

  const freeBarcodeIfConflicting = async (barcode: string, skipId: number): Promise<void> => {
    const conflictingRow = allExistingBeers.find(
      (b) => b.barcode === barcode && b.id !== skipId
    );
    if (conflictingRow) {
      const tempBarcode = '999' + String(conflictingRow.id).padStart(10, '0');
      await db
        .update(schema.beers)
        .set({ barcode: tempBarcode })
        .where(eq(schema.beers.id, conflictingRow.id));
      conflictingRow.barcode = tempBarcode;
    }
  };

  const pendingInserts: Array<{
    brandId: number;
    name: string;
    format: 'lata' | 'botellin' | 'litrona';
    barcode: string;
    shortHistory: string;
    style: string;
    abv: string;
    country: string;
  }> = [];

  for (const entry of targets) {
    const { brandId, beerInput, matchedExisting } = entry;
    if (matchedExisting) {
      const unchanged =
        matchedExisting.brandId === brandId &&
        matchedExisting.name === beerInput.name &&
        matchedExisting.format === beerInput.format &&
        matchedExisting.barcode === beerInput.barcode &&
        matchedExisting.shortHistory === beerInput.shortHistory &&
        matchedExisting.style === beerInput.style &&
        Number(matchedExisting.abv) === Number(beerInput.abv) &&
        matchedExisting.country === beerInput.country;

      if (!unchanged) {
        await freeBarcodeIfConflicting(beerInput.barcode, matchedExisting.id);
        await db
          .update(schema.beers)
          .set({
            brandId,
            name: beerInput.name,
            format: beerInput.format,
            barcode: beerInput.barcode,
            shortHistory: beerInput.shortHistory,
            style: beerInput.style,
            abv: beerInput.abv,
            country: beerInput.country,
          })
          .where(eq(schema.beers.id, matchedExisting.id));

        matchedExisting.brandId = brandId;
        matchedExisting.name = beerInput.name;
        matchedExisting.format = beerInput.format;
        matchedExisting.barcode = beerInput.barcode;
        matchedExisting.shortHistory = beerInput.shortHistory;
        matchedExisting.style = beerInput.style;
        matchedExisting.abv = beerInput.abv;
        matchedExisting.country = beerInput.country;
      }
    } else {
      await freeBarcodeIfConflicting(beerInput.barcode, -1);
      pendingInserts.push({
        brandId,
        name: beerInput.name,
        format: beerInput.format,
        barcode: beerInput.barcode,
        shortHistory: beerInput.shortHistory,
        style: beerInput.style,
        abv: beerInput.abv,
        country: beerInput.country,
      });
    }
  }

  for (let i = 0; i < pendingInserts.length; i += 40) {
    const chunk = pendingInserts.slice(i, i + 40);
    await db.insert(schema.beers).values(chunk);
  }

  // Limpieza segura de huérfanas que no tengan registros de usuarios
  const orphanIds = allExistingBeers
    .filter((b) => !matchedExistingIds.has(b.id))
    .map((b) => b.id);
  if (orphanIds.length > 0) {
    const usedRows = await db
      .select({ beerId: schema.userBeers.beerId })
      .from(schema.userBeers)
      .where(inArray(schema.userBeers.beerId, orphanIds));
    const usedSet = new Set(usedRows.map((r) => r.beerId));
    const deletable = orphanIds.filter((id) => !usedSet.has(id));
    if (deletable.length > 0) {
      await db.delete(schema.beers).where(inArray(schema.beers.id, deletable));
    }
  }

  const totalBeers = targets.length;

  // Sincronizar secuencias
  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('brands', 'id'), COALESCE((SELECT MAX(id) FROM brands), 1))`
  );
  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('beers', 'id'), COALESCE((SELECT MAX(id) FROM beers), 1))`
  );

  invalidateCatalogCache();

  return {
    icons: ICONS_SEED.length,
    titles: TITLES_SEED.length,
    cosmetics: COSMETICS_SEED.length,
    achievements: ACHIEVEMENTS_SEED.length,
    brands: BRANDS_SEED.length,
    beers: totalBeers,
  };
}
