// functions/api/onboarding.js — recibe el formulario de puesta en marcha / Impulso IA
//
// Flujo:
//   1. Valida el POST (tamaño y que venga algo cargado).
//   2. Arma el Brief legible + el JSON crudo.
//   3. Crea la fila en Airtable → base IMPULSO IA, tabla ONBOARDING CLIENTES.
//   4. Avisa a Iván por WhatsApp usando el endpoint de Dorita en Railway.
//
// El aviso NUNCA hace fallar el guardado: si Airtable grabó, para el cliente
// el envío fue exitoso. Un aviso perdido se recupera mirando Airtable; un
// formulario perdido no lo vuelve a completar nadie.
//
// Secrets que espera (Cloudflare Pages → Settings → Environment variables):
//   AIRTABLE_TOKEN      · PAT con acceso a la base IMPULSO IA
//   DORITA_DEBUG_TOKEN  · DEBUG_TOKEN del server de Dorita en Railway

const BASE_ID  = "app4xOv8JmfDXVJbY";           // IMPULSO IA
const TABLE_ID = "tblAtjELzDaueRSkz";           // ONBOARDING CLIENTES
const EMPRESA  = "Gráfica Cicero SRL";
const TEL_IVAN = "595982790407";
const DORITA   = "https://salsa-soul-dorita-production.up.railway.app";

// El formulario en texto entra en unos pocos KB; el resto del margen es para
// el base64 de la lista de precios (4 MB de archivo ≈ 5,4 MB en base64).
const MAX_BYTES = 7 * 1024 * 1024;
const MAX_ARCHIVO_B64 = 6 * 1024 * 1024;
const CAMPO_ARCHIVO = "fldiBqPdqTWAPeqpG";   // Lista de precios (archivo)

// Los datos que la landing muestra YA CARGADOS en el campo, para que la persona
// corrija encima en vez de tener que mirar arriba y describir el cambio abajo.
// Van todos juntos a una sola columna: llegan siempre completos, no de a uno.
const BASE = [
  ["base_negocio",    "Negocio"],
  ["base_agente",     "Se llama"],
  ["base_direccion",  "Dirección"],
  ["base_horario",    "Horario"],
  ["base_tono",       "Tono"],
  ["base_derivacion", "Deriva a"],
  ["base_precio",     "Precio ya cargado"],
];

// Cada campo del form → su columna en Airtable. El orden es el del Brief.
const CAMPOS = [
  ["numero_agente", "Número de WhatsApp del agente",          "El número que va a usar el agente"],
  ["precios",       "Productos y precios",                    "Productos y precios"],
  ["disenio",       "Diseño propio",                          "¿Diseñan ellos? ¿Se cobra aparte?"],
  ["plazos",        "Plazos de producción",                   "Plazos de producción"],
  ["arte",          "Formato de arte",                        "Cómo tienen que mandar el arte"],
  ["senia",         "Seña y formas de pago",                  "Seña y formas de pago"],
  ["entrega",       "Entrega",                                "Retiro o delivery"],
  ["faq",           "Preguntas frecuentes",                   "Las preguntas de todos los días"],
  ["estados",       "Estados de producción",                  "Estados de un pedido"],
  ["comunica",      "Qué comunica el agente en cada estado",  "Qué puede decir el agente en cada estado"],
  ["derivacion",    "Responsable de derivaciones",            "Quién recibe las derivaciones"],
  ["tono",          "Tono y estilo",                          "Cómo tiene que hablar el agente"],
  ["admins",        "Administradores del agente",             "Administradores del agente (modo dueño)"],
  ["panel",         "Acceso al panel de control",             "Acceso al panel de control"],
  ["responsable",   "Responsable del proyecto",               "Responsable del proyecto"],
  ["facturacion",   "Datos de facturación",                   "Datos de facturación"],
  ["publicos",      "Datos de contacto públicos",             "Datos de contacto públicos"],
  ["otros",         "Otra información",                       "Otra información"],
];

