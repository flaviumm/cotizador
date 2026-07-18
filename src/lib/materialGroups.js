// Agrupa las 215 categorías crudas del catálogo (heredadas de 3 proveedores scrapeados)
// en 13 grupos de negocio + "Sin clasificar". Ver propuesta revisada 2026-07-18.

const NOISE_TOKENS = new Set(["Ofertas", "Uncategorized", "Combos"]);

// Categorías crudas llegan a veces unidas por ", ,, " (tags de scraping mezclados
// con promos). Se descartan los tags de ruido y se conserva el primer tag real.
export function resolveMaterialCategory(item) {
  const raw = (item?.category || "").trim();
  if (!raw) return "Sin categoría";
  const tokens = raw.split(/,\s*,,\s*/).map((t) => t.trim()).filter(Boolean);
  const real = tokens.filter((t) => !NOISE_TOKENS.has(t));
  return real[0] || "Sin categoría";
}

const CATEGORY_LABELS = {
  "Manuales": "Herramientas Manuales",
};

export function materialCategoryLabel(resolvedCategory) {
  return CATEGORY_LABELS[resolvedCategory] || resolvedCategory;
}

export const MATERIAL_GROUPS = [
  "Herramientas",
  "Instalaciones de Agua y Sanitarios",
  "Perfiles y Caños Estructurales",
  "Pinturería y Terminaciones",
  "Construcción General",
  "Ferretería y Fijaciones",
  "Indumentaria y EPP",
  "Chapas y Cubiertas de Techo",
  "Instalaciones Eléctricas",
  "Hogar, Jardín y Electrodomésticos",
  "Instalaciones de Gas y Calefacción",
  "Soldadura",
  "Sin clasificar",
];

