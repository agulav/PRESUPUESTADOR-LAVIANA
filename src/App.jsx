import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Truck, Settings, Calculator, MessageCircle, Plus, Trash2, Save, TrendingDown, Award, Copy, Check, Package, Percent, DollarSign, Coins, FileText, Users, FolderOpen, Search, Download, Eye, Printer, Calendar, Hash, ClipboardList, User, Building2, FileSignature, Sun, Moon } from 'lucide-react';

// ============================================================
// PRESUPUESTADOR v4 — con cotizaciones, vendedores y exportación
// ============================================================

const formatARS = (n) => {
  if (isNaN(n) || n === null || n === undefined) return '$ 0';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
};
const formatUSD = (n) => {
  if (isNaN(n) || n === null || n === undefined) return 'US$ 0';
  return 'US$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
};
const parseNum = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
const cuotaFrances = (capital, tnaPct, meses) => {
  if (capital <= 0 || meses <= 0) return 0;
  const i = (tnaPct / 100) / 12;
  if (i === 0) return capital / meses;
  return capital * (i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1);
};
const cuotaTasaFija = (capital, tasaPct, meses) => {
  if (capital <= 0 || meses <= 0) return 0;
  return (capital * (1 + tasaPct / 100)) / meses;
};
// Cheques: interés simple mensual directo (4% × meses)
const cuotaCheques = (capital, tasaMensualPct, meses) => {
  if (capital <= 0 || meses <= 0) return 0;
  const total = capital * (1 + (tasaMensualPct / 100) * meses);
  return total / meses;
};

const finDeMes = (fecha = new Date()) => {
  const d = new Date(fecha);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};
// Validez fija: hoy + 7 días
const validezFija = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};
const formatFecha = (d) => {
  const f = new Date(d);
  return f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ============================================================
// HELPERS DE ENVÍO (WhatsApp, Email, Copiar, Compartir nativo)
// ============================================================

// Limpia un teléfono argentino para WhatsApp (números, default +54)
const limpiarTelefonoWA = (tel) => {
  if (!tel) return '';
  let num = tel.replace(/\D/g, ''); // solo dígitos
  if (!num) return '';
  // Si arranca con 0, lo saco (formato local AR)
  if (num.startsWith('0')) num = num.substring(1);
  // Si no tiene código país, agrego 54
  if (!num.startsWith('54')) num = '54' + num;
  // Si después del 54 viene un 9, perfecto; si no, agrego 9 (móvil AR)
  if (num.startsWith('54') && !num.startsWith('549')) num = '549' + num.substring(2);
  return num;
};

// Abre WhatsApp con destinatario + mensaje precargado
// telefono: con o sin formato (lo limpia automático)
// texto: mensaje pre-cargado
const enviarWhatsApp = (telefono, texto) => {
  const num = limpiarTelefonoWA(telefono);
  const msg = encodeURIComponent(texto || '');
  // Si hay número usa wa.me/NUMERO, si no abre WhatsApp sin destinatario
  const url = num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, '_blank');
};

// Abre el cliente de email con asunto/cuerpo precargados
// destinatario: opcional (si vacío, queda para que vos lo pongas)
const enviarEmail = (destinatario, asunto, cuerpo) => {
  const to = destinatario || '';
  const params = new URLSearchParams();
  if (asunto) params.set('subject', asunto);
  if (cuerpo) params.set('body', cuerpo);
  const url = `mailto:${to}?${params.toString()}`;
  window.location.href = url;
};

// Copia texto al portapapeles. Devuelve true/false.
const copiarPortapapeles = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto || '');
    return true;
  } catch {
    // Fallback para navegadores viejos
    try {
      const ta = document.createElement('textarea');
      ta.value = texto || '';
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

// Compartir nativo (Web Share API) — solo móvil mayormente
// Si está disponible, muestra el menú nativo (WhatsApp, Mail, Drive, etc.)
const compartirNativo = async ({ title, text, url }) => {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (err) {
    if (err.name === 'AbortError') return true; // canceló el usuario, ok
    return false;
  }
};

const soportaCompartirNativo = () => typeof navigator !== 'undefined' && !!navigator.share;

// Componente de botones de envío reutilizable
// Props: mensaje (texto del presupuesto), whatsappCliente, emailCliente, asuntoEmail, onImprimir
function BotonesEnviar({ mensaje, whatsappCliente, emailCliente, asuntoEmail, onImprimir, layout = 'horizontal' }) {
  const [copiado, setCopiado] = useState(false);
  const handleCopiar = async () => {
    const ok = await copiarPortapapeles(mensaje);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } else {
      alert('No se pudo copiar. Probá imprimir.');
    }
  };
  const handleCompartir = async () => {
    const ok = await compartirNativo({ title: asuntoEmail || 'Presupuesto', text: mensaje });
    if (!ok) {
      // fallback: copiar al portapapeles
      handleCopiar();
    }
  };

  const isFlex = layout === 'horizontal';
  return (
    <div className={isFlex ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2'}>
      <button
        onClick={() => enviarWhatsApp(whatsappCliente, mensaje)}
        className="px-4 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: '#16a34a', color: 'white' }}
        title={whatsappCliente ? `Enviar a ${whatsappCliente}` : 'Abrir WhatsApp'}
      >
        📱 WhatsApp
      </button>
      <button
        onClick={() => enviarEmail(emailCliente || '', asuntoEmail || '', mensaje)}
        className="px-4 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: '#0ea5e9', color: 'white' }}
      >
        📧 Email
      </button>
      <button
        onClick={handleCopiar}
        className="px-4 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        {copiado ? '✓ Copiado' : '📋 Copiar texto'}
      </button>
      {soportaCompartirNativo() && (
        <button
          onClick={handleCompartir}
          className="px-4 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: '#7c3aed', color: 'white' }}
          title="Menú nativo del sistema (WhatsApp, Mail, Drive, etc.)"
        >
          📤 Compartir
        </button>
      )}
      {onImprimir && (
        <button
          onClick={onImprimir}
          className="px-4 py-2.5 rounded text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-surface)' }}
        >
          🖨️ Imprimir / PDF
        </button>
      )}
    </div>
  );
}

// ============================================================
// DATOS POR DEFECTO
// ============================================================

// Catálogo completo de modelos Foton (Mayo 2026)
// Estructura: cada modelo es una "familia" con versiones; cada versión tiene precio público y financiado.
// La lista financiada usa la columna del 9% (la que usa Agustín por defecto).
// Las tasas se asignan por "grupoTasa" para mapear con la circular Corven.

const FOTON_MODELOS_DEFAULT = [
  // ============ Z-TRUCK ============
  { id: 'ztruck', linea: 'ZTRUCK', nombre: 'Z-Truck', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'ztruck-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 27085500, monedaFinanciada: 'USD', precioFinanciado: 18400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 25085000 },
      { id: 'ztruck-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 32610000, monedaFinanciada: 'USD', precioFinanciado: 21100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 30595000 },
    ]},
  // ============ TM ============
  { id: 'tm1', linea: 'TM', nombre: 'TM1', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'tm1-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 33480000, monedaFinanciada: 'USD', precioFinanciado: 23600, monedaVentaDirecta: 'ARS', precioVentaDirecta: 31030000 },
      { id: 'tm1-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 37105000, monedaFinanciada: 'USD', precioFinanciado: 24500, monedaVentaDirecta: 'ARS', precioVentaDirecta: 34800000 },
      { id: 'tm1-box', nombre: 'Box Cargo', monedaPublica: 'ARS', precioPublico: 43195000, monedaFinanciada: 'USD', precioFinanciado: 28100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 40745000 },
      { id: 'tm1-boxr', nombre: 'Box Cargo Refrigerado', monedaPublica: 'ARS', precioPublico: 51315000, monedaFinanciada: 'USD', precioFinanciado: 35500, monedaVentaDirecta: 'ARS', precioVentaDirecta: 48285000 },
    ]},
  { id: 'tm2', linea: 'TM', nombre: 'TM2', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'tm2-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 39497500, monedaFinanciada: 'USD', precioFinanciado: 26100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 37120000 },
      { id: 'tm2-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 41310000, monedaFinanciada: 'USD', precioFinanciado: 27400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 38860000 },
    ]},
  // ============ WONDER ============
  { id: 'wonder', linea: 'WONDER', nombre: 'Wonder', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'wonder-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 34930000, monedaFinanciada: 'USD', precioFinanciado: 24500, monedaVentaDirecta: 'ARS', precioVentaDirecta: 32480000 },
      { id: 'wonder-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 36815000, monedaFinanciada: 'USD', precioFinanciado: 25800, monedaVentaDirecta: 'ARS', precioVentaDirecta: 34220000 },
      { id: 'wonder-csbox', nombre: 'CS Box', monedaPublica: 'ARS', precioPublico: 42180000, monedaFinanciada: 'USD', precioFinanciado: 29400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 39440000 },
    ]},
  // ============ TUNLAND G7 / V9 / V7 ============
  { id: 'tunland-g7', linea: 'TUNLAND', nombre: 'G7', grupoTasa: 'pickups',
    versiones: [
      { id: 'g7-4x2-mt', nombre: '4x2 MT', monedaPublica: 'ARS', precioPublico: 44137500, monedaFinanciada: 'ARS', precioFinanciado: 41724300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 41724300 },
      { id: 'g7-4x4-mt', nombre: '4x4 MT', monedaPublica: 'ARS', precioPublico: 47182500, monedaFinanciada: 'ARS', precioFinanciado: 44659500, monedaVentaDirecta: 'ARS', precioVentaDirecta: 44659500 },
      { id: 'g7-4x2-at', nombre: '4x2 AT', monedaPublica: 'ARS', precioPublico: 49212500, monedaFinanciada: 'ARS', precioFinanciado: 46616300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 46616300 },
      { id: 'g7-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 53932250, monedaFinanciada: 'ARS', precioFinanciado: 51165900, monedaVentaDirecta: 'ARS', precioVentaDirecta: 51165900 },
    ]},
  { id: 'tunland-v9-mhev', linea: 'TUNLAND', nombre: 'V9 Ultimate MHEV', grupoTasa: 'pickups',
    versiones: [
      { id: 'v9-mhev-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 74739750, monedaFinanciada: 'ARS', precioFinanciado: 71223300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 71223300 },
    ]},
  { id: 'tunland-v7-mhev', linea: 'TUNLAND', nombre: 'V7 Ultimate MHEV', grupoTasa: 'pickups',
    versiones: [
      { id: 'v7-mhev-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 78390000, monedaFinanciada: 'ARS', precioFinanciado: 74741900, monedaVentaDirecta: 'ARS', precioVentaDirecta: 74741900 },
    ]},
  { id: 'tunland-v9-pro', linea: 'TUNLAND', nombre: 'V9 Pro Sport Naftera', grupoTasa: 'pickups',
    versiones: [
      { id: 'v9-pro-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 81940000, monedaFinanciada: 'ARS', precioFinanciado: 78164000, monedaVentaDirecta: 'ARS', precioVentaDirecta: 78164000 },
    ]},
  // ============ AUMARK ============
  { id: 'aumark-s1-615', linea: 'AUMARK', nombre: 'Aumark S1 615', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s1-615-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 63785000, monedaFinanciada: 'USD', precioFinanciado: 44300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 59450000 },
      { id: 'aumark-s1-615-fb', nombre: 'Flatbed', monedaPublica: 'ARS', precioPublico: 69947500, monedaFinanciada: 'USD', precioFinanciado: 46500, monedaVentaDirecta: 'ARS', precioVentaDirecta: 65830000 },
    ]},
  { id: 'aumark-s3-916', linea: 'AUMARK', nombre: 'Aumark S3 916', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s3-916-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 75022500, monedaFinanciada: 'USD', precioFinanciado: 50300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 70470000 },
      { id: 'aumark-s3-916-fb', nombre: 'Flatbed', monedaPublica: 'ARS', precioPublico: 80460000, monedaFinanciada: 'USD', precioFinanciado: 52400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 75980000 },
    ]},
  { id: 'aumark-s3-1016', linea: 'AUMARK', nombre: 'Aumark S3 1016', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s3-1016-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 83360000, monedaFinanciada: 'USD', precioFinanciado: 58200, monedaVentaDirecta: 'ARS', precioVentaDirecta: 77285000 },
    ]},
  // ============ AUMAN D ============
  { id: 'auman-d-1621', linea: 'AUMAN D', nombre: 'Auman D 1621', grupoTasa: 'auman-d-1621',
    versiones: [
      { id: 'aumand-1621-ch', nombre: 'Chasis', monedaPublica: 'USD', precioPublico: 66300, monedaFinanciada: 'USD', precioFinanciado: 70700, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-d-2027', linea: 'AUMAN D', nombre: 'Auman D 2027', grupoTasa: 'aumand-2027',
    versiones: [
      { id: 'aumand-2027-ch', nombre: 'Chasis 4x2', monedaPublica: 'USD', precioPublico: 71600, monedaFinanciada: 'USD', precioFinanciado: 79300, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  // ============ AUMAN C ============
  { id: 'auman-c-4440', linea: 'AUMAN C', nombre: 'Auman C 4440', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-4440-mixer', nombre: 'Mixer 8x4', monedaPublica: 'USD', precioPublico: 200900, monedaFinanciada: 'USD', precioFinanciado: 200900, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-c-3535', linea: 'AUMAN C', nombre: 'Auman C 3535', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-3535-mixer', nombre: 'Mixer 6x4', monedaPublica: 'USD', precioPublico: 170800, monedaFinanciada: 'USD', precioFinanciado: 170800, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-c-5046', linea: 'AUMAN C', nombre: 'Auman C 5046', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-5046-vol', nombre: 'Volcador 8x4', monedaPublica: 'USD', precioPublico: 204400, monedaFinanciada: 'USD', precioFinanciado: 215400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-c-4146', linea: 'AUMAN C', nombre: 'Auman C 4146', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-4146-vol', nombre: 'Volcador 6x4', monedaPublica: 'USD', precioPublico: 197400, monedaFinanciada: 'USD', precioFinanciado: 197400, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
      { id: 'aumanc-4146-ch', nombre: 'Chasis 6x4', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 178200, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  // ============ AUMAN R ============
  { id: 'auman-r-1843', linea: 'AUMAN R', nombre: 'Auman R 1843-430', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-1843-tr', nombre: 'Tractor 4x2', monedaPublica: 'USD', precioPublico: 126400, monedaFinanciada: 'USD', precioFinanciado: 132100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-r-2443', linea: 'AUMAN R', nombre: 'Auman R 2443-6x2 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2443-ta', nombre: 'Techo Alto', monedaPublica: 'USD', precioPublico: 135700, monedaFinanciada: 'USD', precioFinanciado: 144100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
      { id: 'aumanr-2443-tb', nombre: 'Techo Bajo', monedaPublica: 'USD', precioPublico: 131100, monedaFinanciada: 'USD', precioFinanciado: 138800, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-r-2546', linea: 'AUMAN R', nombre: 'Auman R 2546-6x2 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2546-tr', nombre: 'Tractor 6x2', monedaPublica: 'USD', precioPublico: 139900, monedaFinanciada: 'USD', precioFinanciado: 155200, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-r-2556', linea: 'AUMAN R', nombre: 'Auman R 2556-6x4 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2556-tr', nombre: 'Tractor 6x4 Carretón', monedaPublica: 'USD', precioPublico: 156200, monedaFinanciada: 'USD', precioFinanciado: 175900, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  { id: 'auman-r-2656', linea: 'AUMAN R', nombre: 'Auman R 2656-6x4 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2656-tr', nombre: 'Tractor 6x4 Bitrén', monedaPublica: 'USD', precioPublico: 166200, monedaFinanciada: 'USD', precioFinanciado: 177200, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
  // ============ BLUELINE E-AUMARK L6 (eléctrico) ============
  { id: 'blueline-l6', linea: 'BLUELINE', nombre: 'E-Aumark L6', grupoTasa: 'aumark',
    versiones: [
      { id: 'blueline-l6-ch', nombre: 'Chasis', monedaPublica: 'USD', precioPublico: 58100, monedaFinanciada: 'USD', precioFinanciado: 58100, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
      { id: 'blueline-l6-fb', nombre: 'Flatbed', monedaPublica: 'USD', precioPublico: 59800, monedaFinanciada: 'USD', precioFinanciado: 59800, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
      { id: 'blueline-l6-box', nombre: 'Box', monedaPublica: 'USD', precioPublico: 64600, monedaFinanciada: 'USD', precioFinanciado: 64600, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
      { id: 'blueline-l6-boxr', nombre: 'Box Refri', monedaPublica: 'USD', precioPublico: 83200, monedaFinanciada: 'USD', precioFinanciado: 83200, monedaVentaDirecta: 'ARS', precioVentaDirecta: 0 },
    ]},
];

// Tasas Corven Mayo 2026 — indexadas por "grupoTasa"
// Tasas comunes para TODOS los grupos (la lista nueva no separa por modelo)
const TASAS_PESOS_DEFAULT = {
  santander:        { 12: 39.50, 24: 39.50, 36: 39.50, 48: 39.50, 60: 39.50 },
  icbc:             { 12: 37.50, 24: 37.50, 36: 37.50, 48: 37.50, 60: 37.50 }, // Cautivo
  santanderUsados:  { 12: 39.50, 24: 39.50, 36: 39.50, 48: 39.50, 60: 39.50 },
  comafi:           { 36: 37.00, 48: 38.00 },
  bnaAutos:         { 12: 38.00, 24: 38.00, 36: 38.00, 48: 38.00, 60: 38.00, 72: 38.00 },
  bnaConecta:       { 36: 29.00 }, // Sin quebranto
};

const TASAS_UVA_DEFAULT = {
  santanderUva:     { 12: 12.90, 24: 12.90, 36: 12.90, 48: 12.90, 60: 12.90 },
};

const TASAS_LEASING_DEFAULT = {
  thecapital:       { 36: 35.90, 48: 37.00, 60: 38.50 },
  supervielle:      { 36: 34.00 },
  gst:              { 36: 34.00, 48: 34.00, 60: 34.00 },
};

// Mismas tasas para todos los grupos de modelo
const construirTasasGrupo = (pctFinanciable = 70) => ({
  pesos:   { pctFinanciable, bancos: { ...TASAS_PESOS_DEFAULT } },
  uva:     { pctFinanciable, ...TASAS_UVA_DEFAULT },
  dolares: null,
  leasing: { pctFinanciable: 100, ...TASAS_LEASING_DEFAULT },
});

const TASAS_FOTON_DEFAULT = {
  'aumand-2027':  construirTasasGrupo(75),
  'auman-r':      construirTasasGrupo(75),
  'auman-c-5046': construirTasasGrupo(75),
  'auman-d-1621': construirTasasGrupo(75),
  'aumark':       construirTasasGrupo(75),
  'pickups':      construirTasasGrupo(75),
  'minitrucks':   construirTasasGrupo(75),
};

const GRUPOS_TASA_INFO = {
  'aumand-2027':  'AUMAND 2027',
  'auman-r':      'AUMAN R',
  'auman-c-5046': 'AUMAN C-5046',
  'auman-d-1621': 'AUMAN D 1621',
  'aumark':       'AUMARK',
  'pickups':      'Pickups G7 / V9',
  'minitrucks':   'Minitrucks / TM / Wonder / Z-Truck',
};

const BANCOS_INFO_FOTON = {
  santander:        { nombre: 'Santander',        color: '#dc2626' },
  galicia:          { nombre: 'Galicia',          color: '#f59e0b' },
  icbc:             { nombre: 'ICBC',             color: '#0f172a' },
  santanderUva:     { nombre: 'Santander UVA',    color: '#b91c1c' },
  santanderUsados:  { nombre: 'Santander Usados', color: '#991b1b' },
  thecapital:       { nombre: 'The Capital',      color: '#1e40af' },
  comafi:           { nombre: 'Comafi',           color: '#16a34a' },
  bnaAutos:         { nombre: 'BNA+Autos',        color: '#0369a1' },
  bnaConecta:       { nombre: 'BNA Conecta',      color: '#075985' },
  supervielle:      { nombre: 'Supervielle',      color: '#7c3aed' },
  gst:              { nombre: 'GST',              color: '#ca8a04' },
};

// ============================================================
// TASAS VENTA DIRECTA — Circular Corven 08/05/2026
// Quebranto se cobra APARTE como Gasto Otorgamiento (Malaspina factura aparte)
// ============================================================
const TASAS_FOTON_VD_DEFAULT = {
  'aumand-2027': {
    pesos: { pctFinanciable: 70, bancos: {
      santander: { 12: 0.0, 24: 16.2, 36: 22.6 },
      galicia:   { 24: 16.5, 36: 21.5, 48: 21.0 },
      icbc:      { 12: 10.6, 24: 17.9, 36: 24.3 },
      comafi:    { 12: 7.0,  24: 23.0, 36: 29.0 },
    }},
    uva:     { pctFinanciable: 75, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { pctFinanciable: 70, santander: { 24: 0.0, 36: 0.0, 48: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 0.5 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 26.75, 48: 28.75, 60: 32.0 } },
  },
  'auman-r': {
    pesos: { pctFinanciable: 70, bancos: {
      santander: { 12: 18.7, 24: 27.9, 36: 31.1 },
      galicia:   { 24: 23.5, 36: 27.0, 48: 29.0 },
      icbc:      { 12: 29.2, 24: 27.5, 36: 30.6 },
    }},
    uva:     null,
    dolares: { pctFinanciable: 75, santander: { 24: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 5.0 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 26.75, 48: 28.75, 60: 32.0 } },
  },
  'auman-c-5046': {
    pesos: { pctFinanciable: 70, bancos: {
      santander: { 12: 25.0, 24: 31.5, 36: 33.7 },
      galicia:   { 24: 30.0, 36: 32.0, 48: 32.5 },
      icbc:      { 12: 34.9, 24: 30.5, 36: 32.7 },
    }},
    uva:     null,
    dolares: { pctFinanciable: 75, santander: { 24: 0.0, 36: 0.0, 48: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 5.0 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 30.75, 48: 32.25, 60: 35.0 } },
  },
  'auman-d-1621': {
    pesos: { pctFinanciable: 65, bancos: {
      santander: { 12: 10.0, 24: 23.1, 36: 27.6 },
      galicia:   { 24: 19.0, 36: 23.5, 48: 26.0 },
      icbc:      { 12: 17.6, 24: 21.7, 36: 26.8 },
      comafi:    { 12: 12.0, 24: 26.0, 36: 31.0 },
    }},
    uva:     { pctFinanciable: 65, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { pctFinanciable: 65, santander: { 24: 0.0, 36: 0.0 }, galicia: { 24: 0.5, 36: 0.5 } },
    leasing: { pctFinanciable: 100, comafi: { 24: null, 36: 26.75, 48: 28.75 } },
  },
  'aumark': {
    pesos: { montoFinanciableFijo: 50000000, bancos: {
      santander: { 12: 7.8,  18: 17.0, 24: 21.8 },
      galicia:   { 24: 17.5, 36: 22.5, 48: 25.0 },
      icbc:      { 12: 19.5, 24: 22.7, 36: 27.5 },
      comafi:    { 12: 14.0, 24: 23.0, 36: 27.0 },
    }},
    uva:     { montoFinanciableFijo: 50000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { montoFinanciableFijo: 50000000, santander: { 24: 0.0, 36: 0.0 }, galicia: { 24: 0.5, 36: 0.5 } },
    leasing: null,
  },
  'pickups': {
    // Pickups G7 & V9: con quebranto 10% Terminal + 5% Dealer (en pesos)
    pesos: { montoFinanciableFijo: 25000000, bancos: {
      santander: { 12: 7.8,  18: 17.0, 24: 21.8 },
      galicia:   { 24: 17.5, 36: 22.5, 48: 25.0 },
    }},
    // UVA con quebranto por plazo en Santander
    uva:     { montoFinanciableFijo: 25000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 }, quebrantoPorPlazo: { 12: 5.0, 18: 9.5, 24: 10.0 } },
    dolares: { montoFinanciableFijo: 25000000, santander: { 24: 0.0, 36: 0.0 } },
    leasing: null,
  },
  'minitrucks': {
    // Minitrucks: con quebranto por plazo en UVA
    pesos: { montoFinanciableFijo: 20000000, bancos: {
      santander: { 12: 7.8,  18: 17.0, 24: 21.8 },
      galicia:   { 24: 17.5, 36: 22.5, 48: 25.0 },
      icbc:      { 12: 19.5, 24: 22.7, 36: 27.5 },
      comafi:    { 12: 14.0, 18: 23.0, 24: 27.0 },
    }},
    uva:     { montoFinanciableFijo: 20000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 }, quebrantoPorPlazo: { 12: 10.0, 18: 14.2, 24: 15.0 } },
    dolares: null,
    leasing: null,
  },
};

// Default de Flete + Formulario + Alistamiento según línea del modelo (en VD)
// $1.500.000: Minitrucks (ZTRUCK, TM1, TM2, Wonder) y Pickups (Tunland G7/V9/V7)
// $2.000.000: Aumark en adelante (Aumark, Auman D, Auman C, Auman R, Blueline)
const FLETE_FORM_ALIST_VD = {
  'minitrucks':     1500000, // ZTRUCK, TM1, TM2, Wonder
  'pickups':        1500000, // Tunland G7, V9, V7
  'aumark':         2000000, // Aumark S1/S3
  'auman-d-1621':   2000000, // Auman D
  'aumand-2027':    2000000, // Auman D 2027
  'auman-c-5046':   2000000, // Auman C
  'auman-r':        2000000, // Auman R
  'blueline':       2000000, // Blueline
};

// ============================================================
// DOCUMENTACIÓN A ENTREGAR — costos de transferencia
// Editables por el usuario y guardados en localStorage
// ============================================================
const DOC_ITEMS_DEFAULT = [
  { id: 'form08',         nombre: 'Formulario 08',                            monto: 15000 },
  { id: 'inf-dominio',    nombre: 'Informe de dominio',                       monto: 2000 },
  { id: 'inf-multas',     nombre: 'Informe de multas (13i SUAT)',             monto: 9000 },
  { id: 'cert-registro',  nombre: 'Certificación de firma — Registro Automotor', monto: 1300 },
  { id: 'cert-escribania',nombre: 'Certificación de firma — Escribanía',      monto: 25000 },
  { id: 'verif-policial', nombre: 'Verificación policial',                    monto: 55194 },
  { id: 'verif-domicilio',nombre: 'Verificación policial a domicilio',        monto: 30000 },
  { id: 'autopartes',     nombre: 'Autopartes (grabado)',                     monto: 66630 },
  { id: 'manuales',       nombre: 'Manuales',                                 monto: 0 },
  { id: 'duplicado-llave',nombre: 'Duplicado de llave',                       monto: 0 },
];

const FOTON_CONFIG_DEFAULT = { modoTasa: 'tna', quebrantoTerminal: 10, quebrantoDealer: 5, ivaSobreIntereses: false, cotizacionDolar: 1450, gastoPatentamientoPct: 6, gastosOtorgPct: 1 };

// ============================================================
// SISTEMA DE USUARIOS Y PERMISOS
// ============================================================
// USUARIOS POR DEFECTO (la primera vez que se abre la app)
// 2 admins: Agustín Laviana y Andrea Ruoco · 2 vendedores: Luis y Nahuel
// ============================================================
const VENDEDORES_DEFAULT = [
  {
    id: 'usr_agustin',
    nombre: 'Agustín Laviana',
    email: 'agustin@fotonmalaspina.com',
    clave: '101984',
    whatsapp: '',
    rol: 'admin',
    activo: true,
    permisos: { simular: true, formularios: true, proformas: true, documentacion: true, cotizacionesOtros: true, editarPrecios: true, editarTasas: true },
  },
  {
    id: 'usr_andrea',
    nombre: 'Andrea Ruoco',
    email: 'administracion@fotonmalaspina.com',
    clave: '6059',
    whatsapp: '',
    rol: 'admin',
    activo: true,
    permisos: { simular: true, formularios: true, proformas: true, documentacion: true, cotizacionesOtros: true, editarPrecios: true, editarTasas: true },
  },
  {
    id: 'usr_luis',
    nombre: 'Luis Estelrrich',
    email: 'ventasdos@fotonmalaspina.com',
    clave: '1403',
    whatsapp: '',
    rol: 'vendedor',
    activo: true,
    permisos: { simular: true, formularios: true, proformas: true, documentacion: true, cotizacionesOtros: false, editarPrecios: false, editarTasas: false },
  },
  {
    id: 'usr_nahuel',
    nombre: 'Nahuel Maldonado',
    email: 'ventas@fotonmalaspina.com',
    clave: '3231',
    whatsapp: '',
    rol: 'vendedor',
    activo: true,
    permisos: { simular: true, formularios: true, proformas: true, documentacion: true, cotizacionesOtros: false, editarPrecios: false, editarTasas: false },
  },
];

// Permisos disponibles
const PERMISOS_DISPONIBLES = {
  simular:        { nombre: 'Simular cotizaciones',           descripcion: 'Acceso al simulador (Convencional y Venta Directa)' },
  formularios:    { nombre: 'Crear formularios',              descripcion: 'Acceso a Pedido de Facturación (PF/PJ) y Alta de Cliente (AC)' },
  proformas:      { nombre: 'Crear proformas',                descripcion: 'Acceso a proformas Malaspina y Corven' },
  documentacion:  { nombre: 'Crear documentación',            descripcion: 'Acceso a documentación / costos de transferencia' },
  cotizacionesOtros: { nombre: 'Ver cotizaciones de otros vendedores', descripcion: 'Si está desactivado, solo ve las propias' },
  editarPrecios:  { nombre: 'Editar precios de modelos',      descripcion: 'Permite modificar la pestaña Modelos (precios y visibilidad)' },
  editarTasas:    { nombre: 'Editar tasas',                   descripcion: 'Permite modificar la pestaña Tasas (bancos y plazos)' },
};

// Permisos por defecto al crear un vendedor nuevo
const PERMISOS_VENDEDOR_DEFAULT = {
  simular: true,
  formularios: true,
  proformas: true,
  documentacion: true,
  cotizacionesOtros: false,
  editarPrecios: false,
  editarTasas: false,
};

// Permisos de admin: TODO
const PERMISOS_ADMIN = {
  simular: true,
  formularios: true,
  proformas: true,
  documentacion: true,
  cotizacionesOtros: true,
  editarPrecios: true,
  editarTasas: true,
};

// Datos de Foton Malaspina para el membrete
const EMPRESAS = {
  foton: {
    nombre: 'Foton Malaspina',
    nombreFormal: 'FOTON MALASPINA',
    direccion: 'Ruta Nacional 5, km 371.5, Pehuajó',
    web: 'www.fotonmalaspina.com',
    tel: '2396-549920',
  },
};

const PLAN_INFO = {
  contado: { nombre: 'Contado Efectivo',    icon: <DollarSign size={14} />, color: '#10b981' },
  pesos:   { nombre: 'Tasa fija en Pesos',  icon: <DollarSign size={14} />, color: '#16a34a' },
  uva:     { nombre: 'UVA Prendario',       icon: <FileText size={14} />,   color: '#a855f7' },
  dolares: { nombre: 'Dólares',             icon: <DollarSign size={14} />, color: '#0ea5e9' },
  leasing: { nombre: 'Leasing',             icon: <Coins size={14} />,      color: '#f59e0b' },
  cheques: { nombre: 'Cheques',             icon: <FileSignature size={14} />, color: '#06b6d4' },
};

// Formas de pago combinables (Convencional)
const FORMAS_PAGO_INFO = {
  contado:       { nombre: 'Contado',           icon: '💵', descripcion: 'Efectivo en mano' },
  contraEntrega: { nombre: 'Contra entrega',    icon: '🚚', descripcion: 'Paga al recibir la unidad' },
  transferencia: { nombre: 'Transferencia',     icon: '🏦', descripcion: 'Bancaria' },
  cheques:       { nombre: 'Cheques',           icon: '📄', descripcion: 'Pago en cuotas con cheques' },
  credito:       { nombre: 'Crédito Prendario', icon: '💳', descripcion: 'Financiación bancaria' },
  leasing:       { nombre: 'Leasing',           icon: '🏢', descripcion: 'Operación de leasing' },
};

// Descuento default contado efectivo y override
const DESCUENTO_CONTADO_DEFAULT = 5; // % autorizado sin override
const VALIDEZ_DIAS = 7; // Validez fija de las cotizaciones

// Tasa por defecto para cheques (% mensual directo)
const TASA_CHEQUES_DEFAULT = 4;
const PLAZOS_CHEQUES = [3, 6, 9, 12, 18];

// ============================================================
// APP PRINCIPAL
// ============================================================

export default function App() {
  const [tab, setTab] = useState('simular');
  // SISTEMA DE AUTENTICACIÓN
  const [usuarioActual, setUsuarioActual] = useState(null); // null = no logueado
  const [modelosFoton, setModelosFoton] = useState(FOTON_MODELOS_DEFAULT);
  const [tasasFoton, setTasasFoton] = useState(TASAS_FOTON_DEFAULT);
  const [tasasFotonVD, setTasasFotonVD] = useState(TASAS_FOTON_VD_DEFAULT);
  const [configFoton, setConfigFoton] = useState(FOTON_CONFIG_DEFAULT);
  const [vendedores, setVendedores] = useState(VENDEDORES_DEFAULT);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [formularios, setFormularios] = useState([]);
  // Documentación a entregar (costos de transferencia)
  const [docItems, setDocItems] = useState(DOC_ITEMS_DEFAULT);
  const [docPresupuestos, setDocPresupuestos] = useState([]);
  // Proformas (Corven + Malaspina)
  const [proformas, setProformas] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsAnuales, setSnapshotsAnuales] = useState([]);
  const [contadores, setContadores] = useState({ foton: 0, pf: 0, pj: 0, ac: 0, proforma: 0, patentamientoPF: 0, patentamientoPJ: 0 });
  const [verCotizacion, setVerCotizacion] = useState(null);
  const [verFormulario, setVerFormulario] = useState(null);
  const [tema, setTema] = useState('claro'); // 'claro' u 'oscuro'
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await storageGet('tema_v1'); if (r?.value) setTema(r.value); } catch {}
      try {
        const r = await storageGet('modelos_foton_v5');
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          // Validar que sea la nueva estructura (con versiones)
          if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0].versiones)) {
            setModelosFoton(parsed);
          }
        }
      } catch {}
      try { const r = await storageGet('tasas_foton_v5'); if (r?.value) setTasasFoton(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('config_foton_v4'); if (r?.value) setConfigFoton(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('vendedores_v4'); if (r?.value) setVendedores(JSON.parse(r.value)); } catch {}
      // Cargar sesión guardada
      try { const r = await storageGet('usuario_actual_v1'); if (r?.value) setUsuarioActual(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('contadores_v4'); if (r?.value) setContadores(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('cotizaciones_v4'); if (r?.value) setCotizaciones(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('formularios_v4'); if (r?.value) setFormularios(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('doc_items_v1'); if (r?.value) setDocItems(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('doc_presupuestos_v1'); if (r?.value) setDocPresupuestos(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('proformas_v1'); if (r?.value) setProformas(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('snapshots_v4'); if (r?.value) setSnapshots(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('snapshots_anuales_v1'); if (r?.value) setSnapshotsAnuales(JSON.parse(r.value)); } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveModelosFoton = async (n) => { setModelosFoton(n); try { await storageSet('modelos_foton_v5', JSON.stringify(n)); } catch {} };
  const saveTasasFoton = async (n) => { setTasasFoton(n); try { await storageSet('tasas_foton_v5', JSON.stringify(n)); } catch {} };
  const saveConfigFoton = async (n) => { setConfigFoton(n); try { await storageSet('config_foton_v4', JSON.stringify(n)); } catch {} };
  const saveVendedores = async (n) => { setVendedores(n); try { await storageSet('vendedores_v4', JSON.stringify(n)); } catch {} };

  // ============================================================
  // AUTH: login / logout / crear admin / cambiar clave
  // ============================================================
  const hashClave = (clave) => {
    // Hash simple para ofuscar (no es seguridad criptográfica real, pero evita ver claves en plano)
    let h = 0;
    const s = `fm_${clave}_2026`;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  };

  const login = async (email, clave) => {
    const emailNorm = (email || '').trim().toLowerCase();
    // Buscar por email (campo nuevo) o usuario (compat con admin viejo)
    const v = vendedores.find(x => {
      if (x.email && x.email.toLowerCase() === emailNorm) return true;
      if (x.usuario && x.usuario.toLowerCase() === emailNorm) return true;
      return false;
    });
    if (!v) return { ok: false, error: 'Email no encontrado' };
    if (v.activo === false) return { ok: false, error: 'Usuario desactivado. Contactá al administrador.' };
    // La clave puede estar plana (campo `clave`) o hasheada (campo `claveHash`, compat)
    const claveOk = (v.clave && v.clave === clave) || (v.claveHash && v.claveHash === hashClave(clave));
    if (!claveOk) return { ok: false, error: 'Clave incorrecta' };
    const sesion = {
      id: v.id,
      email: v.email || v.usuario,
      nombre: v.nombre,
      rol: v.rol,
      permisos: v.permisos || PERMISOS_VENDEDOR_DEFAULT,
    };
    setUsuarioActual(sesion);
    try { await storageSet('usuario_actual_v1', JSON.stringify(sesion)); } catch {}
    return { ok: true };
  };

  const logout = async () => {
    setUsuarioActual(null);
    try { await storageSet('usuario_actual_v1', ''); } catch {}
    setTab('simular');
  };

  const crearAdminInicial = async (datos) => {
    const admin = {
      id: 'admin_' + Date.now(),
      usuario: datos.usuario.trim().toLowerCase(),
      nombre: datos.nombre.trim(),
      whatsapp: datos.whatsapp || '',
      claveHash: hashClave(datos.clave),
      rol: 'admin',
      permisos: PERMISOS_ADMIN,
      activo: true,
      fechaCreacion: new Date().toISOString(),
    };
    const nuevos = [admin];
    await saveVendedores(nuevos);
    const sesion = { id: admin.id, usuario: admin.usuario, nombre: admin.nombre, rol: admin.rol, permisos: admin.permisos };
    setUsuarioActual(sesion);
    try { await storageSet('usuario_actual_v1', JSON.stringify(sesion)); } catch {}
    return admin;
  };

  // Helpers de permisos
  const esAdmin = () => usuarioActual?.rol === 'admin';
  const tienePermiso = (key) => {
    if (!usuarioActual) return false;
    if (usuarioActual.rol === 'admin') return true;
    return usuarioActual.permisos?.[key] === true;
  };


  // Snapshot mensual: guarda copia de modelos y bancos. Mantiene solo los últimos 3.
  const crearSnapshot = async (etiqueta) => {
    const ahora = new Date();
    const nombreAuto = etiqueta || `${ahora.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`;
    const snap = {
      id: 'snap_' + Date.now(),
      fecha: ahora.toISOString(),
      etiqueta: nombreAuto.charAt(0).toUpperCase() + nombreAuto.slice(1),
      modelosFoton: JSON.parse(JSON.stringify(modelosFoton)),
      tasasFoton: JSON.parse(JSON.stringify(tasasFoton)),
      configFoton: JSON.parse(JSON.stringify(configFoton)),
    };
    const nuevos = [snap, ...snapshots].slice(0, 3); // máx 3 mensuales
    setSnapshots(nuevos);
    try { await storageSet('snapshots_v4', JSON.stringify(nuevos)); } catch {}

    // Snapshot anual: guardar uno por mes-año si todavía no existe
    const claveMesAnio = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const yaExisteAnual = snapshotsAnuales.some(s => s.claveMesAnio === claveMesAnio);
    if (!yaExisteAnual) {
      const snapAnual = { ...snap, id: 'anual_' + Date.now(), claveMesAnio };
      // Mantener solo últimos 12 meses (snapshots anuales)
      const nuevosAnuales = [snapAnual, ...snapshotsAnuales].slice(0, 12);
      setSnapshotsAnuales(nuevosAnuales);
      try { await storageSet('snapshots_anuales_v1', JSON.stringify(nuevosAnuales)); } catch {}
    }
    return snap;
  };

  const eliminarSnapshotAnual = async (id) => {
    const nuevos = snapshotsAnuales.filter(s => s.id !== id);
    setSnapshotsAnuales(nuevos);
    try { await storageSet('snapshots_anuales_v1', JSON.stringify(nuevos)); } catch {}
  };

  // Exportar un snapshot como archivo JSON
  const exportarSnapshot = (snap) => {
    const data = JSON.stringify(snap, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${snap.etiqueta.replace(/\s+/g, '-')}-${snap.fecha.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const restaurarSnapshot = async (snap) => {
    if (!confirm(`¿Restaurar el snapshot "${snap.etiqueta}"? Esto va a sobrescribir las tasas y precios actuales.`)) return;
    await saveModelosFoton(snap.modelosFoton);
    if (snap.tasasFoton) await saveTasasFoton(snap.tasasFoton);
    await saveConfigFoton(snap.configFoton);
    alert(`Snapshot "${snap.etiqueta}" restaurado.`);
  };

  const eliminarSnapshot = async (id) => {
    const nuevos = snapshots.filter(s => s.id !== id);
    setSnapshots(nuevos);
    try { await storageSet('snapshots_v4', JSON.stringify(nuevos)); } catch {}
  };

  const guardarCotizacion = async (cotizacion) => {
    const año = new Date().getFullYear();
    const nuevoContador = (contadores.foton || 0) + 1;
    const numero = `FT-${año}-${String(nuevoContador).padStart(4, '0')}`;

    const cot = { ...cotizacion, id: 'cot_' + Date.now(), numero, negocio: 'foton', fechaCreacion: new Date().toISOString() };
    const nuevasCotizaciones = [cot, ...cotizaciones];
    setCotizaciones(nuevasCotizaciones);
    const nuevosContadores = { ...contadores, foton: nuevoContador };
    setContadores(nuevosContadores);
    try {
      await storageSet('cotizaciones_v4', JSON.stringify(nuevasCotizaciones));
      await storageSet('contadores_v4', JSON.stringify(nuevosContadores));
    } catch {}
    return cot;
  };

  const eliminarCotizacion = async (id) => {
    const nuevas = cotizaciones.filter(c => c.id !== id);
    setCotizaciones(nuevas);
    try { await storageSet('cotizaciones_v4', JSON.stringify(nuevas)); } catch {}
  };

  // Documentación a entregar
  const saveDocItems = async (n) => { setDocItems(n); try { await storageSet('doc_items_v1', JSON.stringify(n)); } catch {} };
  const guardarDocPresupuesto = async (presupuesto) => {
    const nuevoContador = (contadores.documentacion || 0) + 1;
    const cot = { ...presupuesto, id: 'doc_' + Date.now() };
    const nuevos = [cot, ...docPresupuestos];
    setDocPresupuestos(nuevos);
    const nuevosContadores = { ...contadores, documentacion: nuevoContador };
    setContadores(nuevosContadores);
    try {
      await storageSet('doc_presupuestos_v1', JSON.stringify(nuevos));
      await storageSet('contadores_v4', JSON.stringify(nuevosContadores));
    } catch {}
    return cot;
  };
  const eliminarDocPresupuesto = async (numero) => {
    const nuevos = docPresupuestos.filter(p => p.numero !== numero);
    setDocPresupuestos(nuevos);
    try { await storageSet('doc_presupuestos_v1', JSON.stringify(nuevos)); } catch {}
  };

  // Proformas
  const guardarProforma = async (proforma) => {
    const tipo = proforma.facturador || 'corven';
    const contKey = tipo === 'corven' ? 'proformaCorven' : 'proformaMalaspina';
    const nuevoContador = (contadores[contKey] || 0) + 1;
    const cot = { ...proforma, id: 'pf_' + Date.now() };
    const nuevos = [cot, ...proformas];
    setProformas(nuevos);
    const nuevosContadores = { ...contadores, [contKey]: nuevoContador };
    setContadores(nuevosContadores);
    try {
      await storageSet('proformas_v1', JSON.stringify(nuevos));
      await storageSet('contadores_v4', JSON.stringify(nuevosContadores));
    } catch {}
    return cot;
  };
  const eliminarProforma = async (numero) => {
    const nuevos = proformas.filter(p => p.numero !== numero);
    setProformas(nuevos);
    try { await storageSet('proformas_v1', JSON.stringify(nuevos)); } catch {}
  };

  const guardarFormulario = async (formulario) => {
    const año = new Date().getFullYear();
    const prefijos = { pf: 'PF', pj: 'PJ', ac: 'AC' };
    const prefijo = prefijos[formulario.tipo];
    const nuevoContador = (contadores[formulario.tipo] || 0) + 1;
    const numero = `${prefijo}-${año}-${String(nuevoContador).padStart(4, '0')}`;
    const form = { ...formulario, id: 'form_' + Date.now(), numero, fechaCreacion: new Date().toISOString() };
    const nuevos = [form, ...formularios];
    setFormularios(nuevos);
    const nuevosContadores = { ...contadores, [formulario.tipo]: nuevoContador };
    setContadores(nuevosContadores);
    try {
      await storageSet('formularios_v4', JSON.stringify(nuevos));
      await storageSet('contadores_v4', JSON.stringify(nuevosContadores));
    } catch {}
    return form;
  };

  const eliminarFormulario = async (id) => {
    const nuevos = formularios.filter(f => f.id !== id);
    setFormularios(nuevos);
    try { await storageSet('formularios_v4', JSON.stringify(nuevos)); } catch {}
  };

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" data-theme="claro" style={{ background: '#ffffff', color: '#1e3a8a' }}>Cargando...</div>;

  // Si no hay ningún vendedor cargado: pantalla de Setup inicial (crear admin)
  if (vendedores.length === 0) {
    return <PantallaSetup tema={tema} onCrearAdmin={crearAdminInicial} />;
  }

  // Si hay vendedores pero nadie logueado: pantalla de Login
  if (!usuarioActual) {
    return <PantallaLogin tema={tema} onLogin={login} />;
  }

  return (
    <div className="min-h-screen app-root" data-theme={tema} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="app-header border-b sticky top-0 z-20 print:hidden" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <LogoFoton size="md" color={tema === 'oscuro' ? 'light' : 'dark'} />
            <div className="flex items-center gap-2">
              <UsuarioMenu usuario={usuarioActual} onLogout={logout} esAdmin={esAdmin()} />
              <button onClick={async () => { const nuevo = tema === 'claro' ? 'oscuro' : 'claro'; setTema(nuevo); try { await storageSet('tema_v1', nuevo); } catch {} }} className="w-9 h-9 rounded-full flex items-center justify-center btn-tab transition" title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}>
                {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
          </div>

          <nav className="flex gap-0 mt-5 -mb-px overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
            {tienePermiso('simular') && <TabBtn active={tab === 'simular'} onClick={() => setTab('simular')}>Simular</TabBtn>}
            {(tienePermiso('formularios') || tienePermiso('proformas')) && (
              <TabBtn active={tab === 'formularios'} onClick={() => setTab('formularios')}>
                Formularios {(formularios.length + proformas.length) > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>{formularios.length + proformas.length}</span>}
              </TabBtn>
            )}
            {tienePermiso('documentacion') && (
              <TabBtn active={tab === 'documentacion'} onClick={() => setTab('documentacion')}>
                Documentación {docPresupuestos.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>{docPresupuestos.length}</span>}
              </TabBtn>
            )}
            <TabBtn active={tab === 'cotizaciones'} onClick={() => setTab('cotizaciones')}>
              Cotizaciones {cotizaciones.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>{cotizaciones.length}</span>}
            </TabBtn>
            {esAdmin() && (
              <>
                <TabBtn active={tab === 'mensual'} onClick={() => setTab('mensual')}>Actualizar mensual</TabBtn>
                <TabBtn active={tab === 'vendedores'} onClick={() => setTab('vendedores')}>Vendedores</TabBtn>
              </>
            )}
            {(esAdmin() || tienePermiso('editarPrecios')) && (
              <TabBtn active={tab === 'modelos'} onClick={() => setTab('modelos')}>Modelos</TabBtn>
            )}
            {(esAdmin() || tienePermiso('editarTasas')) && (
              <TabBtn active={tab === 'tasas-foton'} onClick={() => setTab('tasas-foton')}>Tasas</TabBtn>
            )}
            {esAdmin() && (
              <TabBtn active={tab === 'config-foton'} onClick={() => setTab('config-foton')}>Config</TabBtn>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 print:py-0 print:px-0 print:max-w-full">
        {tab === 'simular' && tienePermiso('simular') && <SimuladorWrapper modelosFoton={modelosFoton.filter(m => m.visible !== false)} tasasFoton={tasasFoton} tasasFotonVD={tasasFotonVD} configFoton={configFoton} vendedores={vendedores.filter(v => v.activo)} guardarCotizacion={guardarCotizacion} setVerCotizacion={setVerCotizacion} contadores={contadores} />}
        {tab === 'mensual' && esAdmin() && <PanelMensual modelosFoton={modelosFoton} setModelosFoton={saveModelosFoton} tasasFoton={tasasFoton} setTasasFoton={saveTasasFoton} configFoton={configFoton} setConfigFoton={saveConfigFoton} snapshots={snapshots} snapshotsAnuales={snapshotsAnuales} onCrearSnapshot={crearSnapshot} onRestaurarSnapshot={restaurarSnapshot} onEliminarSnapshot={eliminarSnapshot} onEliminarSnapshotAnual={eliminarSnapshotAnual} onExportarSnapshot={exportarSnapshot} />}
        {tab === 'cotizaciones' && <ListaCotizaciones cotizaciones={tienePermiso('cotizacionesOtros') ? cotizaciones : cotizaciones.filter(c => c.vendedor?.id === usuarioActual.id)} onVer={setVerCotizacion} onEliminar={eliminarCotizacion} />}
        {tab === 'formularios' && (tienePermiso('formularios') || tienePermiso('proformas')) && <FormulariosWrapper formularios={formularios} guardarFormulario={guardarFormulario} eliminarFormulario={eliminarFormulario} setVerFormulario={setVerFormulario} vendedores={vendedores.filter(v => v.activo)} contadores={contadores} modelosFoton={modelosFoton.filter(m => m.visible !== false)} configFoton={configFoton} proformas={proformas} guardarProforma={guardarProforma} eliminarProforma={eliminarProforma} permisos={{ formularios: tienePermiso('formularios'), proformas: tienePermiso('proformas') }} />}
        {tab === 'documentacion' && tienePermiso('documentacion') && <ModuloDocumentacion docItems={docItems} setDocItems={saveDocItems} docPresupuestos={docPresupuestos} onGuardar={guardarDocPresupuesto} onEliminar={eliminarDocPresupuesto} vendedores={vendedores.filter(v => v.activo)} contadores={contadores} />}
        {tab === 'vendedores' && esAdmin() && <ConfigVendedores vendedores={vendedores} setVendedores={saveVendedores} hashClave={hashClave} usuarioActual={usuarioActual} />}
        {tab === 'modelos' && (esAdmin() || tienePermiso('editarPrecios')) && <ConfigModelosFoton modelos={modelosFoton} setModelos={saveModelosFoton} />}
        {tab === 'tasas-foton' && (esAdmin() || tienePermiso('editarTasas')) && <ConfigTasasFoton tasas={tasasFoton} setTasas={saveTasasFoton} />}
        {tab === 'config-foton' && esAdmin() && <ConfigGeneralFoton config={configFoton} setConfig={saveConfigFoton} />}
      </main>

      <footer className="text-center text-xs text-stone-600 py-6 border-t border-stone-900 print:hidden">Foton Malaspina · Pehuajó</footer>

      {verCotizacion && <ModalCotizacion cotizacion={verCotizacion} onClose={() => setVerCotizacion(null)} />}
      {verFormulario && <ModalFormulario formulario={verFormulario} onClose={() => setVerFormulario(null)} />}

      <InputStyle />
    </div>
  );
}

// ============================================================
// PANTALLA DE SETUP — Primera vez, crear admin
// ============================================================
function PantallaSetup({ tema, onCrearAdmin }) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  const crear = async () => {
    setError('');
    if (!nombre.trim()) return setError('Cargá tu nombre completo');
    if (!usuario.trim() || usuario.length < 3) return setError('El usuario debe tener al menos 3 caracteres');
    if (!/^[a-z0-9_.]+$/i.test(usuario)) return setError('El usuario solo puede tener letras, números, punto y guión bajo');
    if (clave.length < 4) return setError('La clave debe tener al menos 4 caracteres');
    if (clave !== confirmar) return setError('Las claves no coinciden');
    setCreando(true);
    try {
      await onCrearAdmin({ nombre, usuario, whatsapp, clave });
    } catch (e) {
      setError('Error al crear el administrador');
      setCreando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-theme={tema || 'claro'} style={{ background: 'var(--bg-base, #f5f5f4)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Logo grande */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <LogoFoton size="hero" color={tema === 'oscuro' ? 'light' : 'dark'} />
          </div>
          <h1 className="heading-display text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Foton Malaspina</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configuración inicial</p>
        </div>

        {/* Card de setup */}
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {paso === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="inline-block w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3" style={{ background: 'var(--accent-soft)' }}>👋</div>
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>¡Bienvenido!</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Esta es la primera vez que se abre el sistema. Vamos a crear tu cuenta de <strong>administrador</strong>, que tendrá acceso completo a todas las funciones.
                </p>
              </div>
              <ul className="text-xs space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
                <li>✓ Como administrador podés gestionar vendedores, modelos y tasas</li>
                <li>✓ Podés crear vendedores con permisos personalizados</li>
                <li>✓ Tu clave se guarda solo en este dispositivo</li>
              </ul>
              <button
                onClick={() => setPaso(2)}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold transition"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                Comenzar →
              </button>
            </>
          )}

          {paso === 2 && (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Datos del administrador</h2>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Completá los datos de tu cuenta</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre completo</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Agustín Laviana" className="input" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre de usuario</label>
                  <input type="text" value={usuario} onChange={e => setUsuario(e.target.value.toLowerCase())} placeholder="agustin" className="input" />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Mínimo 3 caracteres. Solo letras, números, punto y guión bajo.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>WhatsApp <span className="opacity-50">(opcional)</span></label>
                  <InputTelefono value={whatsapp} onChange={setWhatsapp} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Clave</label>
                  <input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Mínimo 4 caracteres" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirmar clave</label>
                  <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repetí la clave" className="input" />
                </div>

                {error && (
                  <div className="rounded p-3 text-xs" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setPaso(1)} className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>← Volver</button>
                  <button onClick={crear} disabled={creando} className="flex-[2] px-4 py-3 rounded-lg text-sm font-semibold transition" style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: creando ? 0.6 : 1 }}>
                    {creando ? 'Creando...' : 'Crear administrador →'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Foton Malaspina · Pehuajó · Buenos Aires
        </p>
      </div>
      <InputStyle />
    </div>
  );
}

// ============================================================
// PANTALLA DE LOGIN
// ============================================================
function PantallaLogin({ tema, onLogin }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const ingresar = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!email.trim() || !clave) return setError('Cargá email y clave');
    setEnviando(true);
    const r = await onLogin(email, clave);
    setEnviando(false);
    if (!r.ok) setError(r.error || 'Error al ingresar');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-theme={tema || 'claro'} style={{ background: 'var(--bg-base, #f5f5f4)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Logo grande centrado */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <LogoFoton size="hero" color={tema === 'oscuro' ? 'light' : 'dark'} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sistema de gestión comercial</p>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Iniciar sesión</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ingresá con tu email y clave</p>

          <form onSubmit={ingresar} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value.toLowerCase())}
                placeholder="tu_email@fotonmalaspina.com"
                className="input"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Clave</label>
              <input
                type="password"
                value={clave}
                onChange={e => setClave(e.target.value)}
                placeholder="Tu clave"
                className="input"
              />
            </div>

            {error && (
              <div className="rounded p-3 text-xs" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: enviando ? 0.6 : 1 }}
            >
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-[10px] text-center mt-5" style={{ color: 'var(--text-muted)' }}>
            ¿Olvidaste tu clave? Pedile al administrador que la resetee.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Foton Malaspina · Pehuajó · Buenos Aires
        </p>
      </div>
      <InputStyle />
    </div>
  );
}

// ============================================================
// MENÚ DE USUARIO (dropdown en header)
// ============================================================
function UsuarioMenu({ usuario, onLogout, esAdmin }) {
  const [abierto, setAbierto] = useState(false);
  if (!usuario) return null;

  const iniciales = usuario.nombre.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition"
        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: esAdmin ? '#dc2626' : 'var(--accent)', color: 'white' }}>
          {iniciales}
        </span>
        <span className="hidden sm:inline">{usuario.nombre.split(' ')[0]}</span>
        <span className="text-xs">▾</span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-lg z-40 overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Sesión activa</div>
              <div className="font-bold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{usuario.nombre}</div>
              <div className="text-xs flex items-center gap-1.5 mt-1" style={{ color: 'var(--text-muted)' }}>
                {usuario.email || usuario.usuario}
                {esAdmin && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: '#dc2626', color: 'white' }}>Admin</span>}
              </div>
            </div>
            <button
              onClick={() => { setAbierto(false); onLogout(); }}
              className="w-full px-4 py-2.5 text-left text-sm font-semibold flex items-center gap-2 hover:opacity-80"
              style={{ color: '#dc2626' }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 text-[13px] font-medium transition whitespace-nowrap relative"
      style={{
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        background: 'transparent',
      }}
    >
      {children}
      {active && <span style={{
        position: 'absolute',
        bottom: -1, left: 0, right: 0,
        height: 2,
        background: 'var(--text-primary)',
      }} />}
    </button>
  );
}

function Campo({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label-tiny block mb-2">{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1.5" style={{ color: 'var(--text-soft)' }}>{hint}</span>}
    </label>
  );
}

// Input de plata con formato automático ($ y puntos): "$ 20.000.000"
function InputDinero({ value, onChange, placeholder, className = 'input' }) {
  // Formatea el número visible
  const display = (() => {
    const n = parseNum(value);
    if (!value || n === 0) return '';
    return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
  })();

  const handleChange = (e) => {
    // Sólo conservamos dígitos
    const soloNumeros = e.target.value.replace(/[^\d]/g, '');
    onChange(soloNumeros);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}

// Formatea un CUIT/CUIL/DNI con guiones automáticamente
// 11 dígitos → XX-XXXXXXXX-X (CUIT/CUIL)
// 7-8 dígitos → DNI sin formato
const formatCUIT = (raw) => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

// Input de CUIT/DNI con formato automático con guiones
function InputCUIT({ value, onChange, placeholder = '20-12345678-9', className = 'input' }) {
  const handleChange = (e) => {
    const formatted = formatCUIT(e.target.value);
    onChange(formatted);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      maxLength={13}
    />
  );
}

// Formato teléfono / WhatsApp argentino: (característica) número
// Característica: 2-4 dígitos (ej: 11, 2392, 2396, 351, 2657)
// Número: 6-8 dígitos
// Ejemplos: 2392559226 → (2392) 559226 · 1145678901 → (11) 45678901
const formatTelefono = (raw) => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  // Heurística: si empieza con 11 o 15, característica de 2 dígitos
  // Si empieza con 2, 3 o 4 (interior), característica de 3-4 dígitos
  if (digits.length <= 2) return digits;
  if (digits.startsWith('11') || digits.startsWith('15')) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  // Default: característica de 4 dígitos (interior, como 2392, 2396, 2657)
  if (digits.length <= 4) return `(${digits})`;
  return `(${digits.slice(0, 4)}) ${digits.slice(4)}`;
};

// Input de teléfono / WhatsApp con formato (característica) número
function InputTelefono({ value, onChange, placeholder = '(2396) 549920', className = 'input' }) {
  const handleChange = (e) => {
    const formatted = formatTelefono(e.target.value);
    onChange(formatted);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      maxLength={15}
    />
  );
}

// Input de kilómetros con punto de miles automático: 150000 → 150.000
function InputKM({ value, onChange, placeholder = '150.000', className = 'input' }) {
  const display = (() => {
    const n = parseNum(value);
    if (!value || n === 0) return '';
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
  })();
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}

// Localidades de Argentina (compacta: capitales de provincia + ciudades importantes + zona Trenque Lauquen / Pehuajó)
const LOCALIDADES_AR = [
  // Buenos Aires - zona Foton Malaspina y alrededores (prioritarias)
  'Trenque Lauquen, Buenos Aires', 'Pehuajó, Buenos Aires', 'Bolívar, Buenos Aires',
  'Carlos Casares, Buenos Aires', 'Daireaux, Buenos Aires', 'Henderson, Buenos Aires',
  'América, Buenos Aires', 'Rivadavia, Buenos Aires', 'General Villegas, Buenos Aires',
  'Bragado, Buenos Aires', 'Nueve de Julio, Buenos Aires', 'Lincoln, Buenos Aires',
  'Carlos Tejedor, Buenos Aires', 'Tres Lomas, Buenos Aires', 'Salliqueló, Buenos Aires',
  'General Pinto, Buenos Aires', 'Pellegrini, Buenos Aires', 'Casbas, Buenos Aires',
  // Buenos Aires - principales
  'CABA, Capital Federal', 'La Plata, Buenos Aires', 'Mar del Plata, Buenos Aires',
  'Bahía Blanca, Buenos Aires', 'Tandil, Buenos Aires', 'Olavarría, Buenos Aires',
  'Pergamino, Buenos Aires', 'Junín, Buenos Aires', 'Necochea, Buenos Aires',
  'Azul, Buenos Aires', 'Chivilcoy, Buenos Aires', 'Luján, Buenos Aires',
  'Mercedes, Buenos Aires', 'San Nicolás, Buenos Aires', 'Zárate, Buenos Aires',
  'Campana, Buenos Aires', 'Pilar, Buenos Aires', 'Escobar, Buenos Aires',
  'Quilmes, Buenos Aires', 'Avellaneda, Buenos Aires', 'Lanús, Buenos Aires',
  'Lomas de Zamora, Buenos Aires', 'Morón, Buenos Aires', 'San Isidro, Buenos Aires',
  'Tigre, Buenos Aires', 'San Miguel, Buenos Aires', 'Moreno, Buenos Aires',
  'Tres de Febrero, Buenos Aires', 'San Martín, Buenos Aires', 'Vicente López, Buenos Aires',
  'Saladillo, Buenos Aires', 'Veinticinco de Mayo, Buenos Aires', 'Chacabuco, Buenos Aires',
  'Coronel Suárez, Buenos Aires', 'Tres Arroyos, Buenos Aires', 'Pinamar, Buenos Aires',
  'Villa Gesell, Buenos Aires', 'Balcarce, Buenos Aires', 'Dolores, Buenos Aires',
  // Córdoba
  'Córdoba, Córdoba', 'Río Cuarto, Córdoba', 'Villa María, Córdoba', 'San Francisco, Córdoba',
  'Villa Carlos Paz, Córdoba', 'Alta Gracia, Córdoba', 'Río Tercero, Córdoba',
  'Bell Ville, Córdoba', 'Marcos Juárez, Córdoba', 'Jesús María, Córdoba',
  // Santa Fe
  'Rosario, Santa Fe', 'Santa Fe, Santa Fe', 'Rafaela, Santa Fe', 'Reconquista, Santa Fe',
  'Venado Tuerto, Santa Fe', 'Villa Constitución, Santa Fe', 'Casilda, Santa Fe',
  'San Lorenzo, Santa Fe', 'Esperanza, Santa Fe', 'Cañada de Gómez, Santa Fe',
  // Mendoza
  'Mendoza, Mendoza', 'San Rafael, Mendoza', 'Godoy Cruz, Mendoza', 'Las Heras, Mendoza',
  'Luján de Cuyo, Mendoza', 'Maipú, Mendoza', 'San Martín, Mendoza',
  // Tucumán
  'San Miguel de Tucumán, Tucumán', 'Yerba Buena, Tucumán', 'Tafí Viejo, Tucumán',
  'Concepción, Tucumán', 'Aguilares, Tucumán',
  // Entre Ríos
  'Paraná, Entre Ríos', 'Concordia, Entre Ríos', 'Gualeguaychú, Entre Ríos',
  'Concepción del Uruguay, Entre Ríos', 'Victoria, Entre Ríos', 'Gualeguay, Entre Ríos',
  // Salta
  'Salta, Salta', 'San Ramón de la Nueva Orán, Salta', 'Tartagal, Salta', 'Cafayate, Salta',
  // Jujuy
  'San Salvador de Jujuy, Jujuy', 'Palpalá, Jujuy', 'Libertador General San Martín, Jujuy',
  // Misiones
  'Posadas, Misiones', 'Oberá, Misiones', 'Eldorado, Misiones', 'Puerto Iguazú, Misiones',
  // Corrientes
  'Corrientes, Corrientes', 'Goya, Corrientes', 'Mercedes, Corrientes', 'Curuzú Cuatiá, Corrientes',
  // Chaco
  'Resistencia, Chaco', 'Presidencia Roque Sáenz Peña, Chaco', 'Villa Ángela, Chaco',
  // Formosa
  'Formosa, Formosa', 'Clorinda, Formosa', 'Pirané, Formosa',
  // Santiago del Estero
  'Santiago del Estero, Santiago del Estero', 'La Banda, Santiago del Estero', 'Termas de Río Hondo, Santiago del Estero',
  // Catamarca
  'San Fernando del Valle de Catamarca, Catamarca', 'Belén, Catamarca', 'Andalgalá, Catamarca',
  // La Rioja
  'La Rioja, La Rioja', 'Chilecito, La Rioja', 'Chamical, La Rioja',
  // San Juan
  'San Juan, San Juan', 'Rawson, San Juan', 'Caucete, San Juan',
  // San Luis
  'San Luis, San Luis', 'Villa Mercedes, San Luis', 'Merlo, San Luis',
  // La Pampa
  'Santa Rosa, La Pampa', 'General Pico, La Pampa', 'Toay, La Pampa', 'Realicó, La Pampa',
  // Neuquén
  'Neuquén, Neuquén', 'Cutral Có, Neuquén', 'Plaza Huincul, Neuquén',
  'San Martín de los Andes, Neuquén', 'Villa La Angostura, Neuquén', 'Zapala, Neuquén',
  // Río Negro
  'Viedma, Río Negro', 'General Roca, Río Negro', 'San Carlos de Bariloche, Río Negro',
  'Cipolletti, Río Negro', 'Villa Regina, Río Negro', 'El Bolsón, Río Negro',
  // Chubut
  'Rawson, Chubut', 'Comodoro Rivadavia, Chubut', 'Trelew, Chubut', 'Puerto Madryn, Chubut',
  'Esquel, Chubut',
  // Santa Cruz
  'Río Gallegos, Santa Cruz', 'Caleta Olivia, Santa Cruz', 'El Calafate, Santa Cruz',
  // Tierra del Fuego
  'Ushuaia, Tierra del Fuego', 'Río Grande, Tierra del Fuego',
];

// Input con autocompletado de localidades argentinas
function InputLocalidad({ value, onChange, placeholder = 'Trenque Lauquen, Buenos Aires', className = 'input' }) {
  const [mostrar, setMostrar] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);

  const sugerencias = useMemo(() => {
    if (!value || value.length < 2) return [];
    const v = value.toLowerCase().trim();
    // Match: empieza con lo escrito (prioridad alta) o contiene (prioridad baja)
    const empiezan = LOCALIDADES_AR.filter(l => l.toLowerCase().startsWith(v));
    const contienen = LOCALIDADES_AR.filter(l => !l.toLowerCase().startsWith(v) && l.toLowerCase().includes(v));
    return [...empiezan, ...contienen].slice(0, 8);
  }, [value]);

  const handleSelect = (loc) => {
    onChange(loc);
    setMostrar(false);
  };

  const handleKeyDown = (e) => {
    if (!mostrar || sugerencias.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceActivo(i => Math.min(i + 1, sugerencias.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceActivo(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); handleSelect(sugerencias[indiceActivo]); }
    else if (e.key === 'Escape') { setMostrar(false); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value || ''}
        onChange={e => { onChange(e.target.value); setMostrar(true); setIndiceActivo(0); }}
        onFocus={() => setMostrar(true)}
        onBlur={() => setTimeout(() => setMostrar(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {mostrar && sugerencias.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: 280,
          overflowY: 'auto',
          zIndex: 50,
        }}>
          {sugerencias.map((loc, i) => (
            <button
              key={loc}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(loc); }}
              onMouseEnter={() => setIndiceActivo(i)}
              className="w-full text-left px-3 py-2 text-sm transition"
              style={{
                background: i === indiceActivo ? 'var(--accent-soft)' : 'transparent',
                color: 'var(--text-primary)',
                borderBottom: i < sugerencias.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              📍 {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOGO FOTON MALASPINA — Imagen oficial embebida + "MALASPINA" al costado
// Las imágenes están inline (base64) para que funcionen en cualquier entorno
// ============================================================
const LOGO_FOTON_NEGRO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUEAAAEPCAYAAADcXHYtAAAmUUlEQVR42u2df4gcZxnHn+h45q5N08sxNVe7G1bTY8E0W5RmQqTWrJAxFK5V9w+rslIpB8L9V7pFqQumJ/ljEWkbQeJZaCtrhaDblqMsYrcgSCfaQtMV6rZNoUMvodfJJYZcfq28/tGd8725nZl3dmd33pn9fuAlyd3mbuad933meZ73+bGFAAgRy7IYEdHa2hpdvnyZVldX17+3trbm+/8nJiaIiGhycpLGx8fX/01ENDU1tQUzDMIGiwr0RKvVYqurq7S2tkZnzpyhc+fO0QcffECnT5+mc+fO0aVLl+j06dO0srLS089XVZVuvfVWmpqaoh07dtDOnTspm83Sjh07aGpqim6++WaanJykqakpCEcAIQgGj2EY7L333qPTp0/T2bNn6Z133qGzZ8/S8vJyz4KuVxRFod27d9OuXbto165dlE6n6Qtf+AJNT0/T3r17IRQBhCDoH9M0Wb1ep5MnT9Kbb75JH330EZmmSe12u6tQ6vb1QQlAt2tIpVJ0yy23UCqVoq9//et06NAhmpmZwRoHAPhjWRZrNBqsXC4zIvIdiqIwRVHW/y7yf8Ieor+3WCyyer3OTNNkeNIAmiBYp9VqsQ8//JBefvllevHFF+ntt99O/D2XSiU6cOAA7d69m/bs2YP1DyAER5GlpSVmGAYZhkH1en0k7tlpRmuaRvfccw8dOHCA7r77bvgRARgFjh07xnRdZ6qq9mRWxnXwZrvzXlVVZfl8npXLZZjL0ARBUk3ehYUFevbZZ/vWnhRFWf97t8MJVVXpxhtvpM9+9rO0fft2IiK6+eab17+/bds2mpiYoK1bt9LY2BgREV27do2uXLlCa2trdPHixfXPXr9+nSzLoqtXr9LVq1ddD2X462q32xv+3gu6rtORI0dI0zTsDQhBEFcsy2KnTp2iP/zhD3T8+PFQzUibTCZDMzMztGvXLtq5cydt27aNPv/5z9P09DSpqkrbt2+nVCrV1/oyTZNduHCBLl26RO+99x59+OGHdPHiRTp79iydPXuWWq3WJj9mP0KQv9dCoUAPPvgg7d+/H6YyhCCIE0tLS+yFF16gp59+en1D96sd2ULv7rvvpn379tFtt91G09PTkQUrW5bFLMui1dVV+vjjj+n999+nU6dO0V/+8hd6//33+xL4znkqFov07W9/G35DAGSn0WiwYrG4yd9HPiEu3fxk9sjlcqxcLjPDMJhpmsxOiZNV+zVNkxmGwSqVCtM0ra+wGuf/mZ2dZbVaDT5DAGSj1WqxQqEQyuFBJpNhhUKBVatVqQVeEMG4uLjICoUCy2QymwRgLwJR0zRmGAaEIQBRY5omO3bsWNfg5SAjm82y+fl5tri4yFqtFkvyfFWrVVYsFlkul+v7pVEqlViz2YQwBCAKarUa03W9q2lLLlkdzqHrOjt27NhIajWGYbDFxUU2OzsbWDPkP5PL5dji4mIitGYAYqPNzM3NCfv9uo18Ps8ajQZi4jrm8tLS0iZhGNRULhaLMJEBGDTVapVlMpmeBJ+qqmxubg4b1Uc7nJub6ytwvFKpYH4BCJtWq8WKxWJPGort74PvKpgwLJVKgfyG/DPJ5/OYbwDCol6v+25Gt2oupVKJNRoNbMY+hOHCwoJrWJHXM8lkMqxarWLuAegVy7JYpVJZ9/0F0f4KhQIzDAPO+hCFIe8z9BOC9vdUVWXz8/N4DgAExTTNQJsO2sdwqNVqQiay83mpqpro0CMAQtc6KGBBU1VVWblchsYxJMrlMstms74VapwvLrygABDQNChgiEahUGD1eh2ba8jYKYrdBCF5lPHC6TEALjj9fyICsFKpINYvQuyUPL+XlvPrHeEJALDhNQoSOIVUVRXxfhLRCYcJZB4XCgW4LwCwLKtrpoKbIFQUBVqExJTLZc8K1tQlcwfxhGBkMU1TKADa/nomk7FNLyAxfFaPiCDUdR1aPRhNAShS+sreQLlcDkHPMcIwjE2nx27FLeznC40QjBT5fF7YBM5mszj8iCGtVitQrKemaRCEIPlYliWUAkdc2htmLd6INrK3NUKYxiDRJnC3U2BCNZLEwxe+9Xv56boOjRAkUwOcn58XTrPqbBqQUEHoZxrruo7wGZAsOmatkAkMAZhcqtWqZ2YJOTKBMGMgEThLMXkN5JYmn6WlJZZOp4XWw9zcHNYDiP+bn1ziAJ1B0BCAoyUIRU1j+IZBbGk0GhuCZr1MYARB4wVJHm0R0OsYxA7TNJkdC4g3PXDDLr7g5x9UVRUnxiBeONPh3ARhJ4YMjDB+4TP2ukmn0zgxBvHADo518wHaX0fZddBtzXhphTgoAdLTye/1PQiZnZ1FKhzYgJ1L7te7BP5jIC2tVotpmibUkQwCEDgxTdO1pzS/jjKZDFLrgJz4BUTbA9VggBuGYazHEHYLqrb/3jl0A0Ae+HAHrwFTBvhRq9U8C7Pa/8ahGpDKjLFrx3nFA+IgBIjCV57x8i3DLAZSYIfDeAnAfD6PvrMgELZ/mTx8hOhTAiJHpEewoihoiQkC42zeRHCxANkQKZBKRKxTQAGAwPDtPMmjECuySUAkdNLdPIemaTBXQF8vWpFmXKhADiIxVfiYQHLpOYtwGNAvjUZjw8GbmyDEIQmIRAv0OgxBCAMIC74mpdtLt/NSBj2yBVMgjmEYTNO0rt9TFIXa7Tbpuk5PPfUUzczMhD63pmmy119/nd544w06d+5cpHOxa9cu+u53v0upVKqn+2w2m+y1116jVqtFa2trkd7Hfffd19PzsiyL1et1evXVV+n222+nw4cP0549e0J/7pqmMcMw1tdYN2q1Gt1///3Yz2CwiDRLGsSJnWmarFKpCFclHtYoFAqB0wANw7CLAUgzegljajabrFv71EEUyOULsXZzvRAyScAwEAlbGMRCtCxLqFl7VCOIP6parXoGl0c5gvhwLctiuq6HMidBX8BuvkFUKAcDR0R7GURMIC8A/cotDXsoiiK84TtzI+V9BBVcfuWvBlEpyCsu1b6GYrGIiAQwGBqNhqspykfwh/173UJxohIgzk0vavp3BELk108hVPj2yhXn72sQoSteoVn270Y5fjAQ7CoxbqdzRBR60CoveGUQGs4SYaJFPvl4N1mEH38fQdLPRFwi/D2GbZ66hWf1ej8ACJshdnaImxAM+61vmua6z0kW09F5HaIHCc7G47IIwaAvL1Fhzs9TJpMJ/eXIF1hwuyfEqIJQ8dvEgwiM9qokIsPonFYKvUBUVZXu+u05DXKS79cPxO15hR3D12w2u7pmnNogdi4ITSPzyxEOWwsUyRmNg/+MLzMm4wjy3JyHOkGFbdjB8/Pz876/G5WLQCj4FUwNuy9sZ+FKO4L4m0RiKinCuEDR01v+RRjUNWF/Nop1gqwlEArdgmFpQHGBlmWx2dlZaU3gbDYrHEYiWm07ChM4nU4HCmVyCvOgQnBQdSV5nzGhgAcYBG5vW35hh5kdwoc/yCgERe/VMAyhpH+K6CAkSHmzsIV5x4wNBT5usNsch619ghFEJCwmrN/VLS1KptHRhoRMR5H2kVEJwSCau1OYh3UtnQOWUCwHN22Qb+uAnQx6xu1AJOwF1mq1hAq0RjVyuZywWcVXPJFtpNNpYXN0EMKc/zlhpdW5aap8dRmU2QI9Ua/X10M73DZBWPFfMgcSp9Np4fAf2fyATlM8SOCyM0QpjGfD/xxd10Px1/ExrDSkgG0wIvjlhoa1iPlwGBmFoGg4jGVZXXvlyiIAg5yUdvxoAx9htV7w63mNTocgMCKmUBgHIs5m27JlUwRJxudPtWW7D13XhcNhOvc7NGEexsGFX1xpEDcAAOumsDMv07mo+vWzONPiSLKDhFwuJ7xxnKfaMt1H0Gc1rFRFPn6wX7eKaZqu7R5gEoOe8EuPCqNcEW9uk4SHCKIaCt8DQxYTuNcQJpHmWYMYHS26L3jLpduaEj3dB4Asy/Ktehyk7JKbz0lG7Y8CppNZlsX8gsmjHKJVbpyuCZl9r27Yh1I+6wkAf1qtludCymQyfRVL4Ovqyeg/C5JOZuevylggNYg5L9pDepBCUFXVvtaV05fZ7XkgVAYI4Re03O+psO27kXEESYsb1glqLyOoQJEluDvIAU433NwS6IAIAuEW7BtGgLTMgiOI87zZbErrywxqWgqakUPTxPvJJvGrQt459AEguKYWVuCpSPmjqIao45wvLCrjCJoWxwfERykIw+gR4tWDxNb0ES8IRPBcSP2YK/aBi4zVlUU3h2xVop3CK0g8oIzCvB+T2NnHpV83ARhBOgvEM+asn58vkybYSx4r7y+VUZCLVrvm3R5xDlDvZY31ewqdVD6FKfiEf/3rX0REpChK1+/v27evr59/4MABae613W7bfiTSNG2LiJbx8MMPb/ia2zxFcR/lcpnuvffeLSL/p1arsccee0yqtWffx759+2hqampLrz/nzjvv3PQ1RVHWn9XKygo2OnDHr0hlv1H3fFydM6h32FoT9VglWoZwGOfcBenxa5qmNKmKzlhRTdP6Tm/j2wAMQtMECSeTyYTWnNsNvmVjFEKQrw4jej+y9Tzh7yNokyu+kb1s/swwUtsMw2Be61jXdeQRA3cNwat0lqIofR2K8PAlp6LSBEX9Z41GY31TyVgkNQ5pcSL3EVYMn2mangc+OBwBnm9Qr00edttEv/JHg9xwoulkpmkymavDBMm5lVGY91LtWsTl4nc4gpL7oCt+gcxB8lBFaLVaQ8m7dQqvICEYbk2+ZRhB/Ge8MJdtqKoaejqbX3XvMPvigATht3DC6gvhdGIPWivpNT9V9uyWINpMFFq36BiEQPLz4YZVzBUkDD8TYlD12Abtp+KFrOiG47vsyZge10tanIwjSPP3oFaN7d8mVJoGoviVzwrSpzYofNjMoISgaM4z3/uYJDxACBLWI6MwDzMcxsu/7VXjMUhIERgRLMtiXqETg/DbODfrIEs5ZTIZ4UXvV1A26iFahdnZIkE2ITjo9eRVrShImTEwIvg5zrPZbGid5aIw20S1WL6gQNz9Z7Ywl7F47aB9cs6g/G7XACEINr057WwR6vMksh+cp7FhbFzRDWdZlm+L0bj4z5w54LKUyaIBRBm44dcrZdAvdRAzms2mZ7jKsHwovD8ujI07NzfXU7c4mcxGChjWw/sBZbmPYfgBnfgVioUQBJvMQC+fXLFYHJoj2ZlW1+vmC1Il2g6pkNF3FqT5u8jmj+o+VFUdapCy30EfskbAJvPJ6zRt2CEFvebq9pKHyueaRlHUwe36e6m0zPsBZROCwy5tj6wREIh6ve55IBBFbwY+wFfEuc9vfNFwGP4EVSaB0Wta3LC7xQXRyqNcPxCCwBe+BaYsQtDZnN1Ps+H9TqJaq1+WTNRmcJDyWDKnxUXhf/MTgmjGvhEFU/D/opYbJkZRqN1u09jY2NCvJ5VKbanX6+yNN96glZUV3wKm7XabMpkMPfnkk0JFOavVKvve97634T4jX4id61BVlZ588klKpVJCxUV/+9vf0osvvijfxlIUeuKJJ2jPnj1bhv27t27d6vn9tbU1bHqwURMkSXMtgwQvi/rP/HpRUIzi6GTMcQ6jM2G/+BW/QBEFEBshSCTWq1i0WxyRXIVFqY++zrI2srfdElGmpvkJQZjDG0GPEcl57rnnKJPJuH4/m83SL37xC6GfValU2IkTJ6ToD+JEVVV66qmnhMx5y7LYQw89tG52urk0ojKDg5jzAEIQ+DAzM7PlV7/6Famqur7JeCH2y1/+UmjDNRoN9rvf/U46v5nN0aNHaWZmRkhwPP3001Sv19eFX5QC0Pk8jh49KtS8apBcuXIFGweIs7S05BkiM6iSR72aOLzZJ2qqm6a5qckTxdR/Jls4DD+fsjQywukwCARfep0krr/mbBgeJC2OzyCQ0X8mmk5mWdZ6do9sOc7DKLQhil+wdJAezWAEEEmbk6kIpWVZga7HmYEikxAM2vjH2fNEJo12kDUng+J86dEQ62OCGNJsNj3rr8W5CKWM5bH4TRkkLU7G1p8kSQSBE78IgEHWMwQxxK/p0TCrf4QJ335RRj9gJyNGWJjLlhbXS5bOsCwFr9JwhCoymxj50+Hx8XG68cYbXb9/4cIFunbtWuzu65lnnqFnn31Wqmvis1MWFxeFN/Wvf/1r+uCDD6S6F/s+nnvuOaGwnmFy/fr19fnuFg4VRRaUzIx82tzExITnorAsiy5duhSre1paWmL33nvvpg0bpeDjBWC9XheOo3viiSekE+Y2tVpNOKxnWPApcd2eey6Xo/HxcUg+sJEknabJlhbnNMPjnhZHERbWEHUdeB30odESzOGeuHDhQmyu9fHHH1/XwGQxG+1r0XWdfvjDHwr9v1arxQqFgpRznM/n6Qc/+IGU13bmzBlaXl52/X46naaJiQlsapjDG9mxY4ewiSEzzWaTHTx4MHITuJs5rKoqHTlyRNgM/ulPf7rJjI7yHvg5/dnPfiadGWzz8ccf08rKiudal82HCU1QAr785S97fv/kyZOxuI9XX33VcwNEpQkSBUsnW1hYYCdOnJDuHoiIKpUKHTx4UFohsrq66vn9W265BRseQnAz09PT67m53XjzzTdJpjAIN86fPy/ldRWLRXrooYeEBMfS0hI7fvz4Bi1SFkFYKBTokUcekVqL8nsJ3nbbbdjwYDOmaXoGFSuKEgtnsl+VbIognzafzwvHWcqW48z/fk3TpI+v42NDySVDB9kiwBW/YNw4RNnL0j+Y77IW5GTdPqWXRZDzf49DX45ms+nZNCyfzyNQGrjjlTVCMarG26kQIoUAqVQqPaXFySYEZUuLc8PZeJ4kz4MHksG3bCSX+Kq43Itf39lhjCDVrjtatpTxjXF67n7tGKIs+Q9i9BZ1E4IdMzM2Ps5h+9ac5mMQP6BsrT/5e4mT+egX9B9EMwcjSMdM8BxxirSv1+vrRQeGfcgQpGhnZ2NKmeESp4ZElmV1LTLB+2dxKAJ88Ss7FbeKvFEImCCVuP18WFEKQFkqiovS0Vg9i74iXQ744taQ3N4cHV9brODLaQ1aiBQKhUBN00migxCnHzBuAsN+4TnnspfSZWCE6YRzuG6OfD4fu9M1vxjIsEY6nQ4URiRr68+g1a5lwS00xl67cTnhBhHTcea7LqRMJhPLDTKMaixB/Gf8KaZsPU9i3Jgc1aRB/zibGXXbpEFKwsfB1A9jdE6ihf2AvANfhqwQ+xo6JahiR+fAw28uAQiupVCCAk55AR+G4LF/RjqdFp4Pv1YGUfoB0+l0bA8O7AZUFELMJgBUr9c9fWiqqsbWtAi7V0dQ/5ndD1e2dplxDh8xTdOzURgRxSLlD0i2qPzerHFuXu1Mq+tHIAVxtsuQzhfGfcj4PN1OhG0Bj3xhEBhbY3ETErquxzoH09m/l3qsDhPEDJap9Sd/H7J1iwtKp8y/q5mPfGHQE0tLS77VWOJ82mZZ1roJFVQI2tqFaFqcZVnS+gEpZllATprN5qZ+Is4XW5ytFhCxkLAXl5upEcfAaR7nKS0NKC2OP5WWrTpM3AWE7WJwW6NxqIEIYmASe/lb4n6PIvF69tft7wWpRCKiUUc14l5RxbKs9cITSX1Rg4hxK+8U1wR7NzrpVL5CkHqoEu3V+jHKEeQ+ZDaFKbmB30AW/EIPggQJy6xRuJmrvAAMmi3DC1eZBGA6nY5l1o8TNy2QuHYAOBABoflcyCO+LAkxWCJpdUEyZWSuEh3XjB+nlk0+YU6yNocHMaPVavmadEnxu7iFWlCnOozoz2k0GtL5Ae3rCHIfcX1WFMNisEBy7NNNtw2tKEoizCuvIPFeq0TLZgrH3Q9ov5i9miklxU0DJMIwDJbJZEaid4NhGJs03yDd4ngNRbbqMEmpqixSCCMJL2UgGXwGiZsvJimliprNJiuVSqxUKgXaTLKlxcWxW5zIs3E7rONNfhyIgNBxK6rAaztx6ko2CBNNNhOYFwpJKSsv0i4BxRLAwOgWkuAMJB5VM8QvXCPKkRQNnc+/dnM1JEngAwlxBk93W4Sj6JBGWtxwEOkljeBoMDSNx2vDJyEOTZRhlO3vVQAmqdG4SFe+uFc2AjHVBimhKVmi5plfRg1FmBaXJLNQpAoPfIFgaPCFFdy0wVHo7DXMVp5BRiaTSVSTcT77hhLWGwXEWBt0ixtMYshMHMzgpLoj+JAYr7xuxAWCodMtVMFekPaf2Ww2sT4aWavDJCUtjuiTwhb2YYiXtp0k3yeIEXxzGz5MxmkiJzGJ3TRN37QtiuAgJJPJJMoPyAefO1+w/IsWOcIgcpOwm/CjBKZr2bRaLd80wiiEYJD0vjjMcbeq38511rFIAIgO+9TOy1zRdT1xp8WyaIKU0IMot1qMvTa6AmCgpiEJdDSbn59P1IIVSeIf1khaNzVnEQpKeCYMSJjvhhJezNPGsqx1v+Cwq8Xwv09V1UQJg6WlJaHmV50wLQDkEQgiKU1JqTtow2cxRCUEk5QWJxp8DjMYSIlIzUHqBLUm6QRTpKoJDegwpBOsnRhEezMjJhBIbcqIaEZJy/HsxKkNTCPsFn6Uy+USNYduFb0JBRJA3HDrVUxd+pIkZRM3m82B+gedPzOdTifKD+hVhSfJh2sgoViWxUTf6kkKpO7EQg7MN5jUA6ZqtbqhWK9bE/WkBYKDhGMYhqdmlNRgV7cWBEToFuf24ujWlc+ZFULwA4IkLHAvDSkpmo1lWcwO8h2UFpgUc9DLf+xcL0k6AQcjRrfcT0q4w5v3D4Y9kpIWx9ekHCVLAYwodvR/N3OHH6qqJkYQVqvV0H2DSUmLq9frm4Kh3eYKByEgETjLIXVb8Hz2Q1IEoUgJKBI8EU5K86B6vb7BV0weZdg0TcNBCEgOpmnagb2ugoH/WhIEoWVZfWmDfDxgEsJheB8g+fgB0+k0BCBIviD0M4eSYP4ZhtG3WZyEQwGnb9jrJahpGuoDguTSarWYs0SSl1O8VCrFXiPonHwLmcbOrJC4V0y2LIt1u3+3P5Oi9QLgKwj5JHk/waDreqwFIa8Bi2iFSfGJWZbF+LhJN+1vVHrSALABvnmOqECI8wbxahZELocDcQ4ONk2T8cUQ3CqP8/+GCQxGUiN0NnL3cpYrihLrAxPnwQAlNGbS2SSdf37dwqSy2Sw0QDDagpA3FUXMxXK5HNtS/c6Kyd00pFKpFMvYONv/x+cBk0/oTz6fhwAEwOkzcxOE/PdmZ2djaS5alsV4QUgJqazTbDY3aPUkkP6naVri+s4A0Jdw4GvykUA5KVVVY5tSZRjGhkODYrEYWx9gtVoNnCaYtFqIAITG4uKiqw/JbaTTaTjVJdX+nOa+oiiJ7EMNQKjwqVVBNMNKpYIsgyFp7XwNQJHYR1tzRzUYAAKYi6KFWflNqOs6NtqAX1B8Qy1RbT2TyeAABICgmKbJuvXucAu14P+t6zo2XYi0Wi02Nzfne/Lb7fnk83kcgADQD7VabUMXO7fAW3JpSg5h2N+LyOs0m3x8tUlqAwBA5OaxXxUaLxOtXC7j8CQAzWaTVSqVDXX/ghSCiGsIEwBSY1kWW1xc3NSUxy8dyx7ZbJaVy2VsTp+XTaVSYblczvfF4jbX5XIZB1QADFpLcealBjHTMpkMKxQKrNMdDnSE39zc3CbhF2Rks1m8YAAYJr0E6ToFpu23GkXHvWmabHFxUaiQhddQVTUxpf8BiB2tVouVy+VNPSsowOklcSlrS0tLiRaIpmmyRqPBSqXSppPeoE3jVVVl8/PzOHgCQAYajUbX+LVeqjprmsZKpRKrVquJOExptVqsVquxhYWFntqBdit+a7sTkPoGgERYlsXq9Xrf5p1TIBaLRVapVGKl8RiGwY4dO8bm5uZYPp8PpdkTdfyp1WoVwg8A2anVaoGd/CI5y6qqMl3X2cLCAjMMQwphYFkWs091i8WicAl/CljwICldAEF3tmAKkisM//SnP1G1WqV2u01ERIqiULvdXv+Tp9vX/MjlcqRpGqXTabrrrrvo5ptvphtuuIHGxsZofHycJiYmiIhoamoq0DqzBeza2hpdvnyZrl27RpcuXaLz58/TO++8Q2+//Tb94x//IMMw+p4nt/uenZ2lQ4cO0QMPPBD4+gGEIJCIer3OXnrpJfrNb36zSRgOCk3TKJVK0cTEBN100020Y8cO2rZtG01OThIRrQtHnrW1NVpdXaWLFy/SlStX6Pz583Tu3DkyTZNOnz5NKysrA7lW51yUSiU6cOAAfeUrX6FUKoX9AUASsCyL2ZkQFJLPsF8zk/o4pHDr1tfPKJVKOO0FYJRM5dnZWeFMCOoxFjEMoenXrL7X61EUhamqymq1GgQfzGEwqpimyV544QU6efIk/fvf/w7FxyYDiqIQEW0y+XO5HOVyOdq3bx8dOnSIZmZmsP4BhCD4BMMw2HvvvUenT5+mv/3tb1Sv12Mp/JyCT9M0uueee2hmZobuuOMO0jQNax5ACAJ/DXF5eZneeustOnnyJB0/fjxW118oFEjTNPra175Gk5OT0PgAhCDoD8uy2JkzZ+i1116jkydP0p///OeBndYGRVVVOnz4MN1xxx10+PBhmp6eRkgLgBAEwzWhP/zwQ3rnnXfo3LlzRER07tw5siyLrl69uh7rt7q66huWoygKTU5O0vj4OH3605+mm266ibZu3Uqf+9znaGxsjHbs2EG33347TU5O0he/+EXau3cvBB6AEATymtNra2t07do1arfbdOHCBSL6JB7wypUrGz6/detWIvokfnBiYoLGx8dpbGyMJiYmaHJykqampiDsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADigGEYrFwuMyKK++gZ0zTZ4uIi03U9lvc+Pz/PlpaWmGVZPc2DoihJeP4bRjab7WkuWq0Wq1arbHZ2Npb3XSwWWa1WY6Zp9rUnjh07Fuvnn06nWblcZoZheM9DtVrd8B9jvhl6olqtsnQ6nYiNXygUWKPRCDwXuVwucUJQ07TA87C0tMSccxGHPdHtGmdnZ3taCzaLi4uJWQuLi4vdFQT+JhVFWZ/IGAvCwFQqla5zELfBX3cmk/F/+0EIeioEzv0QJ0HIX6+qqqxer7NREoJuz62z1/9Po9FgCTSBAlGr1RK38e1nms/nA5lDoy4EOxpTIoeqqqzVarFR1gTtYb8QFCKil19+mdrt9kj7Qu+//37bH5a4uXjllVfo+eefh8NbAMuy2IMPPpjY+1tZWaEnn3wSD5qIXnrpJbIsi5FpmkxV1SS+9UZaC3Rqg7quC2sAo6wJdlwHiV4LRBT40CyJmiARsVarxT51+fJlWllZIUVR/E4M10fS+Pvf/x77e/B7Nn/9619pdXVVymuzPyMDb731VuB7k+nZe811u91e/96pU6cGdi0yzEWQ9abwE+RHUk3mtbU14QmWdQ7crsv+ervdpvPnz0d6bX7zZy/MKOe41WqFMu9RPnuva7K/d+HChcQJQOdaE50zJcgPV1WVbrzxRqkF2n//+1+ytdtBTLCqqjQ+Pi7N/S4vLwtvxMuXLwt9buvWraQoCk1OToZ2naurq76b0xaSqqqGOkerq6t0ww03CH1W5EXBX6dMa0Fk3dvXLvri74V0Oh2bPRFICBIR/fjHP6aDBw/GQrsL8zrthZPL5ejRRx+lqakpKe5xbGyM/vnPf9IjjzwS6s89cuSIsMAU4TOf+Qz98Y9/pGeffdZ3jrPZLM3Pz9Ntt90W6j2Nj4/TK6+8EtrLMJ1OU7lcplQqJc2aP3XqFP3kJz8R0gQHpYVlMhl6+OGH6Utf+hJdu3Ytkj3RaDToyJEjgxGCX/3qV+ngwYNbaMSwF87OnTtJ13WampqSZg6azSYLWwjquh76/W2Ky3KZ4+3bt9OhQ4doZmZG6nW2e/du0nWdUqmUNNdpGAa79dZb6YMPPojsGm666Sa66667SNO0yOYlaCzkp+Lm/wDx5OrVq5gEMFSlZSBCEMhLEk/tARgGEIIj+vYDAEAIAgAAhCDMYQAgBLHRYA4DACEoQpixYwCaIABS7J0gH/79739PCwsLLIogyCtXrtA3vvGNgcSwQRMEAEJQiBMnTtCJEyciu9io03Fk1wQhCAEYsDkMoAkCACEIpNUEAQAQgtAEAQAQggAAACEIcxgAACEIcxgA4KNABPlwlJV0l5eXaevWrXhiHpogBCEAAxaCR48epf3790d2sdu3b8cTgyYIQHRCMJVK0Z49e5CxAU0QgMSAytKCAgYAAE1w5Dl//jydOXOGTNNkslzT66+/DnM4ApaXl+ndd9+Vbi0sLy/j4UAIho8tYE6fPk0PP/wwbdu2TZprM00TDygC3n77bXr88cdpx44dUq0FvAwhBAdiCts9cVdWVqher0trrmMDDHdNhNXCE0QL4gQFtUCZBUy73Ra6Ppyu+7Nz584NLxavNRFXAY61ACG4iWw2m/h7zOVypKoqHrYPmqaNhFZ9++2342FDCP6f++67L/EnwHfffTdNT0/jYfuwd+/eRNetbLfblMvlpG9uDyE4ZFKp1JYf/ehHvmZQXFFVlQ4fPkxTU1NY+AJroVQqra8FeySJn//853jQEIKbOX78+BZN0xJpBpVKJbr33nshAAV54IEHaH5+XtjXKjNOAV6pVOj+++/HWoAQ7M5zzz1HxWIxURrgwsICPfLII1j0AZiamtry6KOPkq0RxlkQ8te+sLBAtsUDuBdFkA9fv3490ZMxMzOzxbIs9s1vfpOeeeYZKcNhRIXft771LfrOd74jTWOq//znP0Kf++ijj6Qxiy3LYnfeeSc9//zz9OKLL8Z2XReLRfr+979Puq5veeyxx3r6GVeuXBH6nAzB2kHl1BYiokajwYiIJiYmun5obW2NiIh2795NqVRqJLQKy7LYu+++u37vcROC09PTUvkAm80mW1lZEfrs3r17pbp2rAWiVqvF3n//fRobG/P9bNRywjRNdurUKVd5xsu1/fv30/8APlgVysp/TwEAAAAASUVORK5CYII=";
const LOGO_FOTON_BLANCO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUEAAAEPCAYAAADcXHYtAAAHhUlEQVR42u3d3Y7bNhSF0ZHg939l5SYBBokntqwf8py91mWBthFFfj40ptPlC060bdt21T97WZbFCnP6vrIEzBY7cUQEET1RRAQRPUFEBBE9UUQEET5BRAQRP0FEBBE/MUQEET4xRASZP3xHQ9LlORBBmgfw7kiMiqMYiiDiN20I0p8fERQ/B97aIILi53BbL0RQAB3kAUEUQxFE/KynEIog8x9YB9X6IoIOJ9YbEUw5kA6jtUcETSOIISKYcugcOO8FEXTQmPIdeT8iiMPlXXlX01ktgUPFfWvuV5uZBDnpUIifDzBEUPzwPnEddmCofEV2PRZBARRAIRRCEUQAhVAIh70zSzDvBCh+3jkmQYeBqKnQRCiCAiiAQiiEIujQ4J0igoFToMMihKZBERRAhFAIRVAAEUIhFEEBRAiFUAQdBrx7IRTBtlMgQmgVRNA1GCH0ISuCAghCKII++bEnEMHen8w2O67FIuhqAkIogjY4CKEIugYDIiiAYBoUQQARNAWCaVAEQzcx2EMD19kS1JkCZ/zE7/J/Vzvr1+CPfO+iaRJs+wm+/Vb9g2HmZ/nkOVxNRdAUeFMAEyfpys9x9nO+u6cEWAQRwPjnFUIRNAVOePXv8hwjn8X3fSIovAJY7p2YBkXQFGgTl3BlzM98l6ZBEcQU6JqJCJoCBfDuAB59lhHToNuECLaOLvXeiXcrgtHXwk6HxDV4/Ds2DYqgqUwARQQRNAUKYMUACqsI4lDEv5Mz/vmmWREUJlPgsMndHhNBgg6Ca7BnEkFhumSqsDF9KNkDIuiwmQLjrsFCKII0umq5Bgu8CLoKt/zkF0DToAhis3snrf4c9p4IYgpsG2RXYhEscbhcg12DEUEEUAAH/rlEXwRBDBDBIwej63cvvgfMeIeIIAI4/bOImQiCa7A1EEHXFVNg4vRkChTB9p+OM21y12ABRASHbNIZNrsACiAiiCnfBzUimLhZfQ/oORDB2M3vGmwPpE3HIiiE7QLooCOCDosPDtd5RNA0KBzeOSIohAJY7lmuDqDAiiDBfLWBCJoGXYM9ByLokLgGCyAiWHYDn/HvEkABRAQJ4XtARNDkGT0Feg5EUAhdgwUQERTCtAPnGowI0jIcrvOIILsPk3B4DkQwNoS+BwQRdI30HkyBfOxhCWpNg39C0Glycg1GBLnkoLkGCyCuw66OAui9I4I41KZARFA4hMNzIIL9N7FrsL2DCCLmIILCYXryHCZYEcQ1WEQQQdczARRARBAfNNYPEfTpbn09ByIoNq7BAogICqEAZgZQzEWQyfgeCxF0YFt+2vse0N4UQZs99nlcgxFBHGKTi/0ggq7EDprnQAQJOsyuwYggsYdaAOe+nQi7CEYdZF8lgAhy4yTge0AfLCJI7CF3DUYEXYlNO6YVRBAfGHUDWHUKfHdtTbkiyAWHwveAiKBIxD6j7wFNgSJImaveqAPie0BE0DRoXTwHImga7BQD12BXYREkdroTQERQHNpOg6ZiU6AIIvj/OTS+B0QExSFiCnr2rK7BJu3uHpaAo7FwOAXfJGhTiYEomAJFkESuwZ5XBG2u2E9sAbTOIkjspnUwRV8EbTK8q2k+bOxNETQpeTbXYERwtgNmEwvgHQE0BYogphMQQdMgpkBEUAhjQyMGiKBrJKZARND04T0IICJoGgyKjh+HQQSLHUIhFEDPLYJCKIS4BougELr+CLB9IIKIkQCavEXQNCiEAiiAIiiExBBAERTChiG846Am/pp8ARRBIRTC2AAigq5JQhj9bq2lCH4lBsG00C8GAiiCDnBYCM88wALI5fvVEsx91a18II7GPPHZBdAkaCJ0PfaBhwgKYY8QHjnUVYMggCKIEB5+XgHk1j1qCWodmKqHpvNvSkl7lyZBhl8VO39PKICYBE2EkRNh9+lWAEUQB8q78q5EkGuvuQ6Y98N+vhOc6RPp4CHxM4UCiEnQgXPovAtE0AF0AK09IugwOpDWGxF0MB1Oa4wIOqgOqjVFBB1ch9f6IYIOcuyBtl6IoBjGHfCrf25SAEWQkMNe6cBbC0RQEG/7r0ZGxyDpWRFBJg7E2QGZ7T//E0ARRAwzD4f4iSBCKHyIIKIofIggYih+iCCCKHyIIIIofIggoih6iCDiOD6OgocIEhFHsQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmM/y91/Ytm1r8WDLsnz693ZZg0/XodPzWwtn4tU6rAmbPzkA3qm1sxf+XYfva7FaoP6bxLu1ZvbCz1YLk7E5vGNrZS88X4fVUoBAJL/v1UvP2fjeNfbCD9dhABEEEEEAEQSI8dj7Nxz5qfMuZlqDK77gvuL59v45q+yz7nuh4rrsXQeTIOA6DCCCACIIIIIAIgggggDN7f45wdE/i+TnFAGTIIAIAogggAgCiCCACAKIIIAIAoggwAt+szRgEgQwCfI2/+Nq7AWTIIAIAogggAgCiCBQhB91E8HIDWHjWyNEMHbzO9zYCyJo02O9EMG0ze9AW7fvz2Q/PImgRem7Ubxbe8FeeO0Xy+BC6uLhB2IAAAAASUVORK5CYII=";

function LogoFoton({ size = 'md', color = 'auto' }) {
  const sizes = {
    sm:   { logo: 40,  mal: 8,  gap: 3,  spacing: '0.28em' },
    md:   { logo: 56,  mal: 11, gap: 4,  spacing: '0.30em' },
    lg:   { logo: 80,  mal: 16, gap: 6,  spacing: '0.32em' },
    xl:   { logo: 110, mal: 22, gap: 8,  spacing: '0.34em' },
    hero: { logo: 160, mal: 30, gap: 12, spacing: '0.38em' }, // para pantalla de login
  };
  const s = sizes[size] || sizes.md;
  // 'dark' = logo negro (fondos claros) · 'light' = logo blanco (fondos oscuros)
  const isLight = color === 'light';
  const src = isLight ? LOGO_FOTON_BLANCO : LOGO_FOTON_NEGRO;
  const textColor = isLight ? '#fafaf9' : '#0a0a0a';
  return (
    <div className="inline-flex flex-col items-center" style={{ gap: s.gap }}>
      <img
        src={src}
        alt="Foton"
        style={{ height: s.logo, width: 'auto', display: 'block' }}
      />
      <span style={{
        // Tipografía cercana a la del logo Foton (geométrica, tecnológica)
        fontFamily: "'Rajdhani', 'Eurostile', 'Saira Condensed', 'Inter', system-ui, sans-serif",
        fontSize: s.mal,
        fontWeight: 500,
        letterSpacing: s.spacing,
        color: textColor,
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>MALASPINA</span>
    </div>
  );
}

function BotonGuardar({ onClick, guardado, onVerCot }) {
  if (guardado) {
    return (
      <div className="bg-green-950/40 border border-green-700 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-green-300">
          <Check size={18} />
          <span className="font-semibold">Cotización guardada: {guardado.numero}</span>
        </div>
        <button onClick={() => onVerCot && onVerCot(guardado)} className="px-3 py-2 bg-green-500 hover:bg-green-400 text-stone-950 rounded text-sm font-bold flex items-center gap-2">
          <Eye size={14} /> Ver / Imprimir
        </button>
      </div>
    );
  }
  return (
    <button onClick={onClick} className="w-full px-4 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition">
      <Save size={18} /> Guardar cotización
    </button>
  );
}

function DestacadaCard({ icon, label, banco, valor, detalle }) {
  return (
    <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-400/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-bold mb-2">{icon} {label}</div>
      <div className="text-stone-100 font-bold text-base">{banco}</div>
      <div className="text-2xl font-black text-amber-400 mt-1">{valor}</div>
      <div className="text-xs text-stone-500 mt-1">{detalle}</div>
    </div>
  );
}

// ============================================================
// HEADER DE COTIZACIÓN (número, fecha, vendedor) — compartido
// ============================================================

// ============================================================
// ACORDEÓN — pasos colapsables del simulador
// ============================================================
function Acordeon({ paso, titulo, resumen, abierto, onToggle, completado, children }) {
  return (
    <section
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${abierto ? 'var(--accent-soft-border)' : 'var(--border)'}`,
        boxShadow: abierto ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3 sm:gap-4 text-left transition hover:opacity-90"
        style={{ background: abierto ? 'var(--bg-surface-2)' : 'transparent' }}
      >
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: completado ? 'var(--accent)' : 'var(--bg-surface-3)',
            color: completado ? 'var(--accent-text)' : 'var(--text-muted)',
            border: `1px solid ${completado ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {completado ? '✓' : paso}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>
            Paso {paso}
          </div>
          <div className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {titulo}
          </div>
          {resumen && !abierto && (
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
              {resumen}
            </div>
          )}
        </div>
        <div className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {abierto ? '▲' : '▼'}
        </div>
      </button>
      {abierto && (
        <div className="px-4 sm:px-5 py-5 border-t" style={{ borderColor: 'var(--border)' }}>
          {children}
        </div>
      )}
    </section>
  );
}

function HeaderCotizacion({ proxNumero, vendedores, vendedorId, setVendedorId, validez, setValidez, modo = 'convencional' }) {
  const año = new Date().getFullYear();
  const prefijo = modo === 'ventaDirecta' ? 'FT-VD' : 'FT';
  const numeroProyectado = `${prefijo}-${año}-${String(proxNumero).padStart(4, '0')}`;
  const vendedoresActivos = vendedores.filter(v => v.activo);
  const esVD = modo === 'ventaDirecta';

  return (
    <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
      {esVD && (
        <div className="mb-4 pb-4 border-b border-stone-800 flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', border: '1px solid rgba(220, 38, 38, 0.4)' }}>
            🏭 Venta Directa
          </div>
          <span className="text-xs text-stone-400">Cotización con lista de Venta Directa</span>
        </div>
      )}
      {!esVD && (
        <div className="mb-4 pb-4 border-b border-stone-800 flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: 'var(--accent-soft)', color: 'var(--text-primary)', border: '1px solid var(--accent-soft-border)' }}>
            📋 Convencional
          </div>
          <span className="text-xs text-stone-400">Cotización con lista Pública o Financiada</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1"><Hash size={12} /> Próxima cotización</div>
          <div className="text-amber-400 font-black text-lg">{numeroProyectado}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1"><Calendar size={12} /> Fecha</div>
          <div className="text-stone-200 font-bold">{formatFecha(new Date())}</div>
        </div>
        <Campo label="Válida hasta">
          <div className="text-stone-200 font-bold py-2">{formatFecha(validezFija())}</div>
          <span className="block text-xs text-stone-500 mt-0.5">7 días desde hoy (fija)</span>
        </Campo>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-800">
        <Campo label="Vendedor">
          {vendedoresActivos.length === 0 ? (
            <div className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded p-2">No hay vendedores activos. Andá a "Vendedores" y agregá uno.</div>
          ) : (
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              <option value="">— Elegir vendedor —</option>
              {vendedoresActivos.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          )}
        </Campo>
      </div>
    </section>
  );
}

// ============================================================
// SIMULADOR FOTON
// ============================================================

// ============================================================
// SIMULADOR WRAPPER — Selector visual Conv/VD + simulador
// ============================================================
function SimuladorWrapper({ modelosFoton, tasasFoton, tasasFotonVD, configFoton, vendedores, guardarCotizacion, setVerCotizacion, contadores }) {
  const [modo, setModo] = useState(null); // null = pantalla selección, 'convencional' o 'ventaDirecta'

  // Pantalla de selección inicial
  if (!modo) {
    return (
      <div className="max-w-3xl mx-auto pt-8 pb-12">
        <div className="text-center mb-10">
          <h1 className="heading-display text-3xl sm:text-4xl mb-2" style={{ color: 'var(--text-primary)' }}>Nueva cotización</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Elegí el tipo de operación para arrancar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setModo('convencional')}
            className="rounded-xl p-6 sm:p-8 text-left transition hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: 'var(--bg-surface)',
              border: '2px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <div className="text-4xl mb-4">📋</div>
            <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Convencional</h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Operaciones con financiación tradicional. Bancos: Santander, ICBC, BNA, Comafi, Santander UVA, Supervielle, GST.
            </p>
            <div className="mt-4 inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
              Comenzar →
            </div>
          </button>

          <button
            onClick={() => setModo('ventaDirecta')}
            className="rounded-xl p-6 sm:p-8 text-left transition hover:scale-[1.02] active:scale-[0.99]"
            style={{
              background: 'var(--bg-surface)',
              border: '2px solid rgba(220, 38, 38, 0.4)',
              cursor: 'pointer',
            }}
          >
            <div className="text-4xl mb-4">🏭</div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#dc2626' }}>Venta Directa</h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Facturación directa por Grupo Corven. Tasas subsidiadas con quebranto. Bancos: Santander, Galicia, ICBC, Comafi.
            </p>
            <div className="mt-4 inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
              Comenzar →
            </div>
          </button>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          💡 Podés cambiar entre modos en cualquier momento desde el simulador.
        </p>
      </div>
    );
  }

  // Simulador activo con botón "Cambiar modo"
  return (
    <div>
      {/* Selector compacto arriba */}
      <div className="rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Modo:</div>
        <button
          onClick={() => setModo('convencional')}
          className="px-3 py-1.5 rounded text-sm font-semibold transition"
          style={modo === 'convencional'
            ? { background: 'var(--accent)', color: 'var(--accent-text)' }
            : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          📋 Convencional
        </button>
        <button
          onClick={() => setModo('ventaDirecta')}
          className="px-3 py-1.5 rounded text-sm font-semibold transition"
          style={modo === 'ventaDirecta'
            ? { background: '#dc2626', color: 'white' }
            : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          🏭 Venta Directa
        </button>
        <button
          onClick={() => setModo(null)}
          className="ml-auto px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          ← Volver al inicio
        </button>
      </div>

      {/* Simulador. Key fuerza el remount cuando cambia el modo */}
      <SimuladorFoton
        key={modo}
        modo={modo}
        modelos={modelosFoton}
        tasas={modo === 'ventaDirecta' ? tasasFotonVD : tasasFoton}
        config={configFoton}
        vendedores={vendedores}
        onGuardar={guardarCotizacion}
        onVerCot={setVerCotizacion}
        proxNumero={(contadores.foton || 0) + 1}
      />
    </div>
  );
}

// ============================================================
// FORMULARIOS WRAPPER — Pantalla inicial con cards (estilo simulador)
// Estructura padre-hijo:
//   - Proforma → Malaspina / Corven
//   - Pedido de Facturación → PF / PJ
//   - Alta de Cliente (AC) suelto
// ============================================================
function FormulariosWrapper({ formularios, guardarFormulario, eliminarFormulario, setVerFormulario, vendedores, contadores, modelosFoton, configFoton, proformas, guardarProforma, eliminarProforma }) {
  // opcion: null = pantalla principal · 'proforma' / 'pedidoFacturacion' = sub-pantallas · resto = formularios concretos
  const [opcion, setOpcion] = useState(null);
  const [tipoProforma, setTipoProforma] = useState(null); // 'malaspina' o 'corven'
  const [tipoPF, setTipoPF] = useState(null); // 'pf' o 'pj'

  const countMalaspina = proformas.filter(p => p.facturador === 'malaspina').length;
  const countCorven = proformas.filter(p => p.facturador === 'corven').length;
  const countPF = formularios.filter(f => f.tipo === 'pf').length;
  const countPJ = formularios.filter(f => f.tipo === 'pj').length;
  const countAC = formularios.filter(f => f.tipo === 'ac').length;
  const countProformasTotal = countMalaspina + countCorven;
  const countPedidoFact = countPF + countPJ;

  // ============ PANTALLA INICIAL ============
  if (!opcion) {
    const opciones = [
      { key: 'proforma',           emoji: '📄', titulo: 'Proforma',                sub: 'Malaspina o Corven · Para enviar al banco',     color: '#dc2626',     count: countProformasTotal },
      { key: 'pedidoFacturacion',  emoji: '📝', titulo: 'Pedido de Facturación',   sub: 'Persona Física (PF) o Persona Jurídica (PJ)',   color: 'var(--accent)', count: countPedidoFact },
      { key: 'ac',                 emoji: '📋', titulo: 'Alta de Cliente (AC)',    sub: 'Registro de cliente en Corven Motors',          color: 'var(--accent)', count: countAC },
    ];

    return (
      <div className="max-w-4xl mx-auto pt-6 pb-12">
        <div className="text-center mb-8">
          <h1 className="heading-display text-3xl sm:text-4xl mb-2" style={{ color: 'var(--text-primary)' }}>Formularios</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Elegí qué tipo de documento querés generar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {opciones.map(op => (
            <button
              key={op.key}
              onClick={() => setOpcion(op.key)}
              className="rounded-xl p-5 sm:p-6 text-left transition hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'var(--bg-surface)',
                border: `2px solid ${op.color === '#dc2626' ? 'rgba(220, 38, 38, 0.3)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{op.emoji}</div>
                {op.count > 0 && (
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
                    {op.count} guardado{op.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <h2 className="font-bold text-base mb-1.5" style={{ color: op.color === '#dc2626' ? '#dc2626' : 'var(--text-primary)' }}>{op.titulo}</h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>{op.sub}</p>
              <div className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{
                background: op.color === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'var(--accent-soft)',
                color: op.color === '#dc2626' ? '#dc2626' : 'var(--text-secondary)',
              }}>
                Comenzar →
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          💡 Cada tipo se guarda en su propio historial. Podés volver a esta pantalla en cualquier momento.
        </p>
      </div>
    );
  }

  // ============ SUB-PANTALLA: PROFORMA (Malaspina vs Corven) ============
  if (opcion === 'proforma' && !tipoProforma) {
    const subops = [
      { key: 'malaspina', emoji: '🚛', titulo: 'Malaspina', sub: 'Carlos Malaspina Tractores SA · Pehuajó',     count: countMalaspina },
      { key: 'corven',    emoji: '🏭', titulo: 'Corven',    sub: 'Corven Motors Argentina SA · Venado Tuerto',  count: countCorven },
    ];

    return (
      <div className="max-w-3xl mx-auto pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setOpcion(null)}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ← Volver
          </button>
          <div>
            <h1 className="heading-display text-2xl sm:text-3xl" style={{ color: 'var(--text-primary)' }}>Proforma</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Elegí quién factura la operación</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subops.map(op => (
            <button
              key={op.key}
              onClick={() => setTipoProforma(op.key)}
              className="rounded-xl p-6 text-left transition hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'var(--bg-surface)',
                border: '2px solid rgba(220, 38, 38, 0.3)',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{op.emoji}</div>
                {op.count > 0 && (
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
                    {op.count} guardado{op.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <h2 className="font-bold text-base mb-1.5" style={{ color: '#dc2626' }}>{op.titulo}</h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>{op.sub}</p>
              <div className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                Comenzar →
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============ SUB-PANTALLA: PEDIDO DE FACTURACIÓN (PF vs PJ) ============
  if (opcion === 'pedidoFacturacion' && !tipoPF) {
    const subops = [
      { key: 'pf', emoji: '👤', titulo: 'Persona Física',    sub: 'Solicitante + cónyuge + datos laborales + bienes', count: countPF },
      { key: 'pj', emoji: '🏢', titulo: 'Persona Jurídica',  sub: 'Empresa + hasta 3 socios',                          count: countPJ },
    ];

    return (
      <div className="max-w-3xl mx-auto pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setOpcion(null)}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            ← Volver
          </button>
          <div>
            <h1 className="heading-display text-2xl sm:text-3xl" style={{ color: 'var(--text-primary)' }}>Pedido de Facturación</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Elegí el tipo de pedido</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subops.map(op => (
            <button
              key={op.key}
              onClick={() => setTipoPF(op.key)}
              className="rounded-xl p-6 text-left transition hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: 'var(--bg-surface)',
                border: '2px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{op.emoji}</div>
                {op.count > 0 && (
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
                    {op.count} guardado{op.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <h2 className="font-bold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>{op.titulo}</h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>{op.sub}</p>
              <div className="inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>
                Comenzar →
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============ FORMULARIO ACTIVO ============
  // tipoActual sale del padre correspondiente
  const tipoActual = opcion === 'pedidoFacturacion' ? tipoPF
                   : opcion === 'proforma' ? tipoProforma
                   : opcion;

  // Volver a la pantalla correcta
  const volverInicio = () => {
    setOpcion(null);
    setTipoPF(null);
    setTipoProforma(null);
  };
  const volverProforma = () => { setTipoProforma(null); };
  const volverPedidoFacturacion = () => { setTipoPF(null); };

  // Cambio rápido desde la barra
  const cambiarA = (key) => {
    if (key === 'pf' || key === 'pj') {
      setOpcion('pedidoFacturacion');
      setTipoPF(key);
      setTipoProforma(null);
    } else if (key === 'malaspina' || key === 'corven') {
      setOpcion('proforma');
      setTipoProforma(key);
      setTipoPF(null);
    } else {
      setOpcion(key);
      setTipoPF(null);
      setTipoProforma(null);
    }
  };

  const enProforma = tipoActual === 'malaspina' || tipoActual === 'corven';
  const enPedidoFact = tipoActual === 'pf' || tipoActual === 'pj';

  const barra = (
    <div className="rounded-lg p-2.5 mb-4 flex items-center gap-2 flex-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs uppercase tracking-widest font-bold mr-1" style={{ color: 'var(--text-muted)' }}>Tipo:</div>
      <BarraBtn activo={tipoActual === 'malaspina'} onClick={() => cambiarA('malaspina')}>🚛 Malaspina</BarraBtn>
      <BarraBtn activo={tipoActual === 'corven'} onClick={() => cambiarA('corven')}>🏭 Corven</BarraBtn>
      <BarraBtn activo={tipoActual === 'pf'} onClick={() => cambiarA('pf')}>👤 PF</BarraBtn>
      <BarraBtn activo={tipoActual === 'pj'} onClick={() => cambiarA('pj')}>🏢 PJ</BarraBtn>
      <BarraBtn activo={tipoActual === 'ac'} onClick={() => cambiarA('ac')}>📋 AC</BarraBtn>
      {enProforma && (
        <button
          onClick={volverProforma}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          ↩ Proforma
        </button>
      )}
      {enPedidoFact && (
        <button
          onClick={volverPedidoFacturacion}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          ↩ Pedido Fact.
        </button>
      )}
      <button
        onClick={volverInicio}
        className="ml-auto px-3 py-1.5 rounded text-xs font-semibold"
        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      >
        ← Volver al inicio
      </button>
    </div>
  );

  return (
    <div>
      {barra}
      {(tipoActual === 'malaspina' || tipoActual === 'corven') && (
        <ModuloProformaIndividual
          key={tipoActual}
          facturador={tipoActual}
          modelos={modelosFoton}
          vendedores={vendedores}
          proformas={proformas}
          onGuardar={guardarProforma}
          onEliminar={eliminarProforma}
          contadores={contadores}
          configFoton={configFoton}
        />
      )}
      {(tipoActual === 'pf' || tipoActual === 'pj' || tipoActual === 'ac') && (
        <ModuloFormularios
          key={tipoActual}
          formularios={formularios.filter(f => f.tipo === tipoActual)}
          onGuardar={guardarFormulario}
          onEliminar={eliminarFormulario}
          onVer={setVerFormulario}
          vendedores={vendedores}
          contadores={contadores}
          modelosFoton={modelosFoton}
          configFoton={configFoton}
          vistaInicial={tipoActual}
          onSalir={volverInicio}
        />
      )}
    </div>
  );
}

function BarraBtn({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded text-sm font-semibold transition whitespace-nowrap"
      style={activo
        ? { background: 'var(--accent)', color: 'var(--accent-text)' }
        : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
    >
      {children}
    </button>
  );
}

// Componente individual de una proforma (sin el selector interno)
function ModuloProformaIndividual({ facturador, modelos, vendedores, proformas, onGuardar, onEliminar, contadores, configFoton }) {
  const [verProforma, setVerProforma] = useState(null);
  return (
    <>
      {facturador === 'malaspina' && (
        <ProformaMalaspina
          modelos={modelos}
          vendedores={vendedores}
          proformas={proformas.filter(p => p.facturador === 'malaspina')}
          onGuardar={onGuardar}
          onEliminar={onEliminar}
          contadores={contadores}
          onVer={setVerProforma}
          configFoton={configFoton}
        />
      )}
      {facturador === 'corven' && (
        <ProformaCorven
          modelos={modelos}
          vendedores={vendedores}
          proformas={proformas.filter(p => p.facturador === 'corven')}
          onGuardar={onGuardar}
          onEliminar={onEliminar}
          contadores={contadores}
          onVer={setVerProforma}
          configFoton={configFoton}
        />
      )}
      {verProforma && verProforma.facturador === 'corven' && <ModalProformaCorven proforma={verProforma} onClose={() => setVerProforma(null)} />}
      {verProforma && verProforma.facturador === 'malaspina' && <ModalProformaMalaspina proforma={verProforma} onClose={() => setVerProforma(null)} />}
    </>
  );
}

function SimuladorFoton({ modelos, tasas, config, vendedores, onGuardar, onVerCot, proxNumero, modo = 'convencional' }) {
  const esVentaDirecta = modo === 'ventaDirecta';
  const [cliente, setCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  // Datos cliente uso interno (NO salen en PDF)
  const [emailCliente, setEmailCliente] = useState('');
  const [cuitCliente, setCuitCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [localidadCliente, setLocalidadCliente] = useState('');
  const [verDatosInternos, setVerDatosInternos] = useState(false);

  // Auman D, D 2027, C y R solo se venden por VD
  const GRUPOS_SOLO_VD_INIT = ['auman-d-1621', 'aumand-2027', 'auman-c-5046', 'auman-r'];
  const modeloInicial = (modo === 'ventaDirecta' ? modelos : modelos.filter(m => !GRUPOS_SOLO_VD_INIT.includes(m.grupoTasa)))[0];
  const [modeloId, setModeloId] = useState(modeloInicial?.id || '');
  const [versionId, setVersionId] = useState(modelos[0]?.versiones?.[0]?.id || '');
  const [tipoLista, setTipoLista] = useState('publica'); // 'publica' o 'financiada'
  const [plan, setPlan] = useState('pesos');
  const [precioOverride, setPrecioOverride] = useState('');
  const [anticipoExtra, setAnticipoExtra] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [validez, setValidez] = useState(validezFija().toISOString().slice(0, 10));
  const [guardado, setGuardado] = useState(null);

  // Permuta
  const [permutaActiva, setPermutaActiva] = useState(false);
  const [permutaMarcaModelo, setPermutaMarcaModelo] = useState('');
  const [permutaAnio, setPermutaAnio] = useState('');
  const [permutaKm, setPermutaKm] = useState('');
  const [permutaCotizacion, setPermutaCotizacion] = useState('');
  const [permutaInfoAuto, setPermutaInfoAuto] = useState('');

  // NUEVO: Bonificación / descuento opcional (no es Contado, es independiente)
  const [bonificacionActiva, setBonificacionActiva] = useState(false);
  const [bonificacionTipo, setBonificacionTipo] = useState('monto'); // 'monto' o 'porcentaje'
  const [bonificacionMonto, setBonificacionMonto] = useState('');
  const [bonificacionPct, setBonificacionPct] = useState('');
  const [bonificacionMotivo, setBonificacionMotivo] = useState('');

  // NUEVO: Acordeón - qué paso está abierto. Default: paso 1 abierto.
  const [pasoAbierto, setPasoAbierto] = useState(1);
  const toggle = (n) => setPasoAbierto(pasoAbierto === n ? 0 : n);

  // NUEVO: Formas de pago combinables (el cliente puede elegir varias a la vez)
  // Cada una tiene su propio monto. La suma debe igualar el saldo a financiar.
  const [pagos, setPagos] = useState({
    contado:       { activo: false, monto: '' },
    contraEntrega: { activo: false, monto: '' },
    transferencia: { activo: false, monto: '' },
    cheques:       { activo: false, monto: '', cantidad: '6', tasaMensual: 4 },
    credito:       { activo: false, monto: '', quebrantoActivo: false, quebrantoPct: '5', gastosOtorgActivo: false, gastosOtorgPct: '1' },
    leasing:       { activo: false, monto: '' },
  });
  const setPago = (key, campo, valor) => setPagos(prev => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  const togglePago = (key) => setPagos(prev => ({ ...prev, [key]: { ...prev[key], activo: !prev[key].activo } }));

  // Tasa de cheques editable
  const [tasaCheques, setTasaCheques] = useState(TASA_CHEQUES_DEFAULT);

  // CONTADO EFECTIVO
  const [contadoModo, setContadoModo] = useState('porcentaje'); // 'porcentaje' o 'monto'
  const [contadoPct, setContadoPct] = useState(DESCUENTO_CONTADO_DEFAULT); // %
  const [contadoMontoFinal, setContadoMontoFinal] = useState(''); // si modo es 'monto'
  const [overrideAutorizado, setOverrideAutorizado] = useState('');

  // GASTO DE PATENTAMIENTO (% sobre el precio de la unidad, default 6% configurable)
  const [patentamientoPct, setPatentamientoPct] = useState(config.gastoPatentamientoPct ?? 6);
  // Flete + Formulario + Alistamiento (solo VD - facturado por Foton Malaspina)
  const [fleteFormAlist, setFleteFormAlist] = useState('');

  // Opciones seleccionadas (keys "banco-plan-plazo")
  const [opcionesSel, setOpcionesSel] = useState(new Set());

  // Si cambia el modelo, resetear versión a la primera (hook va ANTES de cualquier return)
  useEffect(() => {
    const m = modelos.find(x => x.id === modeloId);
    if (m && !m.versiones.find(v => v.id === versionId)) {
      setVersionId(m.versiones[0]?.id || '');
    }
  }, [modeloId, modelos, versionId]);

  // Protección: si en Convencional hay un modelo Solo-VD seleccionado, cambiar al primero válido
  useEffect(() => {
    if (esVentaDirecta) return;
    const m = modelos.find(x => x.id === modeloId);
    if (m && GRUPOS_SOLO_VD.includes(m.grupoTasa)) {
      const primerValido = modelos.find(x => !GRUPOS_SOLO_VD.includes(x.grupoTasa));
      if (primerValido) setModeloId(primerValido.id);
    }
  }, [modo, modeloId]);

  // En VD: setear default Flete+Formulario+Alistamiento según la línea del modelo
  useEffect(() => {
    if (!esVentaDirecta) return;
    const m = modelos.find(x => x.id === modeloId);
    if (!m) return;
    const grupo = m.grupoTasa;
    const defaultMonto = FLETE_FORM_ALIST_VD[grupo] ?? 1500000;
    setFleteFormAlist(String(defaultMonto));
  }, [modeloId, esVentaDirecta]);

  const modelo = modelos.find(m => m.id === modeloId);
  if (!modelo) return <div className="text-stone-400">Sin modelos.</div>;

  const version = modelo.versiones.find(v => v.id === versionId) || modelo.versiones[0];
  if (!version) return <div className="text-stone-400">Modelo sin versiones cargadas.</div>;

  // Tasas según grupo del modelo
  const tasasGrupo = tasas[modelo.grupoTasa] || {};
  const planData = tasasGrupo[plan];
  // Cheques siempre disponible; los demás dependen del grupo
  const planDisponible = (plan === 'cheques' || plan === 'contado') ? true : (planData !== null && planData !== undefined);

  // Precio según modo: Convencional → Pública | Venta Directa → Directa al 9%
  const precioCatalogo = esVentaDirecta
    ? (version.precioVentaDirecta || 0)
    : (version.precioPublico || 0);
  const monedaCatalogo = esVentaDirecta
    ? (version.monedaVentaDirecta || 'ARS')
    : (version.monedaPublica || 'ARS');
  const precioOver = parseNum(precioOverride);

  // Convertir todo a ARS para el cálculo (si está en USD, multiplicar por cotización)
  const precioCatalogoARS = monedaCatalogo === 'USD' ? precioCatalogo * (config.cotizacionDolar || 1) : precioCatalogo;
  const precioReferencia = precioOver > 0 ? precioOver : precioCatalogoARS;

  // GASTO DE PATENTAMIENTO (% sobre el precio de la unidad, editable)
  const gastoPatentamiento = precioReferencia * ((parseFloat(patentamientoPct) || 0) / 100);

  // BONIFICACIÓN (descuento opcional sobre el precio)
  const bonificacionN = (() => {
    if (!bonificacionActiva) return 0;
    if (bonificacionTipo === 'porcentaje') {
      return precioReferencia * ((parseFloat(bonificacionPct) || 0) / 100);
    }
    return parseNum(bonificacionMonto);
  })();

  // Permuta
  const permutaN = permutaActiva ? parseNum(permutaCotizacion) : 0;

  // SALDO A CUBRIR = Precio − Bonificación − Permuta
  // (el plan de pago del cliente debe sumar este saldo)
  const saldoAPagar = Math.max(0, precioReferencia - bonificacionN - permutaN);

  // Distribución de pagos (suma de todos los métodos activos)
  const sumaPagos = Object.values(pagos).reduce((s, p) => s + (p.activo ? parseNum(p.monto) : 0), 0);
  const diferenciaPagos = saldoAPagar - sumaPagos;
  const pagosBalanceados = saldoAPagar > 0 && Math.abs(diferenciaPagos) < 1; // tolerancia 1 peso
  const algunPagoActivo = Object.values(pagos).some(p => p.activo);

  let montoFinanciable = 0;
  if (plan === 'cheques') {
    montoFinanciable = saldoAPagar; // En cheques no hay tope, financia hasta 100%
  } else if (planDisponible) {
    if (planData.montoFinanciableFijo) montoFinanciable = planData.montoFinanciableFijo;
    else if (planData.pctFinanciable) montoFinanciable = saldoAPagar * (planData.pctFinanciable / 100);
  }
  const anticipoMinimo = Math.max(0, saldoAPagar - montoFinanciable);
  const anticipoTotal = anticipoMinimo + parseNum(anticipoExtra);

  // NUEVO: Si el vendedor activó "Crédito Prendario" o "Leasing" en formas de pago,
  // el capital a financiar viene del monto que digitó + extras opcionales (quebranto, otorg)
  const creditoActivo = pagos.credito.activo;
  const creditoMontoVendedor = creditoActivo ? parseNum(pagos.credito.monto) : 0;
  const creditoQuebrantoPct = (creditoActivo && pagos.credito.quebrantoActivo) ? (parseFloat(pagos.credito.quebrantoPct) || 0) : 0;
  const creditoQuebrantoMonto = creditoMontoVendedor * (creditoQuebrantoPct / 100);
  const creditoOtorgPctV = (creditoActivo && pagos.credito.gastosOtorgActivo) ? (parseFloat(pagos.credito.gastosOtorgPct) || 0) : 0;
  const creditoOtorgMonto = creditoMontoVendedor * (creditoOtorgPctV / 100);

  const leasingActivo = pagos.leasing.activo;
  const leasingMontoVendedor = leasingActivo ? parseNum(pagos.leasing.monto) : 0;

  // Capital base y total a financiar
  let capitalBase, capitalFinanciar, gastosOtorgPct, gastosOtorgMonto, gastoOtorgQuebranto, quebrantoTotalPct;

  if (creditoActivo && creditoMontoVendedor > 0) {
    // Crédito: usar el monto + extras opcionales que el vendedor indicó
    capitalBase = creditoMontoVendedor;
    gastosOtorgPct = creditoOtorgPctV;
    gastosOtorgMonto = creditoOtorgMonto;
    quebrantoTotalPct = creditoQuebrantoPct;
    gastoOtorgQuebranto = creditoQuebrantoMonto;
    if (esVentaDirecta) {
      // VD: el quebranto NO se suma al capital, se cobra aparte como gasto Malaspina
      // (factura por separado en concepto de Gastos de Otorgamiento - circular Corven 08/05/2026)
      capitalFinanciar = creditoMontoVendedor + creditoOtorgMonto;
    } else {
      // Convencional: el quebranto se suma al capital financiado
      capitalFinanciar = creditoMontoVendedor + creditoQuebrantoMonto + creditoOtorgMonto;
    }
  } else if (leasingActivo && leasingMontoVendedor > 0) {
    // Leasing: el monto que digita el vendedor ES el capital a financiar (sin extras)
    capitalBase = leasingMontoVendedor;
    gastosOtorgPct = 0;
    gastosOtorgMonto = 0;
    quebrantoTotalPct = 0;
    gastoOtorgQuebranto = 0;
    capitalFinanciar = leasingMontoVendedor;
  } else {
    // Modo viejo (compat): saldo - anticipo, sin extras
    capitalBase = Math.max(0, saldoAPagar - anticipoTotal);
    gastosOtorgPct = 0;
    gastosOtorgMonto = 0;
    capitalFinanciar = capitalBase;
    const aplicaQuebranto = esVentaDirecta && plan !== 'cheques' && plan !== 'contado';
    quebrantoTotalPct = aplicaQuebranto ? (config.quebrantoTerminal + config.quebrantoDealer) : 0;
    gastoOtorgQuebranto = capitalFinanciar * (quebrantoTotalPct / 100);
  }

  // CONTADO EFECTIVO: calcular descuento y precio final
  const contadoDescuentoPct = (() => {
    if (plan !== 'contado') return 0;
    if (contadoModo === 'monto') {
      const monto = parseNum(contadoMontoFinal);
      if (monto > 0 && saldoAPagar > 0) {
        return ((saldoAPagar - monto) / saldoAPagar) * 100;
      }
      return 0;
    }
    return parseFloat(contadoPct) || 0;
  })();
  const contadoPrecioFinal = contadoModo === 'monto' && parseNum(contadoMontoFinal) > 0
    ? parseNum(contadoMontoFinal)
    : Math.max(0, saldoAPagar - (saldoAPagar * contadoDescuentoPct / 100));
  const contadoMonto = saldoAPagar - contadoPrecioFinal;
  const contadoRequiereOverride = contadoDescuentoPct > DESCUENTO_CONTADO_DEFAULT;
  const contadoAutorizado = !contadoRequiereOverride || (overrideAutorizado && overrideAutorizado.trim().length > 0);

  const resultados = [];
  if (plan === 'contado' && saldoAPagar > 0 && contadoAutorizado) {
    resultados.push({
      key: 'contado-unico',
      bancoKey: 'contado',
      bancoNombre: 'Contado Efectivo',
      plazo: 1,
      tasa: 0,
      cuota: contadoPrecioFinal,
      totalFin: contadoPrecioFinal,
      costoTotal: contadoPrecioFinal,
      moneda: 'ARS',
      nota: `${contadoDescuentoPct.toFixed(1)}% de descuento`,
      descuentoPct: contadoDescuentoPct,
      descuentoMonto: contadoMonto,
    });
  }
  if (plan === 'cheques' && capitalFinanciar > 0) {
    // Plan cheques en Foton: tasa editable, plazos fijos
    PLAZOS_CHEQUES.forEach(p => {
      const cuota = cuotaCheques(capitalFinanciar, tasaCheques, p);
      resultados.push({
        key: `cheques-${p}`,
        bancoKey: 'cheques',
        bancoNombre: 'Cheques',
        plazo: p,
        tasa: tasaCheques,
        cuota,
        totalFin: cuota * p,
        costoTotal: cuota * p + anticipoTotal,
        moneda: 'ARS',
        nota: `${tasaCheques}% mensual directo`,
      });
    });
  } else if (planDisponible && capitalFinanciar > 0) {
    if (plan === 'pesos') {
      Object.entries(planData.bancos || {}).forEach(([bk, plazos]) => {
        Object.entries(plazos).forEach(([plazo, tasa]) => {
          if (tasa === null || tasa === undefined) return;
          const p = parseInt(plazo);
          let cuota = config.modoTasa === 'fija' ? cuotaTasaFija(capitalFinanciar, tasa, p) : cuotaFrances(capitalFinanciar, tasa, p);
          if (config.ivaSobreIntereses && capitalFinanciar > 0) {
            const interes = cuota - (capitalFinanciar / p);
            cuota = cuota + Math.max(0, interes) * 0.21;
          }
          resultados.push({ key: `${bk}-pesos-${p}`, bancoKey: bk, bancoNombre: BANCOS_INFO_FOTON[bk]?.nombre || bk, plazo: p, tasa, cuota, totalFin: cuota * p, costoTotal: cuota * p + anticipoTotal + gastoOtorgQuebranto, moneda: 'ARS' });
        });
      });
    } else if (plan === 'uva') {
      Object.entries(planData).forEach(([k, v]) => {
        if (['pctFinanciable', 'montoFinanciableFijo'].includes(k) || !v || typeof v !== 'object') return;
        Object.entries(v).forEach(([plazo, tasa]) => {
          if (tasa === null || tasa === undefined) return;
          const p = parseInt(plazo);
          let cuota = config.modoTasa === 'fija' ? cuotaTasaFija(capitalFinanciar, tasa, p) : cuotaFrances(capitalFinanciar, tasa, p);
          resultados.push({ key: `${k}-uva-${p}`, bancoKey: k, bancoNombre: BANCOS_INFO_FOTON[k]?.nombre || k, plazo: p, tasa, cuota, totalFin: cuota * p, costoTotal: cuota * p + anticipoTotal + gastoOtorgQuebranto, moneda: 'ARS', nota: 'Capital ajusta UVA' });
        });
      });
    } else if (plan === 'dolares') {
      const capitalUSD = capitalFinanciar / (config.cotizacionDolar || 1);
      Object.entries(planData).forEach(([k, v]) => {
        if (['pctFinanciable', 'montoFinanciableFijo'].includes(k) || !v || typeof v !== 'object') return;
        Object.entries(v).forEach(([plazo, tasa]) => {
          if (tasa === null || tasa === undefined) return;
          const p = parseInt(plazo);
          let cuota = config.modoTasa === 'fija' ? cuotaTasaFija(capitalUSD, tasa, p) : cuotaFrances(capitalUSD, tasa, p);
          resultados.push({ key: `${k}-dolares-${p}`, bancoKey: k, bancoNombre: BANCOS_INFO_FOTON[k]?.nombre || k, plazo: p, tasa, cuota, totalFin: cuota * p, costoTotal: (cuota * p * config.cotizacionDolar) + anticipoTotal + gastoOtorgQuebranto, moneda: 'USD' });
        });
      });
    } else if (plan === 'leasing') {
      Object.entries(planData).forEach(([k, v]) => {
        if (['pctFinanciable', 'montoFinanciableFijo'].includes(k) || !v || typeof v !== 'object') return;
        Object.entries(v).forEach(([plazo, tasa]) => {
          if (tasa === null || tasa === undefined) return;
          const p = parseInt(plazo);
          let cuota = config.modoTasa === 'fija' ? cuotaTasaFija(capitalFinanciar, tasa, p) : cuotaFrances(capitalFinanciar, tasa, p);
          resultados.push({ key: `${k}-leasing-${p}`, bancoKey: k, bancoNombre: BANCOS_INFO_FOTON[k]?.nombre || k, plazo: p, tasa, cuota, totalFin: cuota * p, costoTotal: cuota * p + anticipoTotal + gastoOtorgQuebranto, moneda: 'ARS', nota: 'Leasing 100%' });
        });
      });
    }
  }

  // Ordenar opciones por cuota de menor a mayor (las más baratas arriba)
  // Para dólares convertimos a ARS para comparar correctamente
  resultados.sort((a, b) => {
    const cuotaA_ars = a.moneda === 'USD' ? a.cuota * (config.cotizacionDolar || 1) : a.cuota;
    const cuotaB_ars = b.moneda === 'USD' ? b.cuota * (config.cotizacionDolar || 1) : b.cuota;
    return cuotaA_ars - cuotaB_ars;
  });

  const mejorCuota = resultados.length ? resultados[0] : null; // ya ordenado, el primero es el más barato
  const nombreCompleto = `${modelo.nombre} ${version.nombre}`;

  // Auto-marcar la mejor cuota si no hay nada seleccionado (cambia cada vez que se recalcula)
  useEffect(() => {
    if (resultados.length > 0 && opcionesSel.size === 0 && mejorCuota) {
      setOpcionesSel(new Set([mejorCuota.key]));
    }
  }, [resultados.length, plan]);

  // Auto-sincronizar el plan según la forma de pago activa
  // Si activa Leasing → plan='leasing'. Si activa Crédito → plan='pesos'. Si activa Cheques → plan='cheques'.
  useEffect(() => {
    if (pagos.leasing.activo && plan !== 'leasing') {
      setPlan('leasing');
    } else if (pagos.credito.activo && !pagos.leasing.activo && (plan === 'leasing' || plan === 'cheques' || plan === 'contado')) {
      setPlan('pesos');
    } else if (pagos.cheques.activo && !pagos.credito.activo && !pagos.leasing.activo && plan !== 'cheques') {
      setPlan('cheques');
    }
  }, [pagos.leasing.activo, pagos.credito.activo, pagos.cheques.activo]);

  const toggleOpcion = (key) => {
    const nueva = new Set(opcionesSel);
    if (nueva.has(key)) nueva.delete(key); else nueva.add(key);
    setOpcionesSel(nueva);
  };

  const handleGuardar = async () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor antes de guardar'); return; }
    if (!cliente) { alert('Cargá el nombre del cliente'); return; }
    if (resultados.length === 0) { alert('No hay opciones para guardar'); return; }
    const seleccionadas = resultados.filter(r => opcionesSel.has(r.key));
    if (seleccionadas.length === 0) { alert('Marcá al menos una opción para enviar al cliente'); return; }

    const empresa = 'foton';

    const permuta = permutaActiva ? {
      marcaModelo: permutaMarcaModelo,
      anio: permutaAnio,
      km: permutaKm,
      cotizacion: parseNum(permutaCotizacion),
      infoAuto: parseNum(permutaInfoAuto),
    } : null;

    const cot = await onGuardar({
      tipo: 'foton',
      empresa,
      modo, // 'convencional' o 'ventaDirecta'
      modoNombre: esVentaDirecta ? 'Venta Directa' : 'Convencional',
      cliente, whatsappCliente,
      datosInternos: { email: emailCliente, cuit: cuitCliente, direccion: direccionCliente, localidad: localidadCliente },
      vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp },
      validez,
      vehiculo: nombreCompleto,
      tipoLista: esVentaDirecta ? 'ventaDirecta' : tipoLista,
      plan, planNombre: PLAN_INFO[plan].nombre,
      precioReferencia,
      permuta,
      saldoAPagar,
      // Bonificación
      bonificacion: bonificacionActiva && bonificacionN > 0 ? {
        monto: bonificacionN,
        tipo: bonificacionTipo,
        pct: bonificacionTipo === 'porcentaje' ? parseFloat(bonificacionPct) || 0 : null,
        motivo: bonificacionMotivo,
      } : null,
      // Plan de pago del cliente (formas combinadas)
      planPago: Object.entries(pagos).filter(([k, p]) => p.activo && parseNum(p.monto) > 0).map(([k, p]) => ({
        key: k,
        nombre: FORMAS_PAGO_INFO[k].nombre,
        icon: FORMAS_PAGO_INFO[k].icon,
        descripcion: FORMAS_PAGO_INFO[k].descripcion,
        monto: parseNum(p.monto),
        ...(k === 'cheques' ? { cantidad: parseInt(p.cantidad) || 0, tasaMensual: parseFloat(p.tasaMensual) || 0, cuotaCheque: cuotaCheques(parseNum(p.monto), p.tasaMensual, parseInt(p.cantidad) || 1) } : {}),
        ...(k === 'credito' ? { quebrantoActivo: p.quebrantoActivo, quebrantoPct: parseFloat(p.quebrantoPct) || 0, totalFinanciar: parseNum(p.monto) + (p.quebrantoActivo ? parseNum(p.monto) * (parseFloat(p.quebrantoPct) || 0) / 100 : 0) } : {}),
      })),
      sumaPagos,
      patentamientoPct: parseFloat(patentamientoPct) || 0,
      gastoPatentamiento,
      // Solo VD
      fleteFormAlist: esVentaDirecta ? parseNum(fleteFormAlist) : 0,
      quebrantoVDAparte: esVentaDirecta && pagos.credito.activo && pagos.credito.quebrantoActivo ? {
        pct: parseFloat(pagos.credito.quebrantoPct) || 0,
        monto: parseNum(pagos.credito.monto) * (parseFloat(pagos.credito.quebrantoPct) || 0) / 100,
      } : null,
      capitalBase,
      gastosOtorgPct,
      gastosOtorgMonto,
      anticipoTotal, capitalFinanciar, gastoOtorgQuebranto,
      quebrantoTerminal: config.quebrantoTerminal, quebrantoDealer: config.quebrantoDealer,
      resultados: seleccionadas,
      resultadosTodos: resultados,
    });
    setGuardado(cot);
    setTimeout(() => setGuardado(null), 4000);
  };

  // Auman D, Auman D 2027, Auman C y Auman R solo se venden por Venta Directa
  // (decisión comercial: no se ofrecen por Convencional)
  const GRUPOS_SOLO_VD = ['auman-d-1621', 'aumand-2027', 'auman-c-5046', 'auman-r'];

  // Filtrar modelos según el modo: en Convencional ocultamos los Auman.
  // Además, ocultamos los modelos marcados como NO visibles desde la pestaña Modelos.
  const modelosVisibles = (esVentaDirecta
    ? modelos
    : modelos.filter(m => !GRUPOS_SOLO_VD.includes(m.grupoTasa))
  ).filter(m => m.visible !== false);

  // Agrupar modelos por línea para el selector
  const lineas = [...new Set(modelosVisibles.map(m => m.linea))];

  return (
    <div className="space-y-3">
      <HeaderCotizacion proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} validez={validez} setValidez={setValidez} modo={modo} />

      {/* ============ PASO 1 — CLIENTE ============ */}
      <Acordeon
        paso={1}
        titulo="Datos del cliente"
        completado={!!cliente}
        resumen={cliente ? `${cliente}${whatsappCliente ? ` · ${whatsappCliente}` : ''}` : 'Cargá nombre y datos de contacto'}
        abierto={pasoAbierto === 1}
        onToggle={() => toggle(1)}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>🔒 Email, CUIT, Dirección y Teléfono son para tu registro. <span className="font-semibold">No salen en el PDF al cliente.</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Cliente *"><input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre y apellido" className="input" /></Campo>
          <Campo label="WhatsApp"><InputTelefono value={whatsappCliente} onChange={setWhatsappCliente} /></Campo>
          <Campo label="Email"><input type="email" value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="cliente@email.com" className="input" /></Campo>
          <Campo label="CUIT / DNI"><InputCUIT value={cuitCliente} onChange={setCuitCliente} /></Campo>
          <Campo label="Dirección"><input type="text" value={direccionCliente} onChange={e => setDireccionCliente(e.target.value)} placeholder="Calle 123" className="input" /></Campo>
          <Campo label="Localidad" hint="Empezá a escribir y elegí de la lista"><InputLocalidad value={localidadCliente} onChange={setLocalidadCliente} /></Campo>
        </div>
      </Acordeon>

      {/* ============ PASO 2 — VEHÍCULO ============ */}
      <Acordeon
        paso={2}
        titulo="Vehículo y precio"
        completado={precioReferencia > 0}
        resumen={modelo && version ? `${modelo.nombre} ${version.nombre} · ${precioReferencia > 0 ? formatARS(precioReferencia) : 'sin precio'}` : 'Elegí modelo y versión'}
        abierto={pasoAbierto === 2}
        onToggle={() => toggle(2)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Modelo">
            <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="input">
              {lineas.map(linea => (
                <optgroup key={linea} label={linea}>
                  {modelosVisibles.filter(m => m.linea === linea).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo label="Versión">
            <select value={versionId} onChange={e => setVersionId(e.target.value)} className="input">
              {modelo.versiones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
          <div className="flex items-end">
            <div className="rounded-lg px-4 py-3 w-full" style={{ background: esVentaDirecta ? 'rgba(220, 38, 38, 0.1)' : 'var(--accent-soft)', border: `1px solid ${esVentaDirecta ? 'rgba(220, 38, 38, 0.3)' : 'var(--accent-soft-border)'}` }}>
              <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: esVentaDirecta ? '#ef4444' : 'var(--text-muted)' }}>Lista</div>
              <div className="text-sm font-bold" style={{ color: esVentaDirecta ? '#fca5a5' : 'var(--text-primary)' }}>{esVentaDirecta ? '🏭 Directa al 9%' : '📋 Convencional'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Precio de la lista</div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {precioCatalogo > 0 ? (monedaCatalogo === 'USD' ? formatUSD(precioCatalogo) : formatARS(precioCatalogo)) : <span className="text-sm" style={{ color: '#f97316' }}>— sin precio cargado, cargá en Modelos —</span>}
            </div>
            {monedaCatalogo === 'USD' && precioCatalogo > 0 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>≈ {formatARS(precioCatalogoARS)} a {formatARS(config.cotizacionDolar)} / USD</div>
            )}
          </div>
          <Campo label="Precio override (opcional)" hint="Si cargás un valor, sobreescribe el de catálogo (en ARS)">
            <InputDinero value={precioOverride} onChange={setPrecioOverride} placeholder={formatARS(precioCatalogoARS)} />
          </Campo>
        </div>

        {/* Bonificación dentro del Paso 2 — solo visible si se activa */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={bonificacionActiva} onChange={e => setBonificacionActiva(e.target.checked)} className="w-4 h-4 accent-amber-400" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aplicar una bonificación / descuento</span>
            {bonificacionActiva && bonificacionN > 0 && (
              <span className="ml-auto font-bold text-sm" style={{ color: '#15803d' }}>− {formatARS(bonificacionN)}</span>
            )}
          </label>

          {bonificacionActiva && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setBonificacionTipo('monto')} className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${bonificacionTipo === 'monto' ? 'btn-active' : ''}`} style={bonificacionTipo !== 'monto' ? { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' } : {}}>$ Monto fijo</button>
                <button onClick={() => setBonificacionTipo('porcentaje')} className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${bonificacionTipo === 'porcentaje' ? 'btn-active' : ''}`} style={bonificacionTipo !== 'porcentaje' ? { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' } : {}}>% del precio</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bonificacionTipo === 'monto' ? (
                  <Campo label="Monto del descuento"><InputDinero value={bonificacionMonto} onChange={setBonificacionMonto} placeholder="$ 500.000" /></Campo>
                ) : (
                  <Campo label="Porcentaje">
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.5" min="0" max="100" value={bonificacionPct} onChange={e => setBonificacionPct(e.target.value)} className="input" placeholder="5" />
                      <span style={{ color: 'var(--text-muted)' }} className="font-semibold">%</span>
                    </div>
                  </Campo>
                )}
                <Campo label="Motivo (opcional)"><input type="text" value={bonificacionMotivo} onChange={e => setBonificacionMotivo(e.target.value)} placeholder="Promoción / negociación" className="input" /></Campo>
              </div>
            </div>
          )}
        </div>
      </Acordeon>

      {/* ============ PASO 3 — PERMUTA ============ */}
      <Acordeon
        paso={3}
        titulo="Permuta (opcional)"
        completado={permutaActiva && permutaN > 0}
        resumen={permutaActiva && permutaN > 0 ? `${permutaMarcaModelo || 'Usado'} · ${formatARS(permutaN)}` : 'El cliente no entrega un usado'}
        abierto={pasoAbierto === 3}
        onToggle={() => toggle(3)}
      >
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input type="checkbox" checked={permutaActiva} onChange={e => setPermutaActiva(e.target.checked)} className="w-4 h-4 accent-amber-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🚗 El cliente entrega un vehículo usado en parte de pago</span>
        </label>

        {permutaActiva && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Campo label="Marca y modelo"><input type="text" value={permutaMarcaModelo} onChange={e => setPermutaMarcaModelo(e.target.value)} placeholder="VW Gol Trend" className="input" /></Campo>
              <Campo label="Año"><input type="number" value={permutaAnio} onChange={e => setPermutaAnio(e.target.value)} placeholder="2015" className="input" /></Campo>
              <Campo label="KM"><InputKM value={permutaKm} onChange={setPermutaKm} placeholder="120.000" /></Campo>
              <Campo label="Cotización estimada" hint="Sujeto a revisión mecánica"><InputDinero value={permutaCotizacion} onChange={setPermutaCotizacion} placeholder="$ 15.000.000" /></Campo>
              <Campo label="Precio InfoAuto" hint="🔒 Uso interno (no sale en el PDF)"><InputDinero value={permutaInfoAuto} onChange={setPermutaInfoAuto} placeholder="$ 0" /></Campo>
            </div>
          </div>
        )}
      </Acordeon>

      {/* ============ DESGLOSE DEL SALDO — solo si hay Crédito o Leasing ============ */}
      {precioReferencia > 0 && (pagos.credito.activo || pagos.leasing.activo) && (
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--text-muted)' }}>📊 Saldo a financiar</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Precio del vehículo</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatARS(precioReferencia)}</span></div>
            {bonificacionN > 0 && <div className="flex justify-between"><span style={{ color: '#16a34a' }}>− Bonificación</span><span className="font-semibold" style={{ color: '#15803d' }}>− {formatARS(bonificacionN)}</span></div>}
            {permutaN > 0 && <div className="flex justify-between"><span style={{ color: '#16a34a' }}>− Permuta {permutaMarcaModelo && `(${permutaMarcaModelo})`}</span><span className="font-semibold" style={{ color: '#15803d' }}>− {formatARS(permutaN)}</span></div>}
            <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="font-bold uppercase text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>Saldo a financiar</span>
              <span className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{formatARS(saldoAPagar)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ PASO 4 — PLAN DE PAGO DEL CLIENTE (combinable) ============ */}
      <Acordeon
        paso={4}
        titulo="Plan de pago del cliente"
        completado={algunPagoActivo && pagosBalanceados}
        resumen={
          !algunPagoActivo ? 'Elegí una o más formas de pago' :
          pagosBalanceados ? `${Object.entries(pagos).filter(([k, p]) => p.activo).map(([k]) => FORMAS_PAGO_INFO[k].nombre).join(' + ')}` :
          `Falta asignar ${formatARS(Math.abs(diferenciaPagos))}`
        }
        abierto={pasoAbierto === 4}
        onToggle={() => toggle(4)}
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>El cliente puede combinar varias formas de pago. Activá las que correspondan y asigná el monto a cada una.</p>

        {/* Grilla de botones tipo chip — el usuario activa/desactiva */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {Object.entries(FORMAS_PAGO_INFO).map(([key, info]) => {
            const activo = pagos[key].activo;
            return (
              <button
                key={key}
                onClick={() => togglePago(key)}
                className="flex items-center gap-2 px-3 py-3 rounded text-sm font-semibold transition"
                style={{
                  background: activo ? 'var(--accent)' : 'var(--bg-surface-2)',
                  color: activo ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <span className="text-base">{info.icon}</span>
                <span className="flex-1 text-left">{info.nombre}</span>
                {activo && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Detalle de cada forma de pago activa */}
        {algunPagoActivo && (
          <div className="space-y-3">
            {Object.entries(pagos).filter(([k, p]) => p.activo).map(([key, p]) => {
              const info = FORMAS_PAGO_INFO[key];
              return (
                <div key={key} className="p-4 rounded" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-lg">{info.icon}</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{info.nombre}</span>
                    {info.descripcion && <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>· {info.descripcion}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {key !== 'credito' && (
                      <Campo label="Monto">
                        <InputDinero value={p.monto} onChange={v => setPago(key, 'monto', v)} placeholder="$ 0" />
                      </Campo>
                    )}

                    {/* CRÉDITO PRENDARIO: monto con bloqueo según modo + quebranto editable */}
                    {key === 'credito' && (() => {
                      // En VD: el máximo depende de la línea del modelo (de la circular Corven)
                      // En Convencional: 75% por defecto
                      const datoPesos = tasasGrupo?.pesos;
                      const maxVD = (() => {
                        if (!esVentaDirecta || !datoPesos) return null;
                        if (datoPesos.montoFinanciableFijo) return datoPesos.montoFinanciableFijo;
                        if (datoPesos.pctFinanciable) return saldoAPagar * (datoPesos.pctFinanciable / 100);
                        return null;
                      })();
                      const maxMonto = esVentaDirecta && maxVD !== null ? maxVD : saldoAPagar * 0.75;
                      const maxLabel = esVentaDirecta
                        ? (datoPesos?.montoFinanciableFijo
                            ? `Máximo VD: ${formatARS(maxMonto)} (tope fijo según línea)`
                            : `Máximo VD: ${datoPesos?.pctFinanciable || 70}% del saldo = ${formatARS(maxMonto)}`)
                        : `Máximo 75% del saldo = ${formatARS(maxMonto)}`;

                      const montoActual = parseNum(p.monto);
                      const excede = montoActual > maxMonto;
                      const quebrantoNum = p.quebrantoActivo ? (montoActual * (parseFloat(p.quebrantoPct) || 0) / 100) : 0;
                      const otorgNum = p.gastosOtorgActivo ? (montoActual * (parseFloat(p.gastosOtorgPct) || 0) / 100) : 0;
                      // En VD el quebranto NO se suma al capital financiado (es gasto aparte)
                      const totalFinanciar = esVentaDirecta
                        ? montoActual + otorgNum
                        : montoActual + quebrantoNum + otorgNum;

                      const handleMontoChange = (v) => {
                        const num = parseNum(v);
                        if (num > maxMonto) {
                          setPago(key, 'monto', String(Math.round(maxMonto)));
                        } else {
                          setPago(key, 'monto', v);
                        }
                      };

                      return (
                        <>
                          <Campo label="Monto a financiar" hint={maxLabel}>
                            <InputDinero value={p.monto} onChange={handleMontoChange} placeholder={`Máx. ${formatARS(max75)}`} />
                          </Campo>
                          <div className="flex items-end">
                            <button
                              onClick={() => setPago(key, 'monto', String(Math.round(maxMonto)))}
                              className="px-3 py-2.5 rounded text-xs font-semibold w-full"
                              style={{ background: 'var(--bg-surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                            >
                              📌 Usar máximo
                            </button>
                          </div>

                          {/* Quebranto */}
                          <div className="sm:col-span-2 mt-2 p-3 rounded" style={{ background: 'var(--bg-surface-3)', border: '1px solid var(--border)' }}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={p.quebrantoActivo} onChange={e => setPago(key, 'quebrantoActivo', e.target.checked)} className="w-4 h-4 accent-amber-400" />
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>¿El crédito tiene quebranto?</span>
                              {p.quebrantoActivo && quebrantoNum > 0 && (
                                <span className="ml-auto font-bold text-sm" style={{ color: '#ea580c' }}>+ {formatARS(quebrantoNum)}</span>
                              )}
                            </label>
                            {p.quebrantoActivo && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Porcentaje:</span>
                                <button onClick={() => setPago(key, 'quebrantoPct', String(Math.max(0, +(parseFloat(p.quebrantoPct) - 1).toFixed(1))))} className="w-9 h-9 rounded font-bold text-lg" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}>−</button>
                                <div className="relative">
                                  <input type="number" step="0.5" min="0" max="50" value={p.quebrantoPct} onChange={e => setPago(key, 'quebrantoPct', e.target.value)} className="input text-center font-bold pr-8" style={{ width: 90 }} />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>%</span>
                                </div>
                                <button onClick={() => setPago(key, 'quebrantoPct', String(+(parseFloat(p.quebrantoPct) + 1).toFixed(1)))} className="w-9 h-9 rounded font-bold text-lg" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}>+</button>
                                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>sobre el monto financiado</span>
                              </div>
                            )}
                          </div>

                          {/* Gastos de otorgamiento del crédito */}
                          <div className="sm:col-span-2 mt-2 p-3 rounded" style={{ background: 'var(--bg-surface-3)', border: '1px solid var(--border)' }}>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={p.gastosOtorgActivo} onChange={e => setPago(key, 'gastosOtorgActivo', e.target.checked)} className="w-4 h-4 accent-amber-400" />
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>¿El crédito tiene gastos de otorgamiento?</span>
                              {p.gastosOtorgActivo && otorgNum > 0 && (
                                <span className="ml-auto font-bold text-sm" style={{ color: '#ea580c' }}>+ {formatARS(otorgNum)}</span>
                              )}
                            </label>
                            {p.gastosOtorgActivo && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Porcentaje:</span>
                                <button onClick={() => setPago(key, 'gastosOtorgPct', String(Math.max(0, +(parseFloat(p.gastosOtorgPct) - 0.5).toFixed(1))))} className="w-9 h-9 rounded font-bold text-lg" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}>−</button>
                                <div className="relative">
                                  <input type="number" step="0.1" min="0" max="20" value={p.gastosOtorgPct} onChange={e => setPago(key, 'gastosOtorgPct', e.target.value)} className="input text-center font-bold pr-8" style={{ width: 90 }} />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>%</span>
                                </div>
                                <button onClick={() => setPago(key, 'gastosOtorgPct', String(+(parseFloat(p.gastosOtorgPct) + 0.5).toFixed(1)))} className="w-9 h-9 rounded font-bold text-lg" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}>+</button>
                                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>sobre el monto financiado</span>
                              </div>
                            )}
                          </div>

                          {/* Total a financiar con desglose */}
                          {montoActual > 0 && (
                            <div className="sm:col-span-2 rounded p-3" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Monto solicitado</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatARS(montoActual)}</span></div>
                                {esVentaDirecta ? (
                                  // En VD: el quebranto NO se suma al capital, se muestra como gasto aparte
                                  <>
                                    {otorgNum > 0 && <div className="flex justify-between"><span style={{ color: '#ea580c' }}>+ Gastos otorgamiento ({p.gastosOtorgPct}%)</span><span className="font-semibold" style={{ color: '#c2410c' }}>+ {formatARS(otorgNum)}</span></div>}
                                    <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                      <span className="font-bold uppercase text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>Total a financiar</span>
                                      <span className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{formatARS(totalFinanciar)}</span>
                                    </div>
                                    {quebrantoNum > 0 && (
                                      <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}>
                                        <div className="flex justify-between text-xs">
                                          <span style={{ color: '#dc2626' }}>⚠️ Quebranto ({p.quebrantoPct}%) — Lo paga el cliente aparte</span>
                                          <span className="font-bold" style={{ color: '#991b1b' }}>{formatARS(quebrantoNum)}</span>
                                        </div>
                                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>💡 En VD el quebranto se factura por separado por Foton Malaspina (no se financia con el banco).</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // Convencional: quebranto sí se suma al capital
                                  <>
                                    {quebrantoNum > 0 && <div className="flex justify-between"><span style={{ color: '#ea580c' }}>+ Quebranto ({p.quebrantoPct}%)</span><span className="font-semibold" style={{ color: '#c2410c' }}>+ {formatARS(quebrantoNum)}</span></div>}
                                    {otorgNum > 0 && <div className="flex justify-between"><span style={{ color: '#ea580c' }}>+ Gastos otorgamiento ({p.gastosOtorgPct}%)</span><span className="font-semibold" style={{ color: '#c2410c' }}>+ {formatARS(otorgNum)}</span></div>}
                                    <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                      <span className="font-bold uppercase text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>Total a financiar</span>
                                      <span className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{formatARS(totalFinanciar)}</span>
                                    </div>
                                  </>
                                )}
                                <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>💡 Las cuotas se calculan más abajo con este monto total.</p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Campos extras solo para Cheques */}
                    {key === 'cheques' && (
                      <>
                        <Campo label="Cantidad de cheques">
                          <select value={p.cantidad} onChange={e => setPago(key, 'cantidad', e.target.value)} className="input">
                            <option value="3">3 cheques</option>
                            <option value="6">6 cheques</option>
                            <option value="9">9 cheques</option>
                            <option value="12">12 cheques</option>
                            <option value="18">18 cheques</option>
                          </select>
                        </Campo>
                        <Campo label="Tasa mensual (%)" hint="Default 4% editable">
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.1" value={p.tasaMensual} onChange={e => setPago(key, 'tasaMensual', parseFloat(e.target.value) || 0)} className="input" />
                            <span style={{ color: 'var(--text-muted)' }} className="font-semibold">%</span>
                          </div>
                        </Campo>
                        {parseNum(p.monto) > 0 && parseFloat(p.cantidad) > 0 && (
                          <div className="sm:col-span-2 rounded p-3 text-sm" style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              <span className="font-semibold" style={{ color: '#0891b2' }}>
                                {p.cantidad} cheques × {formatARS(cuotaCheques(parseNum(p.monto), p.tasaMensual, parseFloat(p.cantidad)))}
                              </span>
                              {' '}cada uno · Total: {formatARS(cuotaCheques(parseNum(p.monto), p.tasaMensual, parseFloat(p.cantidad)) * parseFloat(p.cantidad))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Leasing: nota informativa */}
                    {key === 'leasing' && parseNum(p.monto) > 0 && (
                      <div className="sm:col-span-2 rounded p-3 text-sm" style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          🏢 Capital de leasing: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatARS(parseNum(p.monto))}</span>. Tasas y plazos se muestran abajo.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mini-resumen: seña vs al entregar */}
            {/* Indicador de balance */}
            <div className="p-4 rounded" style={{
              background: pagosBalanceados ? 'rgba(34, 197, 94, 0.08)' : 'rgba(249, 115, 22, 0.08)',
              border: `1px solid ${pagosBalanceados ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
            }}>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Saldo a financiar</span><span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(saldoAPagar)}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Suma asignada a pagos</span><span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatARS(sumaPagos)}</span></div>
                <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  {pagosBalanceados ? (
                    <>
                      <span className="font-bold" style={{ color: '#16a34a' }}>✓ Coincide perfectamente</span>
                      <span className="font-black" style={{ color: '#15803d' }}>{formatARS(0)}</span>
                    </>
                  ) : diferenciaPagos > 0 ? (
                    <>
                      <span className="font-bold" style={{ color: '#ea580c' }}>⚠️ Faltan por asignar</span>
                      <span className="font-black" style={{ color: '#c2410c' }}>{formatARS(diferenciaPagos)}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold" style={{ color: '#dc2626' }}>⚠️ Excede el saldo</span>
                      <span className="font-black" style={{ color: '#b91c1c' }}>{formatARS(Math.abs(diferenciaPagos))}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Acordeon>

      {/* ============ PASO 5 — PATENTAMIENTO + (VD) FLETE/FORMULARIO/ALISTAMIENTO ============ */}
      {precioReferencia > 0 && (
        <Acordeon
          paso={5}
          titulo={esVentaDirecta ? "Patentamiento + Flete / Formulario / Alistamiento" : "Patentamiento"}
          completado={true}
          resumen={esVentaDirecta
            ? `Patent: ${formatARS(gastoPatentamiento)} · Flete/F/A: ${formatARS(parseNum(fleteFormAlist))}`
            : `${patentamientoPct}% · ${formatARS(gastoPatentamiento)}`}
          abierto={pasoAbierto === 5}
          onToggle={() => toggle(5)}
        >
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>📋 Gasto de patentamiento</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <Campo label="% aplicado" hint={`Default ${config.gastoPatentamientoPct ?? 6}%`}>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" min="0" max="100" value={patentamientoPct} onChange={e => setPatentamientoPct(e.target.value)} className="input" />
                    <span style={{ color: 'var(--text-muted)' }} className="font-semibold">%</span>
                  </div>
                </Campo>
                <div className="rounded p-3" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Base</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatARS(precioReferencia)}</div>
                </div>
                <div className="rounded p-3" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-border)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Monto patentamiento</div>
                  <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{formatARS(gastoPatentamiento)}</div>
                </div>
              </div>
            </div>

            {/* SOLO VD: Flete + Formulario + Alistamiento */}
            {esVentaDirecta && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#dc2626' }}>🚛 Flete + Formulario + Alistamiento</div>
                <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Facturado por <strong style={{ color: 'var(--text-primary)' }}>Foton Malaspina</strong> (no incluido en la factura de Corven). Default según la línea del modelo: $1.500.000 (Minitrucks y Pickups) · $2.000.000 (Aumark en adelante)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <Campo label="Monto">
                    <InputDinero value={fleteFormAlist} onChange={setFleteFormAlist} placeholder="$ 1.500.000" />
                  </Campo>
                  <div className="rounded p-3" style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.25)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#dc2626' }}>Total flete + form + alist</div>
                    <div className="font-black text-lg" style={{ color: '#991b1b' }}>{formatARS(parseNum(fleteFormAlist))}</div>
                  </div>
                </div>
              </div>
            )}

            {/* SOLO VD + Crédito con quebranto: aviso destacado */}
            {esVentaDirecta && pagos.credito.activo && pagos.credito.quebrantoActivo && parseNum(pagos.credito.monto) > 0 && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="rounded-lg p-4" style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#dc2626' }}>⚠️ Quebranto del crédito — Factura Malaspina aparte</div>
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>{pagos.credito.quebrantoPct}% sobre ${formatARS(parseNum(pagos.credito.monto))}</span>
                    <span className="font-bold text-lg" style={{ color: '#991b1b' }}>{formatARS(parseNum(pagos.credito.monto) * (parseFloat(pagos.credito.quebrantoPct) || 0) / 100)}</span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>💡 Según circular Corven 08/05/2026: el quebranto se factura por separado en concepto de <em>Gastos de otorgamiento de crédito</em>, transferido a Corven antes del envío de la nota de pedido.</p>
                </div>
              </div>
            )}

            {!esVentaDirecta && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>💡 Los gastos de otorgamiento del crédito (1%) se cargan dentro del bloque "Crédito Prendario" en el paso anterior.</p>
            )}
          </div>
        </Acordeon>
      )}

      {precioReferencia > 0 && capitalFinanciar > 0 && resultados.length > 0 && (pagos.credito.activo || pagos.leasing.activo) && (
        <>
          <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Resumen · {PLAN_INFO[plan].nombre}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><div className="text-stone-500 text-xs">{permutaActiva ? 'Saldo a pagar' : 'Precio referencia'}</div><div className="text-stone-200 font-bold">{formatARS(permutaActiva ? saldoAPagar : precioReferencia)}</div></div>
              <div><div className="text-stone-500 text-xs">Anticipo</div><div className="text-stone-200 font-bold">{formatARS(anticipoTotal)}</div></div>
              <div><div className="text-stone-500 text-xs">A financiar</div><div className="text-amber-400 font-bold">{formatARS(capitalFinanciar)}</div></div>
              <div><div className="text-stone-500 text-xs">Quebranto ({quebrantoTotalPct}%)</div><div className="text-orange-400 font-bold">+{formatARS(gastoOtorgQuebranto)}</div></div>
            </div>
            {gastoPatentamiento > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-800 flex justify-between items-center">
                <div className="text-xs text-stone-400">📋 Gasto de patentamiento ({patentamientoPct}%)</div>
                <div className="text-amber-400 font-bold">+{formatARS(gastoPatentamiento)}</div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Opciones · {resultados.length}</h2>
              <div className="text-xs text-stone-400">☑️ <span className="text-amber-400 font-bold">{opcionesSel.size}</span> seleccionada{opcionesSel.size !== 1 && 's'} para enviar al cliente</div>
            </div>
            <div className="space-y-4">
              {plan === 'cheques' ? (
                // Cheques: una sola tabla
                <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: PLAN_INFO.cheques.color }}>
                    <FileSignature size={14} className="text-white" />
                    <span className="font-bold text-white text-sm tracking-wide">Cheques · {tasaCheques}% mensual</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-950 text-stone-400 text-xs uppercase tracking-wider">
                        <tr><th className="text-center p-3 w-10">☑️</th><th className="text-left p-3">Plazo</th><th className="text-center p-3">Tasa</th><th className="text-right p-3">Cuota</th><th className="text-right p-3">Costo total</th></tr>
                      </thead>
                      <tbody>
                        {resultados.map(r => {
                          const seleccionado = opcionesSel.has(r.key);
                          return (
                            <tr key={r.key} className={`border-t border-stone-800 cursor-pointer ${seleccionado ? 'bg-amber-400/10' : r === mejorCuota ? 'bg-amber-400/5' : ''}`} onClick={() => toggleOpcion(r.key)}>
                              <td className="p-3 text-center"><input type="checkbox" checked={seleccionado} onChange={() => toggleOpcion(r.key)} onClick={e => e.stopPropagation()} className="accent-amber-400 w-4 h-4" /></td>
                              <td className="p-3 font-semibold text-stone-200">{r.plazo} meses</td>
                              <td className="text-center p-3 text-stone-400">{r.tasa}%</td>
                              <td className="text-right p-3 font-bold text-amber-400">{formatARS(r.cuota)}</td>
                              <td className="text-right p-3 text-stone-500">{formatARS(r.costoTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                // Otros planes: agrupados por banco, ordenados por mejor cuota (el banco con la cuota más baja arriba)
                Object.keys(BANCOS_INFO_FOTON)
                  .filter(bk => resultados.some(r => r.bancoKey === bk))
                  .sort((a, b) => {
                    const cuotaMinA = Math.min(...resultados.filter(r => r.bancoKey === a).map(r => r.moneda === 'USD' ? r.cuota * (config.cotizacionDolar || 1) : r.cuota));
                    const cuotaMinB = Math.min(...resultados.filter(r => r.bancoKey === b).map(r => r.moneda === 'USD' ? r.cuota * (config.cotizacionDolar || 1) : r.cuota));
                    return cuotaMinA - cuotaMinB;
                  })
                  .map(bk => {
                  // Dentro de cada banco, ordenar por cuota (más barata arriba)
                  const rs = resultados.filter(r => r.bancoKey === bk).sort((a, b) => {
                    const cA = a.moneda === 'USD' ? a.cuota * (config.cotizacionDolar || 1) : a.cuota;
                    const cB = b.moneda === 'USD' ? b.cuota * (config.cotizacionDolar || 1) : b.cuota;
                    return cA - cB;
                  });
                  if (rs.length === 0) return null;
                  return (
                    <div key={bk} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5" style={{ background: BANCOS_INFO_FOTON[bk].color }}>
                        <span className="font-bold text-white text-sm tracking-wide">{BANCOS_INFO_FOTON[bk].nombre}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-950 text-stone-400 text-xs uppercase tracking-wider">
                            <tr><th className="text-center p-3 w-10">☑️</th><th className="text-left p-3">Plazo</th><th className="text-center p-3">Tasa</th><th className="text-right p-3">Cuota</th><th className="text-right p-3">Costo total</th></tr>
                          </thead>
                          <tbody>
                            {rs.map(r => {
                              const seleccionado = opcionesSel.has(r.key);
                              return (
                                <tr key={r.key} className={`border-t border-stone-800 cursor-pointer ${seleccionado ? 'bg-amber-400/10' : r === mejorCuota ? 'bg-amber-400/5' : ''}`} onClick={() => toggleOpcion(r.key)}>
                                  <td className="p-3 text-center"><input type="checkbox" checked={seleccionado} onChange={() => toggleOpcion(r.key)} onClick={e => e.stopPropagation()} className="accent-amber-400 w-4 h-4" /></td>
                                  <td className="p-3 font-semibold text-stone-200">{r.plazo} meses</td>
                                  <td className="text-center p-3 text-stone-400">{r.tasa}%</td>
                                  <td className="text-right p-3 font-bold text-amber-400">{r.moneda === 'USD' ? formatUSD(r.cuota) : formatARS(r.cuota)}</td>
                                  <td className="text-right p-3 text-stone-500">{formatARS(r.costoTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-xs text-stone-500 mt-2">💡 Marcá las opciones que querés enviarle al cliente. Solo esas aparecen en el PDF / WhatsApp.</p>
          </section>

          <BotonGuardar onClick={handleGuardar} guardado={guardado} onVerCot={onVerCot} />
        </>
      )}

      {(pagos.credito.activo || pagos.leasing.activo) && !planDisponible && plan !== 'cheques' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-400">Plan <span className="text-amber-400">{PLAN_INFO[plan].nombre}</span> no disponible para grupo <span className="text-amber-400">{GRUPOS_TASA_INFO[modelo.grupoTasa] || modelo.grupoTasa}</span>.</div>}
      {precioReferencia === 0 && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-500 text-sm">Esta versión no tiene precio cargado. Cargalo en "Actualizar mensual" o ingresá uno en "Precio override".</div>}
    </div>
  );
}

// ============================================================
// LISTA DE COTIZACIONES
// ============================================================

function ListaCotizaciones({ cotizaciones, onVer, onEliminar }) {
  const [busqueda, setBusqueda] = useState('');
  const filtradas = cotizaciones.filter(c => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return c.numero.toLowerCase().includes(q) || (c.cliente || '').toLowerCase().includes(q) || (c.vehiculo || '').toLowerCase().includes(q) || (c.vendedor?.nombre || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por número, cliente, vehículo o vendedor..." className="input pl-10" />
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-500">
          {cotizaciones.length === 0 ? 'Aún no hay cotizaciones guardadas.' : 'Sin resultados para la búsqueda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(c => (
            <div key={c.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4 hover:border-amber-400/30 transition">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-400 font-black text-sm">{c.numero}</span>
                    <span className="text-stone-500 text-xs">·</span>
                    <span className="text-stone-300 text-sm">{formatFecha(c.fechaCreacion)}</span>
                  </div>
                  <div className="text-stone-100 font-semibold mt-1">{c.cliente}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{c.vehiculo}{c.planNombre ? ` · ${c.planNombre}` : ''} · {c.vendedor?.nombre || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onVer(c)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-semibold flex items-center gap-1.5"><Eye size={12} /> Ver</button>
                  <button onClick={() => { if (confirm(`¿Eliminar cotización ${c.numero}?`)) onEliminar(c.id); }} className="px-2 py-1.5 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL: VER COTIZACIÓN + EXPORTAR
// ============================================================

function ModalCotizacion({ cotizacion, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const printRef = useRef(null);
  const c = cotizacion;
  // Si la cotización tiene empresa guardada, la usamos. Si no, fallback al negocio.
  const empresaInfo = EMPRESAS.foton;
  const negocioNombre = empresaInfo.nombre;
  const negocioDatos = { direccion: empresaInfo.direccion, web: empresaInfo.web, tel: empresaInfo.tel };

  // Ordenamiento consistente: por cuota (USD convertido a ARS para comparar)
  const COTIZACION_USD_PDF = 1450; // fallback si no viene en c
  const ordenarPorCuota = (arr) => [...arr].sort((a, b) => {
    const cA = a.moneda === 'USD' ? a.cuota * COTIZACION_USD_PDF : a.cuota;
    const cB = b.moneda === 'USD' ? b.cuota * COTIZACION_USD_PDF : b.cuota;
    return cA - cB;
  });
  const top3 = ordenarPorCuota(c.resultados || []).slice(0, 3);

  // Texto WhatsApp resumido (versión corta y limpia)
  const generarWhatsApp = () => {
    let m = `🚗 *${negocioNombre}*\n*Cotización ${c.numero}*\n\n`;
    m += `👤 Cliente: ${c.cliente}\n`;
    m += `📅 Válida hasta: ${formatFecha(c.validez)}\n\n`;
    m += `*Vehículo:* ${c.vehiculo}\n`;
    if (c.precioReferencia > 0) m += `💰 Precio: ${formatARS(c.precioReferencia)}\n`;
    if (c.bonificacion) {
      const detalle = c.bonificacion.tipo === 'porcentaje' ? ` (${c.bonificacion.pct}%)` : '';
      m += `🎁 Bonificación${detalle}: −${formatARS(c.bonificacion.monto)}\n`;
    }
    if (c.permuta && c.permuta.cotizacion > 0) {
      m += `🚙 Permuta${c.permuta.marcaModelo ? ` (${c.permuta.marcaModelo})` : ''}: −${formatARS(c.permuta.cotizacion)}\n`;
    }

    // Plan de pago combinado
    if (c.planPago && c.planPago.length > 0) {
      m += `\n*Plan de pago:*\n`;
      c.planPago.forEach(p => {
        m += `${p.icon} ${p.nombre}: ${formatARS(p.monto)}\n`;
        if (p.key === 'credito') {
          const extras = [];
          if (p.quebrantoActivo) extras.push(`Quebranto ${p.quebrantoPct}%`);
          if (p.gastosOtorgActivo) extras.push(`Gastos otorg. ${p.gastosOtorgPct}%`);
          if (extras.length > 0) {
            m += `   _+ ${extras.join(' + ')} = ${formatARS(p.totalFinanciar)}_\n`;
          }
        }
        if (p.key === 'cheques') {
          m += `   _${p.cantidad} cheques de ${formatARS(p.cuotaCheque)} (${p.tasaMensual}% mensual)_\n`;
        }
      });
    }

    // Cuotas del crédito (si hay)
    const opcionesAEnviar = c.resultados || [];
    if (opcionesAEnviar.length > 0 && c.planPago?.some(p => p.key === 'credito' || p.key === 'leasing')) {
      m += `\n*Opciones de cuota:*\n`;
      opcionesAEnviar.forEach((r, i) => {
        const cuotaStr = r.moneda === 'USD' ? formatUSD(r.cuota) : formatARS(r.cuota);
        m += `${i + 1}. ${r.bancoNombre} · ${r.plazo} cuotas de ${cuotaStr}\n`;
      });
    }

    // Gastos
    if (c.fleteFormAlist > 0) m += `\n🚛 Flete + Formulario + Alistamiento: ${formatARS(c.fleteFormAlist)}\n`;
    if (c.gastoPatentamiento > 0) m += `📋 Patentamiento (${c.patentamientoPct}%): ${formatARS(c.gastoPatentamiento)}\n`;
    if (c.quebrantoVDAparte) m += `⚠️ Gastos de otorgamiento de crédito (${c.quebrantoVDAparte.pct}%): ${formatARS(c.quebrantoVDAparte.monto)}\n`;

    // Aviso Venta Directa
    if (c.modoNombre === 'Venta Directa') {
      m += `\n*ℹ️ Operación Venta Directa:*\n`;
      m += `• Factura por Grupo Corven (15 días hábiles)\n`;
      m += `• Cliente debe estar registrado en Corven\n`;
      m += `• Flete/Formulario/Alistamiento y Patentamiento facturados aparte por Malaspina\n`;
    }

    m += `\n_Valores estimados sujetos a aprobación crediticia._\n`;
    m += `\n${c.vendedor?.nombre ? `*${c.vendedor.nombre}*` : ''}\n${negocioNombre}\n📍 ${negocioDatos.direccion}`;
    return m;
  };

  const imprimir = () => { window.print(); };
  const asuntoEmail = `Cotización ${c.numero} · ${negocioNombre}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white text-stone-900 rounded-lg w-full max-h-[95vh] overflow-y-auto print:max-h-none print:max-w-full print:rounded-none print:shadow-none" style={{ maxWidth: '820px' }} ref={printRef}>
        {/* Toolbar (no se imprime) */}
        <div className="sticky top-0 bg-stone-100 border-b border-stone-200 px-5 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="text-stone-700 font-semibold text-sm">Cotización {c.numero}</div>
          <button onClick={onClose} className="px-3 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded text-xs font-bold">Cerrar</button>
        </div>

        {/* Botones de envío (no se imprime) */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 print:hidden">
          <BotonesEnviar
            mensaje={generarWhatsApp()}
            whatsappCliente={c.whatsappCliente}
            emailCliente={c.datosInternos?.email}
            asuntoEmail={asuntoEmail}
            onImprimir={imprimir}
          />
          {!c.whatsappCliente && (
            <p className="text-xs mt-2" style={{ color: '#92400e' }}>💡 Cargá el WhatsApp del cliente en la próxima cotización para que se envíe directo a su número.</p>
          )}
        </div>

        {/* Contenido imprimible */}
        <div className="p-10 print:p-0 print-document">
          {/* Encabezado: LOGO FOTON + datos empresa */}
          <div className="border-b-2 border-stone-900 pb-5 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <LogoFoton size="xl" color="dark" />
                <div className="mt-4 text-xs text-stone-600 space-y-0.5">
                  <div className="font-semibold text-stone-800">CONCESIONARIO OFICIAL</div>
                  <div>{negocioDatos.direccion}</div>
                  <div>{negocioDatos.web} · WhatsApp: {negocioDatos.tel}</div>
                </div>
              </div>
              <div className="text-right border-l-4 border-red-600 pl-4">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Cotización</div>
                <div className="text-3xl font-black text-stone-900 leading-none mt-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{c.numero}</div>
                <div className="mt-3 space-y-0.5 text-xs">
                  <div className="text-stone-600">Fecha: <span className="font-bold text-stone-900">{formatFecha(c.fechaCreacion)}</span></div>
                  <div className="text-stone-600">Vence: <span className="font-bold text-stone-900">{formatFecha(c.validez)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Cliente</div>
            <div className="text-stone-900 font-bold text-xl" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '0.02em' }}>{c.cliente}</div>
            {c.whatsappCliente && <div className="text-sm text-stone-600 mt-1">WhatsApp: {c.whatsappCliente}</div>}
          </div>

          {/* Datos vehículo + estructura de precio */}
          <div className="bg-stone-50 border border-stone-200 rounded p-4 mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Vehículo</div>
            <div className="text-stone-900 font-bold text-lg">{c.vehiculo}</div>
            {c.modoNombre && <div className="text-xs text-stone-500 mt-1">Lista: {c.modoNombre === 'Venta Directa' ? '🏭 Directa al 9%' : '📋 Convencional'}</div>}

            {/* Estructura de precio */}
            <div className="mt-4 pt-3 border-t border-stone-200 space-y-1.5 text-sm">
              {c.precioReferencia > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Precio de lista</span>
                  <span className="font-bold text-stone-900">{formatARS(c.precioReferencia)}</span>
                </div>
              )}
              {c.bonificacion && (
                <div className="flex justify-between">
                  <span className="text-green-700">− Bonificación {c.bonificacion.tipo === 'porcentaje' ? `(${c.bonificacion.pct}%)` : ''}{c.bonificacion.motivo ? ` · ${c.bonificacion.motivo}` : ''}</span>
                  <span className="font-bold text-green-700">−{formatARS(c.bonificacion.monto)}</span>
                </div>
              )}
              {c.permuta && c.permuta.cotizacion > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-700">− Permuta {c.permuta.marcaModelo ? `(${c.permuta.marcaModelo})` : ''}</span>
                  <span className="font-bold text-green-700">−{formatARS(c.permuta.cotizacion)}</span>
                </div>
              )}
              {c.saldoAPagar > 0 && (c.bonificacion || c.permuta) && (
                <div className="flex justify-between pt-2 mt-1 border-t border-stone-200">
                  <span className="font-bold uppercase text-xs tracking-wider text-stone-700">Saldo</span>
                  <span className="font-black text-lg text-amber-700">{formatARS(c.saldoAPagar)}</span>
                </div>
              )}
            </div>
          </div>

          {/* PLAN DE PAGO DETALLADO */}
          {c.planPago && c.planPago.length > 0 && (
            <div className="bg-white border-2 border-stone-900 rounded p-4 mb-6">
              <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-3">Plan de pago del cliente</div>
              <div className="space-y-2">
                {c.planPago.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 rounded bg-stone-50 border border-stone-200">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{p.icon}</span>
                      <div>
                        <div className="font-bold text-stone-900">{p.nombre}</div>
                        {p.key === 'credito' && p.quebrantoActivo && (
                          <div className="text-xs text-stone-600">Monto solicitado + quebranto {p.quebrantoPct}% = Total {formatARS(p.totalFinanciar)}</div>
                        )}
                        {p.key === 'cheques' && (
                          <div className="text-xs text-stone-600">{p.cantidad} cheques de {formatARS(p.cuotaCheque)} ({p.tasaMensual}% mensual)</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-stone-900">{formatARS(p.monto)}</div>
                    </div>
                  </div>
                ))}
                {c.sumaPagos > 0 && (
                  <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-stone-900">
                    <span className="font-bold uppercase text-xs tracking-wider text-stone-700">Total operación</span>
                    <span className="font-black text-xl text-stone-900">{formatARS(c.sumaPagos)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PERMUTA — bloque visible al cliente (sin InfoAuto) */}
          {c.permuta && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <div className="text-xs uppercase tracking-wider text-blue-700 font-bold mb-2">🚗 Usado que entrega</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {c.permuta.marcaModelo && <div><span className="text-stone-500">Modelo:</span> <span className="font-semibold text-stone-900">{c.permuta.marcaModelo}</span></div>}
                {c.permuta.anio && <div><span className="text-stone-500">Año:</span> <span className="font-semibold text-stone-900">{c.permuta.anio}</span></div>}
                {c.permuta.km && <div><span className="text-stone-500">KM:</span> <span className="font-semibold text-stone-900">{new Intl.NumberFormat('es-AR').format(parseNum(c.permuta.km))}</span></div>}
                {c.permuta.cotizacion > 0 && <div><span className="text-stone-500">Cotización estimada:</span> <span className="font-bold text-blue-700">{formatARS(c.permuta.cotizacion)}</span></div>}
              </div>
              <div className="text-xs text-stone-500 italic mt-2">Sujeto a revisión mecánica.</div>
            </div>
          )}

          {/* PERMUTA — uso interno (NO se imprime, marca print:hidden) */}
          {c.permuta && c.permuta.infoAuto > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-6 print:hidden">
              <div className="text-xs uppercase tracking-wider text-amber-800 font-bold mb-1">🔒 Uso interno</div>
              <div className="text-sm text-stone-700">Precio InfoAuto: <span className="font-bold">{formatARS(c.permuta.infoAuto)}</span></div>
              {c.permuta.cotizacion > 0 && (
                <div className="text-xs text-stone-500 mt-1">
                  Diferencia (cotización − InfoAuto): <span className={`font-semibold ${c.permuta.cotizacion - c.permuta.infoAuto >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatARS(c.permuta.cotizacion - c.permuta.infoAuto)}</span>
                </div>
              )}
            </div>
          )}

          {/* Opciones — solo si hay crédito en el plan de pago */}
          {c.planPago?.some(p => p.key === 'credito' || p.key === 'leasing') && c.resultados?.length > 0 && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-3">Opciones de cuota — {c.planPago?.some(p => p.key === 'leasing') ? 'Leasing' : 'Crédito Prendario'}</div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-stone-900 text-white">
                    <th className="text-left p-2.5">Entidad</th>
                    <th className="text-center p-2.5">Plazo</th>
                    <th className="text-center p-2.5">Tasa</th>
                    <th className="text-right p-2.5">Cuota</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenarPorCuota(c.resultados || []).map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                      <td className="p-2.5 border-b border-stone-200 font-semibold">{r.bancoNombre}</td>
                      <td className="text-center p-2.5 border-b border-stone-200">{r.plazo} m</td>
                      <td className="text-center p-2.5 border-b border-stone-200">{r.tasa !== undefined ? `${r.tasa}%` : '—'}</td>
                      <td className="text-right p-2.5 border-b border-stone-200 font-bold text-amber-700">{r.moneda === 'USD' ? formatUSD(r.cuota) : formatARS(r.cuota)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Gastos finales */}
          {(c.gastoPatentamiento > 0 || c.fleteFormAlist > 0 || c.quebrantoVDAparte) && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-3">
                {c.modoNombre === 'Venta Directa' ? 'Gastos adicionales — Factura Foton Malaspina' : 'Gastos adicionales'}
              </div>
              <div className="space-y-1.5 text-sm">
                {c.fleteFormAlist > 0 && (
                  <div className="flex justify-between p-2 bg-stone-50 rounded">
                    <span className="text-stone-700">🚛 Flete + Formulario + Alistamiento</span>
                    <span className="font-bold text-stone-900">{formatARS(c.fleteFormAlist)}</span>
                  </div>
                )}
                {c.gastoPatentamiento > 0 && (
                  <div className="flex justify-between p-2 bg-stone-50 rounded">
                    <span className="text-stone-700">📋 Patentamiento ({c.patentamientoPct}%)</span>
                    <span className="font-bold text-stone-900">{formatARS(c.gastoPatentamiento)}</span>
                  </div>
                )}
                {c.quebrantoVDAparte && (
                  <div className="flex justify-between p-2 rounded" style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                    <span className="text-red-800">⚠️ Gastos de otorgamiento de crédito (quebranto {c.quebrantoVDAparte.pct}%)</span>
                    <span className="font-bold text-red-900">{formatARS(c.quebrantoVDAparte.monto)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AVISO OBLIGATORIO VENTA DIRECTA — circular Corven 08/05/2026 */}
          {c.modoNombre === 'Venta Directa' && (
            <div className="rounded p-4 mb-6" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#92400e' }}>ℹ️ Operación Venta Directa — Información importante</div>
              <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: '#78350f' }}>
                <li>Factura emitida por <strong>Grupo Corven Motors Argentina</strong>. El cliente debe estar registrado previamente como cliente de Corven.</li>
                <li>Plazo de emisión de factura: aproximadamente <strong>15 días hábiles</strong> desde la nota de pedido.</li>
                <li>Precio según <strong>Lista Especial de Venta Directa Foton</strong>.</li>
                <li>Adicionales facturados por <strong>Foton Malaspina</strong> (no incluidos en factura de Corven): Flete + Formulario + Alistamiento, Patentamiento{c.quebrantoVDAparte ? ', y Gastos de otorgamiento de crédito (quebranto)' : ''}.</li>
              </ol>
            </div>
          )}

          {/* Notas */}
          <div className="text-xs text-stone-500 border-t border-stone-200 pt-4 space-y-1">
            <div>• Valores estimados, sujetos a aprobación crediticia del banco/financiera.</div>
            <div>• La cuota puede variar según la fecha efectiva de liquidación y políticas vigentes.</div>
            <div>• Cotización válida hasta el {formatFecha(c.validez)} o hasta agotar stock.</div>
          </div>

          {/* Pie con datos del vendedor */}
          <div className="mt-8 pt-4 border-t-2 border-stone-300">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Atendido por</div>
                <div className="text-stone-900 font-bold text-base">{c.vendedor?.nombre || '—'}</div>
                {c.vendedor?.whatsapp && <div className="text-xs text-stone-600">WhatsApp: {c.vendedor.whatsapp}</div>}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">{negocioNombre}</div>
                <div className="text-xs text-stone-600">{negocioDatos.tel} · {negocioDatos.web}</div>
              </div>
            </div>
          </div>

          {/* Datos internos del cliente (NO se imprimen) */}
          {c.datosInternos && (c.datosInternos.email || c.datosInternos.cuit || c.datosInternos.direccion || c.datosInternos.localidad) && (
            <div className="mt-6 bg-amber-50 border border-amber-300 rounded p-3 print:hidden">
              <div className="text-xs uppercase tracking-wider text-amber-800 font-bold mb-2">🔒 Datos internos del cliente (no salen en el PDF)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {c.datosInternos.email && <div><span className="text-stone-500">Email:</span> <span className="font-semibold text-stone-900">{c.datosInternos.email}</span></div>}
                {c.datosInternos.cuit && <div><span className="text-stone-500">CUIT/DNI:</span> <span className="font-semibold text-stone-900">{c.datosInternos.cuit}</span></div>}
                {c.datosInternos.direccion && <div><span className="text-stone-500">Dirección:</span> <span className="font-semibold text-stone-900">{c.datosInternos.direccion}</span></div>}
                {c.datosInternos.localidad && <div><span className="text-stone-500">Localidad:</span> <span className="font-semibold text-stone-900">{c.datosInternos.localidad}</span></div>}
                {c.datosInternos.telefono && <div><span className="text-stone-500">Teléfono:</span> <span className="font-semibold text-stone-900">{c.datosInternos.telefono}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// CONFIG: VENDEDORES
// ============================================================

function ConfigVendedores({ vendedores, setVendedores, hashClave, usuarioActual }) {
  const [editandoId, setEditandoId] = useState(null);
  const [cambiandoClaveId, setCambiandoClaveId] = useState(null);
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [agregarOpen, setAgregarOpen] = useState(false);

  // Form agregar vendedor
  const [nNombre, setNNombre] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nWA, setNWA] = useState('');
  const [nClave, setNClave] = useState('');
  const [nConfirmar, setNConfirmar] = useState('');
  const [nError, setNError] = useState('');

  // Helper para obtener email o usuario (compat)
  const getLogin = (v) => v.email || v.usuario || '';

  const agregar = () => {
    setNError('');
    if (!nNombre.trim()) return setNError('Cargá el nombre');
    if (!nEmail.trim()) return setNError('Cargá el email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nEmail.trim())) return setNError('Email inválido');
    const emailNorm = nEmail.toLowerCase().trim();
    if (vendedores.some(v => getLogin(v).toLowerCase() === emailNorm)) return setNError('Ese email ya está registrado');
    if (nClave.length < 4) return setNError('La clave debe tener al menos 4 caracteres');
    if (nClave !== nConfirmar) return setNError('Las claves no coinciden');

    const nuevo = {
      id: 'usr_' + Date.now(),
      nombre: nNombre.trim(),
      email: emailNorm,
      whatsapp: nWA,
      clave: nClave,
      rol: 'vendedor',
      permisos: { ...PERMISOS_VENDEDOR_DEFAULT },
      activo: true,
      fechaCreacion: new Date().toISOString(),
    };
    setVendedores([...vendedores, nuevo]);
    setNNombre(''); setNEmail(''); setNWA(''); setNClave(''); setNConfirmar(''); setNError('');
    setAgregarOpen(false);
  };

  const togglePermiso = (id, key) => {
    setVendedores(vendedores.map(v => v.id === id ? { ...v, permisos: { ...v.permisos, [key]: !v.permisos?.[key] } } : v));
  };
  const toggleActivo = (id) => {
    if (id === usuarioActual?.id) return alert('No podés desactivar tu propio usuario.');
    setVendedores(vendedores.map(v => v.id === id ? { ...v, activo: v.activo === false ? true : false } : v));
  };
  const actualizar = (id, campo, valor) => setVendedores(vendedores.map(v => v.id === id ? { ...v, [campo]: valor } : v));
  const eliminar = (id) => {
    if (id === usuarioActual?.id) return alert('No podés eliminar tu propio usuario.');
    const v = vendedores.find(x => x.id === id);
    if (v?.rol === 'admin' && vendedores.filter(x => x.rol === 'admin').length === 1) {
      return alert('No podés eliminar al único administrador. Asigná rol admin a otro usuario primero.');
    }
    if (confirm(`¿Eliminar a ${v?.nombre}? Esta acción no se puede deshacer.`)) {
      setVendedores(vendedores.filter(v => v.id !== id));
    }
  };
  const cambiarRol = (id) => {
    const v = vendedores.find(x => x.id === id);
    const esAdminActual = v.rol === 'admin';
    if (esAdminActual && vendedores.filter(x => x.rol === 'admin').length === 1) {
      return alert('Tiene que haber al menos un administrador.');
    }
    const nuevoRol = esAdminActual ? 'vendedor' : 'admin';
    const nuevosPermisos = nuevoRol === 'admin' ? PERMISOS_ADMIN : { ...PERMISOS_VENDEDOR_DEFAULT };
    setVendedores(vendedores.map(x => x.id === id ? { ...x, rol: nuevoRol, permisos: nuevosPermisos } : x));
  };
  const guardarNuevaClave = (id) => {
    if (nuevaClave.length < 4) return alert('La clave debe tener al menos 4 caracteres');
    if (nuevaClave !== confirmarClave) return alert('Las claves no coinciden');
    setVendedores(vendedores.map(v => v.id === id ? { ...v, clave: nuevaClave, claveHash: undefined } : v));
    setCambiandoClaveId(null); setNuevaClave(''); setConfirmarClave('');
    alert('✓ Clave actualizada');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="heading-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Vendedores y permisos</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestioná los usuarios del sistema. Cada uno tiene su propio usuario y clave, y permisos editables.</p>
      </div>

      {/* Botón agregar */}
      {!agregarOpen && (
        <button
          onClick={() => setAgregarOpen(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          ➕ Agregar nuevo vendedor
        </button>
      )}

      {/* Form agregar */}
      {agregarOpen && (
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '2px solid var(--accent-soft-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Nuevo vendedor</h2>
            <button onClick={() => { setAgregarOpen(false); setNError(''); }} className="px-2 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nombre completo *"><input type="text" value={nNombre} onChange={e => setNNombre(e.target.value)} placeholder="Juan Pérez" className="input" /></Campo>
            <Campo label="Email *" hint="Será el usuario para ingresar"><input type="email" value={nEmail} onChange={e => setNEmail(e.target.value.toLowerCase())} placeholder="nombre@fotonmalaspina.com" className="input" inputMode="email" autoCapitalize="none" autoCorrect="off" /></Campo>
            <Campo label="WhatsApp"><InputTelefono value={nWA} onChange={setNWA} /></Campo>
            <div></div>
            <Campo label="Clave *" hint="Mínimo 4 caracteres"><input type="password" value={nClave} onChange={e => setNClave(e.target.value)} placeholder="••••••" className="input" /></Campo>
            <Campo label="Confirmar clave *"><input type="password" value={nConfirmar} onChange={e => setNConfirmar(e.target.value)} placeholder="••••••" className="input" /></Campo>
          </div>
          {nError && <div className="mt-3 rounded p-3 text-xs" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>⚠️ {nError}</div>}
          <button onClick={agregar} className="mt-4 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
            Crear vendedor
          </button>
        </div>
      )}

      {/* Lista de vendedores */}
      <div className="space-y-3">
        {vendedores.map(v => {
          const editando = editandoId === v.id;
          const cambiandoClave = cambiandoClaveId === v.id;
          const esEsteUsuario = v.id === usuarioActual?.id;
          const esAdminV = v.rol === 'admin';
          return (
            <div key={v.id} className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: `1px solid ${esAdminV ? 'rgba(220, 38, 38, 0.3)' : 'var(--border)'}` }}>
              {/* Header */}
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: esAdminV ? '#dc2626' : 'var(--accent)', color: 'white' }}>
                  {v.nombre.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                    {v.nombre}
                    {esAdminV && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: '#dc2626', color: 'white' }}>Admin</span>}
                    {esEsteUsuario && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: 'var(--accent-soft)', color: 'var(--text-secondary)' }}>Tú</span>}
                    {!v.activo && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-muted)' }}>Desactivado</span>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{getLogin(v)} {v.whatsapp && `· ${v.whatsapp}`}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setEditandoId(editando ? null : v.id)} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{editando ? 'Cerrar' : '✏️ Editar'}</button>
                  <button onClick={() => setCambiandoClaveId(cambiandoClave ? null : v.id)} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>🔑 Clave</button>
                  {!esEsteUsuario && <button onClick={() => cambiarRol(v.id)} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{esAdminV ? '↓ Vendedor' : '↑ Admin'}</button>}
                  {!esEsteUsuario && <button onClick={() => toggleActivo(v.id)} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: v.activo ? '#ea580c' : '#16a34a', border: '1px solid var(--border)' }}>{v.activo ? '⏸ Desactivar' : '▶ Activar'}</button>}
                  {!esEsteUsuario && <button onClick={() => eliminar(v.id)} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-2)', color: '#dc2626', border: '1px solid var(--border)' }}>🗑️</button>}
                </div>
              </div>

              {/* Cambiar clave */}
              {cambiandoClave && (
                <div className="rounded p-3 mb-3" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>🔑 Cambiar clave de {v.nombre}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <input type="password" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Nueva clave" className="input" />
                    <input type="password" value={confirmarClave} onChange={e => setConfirmarClave(e.target.value)} placeholder="Confirmar" className="input" />
                  </div>
                  <button onClick={() => guardarNuevaClave(v.id)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>Guardar nueva clave</button>
                </div>
              )}

              {/* Editar datos */}
              {editando && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Campo label="Nombre"><input type="text" value={v.nombre} onChange={e => actualizar(v.id, 'nombre', e.target.value)} className="input" /></Campo>
                  <Campo label="WhatsApp"><InputTelefono value={v.whatsapp || ''} onChange={val => actualizar(v.id, 'whatsapp', val)} /></Campo>
                </div>
              )}

              {/* Permisos */}
              <div className="rounded p-3" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Permisos {esAdminV && <span className="ml-2 font-normal text-[10px] normal-case opacity-70">(admin tiene acceso completo)</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(PERMISOS_DISPONIBLES).map(([key, info]) => (
                    <label key={key} className="flex items-start gap-2 cursor-pointer text-xs" style={{ opacity: esAdminV ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={esAdminV ? true : (v.permisos?.[key] ?? false)}
                        disabled={esAdminV}
                        onChange={() => togglePermiso(v.id, key)}
                        className="mt-0.5 accent-amber-400 w-3.5 h-3.5"
                      />
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{info.nombre}</div>
                        <div className="opacity-70" style={{ color: 'var(--text-muted)' }}>{info.descripcion}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CONFIG: MODELOS FOTON, TASAS, GENERAL Y QUÉ AUTOS
// (mismo de v3, repetido aquí para que el archivo sea autocontenido)
// ============================================================

function ConfigModelosFoton({ modelos, setModelos }) {
  const [filtroLinea, setFiltroLinea] = useState('todos');
  const lineas = [...new Set(modelos.map(m => m.linea))];

  const actualizarVersion = (modeloId, versionId, campo, valor) => {
    setModelos(modelos.map(m => {
      if (m.id !== modeloId) return m;
      return { ...m, versiones: m.versiones.map(v => v.id === versionId ? { ...v, [campo]: valor } : v) };
    }));
  };

  const toggleVisible = (modeloId) => {
    setModelos(modelos.map(m => m.id === modeloId ? { ...m, visible: m.visible === false ? true : false } : m));
  };

  const filtrados = filtroLinea === 'todos' ? modelos : modelos.filter(m => m.linea === filtroLinea);
  const totalVisibles = modelos.filter(m => m.visible !== false).length;
  const totalOcultos = modelos.length - totalVisibles;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-stone-400">Cada modelo tiene <span className="text-amber-400 font-semibold">📋 Lista Convencional</span> y <span className="text-red-400 font-semibold">🏭 Lista Directa al 9%</span> (Venta Directa).</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded font-semibold" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)' }}>👁 {totalVisibles} visibles</span>
          {totalOcultos > 0 && <span className="px-2.5 py-1 rounded font-semibold" style={{ background: 'rgba(120, 113, 108, 0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>🚫 {totalOcultos} ocultos</span>}
        </div>
      </div>

      <div className="rounded p-3 text-xs" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        💡 <strong>Tilde "Visible"</strong>: solo los modelos tildados aparecen en el simulador y en las proformas. Útil cuando un modelo está fuera de stock o no se ofrece más.
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroLinea('todos')} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtroLinea === 'todos' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Todas</button>
        {lineas.map(l => (
          <button key={l} onClick={() => setFiltroLinea(l)} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtroLinea === l ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtrados.map(m => {
          const visible = m.visible !== false; // default true
          return (
          <div key={m.id} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden" style={{ opacity: visible ? 1 : 0.55 }}>
            <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer" title={visible ? 'Modelo visible' : 'Modelo oculto'}>
                  <input type="checkbox" checked={visible} onChange={() => toggleVisible(m.id)} className="accent-amber-400 w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: visible ? '#15803d' : 'var(--text-muted)' }}>{visible ? '👁 Visible' : '🚫 Oculto'}</span>
                </label>
                <Truck size={16} className="text-amber-400" />
                <h3 className="font-bold text-stone-100">{m.nombre}</h3>
                <span className="text-xs text-stone-500">· {m.linea} · grupo tasa: {GRUPOS_TASA_INFO[m.grupoTasa] || m.grupoTasa}</span>
              </div>
              <span className="text-xs text-stone-500">{m.versiones.length} versión{m.versiones.length !== 1 && 'es'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-950 text-stone-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-2">Versión</th>
                    <th className="text-center p-2 w-20">Mon.</th>
                    <th className="text-right p-2 w-44">📋 Convencional</th>
                    <th className="text-center p-2 w-20 border-l-2" style={{ borderColor: 'rgba(220,38,38,0.4)' }}>Mon.</th>
                    <th className="text-right p-2 w-44" style={{ color: '#fca5a5' }}>🏭 Directa al 9%</th>
                  </tr>
                </thead>
                <tbody>
                  {m.versiones.map(v => (
                    <tr key={v.id} className="border-t border-stone-800">
                      <td className="p-2 text-stone-200 font-semibold">{v.nombre}</td>
                      <td className="p-1.5">
                        <select value={v.monedaPublica} onChange={e => actualizarVersion(m.id, v.id, 'monedaPublica', e.target.value)} className="input text-xs">
                          <option>ARS</option><option>USD</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input type="number" value={v.precioPublico || ''} onChange={e => actualizarVersion(m.id, v.id, 'precioPublico', parseFloat(e.target.value) || 0)} placeholder="0" className="input text-right text-xs" />
                      </td>
                      <td className="p-1.5 border-l-2" style={{ borderColor: 'rgba(220,38,38,0.4)' }}>
                        <select value={v.monedaVentaDirecta || 'ARS'} onChange={e => actualizarVersion(m.id, v.id, 'monedaVentaDirecta', e.target.value)} className="input text-xs">
                          <option>ARS</option><option>USD</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input type="number" value={v.precioVentaDirecta || ''} onChange={e => actualizarVersion(m.id, v.id, 'precioVentaDirecta', parseFloat(e.target.value) || 0)} placeholder="0" className="input text-right text-xs" style={{ borderColor: v.precioVentaDirecta > 0 ? '#dc2626' : undefined }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfigTasasFoton({ tasas, setTasas }) {
  const grupos = Object.keys(tasas);
  const [grupoId, setGrupoId] = useState(grupos[0] || '');
  const [plan, setPlan] = useState('pesos');
  const grupoData = tasas[grupoId];
  if (!grupoData) return <div className="text-stone-400">Sin grupos de tasa.</div>;
  const planData = grupoData[plan];

  const actualizarTasaPesos = (banco, plazo, valor) => {
    setTasas({ ...tasas, [grupoId]: { ...tasas[grupoId], pesos: { ...tasas[grupoId].pesos, bancos: { ...tasas[grupoId].pesos.bancos, [banco]: { ...tasas[grupoId].pesos.bancos[banco], [plazo]: valor === '' ? null : parseFloat(valor) } } } } });
  };
  const actualizarTasaOtro = (banco, plazo, valor) => {
    const planActual = { ...tasas[grupoId][plan] };
    planActual[banco] = { ...planActual[banco], [plazo]: valor === '' ? null : parseFloat(valor) };
    setTasas({ ...tasas, [grupoId]: { ...tasas[grupoId], [plan]: planActual } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-stone-400">Grupo de tasa:</span>
        <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className="input" style={{ maxWidth: 320 }}>
          {grupos.map(g => <option key={g} value={g}>{GRUPOS_TASA_INFO[g] || g}</option>)}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(PLAN_INFO).map(([key, info]) => {
          const disponible = grupoData[key] !== null && grupoData[key] !== undefined;
          return <button key={key} onClick={() => disponible && setPlan(key)} disabled={!disponible} className={`px-3 py-2 rounded text-sm font-semibold flex items-center gap-2 ${plan === key ? 'bg-amber-400 text-stone-950' : disponible ? 'bg-stone-800 text-stone-300' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>{info.icon} {info.nombre}</button>;
        })}
      </div>
      <p className="text-xs text-stone-500">Dejá vacío si el plazo no aplica.</p>
      {plan === 'pesos' && planData && (
        <div className="space-y-3">
          {Object.entries(planData.bancos || {}).map(([bk, plazos]) => (
            <BancoTasasCard key={bk} bk={bk} plazos={plazos} onChange={(plazo, valor) => actualizarTasaPesos(bk, plazo, valor)} />
          ))}
        </div>
      )}
      {plan !== 'pesos' && planData && (
        <div className="space-y-3">
          {Object.entries(planData).filter(([k]) => !['pctFinanciable', 'montoFinanciableFijo'].includes(k)).map(([bk, plazos]) => (
            (plazos && typeof plazos === 'object') && <BancoTasasCard key={bk} bk={bk} plazos={plazos} onChange={(plazo, valor) => actualizarTasaOtro(bk, plazo, valor)} />
          ))}
        </div>
      )}
      {!planData && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-400">Este grupo no tiene plan {PLAN_INFO[plan].nombre}.</div>}
      <div className="text-xs text-stone-500 flex items-center gap-1.5 pt-2"><Save size={12} className="text-green-400" /> Guardado automáticamente</div>
    </div>
  );
}

function BancoTasasCard({ bk, plazos, onChange }) {
  const info = BANCOS_INFO_FOTON[bk];
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5" style={{ background: info?.color || '#666' }}><span className="font-bold text-white text-sm">{info?.nombre || bk}</span></div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.keys(plazos).length === 0 ? <div className="col-span-full text-xs text-stone-500 italic">Sin plazos</div> : Object.entries(plazos).map(([plazo, tasa]) => (
          <Campo key={plazo} label={`${plazo} meses`}>
            <div className="relative">
              <input type="number" step="0.1" value={tasa === null || tasa === undefined ? '' : tasa} onChange={e => onChange(plazo, e.target.value)} placeholder="—" className="input pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
            </div>
          </Campo>
        ))}
      </div>
    </div>
  );
}

function ConfigGeneralFoton({ config, setConfig }) {
  return (
    <div className="space-y-4">
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">Cálculo de cuotas</h3>
        <Campo label="Modo de tasa" hint="Probá con un caso real y mirá cuál te da la cuota igual a la de fábrica.">
          <select value={config.modoTasa} onChange={e => setConfig({ ...config, modoTasa: e.target.value })} className="input">
            <option value="tna">TNA + Sistema francés (cuota fija)</option>
            <option value="fija">Tasa fija directa: capital × (1+tasa) ÷ plazo</option>
          </select>
        </Campo>
        <Campo label="Cotización del dólar (ARS)" hint="Se usa para convertir precios USD a pesos en cotizaciones. Default: $1.450.">
          <input type="number" value={config.cotizacionDolar} onChange={e => setConfig({ ...config, cotizacionDolar: parseFloat(e.target.value) || 0 })} className="input" placeholder="1450" />
        </Campo>
        <Campo label="Gasto de patentamiento (% sobre valor de unidad)" hint="Predeterminado 6%. Se aplica automáticamente a cada presupuesto y queda editable por operación.">
          <input type="number" step="0.1" value={config.gastoPatentamientoPct ?? 6} onChange={e => setConfig({ ...config, gastoPatentamientoPct: parseFloat(e.target.value) || 0 })} className="input" placeholder="6" />
        </Campo>
        <Campo label="Gastos de otorgamiento de crédito (%)" hint="Default 1%. Se SUMA al capital a financiar. Aplica solo en Convencional (no en Venta Directa ni Contado).">
          <input type="number" step="0.1" value={config.gastosOtorgPct ?? 1} onChange={e => setConfig({ ...config, gastosOtorgPct: parseFloat(e.target.value) || 0 })} className="input" placeholder="1" />
        </Campo>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" checked={config.ivaSobreIntereses} onChange={e => setConfig({ ...config, ivaSobreIntereses: e.target.checked })} className="accent-amber-400" />
          IVA 21% sobre intereses
        </label>
      </div>
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">Quebrantos</h3>
        <p className="text-xs text-stone-500">Según circular: se cobran por fuera de factura como Gastos de Otorgamiento.</p>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Terminal (%)"><input type="number" step="0.1" value={config.quebrantoTerminal} onChange={e => setConfig({ ...config, quebrantoTerminal: parseFloat(e.target.value) || 0 })} className="input" /></Campo>
          <Campo label="Dealer (%)"><input type="number" step="0.1" value={config.quebrantoDealer} onChange={e => setConfig({ ...config, quebrantoDealer: parseFloat(e.target.value) || 0 })} className="input" /></Campo>
        </div>
        <div className="text-sm text-amber-400 font-bold">Total: {config.quebrantoTerminal + config.quebrantoDealer}%</div>
      </div>
    </div>
  );
}

// ============================================================
// MÓDULO FORMULARIOS
// ============================================================

const TIPOS_FORMULARIO = {
  pf: { nombre: 'Datero Persona Física', icon: <User size={14} />, color: '#0ea5e9' },
  pj: { nombre: 'Datero Persona Jurídica', icon: <Building2 size={14} />, color: '#a855f7' },
  ac: { nombre: 'Alta Cliente Corven', icon: <FileSignature size={14} />, color: '#f59e0b' },
  proforma: { nombre: 'Proforma', icon: <FileText size={14} />, color: '#10b981' },
  patentamientoPF: { nombre: 'Pedido de Patentamiento (PF)', icon: <Award size={14} />, color: '#dc2626' },
  patentamientoPJ: { nombre: 'Pedido de Patentamiento (PJ)', icon: <Award size={14} />, color: '#dc2626' },
};

function ModuloFormularios({ formularios, onGuardar, onEliminar, onVer, vendedores, contadores, modelosFoton = [], configFoton = {}, vistaInicial = 'lista', soloTipo = null, onSalir = null }) {
  const [vista, setVista] = useState(vistaInicial);

  // Si soloTipo está definido, mostramos solo ese formulario (PF, PJ o AC)
  // y al cancelar/guardar volvemos a la pantalla anterior
  const handleCancelar = () => {
    if (onSalir) onSalir();
    else setVista('lista');
  };
  const handleGuardado = async (d, tipo) => {
    const f = await onGuardar({ ...d, tipo });
    if (onSalir) onSalir();
    else setVista('lista');
    onVer(f);
  };

  if (vista === 'pf') return <FormularioPF onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'pf')} vendedores={vendedores} proxNumero={(contadores.pf || 0) + 1} />;
  if (vista === 'pj') return <FormularioPJ onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'pj')} vendedores={vendedores} proxNumero={(contadores.pj || 0) + 1} />;
  if (vista === 'ac') return <FormularioAC onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'ac')} vendedores={vendedores} proxNumero={(contadores.ac || 0) + 1} />;
  if (vista === 'patentamientoPF') return <FormularioPatentamientoPF onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'patentamientoPF')} vendedores={vendedores} proxNumero={(contadores.patentamientoPF || 0) + 1} />;
  if (vista === 'patentamientoPJ') return <FormularioPatentamientoPJ onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'patentamientoPJ')} vendedores={vendedores} proxNumero={(contadores.patentamientoPJ || 0) + 1} />;
  if (vista === 'proforma') return <FormularioProforma onCancelar={handleCancelar} onGuardar={(d) => handleGuardado(d, 'proforma')} vendedores={vendedores} proxNumero={(contadores.proforma || 0) + 1} modelosFoton={modelosFoton} configFoton={configFoton} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Crear nuevo formulario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(TIPOS_FORMULARIO).map(([key, info]) => (
            <button key={key} onClick={() => setVista(key)} className="bg-stone-900 border border-stone-800 hover:border-amber-400/40 rounded-lg p-5 text-left transition group">
              <div className="flex items-center gap-2 mb-2" style={{ color: info.color }}>{info.icon}<span className="text-xs uppercase tracking-wider font-bold">Nuevo</span></div>
              <div className="text-stone-100 font-bold text-base">{info.nombre}</div>
              <div className="text-xs text-stone-500 mt-2">
                {key === 'pf' && 'Datos del solicitante, cónyuge, laboral y bienes'}
                {key === 'pj' && 'Datos de la empresa y hasta 3 socios'}
                {key === 'ac' && 'Alta de cliente para Corven Motors'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Formularios guardados · {formularios.length}</h2>
        {formularios.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-500">Aún no hay formularios guardados.</div>
        ) : (
          <div className="space-y-2">
            {formularios.map(f => (
              <div key={f.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4 hover:border-amber-400/30 transition">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ color: TIPOS_FORMULARIO[f.tipo].color }}>{TIPOS_FORMULARIO[f.tipo].icon}</span>
                      <span className="text-amber-400 font-black text-sm">{f.numero}</span>
                      <span className="text-stone-500 text-xs">·</span>
                      <span className="text-stone-300 text-sm">{formatFecha(f.fechaCreacion)}</span>
                    </div>
                    <div className="text-stone-100 font-semibold mt-1">{f.cliente || f.razonSocial || '—'}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{TIPOS_FORMULARIO[f.tipo].nombre} · {f.vendedor?.nombre || '—'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onVer(f)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-semibold flex items-center gap-1.5"><Eye size={12} /> Ver</button>
                    <button onClick={() => { if (confirm(`¿Eliminar ${f.numero}?`)) onEliminar(f.id); }} className="px-2 py-1.5 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =========== Header común del formulario (vendedor + número) ===========
function FormHeader({ tipo, proxNumero, vendedores, vendedorId, setVendedorId }) {
  const año = new Date().getFullYear();
  const prefijo = { pf: 'PF', pj: 'PJ', ac: 'AC', proforma: 'PROF', patentamientoPF: 'PAT-PF', patentamientoPJ: 'PAT-PJ' }[tipo] || 'F';
  return (
    <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1"><Hash size={12} /> Próximo número</div>
          <div className="text-amber-400 font-black text-lg">{prefijo}-{año}-{String(proxNumero).padStart(4, '0')}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1"><Calendar size={12} /> Fecha</div>
          <div className="text-stone-200 font-bold">{formatFecha(new Date())}</div>
        </div>
        <Campo label="Vendedor">
          {vendedores.length === 0 ? (
            <div className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded p-2">Cargá vendedores primero</div>
          ) : (
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              <option value="">— Elegir —</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          )}
        </Campo>
      </div>
    </section>
  );
}

// =========== Sección de formulario reutilizable ===========
function FormSeccion({ titulo, children, cols = 2 }) {
  const gridCols = cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2';
  return (
    <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">{titulo}</h2>
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>{children}</div>
    </section>
  );
}

// ============================================================
// FORMULARIO PF (Persona Física)
// ============================================================

function FormularioPF({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [d, setD] = useState({
    // Solicitante
    cuit: '', nombre: '', apellido: '', posicionIVA: '', nacionalidad: 'ARGENTINO', estadoCivil: '', fechaNacimiento: '',
    // Cónyuge
    conyugeTipoDoc: '', conyugeNumDoc: '', conyugeNombre: '', conyugeApellido: '', conyugePosicionIVA: '', conyugeNacionalidad: '', conyugeFechaNac: '', conyugeSitLaboral: '', conyugeActividad: '', conyugeProfesion: '',
    // Domicilio
    cp: '', provincia: '', localidad: '', calle: '', numero: '', piso: '', tipoTelefono: 'CELULAR', caracteristica: '', telefono: '', email: '',
    // Laboral
    sitLaboral: '', actividadEconomica: '', profesion: '', puesto: '', antiguedad: '', facturacionMensual: '', empresa: '', cuitEmpresa: '', cpEmpresa: '', provLocEmpresa: '', calleEmpresa: '', numeroEmpresa: '', telefonoLaboral: '', ramaEconomica: '', ocupaPersonal: '', cantEmpleados: '',
    // Bienes
    inmuebles: [{ tipo: '', direccion: '', mts: '', valuacion: '' }],
    rodados: [{ marcaModelo: '', cantidad: '', valuacion: '' }],
    deudas: [{ banco: '', tipoDeuda: '', cuota: '', saldo: '' }],
    // Referencias
    ref1Razon: '', ref1Tel: '', ref2Razon: '', ref2Tel: '',
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });
  const updArr = (campo, idx, key, valor) => {
    const arr = [...d[campo]];
    arr[idx] = { ...arr[idx], [key]: valor };
    setD({ ...d, [campo]: arr });
  };
  const addRow = (campo, vacio) => setD({ ...d, [campo]: [...d[campo], vacio] });
  const delRow = (campo, idx) => setD({ ...d, [campo]: d[campo].filter((_, i) => i !== idx) });

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.nombre && !d.apellido) { alert('Cargá al menos nombre y apellido'); return; }
    onGuardar({ ...d, cliente: `${d.nombre} ${d.apellido}`.trim(), vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4"><LogoFoton size="md" color="dark" /><h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DATERO PERSONA FÍSICA</h1></div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <FormHeader tipo="pf" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos del solicitante" cols={3}>
        <Campo label="CUIT / CUIL *"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} /></Campo>
        <Campo label="Nombre *"><input type="text" value={d.nombre} onChange={e => upd('nombre', e.target.value)} className="input" /></Campo>
        <Campo label="Apellido *"><input type="text" value={d.apellido} onChange={e => upd('apellido', e.target.value)} className="input" /></Campo>
        <Campo label="Posición frente al IVA">
          <select value={d.posicionIVA} onChange={e => upd('posicionIVA', e.target.value)} className="input">
            <option value="">—</option>
            <option>RESPONSABLE INSCRIPTO</option>
            <option>MONOTRIBUTO</option>
            <option>EXENTO</option>
            <option>CONSUMIDOR FINAL</option>
          </select>
        </Campo>
        <Campo label="Nacionalidad"><input type="text" value={d.nacionalidad} onChange={e => upd('nacionalidad', e.target.value)} className="input" /></Campo>
        <Campo label="Estado civil">
          <select value={d.estadoCivil} onChange={e => upd('estadoCivil', e.target.value)} className="input">
            <option value="">—</option>
            <option>SOLTERO/A</option><option>CASADO/A</option><option>DIVORCIADO/A</option><option>VIUDO/A</option><option>CONCUBINATO</option>
          </select>
        </Campo>
        <Campo label="Fecha de nacimiento"><input type="date" value={d.fechaNacimiento} onChange={e => upd('fechaNacimiento', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      {(d.estadoCivil === 'CASADO/A' || d.estadoCivil === 'CONCUBINATO') && (
        <FormSeccion titulo="Datos del cónyuge" cols={3}>
          <Campo label="Tipo doc">
            <select value={d.conyugeTipoDoc} onChange={e => upd('conyugeTipoDoc', e.target.value)} className="input">
              <option value="">—</option><option>DNI</option><option>LE</option><option>LC</option><option>CI</option>
            </select>
          </Campo>
          <Campo label="N° documento"><input type="text" value={d.conyugeNumDoc} onChange={e => upd('conyugeNumDoc', e.target.value)} className="input" /></Campo>
          <Campo label="Nombre"><input type="text" value={d.conyugeNombre} onChange={e => upd('conyugeNombre', e.target.value)} className="input" /></Campo>
          <Campo label="Apellido"><input type="text" value={d.conyugeApellido} onChange={e => upd('conyugeApellido', e.target.value)} className="input" /></Campo>
          <Campo label="Posición IVA">
            <select value={d.conyugePosicionIVA} onChange={e => upd('conyugePosicionIVA', e.target.value)} className="input">
              <option value="">—</option><option>RESPONSABLE INSCRIPTO</option><option>MONOTRIBUTO</option><option>EXENTO</option><option>CONSUMIDOR FINAL</option>
            </select>
          </Campo>
          <Campo label="Nacionalidad"><input type="text" value={d.conyugeNacionalidad} onChange={e => upd('conyugeNacionalidad', e.target.value)} className="input" /></Campo>
          <Campo label="Fecha nacimiento"><input type="date" value={d.conyugeFechaNac} onChange={e => upd('conyugeFechaNac', e.target.value)} className="input" /></Campo>
          <Campo label="Situación laboral"><input type="text" value={d.conyugeSitLaboral} onChange={e => upd('conyugeSitLaboral', e.target.value)} className="input" placeholder="Autónomo / Empleado" /></Campo>
          <Campo label="Actividad económica"><input type="text" value={d.conyugeActividad} onChange={e => upd('conyugeActividad', e.target.value)} className="input" /></Campo>
          <Campo label="Profesión"><input type="text" value={d.conyugeProfesion} onChange={e => upd('conyugeProfesion', e.target.value)} className="input" /></Campo>
        </FormSeccion>
      )}

      <FormSeccion titulo="Domicilio particular" cols={3}>
        <Campo label="Código postal"><input type="text" value={d.cp} onChange={e => upd('cp', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia"><input type="text" value={d.provincia} onChange={e => upd('provincia', e.target.value)} className="input" /></Campo>
        <Campo label="Localidad"><input type="text" value={d.localidad} onChange={e => upd('localidad', e.target.value)} className="input" /></Campo>
        <Campo label="Calle"><input type="text" value={d.calle} onChange={e => upd('calle', e.target.value)} className="input" /></Campo>
        <Campo label="Número"><input type="text" value={d.numero} onChange={e => upd('numero', e.target.value)} className="input" /></Campo>
        <Campo label="Piso/Dpto"><input type="text" value={d.piso} onChange={e => upd('piso', e.target.value)} className="input" /></Campo>
        <Campo label="Tipo teléfono">
          <select value={d.tipoTelefono} onChange={e => upd('tipoTelefono', e.target.value)} className="input">
            <option>CELULAR</option><option>FIJO</option>
          </select>
        </Campo>
        <Campo label="Característica"><input type="text" value={d.caracteristica} onChange={e => upd('caracteristica', e.target.value)} className="input" placeholder="2392" /></Campo>
        <Campo label="Número teléfono"><input type="text" value={d.telefono} onChange={e => upd('telefono', e.target.value)} className="input" /></Campo>
        <Campo label="Email"><input type="email" value={d.email} onChange={e => upd('email', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Datos laborales" cols={3}>
        <Campo label="Situación laboral">
          <select value={d.sitLaboral} onChange={e => upd('sitLaboral', e.target.value)} className="input">
            <option value="">—</option><option>AUTONOMO</option><option>EMPLEADO</option><option>JUBILADO</option>
          </select>
        </Campo>
        <Campo label="Actividad económica"><input type="text" value={d.actividadEconomica} onChange={e => upd('actividadEconomica', e.target.value)} className="input" /></Campo>
        <Campo label="Profesión"><input type="text" value={d.profesion} onChange={e => upd('profesion', e.target.value)} className="input" /></Campo>
        <Campo label="Puesto"><input type="text" value={d.puesto} onChange={e => upd('puesto', e.target.value)} className="input" /></Campo>
        <Campo label="Antigüedad (años)"><input type="number" value={d.antiguedad} onChange={e => upd('antiguedad', e.target.value)} className="input" /></Campo>
        <Campo label="Facturación mensual"><InputDinero value={d.facturacionMensual} onChange={v => upd('facturacionMensual', v)} placeholder="$ 0" /></Campo>
        <Campo label="Empresa"><input type="text" value={d.empresa} onChange={e => upd('empresa', e.target.value)} className="input" /></Campo>
        <Campo label="CUIT empresa"><InputCUIT value={d.cuitEmpresa} onChange={v => upd('cuitEmpresa', v)} placeholder="30-12345678-9" /></Campo>
        <Campo label="CP empresa"><input type="text" value={d.cpEmpresa} onChange={e => upd('cpEmpresa', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia - Localidad"><input type="text" value={d.provLocEmpresa} onChange={e => upd('provLocEmpresa', e.target.value)} className="input" /></Campo>
        <Campo label="Calle"><input type="text" value={d.calleEmpresa} onChange={e => upd('calleEmpresa', e.target.value)} className="input" /></Campo>
        <Campo label="Número"><input type="text" value={d.numeroEmpresa} onChange={e => upd('numeroEmpresa', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono laboral"><input type="text" value={d.telefonoLaboral} onChange={e => upd('telefonoLaboral', e.target.value)} className="input" /></Campo>
        <Campo label="Rama económica"><input type="text" value={d.ramaEconomica} onChange={e => upd('ramaEconomica', e.target.value)} className="input" /></Campo>
        <Campo label="¿Ocupa personal?">
          <select value={d.ocupaPersonal} onChange={e => upd('ocupaPersonal', e.target.value)} className="input">
            <option value="">—</option><option>SI</option><option>NO</option>
          </select>
        </Campo>
        <Campo label="Cantidad empleados"><input type="number" value={d.cantEmpleados} onChange={e => upd('cantEmpleados', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      {/* Bienes - Inmuebles */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Manifestación de bienes — Inmuebles</h2>
          <button onClick={() => addRow('inmuebles', { tipo: '', direccion: '', mts: '', valuacion: '' })} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>
        </div>
        {d.inmuebles.map((it, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2">
            <input type="text" placeholder="Tipo (casa/depto/lote)" value={it.tipo} onChange={e => updArr('inmuebles', i, 'tipo', e.target.value)} className="input sm:col-span-3" />
            <input type="text" placeholder="Dirección" value={it.direccion} onChange={e => updArr('inmuebles', i, 'direccion', e.target.value)} className="input sm:col-span-4" />
            <input type="text" placeholder="Mts²" value={it.mts} onChange={e => updArr('inmuebles', i, 'mts', e.target.value)} className="input sm:col-span-2" />
            <input type="text" inputMode="decimal" placeholder="Valuación" value={it.valuacion} onChange={e => updArr('inmuebles', i, 'valuacion', e.target.value)} className="input sm:col-span-2" />
            <button onClick={() => delRow('inmuebles', i)} className="px-2 py-1 bg-stone-800 hover:bg-red-900 text-stone-400 rounded sm:col-span-1 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
      </section>

      {/* Bienes - Rodados */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Rodados</h2>
          <button onClick={() => addRow('rodados', { marcaModelo: '', cantidad: '', valuacion: '' })} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>
        </div>
        {d.rodados.map((it, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2">
            <input type="text" placeholder="Marca / Modelo / Año" value={it.marcaModelo} onChange={e => updArr('rodados', i, 'marcaModelo', e.target.value)} className="input sm:col-span-6" />
            <input type="text" placeholder="Cantidad" value={it.cantidad} onChange={e => updArr('rodados', i, 'cantidad', e.target.value)} className="input sm:col-span-2" />
            <input type="text" inputMode="decimal" placeholder="Valuación" value={it.valuacion} onChange={e => updArr('rodados', i, 'valuacion', e.target.value)} className="input sm:col-span-3" />
            <button onClick={() => delRow('rodados', i)} className="px-2 py-1 bg-stone-800 hover:bg-red-900 text-stone-400 rounded sm:col-span-1 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
      </section>

      {/* Deudas */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Deudas</h2>
          <button onClick={() => addRow('deudas', { banco: '', tipoDeuda: '', cuota: '', saldo: '' })} className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>
        </div>
        {d.deudas.map((it, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-2">
            <input type="text" placeholder="Banco / Acreedor" value={it.banco} onChange={e => updArr('deudas', i, 'banco', e.target.value)} className="input sm:col-span-3" />
            <input type="text" placeholder="Tipo de deuda" value={it.tipoDeuda} onChange={e => updArr('deudas', i, 'tipoDeuda', e.target.value)} className="input sm:col-span-3" />
            <input type="text" inputMode="decimal" placeholder="Cuota" value={it.cuota} onChange={e => updArr('deudas', i, 'cuota', e.target.value)} className="input sm:col-span-2" />
            <input type="text" inputMode="decimal" placeholder="Saldo" value={it.saldo} onChange={e => updArr('deudas', i, 'saldo', e.target.value)} className="input sm:col-span-3" />
            <button onClick={() => delRow('deudas', i)} className="px-2 py-1 bg-stone-800 hover:bg-red-900 text-stone-400 rounded sm:col-span-1 flex items-center justify-center"><Trash2 size={14} /></button>
          </div>
        ))}
      </section>

      <FormSeccion titulo="Referencias comerciales" cols={2}>
        <Campo label="Cliente 1 - Razón Social"><input type="text" value={d.ref1Razon} onChange={e => upd('ref1Razon', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><input type="text" value={d.ref1Tel} onChange={e => upd('ref1Tel', e.target.value)} className="input" /></Campo>
        <Campo label="Cliente 2 - Razón Social"><input type="text" value={d.ref2Razon} onChange={e => upd('ref2Razon', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><input type="text" value={d.ref2Tel} onChange={e => upd('ref2Tel', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <button onClick={handleGuardar} className="w-full px-5 py-3.5 bg-amber-400 text-stone-950 rounded-lg font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-300 transition">
        <Save size={18} /> Guardar y generar PDF
      </button>
    </div>
  );
}

// ============================================================
// FORMULARIO PJ (Persona Jurídica)
// ============================================================

function FormularioPJ({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [d, setD] = useState({
    cuit: '', razonSocial: '', posicionIVA: '', actividadPrincipal: '', actividadSecundaria: '', antiguedadRubro: '',
    socios: [{ nombre: '', porcentaje: '', antiguedad: '', cuit: '', nacionalidad: '', estadoCivil: '', sexo: '', fechaNac: '', hijosACargo: '' }],
    // Domicilio legal
    legalDomicilio: '', legalCP: '', legalProvincia: '', legalLocalidad: '', legalCalle: '', legalNumero: '', legalPiso: '', legalTipoTel: 'FIJO', legalCaracteristica: '', legalTelefono: '', legalEmail: '',
    // Domicilio comercial
    comDomicilio: '', comCP: '', comProvincia: '', comLocalidad: '', comCalle: '', comNumero: '', comPiso: '', comTipoTel: 'FIJO', comCaracteristica: '', comTelefono: '', comEmail: '',
    // Referencias
    ref1RazonSocial: '', ref1Contacto: '', ref1CP: '', ref1Provincia: '', ref1Localidad: '', ref1Calle: '', ref1Numero: '', ref1Piso: '', ref1TipoTel: 'FIJO', ref1Caracteristica: '', ref1Telefono: '',
    ref2RazonSocial: '', ref2Contacto: '', ref2CP: '', ref2Provincia: '', ref2Localidad: '', ref2Calle: '', ref2Numero: '', ref2Piso: '', ref2TipoTel: 'FIJO', ref2Caracteristica: '', ref2Telefono: '',
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });
  const updSocio = (idx, key, valor) => {
    const arr = [...d.socios];
    arr[idx] = { ...arr[idx], [key]: valor };
    setD({ ...d, socios: arr });
  };
  const addSocio = () => {
    if (d.socios.length >= 3) return;
    setD({ ...d, socios: [...d.socios, { nombre: '', porcentaje: '', antiguedad: '', cuit: '', nacionalidad: '', estadoCivil: '', sexo: '', fechaNac: '', hijosACargo: '' }] });
  };
  const delSocio = (idx) => setD({ ...d, socios: d.socios.filter((_, i) => i !== idx) });

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.razonSocial) { alert('Cargá la razón social'); return; }
    onGuardar({ ...d, cliente: d.razonSocial, vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4"><LogoFoton size="md" color="dark" /><h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DATERO PERSONA JURÍDICA</h1></div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <FormHeader tipo="pj" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos del solicitante" cols={3}>
        <Campo label="CUIT *"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} placeholder="30-12345678-9" /></Campo>
        <Campo label="Razón social *"><input type="text" value={d.razonSocial} onChange={e => upd('razonSocial', e.target.value)} className="input" /></Campo>
        <Campo label="Posición frente al IVA">
          <select value={d.posicionIVA} onChange={e => upd('posicionIVA', e.target.value)} className="input">
            <option value="">—</option><option>RESPONSABLE INSCRIPTO</option><option>MONOTRIBUTO</option><option>EXENTO</option>
          </select>
        </Campo>
        <Campo label="Actividad principal"><input type="text" value={d.actividadPrincipal} onChange={e => upd('actividadPrincipal', e.target.value)} className="input" /></Campo>
        <Campo label="Actividad secundaria"><input type="text" value={d.actividadSecundaria} onChange={e => upd('actividadSecundaria', e.target.value)} className="input" /></Campo>
        <Campo label="Antigüedad en el rubro"><input type="text" value={d.antiguedadRubro} onChange={e => upd('antiguedadRubro', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      {/* Socios */}
      {d.socios.map((s, i) => (
        <section key={i} className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Socio / Accionista {i + 1}</h2>
            {d.socios.length > 1 && <button onClick={() => delSocio(i)} className="px-2 py-1 bg-stone-800 hover:bg-red-900 text-stone-400 rounded flex items-center gap-1 text-xs"><Trash2 size={12} /> Quitar</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Campo label="Nombre y apellido"><input type="text" value={s.nombre} onChange={e => updSocio(i, 'nombre', e.target.value)} className="input" /></Campo>
            <Campo label="Porcentaje"><input type="text" value={s.porcentaje} onChange={e => updSocio(i, 'porcentaje', e.target.value)} className="input" placeholder="50%" /></Campo>
            <Campo label="Antigüedad"><input type="text" value={s.antiguedad} onChange={e => updSocio(i, 'antiguedad', e.target.value)} className="input" /></Campo>
            <Campo label="CUIL/CUIT"><InputCUIT value={s.cuit} onChange={v => updSocio(i, 'cuit', v)} /></Campo>
            <Campo label="Nacionalidad"><input type="text" value={s.nacionalidad} onChange={e => updSocio(i, 'nacionalidad', e.target.value)} className="input" /></Campo>
            <Campo label="Estado civil">
              <select value={s.estadoCivil} onChange={e => updSocio(i, 'estadoCivil', e.target.value)} className="input">
                <option value="">—</option><option>SOLTERO/A</option><option>CASADO/A</option><option>DIVORCIADO/A</option><option>VIUDO/A</option>
              </select>
            </Campo>
            <Campo label="Sexo">
              <select value={s.sexo} onChange={e => updSocio(i, 'sexo', e.target.value)} className="input">
                <option value="">—</option><option>M</option><option>F</option>
              </select>
            </Campo>
            <Campo label="Fecha nacimiento"><input type="date" value={s.fechaNac} onChange={e => updSocio(i, 'fechaNac', e.target.value)} className="input" /></Campo>
            {i === d.socios.length - 1 && <Campo label="Hijos a cargo"><input type="number" value={s.hijosACargo} onChange={e => updSocio(i, 'hijosACargo', e.target.value)} className="input" /></Campo>}
          </div>
        </section>
      ))}
      {d.socios.length < 3 && (
        <button onClick={addSocio} className="w-full px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm font-semibold flex items-center justify-center gap-2"><Plus size={14} /> Agregar socio (máx. 3)</button>
      )}

      <FormSeccion titulo="Domicilio legal" cols={3}>
        <Campo label="Domicilio"><input type="text" value={d.legalDomicilio} onChange={e => upd('legalDomicilio', e.target.value)} className="input" /></Campo>
        <Campo label="Código postal"><input type="text" value={d.legalCP} onChange={e => upd('legalCP', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia"><input type="text" value={d.legalProvincia} onChange={e => upd('legalProvincia', e.target.value)} className="input" /></Campo>
        <Campo label="Localidad"><input type="text" value={d.legalLocalidad} onChange={e => upd('legalLocalidad', e.target.value)} className="input" /></Campo>
        <Campo label="Calle"><input type="text" value={d.legalCalle} onChange={e => upd('legalCalle', e.target.value)} className="input" /></Campo>
        <Campo label="Número"><input type="text" value={d.legalNumero} onChange={e => upd('legalNumero', e.target.value)} className="input" /></Campo>
        <Campo label="Piso/Dpto"><input type="text" value={d.legalPiso} onChange={e => upd('legalPiso', e.target.value)} className="input" /></Campo>
        <Campo label="Tipo teléfono">
          <select value={d.legalTipoTel} onChange={e => upd('legalTipoTel', e.target.value)} className="input">
            <option>FIJO</option><option>CELULAR</option>
          </select>
        </Campo>
        <Campo label="Característica"><input type="text" value={d.legalCaracteristica} onChange={e => upd('legalCaracteristica', e.target.value)} className="input" /></Campo>
        <Campo label="N° teléfono"><input type="text" value={d.legalTelefono} onChange={e => upd('legalTelefono', e.target.value)} className="input" /></Campo>
        <Campo label="Email"><input type="email" value={d.legalEmail} onChange={e => upd('legalEmail', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Domicilio comercial" cols={3}>
        <Campo label="Domicilio"><input type="text" value={d.comDomicilio} onChange={e => upd('comDomicilio', e.target.value)} className="input" /></Campo>
        <Campo label="Código postal"><input type="text" value={d.comCP} onChange={e => upd('comCP', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia"><input type="text" value={d.comProvincia} onChange={e => upd('comProvincia', e.target.value)} className="input" /></Campo>
        <Campo label="Localidad"><input type="text" value={d.comLocalidad} onChange={e => upd('comLocalidad', e.target.value)} className="input" /></Campo>
        <Campo label="Calle"><input type="text" value={d.comCalle} onChange={e => upd('comCalle', e.target.value)} className="input" /></Campo>
        <Campo label="Número"><input type="text" value={d.comNumero} onChange={e => upd('comNumero', e.target.value)} className="input" /></Campo>
        <Campo label="Piso/Dpto"><input type="text" value={d.comPiso} onChange={e => upd('comPiso', e.target.value)} className="input" /></Campo>
        <Campo label="Tipo teléfono">
          <select value={d.comTipoTel} onChange={e => upd('comTipoTel', e.target.value)} className="input">
            <option>FIJO</option><option>CELULAR</option>
          </select>
        </Campo>
        <Campo label="Característica"><input type="text" value={d.comCaracteristica} onChange={e => upd('comCaracteristica', e.target.value)} className="input" /></Campo>
        <Campo label="N° teléfono"><input type="text" value={d.comTelefono} onChange={e => upd('comTelefono', e.target.value)} className="input" /></Campo>
        <Campo label="Email"><input type="email" value={d.comEmail} onChange={e => upd('comEmail', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      {/* Referencias */}
      {[1, 2].map(n => (
        <FormSeccion key={n} titulo={`Cliente / Referencia comercial ${n}`} cols={3}>
          <Campo label="Razón social"><input type="text" value={d[`ref${n}RazonSocial`]} onChange={e => upd(`ref${n}RazonSocial`, e.target.value)} className="input" /></Campo>
          <Campo label="Contacto"><input type="text" value={d[`ref${n}Contacto`]} onChange={e => upd(`ref${n}Contacto`, e.target.value)} className="input" /></Campo>
          <Campo label="CP"><input type="text" value={d[`ref${n}CP`]} onChange={e => upd(`ref${n}CP`, e.target.value)} className="input" /></Campo>
          <Campo label="Provincia"><input type="text" value={d[`ref${n}Provincia`]} onChange={e => upd(`ref${n}Provincia`, e.target.value)} className="input" /></Campo>
          <Campo label="Localidad"><input type="text" value={d[`ref${n}Localidad`]} onChange={e => upd(`ref${n}Localidad`, e.target.value)} className="input" /></Campo>
          <Campo label="Calle"><input type="text" value={d[`ref${n}Calle`]} onChange={e => upd(`ref${n}Calle`, e.target.value)} className="input" /></Campo>
          <Campo label="Número"><input type="text" value={d[`ref${n}Numero`]} onChange={e => upd(`ref${n}Numero`, e.target.value)} className="input" /></Campo>
          <Campo label="Piso/Dpto"><input type="text" value={d[`ref${n}Piso`]} onChange={e => upd(`ref${n}Piso`, e.target.value)} className="input" /></Campo>
          <Campo label="Característica"><input type="text" value={d[`ref${n}Caracteristica`]} onChange={e => upd(`ref${n}Caracteristica`, e.target.value)} className="input" /></Campo>
          <Campo label="Teléfono"><input type="text" value={d[`ref${n}Telefono`]} onChange={e => upd(`ref${n}Telefono`, e.target.value)} className="input" /></Campo>
        </FormSeccion>
      ))}

      <button onClick={handleGuardar} className="w-full px-5 py-3.5 bg-amber-400 text-stone-950 rounded-lg font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-300 transition">
        <Save size={18} /> Guardar y generar PDF
      </button>
    </div>
  );
}

// ============================================================
// FORMULARIO AC (Alta Cliente Corven)
// ============================================================

function FormularioAC({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [d, setD] = useState({
    razonSocial: '', cuit: '', domicilioLegal: '', localidad: '', provincia: '', cp: '', telefono: '', emailFactura: '', contacto: '', actividadPrincipal: '', companiasVinculadas: '',
    iva: '', ingresosBrutos: '',
    docs: { arca: false, padronWeb: false, cm05: false, estatuto: false, form1276: false, noRetencionIVA: false, exencionIIBB: false, noRetencionGanancias: false },
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });
  const updDoc = (key) => setD({ ...d, docs: { ...d.docs, [key]: !d.docs[key] } });

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.razonSocial) { alert('Cargá razón social o nombre'); return; }
    onGuardar({ ...d, cliente: d.razonSocial, vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4"><LogoFoton size="md" color="dark" /><h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ALTA CLIENTE CORVEN</h1></div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-3 text-xs text-amber-200">
        ⚠️ Toda solicitud de alta debe enviarse con un mínimo de 72 horas de anticipación a la fecha de facturación.
      </div>

      <FormHeader tipo="ac" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos básicos" cols={2}>
        <Campo label="Razón social / Nombre y apellido *"><input type="text" value={d.razonSocial} onChange={e => upd('razonSocial', e.target.value)} className="input" /></Campo>
        <Campo label="CUIT / CUIL *"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} /></Campo>
        <Campo label="Domicilio legal"><input type="text" value={d.domicilioLegal} onChange={e => upd('domicilioLegal', e.target.value)} className="input" /></Campo>
        <Campo label="Localidad"><input type="text" value={d.localidad} onChange={e => upd('localidad', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia"><input type="text" value={d.provincia} onChange={e => upd('provincia', e.target.value)} className="input" /></Campo>
        <Campo label="Código postal"><input type="text" value={d.cp} onChange={e => upd('cp', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><InputTelefono value={d.telefono} onChange={v => upd('telefono', v)} /></Campo>
        <Campo label="Email envío factura"><input type="email" value={d.emailFactura} onChange={e => upd('emailFactura', e.target.value)} className="input" /></Campo>
        <Campo label="Persona de contacto"><input type="text" value={d.contacto} onChange={e => upd('contacto', e.target.value)} className="input" /></Campo>
        <Campo label="Actividad principal"><input type="text" value={d.actividadPrincipal} onChange={e => upd('actividadPrincipal', e.target.value)} className="input" /></Campo>
        <Campo label="Compañías vinculadas"><input type="text" value={d.companiasVinculadas} onChange={e => upd('companiasVinculadas', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Situación frente al IVA" cols={2}>
        {['Responsable Inscripto', 'Monotributo', 'Exento', 'Consumidor Final'].map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-stone-800">
            <input type="radio" name="iva" checked={d.iva === opt} onChange={() => upd('iva', opt)} className="accent-amber-400" />
            <span className="text-sm text-stone-200">{opt}</span>
          </label>
        ))}
      </FormSeccion>

      <FormSeccion titulo="Situación frente a Ingresos Brutos" cols={2}>
        {['Convenio Multilateral', 'Contribuyente Local', 'Exento', 'Régimen Simplificado'].map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-stone-800">
            <input type="radio" name="iibb" checked={d.ingresosBrutos === opt} onChange={() => upd('ingresosBrutos', opt)} className="accent-amber-400" />
            <span className="text-sm text-stone-200">{opt}</span>
          </label>
        ))}
      </FormSeccion>

      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Documentación a adjuntar</h2>
        <p className="text-xs text-stone-500 mb-3">Marcá lo que ya tenés / corresponde adjuntar.</p>
        <div className="space-y-2">
          {[
            ['arca', 'Constancia de Inscripción en ARCA'],
            ['padronWeb', 'Constancia de inscripción de Ingresos Brutos (PADRÓN WEB)'],
            ['cm05', 'Declaración anual de Ingresos Brutos (CM05 — solo Convenio Multilateral)'],
            ['estatuto', 'Copia de Estatuto, Poder y Autoridades (si corresponde)'],
            ['form1276', 'Formulario 1276 - Ingresos Brutos Santa Fe (si corresponde)'],
            ['noRetencionIVA', 'Constancia de no retención / exclusión de IVA'],
            ['exencionIIBB', 'Constancia de exención Ingresos Brutos'],
            ['noRetencionGanancias', 'Constancia de no retención Impuesto a las Ganancias'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-stone-800">
              <input type="checkbox" checked={d.docs[key]} onChange={() => updDoc(key)} className="accent-amber-400 w-4 h-4" />
              <span className="text-sm text-stone-200">{label}</span>
            </label>
          ))}
        </div>
      </section>

      <button onClick={handleGuardar} className="w-full px-5 py-3.5 bg-amber-400 text-stone-950 rounded-lg font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-300 transition">
        <Save size={18} /> Guardar y generar PDF
      </button>
    </div>
  );
}

// ============================================================
// FORMULARIO PROFORMA (ARS / USD)
// ============================================================

function FormularioProforma({ onGuardar, onCancelar, vendedores, proxNumero, modelosFoton = [], configFoton = {} }) {
  const [vendedorId, setVendedorId] = useState('');
  const [moneda, setMoneda] = useState('ARS'); // 'ARS' o 'USD'
  const [tipoProducto, setTipoProducto] = useState('catalogo'); // 'catalogo' o 'libre'
  const [modeloId, setModeloId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [tipoLista, setTipoLista] = useState('publica'); // 'publica' o 'financiada'
  const [d, setD] = useState({
    cliente: '',
    cuit: '',
    direccion: '',
    email: '',
    telefono: '',
    vehiculo: '',
    detalle: '',
    cantidad: 1,
    precioUnitario: '',
    descuento: '',
    observaciones: 'Esta proforma no constituye factura. Validez 7 días.',
    formaPago: 'Contado / Transferencia bancaria',
    plazoEntrega: 'A convenir',
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });

  // Modelo y versión seleccionados del catálogo
  const modeloSeleccionado = modelosFoton.find(m => m.id === modeloId);
  const versionSeleccionada = modeloSeleccionado?.versiones?.find(v => v.id === versionId);
  const lineas = [...new Set(modelosFoton.map(m => m.linea))];

  // Cuando cambia modelo o versión, autocompleto el precio y nombre
  useEffect(() => {
    if (tipoProducto !== 'catalogo' || !versionSeleccionada) return;
    const precios = tipoLista === 'publica' ? versionSeleccionada.preciosPublicos : versionSeleccionada.preciosFinanciados;
    if (!precios) return;
    // Detectar moneda del catálogo
    const monedaCat = precios.usd ? 'USD' : 'ARS';
    setMoneda(monedaCat);
    const precio = precios.usd || precios.ars || 0;
    const nombreCompleto = `${modeloSeleccionado.nombre} ${versionSeleccionada.nombre}`.trim();
    setD(prev => ({
      ...prev,
      vehiculo: nombreCompleto,
      precioUnitario: String(precio),
    }));
  }, [modeloId, versionId, tipoLista, tipoProducto]);

  // Reset versión cuando cambia el modelo
  useEffect(() => {
    if (modeloSeleccionado && modeloSeleccionado.versiones?.length > 0) {
      setVersionId(modeloSeleccionado.versiones[0].id);
    } else {
      setVersionId('');
    }
  }, [modeloId]);

  const cantidad = parseFloat(d.cantidad) || 0;
  const precioUnit = parseNum(d.precioUnitario);
  const subtotal = cantidad * precioUnit;
  const descuentoN = parseNum(d.descuento);
  const total = Math.max(0, subtotal - descuentoN);

  const formatMoneda = (n) => {
    if (moneda === 'USD') return formatUSD(n);
    return formatARS(n);
  };

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.cliente) { alert('Cargá el nombre del cliente'); return; }
    if (!d.vehiculo) { alert('Cargá el vehículo o detalle'); return; }
    if (precioUnit <= 0) { alert('Cargá el precio unitario'); return; }
    onGuardar({
      ...d,
      moneda,
      cantidad,
      precioUnitario: precioUnit,
      descuento: descuentoN,
      subtotal,
      total,
      vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp, empresa: vendedor.empresa },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4"><LogoFoton size="md" color="dark" /><h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PROFORMA</h1></div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3 text-xs text-emerald-200">
        💡 La proforma es un documento informativo (no es factura). Útil para presentaciones, autorizaciones de compra y cotizaciones formales.
      </div>

      <FormHeader tipo="proforma" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      {/* Selector de moneda */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Moneda</div>
        <div className="flex gap-2">
          <button onClick={() => setMoneda('ARS')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${moneda === 'ARS' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>$ Pesos (ARS)</button>
          <button onClick={() => setMoneda('USD')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${moneda === 'USD' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>US$ Dólares (USD)</button>
        </div>
      </div>

      <FormSeccion titulo="Datos del cliente" cols={2}>
        <Campo label="Cliente / Razón social *"><input type="text" value={d.cliente} onChange={e => upd('cliente', e.target.value)} className="input" /></Campo>
        <Campo label="CUIT / DNI"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} /></Campo>
        <Campo label="Dirección"><input type="text" value={d.direccion} onChange={e => upd('direccion', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><InputTelefono value={d.telefono} onChange={v => upd('telefono', v)} /></Campo>
        <Campo label="Email"><input type="email" value={d.email} onChange={e => upd('email', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Detalle de la operación" cols={1}>
        {/* Selector de origen del producto */}
        <div className="flex gap-2 mb-2">
          <button onClick={() => setTipoProducto('catalogo')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${tipoProducto === 'catalogo' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>📋 Del catálogo Foton</button>
          <button onClick={() => setTipoProducto('libre')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${tipoProducto === 'libre' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>✏️ Producto libre</button>
        </div>

        {tipoProducto === 'catalogo' && modelosFoton.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Modelo">
                <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="input">
                  <option value="">— Elegir modelo —</option>
                  {lineas.map(linea => (
                    <optgroup key={linea} label={linea}>
                      {modelosFoton.filter(m => m.linea === linea).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Campo>
              {modeloSeleccionado && modeloSeleccionado.versiones?.length > 0 && (
                <Campo label="Versión">
                  <select value={versionId} onChange={e => setVersionId(e.target.value)} className="input">
                    {modeloSeleccionado.versiones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                  </select>
                </Campo>
              )}
            </div>
            <Campo label="Lista de precio">
              <div className="flex gap-2">
                <button onClick={() => setTipoLista('publica')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${tipoLista === 'publica' ? 'bg-stone-700 text-stone-100' : 'bg-stone-800 text-stone-400'}`}>Pública</button>
                <button onClick={() => setTipoLista('financiada')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${tipoLista === 'financiada' ? 'bg-stone-700 text-stone-100' : 'bg-stone-800 text-stone-400'}`}>Financiada (+9%)</button>
              </div>
            </Campo>
          </>
        )}

        {tipoProducto === 'libre' && (
          <Campo label="Vehículo / Producto *"><input type="text" value={d.vehiculo} onChange={e => upd('vehiculo', e.target.value)} placeholder="Ej: Foton TM1 Cab Simple 0km" className="input" /></Campo>
        )}

        {tipoProducto === 'catalogo' && d.vehiculo && (
          <div className="text-xs p-2 rounded" style={{ background: 'var(--accent-soft)' }}>
            ✓ Producto seleccionado: <span className="font-semibold">{d.vehiculo}</span>
          </div>
        )}

        <Campo label="Detalle adicional (opcional)"><textarea value={d.detalle} onChange={e => upd('detalle', e.target.value)} placeholder="Color, accesorios, especificaciones..." className="input" rows="3" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Montos" cols={3}>
        <Campo label="Cantidad"><input type="number" value={d.cantidad} onChange={e => upd('cantidad', e.target.value)} className="input" min="1" /></Campo>
        <Campo label={`Precio unitario (${moneda})`}>
          <InputDinero value={d.precioUnitario} onChange={v => upd('precioUnitario', v)} placeholder={moneda === 'USD' ? '$ 50.000' : '$ 50.000.000'} />
        </Campo>
        <Campo label={`Descuento (${moneda})`}>
          <InputDinero value={d.descuento} onChange={v => upd('descuento', v)} placeholder="$ 0" />
        </Campo>
      </FormSeccion>

      {/* Resumen */}
      {precioUnit > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-400/30 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Subtotal ({cantidad} × {formatMoneda(precioUnit)})</span>
            <span className="text-stone-200 font-semibold">{formatMoneda(subtotal)}</span>
          </div>
          {descuentoN > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Descuento</span>
              <span className="text-green-400 font-semibold">− {formatMoneda(descuentoN)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-emerald-400/30">
            <span className="text-emerald-300 font-bold uppercase text-xs tracking-wider">Total</span>
            <span className="text-emerald-300 font-black text-xl">{formatMoneda(total)}</span>
          </div>
        </div>
      )}

      <FormSeccion titulo="Condiciones" cols={2}>
        <Campo label="Forma de pago"><input type="text" value={d.formaPago} onChange={e => upd('formaPago', e.target.value)} className="input" /></Campo>
        <Campo label="Plazo de entrega"><input type="text" value={d.plazoEntrega} onChange={e => upd('plazoEntrega', e.target.value)} className="input" /></Campo>
        <div className="sm:col-span-2">
          <Campo label="Observaciones"><textarea value={d.observaciones} onChange={e => upd('observaciones', e.target.value)} className="input" rows="2" /></Campo>
        </div>
      </FormSeccion>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancelar} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm font-semibold">Cancelar</button>
        <button onClick={handleGuardar} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded text-sm font-bold flex items-center gap-2">
          <Save size={14} /> Guardar Proforma
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FORMULARIO PATENTAMIENTO — PERSONA FÍSICA
// ============================================================

// Bloque reutilizable de domicilio (Calle, Número, Piso, Depto, Localidad, Barrio CABA, Provincia, CP, Partido)
function BloqueDomicilio({ d, upd, prefijo }) {
  const k = (campo) => `${prefijo}_${campo}`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Campo label="Calle"><input type="text" value={d[k('calle')] || ''} onChange={e => upd(k('calle'), e.target.value)} className="input" /></Campo>
      <Campo label="Número"><input type="text" value={d[k('numero')] || ''} onChange={e => upd(k('numero'), e.target.value)} className="input" /></Campo>
      <Campo label="Piso"><input type="text" value={d[k('piso')] || ''} onChange={e => upd(k('piso'), e.target.value)} className="input" /></Campo>
      <Campo label="Departamento"><input type="text" value={d[k('depto')] || ''} onChange={e => upd(k('depto'), e.target.value)} className="input" /></Campo>
      <Campo label="Localidad"><input type="text" value={d[k('localidad')] || ''} onChange={e => upd(k('localidad'), e.target.value)} className="input" /></Campo>
      <Campo label="Barrio (sólo CABA)"><input type="text" value={d[k('barrio')] || ''} onChange={e => upd(k('barrio'), e.target.value)} className="input" /></Campo>
      <Campo label="Provincia"><input type="text" value={d[k('provincia')] || ''} onChange={e => upd(k('provincia'), e.target.value)} className="input" /></Campo>
      <Campo label="Código postal"><input type="text" value={d[k('cp')] || ''} onChange={e => upd(k('cp'), e.target.value)} className="input" /></Campo>
      <Campo label="Partido / Municipio / Dpto"><input type="text" value={d[k('partido')] || ''} onChange={e => upd(k('partido'), e.target.value)} className="input" /></Campo>
    </div>
  );
}

function FormularioPatentamientoPF({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [d, setD] = useState({
    // 1. Datos básicos
    razonSocial: '', porcentajeTitularidad: '', cuit: '', email: '', telefono: '',
    tipoDni: 'DNI', numeroDni: '', autoridadExpidio: '', actividad: '',
    nacionalidad: 'ARGENTINO', fechaNacimiento: '', lugarNacimiento: '',
    estadoCivil: '', numeroNupcias: '', conyugeNombre: '', conyugeDni: '',
    cantidadApoderados: '',
    // 4. Apoderado
    apoderado_tipoDni: 'DNI', apoderado_numeroDni: '', apoderado_sexo: '',
    apoderado_autoridadExpidio: '', apoderado_cuit: '', apoderado_nacionalidad: '',
    apoderado_apellidoNombre: '', apoderado_telefono: '', apoderado_email: '',
    apoderado_ocupacion: '', apoderado_fechaNacimiento: '', apoderado_lugarNacimiento: '',
    apoderado_estadoCivil: '',
    // 6. Guarda habitual
    guardaHabitual: 'NO',
    // 7. Registro
    registro_numero: '',
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.razonSocial) { alert('Cargá el apellido y nombre del titular'); return; }
    if (!d.numeroDni) { alert('Cargá el DNI del titular'); return; }
    onGuardar({ ...d, cliente: d.razonSocial, vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <LogoFoton size="md" color="dark" />
          <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PEDIDO DE PATENTAMIENTO · PERSONA FÍSICA</h1>
        </div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
        📋 <span className="font-semibold">Documentación obligatoria:</span> Formulario de Patentamiento · Copia de DNI frente y dorso del titular/apoderado · En operaciones con financiación (crédito prendario o leasing), documentación adicional según el tipo de operación.
      </div>

      <FormHeader tipo="patentamientoPF" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="1. Datos del titular" cols={2}>
        <Campo label="Apellido y Nombre *"><input type="text" value={d.razonSocial} onChange={e => upd('razonSocial', e.target.value)} className="input" /></Campo>
        <Campo label="Porcentaje de titularidad"><input type="text" value={d.porcentajeTitularidad} onChange={e => upd('porcentajeTitularidad', e.target.value)} placeholder="100%" className="input" /></Campo>
        <Campo label="CUIT / CUIL"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} /></Campo>
        <Campo label="Email"><input type="email" value={d.email} onChange={e => upd('email', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><InputTelefono value={d.telefono} onChange={v => upd('telefono', v)} /></Campo>
        <Campo label="Tipo y N° DNI *">
          <div className="flex gap-2">
            <select value={d.tipoDni} onChange={e => upd('tipoDni', e.target.value)} className="input" style={{ width: 110 }}>
              <option value="DNI">DNI</option>
              <option value="LE">LE</option>
              <option value="LC">LC</option>
              <option value="CI">CI</option>
              <option value="PAS">Pasaporte</option>
            </select>
            <input type="text" value={d.numeroDni} onChange={e => upd('numeroDni', e.target.value.replace(/\D/g, ''))} placeholder="12345678" className="input" />
          </div>
        </Campo>
        <Campo label="Autoridad o país que lo expidió"><input type="text" value={d.autoridadExpidio} onChange={e => upd('autoridadExpidio', e.target.value)} className="input" /></Campo>
        <Campo label="Actividad"><input type="text" value={d.actividad} onChange={e => upd('actividad', e.target.value)} className="input" /></Campo>
        <Campo label="Nacionalidad"><input type="text" value={d.nacionalidad} onChange={e => upd('nacionalidad', e.target.value)} className="input" /></Campo>
        <Campo label="Fecha de nacimiento"><input type="date" value={d.fechaNacimiento} onChange={e => upd('fechaNacimiento', e.target.value)} className="input" /></Campo>
        <Campo label="Lugar de nacimiento"><input type="text" value={d.lugarNacimiento} onChange={e => upd('lugarNacimiento', e.target.value)} className="input" /></Campo>
        <Campo label="Estado civil">
          <select value={d.estadoCivil} onChange={e => upd('estadoCivil', e.target.value)} className="input">
            <option value="">— Elegir —</option>
            <option value="SOLTERO">Soltero/a</option>
            <option value="CASADO">Casado/a</option>
            <option value="DIVORCIADO">Divorciado/a</option>
            <option value="VIUDO">Viudo/a</option>
            <option value="CONCUBINATO">Concubinato</option>
          </select>
        </Campo>
        {d.estadoCivil === 'CASADO' && (
          <>
            <Campo label="Número de nupcias"><input type="text" value={d.numeroNupcias} onChange={e => upd('numeroNupcias', e.target.value)} className="input" /></Campo>
            <Campo label="Apellido y nombre del cónyuge"><input type="text" value={d.conyugeNombre} onChange={e => upd('conyugeNombre', e.target.value)} className="input" /></Campo>
            <Campo label="DNI del cónyuge"><input type="text" value={d.conyugeDni} onChange={e => upd('conyugeDni', e.target.value.replace(/\D/g, ''))} className="input" /></Campo>
          </>
        )}
        <Campo label="Cantidad de apoderados"><input type="number" value={d.cantidadApoderados} onChange={e => upd('cantidadApoderados', e.target.value)} min="0" className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="2. Domicilio Legal" cols={1}>
        <BloqueDomicilio d={d} upd={upd} prefijo="domLegal" />
      </FormSeccion>

      <FormSeccion titulo="3. Domicilio Real" cols={1}>
        <BloqueDomicilio d={d} upd={upd} prefijo="domReal" />
      </FormSeccion>

      {parseInt(d.cantidadApoderados) > 0 && (
        <>
          <FormSeccion titulo="4. Datos del Apoderado" cols={2}>
            <Campo label="Tipo y N° DNI">
              <div className="flex gap-2">
                <select value={d.apoderado_tipoDni} onChange={e => upd('apoderado_tipoDni', e.target.value)} className="input" style={{ width: 110 }}>
                  <option value="DNI">DNI</option>
                  <option value="LE">LE</option>
                  <option value="LC">LC</option>
                  <option value="CI">CI</option>
                  <option value="PAS">Pasaporte</option>
                </select>
                <input type="text" value={d.apoderado_numeroDni} onChange={e => upd('apoderado_numeroDni', e.target.value.replace(/\D/g, ''))} className="input" />
              </div>
            </Campo>
            <Campo label="Sexo">
              <select value={d.apoderado_sexo} onChange={e => upd('apoderado_sexo', e.target.value)} className="input">
                <option value="">— Elegir —</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="X">X</option>
              </select>
            </Campo>
            <Campo label="Autoridad o país que lo expidió"><input type="text" value={d.apoderado_autoridadExpidio} onChange={e => upd('apoderado_autoridadExpidio', e.target.value)} className="input" /></Campo>
            <Campo label="CUIT / CUIL"><InputCUIT value={d.apoderado_cuit} onChange={v => upd('apoderado_cuit', v)} /></Campo>
            <Campo label="Nacionalidad"><input type="text" value={d.apoderado_nacionalidad} onChange={e => upd('apoderado_nacionalidad', e.target.value)} className="input" /></Campo>
            <Campo label="Apellido y Nombre"><input type="text" value={d.apoderado_apellidoNombre} onChange={e => upd('apoderado_apellidoNombre', e.target.value)} className="input" /></Campo>
            <Campo label="Teléfono"><InputTelefono value={d.apoderado_telefono} onChange={v => upd('apoderado_telefono', v)} /></Campo>
            <Campo label="Email"><input type="email" value={d.apoderado_email} onChange={e => upd('apoderado_email', e.target.value)} className="input" /></Campo>
            <Campo label="Ocupación"><input type="text" value={d.apoderado_ocupacion} onChange={e => upd('apoderado_ocupacion', e.target.value)} className="input" /></Campo>
            <Campo label="Fecha de nacimiento"><input type="date" value={d.apoderado_fechaNacimiento} onChange={e => upd('apoderado_fechaNacimiento', e.target.value)} className="input" /></Campo>
            <Campo label="Lugar de nacimiento"><input type="text" value={d.apoderado_lugarNacimiento} onChange={e => upd('apoderado_lugarNacimiento', e.target.value)} className="input" /></Campo>
            <Campo label="Estado civil"><input type="text" value={d.apoderado_estadoCivil} onChange={e => upd('apoderado_estadoCivil', e.target.value)} className="input" /></Campo>
          </FormSeccion>

          <FormSeccion titulo="5. Domicilio Real del Apoderado" cols={1}>
            <BloqueDomicilio d={d} upd={upd} prefijo="apoderado_domReal" />
          </FormSeccion>
        </>
      )}

      <FormSeccion titulo="6. Guarda Habitual (Art. 11 Dec. Ley 6582/58)" cols={1}>
        <Campo label="¿Solicita guarda habitual?">
          <div className="flex gap-2">
            <button onClick={() => upd('guardaHabitual', 'SI')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${d.guardaHabitual === 'SI' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>SÍ</button>
            <button onClick={() => upd('guardaHabitual', 'NO')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${d.guardaHabitual === 'NO' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>NO</button>
          </div>
        </Campo>
        {d.guardaHabitual === 'SI' && (
          <>
            <p className="text-xs text-stone-400 mt-3">Domicilio de guarda habitual:</p>
            <BloqueDomicilio d={d} upd={upd} prefijo="guarda" />
          </>
        )}
      </FormSeccion>

      <FormSeccion titulo="7. Datos del Registro" cols={2}>
        <Campo label="Registro número"><input type="text" value={d.registro_numero} onChange={e => upd('registro_numero', e.target.value)} className="input" /></Campo>
        <div className="sm:col-span-2">
          <BloqueDomicilio d={d} upd={upd} prefijo="registro" />
        </div>
      </FormSeccion>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancelar} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm font-semibold">Cancelar</button>
        <button onClick={handleGuardar} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold flex items-center gap-2">
          <Save size={14} /> Guardar Patentamiento
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FORMULARIO PATENTAMIENTO — PERSONA JURÍDICA
// ============================================================

function FormularioPatentamientoPJ({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [d, setD] = useState({
    // 1. Datos
    razonSocial: '', porcentajeTitularidad: '', cuit: '', email: '', telefono: '',
    actividad: '', personeriaJuridica: '', numeroInscripcion: '',
    fechaContrato: '', cantidadApoderados: '',
    // 4. Apoderado
    apoderado_tipoDni: 'DNI', apoderado_numeroDni: '', apoderado_sexo: '',
    apoderado_autoridadExpidio: '', apoderado_cuit: '', apoderado_nacionalidad: '',
    apoderado_apellidoNombre: '', apoderado_telefono: '', apoderado_email: '',
    apoderado_ocupacion: '', apoderado_fechaNacimiento: '', apoderado_lugarNacimiento: '',
    apoderado_estadoCivil: '',
    // 6. Guarda
    guardaHabitual: 'NO',
    // 7. Registro
    registro_numero: '',
  });

  const upd = (campo, valor) => setD({ ...d, [campo]: valor });

  const handleGuardar = () => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) { alert('Elegí un vendedor'); return; }
    if (!d.razonSocial) { alert('Cargá la razón social'); return; }
    if (!d.cuit) { alert('Cargá el CUIT de la empresa'); return; }
    onGuardar({ ...d, cliente: d.razonSocial, vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <LogoFoton size="md" color="dark" />
          <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PEDIDO DE PATENTAMIENTO · PERSONA JURÍDICA</h1>
        </div>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
        📋 <span className="font-semibold">Documentación obligatoria:</span> Formulario de Patentamiento · Copia de DNI frente y dorso del apoderado · Estatuto o contrato social actualizado · En operaciones con financiación, documentación adicional.
      </div>

      <FormHeader tipo="patentamientoPJ" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="1. Datos de la empresa" cols={2}>
        <Campo label="Razón social *"><input type="text" value={d.razonSocial} onChange={e => upd('razonSocial', e.target.value)} className="input" /></Campo>
        <Campo label="Porcentaje de titularidad"><input type="text" value={d.porcentajeTitularidad} onChange={e => upd('porcentajeTitularidad', e.target.value)} placeholder="100%" className="input" /></Campo>
        <Campo label="CUIT *"><InputCUIT value={d.cuit} onChange={v => upd('cuit', v)} placeholder="30-12345678-9" /></Campo>
        <Campo label="Email"><input type="email" value={d.email} onChange={e => upd('email', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><InputTelefono value={d.telefono} onChange={v => upd('telefono', v)} /></Campo>
        <Campo label="Actividad"><input type="text" value={d.actividad} onChange={e => upd('actividad', e.target.value)} className="input" /></Campo>
        <Campo label="Personería jurídica">
          <select value={d.personeriaJuridica} onChange={e => upd('personeriaJuridica', e.target.value)} className="input">
            <option value="">— Elegir —</option>
            <option value="SA">S.A.</option>
            <option value="SRL">S.R.L.</option>
            <option value="SAS">S.A.S.</option>
            <option value="COOPERATIVA">Cooperativa</option>
            <option value="ASOCIACION">Asociación civil</option>
            <option value="FUNDACION">Fundación</option>
            <option value="OTRA">Otra</option>
          </select>
        </Campo>
        <Campo label="Número de inscripción"><input type="text" value={d.numeroInscripcion} onChange={e => upd('numeroInscripcion', e.target.value)} className="input" /></Campo>
        <Campo label="Fecha de contrato o escritura"><input type="date" value={d.fechaContrato} onChange={e => upd('fechaContrato', e.target.value)} className="input" /></Campo>
        <Campo label="Cantidad de apoderados"><input type="number" value={d.cantidadApoderados} onChange={e => upd('cantidadApoderados', e.target.value)} min="0" className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="2. Domicilio Legal" cols={1}>
        <BloqueDomicilio d={d} upd={upd} prefijo="domLegal" />
      </FormSeccion>

      <FormSeccion titulo="3. Domicilio Real" cols={1}>
        <BloqueDomicilio d={d} upd={upd} prefijo="domReal" />
      </FormSeccion>

      <FormSeccion titulo="4. Datos del Apoderado" cols={2}>
        <Campo label="Tipo y N° DNI">
          <div className="flex gap-2">
            <select value={d.apoderado_tipoDni} onChange={e => upd('apoderado_tipoDni', e.target.value)} className="input" style={{ width: 110 }}>
              <option value="DNI">DNI</option>
              <option value="LE">LE</option>
              <option value="LC">LC</option>
              <option value="CI">CI</option>
              <option value="PAS">Pasaporte</option>
            </select>
            <input type="text" value={d.apoderado_numeroDni} onChange={e => upd('apoderado_numeroDni', e.target.value.replace(/\D/g, ''))} className="input" />
          </div>
        </Campo>
        <Campo label="Sexo">
          <select value={d.apoderado_sexo} onChange={e => upd('apoderado_sexo', e.target.value)} className="input">
            <option value="">— Elegir —</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="X">X</option>
          </select>
        </Campo>
        <Campo label="Autoridad o país que lo expidió"><input type="text" value={d.apoderado_autoridadExpidio} onChange={e => upd('apoderado_autoridadExpidio', e.target.value)} className="input" /></Campo>
        <Campo label="CUIT / CUIL"><InputCUIT value={d.apoderado_cuit} onChange={v => upd('apoderado_cuit', v)} /></Campo>
        <Campo label="Nacionalidad"><input type="text" value={d.apoderado_nacionalidad} onChange={e => upd('apoderado_nacionalidad', e.target.value)} className="input" /></Campo>
        <Campo label="Apellido y Nombre"><input type="text" value={d.apoderado_apellidoNombre} onChange={e => upd('apoderado_apellidoNombre', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><InputTelefono value={d.apoderado_telefono} onChange={v => upd('apoderado_telefono', v)} /></Campo>
        <Campo label="Email"><input type="email" value={d.apoderado_email} onChange={e => upd('apoderado_email', e.target.value)} className="input" /></Campo>
        <Campo label="Ocupación"><input type="text" value={d.apoderado_ocupacion} onChange={e => upd('apoderado_ocupacion', e.target.value)} className="input" /></Campo>
        <Campo label="Fecha de nacimiento"><input type="date" value={d.apoderado_fechaNacimiento} onChange={e => upd('apoderado_fechaNacimiento', e.target.value)} className="input" /></Campo>
        <Campo label="Lugar de nacimiento"><input type="text" value={d.apoderado_lugarNacimiento} onChange={e => upd('apoderado_lugarNacimiento', e.target.value)} className="input" /></Campo>
        <Campo label="Estado civil"><input type="text" value={d.apoderado_estadoCivil} onChange={e => upd('apoderado_estadoCivil', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="5. Domicilio Real del Apoderado" cols={1}>
        <BloqueDomicilio d={d} upd={upd} prefijo="apoderado_domReal" />
      </FormSeccion>

      <FormSeccion titulo="6. Guarda Habitual (Art. 11 Dec. Ley 6582/58)" cols={1}>
        <Campo label="¿Solicita guarda habitual?">
          <div className="flex gap-2">
            <button onClick={() => upd('guardaHabitual', 'SI')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${d.guardaHabitual === 'SI' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>SÍ</button>
            <button onClick={() => upd('guardaHabitual', 'NO')} className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold ${d.guardaHabitual === 'NO' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>NO</button>
          </div>
        </Campo>
        {d.guardaHabitual === 'SI' && (
          <>
            <p className="text-xs text-stone-400 mt-3">Domicilio de guarda habitual:</p>
            <BloqueDomicilio d={d} upd={upd} prefijo="guarda" />
          </>
        )}
      </FormSeccion>

      <FormSeccion titulo="7. Datos del Registro" cols={2}>
        <Campo label="Registro número"><input type="text" value={d.registro_numero} onChange={e => upd('registro_numero', e.target.value)} className="input" /></Campo>
        <div className="sm:col-span-2">
          <BloqueDomicilio d={d} upd={upd} prefijo="registro" />
        </div>
      </FormSeccion>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancelar} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-sm font-semibold">Cancelar</button>
        <button onClick={handleGuardar} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold flex items-center gap-2">
          <Save size={14} /> Guardar Patentamiento
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: VER FORMULARIO + EXPORTAR PDF
// ============================================================

function ModalFormulario({ formulario, onClose }) {
  const f = formulario;
  const tipoInfo = TIPOS_FORMULARIO[f.tipo];
  const imprimir = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white text-stone-900 rounded-lg w-full max-h-[95vh] overflow-y-auto print:max-h-none print:max-w-full print:rounded-none print:shadow-none" style={{ maxWidth: '820px' }}>
        <div className="sticky top-0 bg-stone-100 border-b border-stone-200 px-5 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="text-stone-700 font-semibold text-sm">{tipoInfo.nombre} · {f.numero}</div>
          <div className="flex gap-2">
            <button onClick={imprimir} className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-xs font-bold flex items-center gap-1.5"><Printer size={12} /> Imprimir / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded text-xs font-bold">Cerrar</button>
          </div>
        </div>

        <div className="p-10 print:p-0 print-document">
          {/* Encabezado con logo Foton */}
          <div className="border-b-2 border-stone-900 pb-5 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <LogoFoton size="lg" color="dark" />
                <div className="mt-4 text-xs text-stone-600 space-y-0.5">
                  <div className="font-semibold text-stone-800 uppercase tracking-wider">{tipoInfo.nombre}</div>
                  <div>Ruta Nacional 5, km 371.5, Pehuajó</div>
                  <div>www.fotonmalaspina.com · WhatsApp: 2396-549920</div>
                </div>
              </div>
              <div className="text-right border-l-4 border-red-600 pl-4">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">N° de formulario</div>
                <div className="text-2xl font-black text-stone-900 leading-none mt-1" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{f.numero}</div>
                <div className="mt-3 space-y-0.5 text-xs">
                  <div className="text-stone-600">Fecha: <span className="font-bold text-stone-900">{formatFecha(f.fechaCreacion)}</span></div>
                  {f.vendedor?.nombre && <div className="text-stone-600">Vendedor: <span className="font-bold text-stone-900">{f.vendedor.nombre}</span></div>}
                </div>
              </div>
            </div>
          </div>

          {f.tipo === 'pf' && <DetalleFormPF f={f} />}
          {f.tipo === 'pj' && <DetalleFormPJ f={f} />}
          {f.tipo === 'ac' && <DetalleFormAC f={f} />}
          {f.tipo === 'proforma' && <DetalleFormProforma f={f} />}
          {f.tipo === 'patentamientoPF' && <DetalleFormPatentamiento f={f} esPersonaJuridica={false} />}
          {f.tipo === 'patentamientoPJ' && <DetalleFormPatentamiento f={f} esPersonaJuridica={true} />}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
        }
      `}</style>
    </div>
  );
}

function FilaPDF({ label, valor }) {
  if (!valor && valor !== 0) return null;
  return (
    <div className="flex border-b border-stone-200 py-1.5 text-sm">
      <div className="w-1/3 text-stone-500 font-semibold">{label}</div>
      <div className="flex-1 text-stone-900">{valor}</div>
    </div>
  );
}
function SeccionPDF({ titulo, children }) {
  return (
    <div className="mb-5">
      <div className="bg-stone-900 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider mb-2">{titulo}</div>
      {children}
    </div>
  );
}

function DetalleFormPF({ f }) {
  return (
    <>
      <SeccionPDF titulo="Datos del solicitante">
        <FilaPDF label="CUIT / CUIL" valor={f.cuit} />
        <FilaPDF label="Nombre" valor={f.nombre} />
        <FilaPDF label="Apellido" valor={f.apellido} />
        <FilaPDF label="Posición IVA" valor={f.posicionIVA} />
        <FilaPDF label="Nacionalidad" valor={f.nacionalidad} />
        <FilaPDF label="Estado civil" valor={f.estadoCivil} />
        <FilaPDF label="Fecha nacimiento" valor={f.fechaNacimiento && formatFecha(f.fechaNacimiento)} />
      </SeccionPDF>

      {(f.conyugeNombre || f.conyugeApellido) && (
        <SeccionPDF titulo="Datos del cónyuge">
          <FilaPDF label="Tipo doc" valor={f.conyugeTipoDoc} />
          <FilaPDF label="N° documento" valor={f.conyugeNumDoc} />
          <FilaPDF label="Nombre" valor={f.conyugeNombre} />
          <FilaPDF label="Apellido" valor={f.conyugeApellido} />
          <FilaPDF label="Posición IVA" valor={f.conyugePosicionIVA} />
          <FilaPDF label="Nacionalidad" valor={f.conyugeNacionalidad} />
          <FilaPDF label="Fecha nacimiento" valor={f.conyugeFechaNac && formatFecha(f.conyugeFechaNac)} />
          <FilaPDF label="Situación laboral" valor={f.conyugeSitLaboral} />
          <FilaPDF label="Actividad" valor={f.conyugeActividad} />
          <FilaPDF label="Profesión" valor={f.conyugeProfesion} />
        </SeccionPDF>
      )}

      <SeccionPDF titulo="Domicilio particular">
        <FilaPDF label="Calle / Número" valor={[f.calle, f.numero, f.piso].filter(Boolean).join(' ')} />
        <FilaPDF label="Localidad" valor={f.localidad} />
        <FilaPDF label="Provincia" valor={f.provincia} />
        <FilaPDF label="CP" valor={f.cp} />
        <FilaPDF label="Teléfono" valor={[f.tipoTelefono, f.caracteristica, f.telefono].filter(Boolean).join(' ')} />
        <FilaPDF label="Email" valor={f.email} />
      </SeccionPDF>

      <SeccionPDF titulo="Datos laborales">
        <FilaPDF label="Situación laboral" valor={f.sitLaboral} />
        <FilaPDF label="Actividad económica" valor={f.actividadEconomica} />
        <FilaPDF label="Profesión" valor={f.profesion} />
        <FilaPDF label="Puesto" valor={f.puesto} />
        <FilaPDF label="Antigüedad (años)" valor={f.antiguedad} />
        <FilaPDF label="Facturación mensual" valor={f.facturacionMensual && formatARS(parseNum(f.facturacionMensual))} />
        <FilaPDF label="Empresa" valor={f.empresa} />
        <FilaPDF label="CUIT empresa" valor={f.cuitEmpresa} />
        <FilaPDF label="Domicilio empresa" valor={[f.calleEmpresa, f.numeroEmpresa, f.provLocEmpresa, f.cpEmpresa].filter(Boolean).join(' - ')} />
        <FilaPDF label="Teléfono laboral" valor={f.telefonoLaboral} />
        <FilaPDF label="Rama económica" valor={f.ramaEconomica} />
        <FilaPDF label="Ocupa personal" valor={f.ocupaPersonal} />
        <FilaPDF label="Cant. empleados" valor={f.cantEmpleados} />
      </SeccionPDF>

      {f.inmuebles && f.inmuebles.some(x => x.tipo || x.direccion) && (
        <SeccionPDF titulo="Inmuebles">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-100"><th className="text-left p-2 border-b border-stone-300">Tipo</th><th className="text-left p-2 border-b border-stone-300">Dirección</th><th className="text-right p-2 border-b border-stone-300">Mts²</th><th className="text-right p-2 border-b border-stone-300">Valuación</th></tr></thead>
            <tbody>{f.inmuebles.filter(x => x.tipo || x.direccion).map((x, i) => <tr key={i}><td className="p-2 border-b border-stone-200">{x.tipo}</td><td className="p-2 border-b border-stone-200">{x.direccion}</td><td className="text-right p-2 border-b border-stone-200">{x.mts}</td><td className="text-right p-2 border-b border-stone-200">{x.valuacion && formatARS(parseNum(x.valuacion))}</td></tr>)}</tbody>
          </table>
        </SeccionPDF>
      )}

      {f.rodados && f.rodados.some(x => x.marcaModelo) && (
        <SeccionPDF titulo="Rodados">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-100"><th className="text-left p-2 border-b border-stone-300">Marca / Modelo</th><th className="text-right p-2 border-b border-stone-300">Cant.</th><th className="text-right p-2 border-b border-stone-300">Valuación</th></tr></thead>
            <tbody>{f.rodados.filter(x => x.marcaModelo).map((x, i) => <tr key={i}><td className="p-2 border-b border-stone-200">{x.marcaModelo}</td><td className="text-right p-2 border-b border-stone-200">{x.cantidad}</td><td className="text-right p-2 border-b border-stone-200">{x.valuacion && formatARS(parseNum(x.valuacion))}</td></tr>)}</tbody>
          </table>
        </SeccionPDF>
      )}

      {f.deudas && f.deudas.some(x => x.banco) && (
        <SeccionPDF titulo="Deudas">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-100"><th className="text-left p-2 border-b border-stone-300">Banco</th><th className="text-left p-2 border-b border-stone-300">Tipo</th><th className="text-right p-2 border-b border-stone-300">Cuota</th><th className="text-right p-2 border-b border-stone-300">Saldo</th></tr></thead>
            <tbody>{f.deudas.filter(x => x.banco).map((x, i) => <tr key={i}><td className="p-2 border-b border-stone-200">{x.banco}</td><td className="p-2 border-b border-stone-200">{x.tipoDeuda}</td><td className="text-right p-2 border-b border-stone-200">{x.cuota && formatARS(parseNum(x.cuota))}</td><td className="text-right p-2 border-b border-stone-200">{x.saldo && formatARS(parseNum(x.saldo))}</td></tr>)}</tbody>
          </table>
        </SeccionPDF>
      )}

      <SeccionPDF titulo="Referencias comerciales">
        <FilaPDF label="Cliente 1" valor={[f.ref1Razon, f.ref1Tel].filter(Boolean).join(' · ')} />
        <FilaPDF label="Cliente 2" valor={[f.ref2Razon, f.ref2Tel].filter(Boolean).join(' · ')} />
      </SeccionPDF>
    </>
  );
}

function DetalleFormPJ({ f }) {
  return (
    <>
      <SeccionPDF titulo="Datos de la empresa">
        <FilaPDF label="CUIT" valor={f.cuit} />
        <FilaPDF label="Razón social" valor={f.razonSocial} />
        <FilaPDF label="Posición IVA" valor={f.posicionIVA} />
        <FilaPDF label="Actividad principal" valor={f.actividadPrincipal} />
        <FilaPDF label="Actividad secundaria" valor={f.actividadSecundaria} />
        <FilaPDF label="Antigüedad en el rubro" valor={f.antiguedadRubro} />
      </SeccionPDF>

      {f.socios && f.socios.map((s, i) => (
        (s.nombre || s.cuit) && (
          <SeccionPDF key={i} titulo={`Socio / Accionista ${i + 1}`}>
            <FilaPDF label="Nombre" valor={s.nombre} />
            <FilaPDF label="Porcentaje" valor={s.porcentaje} />
            <FilaPDF label="Antigüedad" valor={s.antiguedad} />
            <FilaPDF label="CUIL/CUIT" valor={s.cuit} />
            <FilaPDF label="Nacionalidad" valor={s.nacionalidad} />
            <FilaPDF label="Estado civil" valor={s.estadoCivil} />
            <FilaPDF label="Sexo" valor={s.sexo} />
            <FilaPDF label="Fecha nacimiento" valor={s.fechaNac && formatFecha(s.fechaNac)} />
            <FilaPDF label="Hijos a cargo" valor={s.hijosACargo} />
          </SeccionPDF>
        )
      ))}

      <SeccionPDF titulo="Domicilio legal">
        <FilaPDF label="Calle/Número" valor={[f.legalCalle, f.legalNumero, f.legalPiso].filter(Boolean).join(' ')} />
        <FilaPDF label="Localidad" valor={f.legalLocalidad} />
        <FilaPDF label="Provincia" valor={f.legalProvincia} />
        <FilaPDF label="CP" valor={f.legalCP} />
        <FilaPDF label="Teléfono" valor={[f.legalTipoTel, f.legalCaracteristica, f.legalTelefono].filter(Boolean).join(' ')} />
        <FilaPDF label="Email" valor={f.legalEmail} />
      </SeccionPDF>

      <SeccionPDF titulo="Domicilio comercial">
        <FilaPDF label="Calle/Número" valor={[f.comCalle, f.comNumero, f.comPiso].filter(Boolean).join(' ')} />
        <FilaPDF label="Localidad" valor={f.comLocalidad} />
        <FilaPDF label="Provincia" valor={f.comProvincia} />
        <FilaPDF label="CP" valor={f.comCP} />
        <FilaPDF label="Teléfono" valor={[f.comTipoTel, f.comCaracteristica, f.comTelefono].filter(Boolean).join(' ')} />
        <FilaPDF label="Email" valor={f.comEmail} />
      </SeccionPDF>

      {[1, 2].map(n => (
        (f[`ref${n}RazonSocial`] || f[`ref${n}Contacto`]) && (
          <SeccionPDF key={n} titulo={`Referencia comercial ${n}`}>
            <FilaPDF label="Razón social" valor={f[`ref${n}RazonSocial`]} />
            <FilaPDF label="Contacto" valor={f[`ref${n}Contacto`]} />
            <FilaPDF label="Domicilio" valor={[f[`ref${n}Calle`], f[`ref${n}Numero`], f[`ref${n}Piso`], f[`ref${n}Localidad`], f[`ref${n}Provincia`], f[`ref${n}CP`]].filter(Boolean).join(' - ')} />
            <FilaPDF label="Teléfono" valor={[f[`ref${n}TipoTel`], f[`ref${n}Caracteristica`], f[`ref${n}Telefono`]].filter(Boolean).join(' ')} />
          </SeccionPDF>
        )
      ))}
    </>
  );
}

function DetalleFormAC({ f }) {
  const docs = [
    ['arca', 'Constancia de Inscripción en ARCA'],
    ['padronWeb', 'Constancia de inscripción de Ingresos Brutos (PADRÓN WEB)'],
    ['cm05', 'Declaración anual de IIBB (CM05 — Convenio Multilateral)'],
    ['estatuto', 'Copia de Estatuto, Poder y Autoridades'],
    ['form1276', 'Formulario 1276 - IIBB Santa Fe'],
    ['noRetencionIVA', 'Constancia de no retención / exclusión de IVA'],
    ['exencionIIBB', 'Constancia de exención IIBB'],
    ['noRetencionGanancias', 'Constancia de no retención Ganancias'],
  ];
  return (
    <>
      <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900 mb-5">
        Toda solicitud de alta debe enviarse con un mínimo de 72 horas de anticipación a la fecha de facturación.
      </div>

      <SeccionPDF titulo="Datos básicos">
        <FilaPDF label="Razón social / Nombre" valor={f.razonSocial} />
        <FilaPDF label="CUIT / CUIL" valor={f.cuit} />
        <FilaPDF label="Domicilio legal" valor={f.domicilioLegal} />
        <FilaPDF label="Localidad" valor={f.localidad} />
        <FilaPDF label="Provincia" valor={f.provincia} />
        <FilaPDF label="Código postal" valor={f.cp} />
        <FilaPDF label="Teléfono" valor={f.telefono} />
        <FilaPDF label="Email factura" valor={f.emailFactura} />
        <FilaPDF label="Persona de contacto" valor={f.contacto} />
        <FilaPDF label="Actividad principal" valor={f.actividadPrincipal} />
        <FilaPDF label="Compañías vinculadas" valor={f.companiasVinculadas} />
      </SeccionPDF>

      <SeccionPDF titulo="Situación impositiva">
        <FilaPDF label="IVA" valor={f.iva} />
        <FilaPDF label="Ingresos Brutos" valor={f.ingresosBrutos} />
      </SeccionPDF>

      <SeccionPDF titulo="Documentación adjunta">
        <div className="space-y-1.5 text-sm">
          {docs.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`inline-block w-4 h-4 border-2 ${f.docs?.[key] ? 'bg-stone-900 border-stone-900' : 'border-stone-400'} rounded-sm text-white text-[10px] leading-none text-center font-bold flex items-center justify-center`}>{f.docs?.[key] && '✓'}</span>
              <span className={f.docs?.[key] ? 'text-stone-900' : 'text-stone-500'}>{label}</span>
            </div>
          ))}
        </div>
      </SeccionPDF>
    </>
  );
}

// Detalle del formulario PROFORMA en el PDF
function DetalleFormProforma({ f }) {
  const formatMoneda = (n) => {
    if (f.moneda === 'USD') return formatUSD(n);
    return formatARS(n);
  };
  return (
    <>
      <SeccionPDF titulo="Cliente">
        <FilaPDF label="Cliente / Razón social" valor={f.cliente} />
        <FilaPDF label="CUIT / DNI" valor={f.cuit} />
        <FilaPDF label="Dirección" valor={f.direccion} />
        <FilaPDF label="Teléfono" valor={f.telefono} />
        <FilaPDF label="Email" valor={f.email} />
      </SeccionPDF>

      <SeccionPDF titulo="Detalle de la operación">
        <FilaPDF label="Vehículo / Producto" valor={f.vehiculo} />
        {f.detalle && <FilaPDF label="Detalle adicional" valor={f.detalle} />}
        <FilaPDF label="Moneda" valor={f.moneda} />
        <FilaPDF label="Cantidad" valor={f.cantidad} />
        <FilaPDF label="Precio unitario" valor={formatMoneda(f.precioUnitario)} />
        {f.descuento > 0 && <FilaPDF label="Descuento" valor={`− ${formatMoneda(f.descuento)}`} />}
      </SeccionPDF>

      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 -mx-2">
        <div className="flex justify-between items-center">
          <span className="text-stone-600 uppercase text-xs font-bold tracking-widest">Total</span>
          <span className="text-2xl font-black text-stone-900" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}>{formatMoneda(f.total)}</span>
        </div>
      </div>

      <SeccionPDF titulo="Condiciones">
        <FilaPDF label="Forma de pago" valor={f.formaPago} />
        <FilaPDF label="Plazo de entrega" valor={f.plazoEntrega} />
        {f.observaciones && <FilaPDF label="Observaciones" valor={f.observaciones} />}
      </SeccionPDF>
    </>
  );
}

// Detalle común para Patentamiento PF/PJ
function DetalleFormPatentamiento({ f, esPersonaJuridica }) {
  const domicilio = (prefijo) => {
    const parts = [
      f[`${prefijo}_calle`],
      f[`${prefijo}_numero`],
      f[`${prefijo}_piso`] && `Piso ${f[`${prefijo}_piso`]}`,
      f[`${prefijo}_depto`] && `Dpto ${f[`${prefijo}_depto`]}`,
    ].filter(Boolean).join(' ');
    const localidad = [f[`${prefijo}_localidad`], f[`${prefijo}_provincia`], f[`${prefijo}_cp`] && `CP ${f[`${prefijo}_cp`]}`].filter(Boolean).join(', ');
    const partido = f[`${prefijo}_partido`] && `Partido: ${f[`${prefijo}_partido`]}`;
    const barrio = f[`${prefijo}_barrio`] && `Barrio: ${f[`${prefijo}_barrio`]}`;
    return [parts, localidad, partido, barrio].filter(Boolean).join(' · ');
  };

  return (
    <>
      <SeccionPDF titulo={esPersonaJuridica ? '1. Datos de la empresa' : '1. Datos del titular'}>
        <FilaPDF label={esPersonaJuridica ? 'Razón social' : 'Apellido y Nombre'} valor={f.razonSocial} />
        <FilaPDF label="% Titularidad" valor={f.porcentajeTitularidad} />
        <FilaPDF label="CUIT" valor={f.cuit} />
        <FilaPDF label="Email" valor={f.email} />
        <FilaPDF label="Teléfono" valor={f.telefono} />
        <FilaPDF label="Actividad" valor={f.actividad} />
        {!esPersonaJuridica && (
          <>
            <FilaPDF label="Tipo y N° DNI" valor={[f.tipoDni, f.numeroDni].filter(Boolean).join(' ')} />
            <FilaPDF label="Autoridad que expidió" valor={f.autoridadExpidio} />
            <FilaPDF label="Nacionalidad" valor={f.nacionalidad} />
            <FilaPDF label="Fecha de nacimiento" valor={f.fechaNacimiento} />
            <FilaPDF label="Lugar de nacimiento" valor={f.lugarNacimiento} />
            <FilaPDF label="Estado civil" valor={f.estadoCivil} />
            {f.estadoCivil === 'CASADO' && (
              <>
                <FilaPDF label="N° de nupcias" valor={f.numeroNupcias} />
                <FilaPDF label="Cónyuge" valor={f.conyugeNombre} />
                <FilaPDF label="DNI cónyuge" valor={f.conyugeDni} />
              </>
            )}
          </>
        )}
        {esPersonaJuridica && (
          <>
            <FilaPDF label="Personería jurídica" valor={f.personeriaJuridica} />
            <FilaPDF label="N° inscripción" valor={f.numeroInscripcion} />
            <FilaPDF label="Fecha contrato/escritura" valor={f.fechaContrato} />
          </>
        )}
        <FilaPDF label="Cantidad de apoderados" valor={f.cantidadApoderados} />
      </SeccionPDF>

      <SeccionPDF titulo="2. Domicilio Legal">
        <FilaPDF label="Domicilio legal" valor={domicilio('domLegal')} />
      </SeccionPDF>

      <SeccionPDF titulo="3. Domicilio Real">
        <FilaPDF label="Domicilio real" valor={domicilio('domReal')} />
      </SeccionPDF>

      {(esPersonaJuridica || parseInt(f.cantidadApoderados) > 0) && (
        <>
          <SeccionPDF titulo="4. Datos del Apoderado">
            <FilaPDF label="Apellido y Nombre" valor={f.apoderado_apellidoNombre} />
            <FilaPDF label="Tipo y N° DNI" valor={[f.apoderado_tipoDni, f.apoderado_numeroDni].filter(Boolean).join(' ')} />
            <FilaPDF label="Sexo" valor={f.apoderado_sexo} />
            <FilaPDF label="Autoridad que expidió" valor={f.apoderado_autoridadExpidio} />
            <FilaPDF label="CUIT" valor={f.apoderado_cuit} />
            <FilaPDF label="Nacionalidad" valor={f.apoderado_nacionalidad} />
            <FilaPDF label="Teléfono" valor={f.apoderado_telefono} />
            <FilaPDF label="Email" valor={f.apoderado_email} />
            <FilaPDF label="Ocupación" valor={f.apoderado_ocupacion} />
            <FilaPDF label="Fecha de nacimiento" valor={f.apoderado_fechaNacimiento} />
            <FilaPDF label="Lugar de nacimiento" valor={f.apoderado_lugarNacimiento} />
            <FilaPDF label="Estado civil" valor={f.apoderado_estadoCivil} />
          </SeccionPDF>

          <SeccionPDF titulo="5. Domicilio Real del Apoderado">
            <FilaPDF label="Domicilio" valor={domicilio('apoderado_domReal')} />
          </SeccionPDF>
        </>
      )}

      <SeccionPDF titulo="6. Guarda Habitual (Art. 11 Dec. Ley 6582/58)">
        <FilaPDF label="Solicita guarda habitual" valor={f.guardaHabitual} />
        {f.guardaHabitual === 'SI' && <FilaPDF label="Domicilio guarda" valor={domicilio('guarda')} />}
      </SeccionPDF>

      <SeccionPDF titulo="7. Datos del Registro">
        <FilaPDF label="Registro número" valor={f.registro_numero} />
        <FilaPDF label="Domicilio del registro" valor={domicilio('registro')} />
      </SeccionPDF>
    </>
  );
}


function InputStyle() {
  return (
    <style>{`
      /* ============================================================
         SISTEMA DE DISEÑO — FOTON MALASPINA
         Estética premium tipo Tesla/Apple
         Paleta: blanco puro / negro denso. Sin colores fuertes.
         ============================================================ */

      .app-root {
        font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        letter-spacing: -0.01em;
      }

      /* TEMA CLARO — Blanco puro con negro */
      [data-theme="claro"] {
        --bg-app: #ffffff;
        --bg-surface: #ffffff;
        --bg-surface-2: #fafafa;
        --bg-surface-3: #f4f4f5;
        --border: #e4e4e7;
        --border-strong: #a1a1aa;
        --text-primary: #09090b;
        --text-secondary: #3f3f46;
        --text-muted: #71717a;
        --text-soft: #a1a1aa;
        --accent: #09090b;
        --accent-hover: #18181b;
        --accent-text: #ffffff;
        --accent-soft: rgba(9, 9, 11, 0.04);
        --accent-soft-border: rgba(9, 9, 11, 0.12);
        --foton-red: #dc2626;
      }

      /* TEMA OSCURO — Negro denso, contraste alto */
      [data-theme="oscuro"] {
        --bg-app: #0a0a0a;
        --bg-surface: #0a0a0a;
        --bg-surface-2: #18181b;
        --bg-surface-3: #27272a;
        --border: #27272a;
        --border-strong: #52525b;
        --text-primary: #fafafa;
        --text-secondary: #d4d4d8;
        --text-muted: #a1a1aa;
        --text-soft: #71717a;
        --accent: #fafafa;
        --accent-hover: #ffffff;
        --accent-text: #09090b;
        --accent-soft: rgba(250, 250, 250, 0.06);
        --accent-soft-border: rgba(250, 250, 250, 0.18);
        --foton-red: #ef4444;
      }

      .app-root {
        background: var(--bg-app);
        color: var(--text-primary);
      }
      .app-header {
        background: var(--bg-surface);
        border-color: var(--border);
        box-shadow: none;
      }

      /* Mapeo masivo: TODO lo que era stone/amber a la paleta nueva */
      .app-root .bg-stone-950 { background: var(--bg-app) !important; }
      .app-root .bg-stone-900 { background: var(--bg-surface) !important; }
      .app-root .bg-stone-800 { background: var(--bg-surface-2) !important; }
      .app-root [class*="bg-stone-900\\/50"], .app-root .bg-stone-900\\/50 { background: var(--bg-surface-2) !important; opacity: 1 !important; }

      /* Bordes finísimos como Apple */
      .app-root .border-stone-800,
      .app-root .border-stone-900 {
        border-color: var(--border) !important;
      }

      /* Tipografía: texto claro */
      .app-root .text-stone-100, .app-root .text-stone-200 { color: var(--text-primary) !important; }
      .app-root .text-stone-300, .app-root .text-stone-400 { color: var(--text-secondary) !important; }
      .app-root .text-stone-500, .app-root .text-stone-600, .app-root .text-stone-700 { color: var(--text-muted) !important; }

      /* Ámbar → negro/blanco según tema */
      .app-root .text-amber-400, .app-root .text-amber-300, .app-root .text-amber-200 { color: var(--text-primary) !important; }
      .app-root .bg-amber-400, .app-root .bg-amber-300 { background: var(--accent) !important; color: var(--accent-text) !important; }
      .app-root .border-amber-400, .app-root .border-amber-500 { border-color: var(--border) !important; }
      .app-root .accent-amber-400 { accent-color: var(--accent) !important; }
      .app-root [class*="bg-amber-400\\/"] { background: var(--accent-soft) !important; }
      .app-root [class*="border-amber-400\\/"] { border-color: var(--accent-soft-border) !important; }
      .app-root [class*="text-amber-400\\/"] { color: var(--text-primary) !important; }
      .app-root .hover\\:bg-amber-300:hover { background: var(--accent-hover) !important; color: var(--accent-text) !important; }

      /* Hovers */
      .app-root .hover\\:bg-stone-700:hover { background: var(--bg-surface-3) !important; }
      .app-root .hover\\:bg-stone-800:hover { background: var(--bg-surface-2) !important; }
      .app-root .hover\\:border-amber-400\\/30:hover, .app-root .hover\\:border-amber-400\\/40:hover { border-color: var(--accent-soft-border) !important; }
      .app-root .hover\\:text-stone-200:hover { color: var(--text-primary) !important; }
      .app-root .hover\\:text-amber-200:hover { color: var(--text-primary) !important; }

      /* Tabs */
      .btn-tab {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid transparent;
        transition: all 0.15s;
      }
      .btn-tab:hover {
        color: var(--text-primary);
        background: var(--bg-surface-2);
      }
      .btn-active {
        background: var(--accent) !important;
        color: var(--accent-text) !important;
      }

      /* Inputs estilo Apple: bordes muy sutiles, focus marcado */
      .input {
        width: 100%;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 0.7rem 0.9rem;
        border-radius: 8px;
        font-size: 0.9rem;
        outline: none;
        transition: all 0.15s ease;
        font-family: inherit;
        letter-spacing: -0.005em;
      }
      .input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }
      .input::placeholder { color: var(--text-soft); }

      /* Colores secundarios: muy suavizados */
      [data-theme="claro"] .text-green-400 { color: #16a34a !important; }
      [data-theme="claro"] .text-green-300 { color: #15803d !important; }
      [data-theme="claro"] .text-green-200 { color: #14532d !important; }
      [data-theme="claro"] .bg-green-950 { background: #f0fdf4 !important; }
      [data-theme="claro"] .bg-green-500 { background: #16a34a !important; }
      [data-theme="claro"] .border-green-700 { border-color: #bbf7d0 !important; }
      [data-theme="claro"] .text-orange-400 { color: #c2410c !important; }
      [data-theme="claro"] .text-red-200 { color: #991b1b !important; }
      [data-theme="claro"] .hover\\:bg-red-900:hover { background: #fee2e2 !important; color: #991b1b !important; }
      [data-theme="claro"] .hover\\:text-red-200:hover { color: #991b1b !important; }
      [data-theme="claro"] select.input { background: white; }
      [data-theme="claro"] select.input option { background: white; color: #09090b; }

      /* Cards: estilo Apple muy sutiles */
      .app-root .bg-stone-900 {
        background: var(--bg-surface) !important;
        border-radius: 12px;
      }
      .app-root .rounded-lg { border-radius: 12px !important; }
      .app-root .rounded { border-radius: 8px !important; }

      /* Sombras muy sutiles (estilo Apple) */
      [data-theme="claro"] .bg-stone-900 {
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02), 0 1px 1px 0 rgba(0, 0, 0, 0.02);
      }
      [data-theme="oscuro"] .bg-stone-900 {
        box-shadow: none;
      }

      /* Headings: peso fuerte, tracking ajustado */
      .heading-display {
        font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1.05;
      }

      /* Datos grandes (montos, cuotas) */
      .data-large {
        font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
        font-weight: 700;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      /* Labels chiquitas estilo Apple */
      .label-tiny {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
      }

      /* Botones planos */
      .app-root button {
        font-family: inherit;
        letter-spacing: -0.005em;
      }

      /* Scrollbar fina */
      .app-root ::-webkit-scrollbar { width: 8px; height: 8px; }
      .app-root ::-webkit-scrollbar-track { background: transparent; }
      .app-root ::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 4px;
      }
      .app-root ::-webkit-scrollbar-thumb:hover {
        background: var(--border-strong);
      }

      /* ============================================================
         IMPRESIÓN A4 — Solo el documento, prolijo y bien formateado
         ============================================================ */
      @media print {
        /* Hoja A4: 210mm × 297mm. Márgenes generosos para imprenta. */
        @page {
          size: A4;
          margin: 14mm 12mm;
        }

        /* Reset: ocultar TODO menos el documento */
        body * { visibility: hidden; }
        .print-document, .print-document * {
          visibility: visible !important;
        }

        /* El documento ocupa la hoja completa */
        .print-document {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          color: #09090b !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          font-family: 'Inter', -apple-system, system-ui, sans-serif !important;
          font-size: 10.5pt !important;
          line-height: 1.45 !important;
          /* Asegurar que los colores de fondo se impriman (cuadros amarillos, etc.) */
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* Heredar la regla de color-adjust a todos los descendientes */
        .print-document * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Ocultar elementos de UI no imprimibles */
        .print\\:hidden,
        [class*="print:hidden"] {
          display: none !important;
          visibility: hidden !important;
        }

        /* El modal contenedor debe pasar el documento a la hoja sin recortarlo */
        .fixed.inset-0 {
          position: static !important;
          background: white !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .fixed.inset-0 > div {
          box-shadow: none !important;
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          border-radius: 0 !important;
        }

        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 10pt;
          line-height: 1.4;
        }

        /* Mantener tipografía consistente y legible */
        .print-document h1,
        .print-document h2,
        .print-document h3 {
          page-break-after: avoid;
        }
        .print-document table {
          page-break-inside: auto;
          border-collapse: collapse !important;
        }
        .print-document tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .print-document thead {
          display: table-header-group;
        }
        .print-document tfoot {
          display: table-footer-group;
        }

        /* Evitar romper bloques importantes a mitad de página */
        .print-document .no-break {
          page-break-inside: avoid;
        }

        /* Forzar mostrar fondos en navegadores Chromium */
        .print-document [style*="background"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }

      /* En pantalla, mostrar el documento con tamaño A4 visual para previsualizar */
      @media screen {
        .print-document {
          background: white;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          font-size: 12px;
          line-height: 1.5;
        }
      }
    `}</style>
  );
}

// ============================================================
// PANEL DE ACTUALIZACIÓN MENSUAL
// ============================================================

// ============================================================
// PROFORMAS — Datos fijos del facturador
// ============================================================
const PROFORMA_FACTURADORES = {
  corven: {
    nombre: 'CORVEN MOTORS ARGENTINA S.A.',
    domicilio: 'Marcos Ciani 2220',
    cpLocalidad: '(2600) Venado Tuerto, Santa Fe',
    telefono: '(03462) 43-8181',
    cuit: '30-71027733-4',
    ingBrutos: '30-71027733-4',
    iva: 'I.V.A. RESPONSABLE INSCRIPTO',
    logo: '🅒', // se reemplaza por el real al imprimir
  },
  malaspina: {
    nombre: 'Carlos Malaspina Tractores SA',
    domicilio: 'Alem 508',
    cpLocalidad: '(6450) Pehuajo, Buenos Aires',
    telefono: '(0239) 6549920',
    cuit: '30-71891875-4',
    ingBrutos: '30-71891875-4',
    iva: 'I.V.A. RESPONSABLE INSCRIPTO',
  },
};

// IVA según tipo de vehículo
// 21%: Pickups y uso particular (Tunland G7, V7, V9)
// 10,5%: Utilitarios, camiones (TM, Wonder, Aumark, Auman, Blueline, etc.)
const getIVAPorModelo = (modelo) => {
  if (!modelo) return 10.5;
  const grupo = modelo.grupoTasa || '';
  const nombre = (modelo.nombre || '').toLowerCase();
  const linea = (modelo.linea || '').toLowerCase();
  // Pickups (Tunland G7, V7, V9) → 21%
  if (grupo === 'pickups') return 21;
  if (linea.includes('tunland') || nombre.includes('tunland')) return 21;
  // Resto (utilitarios y camiones) → 10,5%
  return 10.5;
};

// ============================================================
// MÓDULO PROFORMAS
// ============================================================
function ModuloProformas({ modelos, vendedores, proformas, onGuardar, onEliminar, contadores, configFoton }) {
  const [facturador, setFacturador] = useState('corven'); // 'corven' | 'malaspina'
  const [verProforma, setVerProforma] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Proformas</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Generar proformas de venta. Las dos sirven para enviar al banco.</p>
      </div>

      {/* Selector de facturador */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFacturador('corven')}
          className="px-4 py-2.5 rounded text-sm font-semibold transition"
          style={facturador === 'corven'
            ? { background: 'var(--accent)', color: 'var(--accent-text)' }
            : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          🏭 Corven Motors
        </button>
        <button
          onClick={() => setFacturador('malaspina')}
          className="px-4 py-2.5 rounded text-sm font-semibold transition"
          style={facturador === 'malaspina'
            ? { background: 'var(--accent)', color: 'var(--accent-text)' }
            : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          🚛 Carlos Malaspina Tractores
        </button>
      </div>

      {facturador === 'corven' && (
        <ProformaCorven
          modelos={modelos}
          vendedores={vendedores}
          proformas={proformas.filter(p => p.facturador === 'corven')}
          onGuardar={onGuardar}
          onEliminar={onEliminar}
          contadores={contadores}
          onVer={setVerProforma}
          configFoton={configFoton}
        />
      )}

      {facturador === 'malaspina' && (
        <ProformaMalaspina
          modelos={modelos}
          vendedores={vendedores}
          proformas={proformas.filter(p => p.facturador === 'malaspina')}
          onGuardar={onGuardar}
          onEliminar={onEliminar}
          contadores={contadores}
          onVer={setVerProforma}
          configFoton={configFoton}
        />
      )}

      {verProforma && verProforma.facturador === 'corven' && <ModalProformaCorven proforma={verProforma} onClose={() => setVerProforma(null)} />}
      {verProforma && verProforma.facturador === 'malaspina' && <ModalProformaMalaspina proforma={verProforma} onClose={() => setVerProforma(null)} />}
    </div>
  );
}

// ============================================================
// PROFORMA CORVEN — formulario + listado
// ============================================================
function ProformaCorven({ modelos, vendedores, proformas, onGuardar, onEliminar, contadores, onVer, configFoton }) {
  // Datos cliente
  const [razonSocial, setRazonSocial] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [email, setEmail] = useState('');
  const [ivaCond, setIvaCond] = useState('RESP. INSCRIPTO');
  const [cuit, setCuit] = useState('');
  const [provincia, setProvincia] = useState('Buenos Aires');
  const [telefono, setTelefono] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [ingBrutos, setIngBrutos] = useState('');

  // Unidad
  const [modeloId, setModeloId] = useState(modelos[0]?.id || '');
  const [versionId, setVersionId] = useState('');
  const modelo = modelos.find(m => m.id === modeloId) || modelos[0];
  const version = modelo?.versiones?.find(v => v.id === versionId) || modelo?.versiones?.[0];

  useEffect(() => {
    if (modelo && !modelo.versiones.find(v => v.id === versionId)) {
      setVersionId(modelo.versiones[0]?.id || '');
    }
  }, [modeloId, modelo, versionId]);

  // Detalles editables de la unidad
  const [tipoUnidad, setTipoUnidad] = useState('Chasis');
  const [origenUnidad, setOrigenUnidad] = useState('NACIONAL');
  const [estadoUnidad, setEstadoUnidad] = useState('UNIDAD DE FABRICACION NACIONAL');

  // Operación
  const [moneda, setMoneda] = useState('USD'); // 'USD' o 'ARS'
  const [cantidad, setCantidad] = useState('1');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [descuento, setDescuento] = useState('');
  const [iibb, setIibb] = useState('');
  const [ivaPct, setIvaPct] = useState('10.5');

  // Auto-completar precio cuando cambia modelo/moneda
  useEffect(() => {
    if (!version) return;
    if (moneda === 'USD') {
      // Usar precio financiado en USD si existe, sino el público
      const precio = version.monedaFinanciada === 'USD' ? version.precioFinanciado : (version.monedaPublica === 'USD' ? version.precioPublico : 0);
      setPrecioUnitario(precio > 0 ? String(precio) : '');
    } else {
      // ARS: usar venta directa si existe
      const precio = version.monedaVentaDirecta === 'ARS' ? version.precioVentaDirecta : 0;
      setPrecioUnitario(precio > 0 ? String(precio) : '');
    }
  }, [versionId, moneda, version]);

  // Auto-setear IVA según tipo de modelo (21% pickups, 10,5% resto)
  // Si el vendedor lo cambia manualmente, queda editable hasta cambiar de modelo
  useEffect(() => {
    if (!modelo) return;
    const ivaAuto = getIVAPorModelo(modelo);
    setIvaPct(String(ivaAuto));
  }, [modeloId]);

  // Condiciones de venta
  const [formaPago, setFormaPago] = useState('FINANCIADO');
  const [bancoFinanc, setBancoFinanc] = useState('BANCO CREDICOOP');
  const [plazoMeses, setPlazoMeses] = useState('36');
  const [lineaCredito, setLineaCredito] = useState('FINANCIACION DENTRO DE LINEA DE CREDITO DE ADQUISICION DE BIENES DE CAPITAL A TASA REDUCIDA');
  const [lugarEntrega, setLugarEntrega] = useState('BUENOS AIRES');
  const [validezDias, setValidezDias] = useState('7');

  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id || '');
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Cálculos
  const cantN = parseInt(cantidad) || 0;
  const precioN = parseNum(precioUnitario);
  const subtotal = cantN * precioN;
  const descN = parseNum(descuento);
  const iibbN = parseNum(iibb);
  const baseIva = subtotal - descN;
  const ivaN = baseIva * (parseFloat(ivaPct) / 100);
  const neto = baseIva + ivaN + iibbN;

  const formatMoneda = (n) => moneda === 'USD'
    ? `USD ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
    : formatARS(n);

  const proxNumero = (contadores.proformaCorven || 0) + 1;
  const numero = String(proxNumero);

  const guardarProforma = () => {
    if (!razonSocial.trim()) { alert('Cargá la razón social del cliente'); return; }
    if (!modelo || !version) { alert('Elegí modelo y versión'); return; }
    if (precioN === 0) { alert('Cargá el precio unitario'); return; }

    const vendedor = vendedores.find(v => v.id === vendedorId);
    onGuardar({
      facturador: 'corven',
      numero,
      fechaCreacion: new Date().toISOString(),
      cliente: {
        razonSocial: razonSocial.trim(),
        domicilio: domicilio.trim(),
        email: email.trim(),
        ivaCond,
        cuit: cuit.trim(),
        provincia: provincia.trim(),
        telefono: telefono.trim(),
        localidad: localidad.trim(),
        ingBrutos: ingBrutos.trim(),
      },
      unidad: {
        nombre: `${modelo.nombre} ${version.nombre}`,
        modelo: modelo.nombre,
        version: version.nombre,
        marca: 'FOTON',
        tipo: tipoUnidad,
        origen: origenUnidad,
        estado: estadoUnidad,
      },
      operacion: {
        moneda,
        cantidad: cantN,
        precioUnitario: precioN,
        subtotal,
        descuento: descN,
        iibb: iibbN,
        ivaPct: parseFloat(ivaPct) || 0,
        ivaMonto: ivaN,
        neto,
      },
      condiciones: {
        formaPago,
        bancoFinanc,
        plazoMeses: parseInt(plazoMeses) || 0,
        lineaCredito,
        lugarEntrega,
        validezDias: parseInt(validezDias) || 7,
      },
      vendedor: vendedor ? { id: vendedor.id, nombre: vendedor.nombre } : null,
    });
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 3000);
  };

  const previsualizarProforma = {
    facturador: 'corven',
    numero,
    fechaCreacion: new Date().toISOString(),
    cliente: { razonSocial, domicilio, email, ivaCond, cuit, provincia, telefono, localidad, ingBrutos },
    unidad: { nombre: modelo ? `${modelo.nombre} ${version?.nombre || ''}` : '', modelo: modelo?.nombre, version: version?.nombre, marca: 'FOTON', tipo: tipoUnidad, origen: origenUnidad, estado: estadoUnidad },
    operacion: { moneda, cantidad: cantN, precioUnitario: precioN, subtotal, descuento: descN, iibb: iibbN, ivaPct: parseFloat(ivaPct) || 0, ivaMonto: ivaN, neto },
    condiciones: { formaPago, bancoFinanc, plazoMeses: parseInt(plazoMeses) || 0, lineaCredito, lugarEntrega, validezDias: parseInt(validezDias) || 7 },
  };

  return (
    <div className="space-y-6">
      {/* Encabezado info */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Facturador</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>CORVEN MOTORS ARGENTINA S.A. · CUIT 30-71027733-4</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>N° Proforma</div>
            <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{numero}</div>
          </div>
        </div>
      </div>

      {/* Datos cliente */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Datos del cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Razón Social *"><input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value.toUpperCase())} placeholder="ARIATI NICOLAS JAVIER" className="input" /></Campo>
          <Campo label="CUIT"><InputCUIT value={cuit} onChange={setCuit} /></Campo>
          <Campo label="I.V.A.">
            <select value={ivaCond} onChange={e => setIvaCond(e.target.value)} className="input">
              <option value="RESP. INSCRIPTO">Resp. Inscripto</option>
              <option value="MONOTRIBUTO">Monotributo</option>
              <option value="CONSUMIDOR FINAL">Consumidor Final</option>
              <option value="EXENTO">Exento</option>
              <option value="NO RESPONSABLE">No Responsable</option>
            </select>
          </Campo>
          <Campo label="Domicilio"><input type="text" value={domicilio} onChange={e => setDomicilio(e.target.value.toUpperCase())} placeholder="SAN MARTIN 171" className="input" /></Campo>
          <Campo label="Localidad"><InputLocalidad value={localidad} onChange={setLocalidad} /></Campo>
          <Campo label="Provincia"><input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="input" /></Campo>
          <Campo label="Teléfono"><InputTelefono value={telefono} onChange={setTelefono} /></Campo>
          <Campo label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className="input" /></Campo>
          <Campo label="Ing. Brutos"><input type="text" value={ingBrutos} onChange={e => setIngBrutos(e.target.value)} placeholder="20-XXXXXXXX-X" className="input" /></Campo>
        </div>
      </section>

      {/* Unidad */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Unidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Modelo">
            <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="input">
              {[...new Set(modelos.filter(m => m.visible !== false).map(m => m.linea))].map(linea => (
                <optgroup key={linea} label={linea}>
                  {modelos.filter(m => m.linea === linea && m.visible !== false).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo label="Versión">
            <select value={versionId} onChange={e => setVersionId(e.target.value)} className="input">
              {modelo?.versiones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo"><input type="text" value={tipoUnidad} onChange={e => setTipoUnidad(e.target.value)} placeholder="Chasis" className="input" /></Campo>
          <Campo label="Origen">
            <select value={origenUnidad} onChange={e => setOrigenUnidad(e.target.value)} className="input">
              <option value="NACIONAL">NACIONAL</option>
              <option value="IMPORTADO">IMPORTADO</option>
            </select>
          </Campo>
          <Campo label="Estado">
            <select value={estadoUnidad} onChange={e => setEstadoUnidad(e.target.value)} className="input">
              <option value="UNIDAD DE FABRICACION NACIONAL">Unidad de fabricación nacional</option>
              <option value="UNIDAD 0 KM">Unidad 0 KM</option>
              <option value="UNIDAD IMPORTADA">Unidad importada</option>
            </select>
          </Campo>
        </div>
      </section>

      {/* Operación */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Operación</h2>

        {/* Selector moneda */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMoneda('USD')} className="px-4 py-2 rounded text-sm font-semibold transition"
            style={moneda === 'USD' ? { background: 'var(--accent)', color: 'var(--accent-text)' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            💵 USD (Dólares)
          </button>
          <button onClick={() => setMoneda('ARS')} className="px-4 py-2 rounded text-sm font-semibold transition"
            style={moneda === 'ARS' ? { background: 'var(--accent)', color: 'var(--accent-text)' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            🇦🇷 ARS (Pesos)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Cantidad"><input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="input" /></Campo>
          <Campo label={`Precio unitario s/IVA (${moneda})`}><InputDinero value={precioUnitario} onChange={setPrecioUnitario} /></Campo>
          <Campo label="Descuento"><InputDinero value={descuento} onChange={setDescuento} placeholder="0" /></Campo>
          <Campo label="IIBB"><InputDinero value={iibb} onChange={setIibb} placeholder="0" /></Campo>
          <Campo label="IVA %" hint={`${getIVAPorModelo(modelo) === 21 ? '🚙 Pickup/uso particular' : '🚛 Utilitario/camión'} → ${getIVAPorModelo(modelo)}% (editable)`}>
            <div className="flex items-center gap-2">
              <input type="number" step="0.5" value={ivaPct} onChange={e => setIvaPct(e.target.value)} className="input" />
              <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>%</span>
              {parseFloat(ivaPct) !== getIVAPorModelo(modelo) && (
                <button
                  onClick={() => setIvaPct(String(getIVAPorModelo(modelo)))}
                  className="px-2 py-1.5 rounded text-[10px] font-semibold whitespace-nowrap"
                  style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  title={`Restablecer al IVA sugerido (${getIVAPorModelo(modelo)}%)`}
                >
                  ↺ Auto
                </button>
              )}
            </div>
          </Campo>
        </div>

        {/* Totales en vivo */}
        <div className="mt-5 p-4 rounded grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Subtotal</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(subtotal)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>IVA ({ivaPct}%)</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(ivaN)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>IIBB</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(iibbN)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent)' }}>NETO A COBRAR</div>
            <div className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{formatMoneda(neto)}</div>
          </div>
        </div>
      </section>

      {/* Condiciones de venta */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Condiciones de venta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Forma de pago">
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className="input">
              <option value="FINANCIADO">Financiado</option>
              <option value="CONTADO">Contado</option>
              <option value="LEASING">Leasing</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </Campo>
          {formaPago === 'FINANCIADO' && (
            <>
              <Campo label="Financiación bancaria">
                <select value={bancoFinanc} onChange={e => setBancoFinanc(e.target.value)} className="input">
                  <option value="BANCO CREDICOOP">Banco Credicoop</option>
                  <option value="BANCO SANTANDER">Banco Santander</option>
                  <option value="BANCO GALICIA">Banco Galicia</option>
                  <option value="BANCO ICBC">Banco ICBC</option>
                  <option value="BANCO COMAFI">Banco Comafi</option>
                  <option value="BANCO NACIÓN">Banco Nación</option>
                  <option value="BANCO BICE">Banco BICE</option>
                  <option value="OTRO">Otro</option>
                </select>
              </Campo>
              <Campo label="Plazo (meses)">
                <select value={plazoMeses} onChange={e => setPlazoMeses(e.target.value)} className="input">
                  <option value="12">12 meses</option>
                  <option value="18">18 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                  <option value="48">48 meses</option>
                  <option value="60">60 meses</option>
                </select>
              </Campo>
            </>
          )}
          <Campo label="Lugar de entrega"><input type="text" value={lugarEntrega} onChange={e => setLugarEntrega(e.target.value.toUpperCase())} className="input" /></Campo>
          <Campo label="Validez de la oferta (días)"><input type="number" value={validezDias} onChange={e => setValidezDias(e.target.value)} className="input" /></Campo>
          <Campo label="Vendedor">
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
        </div>
        {formaPago === 'FINANCIADO' && (
          <div className="mt-4">
            <Campo label="Detalle línea de crédito" hint="Texto que aparece en la proforma debajo de la financiación">
              <textarea value={lineaCredito} onChange={e => setLineaCredito(e.target.value.toUpperCase())} className="input" rows="2" />
            </Campo>
          </div>
        )}
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button onClick={guardarProforma}
          className="px-4 py-2.5 rounded text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
          💾 Guardar proforma
        </button>
        <button onClick={() => onVer(previsualizarProforma)}
          className="px-4 py-2.5 rounded text-sm font-semibold"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          🖨️ Vista previa / Imprimir
        </button>
        {guardadoOk && (
          <div className="px-4 py-2.5 rounded text-sm font-semibold" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            ✓ Guardado
          </div>
        )}
      </div>

      {/* Historial */}
      {proformas.length > 0 && (
        <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Proformas guardadas ({proformas.length})</h2>
          <div className="space-y-2">
            {[...proformas].reverse().map(p => (
              <div key={p.numero} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>N° {p.numero} · {p.cliente.razonSocial}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {p.unidad.nombre} · {p.operacion.moneda} {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(p.operacion.neto)} · {formatFecha(p.fechaCreacion)}
                  </div>
                </div>
                <button onClick={() => onVer(p)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-primary)' }}>Ver</button>
                <button onClick={() => { if (confirm(`¿Eliminar proforma N° ${p.numero}?`)) onEliminar(p.numero); }} className="px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-surface-3)', color: '#dc2626' }}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Modal de impresión de Proforma Corven
// Diseño IDÉNTICO al PDF que pasó Agustín
// ============================================================
function ModalProformaCorven({ proforma: p, onClose }) {
  const fact = PROFORMA_FACTURADORES.corven;
  const fechaTxt = new Date(p.fechaCreacion).toLocaleDateString('es-AR');
  const fmt = (n) => {
    if (!n && n !== 0) return '-';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };
  const monedaSimbolo = p.operacion.moneda === 'USD' ? 'USD' : '$';

  // Mensaje resumido para WhatsApp / Email
  const generarMensaje = () => {
    let m = `📄 *Proforma Corven N° ${p.numero}*\n`;
    m += `Fecha: ${fechaTxt}\n\n`;
    m += `👤 *Cliente:* ${p.cliente.razonSocial}\n`;
    if (p.cliente.cuit) m += `CUIT: ${p.cliente.cuit}\n`;
    if (p.cliente.localidad) m += `${p.cliente.localidad}${p.cliente.provincia ? ', ' + p.cliente.provincia : ''}\n`;
    m += `\n🚛 *Unidad:* ${p.unidad.nombre}\n`;
    m += `Marca: ${p.unidad.marca} · Origen: ${p.unidad.origen}\n`;
    m += `\n💰 *Detalle:*\n`;
    m += `Subtotal: ${p.operacion.moneda} ${fmt(p.operacion.subtotal)}\n`;
    if (p.operacion.descuento > 0) m += `Descuento: ${p.operacion.moneda} ${fmt(p.operacion.descuento)}\n`;
    m += `IVA (${p.operacion.ivaPct}%): ${p.operacion.moneda} ${fmt(p.operacion.ivaMonto)}\n`;
    if (p.operacion.iibb > 0) m += `IIBB: ${fmt(p.operacion.iibb)}\n`;
    m += `*NETO A COBRAR: ${p.operacion.moneda} ${fmt(p.operacion.neto)}*\n`;
    m += `\n🏦 *Condiciones:*\n`;
    m += `Forma de pago: ${p.condiciones.formaPago}\n`;
    if (p.condiciones.formaPago === 'FINANCIADO') {
      m += `Financiación: ${p.condiciones.bancoFinanc}\n`;
      m += `Plazo: ${p.condiciones.plazoMeses} meses\n`;
    }
    if (p.operacion.moneda === 'USD') m += `_Valores en USD. En pesos al TC BNA del día anterior al pago._\n`;
    m += `Flete y formularios facturados por separado.\n`;
    m += `Patentamiento no incluido (a cargo del comprador).\n`;
    m += `Lugar de entrega: ${p.condiciones.lugarEntrega}\n`;
    m += `\n_Validez de la oferta: ${p.condiciones.validezDias} días._\n`;
    m += `_Este formulario no tiene valor fiscal._`;
    return m;
  };

  const asuntoEmail = `Proforma Corven N° ${p.numero}${p.cliente.razonSocial ? ' · ' + p.cliente.razonSocial : ''}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-h-[95vh] overflow-y-auto print:max-h-full print:rounded-none print:max-w-full" style={{ maxWidth: "820px" }} onClick={e => e.stopPropagation()}>
        {/* Acciones — no se imprime */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex justify-between items-center print:hidden">
          <div className="text-sm font-bold text-stone-900">PROFORMA CORVEN N° {p.numero}</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs font-semibold bg-stone-200 text-stone-700">Cerrar</button>
        </div>

        {/* Botones de envío */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 print:hidden">
          <BotonesEnviar
            mensaje={generarMensaje()}
            whatsappCliente={p.cliente.telefono}
            emailCliente={p.cliente.email}
            asuntoEmail={asuntoEmail}
            onImprimir={() => window.print()}
          />
          {!p.cliente.telefono && (
            <p className="text-xs mt-2" style={{ color: '#92400e' }}>💡 Cargá el teléfono del cliente en la proforma para enviarlo directo por WhatsApp.</p>
          )}
        </div>

        {/* DOCUMENTO IMPRIMIBLE — IDÉNTICO al PDF de Corven */}
        <div className="p-10 print:p-0 print-document text-stone-900">
          {/* Encabezado: logo + título PRO-FORMA + N° fecha CUIT */}
          <div className="grid grid-cols-3 gap-4 mb-3 items-start">
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-full bg-stone-200 border-2 border-stone-400 flex items-center justify-center">
                <div className="text-stone-600 font-black text-xs text-center leading-tight">CVN<br/>MOTORS</div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block border border-stone-900 px-3 py-0.5 text-xs">X</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl tracking-wide">PRO-FORMA</div>
            </div>
          </div>

          {/* Datos del facturador a la izq y N°/fecha/CUIT a la derecha */}
          <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-stone-900">
            <div>
              <div className="font-black text-base">{fact.nombre}</div>
              <div className="text-xs">{fact.domicilio}</div>
              <div className="text-xs">{fact.cpLocalidad}</div>
              <div className="text-xs">Teléfono: {fact.telefono}</div>
              <div className="text-xs">{fact.iva}</div>
            </div>
            <div className="text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="font-bold">N.°</div>             <div>{p.numero}</div>
                <div className="font-bold">FECHA</div>           <div>{fechaTxt}</div>
                <div className="font-bold">CUIT</div>            <div>{fact.cuit}</div>
                <div className="font-bold">ING. BRUTOS</div>     <div>{fact.ingBrutos}</div>
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 pb-3 border-b border-stone-900 text-xs">
            <div className="grid grid-cols-[100px_1fr] gap-x-2">
              <div className="font-bold">RAZÓN SOCIAL:</div>   <div className="font-semibold">{p.cliente.razonSocial}</div>
              <div className="font-bold">DOMICILIO:</div>      <div>{p.cliente.domicilio}</div>
              <div className="font-bold">EMAIL</div>           <div>{p.cliente.email}</div>
              <div className="font-bold">I.V.A.</div>          <div>{p.cliente.ivaCond}</div>
              <div className="font-bold">CUIT:</div>           <div>{p.cliente.cuit}</div>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-x-2">
              <div className="font-bold">PROVINCIA:</div>      <div>{p.cliente.provincia}</div>
              <div className="font-bold">TELEFONO:</div>       <div>{p.cliente.telefono}</div>
              <div className="font-bold">LOCALIDAD:</div>      <div>{p.cliente.localidad}</div>
              <div className="font-bold">ING. BRUTOS:</div>    <div>{p.cliente.ingBrutos}</div>
            </div>
          </div>

          {/* Tabla de detalle */}
          <table className="w-full border-collapse text-xs mb-3" style={{ border: '1px solid #1c1917' }}>
            <thead>
              <tr style={{ background: '#fff' }}>
                <th className="border border-stone-900 p-1.5 text-center font-bold">CÓDIGO</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">DESCRIPCIÓN</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">CANTIDAD</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">MONEDA</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">PRECIO UNITARIO S/IVA</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-center font-bold">{p.unidad.nombre.toUpperCase()}</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.cantidad}</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.moneda}</td>
                <td className="border border-stone-900 p-1.5 text-right">{fmt(p.operacion.precioUnitario)}</td>
                <td className="border border-stone-900 p-1.5 text-right font-bold">{fmt(p.operacion.subtotal)}</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={5}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><strong className="underline">Detalles de la unidad</strong></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><span className="ml-12">Marca: {p.unidad.marca}</span></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><span className="ml-12">Modelo : {p.unidad.modelo}</span></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><span className="ml-12">Tipo : {p.unidad.tipo}</span></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><span className="ml-12">Origen: {p.unidad.origen}</span></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={2}><span className="ml-12">Estado: {p.unidad.estado}</span></td>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={5}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={5}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-right">$ -</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="p-1.5 text-right font-bold" colSpan={4}>SUB TOTAL</td>
                <td className="p-1.5 text-right">$</td>
                <td className="border border-stone-900 p-1.5 text-right font-bold">{fmt(p.operacion.subtotal)}</td>
              </tr>
              <tr>
                <td className="p-1.5 text-right font-bold" colSpan={4}>DESCUENTO</td>
                <td className="p-1.5 text-right">$</td>
                <td className="border border-stone-900 p-1.5 text-right">{p.operacion.descuento > 0 ? fmt(p.operacion.descuento) : '-'}</td>
              </tr>
              <tr>
                <td className="p-1.5 text-right font-bold" colSpan={5}>IIBB</td>
                <td className="border border-stone-900 p-1.5 text-right">{p.operacion.iibb > 0 ? fmt(p.operacion.iibb) : '-'}</td>
              </tr>
              <tr>
                <td className="p-1.5 text-right font-bold" colSpan={4}>I.V.A. ({p.operacion.ivaPct}%)</td>
                <td className="p-1.5 text-right">{p.operacion.moneda}</td>
                <td className="border border-stone-900 p-1.5 text-right font-bold">{fmt(p.operacion.ivaMonto)}</td>
              </tr>
              <tr>
                <td className="p-1.5 text-right font-bold" colSpan={4}>NETO A COBRAR</td>
                <td className="p-1.5 text-right font-bold">{p.operacion.moneda}</td>
                <td className="border border-stone-900 p-1.5 text-right font-black text-sm">{fmt(p.operacion.neto)}</td>
              </tr>
            </tfoot>
          </table>

          {/* CONDICIONES DE VENTA */}
          <div className="mb-3">
            <div className="font-bold text-xs mb-1.5">CONDICIONES DE VENTA</div>
            <div className="text-xs space-y-0.5">
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <div className="font-bold">MONEDA:</div>
                <div>
                  {p.operacion.moneda === 'USD'
                    ? 'VALORES EXPRESADOS EN DOLARES ESTADOUNIDENSES. EN PESOS AL TC BNA DEL DÍA ANTERIOR AL PAGO'
                    : 'VALORES EXPRESADOS EN PESOS ARGENTINOS'}
                </div>
                <div className="font-bold">FORMA DE PAGO:</div>
                <div>{p.condiciones.formaPago}</div>
                {p.condiciones.formaPago === 'FINANCIADO' && (
                  <>
                    <div className="font-bold">FINANCIACION BANCARIA:</div>
                    <div className="font-bold" style={{ background: '#fff599', padding: '0 4px', display: 'inline-block' }}>{p.condiciones.bancoFinanc}</div>
                    <div></div>
                    <div className="font-bold">{p.condiciones.lineaCredito}</div>
                    <div></div>
                    <div className="font-bold">PLAZO {p.condiciones.plazoMeses} MESES</div>
                  </>
                )}
              </div>
              <div className="mt-3 grid grid-cols-[140px_1fr] gap-2">
                <div className="font-bold">FLETE Y FORMULARIOS</div>
                <div>FACTURADOS POR SEPARADO</div>
                <div className="font-bold">PATENTAMIENTO:</div>
                <div className="underline">NO INCLUIDO - A CARGO DEL COMPRADOR</div>
                <div className="font-bold">LUGAR DE ENTREGA:</div>
                <div>{p.condiciones.lugarEntrega}</div>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="mt-8 pt-3 flex justify-between items-center text-xs italic">
            <div>Este formulario no tiene valor fiscal.</div>
            <div>Precio sujeto a cambios sin previo aviso.</div>
            <div>Validez de la oferta por {p.condiciones.validezDias} días</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFORMA MALASPINA — formulario + listado
// Modelo: Carlos Malaspina Tractores SA (Alem 508, Pehuajó)
// ============================================================
function ProformaMalaspina({ modelos, vendedores, proformas, onGuardar, onEliminar, contadores, onVer, configFoton }) {
  // Datos cliente
  const [razonSocial, setRazonSocial] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [email, setEmail] = useState('');
  const [ivaCond, setIvaCond] = useState('RESP. INSCRIPTO');
  const [cuit, setCuit] = useState('');
  const [provincia, setProvincia] = useState('Buenos Aires');
  const [telefono, setTelefono] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [ingBrutos, setIngBrutos] = useState('');

  // Unidad
  const [modeloId, setModeloId] = useState(modelos[0]?.id || '');
  const [versionId, setVersionId] = useState('');
  const modelo = modelos.find(m => m.id === modeloId) || modelos[0];
  const version = modelo?.versiones?.find(v => v.id === versionId) || modelo?.versiones?.[0];

  useEffect(() => {
    if (modelo && !modelo.versiones.find(v => v.id === versionId)) {
      setVersionId(modelo.versiones[0]?.id || '');
    }
  }, [modeloId, modelo, versionId]);

  const [tipoUnidad, setTipoUnidad] = useState('Mediano');
  const [origenUnidad, setOrigenUnidad] = useState('IMPORTADO');

  // Operación
  const [moneda, setMoneda] = useState('USD');
  const [cantidad, setCantidad] = useState('1');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [totalCustom, setTotalCustom] = useState(''); // Override del TOTAL (incluye formularios) - opcional
  const [usarTotalCustom, setUsarTotalCustom] = useState(false);
  const [descuento, setDescuento] = useState('');
  const [iibb, setIibb] = useState('');
  const [ivaPct, setIvaPct] = useState('10.5');

  // Auto-completar precio según moneda
  useEffect(() => {
    if (!version) return;
    if (moneda === 'USD') {
      const precio = version.monedaFinanciada === 'USD' ? version.precioFinanciado : (version.monedaPublica === 'USD' ? version.precioPublico : 0);
      setPrecioUnitario(precio > 0 ? String(precio) : '');
    } else {
      const precio = version.monedaVentaDirecta === 'ARS' ? version.precioVentaDirecta : 0;
      setPrecioUnitario(precio > 0 ? String(precio) : '');
    }
  }, [versionId, moneda, version]);

  // Auto-IVA según modelo
  useEffect(() => {
    if (!modelo) return;
    setIvaPct(String(getIVAPorModelo(modelo)));
  }, [modeloId]);

  // Condiciones de venta
  const [formaPago, setFormaPago] = useState('CONTADO');
  const [bancoFinanc, setBancoFinanc] = useState('');
  const [observacion1, setObservacion1] = useState('NO INCLUYE FLETE NI PATENTAMIENTO (A CARGO DEL COMPRADOR)');
  const [observacion2, setObservacion2] = useState('FACTURACION SUJETO A DISPONIBILIDAD');
  const [validezDias, setValidezDias] = useState('7');

  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id || '');
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Cálculos
  const cantN = parseInt(cantidad) || 0;
  const precioN = parseNum(precioUnitario);
  const totalCustomN = parseNum(totalCustom);
  // Si el vendedor usa "total custom", el TOTAL es ese valor (incluye formularios u otros);
  // si no, el TOTAL es cantidad × precio unitario
  const totalLinea = usarTotalCustom && totalCustomN > 0 ? totalCustomN : cantN * precioN;
  // Diferencia (suele ser "formularios" cuando difiere del precio unitario)
  const formulariosDif = usarTotalCustom && totalCustomN > 0 ? Math.max(0, totalCustomN - (cantN * precioN)) : 0;
  const subtotal = totalLinea;
  const descN = parseNum(descuento);
  const iibbN = parseNum(iibb);
  const baseIva = subtotal - descN;
  const ivaN = baseIva * (parseFloat(ivaPct) / 100);
  // El "Neto a cobrar" en la proforma Malaspina está expresado en $ aunque el resto sea USD
  const neto = baseIva + ivaN + iibbN;

  const formatMoneda = (n) => moneda === 'USD'
    ? `USD ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`
    : formatARS(n);

  const proxNumero = (contadores.proformaMalaspina || 0) + 1;
  const numero = String(proxNumero);

  const guardarProforma = () => {
    if (!razonSocial.trim()) { alert('Cargá la razón social del cliente'); return; }
    if (!modelo || !version) { alert('Elegí modelo y versión'); return; }
    if (precioN === 0 && totalLinea === 0) { alert('Cargá el precio unitario'); return; }
    const vendedor = vendedores.find(v => v.id === vendedorId);
    onGuardar({
      facturador: 'malaspina',
      numero,
      fechaCreacion: new Date().toISOString(),
      cliente: {
        razonSocial: razonSocial.trim(),
        domicilio: domicilio.trim(),
        email: email.trim(),
        ivaCond,
        cuit: cuit.trim(),
        provincia: provincia.trim(),
        telefono: telefono.trim(),
        localidad: localidad.trim(),
        ingBrutos: ingBrutos.trim(),
      },
      unidad: {
        nombre: `${modelo.nombre} ${version.nombre}`,
        modelo: modelo.nombre,
        version: version.nombre,
        marca: 'FOTON',
        tipo: tipoUnidad,
        origen: origenUnidad,
      },
      operacion: {
        moneda,
        cantidad: cantN,
        precioUnitario: precioN,
        totalLinea,
        formulariosDif,
        subtotal,
        descuento: descN,
        iibb: iibbN,
        ivaPct: parseFloat(ivaPct) || 0,
        ivaMonto: ivaN,
        neto,
      },
      condiciones: {
        formaPago,
        bancoFinanc,
        observacion1,
        observacion2,
        validezDias: parseInt(validezDias) || 7,
      },
      vendedor: vendedor ? { id: vendedor.id, nombre: vendedor.nombre } : null,
    });
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 3000);
  };

  const previsualizarProforma = {
    facturador: 'malaspina',
    numero,
    fechaCreacion: new Date().toISOString(),
    cliente: { razonSocial, domicilio, email, ivaCond, cuit, provincia, telefono, localidad, ingBrutos },
    unidad: { nombre: modelo ? `${modelo.nombre} ${version?.nombre || ''}` : '', modelo: modelo?.nombre, version: version?.nombre, marca: 'FOTON', tipo: tipoUnidad, origen: origenUnidad },
    operacion: { moneda, cantidad: cantN, precioUnitario: precioN, totalLinea, formulariosDif, subtotal, descuento: descN, iibb: iibbN, ivaPct: parseFloat(ivaPct) || 0, ivaMonto: ivaN, neto },
    condiciones: { formaPago, bancoFinanc, observacion1, observacion2, validezDias: parseInt(validezDias) || 7 },
  };

  return (
    <div className="space-y-6">
      {/* Encabezado info */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Facturador</div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Carlos Malaspina Tractores SA · CUIT 30-71891875-4</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>N° Proforma</div>
            <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{numero}</div>
          </div>
        </div>
      </div>

      {/* Datos cliente */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Datos del cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Razón Social *"><input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Villanueva Juan Manuel" className="input" /></Campo>
          <Campo label="CUIT"><InputCUIT value={cuit} onChange={setCuit} /></Campo>
          <Campo label="I.V.A.">
            <select value={ivaCond} onChange={e => setIvaCond(e.target.value)} className="input">
              <option value="RESP. INSCRIPTO">Resp. Inscripto</option>
              <option value="MONOTRIBUTO">Monotributo</option>
              <option value="CONSUMIDOR FINAL">Consumidor Final</option>
              <option value="EXENTO">Exento</option>
              <option value="NO RESPONSABLE">No Responsable</option>
            </select>
          </Campo>
          <Campo label="Domicilio"><input type="text" value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="calle 2 de abril s/n" className="input" /></Campo>
          <Campo label="Localidad"><InputLocalidad value={localidad} onChange={setLocalidad} /></Campo>
          <Campo label="Provincia"><input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="input" /></Campo>
          <Campo label="Teléfono"><InputTelefono value={telefono} onChange={setTelefono} /></Campo>
          <Campo label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className="input" /></Campo>
          <Campo label="Ing. Brutos"><input type="text" value={ingBrutos} onChange={e => setIngBrutos(e.target.value)} placeholder="20-XXXXXXXX-X" className="input" /></Campo>
        </div>
      </section>

      {/* Unidad */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Unidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Modelo">
            <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="input">
              {[...new Set(modelos.filter(m => m.visible !== false).map(m => m.linea))].map(linea => (
                <optgroup key={linea} label={linea}>
                  {modelos.filter(m => m.linea === linea && m.visible !== false).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo label="Versión">
            <select value={versionId} onChange={e => setVersionId(e.target.value)} className="input">
              {modelo?.versiones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo"><input type="text" value={tipoUnidad} onChange={e => setTipoUnidad(e.target.value)} placeholder="Mediano" className="input" /></Campo>
          <Campo label="Origen">
            <select value={origenUnidad} onChange={e => setOrigenUnidad(e.target.value)} className="input">
              <option value="NACIONAL">NACIONAL</option>
              <option value="IMPORTADO">IMPORTADO</option>
            </select>
          </Campo>
        </div>
      </section>

      {/* Operación */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Operación</h2>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setMoneda('USD')} className="px-4 py-2 rounded text-sm font-semibold transition"
            style={moneda === 'USD' ? { background: 'var(--accent)', color: 'var(--accent-text)' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            💵 USD (Dólares)
          </button>
          <button onClick={() => setMoneda('ARS')} className="px-4 py-2 rounded text-sm font-semibold transition"
            style={moneda === 'ARS' ? { background: 'var(--accent)', color: 'var(--accent-text)' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            🇦🇷 ARS (Pesos)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Cantidad"><input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} className="input" /></Campo>
          <Campo label={`Precio unitario s/IVA (${moneda})`}><InputDinero value={precioUnitario} onChange={setPrecioUnitario} /></Campo>
          <Campo label="Descuento"><InputDinero value={descuento} onChange={setDescuento} placeholder="0" /></Campo>
          <Campo label="IIBB"><InputDinero value={iibb} onChange={setIibb} placeholder="0" /></Campo>
          <Campo label="IVA %" hint={`${getIVAPorModelo(modelo) === 21 ? '🚙 Pickup/uso particular' : '🚛 Utilitario/camión'} → ${getIVAPorModelo(modelo)}% (editable)`}>
            <div className="flex items-center gap-2">
              <input type="number" step="0.5" value={ivaPct} onChange={e => setIvaPct(e.target.value)} className="input" />
              <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>%</span>
              {parseFloat(ivaPct) !== getIVAPorModelo(modelo) && (
                <button onClick={() => setIvaPct(String(getIVAPorModelo(modelo)))} className="px-2 py-1.5 rounded text-[10px] font-semibold whitespace-nowrap"
                  style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  ↺ Auto
                </button>
              )}
            </div>
          </Campo>
        </div>

        {/* Total custom (Formularios incluidos) */}
        <div className="mt-4 p-3 rounded" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={usarTotalCustom} onChange={e => setUsarTotalCustom(e.target.checked)} className="w-4 h-4 accent-amber-400" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📋 Sumar "Formularios" al TOTAL de la línea</span>
            {usarTotalCustom && formulariosDif > 0 && (
              <span className="ml-auto font-bold text-sm" style={{ color: '#ea580c' }}>+ {formatMoneda(formulariosDif)}</span>
            )}
          </label>
          {usarTotalCustom && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label={`TOTAL de la línea (${moneda})`} hint="El total final que aparece en la tabla (incluyendo formularios)">
                <InputDinero value={totalCustom} onChange={setTotalCustom} placeholder={String(cantN * precioN)} />
              </Campo>
              <div className="flex items-end">
                <div className="rounded p-3 w-full" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Formularios (diferencia)</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatMoneda(formulariosDif)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Totales en vivo */}
        <div className="mt-5 p-4 rounded grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Subtotal</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(subtotal)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>IVA ({ivaPct}%)</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(ivaN)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>IIBB</div>
            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatMoneda(iibbN)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent)' }}>NETO A COBRAR</div>
            <div className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{formatMoneda(neto)}</div>
          </div>
        </div>
      </section>

      {/* Condiciones */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Condiciones de venta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Forma de pago">
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className="input">
              <option value="CONTADO">Contado</option>
              <option value="FINANCIADO">Financiado</option>
              <option value="LEASING">Leasing</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </Campo>
          {formaPago === 'FINANCIADO' && (
            <Campo label="Financiación bancaria">
              <select value={bancoFinanc} onChange={e => setBancoFinanc(e.target.value)} className="input">
                <option value="">— Sin banco —</option>
                <option value="BANCO CREDICOOP">Banco Credicoop</option>
                <option value="BANCO SANTANDER">Banco Santander</option>
                <option value="BANCO GALICIA">Banco Galicia</option>
                <option value="BANCO ICBC">Banco ICBC</option>
                <option value="BANCO COMAFI">Banco Comafi</option>
                <option value="BANCO NACIÓN">Banco Nación</option>
                <option value="BANCO BICE">Banco BICE</option>
                <option value="OTRO">Otro</option>
              </select>
            </Campo>
          )}
          <Campo label="Validez de la oferta (días)"><input type="number" value={validezDias} onChange={e => setValidezDias(e.target.value)} className="input" /></Campo>
          <Campo label="Vendedor">
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <Campo label="Observación 1" hint="Texto que aparece subrayado en la proforma">
            <input type="text" value={observacion1} onChange={e => setObservacion1(e.target.value)} className="input" />
          </Campo>
          <Campo label="Observación 2">
            <input type="text" value={observacion2} onChange={e => setObservacion2(e.target.value)} className="input" />
          </Campo>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <button onClick={guardarProforma}
          className="px-4 py-2.5 rounded text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
          💾 Guardar proforma
        </button>
        <button onClick={() => onVer(previsualizarProforma)}
          className="px-4 py-2.5 rounded text-sm font-semibold"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          🖨️ Vista previa / Imprimir
        </button>
        {guardadoOk && (
          <div className="px-4 py-2.5 rounded text-sm font-semibold" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            ✓ Guardado
          </div>
        )}
      </div>

      {/* Historial */}
      {proformas.length > 0 && (
        <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Proformas guardadas ({proformas.length})</h2>
          <div className="space-y-2">
            {[...proformas].reverse().map(p => (
              <div key={p.numero} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>N° {p.numero} · {p.cliente.razonSocial}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {p.unidad.nombre} · {p.operacion.moneda} {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(p.operacion.neto)} · {formatFecha(p.fechaCreacion)}
                  </div>
                </div>
                <button onClick={() => onVer(p)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-primary)' }}>Ver</button>
                <button onClick={() => { if (confirm(`¿Eliminar proforma N° ${p.numero}?`)) onEliminar(p.numero); }} className="px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-surface-3)', color: '#dc2626' }}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Modal de impresión de Proforma Malaspina
// Diseño IDÉNTICO al PDF de Malaspina
// ============================================================
function ModalProformaMalaspina({ proforma: p, onClose }) {
  const fact = PROFORMA_FACTURADORES.malaspina;
  const fechaTxt = new Date(p.fechaCreacion).toLocaleDateString('es-AR');
  const fmt = (n) => {
    if (!n && n !== 0) return '-';
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  // Mensaje resumido para WhatsApp / Email
  const generarMensaje = () => {
    let m = `📄 *Proforma Malaspina N° ${p.numero}*\n`;
    m += `Carlos Malaspina Tractores SA · Pehuajó\n`;
    m += `Fecha: ${fechaTxt}\n\n`;
    m += `👤 *Cliente:* ${p.cliente.razonSocial}\n`;
    if (p.cliente.cuit) m += `CUIT: ${p.cliente.cuit}\n`;
    if (p.cliente.localidad) m += `${p.cliente.localidad}${p.cliente.provincia ? ', ' + p.cliente.provincia : ''}\n`;
    m += `\n🚛 *Unidad:* ${p.unidad.nombre}\n`;
    m += `Marca: ${p.unidad.marca} · Tipo: ${p.unidad.tipo} · Origen: ${p.unidad.origen}\n`;
    m += `\n💰 *Detalle:*\n`;
    m += `Precio unitario: ${p.operacion.moneda} ${fmt(p.operacion.precioUnitario)}\n`;
    if (p.operacion.formulariosDif > 0) m += `Formularios: ${p.operacion.moneda} ${fmt(p.operacion.formulariosDif)}\n`;
    m += `Subtotal: ${p.operacion.moneda} ${fmt(p.operacion.subtotal)}\n`;
    if (p.operacion.descuento > 0) m += `Descuento: ${p.operacion.moneda} ${fmt(p.operacion.descuento)}\n`;
    m += `IVA (${p.operacion.ivaPct}%): ${p.operacion.moneda} ${fmt(p.operacion.ivaMonto)}\n`;
    if (p.operacion.iibb > 0) m += `IIBB: ${fmt(p.operacion.iibb)}\n`;
    m += `*NETO A COBRAR: $ ${fmt(p.operacion.neto)}*\n`;
    m += `\n🏦 *Condiciones:*\n`;
    m += `Forma de pago: ${p.condiciones.formaPago}\n`;
    if (p.condiciones.formaPago === 'FINANCIADO' && p.condiciones.bancoFinanc) {
      m += `Financiación: ${p.condiciones.bancoFinanc}\n`;
    }
    if (p.condiciones.observacion1) m += `\n⚠️ ${p.condiciones.observacion1}\n`;
    if (p.condiciones.observacion2) m += `${p.condiciones.observacion2}\n`;
    m += `\n_Validez de la oferta: ${p.condiciones.validezDias} días._\n`;
    m += `_Este formulario no tiene valor fiscal._`;
    return m;
  };

  const asuntoEmail = `Proforma Malaspina N° ${p.numero}${p.cliente.razonSocial ? ' · ' + p.cliente.razonSocial : ''}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-h-[95vh] overflow-y-auto print:max-h-full print:rounded-none print:max-w-full" style={{ maxWidth: "820px" }} onClick={e => e.stopPropagation()}>
        {/* Acciones — no se imprime */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex justify-between items-center print:hidden">
          <div className="text-sm font-bold text-stone-900">PROFORMA MALASPINA N° {p.numero}</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs font-semibold bg-stone-200 text-stone-700">Cerrar</button>
        </div>

        {/* Botones de envío */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 print:hidden">
          <BotonesEnviar
            mensaje={generarMensaje()}
            whatsappCliente={p.cliente.telefono}
            emailCliente={p.cliente.email}
            asuntoEmail={asuntoEmail}
            onImprimir={() => window.print()}
          />
          {!p.cliente.telefono && (
            <p className="text-xs mt-2" style={{ color: '#92400e' }}>💡 Cargá el teléfono del cliente en la proforma para enviarlo directo por WhatsApp.</p>
          )}
        </div>

        {/* DOCUMENTO IMPRIMIBLE — IDÉNTICO al PDF de Malaspina */}
        <div className="p-10 print:p-0 print-document text-stone-900">
          {/* Encabezado: X centrado y PRO-FORMA a la derecha */}
          <div className="grid grid-cols-3 gap-4 mb-4 items-start">
            <div></div>
            <div className="text-center">
              <div className="inline-block border border-stone-900 px-3 py-0.5 text-xs">X</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl tracking-wide">PRO-FORMA</div>
            </div>
          </div>

          {/* Logo + razón social a la izq · datos N°/Fecha/CUIT a la der */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex items-start gap-3">
              <div>
                <div className="font-black text-lg" style={{ fontFamily: 'system-ui' }}>{fact.nombre}</div>
              </div>
              <LogoFoton size="md" color="negro" />
            </div>
            <div className="text-xs">
              <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-0.5">
                <div className="font-bold">N.°</div>             <div>{p.numero}</div>
                <div className="font-bold">FECHA</div>           <div>{fechaTxt}</div>
                <div className="font-bold">CUIT</div>            <div>{fact.cuit}</div>
                <div className="font-bold">ING. BRUTOS</div>     <div>{fact.ingBrutos}</div>
              </div>
            </div>
          </div>

          {/* Domicilio facturador */}
          <div className="text-xs mb-4 leading-relaxed">
            <div>{fact.domicilio}</div>
            <div>{fact.cpLocalidad}</div>
            <div>Teléfono: {fact.telefono}</div>
            <div>{fact.iva}</div>
          </div>

          <hr className="border-stone-400 mb-4" />

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 pb-3 border-b border-stone-300 text-xs">
            <div className="grid grid-cols-[100px_1fr] gap-x-2">
              <div className="font-semibold">RAZÓN SOCIAL:</div>   <div>{p.cliente.razonSocial}</div>
              <div className="font-semibold">DOMICILIO:</div>      <div>{p.cliente.domicilio}</div>
              <div className="font-semibold">EMAIL:</div>          <div>{p.cliente.email}</div>
              <div className="font-semibold">I.V.A.</div>          <div>{p.cliente.ivaCond}</div>
              <div className="font-semibold">CUIT:</div>           <div>{p.cliente.cuit}</div>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-x-2">
              <div className="font-semibold">PROVINCIA:</div>      <div>{p.cliente.provincia}</div>
              <div className="font-semibold">TELEFONO:</div>       <div>{p.cliente.telefono}</div>
              <div className="font-semibold">LOCALIDAD:</div>      <div>{p.cliente.localidad}</div>
              <div className="font-semibold">ING. BRUTOS:</div>    <div>{p.cliente.ingBrutos}</div>
            </div>
          </div>

          {/* Tabla de detalle */}
          <table className="w-full border-collapse text-xs mb-3" style={{ border: '1px solid #1c1917' }}>
            <thead>
              <tr style={{ background: '#e6f0f7' }}>
                <th className="border border-stone-900 p-1.5 text-center font-bold">CÓDIGO</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">DESCRIPCIÓN</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold">CANTIDAD</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold" colSpan={2}>PRECIO UNITARIO S/IVA</th>
                <th className="border border-stone-900 p-1.5 text-center font-bold" colSpan={2}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-center font-bold">{p.unidad.nombre}</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.cantidad}</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.moneda}</td>
                <td className="border border-stone-900 p-1.5 text-right">{fmt(p.operacion.precioUnitario)}</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.moneda}</td>
                <td className="border border-stone-900 p-1.5 text-right font-bold">{fmt(p.operacion.totalLinea)}</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5 text-center">{p.operacion.formulariosDif > 0 ? 'Formularios' : ''}</td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5"><strong className="underline">Detalles de la unidad</strong></td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5">Marca: {p.unidad.marca}&nbsp; -</td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5">Modelo : {p.unidad.modelo}</td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5">Tipo : {p.unidad.tipo}</td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5">Origen: {p.unidad.origen}</td>
                <td className="border border-stone-900 p-1.5">&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
              <tr>
                <td className="border border-stone-900 p-1.5" colSpan={3}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
                <td className="border border-stone-900 p-1.5" colSpan={2}>&nbsp;</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="p-1.5"></td>
                <td className="p-1.5 text-right font-bold">SUB TOTAL</td>
                <td className="p-1.5 text-center border-t border-stone-900">{p.operacion.moneda}</td>
                <td className="p-1.5 text-right border-t border-stone-900 font-bold">{fmt(p.operacion.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-1.5"></td>
                <td className="p-1.5 text-right font-bold">DESCUENTO</td>
                <td className="p-1.5 text-center">{p.operacion.moneda}</td>
                <td className="p-1.5 text-right">{p.operacion.descuento > 0 ? fmt(p.operacion.descuento) : '-'}</td>
              </tr>
              <tr>
                <td colSpan={5} className="p-1.5 text-right font-bold">IIBB</td>
                <td className="p-1.5"></td>
                <td className="p-1.5 text-right">{p.operacion.iibb > 0 ? fmt(p.operacion.iibb) : '-'}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-1.5"></td>
                <td className="p-1.5 text-right font-bold border-t border-stone-900">I.V.A. ({p.operacion.ivaPct}%)</td>
                <td className="p-1.5 text-center border-t border-stone-900">{p.operacion.moneda}</td>
                <td className="p-1.5 text-right border-t border-stone-900 font-bold">{fmt(p.operacion.ivaMonto)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-1.5"></td>
                <td className="p-1.5 text-right font-bold border-t border-stone-900">NETO A COBRAR</td>
                <td className="p-1.5 text-center border-t border-stone-900 font-bold">$</td>
                <td className="p-1.5 text-right border-t border-stone-900 font-black text-sm">{fmt(p.operacion.neto)}</td>
              </tr>
            </tfoot>
          </table>

          {/* CONDICIONES DE VENTA */}
          <div className="mb-3 mt-4">
            <div className="font-bold text-xs mb-1.5">CONDICIONES DE VENTA</div>
            <div className="text-xs space-y-0.5 ml-32">
              <div>
                <span>VALORES EXPRESADOS EN {p.operacion.moneda === 'USD' ? 'DOLARES' : 'PESOS ARGENTINOS'}</span>
              </div>
              <div>
                <span>FORMA DE PAGO: </span><strong>{p.condiciones.formaPago}</strong>
                {p.condiciones.formaPago === 'FINANCIADO' && p.condiciones.bancoFinanc && (
                  <span> · <strong style={{ background: '#fff599', padding: '0 4px' }}>{p.condiciones.bancoFinanc}</strong></span>
                )}
              </div>
              {p.condiciones.observacion1 && (
                <div className="mt-2"><span className="underline">{p.condiciones.observacion1}</span></div>
              )}
              {p.condiciones.observacion2 && (
                <div>{p.condiciones.observacion2}</div>
              )}
            </div>
          </div>

          {/* Pie */}
          <div className="mt-8 pt-3 flex justify-between items-center text-xs italic">
            <div>Este formulario no tiene valor fiscal.</div>
            <div>Precio sujeto a cambios sin previo aviso.</div>
            <div>Validez de la oferta por {p.condiciones.validezDias} días.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Checklist editable con totales en vivo, impresión, WhatsApp y guardado
// ============================================================
function ModuloDocumentacion({ docItems, setDocItems, docPresupuestos, onGuardar, onEliminar, vendedores, contadores }) {
  const [seleccionados, setSeleccionados] = useState(new Set()); // ids tildados
  const [cliente, setCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [patente, setPatente] = useState('');
  const [vendedorId, setVendedorId] = useState(vendedores[0]?.id || '');
  const [verPresupuesto, setVerPresupuesto] = useState(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editValor, setEditValor] = useState('');

  const toggle = (id) => {
    const ns = new Set(seleccionados);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setSeleccionados(ns);
  };

  const total = docItems.reduce((s, it) => seleccionados.has(it.id) ? s + it.monto : s, 0);

  const editarMonto = (id) => {
    const it = docItems.find(x => x.id === id);
    setEditandoId(id);
    setEditValor(String(it.monto));
  };
  const guardarEdicion = () => {
    const nuevoMonto = parseNum(editValor);
    setDocItems(docItems.map(it => it.id === editandoId ? { ...it, monto: nuevoMonto } : it));
    setEditandoId(null);
    setEditValor('');
  };

  const proxNumero = (contadores.documentacion || 0) + 1;
  const numero = `DOC-${new Date().getFullYear()}-${String(proxNumero).padStart(4, '0')}`;

  const guardarPresupuesto = () => {
    if (!cliente.trim()) { alert('Cargá el nombre del cliente'); return; }
    if (seleccionados.size === 0) { alert('Tildá al menos un ítem'); return; }
    const vendedor = vendedores.find(v => v.id === vendedorId);
    const items = docItems.filter(it => seleccionados.has(it.id)).map(it => ({ ...it }));
    onGuardar({
      numero,
      fechaCreacion: new Date().toISOString(),
      cliente: cliente.trim(),
      whatsappCliente: whatsappCliente.trim(),
      vehiculo: vehiculo.trim(),
      patente: patente.trim().toUpperCase(),
      vendedor: vendedor ? { id: vendedor.id, nombre: vendedor.nombre, whatsapp: vendedor.whatsapp } : null,
      items,
      total,
    });
    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 3000);
  };

  const generarMensaje = () => {
    let m = `📑 *Foton Malaspina*\n*Documentación a entregar / Costos de transferencia*\n\n`;
    if (cliente) m += `👤 Cliente: ${cliente}\n`;
    if (vehiculo) m += `🚗 Vehículo: ${vehiculo}\n`;
    if (patente) m += `🔢 Patente: ${patente}\n`;
    m += `\n*Detalle de gastos:*\n`;
    docItems.filter(it => seleccionados.has(it.id)).forEach(it => {
      m += `• ${it.nombre}: ${formatARS(it.monto)}\n`;
    });
    m += `\n💰 *TOTAL: ${formatARS(total)}*\n`;
    m += `\n_Los valores pueden variar según jurisdicción, aranceles o escribanía._\n`;
    m += `\nAtte. ${vendedores.find(v => v.id === vendedorId)?.nombre || ''}\nFoton Malaspina · Pehuajó`;
    return m;
  };

  const copiarWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(generarMensaje());
      alert('✓ Mensaje copiado al portapapeles');
    } catch {
      alert('No se pudo copiar. Probá imprimir.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>Documentación</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Detalle de gastos necesarios para la transferencia del vehículo. Tildá los ítems que correspondan y se suman al total automáticamente.</p>
      </div>

      {/* Datos del cliente */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Datos del cliente y vehículo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Campo label="Cliente *">
            <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre y apellido" className="input" />
          </Campo>
          <Campo label="WhatsApp">
            <InputTelefono value={whatsappCliente} onChange={setWhatsappCliente} />
          </Campo>
          <Campo label="Vehículo">
            <input type="text" value={vehiculo} onChange={e => setVehiculo(e.target.value)} placeholder="Foton TM1 Cab Simple" className="input" />
          </Campo>
          <Campo label="Patente / Dominio">
            <input type="text" value={patente} onChange={e => setPatente(e.target.value.toUpperCase())} placeholder="AB 123 CD" className="input" />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label="Vendedor">
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
        </div>
      </section>

      {/* Lista de items */}
      <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Costos a incluir</h2>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{seleccionados.size} de {docItems.length} ítems</div>
        </div>

        <div className="space-y-2">
          {docItems.map(it => {
            const tildado = seleccionados.has(it.id);
            const editando = editandoId === it.id;
            return (
              <div
                key={it.id}
                className="flex items-center gap-3 p-3 rounded transition cursor-pointer"
                style={{
                  background: tildado ? 'var(--accent-soft)' : 'var(--bg-surface-2)',
                  border: `1px solid ${tildado ? 'var(--accent-soft-border)' : 'var(--border)'}`,
                }}
                onClick={() => !editando && toggle(it.id)}
              >
                <input
                  type="checkbox"
                  checked={tildado}
                  onChange={() => toggle(it.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-5 h-5 accent-amber-400 flex-shrink-0"
                />
                <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{it.nombre}</span>
                {editando ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <InputDinero value={editValor} onChange={setEditValor} />
                    <button onClick={guardarEdicion} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>OK</button>
                    <button onClick={() => setEditandoId(null)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatARS(it.monto)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); editarMonto(it.id); }}
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}
                      title="Editar monto"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-5 pt-4" style={{ borderTop: '2px solid var(--border)' }}>
          <div className="flex justify-between items-center p-4 rounded" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-border)' }}>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>Total seleccionado</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{seleccionados.size > 0 ? `${seleccionados.size} ítems incluidos` : 'Sin ítems tildados'}</div>
            </div>
            <div className="font-black text-2xl sm:text-3xl tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatARS(total)}</div>
          </div>
          <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>* Los valores pueden variar según jurisdicción, aranceles o escribanía. Los montos editados se guardan automáticamente para próximas operaciones.</p>
        </div>

        {/* Acciones */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={guardarPresupuesto}
            disabled={!cliente.trim() || seleccionados.size === 0}
            className="px-4 py-2.5 rounded text-sm font-semibold transition"
            style={{
              background: (!cliente.trim() || seleccionados.size === 0) ? 'var(--bg-surface-3)' : 'var(--accent)',
              color: (!cliente.trim() || seleccionados.size === 0) ? 'var(--text-muted)' : 'var(--accent-text)',
              cursor: (!cliente.trim() || seleccionados.size === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            💾 Guardar presupuesto
          </button>
          <button
            onClick={copiarWhatsApp}
            disabled={seleccionados.size === 0}
            className="px-4 py-2.5 rounded text-sm font-semibold"
            style={{
              background: seleccionados.size === 0 ? 'var(--bg-surface-3)' : '#16a34a',
              color: seleccionados.size === 0 ? 'var(--text-muted)' : 'white',
              cursor: seleccionados.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            📱 Copiar WhatsApp
          </button>
          <button
            onClick={() => setVerPresupuesto({ numero, cliente, whatsappCliente, vehiculo, patente, items: docItems.filter(it => seleccionados.has(it.id)), total, vendedor: vendedores.find(v => v.id === vendedorId), fechaCreacion: new Date().toISOString() })}
            disabled={seleccionados.size === 0 || !cliente.trim()}
            className="px-4 py-2.5 rounded text-sm font-semibold"
            style={{
              background: (!cliente.trim() || seleccionados.size === 0) ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
              color: (!cliente.trim() || seleccionados.size === 0) ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              cursor: (!cliente.trim() || seleccionados.size === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            🖨️ Imprimir / PDF
          </button>
          {guardadoOk && (
            <div className="px-4 py-2.5 rounded text-sm font-semibold" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              ✓ Guardado
            </div>
          )}
        </div>
      </section>

      {/* Historial de presupuestos */}
      {docPresupuestos.length > 0 && (
        <section className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--text-muted)' }}>Presupuestos guardados ({docPresupuestos.length})</h2>
          <div className="space-y-2">
            {[...docPresupuestos].reverse().map(p => (
              <div key={p.numero} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.numero} · {p.cliente}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {p.vehiculo || '—'}{p.patente ? ` · ${p.patente}` : ''} · {p.items.length} ítems · {formatFecha(p.fechaCreacion)}
                  </div>
                </div>
                <div className="font-black text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatARS(p.total)}</div>
                <button onClick={() => setVerPresupuesto(p)} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-primary)' }}>Ver</button>
                <button onClick={() => { if (confirm(`¿Eliminar ${p.numero}?`)) onEliminar(p.numero); }} className="px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-surface-3)', color: '#dc2626' }}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {verPresupuesto && <ModalDocPresupuesto presupuesto={verPresupuesto} onClose={() => setVerPresupuesto(null)} />}
    </div>
  );
}

// Modal de impresión / vista del presupuesto de documentación
function ModalDocPresupuesto({ presupuesto: p, onClose }) {
  const generarMensaje = () => {
    let m = `📑 *Foton Malaspina*\n*Documentación a entregar / Costos de transferencia*\n\n`;
    m += `Presupuesto: ${p.numero}\n`;
    m += `Fecha: ${formatFecha(p.fechaCreacion)}\n\n`;
    if (p.cliente) m += `👤 Cliente: ${p.cliente}\n`;
    if (p.vehiculo) m += `🚗 Vehículo: ${p.vehiculo}\n`;
    if (p.patente) m += `🔢 Patente: ${p.patente}\n`;
    m += `\n*Detalle de gastos:*\n`;
    p.items.forEach(it => { m += `• ${it.nombre}: ${formatARS(it.monto)}\n`; });
    m += `\n💰 *TOTAL: ${formatARS(p.total)}*\n`;
    m += `\n_Los valores pueden variar según jurisdicción, aranceles o escribanía._\n`;
    m += `\nAtte. ${p.vendedor?.nombre || ''}\nFoton Malaspina · Pehuajó`;
    return m;
  };

  const asuntoEmail = `Documentación a entregar ${p.numero}${p.cliente ? ' · ' + p.cliente : ''}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-h-[90vh] overflow-y-auto print:max-h-full print:rounded-none print:max-w-full" style={{ maxWidth: "820px" }} onClick={e => e.stopPropagation()}>
        {/* Header acciones (no se imprime) */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-3 flex justify-between items-center print:hidden">
          <div className="text-sm font-bold text-stone-900">{p.numero}</div>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs font-semibold bg-stone-200 text-stone-700">Cerrar</button>
        </div>

        {/* Botones de envío */}
        <div className="px-5 py-3 bg-white border-b border-stone-200 print:hidden">
          <BotonesEnviar
            mensaje={generarMensaje()}
            whatsappCliente={p.whatsappCliente}
            emailCliente={''}
            asuntoEmail={asuntoEmail}
            onImprimir={() => window.print()}
          />
          {!p.whatsappCliente && (
            <p className="text-xs mt-2" style={{ color: '#92400e' }}>💡 Cargá el WhatsApp del cliente en el presupuesto para mandarlo directo.</p>
          )}
        </div>

        {/* Documento imprimible */}
        <div className="p-10 print:p-0 print-document text-stone-900">
          {/* Encabezado */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-stone-900">
            <div>
              <LogoFoton size="lg" color="negro" />
              <div className="mt-2 text-xs text-stone-600">
                <div>Ruta Nacional 5, km 371.5, Pehuajó</div>
                <div>www.fotonmalaspina.com · WhatsApp: 2396-549920</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500 uppercase tracking-wider font-bold">Presupuesto</div>
              <div className="font-black text-xl text-stone-900">{p.numero}</div>
              <div className="text-xs text-stone-600 mt-1">Fecha: {formatFecha(p.fechaCreacion)}</div>
            </div>
          </div>

          {/* Título */}
          <div className="mb-6">
            <h1 className="font-black text-2xl text-stone-900">Documentación a entregar</h1>
            <p className="text-sm text-stone-600 uppercase tracking-wider mt-1">Detalle de gastos necesarios para la transferencia del vehículo</p>
          </div>

          {/* Datos cliente */}
          {(p.cliente || p.vehiculo || p.patente) && (
            <div className="bg-stone-50 border border-stone-200 rounded p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {p.cliente && <div><div className="text-xs text-stone-500 uppercase">Cliente</div><div className="font-bold text-stone-900">{p.cliente}</div></div>}
                {p.whatsappCliente && <div><div className="text-xs text-stone-500 uppercase">WhatsApp</div><div className="font-bold text-stone-900">{p.whatsappCliente}</div></div>}
                {p.vehiculo && <div><div className="text-xs text-stone-500 uppercase">Vehículo</div><div className="font-bold text-stone-900">{p.vehiculo}</div></div>}
                {p.patente && <div><div className="text-xs text-stone-500 uppercase">Patente</div><div className="font-bold text-stone-900">{p.patente}</div></div>}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-3">Detalle de gastos</div>
            <div className="space-y-1.5">
              {p.items.map(it => (
                <div key={it.id} className="flex justify-between items-center p-2.5 bg-stone-50 rounded border border-stone-200">
                  <span className="text-sm text-stone-800">• {it.nombre}</span>
                  <span className="font-bold text-stone-900 tabular-nums">{formatARS(it.monto)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-4 rounded border-2 border-stone-900 bg-stone-50 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-stone-600">Total</div>
              <div className="text-xs text-stone-500">{p.items.length} ítem{p.items.length !== 1 ? 's' : ''} seleccionado{p.items.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="font-black text-3xl text-stone-900 tabular-nums">{formatARS(p.total)}</div>
          </div>

          {/* Notas */}
          <div className="text-xs text-stone-500 border-t border-stone-200 pt-4">
            <div className="italic">* Los valores pueden variar según jurisdicción, aranceles o escribanía.</div>
            {p.vendedor?.nombre && <div className="mt-3 font-semibold text-stone-700">Atte. {p.vendedor.nombre}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelMensual({ modelosFoton, setModelosFoton, tasasFoton, setTasasFoton, configFoton, setConfigFoton, snapshots, snapshotsAnuales = [], onCrearSnapshot, onRestaurarSnapshot, onEliminarSnapshot, onEliminarSnapshotAnual, onExportarSnapshot }) {
  const [seccion, setSeccion] = useState('inicio');

  // Última actualización (basada en el snapshot más reciente)
  const ultimaAct = snapshots.length > 0 ? snapshots[0].fecha : null;

  const handleCrearSnapshot = async () => {
    const etiqueta = prompt('Etiqueta para este snapshot (ej: "Mayo 2026"). Dejá vacío para usar el mes actual:');
    if (etiqueta === null) return;
    const snap = await onCrearSnapshot(etiqueta || null);
    alert(`Snapshot creado: ${snap.etiqueta}`);
  };

  const secciones = [
    { id: 'precios', titulo: 'Precios Foton', desc: 'Lista pública y financiada 9% por versión', icon: <DollarSign size={18} />, color: '#16a34a' },
    { id: 'tasas-foton', titulo: 'Tasas Convenios Corven', desc: 'Pesos / UVA / Dólares / Leasing por grupo y banco', icon: <Percent size={18} />, color: '#a855f7' },
    { id: 'config', titulo: 'Configuración Foton', desc: 'Cotización dólar, quebrantos, modo de tasa', icon: <Settings size={18} />, color: '#f59e0b' },
  ];

  if (seccion === 'precios') return <SeccionPrecios modelos={modelosFoton} setModelos={setModelosFoton} onVolver={() => setSeccion('inicio')} />;
  if (seccion === 'tasas-foton') return <ConfigTasasFotonWrap tasas={tasasFoton} setTasas={setTasasFoton} onVolver={() => setSeccion('inicio')} />;
  if (seccion === 'config') return <ConfigGeneralFotonWrap config={configFoton} setConfig={setConfigFoton} onVolver={() => setSeccion('inicio')} />;

  return (
    <div className="space-y-6">
      {/* Banner superior */}
      <div className="bg-gradient-to-br from-amber-400/10 to-stone-900 border border-amber-400/30 rounded-lg p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-bold mb-1"><Download size={14} /> Actualización mensual</div>
            <h2 className="text-xl font-black text-stone-100">Centro de actualización</h2>
            <p className="text-sm text-stone-400 mt-1">Cargá acá lo que cambia cada mes: precios, tasas y configuración.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 uppercase tracking-wider">Última actualización</div>
            <div className="text-stone-200 font-bold">{ultimaAct ? formatFecha(ultimaAct) : 'Sin snapshots aún'}</div>
            {snapshots.length > 0 && <div className="text-xs text-amber-400 mt-0.5">{snapshots[0].etiqueta}</div>}
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {secciones.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)} className="bg-stone-900 border border-stone-800 hover:border-amber-400/40 rounded-lg p-5 text-left transition group">
            <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}<span className="text-xs uppercase tracking-wider font-bold">Editar</span></div>
            <div className="text-stone-100 font-bold text-base">{s.titulo}</div>
            <div className="text-xs text-stone-500 mt-2">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Snapshots */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">Historial de versiones</h3>
            <p className="text-xs text-stone-500 mt-1">Snapshot completo de precios y tasas. Se guardan máximo los últimos 3 meses.</p>
          </div>
          <button onClick={handleCrearSnapshot} className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded text-sm font-bold flex items-center gap-2 transition">
            <Save size={14} /> Crear snapshot ahora
          </button>
        </div>

        {snapshots.length === 0 ? (
          <div className="text-center text-stone-500 text-sm py-6 border-t border-stone-800">
            No hay snapshots guardados. Creá uno cuando termines de cargar los cambios del mes.
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {snapshots.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between flex-wrap gap-2 bg-stone-950 border border-stone-800 rounded p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-stone-600'}`}></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-stone-100">{s.etiqueta} {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-amber-400/20 text-amber-400 rounded ml-1">ACTUAL</span>}</div>
                    <div className="text-xs text-stone-500">{formatFecha(s.fecha)} · {new Date(s.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onExportarSnapshot && onExportarSnapshot(s)} className="px-3 py-1.5 bg-stone-800 hover:bg-emerald-700 text-stone-200 hover:text-white rounded text-xs font-semibold transition" title="Exportar a JSON"><Download size={12} className="inline mr-1" />JSON</button>
                  <button onClick={() => onRestaurarSnapshot(s)} className="px-3 py-1.5 bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-stone-200 rounded text-xs font-semibold transition">Restaurar</button>
                  <button onClick={() => { if (confirm(`¿Eliminar snapshot "${s.etiqueta}"?`)) onEliminarSnapshot(s.id); }} className="px-2 py-1.5 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshots anuales (registro histórico) */}
      {snapshotsAnuales.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">📅 Registro anual</h3>
              <p className="text-xs text-stone-500 mt-1">Snapshots automáticos por mes (últimos 12). Para guardar tu historial.</p>
            </div>
            <span className="text-xs text-stone-400">{snapshotsAnuales.length} guardados</span>
          </div>
          <div className="space-y-2">
            {snapshotsAnuales.map(s => (
              <div key={s.id} className="flex items-center justify-between flex-wrap gap-2 bg-stone-950 border border-stone-800 rounded p-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-stone-100">{s.etiqueta}</div>
                    <div className="text-xs text-stone-500">{formatFecha(s.fecha)} · {s.claveMesAnio}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onExportarSnapshot && onExportarSnapshot(s)} className="px-3 py-1.5 bg-stone-800 hover:bg-emerald-700 text-stone-200 hover:text-white rounded text-xs font-semibold transition"><Download size={12} className="inline mr-1" />JSON</button>
                  <button onClick={() => { if (confirm(`¿Eliminar snapshot anual "${s.etiqueta}"?`)) onEliminarSnapshotAnual && onEliminarSnapshotAnual(s.id); }} className="px-2 py-1.5 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="bg-stone-900/50 border border-stone-800 rounded-lg p-4 text-xs text-stone-400">
        💡 <span className="text-stone-300 font-semibold">Flujo recomendado:</span> cargá los cambios de cada sección, después tocá "Crear snapshot ahora" y ponele "Junio 2026" (o el mes que sea). Si te equivocás, podés restaurar el snapshot del mes anterior.
      </div>
    </div>
  );
}

// =========== Sección: Precios Foton ===========
function SeccionPrecios({ modelos, setModelos, onVolver }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PRECIOS FOTON</h1>
        <button onClick={onVolver} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>
      <div className="bg-stone-900/50 border border-stone-800 rounded p-3 text-xs text-stone-400">
        💡 Cargá precios por versión. <span className="text-amber-400 font-semibold">Lista Pública</span> = Foton Malaspina. <span className="text-amber-400 font-semibold">Lista Financiada 9%</span> = Foton Argentina (usado para el cálculo según circular Corven).
      </div>
      <ConfigModelosFoton modelos={modelos} setModelos={setModelos} />
    </div>
  );
}


// =========== Wrappers con botón Volver ===========
function ConfigTasasFotonWrap({ tasas, setTasas, onVolver }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>TASAS CONVENIOS CORVEN</h1>
        <button onClick={onVolver} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>
      <ConfigTasasFoton tasas={tasas} setTasas={setTasas} />
    </div>
  );
}

function ConfigGeneralFotonWrap({ config, setConfig, onVolver }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>CONFIGURACIÓN FOTON</h1>
        <button onClick={onVolver} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>
      <ConfigGeneralFoton config={config} setConfig={setConfig} />
    </div>
  );
}
