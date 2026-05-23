import React, { useState, useEffect, useRef } from 'react';
import { Car, Truck, Settings, Calculator, MessageCircle, Plus, Trash2, Save, TrendingDown, Award, Copy, Check, Package, Percent, DollarSign, Coins, FileText, Users, FolderOpen, Search, Download, Eye, Printer, Calendar, Hash, ClipboardList, User, Building2, FileSignature, Sun, Moon } from 'lucide-react';

// ============================================================
// STORAGE LOCAL (usa localStorage del navegador)
// ============================================================
const storageGet = async (key) => {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  } catch { return null; }
};
const storageSet = async (key, value) => {
  try { localStorage.setItem(key, value); return { value }; } catch { return null; }
};

// ============================================================
// PRESUPUESTADOR — Laviana
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
      { id: 'ztruck-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 24910500, monedaFinanciada: 'USD', precioFinanciado: 18400 },
      { id: 'ztruck-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 32610000, monedaFinanciada: 'USD', precioFinanciado: 21100 },
    ]},
  // ============ TM ============
  { id: 'tm1', linea: 'TM', nombre: 'TM1', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'tm1-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 32320000, monedaFinanciada: 'USD', precioFinanciado: 23600 },
      { id: 'tm1-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 37250000, monedaFinanciada: 'USD', precioFinanciado: 24500 },
      { id: 'tm1-box', nombre: 'Box Cargo', monedaPublica: 'ARS', precioPublico: 43195000, monedaFinanciada: 'USD', precioFinanciado: 28100 },
      { id: 'tm1-boxr', nombre: 'Box Cargo Refrigerado', monedaPublica: 'ARS', precioPublico: 51895000, monedaFinanciada: 'USD', precioFinanciado: 35500 },
    ]},
  { id: 'tm2', linea: 'TM', nombre: 'TM2', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'tm2-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 39062500, monedaFinanciada: 'USD', precioFinanciado: 26100 },
      { id: 'tm2-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 41455000, monedaFinanciada: 'USD', precioFinanciado: 27400 },
    ]},
  // ============ WONDER ============
  { id: 'wonder', linea: 'WONDER', nombre: 'Wonder', grupoTasa: 'minitrucks',
    versiones: [
      { id: 'wonder-cs', nombre: 'Cab Simple', monedaPublica: 'ARS', precioPublico: 37830000, monedaFinanciada: 'USD', precioFinanciado: 24500 },
      { id: 'wonder-cd', nombre: 'Cab Doble', monedaPublica: 'ARS', precioPublico: 39715000, monedaFinanciada: 'USD', precioFinanciado: 25800 },
      { id: 'wonder-csbox', nombre: 'CS Box', monedaPublica: 'ARS', precioPublico: 45080000, monedaFinanciada: 'USD', precioFinanciado: 29400 },
    ]},
  // ============ TUNLAND G7 / V9 / V7 ============
  { id: 'tunland-g7', linea: 'TUNLAND', nombre: 'G7', grupoTasa: 'pickups',
    versiones: [
      { id: 'g7-4x2-mt', nombre: '4x2 MT', monedaPublica: 'ARS', precioPublico: 44137500, monedaFinanciada: 'ARS', precioFinanciado: 41724300 },
      { id: 'g7-4x4-mt', nombre: '4x4 MT', monedaPublica: 'ARS', precioPublico: 47182500, monedaFinanciada: 'ARS', precioFinanciado: 44659500 },
      { id: 'g7-4x2-at', nombre: '4x2 AT', monedaPublica: 'ARS', precioPublico: 49212500, monedaFinanciada: 'ARS', precioFinanciado: 46616300 },
      { id: 'g7-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 53932250, monedaFinanciada: 'ARS', precioFinanciado: 51165900 },
    ]},
  { id: 'tunland-v9-mhev', linea: 'TUNLAND', nombre: 'V9 Ultimate MHEV', grupoTasa: 'pickups',
    versiones: [
      { id: 'v9-mhev-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 74739750, monedaFinanciada: 'ARS', precioFinanciado: 71223300 },
    ]},
  { id: 'tunland-v7-mhev', linea: 'TUNLAND', nombre: 'V7 Ultimate MHEV', grupoTasa: 'pickups',
    versiones: [
      { id: 'v7-mhev-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 0, monedaFinanciada: 'ARS', precioFinanciado: 74741900 },
    ]},
  { id: 'tunland-v9-pro', linea: 'TUNLAND', nombre: 'V9 Pro Sport Naftera', grupoTasa: 'pickups',
    versiones: [
      { id: 'v9-pro-4x4-at', nombre: '4x4 AT', monedaPublica: 'ARS', precioPublico: 0, monedaFinanciada: 'ARS', precioFinanciado: 78164000 },
    ]},
  // ============ AUMARK ============
  { id: 'aumark-s1-615', linea: 'AUMARK', nombre: 'Aumark S1 615', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s1-615-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 66975000, monedaFinanciada: 'USD', precioFinanciado: 44300 },
      { id: 'aumark-s1-615-fb', nombre: 'Flatbed', monedaPublica: 'ARS', precioPublico: 70237500, monedaFinanciada: 'USD', precioFinanciado: 46500 },
    ]},
  { id: 'aumark-s3-916', linea: 'AUMARK', nombre: 'Aumark S3 916', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s3-916-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 75457500, monedaFinanciada: 'USD', precioFinanciado: 50300 },
      { id: 'aumark-s3-916-fb', nombre: 'Flatbed', monedaPublica: 'ARS', precioPublico: 78720000, monedaFinanciada: 'USD', precioFinanciado: 52400 },
    ]},
  { id: 'aumark-s3-1016', linea: 'AUMARK', nombre: 'Aumark S3 1016', grupoTasa: 'aumark',
    versiones: [
      { id: 'aumark-s3-1016-ch', nombre: 'Chasis', monedaPublica: 'ARS', precioPublico: 87420000, monedaFinanciada: 'USD', precioFinanciado: 58200 },
    ]},
  // ============ AUMAN D ============
  { id: 'auman-d-1621', linea: 'AUMAN D', nombre: 'Auman D 1621', grupoTasa: 'auman-d-1621',
    versiones: [
      { id: 'aumand-1621-ch', nombre: 'Chasis', monedaPublica: 'USD', precioPublico: 66200, monedaFinanciada: 'USD', precioFinanciado: 70700 },
    ]},
  { id: 'auman-d-2027', linea: 'AUMAN D', nombre: 'Auman D 2027', grupoTasa: 'aumand-2027',
    versiones: [
      { id: 'aumand-2027-ch', nombre: 'Chasis 4x2', monedaPublica: 'USD', precioPublico: 79200, monedaFinanciada: 'USD', precioFinanciado: 79300 },
    ]},
  // ============ AUMAN C ============
  { id: 'auman-c-4440', linea: 'AUMAN C', nombre: 'Auman C 4440', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-4440-mixer', nombre: 'Mixer 8x4', monedaPublica: 'USD', precioPublico: 189800, monedaFinanciada: 'USD', precioFinanciado: 200900 },
    ]},
  { id: 'auman-c-3535', linea: 'AUMAN C', nombre: 'Auman C 3535', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-3535-mixer', nombre: 'Mixer 6x4', monedaPublica: 'USD', precioPublico: 159700, monedaFinanciada: 'USD', precioFinanciado: 170800 },
    ]},
  { id: 'auman-c-5046', linea: 'AUMAN C', nombre: 'Auman C 5046', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-5046-vol', nombre: 'Volcador 8x4', monedaPublica: 'USD', precioPublico: 204300, monedaFinanciada: 'USD', precioFinanciado: 215400 },
    ]},
  { id: 'auman-c-4146', linea: 'AUMAN C', nombre: 'Auman C 4146', grupoTasa: 'auman-c-5046',
    versiones: [
      { id: 'aumanc-4146-vol', nombre: 'Volcador 6x4', monedaPublica: 'USD', precioPublico: 186300, monedaFinanciada: 'USD', precioFinanciado: 197400 },
      { id: 'aumanc-4146-ch', nombre: 'Chasis 6x4', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 178200 },
    ]},
  // ============ AUMAN R ============
  { id: 'auman-r-1843', linea: 'AUMAN R', nombre: 'Auman R 1843-430', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-1843-tr', nombre: 'Tractor 4x2', monedaPublica: 'USD', precioPublico: 126400, monedaFinanciada: 'USD', precioFinanciado: 132100 },
    ]},
  { id: 'auman-r-2443', linea: 'AUMAN R', nombre: 'Auman R 2443-6x2 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2443-ta', nombre: 'Techo Alto', monedaPublica: 'USD', precioPublico: 135600, monedaFinanciada: 'USD', precioFinanciado: 144100 },
      { id: 'aumanr-2443-tb', nombre: 'Techo Bajo', monedaPublica: 'USD', precioPublico: 131000, monedaFinanciada: 'USD', precioFinanciado: 138800 },
    ]},
  { id: 'auman-r-2546', linea: 'AUMAN R', nombre: 'Auman R 2546-6x2 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2546-tr', nombre: 'Tractor 6x2', monedaPublica: 'USD', precioPublico: 139800, monedaFinanciada: 'USD', precioFinanciado: 155200 },
    ]},
  { id: 'auman-r-2556', linea: 'AUMAN R', nombre: 'Auman R 2556-6x4 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2556-tr', nombre: 'Tractor 6x4 Carretón', monedaPublica: 'USD', precioPublico: 156100, monedaFinanciada: 'USD', precioFinanciado: 175900 },
    ]},
  { id: 'auman-r-2656', linea: 'AUMAN R', nombre: 'Auman R 2656-6x4 T', grupoTasa: 'auman-r',
    versiones: [
      { id: 'aumanr-2656-tr', nombre: 'Tractor 6x4 Bitrén', monedaPublica: 'USD', precioPublico: 166100, monedaFinanciada: 'USD', precioFinanciado: 177200 },
    ]},
  // ============ BLUELINE E-AUMARK L6 (eléctrico) ============
  { id: 'blueline-l6', linea: 'BLUELINE', nombre: 'E-Aumark L6', grupoTasa: 'aumark',
    versiones: [
      { id: 'blueline-l6-ch', nombre: 'Chasis', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 58100 },
      { id: 'blueline-l6-fb', nombre: 'Flatbed', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 59800 },
      { id: 'blueline-l6-box', nombre: 'Box', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 64600 },
      { id: 'blueline-l6-boxr', nombre: 'Box Refri', monedaPublica: 'USD', precioPublico: 0, monedaFinanciada: 'USD', precioFinanciado: 83200 },
    ]},
];