const CATEGORY_TO_GROUP = {
  "CAÑO ESTRUCTURAL RECTANGULAR": "Perfiles y Caños Estructurales",
  "CAÑO ESTRUCTURAL CUADRADO": "Perfiles y Caños Estructurales",
  "CAÑO ESTRUCTURAL REDONDO": "Perfiles y Caños Estructurales",
  "PLANCHUELA LISA": "Perfiles y Caños Estructurales",
  "PLANCHUELA PERFORADA": "Perfiles y Caños Estructurales",
  "ÁNGULO ALAS IGUALES": "Perfiles y Caños Estructurales",
  "PERFIL C": "Perfiles y Caños Estructurales",
  "PERFIL UPN": "Perfiles y Caños Estructurales",
  "PERFIL IPN": "Perfiles y Caños Estructurales",
  "PERFIL T": "Perfiles y Caños Estructurales",
  "HIERRO NERVADO CONSTRUCCIÓN": "Perfiles y Caños Estructurales",
  "HIERRO LISO": "Perfiles y Caños Estructurales",
  "VIGUETA PRETENSADA": "Perfiles y Caños Estructurales",
  "Viguetas": "Perfiles y Caños Estructurales",
  "MALLA SIMA": "Perfiles y Caños Estructurales",
  "BARRA REDONDA HERRERÍA": "Perfiles y Caños Estructurales",
  "ALAMBRE RECOCIDO DE ATAR": "Perfiles y Caños Estructurales",
  "Caños": "Perfiles y Caños Estructurales",

  "CHAPA SINUSOIDAL (ACANALADA)": "Chapas y Cubiertas de Techo",
  "CHAPA TRAPEZOIDAL T101": "Chapas y Cubiertas de Techo",
  "Construcción > Steelframing, placas de exterior y complementos": "Chapas y Cubiertas de Techo",

  "Articulos de Ferreteria": "Ferretería y Fijaciones",
  "Ferreteria": "Ferretería y Fijaciones",
  "Cerraduras y cerrojos": "Ferretería y Fijaciones",
  "Clavos": "Ferretería y Fijaciones",
  "Discos": "Ferretería y Fijaciones",
  "Sierras": "Ferretería y Fijaciones",

  "Soldadura": "Soldadura",
  "Electrodos": "Soldadura",

  "Instalaciones de agua": "Instalaciones de Agua y Sanitarios",
  "Griferias": "Instalaciones de Agua y Sanitarios",
  "Griferías": "Instalaciones de Agua y Sanitarios",
  "Bombas para agua": "Instalaciones de Agua y Sanitarios",
  "Termofusión": "Instalaciones de Agua y Sanitarios",
  "Desagüe": "Instalaciones de Agua y Sanitarios",
  "Bañeras y duchas": "Instalaciones de Agua y Sanitarios",
  "Bidet": "Instalaciones de Agua y Sanitarios",
  "Inodoros": "Instalaciones de Agua y Sanitarios",
  "Lavatorios": "Instalaciones de Agua y Sanitarios",
  "Baño": "Instalaciones de Agua y Sanitarios",
  "Baño y cocina": "Instalaciones de Agua y Sanitarios",
  "Sanitarios": "Instalaciones de Agua y Sanitarios",
  "Piletas y piscinas": "Instalaciones de Agua y Sanitarios",
  "Agua": "Instalaciones de Agua y Sanitarios",
  "Riego": "Instalaciones de Agua y Sanitarios",
  "Cocina": "Instalaciones de Agua y Sanitarios",

  "Instalaciones de Gas": "Instalaciones de Gas y Calefacción",
  "Calefacción": "Instalaciones de Gas y Calefacción",
  "Artículos de calefacción": "Instalaciones de Gas y Calefacción",
  "Termotanques y calefones": "Instalaciones de Gas y Calefacción",
  "Anafes": "Instalaciones de Gas y Calefacción",

  "Instalaciones de electricidad": "Instalaciones Eléctricas",
  "Cables": "Instalaciones Eléctricas",
  "Diyuntores": "Instalaciones Eléctricas",
  "Termicas": "Instalaciones Eléctricas",

  "Materiales de Construcción": "Construcción General",
  "Construcción": "Construcción General",
  "Construcción en seco": "Construcción General",
  "En seco": "Construcción General",
  "Áridos": "Construcción General",
  "Cerámicos": "Construcción General",
  "Cerámicos huecos": "Construcción General",
  "Porcellanatos": "Construcción General",
  "Pisos y revestimientos": "Construcción General",
  "Placas de yeso": "Construcción General",
  "Placas de madera": "Construcción General",
  "Placas cementicias": "Construcción General",
  "Revestimientos": "Construcción General",
  "Enduido": "Construcción General",
  "Morteros": "Construcción General",
  "Refractarios": "Construcción General",
  "Ladrillos": "Construcción General",
  "Obra gruesa": "Construcción General",
  "Membranas líquidas": "Construcción General",
  "Retak - HCCA": "Construcción General",
  "Adhesivos": "Construcción General",

  "Esmaltes sintéticos": "Pinturería y Terminaciones",
  "Esmaltes al agua": "Pinturería y Terminaciones",
  "Pinturería": "Pinturería y Terminaciones",
  "Látex de interior": "Pinturería y Terminaciones",
  "Látex de exterior": "Pinturería y Terminaciones",
  "Revestimiento texturado": "Pinturería y Terminaciones",
  "Terminaciones": "Pinturería y Terminaciones",
  "Aerosoles": "Pinturería y Terminaciones",
  "Pintura y protectores de madera": "Pinturería y Terminaciones",
  "Pintura Epoxy": "Pinturería y Terminaciones",
  "Diluyentes": "Pinturería y Terminaciones",
  "Pinceles y Rodillos": "Pinturería y Terminaciones",
  "Selladores y siliconas": "Pinturería y Terminaciones",

  "Manuales": "Herramientas",
  "Taladros y atornilladores": "Herramientas",
  "Amoladoras": "Herramientas",
  "Rotopercutores": "Herramientas",
  "Caladoras": "Herramientas",
  "Circular": "Herramientas",
  "Motoguadañas y bordeadoras": "Herramientas",
  "Motosierras": "Herramientas",
  "Hidrolavadoras": "Herramientas",
  "Generadores": "Herramientas",
  "Cajas de herramientas": "Herramientas",
  "Diamantados": "Herramientas",
  "De desbaste": "Herramientas",
  "De corte": "Herramientas",
  "Maquinaría de trabajo": "Herramientas",
  "Herramientas": "Herramientas",
  "Inalámbricas": "Herramientas",
  "Eléctricas": "Herramientas",
  "Medición": "Herramientas",
  "Accesorios": "Herramientas",

  "Calzado de seguridad": "Indumentaria y EPP",
  "Pantalones": "Indumentaria y EPP",
  "Remeras y camisas": "Indumentaria y EPP",
  "Camperas y buzos": "Indumentaria y EPP",
  "Mamelucos": "Indumentaria y EPP",
  "Guantes": "Indumentaria y EPP",
  "Máscaras": "Indumentaria y EPP",
  "Indumentaria y EPP - Ropa de trabajo": "Indumentaria y EPP",

  "Hogar y Jardín": "Hogar, Jardín y Electrodomésticos",
  "Electrodomésticos": "Hogar, Jardín y Electrodomésticos",
  "Ventiladores": "Hogar, Jardín y Electrodomésticos",
  "Camping y aire libre": "Hogar, Jardín y Electrodomésticos",
  "Limpieza y cuidado del auto": "Hogar, Jardín y Electrodomésticos",
  "Articulos de limpieza": "Hogar, Jardín y Electrodomésticos",
};