// Lo que el formulario no puede resolver: queda escrito en la fila para que no
// se pierda de vista al armar el agente.
const PENDIENTE_REUNION = [
  "Accesos a Meta Business (permisos + códigos de verificación en vivo)",
  "Validar la modalidad de conexión si el número ya está en uso en WhatsApp",
  "Recorrido del flujo de toma de pedidos",
  "Límites del agente: qué decide solo y cuándo deriva",
  "Archivos: logo, fotos de trabajos, lista de precios, catálogos (llegan por WhatsApp)",
  "Modalidad de pago del consumo de API: lo habla Iván en persona — a propósito NO está en la landing",
].map((x) => "• " + x).join("\n");

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

function ahoraPY() {
  // America/Asuncion siempre — nunca la hora del datacenter de Cloudflare.
  const f = new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = {};
  for (const { type, value } of f.formatToParts(new Date())) p[type] = value;
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

// "Alejandro Acosta" + "socio" → "Alejandro Acosta — socio"
function quienCompleta(d) {
  return [d.contacto, d.rol].filter(Boolean).join(" — ");
}

function datosBase(d) {
  return BASE.filter(([c]) => d[c]).map(([c, t]) => `${t}: ${d[c]}`).join("\n");
}

function armarBrief(d, fecha) {
  const L = [];
  L.push(`ONBOARDING — ${EMPRESA}`);
  L.push(`Recibido: ${fecha} (hora de Paraguay)`);
  L.push("");
  const quien = quienCompleta(d);
  if (quien)      L.push(`Completó: ${quien}`);
  if (d.whatsapp) L.push(`WhatsApp: ${d.whatsapp}`);
  if (d.email)    L.push(`Email: ${d.email}`);
  L.push("");

  const base = datosBase(d);
  if (base) {
    L.push("─".repeat(52));
    L.push("DATOS BASE (como quedaron después de su revisión)");
    L.push(base);
    L.push("");
  }

  for (const [clave, , titulo] of CAMPOS) {
    if (!d[clave]) continue;
    L.push("─".repeat(52));
    L.push(titulo.toUpperCase());
    L.push(d[clave]);
    L.push("");
  }

  const faltan = CAMPOS.filter(([c]) => !d[c]).map(([, , t]) => t);
  if (faltan.length) {
    L.push("─".repeat(52));
    L.push("TODAVÍA SIN RESPONDER");
    L.push(faltan.map((t) => "• " + t).join("\n"));
  }
  return L.join("\n");
}

export async function onRequestPost({ request, env }) {
  // ── 1. Leer y validar ────────────────────────────────────────────────
  let datos;
  try {
    const crudo = await request.text();
    if (crudo.length > MAX_BYTES) return json({ ok: false, error: "El envío es demasiado grande." }, 413);
    datos = JSON.parse(crudo);
  } catch {
    return json({ ok: false, error: "No se pudo leer el formulario." }, 400);
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return json({ ok: false, error: "Formato inválido." }, 400);
  }

  // El archivo sale primero: es el único valor que no es texto plano y no
  // puede pasar por el recorte de abajo, que lo dejaría corrupto a la mitad.
  const arch = datos.archivo;
  let archivo = null;
  if (arch && typeof arch === "object" && typeof arch.b64 === "string" && arch.b64) {
    if (arch.b64.length > MAX_ARCHIVO_B64) {
      return json({ ok: false, error: "El archivo es demasiado grande (máximo 4 MB)." }, 413);
    }
    archivo = {
      nombre: String(arch.nombre || "lista-de-precios").slice(0, 200),
      tipo: String(arch.tipo || "application/octet-stream").slice(0, 120),
      b64: arch.b64,
    };
  }

  // Normalizamos a texto: nada de objetos anidados llegando a Airtable.
  const d = {};
  for (const [k, v] of Object.entries(datos)) {
    if (typeof v === "string") d[k] = v.trim().slice(0, 12000);
  }

  const hayAlgo =
    CAMPOS.some(([c]) => d[c]) || BASE.some(([c]) => d[c]) ||
    d.contacto || d.whatsapp || d.email || archivo;
  if (!hayAlgo) return json({ ok: false, error: "El formulario llegó vacío." }, 400);

  if (!env.AIRTABLE_TOKEN) {
    // Sin token no hay dónde guardar: fallamos fuerte en vez de decirle
    // "llegó" a alguien cuyo trabajo se perdió.
    return json({ ok: false, error: "El formulario no está configurado. Avisale a Iván." }, 503);
  }

  // ── 2. Armar la fila ─────────────────────────────────────────────────
  const fecha = ahoraPY();
  const fields = {
    "Empresa": EMPRESA,
    "Fecha": fecha,
    "Estado": "Recibido",
    "Brief": armarBrief(d, fecha),
    "Respuestas (JSON)": JSON.stringify(d, null, 2).slice(0, 95000),
    "Pendiente de reunión": PENDIENTE_REUNION,
  };
  const quien = quienCompleta(d);
  if (quien) fields["Contacto"] = quien;
  const base = datosBase(d);
  if (base) fields["Datos base confirmados"] = base;
  if (d.whatsapp) fields["WhatsApp"] = d.whatsapp;
  if (d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fields["Email"] = d.email;
  for (const [clave, columna] of CAMPOS) {
    if (d[clave]) fields[columna] = d[clave];
  }

  // ── 3. Guardar en Airtable ───────────────────────────────────────────
  let recordId = "";
  try {
    const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });
    const cuerpo = await r.json();
    if (!r.ok) {
      // El 422 de Airtable es silencioso si no se mira: acá se registra y se
      // le avisa a la persona, en vez de darle un "listo" falso.
      console.error("[ONBOARDING] Airtable rechazó:", r.status, JSON.stringify(cuerpo));
      return json({ ok: false, error: "No se pudo guardar. Escribile a Iván por WhatsApp." }, 502);
    }
    recordId = cuerpo?.records?.[0]?.id || "";
  } catch (e) {
    console.error("[ONBOARDING] Airtable no respondió:", e);
    return json({ ok: false, error: "No se pudo guardar. Probá de nuevo en un minuto." }, 502);
  }

  // ── 3b. Adjuntar la lista de precios al registro ─────────────────────
  // Va en una llamada aparte (content.airtable.com) porque la API de records
  // no recibe binarios. Si falla, el resto del formulario ya está guardado:
  // se lo decimos a la persona para que lo mande por email, en vez de perderlo.
  let archivoOk = null;
  if (archivo && recordId) {
    try {
      const r = await fetch(
        `https://content.airtable.com/v0/${BASE_ID}/${recordId}/${CAMPO_ARCHIVO}/uploadAttachment`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentType: archivo.tipo,
            filename: archivo.nombre,
            file: archivo.b64,
          }),
        }
      );
      archivoOk = r.ok;
      if (!r.ok) console.error("[ONBOARDING] Adjunto rechazado:", r.status, await r.text());
    } catch (e) {
      archivoOk = false;
      console.error("[ONBOARDING] Adjunto no subió:", e);
    }
  }

  // ── 4. Avisar a Iván (best-effort: nunca rompe el guardado) ──────────
  const completos = CAMPOS.filter(([c]) => d[c]).length;
  const aviso =
    `📋 ONBOARDING — ${EMPRESA}\n\n` +
    `${quien || "Sin nombre"} completó ${completos} de ${CAMPOS.length} respuestas.\n` +
    (d.whatsapp ? `WhatsApp: ${d.whatsapp}\n` : "") +
    (archivoOk === true  ? `📎 Subió la lista de precios: ${archivo.nombre}\n` : "") +
    (archivoOk === false ? `⚠️ Intentó subir ${archivo.nombre} y NO se pudo adjuntar.\n` : "") +
    `\nEstá en Airtable → IMPULSO IA → ONBOARDING CLIENTES.`;

  if (env.DORITA_DEBUG_TOKEN) {
    try {
      const url = `${DORITA}/debug/enviar?telefono=${TEL_IVAN}` +
                  `&mensaje=${encodeURIComponent(aviso)}&guardar=false`;
      const r = await fetch(url, { headers: { "X-Debug-Token": env.DORITA_DEBUG_TOKEN } });
      if (!r.ok) console.error("[ONBOARDING] Aviso WhatsApp falló:", r.status, await r.text());
    } catch (e) {
      console.error("[ONBOARDING] Aviso WhatsApp no salió:", e);
    }
  }

  return json({ ok: true, id: recordId, archivo: archivoOk });
}

// Solo se exporta onRequestPost: Pages responde 405 solo a cualquier otro método.
