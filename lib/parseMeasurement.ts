import pluralize from "pluralize";

/** Result of parsing an amount + unit out of an ingredient line prefix. */
export interface Measurement {
  /** The quantity as written, e.g. "2", "1.5", "1/2", "1 1/2", "2-3". */
  quantity: string | null;
  /** Canonical unit, e.g. "g", "ml", "tbsp", or null when there's no unit. */
  unit: string | null;
  /** Human-readable problem when the amount/unit couldn't be parsed cleanly. */
  error: string | null;
}

type UnitCategory = "solid" | "liquid" | "shared";

// Canonical unit -> which ingredient type(s) it can measure. "shared" units
// (spoons, cups, …) are accepted for both solid and liquid ingredients.
const UNIT_CATEGORY: { [canonical: string]: UnitCategory } = {
  // Mass — solids.
  mg: "solid",
  g: "solid",
  kg: "solid",
  oz: "solid",
  lb: "solid",
  // Countable / descriptive solid measures.
  clove: "solid",
  slice: "solid",
  pinch: "solid",
  handful: "solid",
  can: "solid",
  tin: "solid",
  packet: "solid",
  knob: "solid",
  sprig: "solid",
  stick: "solid",
  rasher: "solid",
  strip: "solid",
  sheet: "solid",
  bunch: "solid",
  head: "solid",
  fillet: "solid",
  // Volume — liquids.
  ml: "liquid",
  l: "liquid",
  pint: "liquid",
  "fl oz": "liquid",
  // Shared volume measures (used for both solids and liquids).
  tbsp: "shared",
  tsp: "shared",
  dsp: "shared",
  cup: "shared",
  drop: "shared",
  dash: "shared",
  splash: "shared",
  drizzle: "shared",
};

// Aliases (singular/abbreviation/spelling) -> canonical unit.
const UNIT_ALIASES: { [alias: string]: string } = {
  milligram: "mg",
  mg: "mg",
  gram: "g",
  gramme: "g",
  g: "g",
  kilogram: "kg",
  kilogramme: "kg",
  kilo: "kg",
  kg: "kg",
  ounce: "oz",
  oz: "oz",
  pound: "lb",
  lb: "lb",
  milliliter: "ml",
  millilitre: "ml",
  ml: "ml",
  cl: "ml",
  liter: "l",
  litre: "l",
  l: "l",
  pint: "pint",
  pt: "pint",
  tablespoon: "tbsp",
  tbsp: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  teaspoon: "tsp",
  tsp: "tsp",
  dessertspoon: "dsp",
  dsp: "dsp",
  cup: "cup",
  clove: "clove",
  slice: "slice",
  pinch: "pinch",
  handful: "handful",
  can: "can",
  tin: "tin",
  packet: "packet",
  pack: "packet",
  knob: "knob",
  sprig: "sprig",
  stick: "stick",
  rasher: "rasher",
  strip: "strip",
  sheet: "sheet",
  bunch: "bunch",
  head: "head",
  fillet: "fillet",
  drop: "drop",
  dash: "dash",
  splash: "splash",
  drizzle: "drizzle",
};

const VULGAR_FRACTIONS: { [char: string]: string } = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const FRACTION_CHARS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞";

/** Replace unicode fractions with ascii, splitting "1½" into "1 1/2". */
function normalizeFractions(text: string): string {
  return text
    .replace(
      new RegExp("(\\d)\\s*([" + FRACTION_CHARS + "])", "g"),
      function (_match, digit: string, frac: string) {
        return digit + " " + VULGAR_FRACTIONS[frac];
      }
    )
    .replace(
      new RegExp("[" + FRACTION_CHARS + "]", "g"),
      function (frac: string) {
        return VULGAR_FRACTIONS[frac];
      }
    );
}

/** Map a raw unit word to its canonical form, or null if it isn't a unit. */
function canonicalUnit(token: string): string | null {
  const lower = token.toLowerCase();
  return UNIT_ALIASES[lower] || UNIT_ALIASES[pluralize.singular(lower)] || null;
}

/** Whether a (canonical) unit may be used for an ingredient of this type. */
export function isUnitValidForType(
  unit: string | null,
  type: App.IngredientType
): boolean {
  if (!unit) {
    return true; // no unit is always fine
  }
  const category = UNIT_CATEGORY[unit];
  if (!category) {
    return false;
  }
  return category === "shared" || category === type;
}

/**
 * Parse a leading amount and unit out of an ingredient line prefix (the text
 * before the matched ingredient name, e.g. "2 tbsp extra virgin " or
 * "400g/14oz plain "). Handles decimals, fractions (1/2 and ½), mixed numbers,
 * ranges (2-3) and dual metric/imperial units (keeping the first).
 *
 * Returns an error when a unit is recognised but isn't valid for the
 * ingredient's type, or when a number is stuck to an unrecognised unit.
 */
export default function parseMeasurement(
  prefix: string,
  type: App.IngredientType
): Measurement {
  let rest = normalizeFractions(String(prefix == null ? "" : prefix)).trim();
  if (!rest) {
    return { quantity: null, unit: null, error: null };
  }

  let quantity: string | null = null;
  let match: RegExpMatchArray | null;

  if ((match = rest.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/))) {
    quantity = match[1] + "-" + match[2];
  } else if ((match = rest.match(/^(\d+)\s+(\d+\/\d+)/))) {
    quantity = match[1] + " " + match[2];
  } else if ((match = rest.match(/^(\d+\/\d+)/))) {
    quantity = match[1];
  } else if ((match = rest.match(/^(\d+(?:\.\d+)?)/))) {
    quantity = match[1];
  }

  if (match) {
    rest = rest.slice(match[0].length);
  }

  // A unit either butts straight up against the number ("400g") or follows a
  // space ("2 tbsp"). Whitespace tells us whether an unknown token is a broken
  // unit or just a descriptor word.
  let unitToken: string | null = null;
  let attached = false;
  let tokenMatch: RegExpMatchArray | null;
  if ((tokenMatch = rest.match(/^([a-zA-Z]+)/))) {
    unitToken = tokenMatch[1];
    attached = quantity != null;
  } else if ((tokenMatch = rest.match(/^\s+([a-zA-Z]+)/))) {
    unitToken = tokenMatch[1];
    attached = false;
  }

  let unit: string | null = null;
  let error: string | null = null;

  if (unitToken) {
    const canonical = canonicalUnit(unitToken);
    if (canonical) {
      unit = canonical;
      if (!isUnitValidForType(unit, type)) {
        const category = UNIT_CATEGORY[unit];
        error =
          "‘" +
          unitToken +
          "’ is a " +
          category +
          " measurement, but this ingredient is " +
          type;
      }
    } else if (attached) {
      // e.g. "3pcs" — a number glued to something that isn't a known unit.
      error = "couldn’t recognise the unit ‘" + unitToken + "’";
    }
    // A spaced, unknown token is just a descriptor ("2 large eggs") — ignore it.
  }

  return { quantity: quantity, unit: unit, error: error };
}