// Segunda pasada: para ítems sin ninguna categoría real (bucket "Sin categoría",
// 100% Ferromundo), se intenta ubicar por palabras clave del nombre. Reglas
// ordenadas de más específicas a más genéricas — gana la primera que matchea.
// Confianza menor que el mapeo por categoría: cobertura ~52% del bucket sin
// categoría, el resto queda en "Sin clasificar" a propósito (mejor no
// clasificar que clasificar mal).
const KEYWORD_RULES = [
  ["Soldadura", /\bSOLDADORA\b|\bSOLDADURA\b|\bSOLDADOR\b|\bELECTRODO(S)?\b|\bMIG\b|\bTIG\b|\bMMA\b/],
  ["Instalaciones Eléctricas", /\bINTERRUPTOR|\bCONTACTOR|\bGUARDAMOTOR|\bDISYUNTOR|\bDIYUNTOR|\bDIFERENCIAL\b|\bTERMOMAGNETIC|\bRELE\b|\bRELEVO\b|\bFUSIBLE|\bTETRAPOLAR|\bTRIPOLAR|\bBIPOLAR|\bSECCIONADOR|\bTABLERO ELECTRIC|\bTOMACORRIENTE|\bBORNERA|\bUPS\b|\bSOFSTARTER|\bTERMICO REGULACION/],
  ["Instalaciones de Gas y Calefacción", /\bCALEFACC|\bCALEFON|\bTERMOTANQUE|\bANAFE|\bCALORFLAT|\bGARRAFA|\bESTUFA/],
  ["Instalaciones de Agua y Sanitarios", /\bGRIFERIA|\bMONOCOMANDO|\bBACHA\b|\bINODORO|\bBAÑERA|\bDUCHA\b|\bLAVATORIO|\bTERMOFUSORA|\bDESAGUE|\bDESAGÜE|\bBIDET\b|\bPILETA\b|\bRIEGO\b|PVC TIGRE|\bTIGRE\b|SOLDABLE PVC|\bCAÑERIA/],
  ["Chapas y Cubiertas de Techo", /\bCHAPA GALVANIZADA|\bCUMBRERA|\bZINGUERIA|\bCHAPA ACANALADA/],
  ["Indumentaria y EPP", /\bCAMPERA|\bBUZO\b|\bGUANTE|\bCALZADO|\bBOTIN|\bCASCO\b|\bANTEOJOS DE SEGURIDAD|TALLE (XS|S|M|L|XL|XXL|3XL|\d)/],
  ["Herramientas", /\bSTIHL\b|\bBREMEN\b|\bBAHCO\b|\bIRIMO\b|\bTALADRO|\bATORNILLADOR|\bAMOLADORA|\bLIJADORA|\bROTOPERCUTOR|\bMOTOSIERRA|\bMOTODESMALEZADORA|\bPODADORA|\bDESMALEZADORA|\bTORQUIMETRO|\bPINZA AMPEROMETRICA|\bMORDAZA|\bESCALERA\b|\bTIJERA\b|\bCRIQUE\b|\bHIDROLAVADORA|\bGENERADOR\b|\bENGRAPADORA|\bGRAPADORA|\bCLAVADORA|\bMALACATE|\bPULVERIZADOR|\bLLAVE CRUZ|\bCARGADOR.*BATER|\bBATERIA.*ION LITIO|\bCOMPRESOR\b|\bRASTRILLO\b/],
  ["Ferretería y Fijaciones", /\bTORNILLO|\bTARUGO|\bFISCHER\b|\bREMACHE|\bBULON|\bTUERCA\b|\bARANDELA|\bCERROJO|\bCANDADO|\bCINTA METRICA|\bCLAVO\b/],
  ["Pinturería y Terminaciones", /\bBARNIZ|\bESMALTE|\bLATEX\b|\bLÁTEX\b|\bPINTURA\b|\bREXPAR|\bCHAPACRIL|\bSINTEPLAST|\bNOVACOR|\bSIKA\b|\bSELLADOR\b|\bEPOXY\b|\bEPOXI\b|\bSILOC\b|\bKRYLON\b/],
  ["Construcción General", /\bWEBER\b|\bPASTINA|\bMEZCLA\b|\bYESO\b|\bTELGOPOR|\bLANA DE VIDRIO|\bISOVER|\bMDF\b|\bENDUIDO|\bMORTERO|\bHORMIGON|\bCEMENTO\b|\bLADRILLO|\bCERAMIC|\bREVEST/],
  ["Hogar, Jardín y Electrodomésticos", /\bASPIRADORA|\bVENTILADOR|\bAIRE ACONDICIONADO|\bTERMO\b|\bPROTECTOR SOLAR|\bTRAMPA\b|POWERSTATION|\bECOFLOW\b/],
];

function keywordGroup(name) {
  const upper = (name || "").toUpperCase();
  for (const [group, pattern] of KEYWORD_RULES) {
    if (pattern.test(upper)) return group;
  }
  return null;
}

export function materialGroup(item) {
  const resolved = resolveMaterialCategory(item);
  if (resolved === "Sin categoría") return keywordGroup(item?.name) || "Sin clasificar";
  if (CATEGORY_TO_GROUP[resolved]) return CATEGORY_TO_GROUP[resolved];
  if (resolved.startsWith("Tornillos, fijaciones y ferretería")) return "Ferretería y Fijaciones";
  if (resolved.startsWith("Pinturas y decoración")) return "Pinturería y Terminaciones";
  if (resolved.startsWith("Pisos y revestimientos >")) return "Construcción General";
  if (resolved.startsWith("Siderometalúrgico")) return "Perfiles y Caños Estructurales";
  if (resolved.startsWith("Construcción > Chapas") || resolved.startsWith("Construcción > Techos")) return "Chapas y Cubiertas de Techo";
  if (resolved.startsWith("Construcción >")) return "Construcción General";
  return "Sin clasificar";
}
