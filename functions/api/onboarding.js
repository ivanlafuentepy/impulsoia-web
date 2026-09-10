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

const MAX_BYTES = 60000;   // el formulario más largo imaginable entra holgado

// Cada campo del form → su columna en Airtable. El orden es el del Brief.
const CAMPOS = [
  ["correcciones", "Correcciones a los datos base",           "Correcciones a los datos que ya teníamos"],
  ["precios",      "Productos y precios",                     "Productos y precios"],
  ["disenio",      "Diseño propio",                           "¿Diseñan ellos? ¿Se cobra aparte?"],
  ["plazos",       "Plazos de producción",                    "Plazos de producción"],
  ["arte",         "Formato de arte",                         "Cómo tienen que mandar el arte"],
  ["senia",        "Seña y formas de pago",                   "Seña y formas de pago"],
  ["entrega",      "Entrega",                                 "Retiro o delivery"],
  ["faq",          "Preguntas frecuentes",                    "Las preguntas de todos los días"],
  ["estados",      "Estados de producción",                   "Estados de un pedido"],
  ["comunica",     "Qué comunica el agente en cada estado",   "Qué puede decir el agente en cada estado"],
  ["derivacion",   "Responsable de derivaciones",             "Quién recibe las derivaciones"],
  ["tono",         "Tono y estilo",                           "Cómo tiene que hablar el agente"],
  ["publicos",     "Datos de contacto públicos",              "Datos de contacto públicos"],
  ["otros",        "Otra información",                        "Otra información"],
];

// Lo que el formulario no puede resolver: queda escrito en la fila para que no
// se pierda de vista al armar el agente.
const PENDIENTE_REUNION = [
  "Accesos a Meta Business (permisos + códigos de verificación en vivo)",
  "Definición del número de WhatsApp que usará el agente",
  "Recorrido del flujo de toma de pedidos",
  "Límites del agente: qué decide solo y cuándo deriva",
  "Quiénes del equipo entran al panel de control",
  "Archivos: logo, fotos de trabajos, lista de precios, catálogos (llegan por WhatsApp)",
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

function armarBrief(d, fecha) {
  const L = [];
  L.push(`ONBOARDING — ${EMPRESA}`);
  L.push(`Recibido: ${fecha} (hora de Paraguay)`);
  L.push("");
  if (d.contacto) L.push(`Completó: ${d.contacto}`);
  if (d.whatsapp) L.push(`WhatsApp: ${d.whatsapp}`);
  if (d.email)    L.push(`Email: ${d.email}`);
  L.push("");

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

  // Normalizamos a texto: nada de objetos anidados llegando a Airtable.
  const d = {};
  for (const [k, v] of Object.entries(datos)) {
    if (typeof v === "string") d[k] = v.trim().slice(0, 12000);
  }

  const hayAlgo = CAMPOS.some(([c]) => d[c]) || d.contacto || d.whatsapp || d.email;
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
  if (d.contacto) fields["Contacto"] = d.contacto;
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

  // ── 4. Avisar a Iván (best-effort: nunca rompe el guardado) ──────────
  const completos = CAMPOS.filter(([c]) => d[c]).length;
  const aviso =
    `📋 ONBOARDING — ${EMPRESA}\n\n` +
    `${d.contacto || "Sin nombre"} completó ${completos} de ${CAMPOS.length} respuestas.\n` +
    (d.whatsapp ? `WhatsApp: ${d.whatsapp}\n` : "") +
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

  return json({ ok: true, id: recordId });
}

// Solo se exporta onRequestPost: Pages responde 405 solo a cualquier otro método.
