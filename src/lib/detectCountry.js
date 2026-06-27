// Browser-side country detection from IANA timezone.
//
// Background: track-funnel-event/index.ts reads CF-IPCountry header for the
// 'pais' column on funnel_events. That header isn't reliably set on Supabase
// Edge Functions — when missing, countries_with_traffic stays 0 in the
// admin Geografia tab even after real quiz completions.
//
// Fallback: derive country from Intl.DateTimeFormat().resolvedOptions().
// timeZone. The browser knows the user's TZ deterministically (set by the
// OS at install time or by the user manually). The map below covers LATAM
// + Spain + US — the markets the app targets. ~95% coverage.

const TZ_TO_COUNTRY = {
  // México
  'America/Mexico_City':    'MX',
  'America/Cancun':         'MX',
  'America/Chihuahua':      'MX',
  'America/Hermosillo':     'MX',
  'America/Matamoros':      'MX',
  'America/Mazatlan':       'MX',
  'America/Merida':         'MX',
  'America/Monterrey':      'MX',
  'America/Ojinaga':        'MX',
  'America/Tijuana':        'MX',
  'America/Bahia_Banderas': 'MX',

  // Argentina
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Argentina/Catamarca':    'AR',
  'America/Argentina/Cordoba':      'AR',
  'America/Argentina/Jujuy':        'AR',
  'America/Argentina/La_Rioja':     'AR',
  'America/Argentina/Mendoza':      'AR',
  'America/Argentina/Rio_Gallegos': 'AR',
  'America/Argentina/Salta':        'AR',
  'America/Argentina/San_Juan':     'AR',
  'America/Argentina/San_Luis':     'AR',
  'America/Argentina/Tucuman':      'AR',
  'America/Argentina/Ushuaia':      'AR',
  'America/Buenos_Aires':           'AR',

  // Colombia
  'America/Bogota': 'CO',

  // Peru
  'America/Lima': 'PE',

  // Chile
  'America/Santiago':     'CL',
  'America/Punta_Arenas': 'CL',
  'Pacific/Easter':       'CL',

  // Ecuador
  'America/Guayaquil':  'EC',
  'Pacific/Galapagos':  'EC',

  // Venezuela
  'America/Caracas': 'VE',

  // Brasil (PT-speaking, but app's neighbors)
  'America/Sao_Paulo':    'BR',
  'America/Bahia':        'BR',
  'America/Belem':        'BR',
  'America/Boa_Vista':    'BR',
  'America/Campo_Grande': 'BR',
  'America/Cuiaba':       'BR',
  'America/Eirunepe':     'BR',
  'America/Fortaleza':    'BR',
  'America/Maceio':       'BR',
  'America/Manaus':       'BR',
  'America/Noronha':      'BR',
  'America/Porto_Velho':  'BR',
  'America/Recife':       'BR',
  'America/Rio_Branco':   'BR',
  'America/Santarem':     'BR',
  'America/Araguaina':    'BR',

  // Uruguay
  'America/Montevideo': 'UY',

  // Paraguay
  'America/Asuncion': 'PY',

  // Bolívia
  'America/La_Paz': 'BO',

  // Centroamérica
  'America/Guatemala':    'GT',
  'America/Tegucigalpa':  'HN',
  'America/El_Salvador':  'SV',
  'America/Managua':      'NI',
  'America/Costa_Rica':   'CR',
  'America/Panama':       'PA',

  // Caribe hispano-falante
  'America/Havana':         'CU',
  'America/Santo_Domingo':  'DO',
  'America/Puerto_Rico':    'PR',

  // Espanha
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',

  // USA (latina diaspora)
  'America/New_York':    'US',
  'America/Detroit':     'US',
  'America/Chicago':     'US',
  'America/Denver':      'US',
  'America/Phoenix':     'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage':   'US',
  'Pacific/Honolulu':    'US',
}

export function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return null
    return TZ_TO_COUNTRY[tz] ?? null
  } catch {
    return null
  }
}