// Tasas Corven Mayo 2026 — indexadas por "grupoTasa"
const TASAS_FOTON_DEFAULT = {
  'aumand-2027': {
    pesos:   { pctFinanciable: 70, bancos: { santander: { 12: 0.0, 24: 16.2, 36: 22.6 }, galicia: { 24: 16.5, 36: 21.5, 48: 21.0 }, icbc: { 12: 10.6, 24: 17.9, 36: 24.3 }, comafi: { 12: 7.0, 24: 23.0, 36: 29.0 } } },
    uva:     { pctFinanciable: 75, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { pctFinanciable: 70, santander: { 24: 0.0, 36: 0.0, 48: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 0.5 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 26.75, 48: 28.75, 60: 32.0 } },
  },
  'auman-r': {
    pesos:   { pctFinanciable: 70, bancos: { santander: { 12: 18.7, 24: 27.9, 36: 31.1 }, galicia: { 24: 23.5, 36: 27.0, 48: 29.0 }, icbc: { 12: 29.2, 24: 27.5, 36: 30.6 }, comafi: {} } },
    uva:     null,
    dolares: { pctFinanciable: 75, santander: { 24: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 5.0 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 26.75, 48: 28.75, 60: 32.0 } },
  },
  'auman-c-5046': {
    pesos:   { pctFinanciable: 70, bancos: { santander: { 12: 25.0, 24: 31.5, 36: 33.7 }, galicia: { 24: 30.0, 36: 32.0, 48: 32.5 }, icbc: { 12: 34.9, 24: 30.5, 36: 32.7 }, comafi: {} } },
    uva:     null,
    dolares: { pctFinanciable: 75, santander: { 24: 0.0, 36: 0.0, 48: 0.0 }, galicia: { 24: 0.5, 36: 0.5, 48: 5.0 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 30.75, 48: 32.25, 60: 35.0 } },
  },
  'auman-d-1621': {
    pesos:   { pctFinanciable: 65, bancos: { santander: { 12: 10.0, 24: 23.1, 36: 27.6 }, galicia: { 24: 19.0, 36: 23.5, 48: 26.0 }, icbc: { 12: 17.6, 24: 21.7, 36: 26.8 }, comafi: { 12: 12.0, 24: 26.0, 36: 31.0 } } },
    uva:     { pctFinanciable: 65, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { pctFinanciable: 65, santander: { 24: 0.0, 36: 0.0 }, galicia: { 24: 0.5, 36: 0.5 } },
    leasing: { pctFinanciable: 100, comafi: { 36: 26.75, 48: 28.75 } },
  },
  'aumark': {
    pesos:   { montoFinanciableFijo: 50000000, bancos: { santander: { 12: 7.8, 18: 17.0, 24: 21.8 }, galicia: { 24: 17.5, 36: 22.5, 48: 25.0 }, icbc: { 12: 19.5, 24: 22.7, 36: 27.5 }, comafi: { 12: 14.0, 18: 23.0, 24: 27.0 } } },
    uva:     { montoFinanciableFijo: 50000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { montoFinanciableFijo: 50000000, santander: { 24: 0.0, 36: 0.0 }, galicia: { 24: 0.5, 36: 0.5 } },
    leasing: null,
  },
  'pickups': {
    pesos:   { montoFinanciableFijo: 25000000, bancos: { santander: { 12: 7.8, 18: 17.0, 24: 21.8 }, galicia: { 24: 17.5, 36: 22.5, 48: 25.0 }, icbc: {}, comafi: {} } },
    uva:     { montoFinanciableFijo: 25000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: { montoFinanciableFijo: 25000000, santander: { 24: 0.0, 36: 0.0 } },
    leasing: null,
  },
  'minitrucks': {
    pesos:   { montoFinanciableFijo: 20000000, bancos: { santander: { 12: 7.8, 18: 17.0, 24: 21.8 }, galicia: { 24: 17.5, 36: 22.5, 48: 25.0 }, icbc: { 12: 19.5, 24: 22.7, 36: 27.5 }, comafi: { 12: 14.0, 18: 23.0, 24: 27.0 } } },
    uva:     { montoFinanciableFijo: 20000000, santander: { 12: 0.0, 18: 0.0, 24: 0.0 } },
    dolares: null,
    leasing: null,
  },
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
  santander: { nombre: 'Santander', color: '#dc2626' },
  galicia:   { nombre: 'Galicia',   color: '#f59e0b' },
  icbc:      { nombre: 'ICBC',      color: '#0f172a' },
  comafi:    { nombre: 'Comafi',    color: '#16a34a' },
};

const FOTON_CONFIG_DEFAULT = { modoTasa: 'tna', quebrantoTerminal: 10, quebrantoDealer: 5, ivaSobreIntereses: false, cotizacionDolar: 1200 };

const BANCOS_QA_DEFAULT = [
  { id: 'santander-0km', nombre: 'Santander 0km', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 39.5, plazos: [12, 24, 36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'santander-usados', nombre: 'Santander Usados', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 39.5, plazos: [12, 24, 36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['usado'], nota: '1-5 años LTV 80% / 6-15 años LTV 50%' },
  { id: 'santander-uva', nombre: 'Santander UVA', tipo: 'banco', moneda: 'UVA', sistema: 'frances', tna: 12.9, plazos: [12, 24, 36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km', 'usado'], nota: 'Capital ajusta por UVA' },
  { id: 'icbc-seguro', nombre: 'ICBC (seguro cautivo)', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 37.5, plazos: [24, 36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'icbc-liberado', nombre: 'ICBC (seguro liberado)', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 40.5, plazos: [24, 36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'bna-autos', nombre: 'BNA+Autos (PF hasta $100M)', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 38.0, plazos: [12, 24, 36, 48, 60, 72], gastosOtorgamientoPct: 0, ivaSobreIntereses: true, activo: true, aplicaA: ['0km', 'usado'] },
  { id: 'bna-conecta-29', nombre: 'BNA Conecta (sin quebranto)', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 29.0, plazos: [36], gastosOtorgamientoPct: 0, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'bna-conecta-24', nombre: 'BNA Conecta (con 5% quebranto)', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 24.0, plazos: [36], gastosOtorgamientoPct: 5, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'comafi-prendario-36', nombre: 'Comafi Prendario 36m', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 37.0, plazos: [36], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km', 'usado'] },
  { id: 'comafi-prendario-48', nombre: 'Comafi Prendario 48m', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 38.0, plazos: [48], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km', 'usado'] },
  { id: 'thecapital-leasing', nombre: 'The Capital Leasing', tipo: 'leasing', moneda: 'ARS', sistema: 'frances', tna: 35.9, plazos: [36, 48, 60], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'supervielle-leasing', nombre: 'Supervielle Leasing', tipo: 'leasing', moneda: 'ARS', sistema: 'frances', tna: 34.0, plazos: [36, 48, 60], gastosOtorgamientoPct: 2.5, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'gst-leasing', nombre: 'GST Leasing', tipo: 'leasing', moneda: 'ARS', sistema: 'frances', tna: 34.0, plazos: [36, 48, 60], gastosOtorgamientoPct: 2.5, ivaSobreIntereses: true, activo: true, aplicaA: ['0km'] },
  { id: 'alarfin', nombre: 'Alarfín', tipo: 'financiera', moneda: 'ARS', sistema: 'frances', tna: 95, plazos: [6, 12, 18, 24], gastosOtorgamientoPct: 4, ivaSobreIntereses: false, activo: true, aplicaA: ['0km', 'usado'] },
  { id: 'fincred', nombre: 'Fincred', tipo: 'financiera', moneda: 'ARS', sistema: 'frances', tna: 90, plazos: [3, 6, 12, 18], gastosOtorgamientoPct: 3, ivaSobreIntereses: false, activo: true, aplicaA: ['0km', 'usado'] },
];

const VENDEDORES_DEFAULT = [
  { id: 'agustin', nombre: 'Agustín Laviana', whatsapp: '2392559226', empresa: 'ambas', activo: true },
];

// Datos de cada empresa para auto-membrete
const EMPRESAS = {
  queautos: {
    nombre: 'Qué Autos',
    nombreFormal: 'QUÉ AUTOS',
    direccion: 'Av. Perón 1265, Trenque Lauquen',
    web: 'www.queautos.com.ar',
    tel: '2392-559226',
  },
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
  const [negocio, setNegocio] = useState('queautos');
  const [bancosQA, setBancosQA] = useState(BANCOS_QA_DEFAULT);
  const [modelosFoton, setModelosFoton] = useState(FOTON_MODELOS_DEFAULT);
  const [tasasFoton, setTasasFoton] = useState(TASAS_FOTON_DEFAULT);
  const [configFoton, setConfigFoton] = useState(FOTON_CONFIG_DEFAULT);
  const [vendedores, setVendedores] = useState(VENDEDORES_DEFAULT);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [formularios, setFormularios] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsAnuales, setSnapshotsAnuales] = useState([]);
  const [contadores, setContadores] = useState({ queautos: 0, foton: 0, pf: 0, pj: 0, ac: 0 });
  const [verCotizacion, setVerCotizacion] = useState(null);
  const [verFormulario, setVerFormulario] = useState(null);
  const [tema, setTema] = useState('claro'); // 'claro' u 'oscuro'
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await storageGet('bancos_qa_v4'); if (r?.value) setBancosQA(JSON.parse(r.value)); } catch {}
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
      try { const r = await storageGet('contadores_v4'); if (r?.value) setContadores(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('cotizaciones_v4'); if (r?.value) setCotizaciones(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('formularios_v4'); if (r?.value) setFormularios(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('snapshots_v4'); if (r?.value) setSnapshots(JSON.parse(r.value)); } catch {}
      try { const r = await storageGet('snapshots_anuales_v1'); if (r?.value) setSnapshotsAnuales(JSON.parse(r.value)); } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveBancosQA = async (n) => { setBancosQA(n); try { await storageSet('bancos_qa_v4', JSON.stringify(n)); } catch {} };
  const saveModelosFoton = async (n) => { setModelosFoton(n); try { await storageSet('modelos_foton_v5', JSON.stringify(n)); } catch {} };
  const saveTasasFoton = async (n) => { setTasasFoton(n); try { await storageSet('tasas_foton_v5', JSON.stringify(n)); } catch {} };
  const saveConfigFoton = async (n) => { setConfigFoton(n); try { await storageSet('config_foton_v4', JSON.stringify(n)); } catch {} };
  const saveVendedores = async (n) => { setVendedores(n); try { await storageSet('vendedores_v4', JSON.stringify(n)); } catch {} };

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
      bancosQA: JSON.parse(JSON.stringify(bancosQA)),
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
    await saveBancosQA(snap.bancosQA);
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
    const prefijo = negocio === 'queautos' ? 'QA' : 'FT';
    const nuevoContador = (contadores[negocio] || 0) + 1;
    const numero = `${prefijo}-${año}-${String(nuevoContador).padStart(4, '0')}`;

    const cot = { ...cotizacion, id: 'cot_' + Date.now(), numero, negocio, fechaCreacion: new Date().toISOString() };
    const nuevasCotizaciones = [cot, ...cotizaciones];
    setCotizaciones(nuevasCotizaciones);
    const nuevosContadores = { ...contadores, [negocio]: nuevoContador };
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

  useEffect(() => { setTab('simular'); }, [negocio]);

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" data-theme="claro" style={{ background: '#ffffff', color: '#1e3a8a' }}>Cargando...</div>;

  return (
    <div className="min-h-screen app-root" data-theme={tema} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="app-header border-b sticky top-0 z-20 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '0.02em' }}>
                <span className="text-amber-400">PRESUPUESTADOR</span>
                <span className="text-stone-500 mx-2">/</span>
                <span className="text-stone-200">{negocio === 'queautos' ? 'QUÉ AUTOS' : 'FOTON MALASPINA'}</span>
              </h1>
              <p className="text-xs text-stone-500 mt-1">Comparador de financiación · Trenque Lauquen / Pehuajó</p>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setNegocio('queautos')} className={`px-3 py-2 rounded text-sm font-semibold flex items-center gap-2 transition ${negocio === 'queautos' ? 'btn-active' : 'btn-tab'}`}><Car size={16} /> Qué Autos</button>
              <button onClick={() => setNegocio('foton')} className={`px-3 py-2 rounded text-sm font-semibold flex items-center gap-2 transition ${negocio === 'foton' ? 'btn-active' : 'btn-tab'}`}><Truck size={16} /> Foton</button>
              <button onClick={async () => { const nuevo = tema === 'claro' ? 'oscuro' : 'claro'; setTema(nuevo); try { await storageSet('tema_v1', nuevo); } catch {} }} className="px-3 py-2 rounded text-sm font-semibold btn-tab transition" title={tema === 'claro' ? 'Cambiar a oscuro' : 'Cambiar a claro'}>
                {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-1 mt-4 border-b border-stone-800 -mb-px overflow-x-auto">
            <TabBtn active={tab === 'simular'} onClick={() => setTab('simular')} icon={<Calculator size={14} />}>Simular</TabBtn>
            <TabBtn active={tab === 'mensual'} onClick={() => setTab('mensual')} icon={<Download size={14} />} highlight>Actualizar mensual</TabBtn>
            <TabBtn active={tab === 'cotizaciones'} onClick={() => setTab('cotizaciones')} icon={<FolderOpen size={14} />}>
              Cotizaciones {cotizaciones.filter(c => (c.empresa || c.negocio) === negocio).length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-400/20 text-amber-400 rounded text-[10px] font-bold">{cotizaciones.filter(c => (c.empresa || c.negocio) === negocio).length}</span>}
            </TabBtn>
            <TabBtn active={tab === 'formularios'} onClick={() => setTab('formularios')} icon={<ClipboardList size={14} />}>
              Formularios {formularios.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-400/20 text-amber-400 rounded text-[10px] font-bold">{formularios.length}</span>}
            </TabBtn>
            <TabBtn active={tab === 'vendedores'} onClick={() => setTab('vendedores')} icon={<Users size={14} />}>Vendedores</TabBtn>
            {negocio === 'queautos' ? (
              <TabBtn active={tab === 'config'} onClick={() => setTab('config')} icon={<Settings size={14} />}>Bancos y tasas</TabBtn>
            ) : (
              <>
                <TabBtn active={tab === 'modelos'} onClick={() => setTab('modelos')} icon={<Package size={14} />}>Modelos & precios</TabBtn>
                <TabBtn active={tab === 'tasas-foton'} onClick={() => setTab('tasas-foton')} icon={<Percent size={14} />}>Tasas por modelo</TabBtn>
                <TabBtn active={tab === 'config-foton'} onClick={() => setTab('config-foton')} icon={<Settings size={14} />}>Configuración</TabBtn>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 print:py-0 print:px-0 print:max-w-full">
        {tab === 'simular' && negocio === 'queautos' && <SimuladorQA bancos={bancosQA} vendedores={vendedores.filter(v => v.activo)} onGuardar={guardarCotizacion} onVerCot={setVerCotizacion} proxNumero={(contadores.queautos || 0) + 1} />}
        {tab === 'simular' && negocio === 'foton' && <SimuladorFoton modelos={modelosFoton} tasas={tasasFoton} config={configFoton} vendedores={vendedores.filter(v => v.activo)} onGuardar={guardarCotizacion} onVerCot={setVerCotizacion} proxNumero={(contadores.foton || 0) + 1} />}
        {tab === 'mensual' && <PanelMensual modelosFoton={modelosFoton} setModelosFoton={saveModelosFoton} tasasFoton={tasasFoton} setTasasFoton={saveTasasFoton} bancosQA={bancosQA} setBancosQA={saveBancosQA} configFoton={configFoton} setConfigFoton={saveConfigFoton} snapshots={snapshots} snapshotsAnuales={snapshotsAnuales} onCrearSnapshot={crearSnapshot} onRestaurarSnapshot={restaurarSnapshot} onEliminarSnapshot={eliminarSnapshot} onEliminarSnapshotAnual={eliminarSnapshotAnual} onExportarSnapshot={exportarSnapshot} />}
        {tab === 'cotizaciones' && <ListaCotizaciones cotizaciones={cotizaciones.filter(c => (c.empresa || c.negocio) === negocio)} onVer={setVerCotizacion} onEliminar={eliminarCotizacion} />}
        {tab === 'formularios' && <ModuloFormularios formularios={formularios} onGuardar={guardarFormulario} onEliminar={eliminarFormulario} onVer={setVerFormulario} vendedores={vendedores.filter(v => v.activo)} contadores={contadores} />}
        {tab === 'vendedores' && <ConfigVendedores vendedores={vendedores} setVendedores={saveVendedores} />}
        {tab === 'config' && negocio === 'queautos' && <ConfigQA bancos={bancosQA} setBancos={saveBancosQA} />}
        {tab === 'modelos' && negocio === 'foton' && <ConfigModelosFoton modelos={modelosFoton} setModelos={saveModelosFoton} />}
        {tab === 'tasas-foton' && negocio === 'foton' && <ConfigTasasFoton tasas={tasasFoton} setTasas={saveTasasFoton} />}
        {tab === 'config-foton' && negocio === 'foton' && <ConfigGeneralFoton config={configFoton} setConfig={saveConfigFoton} />}
      </main>

      <footer className="text-center text-xs text-stone-600 py-6 border-t border-stone-900 print:hidden">Agustín Laviana · Mayo 2026</footer>

      {verCotizacion && <ModalCotizacion cotizacion={verCotizacion} onClose={() => setVerCotizacion(null)} />}
      {verFormulario && <ModalFormulario formulario={verFormulario} onClose={() => setVerFormulario(null)} />}

      <InputStyle />
    </div>
  );
}

function TabBtn({ active, onClick, children, icon, highlight }) {
  return <button onClick={onClick} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition whitespace-nowrap ${active ? 'border-amber-400 text-amber-400' : highlight ? 'border-transparent text-amber-300/80 hover:text-amber-200' : 'border-transparent text-stone-400 hover:text-stone-200'}`}>{icon} {children}</button>;
}
function Campo({ label, children, hint }) {
  return <label className="block"><span className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">{label}</span>{children}{hint && <span className="block text-xs text-stone-500 mt-1">{hint}</span>}</label>;
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

function HeaderCotizacion({ proxNumero, negocio, vendedores, vendedorId, setVendedorId, validez, setValidez, empresaElegida, setEmpresaElegida }) {
  const prefijo = negocio === 'queautos' ? 'QA' : 'FT';
  const año = new Date().getFullYear();
  const numeroProyectado = `${prefijo}-${año}-${String(proxNumero).padStart(4, '0')}`;

  // Filtrar vendedores: solo los que pertenecen al negocio actual o son "ambas"
  const vendedoresFiltrados = vendedores.filter(v => !v.empresa || v.empresa === negocio || v.empresa === 'ambas');
  const vendedor = vendedoresFiltrados.find(v => v.id === vendedorId);
  const necesitaElegirEmpresa = vendedor && vendedor.empresa === 'ambas';

  return (
    <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
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

      <div className="mt-4 pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Vendedor">
          {vendedoresFiltrados.length === 0 ? (
            <div className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded p-2">No hay vendedores asignados a {negocio === 'queautos' ? 'Qué Autos' : 'Foton'}. Andá a "Vendedores" y asigná empresa.</div>
          ) : (
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="input">
              <option value="">— Elegir vendedor —</option>
              {vendedoresFiltrados.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}{v.empresa === 'ambas' ? ' ⭐' : ''}</option>
              ))}
            </select>
          )}
        </Campo>

        {/* Selector de empresa solo si el vendedor es "ambas" */}
        {necesitaElegirEmpresa && setEmpresaElegida && (
          <Campo label="Empresa del presupuesto ⭐" hint="Elegí con qué membrete sale">
            <select value={empresaElegida || ''} onChange={e => setEmpresaElegida(e.target.value)} className="input">
              <option value="">— Elegir empresa —</option>
              <option value="queautos">Qué Autos</option>
              <option value="foton">Foton Malaspina</option>
            </select>
          </Campo>
        )}
      </div>
    </section>
  );
}

// ============================================================
// SIMULADOR FOTON
// ============================================================

function SimuladorFoton({ modelos, tasas, config, vendedores, onGuardar, onVerCot, proxNumero }) {
  const [cliente, setCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  // Datos cliente uso interno (NO salen en PDF)
  const [emailCliente, setEmailCliente] = useState('');
  const [cuitCliente, setCuitCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [verDatosInternos, setVerDatosInternos] = useState(false);

  const [modeloId, setModeloId] = useState(modelos[0]?.id || '');
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

  // Empresa elegida (solo cuando el vendedor es "ambas")
  const [empresaElegida, setEmpresaElegida] = useState('foton');

  // Tasa de cheques editable
  const [tasaCheques, setTasaCheques] = useState(TASA_CHEQUES_DEFAULT);

  // CONTADO EFECTIVO
  const [contadoModo, setContadoModo] = useState('porcentaje'); // 'porcentaje' o 'monto'
  const [contadoPct, setContadoPct] = useState(DESCUENTO_CONTADO_DEFAULT); // %
  const [contadoMontoFinal, setContadoMontoFinal] = useState(''); // si modo es 'monto'
  const [overrideAutorizado, setOverrideAutorizado] = useState('');

  // Opciones seleccionadas (keys "banco-plan-plazo")
  const [opcionesSel, setOpcionesSel] = useState(new Set());

  // Si cambia el modelo, resetear versión a la primera (hook va ANTES de cualquier return)
  useEffect(() => {
    const m = modelos.find(x => x.id === modeloId);
    if (m && !m.versiones.find(v => v.id === versionId)) {
      setVersionId(m.versiones[0]?.id || '');
    }
  }, [modeloId, modelos, versionId]);

  const modelo = modelos.find(m => m.id === modeloId);
  if (!modelo) return <div className="text-stone-400">Sin modelos.</div>;

  const version = modelo.versiones.find(v => v.id === versionId) || modelo.versiones[0];
  if (!version) return <div className="text-stone-400">Modelo sin versiones cargadas.</div>;

  // Tasas según grupo del modelo
  const tasasGrupo = tasas[modelo.grupoTasa] || {};
  const planData = tasasGrupo[plan];
  // Cheques siempre disponible; los demás dependen del grupo
  const planDisponible = (plan === 'cheques' || plan === 'contado') ? true : (planData !== null && planData !== undefined);

  // Precio según tipo de lista elegida
  const precioCatalogo = tipoLista === 'publica' ? version.precioPublico : version.precioFinanciado;
  const monedaCatalogo = tipoLista === 'publica' ? version.monedaPublica : version.monedaFinanciada;
  const precioOver = parseNum(precioOverride);

  // Convertir todo a ARS para el cálculo (si está en USD, multiplicar por cotización)
  const precioCatalogoARS = monedaCatalogo === 'USD' ? precioCatalogo * (config.cotizacionDolar || 1) : precioCatalogo;
  const precioReferencia = precioOver > 0 ? precioOver : precioCatalogoARS;

  // Permuta
  const permutaN = permutaActiva ? parseNum(permutaCotizacion) : 0;
  const saldoAPagar = Math.max(0, precioReferencia - permutaN);

  let montoFinanciable = 0;
  if (plan === 'cheques') {
    montoFinanciable = saldoAPagar; // En cheques no hay tope, financia hasta 100%
  } else if (planDisponible) {
    if (planData.montoFinanciableFijo) montoFinanciable = planData.montoFinanciableFijo;
    else if (planData.pctFinanciable) montoFinanciable = saldoAPagar * (planData.pctFinanciable / 100);
  }
  const anticipoMinimo = Math.max(0, saldoAPagar - montoFinanciable);
  const anticipoTotal = anticipoMinimo + parseNum(anticipoExtra);
  const capitalFinanciar = Math.max(0, saldoAPagar - anticipoTotal);
  // En cheques no se aplica quebranto (no es operación con Corven)
  const quebrantoTotalPct = (plan === 'cheques' || plan === 'contado') ? 0 : (config.quebrantoTerminal + config.quebrantoDealer);
  const gastoOtorgQuebranto = capitalFinanciar * (quebrantoTotalPct / 100);

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

  const mejorCuota = resultados.length ? resultados.reduce((a, b) => a.cuota < b.cuota ? a : b) : null;
  const nombreCompleto = `${modelo.nombre} ${version.nombre}`;

  // Auto-marcar la mejor cuota si no hay nada seleccionado (cambia cada vez que se recalcula)
  useEffect(() => {
    if (resultados.length > 0 && opcionesSel.size === 0 && mejorCuota) {
      setOpcionesSel(new Set([mejorCuota.key]));
    }
  }, [resultados.length, plan]);

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

    let empresa = vendedor.empresa === 'ambas' ? empresaElegida : (vendedor.empresa || 'foton');
    if (vendedor.empresa === 'ambas' && !empresaElegida) { alert('Elegí con qué empresa querés emitir el presupuesto'); return; }

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
      cliente, whatsappCliente,
      datosInternos: { email: emailCliente, cuit: cuitCliente, direccion: direccionCliente, telefono: telefonoCliente },
      vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp },
      validez,
      vehiculo: nombreCompleto,
      tipoLista,
      plan, planNombre: PLAN_INFO[plan].nombre,
      precioReferencia,
      permuta,
      saldoAPagar,
      anticipoTotal, capitalFinanciar, gastoOtorgQuebranto,
      quebrantoTerminal: config.quebrantoTerminal, quebrantoDealer: config.quebrantoDealer,
      resultados: seleccionadas,
      resultadosTodos: resultados,
    });
    setGuardado(cot);
    setTimeout(() => setGuardado(null), 4000);
  };

  // Agrupar modelos por línea para el selector
  const lineas = [...new Set(modelos.map(m => m.linea))];

  return (
    <div className="space-y-6">
      <HeaderCotizacion proxNumero={proxNumero} negocio="foton" vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} validez={validez} setValidez={setValidez} empresaElegida={empresaElegida} setEmpresaElegida={setEmpresaElegida} />

      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Datos de la operación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Cliente *"><input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre y apellido" className="input" /></Campo>
          <Campo label="WhatsApp cliente"><input type="text" value={whatsappCliente} onChange={e => setWhatsappCliente(e.target.value)} placeholder="2392..." className="input" /></Campo>
          <div className="flex items-end">
            <button onClick={() => setVerDatosInternos(!verDatosInternos)} className="text-xs text-amber-400 hover:text-amber-300 underline">
              {verDatosInternos ? '▲ Ocultar' : '▼ Ver'} datos internos (no salen al cliente)
            </button>
          </div>
          {verDatosInternos && (
            <>
              <Campo label="Email cliente 🔒"><input type="email" value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="cliente@email.com" className="input" /></Campo>
              <Campo label="CUIT / DNI 🔒"><input type="text" value={cuitCliente} onChange={e => setCuitCliente(e.target.value)} placeholder="20-12345678-9" className="input" /></Campo>
              <Campo label="Dirección 🔒"><input type="text" value={direccionCliente} onChange={e => setDireccionCliente(e.target.value)} placeholder="Calle 123" className="input" /></Campo>
              <Campo label="Teléfono fijo 🔒"><input type="text" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} placeholder="02392..." className="input" /></Campo>
              <div className="sm:col-span-2 lg:col-span-1 text-xs text-stone-500 italic flex items-end">🔒 Estos datos quedan registrados pero NO salen en el PDF/WhatsApp al cliente.</div>
            </>
          )}
          <Campo label="Modelo">
            <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="input">
              {lineas.map(linea => (
                <optgroup key={linea} label={linea}>
                  {modelos.filter(m => m.linea === linea).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo label="Versión">
            <select value={versionId} onChange={e => setVersionId(e.target.value)} className="input">
              {modelo.versiones.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Tipo de lista">
            <div className="flex gap-2">
              <button onClick={() => setTipoLista('publica')} className={`flex-1 px-2 py-2 rounded text-xs font-semibold ${tipoLista === 'publica' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Lista Pública</button>
              <button onClick={() => setTipoLista('financiada')} className={`flex-1 px-2 py-2 rounded text-xs font-semibold ${tipoLista === 'financiada' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Lista Financiada (9%)</button>
            </div>
          </Campo>
        </div>

        {/* Info de precio del catálogo */}
        <div className="mt-4 pt-4 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-stone-500 text-xs">{tipoLista === 'publica' ? 'Lista pública' : 'Lista financiada 9%'}</div>
            <div className="text-stone-200 font-bold">
              {precioCatalogo > 0 ? (monedaCatalogo === 'USD' ? formatUSD(precioCatalogo) : formatARS(precioCatalogo)) : '— sin precio —'}
            </div>
            {monedaCatalogo === 'USD' && precioCatalogo > 0 && (
              <div className="text-xs text-stone-500">≈ {formatARS(precioCatalogoARS)} a {formatARS(config.cotizacionDolar)} / USD</div>
            )}
          </div>
          <Campo label="Precio override (opcional)" hint="Sobrescribe el de catálogo (en ARS)">
            <InputDinero value={precioOverride} onChange={setPrecioOverride} placeholder={formatARS(precioCatalogoARS)} />
          </Campo>
          <Campo label="Anticipo extra" hint={`Mínimo: ${formatARS(anticipoMinimo)}`}>
            <InputDinero value={anticipoExtra} onChange={setAnticipoExtra} placeholder="$ 0" />
          </Campo>
        </div>

        <div className="mt-5 pt-5 border-t border-stone-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Plan de financiación</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(PLAN_INFO).map(([key, info]) => {
              const disponible = (key === 'cheques' || key === 'contado') ? true : (tasasGrupo[key] !== null && tasasGrupo[key] !== undefined);
              return (
                <button key={key} onClick={() => disponible && setPlan(key)} disabled={!disponible} className={`px-3 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition ${plan === key ? 'bg-amber-400 text-stone-950' : disponible ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}>
                  {info.icon} {info.nombre}
                </button>
              );
            })}
          </div>

          {/* Input tasa editable solo para cheques */}
          {plan === 'contado' && (
            <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Contado Efectivo</span>
              </div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setContadoModo('porcentaje')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${contadoModo === 'porcentaje' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>% de descuento</button>
                <button onClick={() => setContadoModo('monto')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${contadoModo === 'monto' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Monto final</button>
              </div>
              {contadoModo === 'porcentaje' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setContadoPct(Math.max(0, +(parseFloat(contadoPct) - 0.5).toFixed(2)))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">−</button>
                  <div className="relative">
                    <input type="number" step="0.5" value={contadoPct} onChange={e => setContadoPct(e.target.value)} className="input text-center font-bold text-lg pr-8" style={{ width: 100 }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
                  </div>
                  <button onClick={() => setContadoPct(+(parseFloat(contadoPct) + 0.5).toFixed(2))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">+</button>
                  <span className="text-xs text-stone-400">descuento sobre el saldo</span>
                </div>
              ) : (
                <InputDinero value={contadoMontoFinal} onChange={setContadoMontoFinal} placeholder="Monto final negociado" />
              )}
              {contadoRequiereOverride && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-400/40 rounded">
                  <div className="text-xs font-bold text-orange-300 uppercase tracking-wider mb-2">⚠️ Descuento mayor al autorizado ({DESCUENTO_CONTADO_DEFAULT}%)</div>
                  <input type="text" value={overrideAutorizado} onChange={e => setOverrideAutorizado(e.target.value)} placeholder='Escribí "AUTORIZADO POR AGUSTÍN"' className="input" />
                  <p className="text-xs text-stone-400 mt-1">Sin este campo no se puede guardar la cotización.</p>
                </div>
              )}
            </div>
          )}

          {plan === 'cheques' && (
            <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileSignature size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Tasa de cheques negociable</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={() => setTasaCheques(Math.max(0, +(tasaCheques - 0.5).toFixed(2)))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">−</button>
                  <div className="relative">
                    <input type="number" step="0.1" value={tasaCheques} onChange={e => setTasaCheques(parseFloat(e.target.value) || 0)} className="input text-center font-bold text-lg pr-8" style={{ width: 100 }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
                  </div>
                  <button onClick={() => setTasaCheques(+(tasaCheques + 0.5).toFixed(2))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">+</button>
                </div>
                <span className="text-xs text-stone-400">mensual directo</span>
                {tasaCheques !== TASA_CHEQUES_DEFAULT && (
                  <button onClick={() => setTasaCheques(TASA_CHEQUES_DEFAULT)} className="text-xs text-amber-400 hover:text-amber-300 underline">Volver al default ({TASA_CHEQUES_DEFAULT}%)</button>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-2">💡 Podés ajustar la tasa para negociar con el cliente.</p>
            </div>
          )}

          {plan !== 'cheques' && plan !== 'contado' && <div className="text-xs text-stone-500 mt-2">Tasas según grupo: <span className="text-amber-400">{GRUPOS_TASA_INFO[modelo.grupoTasa] || modelo.grupoTasa}</span></div>}
        </div>
      </section>

      {/* PERMUTA */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={permutaActiva} onChange={e => setPermutaActiva(e.target.checked)} className="accent-amber-400 w-4 h-4" />
          <span className="text-sm font-semibold text-stone-200">🚗 El cliente entrega un usado (permuta)</span>
        </label>

        {permutaActiva && (
          <div className="mt-4 pt-4 border-t border-stone-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Campo label="Marca y modelo"><input type="text" value={permutaMarcaModelo} onChange={e => setPermutaMarcaModelo(e.target.value)} placeholder="VW Gol Trend" className="input" /></Campo>
              <Campo label="Año"><input type="number" value={permutaAnio} onChange={e => setPermutaAnio(e.target.value)} placeholder="2015" className="input" /></Campo>
              <Campo label="KM"><input type="text" inputMode="numeric" value={permutaKm} onChange={e => setPermutaKm(e.target.value.replace(/[^\d]/g, ''))} placeholder="120000" className="input" /></Campo>
              <Campo label="Cotización estimada" hint="Sujeto a revisión mecánica"><InputDinero value={permutaCotizacion} onChange={setPermutaCotizacion} placeholder="$ 15.000.000" /></Campo>
              <Campo label="Precio InfoAuto" hint="🔒 Solo uso interno (no sale en el presupuesto)"><InputDinero value={permutaInfoAuto} onChange={setPermutaInfoAuto} placeholder="$ 0" /></Campo>
            </div>

            {precioReferencia > 0 && (
              <div className="bg-stone-950 border border-stone-800 rounded p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-stone-400">Precio del auto a presupuestar</span><span className="text-stone-200 font-semibold">{formatARS(precioReferencia)}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Menos el auto que entrega</span><span className="text-green-400 font-semibold">− {formatARS(permutaN)}</span></div>
                <div className="flex justify-between pt-2 border-t border-stone-800"><span className="text-amber-400 font-bold uppercase text-xs tracking-wider">Saldo a pagar</span><span className="text-amber-400 font-black text-lg">{formatARS(saldoAPagar)}</span></div>
              </div>
            )}
          </div>
        )}
      </section>

      {precioReferencia > 0 && capitalFinanciar > 0 && resultados.length > 0 && (
        <>
          <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Resumen · {PLAN_INFO[plan].nombre}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><div className="text-stone-500 text-xs">{permutaActiva ? 'Saldo a pagar' : 'Precio referencia'}</div><div className="text-stone-200 font-bold">{formatARS(permutaActiva ? saldoAPagar : precioReferencia)}</div></div>
              <div><div className="text-stone-500 text-xs">Anticipo</div><div className="text-stone-200 font-bold">{formatARS(anticipoTotal)}</div></div>
              <div><div className="text-stone-500 text-xs">A financiar</div><div className="text-amber-400 font-bold">{formatARS(capitalFinanciar)}</div></div>
              <div><div className="text-stone-500 text-xs">Quebranto ({quebrantoTotalPct}%)</div><div className="text-orange-400 font-bold">+{formatARS(gastoOtorgQuebranto)}</div></div>
            </div>
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
                // Otros planes: agrupados por banco Foton
                Object.keys(BANCOS_INFO_FOTON).map(bk => {
                  const rs = resultados.filter(r => r.bancoKey === bk).sort((a, b) => a.plazo - b.plazo);
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

      {!planDisponible && plan !== 'cheques' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-400">Plan <span className="text-amber-400">{PLAN_INFO[plan].nombre}</span> no disponible para grupo <span className="text-amber-400">{GRUPOS_TASA_INFO[modelo.grupoTasa] || modelo.grupoTasa}</span>.</div>}
      {precioReferencia === 0 && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-500 text-sm">Esta versión no tiene precio cargado. Cargalo en "Actualizar mensual" o ingresá uno en "Precio override".</div>}
    </div>
  );
}

// ============================================================
// SIMULADOR QUÉ AUTOS
// ============================================================

function SimuladorQA({ bancos, vendedores, onGuardar, onVerCot, proxNumero }) {
  const [cliente, setCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  // Datos cliente uso interno (NO salen en PDF)
  const [emailCliente, setEmailCliente] = useState('');
  const [cuitCliente, setCuitCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [verDatosInternos, setVerDatosInternos] = useState(false);

  const [marca, setMarca] = useState('');
  const [modeloVeh, setModeloVeh] = useState('');
  const [anio, setAnio] = useState('');
  const [tipo, setTipo] = useState('usado');
  const [precio, setPrecio] = useState('');
  const [anticipo, setAnticipo] = useState('');
  const [plazo, setPlazo] = useState(36);
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

  // Empresa elegida (solo cuando el vendedor es "ambas")
  const [empresaElegida, setEmpresaElegida] = useState('queautos');

  // Plan de financiación
  const [planQA, setPlanQA] = useState('pesos');

  // Tasa de cheques editable (% mensual directo)
  const [tasaCheques, setTasaCheques] = useState(TASA_CHEQUES_DEFAULT);

  // CONTADO EFECTIVO
  const [contadoModo, setContadoModo] = useState('porcentaje');
  const [contadoPct, setContadoPct] = useState(DESCUENTO_CONTADO_DEFAULT);
  const [contadoMontoFinal, setContadoMontoFinal] = useState('');
  const [overrideAutorizado, setOverrideAutorizado] = useState('');

  // Opciones seleccionadas
  const [opcionesSel, setOpcionesSel] = useState(new Set());

  // Vehículo armado: "Marca Modelo Año" (sin año si es 0km)
  const vehiculo = [marca, modeloVeh, tipo === 'usado' ? anio : ''].filter(Boolean).join(' ').trim();

  const precioN = parseNum(precio);
  const permutaN = permutaActiva ? parseNum(permutaCotizacion) : 0;
  const saldoAPagar = Math.max(0, precioN - permutaN);
  const antN = parseNum(anticipo);
  const capital = Math.max(0, saldoAPagar - antN);

  // Función para clasificar un banco en un plan
  const planDeBanco = (b) => {
    if (b.tipo === 'leasing') return 'leasing';
    if (b.moneda === 'UVA') return 'uva';
    if (b.moneda === 'USD') return 'dolares';
    return 'pesos';
  };

  // Disponibilidad de cada plan (¿hay bancos activos?)
  const planesDisponibles = {
    contado: true, // Siempre disponible
    pesos:   bancos.some(b => b.activo && (b.aplicaA || []).includes(tipo) && planDeBanco(b) === 'pesos'),
    uva:     bancos.some(b => b.activo && (b.aplicaA || []).includes(tipo) && planDeBanco(b) === 'uva'),
    dolares: bancos.some(b => b.activo && (b.aplicaA || []).includes(tipo) && planDeBanco(b) === 'dolares'),
    leasing: bancos.some(b => b.activo && (b.aplicaA || []).includes(tipo) && planDeBanco(b) === 'leasing'),
    cheques: true, // Siempre disponible
  };

  // CONTADO EFECTIVO: calcular descuento y precio final
  const contadoDescuentoPct = (() => {
    if (planQA !== 'contado') return 0;
    if (contadoModo === 'monto') {
      const monto = parseNum(contadoMontoFinal);
      if (monto > 0 && saldoAPagar > 0) return ((saldoAPagar - monto) / saldoAPagar) * 100;
      return 0;
    }
    return parseFloat(contadoPct) || 0;
  })();
  const contadoPrecioFinal = contadoModo === 'monto' && parseNum(contadoMontoFinal) > 0
    ? parseNum(contadoMontoFinal)
    : Math.max(0, saldoAPagar - (saldoAPagar * contadoDescuentoPct / 100));
  const contadoMontoDesc = saldoAPagar - contadoPrecioFinal;
  const contadoRequiereOverride = contadoDescuentoPct > DESCUENTO_CONTADO_DEFAULT;
  const contadoAutorizado = !contadoRequiereOverride || (overrideAutorizado && overrideAutorizado.trim().length > 0);

  // Cálculo de resultados según plan
  let resultados = [];
  if (planQA === 'contado' && saldoAPagar > 0 && contadoAutorizado) {
    resultados = [{
      key: 'contado-unico',
      bancoKey: 'contado',
      bancoNombre: 'Contado Efectivo',
      banco: { id: 'contado', nombre: 'Contado Efectivo', tipo: 'contado' },
      plazo: 1,
      tasa: 0,
      cuota: contadoPrecioFinal,
      totalFin: contadoPrecioFinal,
      gastos: 0,
      costoTotal: contadoPrecioFinal,
      moneda: 'ARS',
      nota: `${contadoDescuentoPct.toFixed(1)}% de descuento`,
      descuentoPct: contadoDescuentoPct,
      descuentoMonto: contadoMontoDesc,
    }];
  } else if (planQA === 'cheques') {
    // Plan cheques: tasa editable, sin bancos, plazos fijos
    if (capital > 0) {
      resultados = PLAZOS_CHEQUES.map(p => {
        const cuota = cuotaCheques(capital, tasaCheques, p);
        const totalFin = cuota * p;
        return {
          key: `cheques-${p}`,
          bancoKey: 'cheques',
          bancoNombre: 'Cheques',
          banco: { id: 'cheques', nombre: 'Cheques', tipo: 'cheques' },
          plazo: p,
          tasa: tasaCheques,
          cuota,
          totalFin,
          gastos: 0,
          costoTotal: totalFin + antN,
          moneda: 'ARS',
          nota: `${tasaCheques}% mensual directo`,
        };
      });
    }
  } else {
    const bancosAct = bancos.filter(b => b.activo && (b.aplicaA || []).includes(tipo) && planDeBanco(b) === planQA);
    resultados = bancosAct.map(b => {
      const plazoUsar = b.plazos.includes(parseInt(plazo)) ? parseInt(plazo) : b.plazos.find(p => p >= parseInt(plazo)) || b.plazos[b.plazos.length - 1];
      let cuota = cuotaFrances(capital, b.tna, plazoUsar);
      if (b.ivaSobreIntereses && capital > 0) {
        const interes = cuota - (capital / plazoUsar);
        cuota = cuota + Math.max(0, interes) * 0.21;
      }
      const totalFin = cuota * plazoUsar;
      const gastos = capital * (b.gastosOtorgamientoPct / 100);
      return { key: `${b.id}-${plazoUsar}`, bancoKey: b.id, bancoNombre: b.nombre, banco: b, plazo: plazoUsar, tasa: b.tna, cuota, totalFin, gastos, costoTotal: totalFin + antN + gastos, moneda: b.moneda || 'ARS' };
    }).filter(() => capital > 0);
  }

  const mejorCuota = resultados.length ? resultados.reduce((a, b) => a.cuota < b.cuota ? a : b) : null;

  // Auto-marcar la mejor cuota si no hay nada seleccionado
  useEffect(() => {
    if (resultados.length > 0 && opcionesSel.size === 0 && mejorCuota) {
      setOpcionesSel(new Set([mejorCuota.key]));
    }
  }, [resultados.length]);

  // Limpiar selección al cambiar de plan
  useEffect(() => {
    setOpcionesSel(new Set());
  }, [planQA, tipo]);

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

    // Determinar empresa: si el vendedor es "ambas", usa la elegida; si no, la del vendedor; default: queautos
    let empresa = vendedor.empresa === 'ambas' ? empresaElegida : (vendedor.empresa || 'queautos');
    if (vendedor.empresa === 'ambas' && !empresaElegida) { alert('Elegí con qué empresa querés emitir el presupuesto'); return; }

    const permuta = permutaActiva ? {
      marcaModelo: permutaMarcaModelo,
      anio: permutaAnio,
      km: permutaKm,
      cotizacion: parseNum(permutaCotizacion),
      infoAuto: parseNum(permutaInfoAuto), // solo uso interno
    } : null;

    const cot = await onGuardar({
      tipo: 'queautos',
      empresa,
      cliente, whatsappCliente,
      datosInternos: { email: emailCliente, cuit: cuitCliente, direccion: direccionCliente, telefono: telefonoCliente },
      vendedor: { nombre: vendedor.nombre, whatsapp: vendedor.whatsapp },
      validez,
      vehiculo, tipoUnidad: tipo,
      plan: planQA, planNombre: PLAN_INFO[planQA].nombre,
      precioReferencia: precioN,
      permuta,
      saldoAPagar,
      anticipoTotal: antN, capitalFinanciar: capital,
      plazo,
      resultados: seleccionadas,
      resultadosTodos: resultados,
    });
    setGuardado(cot);
    setTimeout(() => setGuardado(null), 4000);
  };

  return (
    <div className="space-y-6">
      <HeaderCotizacion proxNumero={proxNumero} negocio="queautos" vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} validez={validez} setValidez={setValidez} empresaElegida={empresaElegida} setEmpresaElegida={setEmpresaElegida} />

      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Datos de la operación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Cliente *"><input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre y apellido" className="input" /></Campo>
          <Campo label="WhatsApp cliente"><input type="text" value={whatsappCliente} onChange={e => setWhatsappCliente(e.target.value)} placeholder="2392..." className="input" /></Campo>
          <div className="sm:col-span-2 flex">
            <button onClick={() => setVerDatosInternos(!verDatosInternos)} className="text-xs text-amber-400 hover:text-amber-300 underline">
              {verDatosInternos ? '▲ Ocultar' : '▼ Ver'} datos internos (no salen al cliente)
            </button>
          </div>
          {verDatosInternos && (
            <>
              <Campo label="Email cliente 🔒"><input type="email" value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="cliente@email.com" className="input" /></Campo>
              <Campo label="CUIT / DNI 🔒"><input type="text" value={cuitCliente} onChange={e => setCuitCliente(e.target.value)} placeholder="20-12345678-9" className="input" /></Campo>
              <Campo label="Dirección 🔒"><input type="text" value={direccionCliente} onChange={e => setDireccionCliente(e.target.value)} placeholder="Calle 123" className="input" /></Campo>
              <Campo label="Teléfono fijo 🔒"><input type="text" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} placeholder="02392..." className="input" /></Campo>
              <div className="sm:col-span-2 text-xs text-stone-500 italic">🔒 Estos datos quedan registrados pero NO salen en el PDF/WhatsApp al cliente.</div>
            </>
          )}
          <Campo label="Marca"><input type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="VW / Ford / Toyota..." className="input" /></Campo>
          <Campo label="Modelo"><input type="text" value={modeloVeh} onChange={e => setModeloVeh(e.target.value)} placeholder="Amarok / Hilux..." className="input" /></Campo>
          {tipo === 'usado' && (
            <Campo label="Año"><input type="number" value={anio} onChange={e => setAnio(e.target.value)} placeholder="2020" className="input" /></Campo>
          )}
          <Campo label="Tipo de unidad">
            <div className="flex gap-2">
              <button onClick={() => setTipo('0km')} className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${tipo === '0km' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>0 km</button>
              <button onClick={() => setTipo('usado')} className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${tipo === 'usado' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Usado</button>
            </div>
          </Campo>
          <Campo label="Plazo">
            <select value={plazo} onChange={e => setPlazo(parseInt(e.target.value))} className="input">
              {[6, 12, 18, 24, 36, 48, 60, 72].map(p => <option key={p} value={p}>{p} meses</option>)}
            </select>
          </Campo>
          <Campo label="Precio"><InputDinero value={precio} onChange={setPrecio} placeholder="$ 35.000.000" /></Campo>
          <Campo label="Anticipo"><InputDinero value={anticipo} onChange={setAnticipo} placeholder="$ 10.000.000" /></Campo>
        </div>

        {/* Selector de plan de financiación */}
        <div className="mt-5 pt-5 border-t border-stone-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Plan de financiación</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(PLAN_INFO).map(([key, info]) => {
              const disponible = planesDisponibles[key];
              return (
                <button
                  key={key}
                  onClick={() => disponible && setPlanQA(key)}
                  disabled={!disponible}
                  className={`px-3 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition ${planQA === key ? 'bg-amber-400 text-stone-950' : disponible ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' : 'bg-stone-900 text-stone-700 cursor-not-allowed'}`}
                >
                  {info.icon} {info.nombre}
                </button>
              );
            })}
          </div>

          {/* Panel contado efectivo */}
          {planQA === 'contado' && (
            <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Contado Efectivo</span>
              </div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setContadoModo('porcentaje')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${contadoModo === 'porcentaje' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>% de descuento</button>
                <button onClick={() => setContadoModo('monto')} className={`flex-1 px-3 py-2 rounded text-xs font-semibold ${contadoModo === 'monto' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Monto final</button>
              </div>
              {contadoModo === 'porcentaje' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setContadoPct(Math.max(0, +(parseFloat(contadoPct) - 0.5).toFixed(2)))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">−</button>
                  <div className="relative">
                    <input type="number" step="0.5" value={contadoPct} onChange={e => setContadoPct(e.target.value)} className="input text-center font-bold text-lg pr-8" style={{ width: 100 }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
                  </div>
                  <button onClick={() => setContadoPct(+(parseFloat(contadoPct) + 0.5).toFixed(2))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">+</button>
                  <span className="text-xs text-stone-400">descuento sobre el saldo</span>
                </div>
              ) : (
                <InputDinero value={contadoMontoFinal} onChange={setContadoMontoFinal} placeholder="Monto final negociado" />
              )}
              {contadoRequiereOverride && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-400/40 rounded">
                  <div className="text-xs font-bold text-orange-300 uppercase tracking-wider mb-2">⚠️ Descuento mayor al autorizado ({DESCUENTO_CONTADO_DEFAULT}%)</div>
                  <input type="text" value={overrideAutorizado} onChange={e => setOverrideAutorizado(e.target.value)} placeholder='Escribí "AUTORIZADO POR AGUSTÍN"' className="input" />
                  <p className="text-xs text-stone-400 mt-1">Sin este campo no se puede guardar la cotización.</p>
                </div>
              )}
            </div>
          )}

          {/* Input tasa editable solo para cheques */}
          {planQA === 'cheques' && (
            <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-400/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileSignature size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Tasa de cheques negociable</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={() => setTasaCheques(Math.max(0, +(tasaCheques - 0.5).toFixed(2)))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">−</button>
                  <div className="relative">
                    <input type="number" step="0.1" value={tasaCheques} onChange={e => setTasaCheques(parseFloat(e.target.value) || 0)} className="input text-center font-bold text-lg pr-8" style={{ width: 100 }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
                  </div>
                  <button onClick={() => setTasaCheques(+(tasaCheques + 0.5).toFixed(2))} className="w-9 h-9 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold text-lg">+</button>
                </div>
                <span className="text-xs text-stone-400">mensual directo</span>
                {tasaCheques !== TASA_CHEQUES_DEFAULT && (
                  <button onClick={() => setTasaCheques(TASA_CHEQUES_DEFAULT)} className="text-xs text-amber-400 hover:text-amber-300 underline">Volver al default ({TASA_CHEQUES_DEFAULT}%)</button>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-2">💡 Podés ajustar la tasa para negociar con el cliente.</p>
            </div>
          )}

          {planQA !== 'cheques' && <p className="text-xs text-stone-500 mt-2">Mostrando solo bancos/financieras del plan elegido.</p>}
        </div>
      </section>

      {/* PERMUTA */}
      <section className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={permutaActiva} onChange={e => setPermutaActiva(e.target.checked)} className="accent-amber-400 w-4 h-4" />
          <span className="text-sm font-semibold text-stone-200">🚗 El cliente entrega un usado (permuta)</span>
        </label>

        {permutaActiva && (
          <div className="mt-4 pt-4 border-t border-stone-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Campo label="Marca y modelo"><input type="text" value={permutaMarcaModelo} onChange={e => setPermutaMarcaModelo(e.target.value)} placeholder="VW Gol Trend" className="input" /></Campo>
              <Campo label="Año"><input type="number" value={permutaAnio} onChange={e => setPermutaAnio(e.target.value)} placeholder="2015" className="input" /></Campo>
              <Campo label="KM"><input type="text" inputMode="numeric" value={permutaKm} onChange={e => setPermutaKm(e.target.value.replace(/[^\d]/g, ''))} placeholder="120000" className="input" /></Campo>
              <Campo label="Cotización estimada" hint="Sujeto a revisión mecánica"><InputDinero value={permutaCotizacion} onChange={setPermutaCotizacion} placeholder="$ 15.000.000" /></Campo>
              <Campo label="Precio InfoAuto" hint="🔒 Solo uso interno (no sale en el presupuesto)"><InputDinero value={permutaInfoAuto} onChange={setPermutaInfoAuto} placeholder="$ 0" /></Campo>
            </div>

            {/* Resumen del cálculo */}
            {precioN > 0 && (
              <div className="bg-stone-950 border border-stone-800 rounded p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Precio del auto a presupuestar</span>
                  <span className="text-stone-200 font-semibold">{formatARS(precioN)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Menos el auto que entrega</span>
                  <span className="text-green-400 font-semibold">− {formatARS(permutaN)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-800">
                  <span className="text-amber-400 font-bold uppercase text-xs tracking-wider">Saldo a pagar</span>
                  <span className="text-amber-400 font-black text-lg">{formatARS(saldoAPagar)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {precioN > 0 && resultados.length > 0 && (
        <>
          <section>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Opciones para {tipo === '0km' ? '0 km' : 'usado'} · {PLAN_INFO[planQA].nombre} · {resultados.length}</h2>
              <div className="text-xs text-stone-400">
                ☑️ <span className="text-amber-400 font-bold">{opcionesSel.size}</span> seleccionada{opcionesSel.size !== 1 && 's'} para enviar al cliente
              </div>
            </div>
            {mejorCuota && (
              <div className="mb-4">
                <DestacadaCard icon={<TrendingDown size={18} />} label="Menor cuota" banco={mejorCuota.bancoNombre} valor={formatARS(mejorCuota.cuota)} detalle={`${mejorCuota.plazo} cuotas · ${mejorCuota.tasa}% TNA`} />
              </div>
            )}
            <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-950 text-stone-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-center p-3 w-10">☑️</th>
                      <th className="text-left p-3">Entidad</th>
                      <th className="text-center p-3">Plazo</th>
                      <th className="text-right p-3">Cuota</th>
                      <th className="text-right p-3">Costo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.sort((a, b) => a.cuota - b.cuota).map(r => {
                      const seleccionado = opcionesSel.has(r.key);
                      return (
                        <tr key={r.key} className={`border-t border-stone-800 cursor-pointer ${seleccionado ? 'bg-amber-400/10' : r === mejorCuota ? 'bg-amber-400/5' : ''}`} onClick={() => toggleOpcion(r.key)}>
                          <td className="p-3 text-center">
                            <input type="checkbox" checked={seleccionado} onChange={() => toggleOpcion(r.key)} onClick={e => e.stopPropagation()} className="accent-amber-400 w-4 h-4" />
                          </td>
                          <td className="p-3"><div className="font-semibold text-stone-100">{r.bancoNombre}</div><div className="text-xs text-stone-500">{r.tasa}% TNA · {r.banco.tipo}</div></td>
                          <td className="text-center p-3 text-stone-300">{r.plazo}</td>
                          <td className="text-right p-3 font-bold text-amber-400">{formatARS(r.cuota)}</td>
                          <td className="text-right p-3 text-stone-300">{formatARS(r.costoTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-2">💡 Marcá las opciones que querés enviarle al cliente. Solo esas aparecen en el PDF / WhatsApp.</p>
          </section>

          <BotonGuardar onClick={handleGuardar} guardado={guardado} onVerCot={onVerCot} />
        </>
      )}
      {precioN === 0 && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-500 text-sm">Cargá precio y anticipo para ver opciones.</div>}
      {precioN > 0 && resultados.length === 0 && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 text-center text-stone-400">No hay bancos activos para <span className="text-amber-400">{tipo === '0km' ? '0 km' : 'usado'}</span> en plan <span className="text-amber-400">{PLAN_INFO[planQA].nombre}</span>.</div>}
    </div>
  );
}

// ============================================================
// BOTÓN GUARDAR + CONFIRMACIÓN
// ============================================================

function BotonGuardar({ onClick, guardado, onVerCot }) {
  if (guardado) {
    return (
      <div className="bg-green-950 border border-green-700 rounded-lg p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"><Check size={20} className="text-white" /></div>
          <div>
            <div className="text-green-300 font-bold">Cotización guardada</div>
            <div className="text-green-200 text-sm">{guardado.numero}</div>
          </div>
        </div>
        <button onClick={() => onVerCot(guardado)} className="px-4 py-2 bg-amber-400 text-stone-950 rounded font-bold flex items-center gap-2 hover:bg-amber-300 transition">
          <Eye size={16} /> Ver y exportar
        </button>
      </div>
    );
  }
  return (
    <button onClick={onClick} className="w-full px-5 py-3.5 bg-amber-400 text-stone-950 rounded-lg font-bold text-base flex items-center justify-center gap-2 hover:bg-amber-300 transition shadow-lg shadow-amber-400/10">
      <Save size={18} /> Guardar cotización
    </button>
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
  const empresaKey = c.empresa || c.negocio || 'queautos';
  const empresaInfo = EMPRESAS[empresaKey] || EMPRESAS.queautos;
  const negocioNombre = empresaInfo.nombre;
  const negocioDatos = { direccion: empresaInfo.direccion, web: empresaInfo.web, tel: empresaInfo.tel };

  const top3 = [...(c.resultados || [])].sort((a, b) => a.cuota - b.cuota).slice(0, 3);

  // Texto WhatsApp formal
  const generarWhatsApp = () => {
    let m = `*COTIZACIÓN ${c.numero}*\n${negocioNombre}\nFecha: ${formatFecha(c.fechaCreacion)}\nVálida hasta: ${formatFecha(c.validez)}\n\n`;
    m += `Cliente: ${c.cliente}\n`;
    m += `Vehículo: ${c.vehiculo}${c.planNombre ? ` (${c.planNombre})` : ''}\n`;
    if (c.precioReferencia > 0) m += `Precio: ${formatARS(c.precioReferencia)}\n`;

    // Permuta (sin InfoAuto)
    if (c.permuta) {
      m += `\n🚗 *Usado que entrega:*\n`;
      if (c.permuta.marcaModelo) m += `• Modelo: ${c.permuta.marcaModelo}\n`;
      if (c.permuta.anio) m += `• Año: ${c.permuta.anio}\n`;
      if (c.permuta.km) m += `• KM: ${new Intl.NumberFormat('es-AR').format(parseNum(c.permuta.km))}\n`;
      if (c.permuta.cotizacion > 0) m += `• Cotización estimada: ${formatARS(c.permuta.cotizacion)}\n  _(sujeto a revisión mecánica)_\n`;
      if (c.saldoAPagar > 0) m += `\n💵 *Saldo a pagar: ${formatARS(c.saldoAPagar)}*\n`;
    }

    if (c.anticipoTotal > 0) m += `Anticipo: ${formatARS(c.anticipoTotal)}\n`;
    if (c.capitalFinanciar > 0) m += `A financiar: ${formatARS(c.capitalFinanciar)}\n`;

    // Solo las opciones seleccionadas (no top3, todas las que el vendedor marcó)
    const opcionesAEnviar = c.resultados || [];
    m += `\n*OPCIONES DE FINANCIACIÓN:*\n`;
    opcionesAEnviar.forEach((r, i) => {
      const cuotaStr = r.moneda === 'USD' ? formatUSD(r.cuota) : formatARS(r.cuota);
      m += `\n${i + 1}. ${r.bancoNombre}\n   ${r.plazo} cuotas de ${cuotaStr}${r.tasa !== undefined ? ` · ${r.tasa}% TNA` : ''}\n`;
    });
    m += `\nValores estimados, sujetos a aprobación crediticia.\n\nAtte. ${c.vendedor?.nombre || ''}\n${negocioNombre}`;
    return m;
  };

  const copiarWhatsApp = async () => {
    try { await navigator.clipboard.writeText(generarWhatsApp()); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
  };

  const imprimir = () => { window.print(); };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white text-stone-900 rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto print:max-h-none print:max-w-full print:rounded-none print:shadow-none" ref={printRef}>
        {/* Toolbar (no se imprime) */}
        <div className="sticky top-0 bg-stone-100 border-b border-stone-200 px-5 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="text-stone-700 font-semibold text-sm">Cotización {c.numero}</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={copiarWhatsApp} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold flex items-center gap-1.5">
              {copiado ? <><Check size={12} /> Copiado</> : <><MessageCircle size={12} /> WhatsApp</>}
            </button>
            <button onClick={imprimir} className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-xs font-bold flex items-center gap-1.5"><Printer size={12} /> Imprimir / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded text-xs font-bold">Cerrar</button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="p-8 print:p-10">
          {/* Encabezado: EMPRESA PREPONDERANTE */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-amber-500 to-amber-400 -mx-8 -mt-8 px-8 py-6 mb-6 print:-mx-10 print:-mt-10 print:px-10">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900" style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif", letterSpacing: '0.03em' }}>{negocioNombre.toUpperCase()}</div>
                  <div className="text-sm text-stone-800 font-semibold mt-2">{negocioDatos.direccion}</div>
                  <div className="text-sm text-stone-800">{negocioDatos.web} · WhatsApp: {negocioDatos.tel}</div>
                </div>
                <div className="text-right bg-white/30 backdrop-blur rounded-lg px-4 py-3 border border-white/40">
                  <div className="text-[10px] text-stone-800 uppercase tracking-widest font-bold">Cotización Nº</div>
                  <div className="text-2xl font-black text-stone-900 leading-none">{c.numero}</div>
                  <div className="text-xs text-stone-800 mt-2">Fecha: <span className="font-semibold">{formatFecha(c.fechaCreacion)}</span></div>
                  <div className="text-xs text-stone-800">Vence: <span className="font-bold">{formatFecha(c.validez)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cliente (sin vendedor — va al pie) */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-1">Cliente</div>
            <div className="text-stone-900 font-bold text-lg">{c.cliente}</div>
            {c.whatsappCliente && <div className="text-sm text-stone-600">WhatsApp: {c.whatsappCliente}</div>}
          </div>

          {/* Datos vehículo */}
          <div className="bg-stone-50 border border-stone-200 rounded p-4 mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2">Vehículo</div>
            <div className="text-stone-900 font-bold text-lg">{c.vehiculo}</div>
            {c.planNombre && <div className="text-sm text-amber-700 font-semibold mt-1">Plan: {c.planNombre}</div>}
            {c.tipoUnidad && <div className="text-sm text-stone-600 mt-1">{c.tipoUnidad === '0km' ? '0 km' : 'Usado'}</div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-stone-200 text-sm">
              {c.precioReferencia > 0 && <div><div className="text-stone-500 text-xs">Precio del auto</div><div className="font-bold">{formatARS(c.precioReferencia)}</div></div>}
              {c.permuta && c.permuta.cotizacion > 0 && <div><div className="text-stone-500 text-xs">− Permuta</div><div className="font-bold text-green-700">−{formatARS(c.permuta.cotizacion)}</div></div>}
              {c.saldoAPagar > 0 && c.permuta && <div><div className="text-stone-500 text-xs">Saldo a pagar</div><div className="font-bold text-amber-700">{formatARS(c.saldoAPagar)}</div></div>}
              {c.anticipoTotal > 0 && <div><div className="text-stone-500 text-xs">Anticipo</div><div className="font-bold">{formatARS(c.anticipoTotal)}</div></div>}
              {c.capitalFinanciar > 0 && <div><div className="text-stone-500 text-xs">A financiar</div><div className="font-bold">{formatARS(c.capitalFinanciar)}</div></div>}
              {c.gastoOtorgQuebranto > 0 && <div><div className="text-stone-500 text-xs">Gastos otorg.</div><div className="font-bold">{formatARS(c.gastoOtorgQuebranto)}</div></div>}
            </div>
          </div>

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

          {/* Opciones */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-3">Opciones de financiación</div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-900 text-white">
                  <th className="text-left p-2.5">Entidad</th>
                  <th className="text-center p-2.5">Plazo</th>
                  <th className="text-center p-2.5">Tasa</th>
                  <th className="text-right p-2.5">Cuota</th>
                  <th className="text-right p-2.5">Costo total</th>
                </tr>
              </thead>
              <tbody>
                {[...(c.resultados || [])].sort((a, b) => a.cuota - b.cuota).map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                    <td className="p-2.5 border-b border-stone-200 font-semibold">{r.bancoNombre}</td>
                    <td className="text-center p-2.5 border-b border-stone-200">{r.plazo} m</td>
                    <td className="text-center p-2.5 border-b border-stone-200">{r.tasa !== undefined ? `${r.tasa}%` : '—'}</td>
                    <td className="text-right p-2.5 border-b border-stone-200 font-bold text-amber-700">{r.moneda === 'USD' ? formatUSD(r.cuota) : formatARS(r.cuota)}</td>
                    <td className="text-right p-2.5 border-b border-stone-200 text-stone-600">{formatARS(r.costoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
          {c.datosInternos && (c.datosInternos.email || c.datosInternos.cuit || c.datosInternos.direccion || c.datosInternos.telefono) && (
            <div className="mt-6 bg-amber-50 border border-amber-300 rounded p-3 print:hidden">
              <div className="text-xs uppercase tracking-wider text-amber-800 font-bold mb-2">🔒 Datos internos del cliente (no salen en el PDF)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {c.datosInternos.email && <div><span className="text-stone-500">Email:</span> <span className="font-semibold text-stone-900">{c.datosInternos.email}</span></div>}
                {c.datosInternos.cuit && <div><span className="text-stone-500">CUIT/DNI:</span> <span className="font-semibold text-stone-900">{c.datosInternos.cuit}</span></div>}
                {c.datosInternos.direccion && <div><span className="text-stone-500">Dirección:</span> <span className="font-semibold text-stone-900">{c.datosInternos.direccion}</span></div>}
                {c.datosInternos.telefono && <div><span className="text-stone-500">Teléfono:</span> <span className="font-semibold text-stone-900">{c.datosInternos.telefono}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          @page { size: A4; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// CONFIG: VENDEDORES
// ============================================================

function ConfigVendedores({ vendedores, setVendedores }) {
  const toggleActivo = (id) => setVendedores(vendedores.map(v => v.id === id ? { ...v, activo: !v.activo } : v));
  const actualizar = (id, campo, valor) => setVendedores(vendedores.map(v => v.id === id ? { ...v, [campo]: valor } : v));
  const eliminar = (id) => { if (confirm('¿Eliminar vendedor?')) setVendedores(vendedores.filter(v => v.id !== id)); };
  const agregar = () => {
    const nuevo = { id: 'vend_' + Date.now(), nombre: 'Nuevo vendedor', whatsapp: '', empresa: 'queautos', activo: true };
    setVendedores([...vendedores, nuevo]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-400">Cargá los vendedores y asignales una empresa. El presupuesto sale con el membrete correcto automáticamente.</p>
        <button onClick={agregar} className="px-3 py-2 bg-amber-400 text-stone-950 rounded text-sm font-bold flex items-center gap-2 hover:bg-amber-300 transition"><Plus size={16} /> Agregar</button>
      </div>

      <div className="space-y-3">
        {vendedores.map(v => {
          const empresaActual = v.empresa || 'queautos';
          return (
            <div key={v.id} className="bg-stone-900 border border-stone-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" checked={v.activo} onChange={() => toggleActivo(v.id)} className="accent-amber-400 w-4 h-4" />
                <Users size={18} className="text-amber-400" />
                <span className="text-stone-500 text-xs">{v.activo ? 'Activo' : 'Inactivo'}</span>
                {empresaActual === 'queautos' && <span className="text-[10px] px-2 py-0.5 bg-stone-800 rounded font-semibold" style={{ color: '#2563eb' }}><Car size={10} className="inline" /> Qué Autos</span>}
                {empresaActual === 'foton' && <span className="text-[10px] px-2 py-0.5 bg-stone-800 rounded font-semibold" style={{ color: '#dc2626' }}><Truck size={10} className="inline" /> Foton</span>}
                {empresaActual === 'ambas' && <span className="text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded font-semibold">⭐ Ambas (elige al cotizar)</span>}
                <button onClick={() => eliminar(v.id)} className="ml-auto px-2 py-1 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo label="Nombre"><input type="text" value={v.nombre} onChange={e => actualizar(v.id, 'nombre', e.target.value)} className="input" /></Campo>
                <Campo label="WhatsApp"><input type="text" value={v.whatsapp} onChange={e => actualizar(v.id, 'whatsapp', e.target.value)} placeholder="2392..." className="input" /></Campo>
                <Campo label="Empresa">
                  <select value={empresaActual} onChange={e => actualizar(v.id, 'empresa', e.target.value)} className="input">
                    <option value="queautos">Qué Autos</option>
                    <option value="foton">Foton Malaspina</option>
                    <option value="ambas">Ambas (elige al cotizar)</option>
                  </select>
                </Campo>
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

  const filtrados = filtroLinea === 'todos' ? modelos : modelos.filter(m => m.linea === filtroLinea);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-400">Precios por versión: <span className="text-amber-400 font-semibold">Lista Pública</span> (Foton Malaspina) y <span className="text-amber-400 font-semibold">Lista Financiada 9%</span> (Foton Argentina).</p>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltroLinea('todos')} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtroLinea === 'todos' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Todas</button>
        {lineas.map(l => (
          <button key={l} onClick={() => setFiltroLinea(l)} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtroLinea === l ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtrados.map(m => (
          <div key={m.id} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
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
                    <th className="text-center p-2 w-16">Moneda</th>
                    <th className="text-right p-2 w-44">Pública</th>
                    <th className="text-center p-2 w-16">Moneda</th>
                    <th className="text-right p-2 w-44">Financiada 9% ⭐</th>
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
                      <td className="p-1.5">
                        <select value={v.monedaFinanciada} onChange={e => actualizarVersion(m.id, v.id, 'monedaFinanciada', e.target.value)} className="input text-xs">
                          <option>ARS</option><option>USD</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <input type="number" value={v.precioFinanciado || ''} onChange={e => actualizarVersion(m.id, v.id, 'precioFinanciado', parseFloat(e.target.value) || 0)} placeholder="0" className="input text-right text-xs" style={{ borderColor: v.precioFinanciado > 0 ? '#fbbf24' : undefined }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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
        <Campo label="Cotización del dólar"><input type="number" value={config.cotizacionDolar} onChange={e => setConfig({ ...config, cotizacionDolar: parseFloat(e.target.value) || 0 })} className="input" /></Campo>
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

function ConfigQA({ bancos, setBancos }) {
  const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const toggleActivo = (id) => setBancos(bancos.map(b => b.id === id ? { ...b, activo: !b.activo } : b));
  const actualizar = (id, campo, valor) => setBancos(bancos.map(b => b.id === id ? { ...b, [campo]: valor } : b));
  const toggleAplicaA = (id, tipo) => setBancos(bancos.map(b => {
    if (b.id !== id) return b;
    const aplica = b.aplicaA || [];
    return { ...b, aplicaA: aplica.includes(tipo) ? aplica.filter(t => t !== tipo) : [...aplica, tipo] };
  }));
  const eliminar = (id) => { if (confirm('¿Eliminar?')) setBancos(bancos.filter(b => b.id !== id)); };
  const agregar = () => {
    const nuevo = { id: 'nuevo_' + Date.now(), nombre: 'Nueva entidad', tipo: 'banco', moneda: 'ARS', sistema: 'frances', tna: 40, plazos: [12, 24, 36, 48], gastosOtorgamientoPct: 3, ivaSobreIntereses: true, activo: true, aplicaA: ['0km', 'usado'] };
    setBancos([...bancos, nuevo]); setEditId(nuevo.id);
  };
  const filtrados = bancos.filter(b => filtro === 'todos' ? true : (b.aplicaA || []).includes(filtro));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setFiltro('todos')} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtro === 'todos' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Todos</button>
          <button onClick={() => setFiltro('0km')} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtro === '0km' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>0 km</button>
          <button onClick={() => setFiltro('usado')} className={`px-3 py-1.5 rounded text-xs font-semibold ${filtro === 'usado' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>Usados</button>
        </div>
        <button onClick={agregar} className="px-3 py-2 bg-amber-400 text-stone-950 rounded text-sm font-bold flex items-center gap-2"><Plus size={16} /> Agregar</button>
      </div>
      <div className="space-y-3">
        {filtrados.map(b => (
          <div key={b.id} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
            <div className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" checked={b.activo} onChange={() => toggleActivo(b.id)} className="accent-amber-400 w-4 h-4" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-stone-100 truncate">{b.nombre}</div>
                  <div className="text-xs text-stone-500">{b.tipo} · {b.tna}% TNA · {b.moneda}{b.nota ? ` · ${b.nota}` : ''}</div>
                  <div className="flex gap-1 mt-1">{(b.aplicaA || []).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800 text-stone-400 rounded">{t}</span>)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditId(editId === b.id ? null : b.id)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-semibold">{editId === b.id ? 'Cerrar' : 'Editar'}</button>
                <button onClick={() => eliminar(b.id)} className="px-2 py-1.5 bg-stone-800 hover:bg-red-900 text-stone-400 hover:text-red-200 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            {editId === b.id && (
              <div className="border-t border-stone-800 p-4 bg-stone-950 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Nombre"><input type="text" value={b.nombre} onChange={e => actualizar(b.id, 'nombre', e.target.value)} className="input" /></Campo>
                <Campo label="Tipo">
                  <select value={b.tipo} onChange={e => actualizar(b.id, 'tipo', e.target.value)} className="input">
                    <option value="banco">Banco</option><option value="financiera">Financiera</option><option value="leasing">Leasing</option>
                  </select>
                </Campo>
                <Campo label="Moneda">
                  <select value={b.moneda} onChange={e => actualizar(b.id, 'moneda', e.target.value)} className="input">
                    <option value="ARS">Pesos</option><option value="UVA">UVA</option><option value="USD">Dólares</option>
                  </select>
                </Campo>
                <Campo label="TNA (%)"><input type="number" step="0.1" value={b.tna} onChange={e => actualizar(b.id, 'tna', parseFloat(e.target.value) || 0)} className="input" /></Campo>
                <Campo label="Gastos otorg. (%)"><input type="number" step="0.1" value={b.gastosOtorgamientoPct} onChange={e => actualizar(b.id, 'gastosOtorgamientoPct', parseFloat(e.target.value) || 0)} className="input" /></Campo>
                <Campo label="Plazos (separados por coma)">
                  <input type="text" value={b.plazos.join(', ')} onChange={e => actualizar(b.id, 'plazos', e.target.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)))} className="input" />
                </Campo>
                <Campo label="Nota"><input type="text" value={b.nota || ''} onChange={e => actualizar(b.id, 'nota', e.target.value)} className="input" /></Campo>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">Aplica a</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAplicaA(b.id, '0km')} className={`px-3 py-1.5 rounded text-xs font-semibold ${(b.aplicaA || []).includes('0km') ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>0 km</button>
                    <button onClick={() => toggleAplicaA(b.id, 'usado')} className={`px-3 py-1.5 rounded text-xs font-semibold ${(b.aplicaA || []).includes('usado') ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>Usado</button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-300 col-span-full">
                  <input type="checkbox" checked={b.ivaSobreIntereses} onChange={e => actualizar(b.id, 'ivaSobreIntereses', e.target.checked)} className="accent-amber-400" />
                  IVA 21% sobre intereses
                </label>
              </div>
            )}
          </div>
        ))}
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
};

function ModuloFormularios({ formularios, onGuardar, onEliminar, onVer, vendedores, contadores }) {
  const [vista, setVista] = useState('lista'); // 'lista' o 'pf' / 'pj' / 'ac'

  if (vista === 'pf') return <FormularioPF onCancelar={() => setVista('lista')} onGuardar={async (d) => { const f = await onGuardar({ ...d, tipo: 'pf' }); setVista('lista'); onVer(f); }} vendedores={vendedores} proxNumero={(contadores.pf || 0) + 1} />;
  if (vista === 'pj') return <FormularioPJ onCancelar={() => setVista('lista')} onGuardar={async (d) => { const f = await onGuardar({ ...d, tipo: 'pj' }); setVista('lista'); onVer(f); }} vendedores={vendedores} proxNumero={(contadores.pj || 0) + 1} />;
  if (vista === 'ac') return <FormularioAC onCancelar={() => setVista('lista')} onGuardar={async (d) => { const f = await onGuardar({ ...d, tipo: 'ac' }); setVista('lista'); onVer(f); }} vendedores={vendedores} proxNumero={(contadores.ac || 0) + 1} />;
  if (vista === 'proforma') return <FormularioProforma onCancelar={() => setVista('lista')} onGuardar={async (d) => { const f = await onGuardar({ ...d, tipo: 'proforma' }); setVista('lista'); onVer(f); }} vendedores={vendedores} proxNumero={(contadores.proforma || 0) + 1} />;

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
  const prefijo = { pf: 'PF', pj: 'PJ', ac: 'AC' }[tipo];
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
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DATERO PERSONA FÍSICA</h1>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <FormHeader tipo="pf" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos del solicitante" cols={3}>
        <Campo label="CUIT / CUIL *"><input type="text" value={d.cuit} onChange={e => upd('cuit', e.target.value)} className="input" placeholder="20-12345678-9" /></Campo>
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
        <Campo label="CUIT empresa"><input type="text" value={d.cuitEmpresa} onChange={e => upd('cuitEmpresa', e.target.value)} className="input" /></Campo>
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
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DATERO PERSONA JURÍDICA</h1>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <FormHeader tipo="pj" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos del solicitante" cols={3}>
        <Campo label="CUIT *"><input type="text" value={d.cuit} onChange={e => upd('cuit', e.target.value)} className="input" placeholder="30-12345678-9" /></Campo>
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
            <Campo label="CUIL/CUIT"><input type="text" value={s.cuit} onChange={e => updSocio(i, 'cuit', e.target.value)} className="input" /></Campo>
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
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ALTA CLIENTE CORVEN</h1>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-3 text-xs text-amber-200">
        ⚠️ Toda solicitud de alta debe enviarse con un mínimo de 72 horas de anticipación a la fecha de facturación.
      </div>

      <FormHeader tipo="ac" proxNumero={proxNumero} vendedores={vendedores} vendedorId={vendedorId} setVendedorId={setVendedorId} />

      <FormSeccion titulo="Datos básicos" cols={2}>
        <Campo label="Razón social / Nombre y apellido *"><input type="text" value={d.razonSocial} onChange={e => upd('razonSocial', e.target.value)} className="input" /></Campo>
        <Campo label="CUIT / CUIL *"><input type="text" value={d.cuit} onChange={e => upd('cuit', e.target.value)} className="input" /></Campo>
        <Campo label="Domicilio legal"><input type="text" value={d.domicilioLegal} onChange={e => upd('domicilioLegal', e.target.value)} className="input" /></Campo>
        <Campo label="Localidad"><input type="text" value={d.localidad} onChange={e => upd('localidad', e.target.value)} className="input" /></Campo>
        <Campo label="Provincia"><input type="text" value={d.provincia} onChange={e => upd('provincia', e.target.value)} className="input" /></Campo>
        <Campo label="Código postal"><input type="text" value={d.cp} onChange={e => upd('cp', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><input type="text" value={d.telefono} onChange={e => upd('telefono', e.target.value)} className="input" /></Campo>
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

function FormularioProforma({ onGuardar, onCancelar, vendedores, proxNumero }) {
  const [vendedorId, setVendedorId] = useState('');
  const [moneda, setMoneda] = useState('ARS'); // 'ARS' o 'USD'
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
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PROFORMA</h1>
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
        <Campo label="CUIT / DNI"><input type="text" value={d.cuit} onChange={e => upd('cuit', e.target.value)} className="input" /></Campo>
        <Campo label="Dirección"><input type="text" value={d.direccion} onChange={e => upd('direccion', e.target.value)} className="input" /></Campo>
        <Campo label="Teléfono"><input type="text" value={d.telefono} onChange={e => upd('telefono', e.target.value)} className="input" /></Campo>
        <Campo label="Email"><input type="email" value={d.email} onChange={e => upd('email', e.target.value)} className="input" /></Campo>
      </FormSeccion>

      <FormSeccion titulo="Detalle de la operación" cols={1}>
        <Campo label="Vehículo / Producto *"><input type="text" value={d.vehiculo} onChange={e => upd('vehiculo', e.target.value)} placeholder="Ej: Foton TM1 Cab Simple 0km" className="input" /></Campo>
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
// MODAL: VER FORMULARIO + EXPORTAR PDF
// ============================================================

function ModalFormulario({ formulario, onClose }) {
  const f = formulario;
  const tipoInfo = TIPOS_FORMULARIO[f.tipo];
  const imprimir = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white text-stone-900 rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto print:max-h-none print:max-w-full print:rounded-none print:shadow-none">
        <div className="sticky top-0 bg-stone-100 border-b border-stone-200 px-5 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="text-stone-700 font-semibold text-sm">{tipoInfo.nombre} · {f.numero}</div>
          <div className="flex gap-2">
            <button onClick={imprimir} className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded text-xs font-bold flex items-center gap-1.5"><Printer size={12} /> Imprimir / PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded text-xs font-bold">Cerrar</button>
          </div>
        </div>

        <div className="p-8 print:p-10">
          {/* Encabezado */}
          <div className="flex items-start justify-between border-b-4 border-amber-500 pb-4 mb-6">
            <div>
              <div className="text-2xl font-black tracking-tight text-stone-900" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{tipoInfo.nombre.toUpperCase()}</div>
              <div className="text-xs text-stone-600 mt-1">Trenque Lauquen · Pehuajó · Buenos Aires</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Formulario</div>
              <div className="text-xl font-black text-amber-600">{f.numero}</div>
              <div className="text-xs text-stone-600 mt-1">Fecha: {formatFecha(f.fechaCreacion)}</div>
              {f.vendedor?.nombre && <div className="text-xs text-stone-600">Vendedor: {f.vendedor.nombre}</div>}
            </div>
          </div>

          {f.tipo === 'pf' && <DetalleFormPF f={f} />}
          {f.tipo === 'pj' && <DetalleFormPJ f={f} />}
          {f.tipo === 'ac' && <DetalleFormAC f={f} />}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          @page { size: A4; margin: 1cm; }
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


function InputStyle() {
  return (
    <style>{`
      /* ============================================
         SISTEMA DE TEMAS: CLARO (azul) y OSCURO
         ============================================ */

      /* TEMA CLARO (por defecto) — azul sobre blanco */
      [data-theme="claro"] {
        --bg-app: #f8fafc;
        --bg-surface: #ffffff;
        --bg-surface-2: #f1f5f9;
        --bg-surface-3: #e2e8f0;
        --border: #cbd5e1;
        --border-strong: #94a3b8;
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --accent: #2563eb;
        --accent-hover: #1d4ed8;
        --accent-text: #ffffff;
        --accent-soft: rgba(37, 99, 235, 0.08);
        --accent-soft-border: rgba(37, 99, 235, 0.3);
      }

      /* TEMA OSCURO — azul sobre fondo oscuro */
      [data-theme="oscuro"] {
        --bg-app: #0f172a;
        --bg-surface: #1e293b;
        --bg-surface-2: #0f172a;
        --bg-surface-3: #334155;
        --border: #334155;
        --border-strong: #475569;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-muted: #94a3b8;
        --accent: #60a5fa;
        --accent-hover: #3b82f6;
        --accent-text: #0f172a;
        --accent-soft: rgba(96, 165, 250, 0.1);
        --accent-soft-border: rgba(96, 165, 250, 0.3);
      }

      .app-root {
        background: var(--bg-app);
        color: var(--text-primary);
      }
      .app-header { background: var(--bg-surface); border-color: var(--border); }

      /* Overrides globales de Tailwind: mapeamos las clases viejas a las variables */
      .app-root .bg-stone-950 { background: var(--bg-app) !important; }
      .app-root .bg-stone-900 { background: var(--bg-surface) !important; }
      .app-root .bg-stone-800 { background: var(--bg-surface-2) !important; }
      .app-root [class*="bg-stone-900\\/50"], .app-root .bg-stone-900\\/50 { background: var(--bg-surface-2) !important; opacity: 1 !important; }

      .app-root .border-stone-800, .app-root .border-stone-900 { border-color: var(--border) !important; }

      .app-root .text-stone-100, .app-root .text-stone-200 { color: var(--text-primary) !important; }
      .app-root .text-stone-300, .app-root .text-stone-400 { color: var(--text-secondary) !important; }
      .app-root .text-stone-500, .app-root .text-stone-600, .app-root .text-stone-700 { color: var(--text-muted) !important; }

      /* Acento ámbar → azul */
      .app-root .text-amber-400, .app-root .text-amber-300, .app-root .text-amber-200 { color: var(--accent) !important; }
      .app-root .bg-amber-400, .app-root .bg-amber-300 { background: var(--accent) !important; color: var(--accent-text) !important; }
      .app-root .border-amber-400, .app-root .border-amber-500 { border-color: var(--accent) !important; }
      .app-root .accent-amber-400 { accent-color: var(--accent) !important; }
      .app-root [class*="bg-amber-400\\/"] { background: var(--accent-soft) !important; }
      .app-root [class*="border-amber-400\\/"] { border-color: var(--accent-soft-border) !important; }
      .app-root [class*="text-amber-400\\/"] { color: var(--accent) !important; }
      .app-root .hover\\:bg-amber-300:hover { background: var(--accent-hover) !important; color: var(--accent-text) !important; }

      /* Hovers stone */
      .app-root .hover\\:bg-stone-700:hover { background: var(--bg-surface-3) !important; }
      .app-root .hover\\:bg-stone-800:hover { background: var(--bg-surface-2) !important; }
      .app-root .hover\\:border-amber-400\\/30:hover, .app-root .hover\\:border-amber-400\\/40:hover { border-color: var(--accent-soft-border) !important; }
      .app-root .hover\\:text-stone-200:hover { color: var(--text-primary) !important; }
      .app-root .hover\\:text-amber-200:hover { color: var(--accent-hover) !important; }

      /* Botones especiales (Qué Autos / Foton / Tema en header) */
      .btn-tab {
        background: var(--bg-surface-2);
        color: var(--text-secondary);
      }
      .btn-tab:hover { background: var(--bg-surface-3); }
      .btn-active {
        background: var(--accent) !important;
        color: var(--accent-text) !important;
      }

      /* Inputs */
      .input {
        width: 100%;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        padding: 0.6rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        outline: none;
        transition: border-color 0.15s;
      }
      .input:focus { border-color: var(--accent); }
      .input::placeholder { color: var(--text-muted); }

      /* Verdes/naranjas/rojos: mantenemos pero suavizamos en claro */
      [data-theme="claro"] .text-green-400 { color: #16a34a !important; }
      [data-theme="claro"] .text-green-300 { color: #15803d !important; }
      [data-theme="claro"] .text-green-200 { color: #166534 !important; }
      [data-theme="claro"] .bg-green-950 { background: #f0fdf4 !important; }
      [data-theme="claro"] .bg-green-500 { background: #22c55e !important; }
      [data-theme="claro"] .border-green-700 { border-color: #86efac !important; }

      [data-theme="claro"] .text-orange-400 { color: #ea580c !important; }
      [data-theme="claro"] .text-red-200 { color: #b91c1c !important; }
      [data-theme="claro"] .hover\\:bg-red-900:hover { background: #fee2e2 !important; color: #b91c1c !important; }
      [data-theme="claro"] .hover\\:text-red-200:hover { color: #b91c1c !important; }

      /* Selects nativos en claro */
      [data-theme="claro"] select.input { background: white; }
      [data-theme="claro"] select.input option { background: white; color: #0f172a; }

      /* Modal de cotización: NO afectar (siempre tiene fondo blanco propio para impresión) */
      .fixed.inset-0 .bg-white { background: white !important; }
      .fixed.inset-0 .text-stone-900 { color: #0f172a !important; }
    `}</style>
  );
}

// ============================================================
// PANEL DE ACTUALIZACIÓN MENSUAL
// ============================================================

function PanelMensual({ modelosFoton, setModelosFoton, tasasFoton, setTasasFoton, bancosQA, setBancosQA, configFoton, setConfigFoton, snapshots, snapshotsAnuales = [], onCrearSnapshot, onRestaurarSnapshot, onEliminarSnapshot, onEliminarSnapshotAnual, onExportarSnapshot }) {
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
    { id: 'tasas-qa', titulo: 'Tasas Convenios Propios', desc: 'Bancos y financieras para Qué Autos (Mayo 2026)', icon: <Building2 size={18} />, color: '#0ea5e9' },
    { id: 'config', titulo: 'Configuración Foton', desc: 'Cotización dólar, quebrantos, modo de tasa', icon: <Settings size={18} />, color: '#f59e0b' },
  ];

  if (seccion === 'precios') return <SeccionPrecios modelos={modelosFoton} setModelos={setModelosFoton} onVolver={() => setSeccion('inicio')} />;
  if (seccion === 'tasas-foton') return <ConfigTasasFotonWrap tasas={tasasFoton} setTasas={setTasasFoton} onVolver={() => setSeccion('inicio')} />;
  if (seccion === 'tasas-qa') return <SeccionTasasQA bancos={bancosQA} setBancos={setBancosQA} onVolver={() => setSeccion('inicio')} />;
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

// =========== Sección: Tasas QA (lista rápida) ===========
function SeccionTasasQA({ bancos, setBancos, onVolver }) {
  const actualizar = (id, campo, valor) => setBancos(bancos.map(b => b.id === id ? { ...b, [campo]: valor } : b));
  const toggleActivo = (id) => setBancos(bancos.map(b => b.id === id ? { ...b, activo: !b.activo } : b));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-stone-100" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>TASAS CONVENIOS PROPIOS</h1>
        <button onClick={onVolver} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold">← Volver</button>
      </div>

      <div className="bg-stone-900/50 border border-stone-800 rounded p-3 text-xs text-stone-400">
        💡 Edición rápida de TNA. Para más detalles (plazos, IVA, gastos otorgamiento), usá la pestaña <span className="text-amber-400 font-semibold">Bancos y tasas</span> dentro de Qué Autos.
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-950 text-stone-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-center p-3 w-12">Activo</th>
              <th className="text-left p-3">Entidad</th>
              <th className="text-right p-3 w-32">TNA (%)</th>
              <th className="text-left p-3">Aplica</th>
            </tr>
          </thead>
          <tbody>
            {bancos.map(b => (
              <tr key={b.id} className="border-t border-stone-800">
                <td className="p-3 text-center">
                  <input type="checkbox" checked={b.activo} onChange={() => toggleActivo(b.id)} className="accent-amber-400 w-4 h-4" />
                </td>
                <td className="p-3">
                  <div className="font-bold text-stone-100">{b.nombre}</div>
                  <div className="text-xs text-stone-500">{b.tipo} · {b.moneda} · plazos: {b.plazos.join(', ')}{b.nota ? ` · ${b.nota}` : ''}</div>
                </td>
                <td className="p-2">
                  <div className="relative">
                    <input type="number" step="0.1" value={b.tna} onChange={e => actualizar(b.id, 'tna', parseFloat(e.target.value) || 0)} className="input text-right pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">%</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {(b.aplicaA || []).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-stone-800 text-stone-400 rounded">{t}</span>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-stone-500 flex items-center gap-1.5"><Save size={12} className="text-green-400" /> Cambios guardados automáticamente</div>
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
