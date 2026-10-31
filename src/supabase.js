// supabase.js – Cliente de Supabase y gestor de URLs de almacenamiento (Storage)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Bucket creado en Supabase Storage
export const DEFAULT_BUCKET = 'imagenes';
export const DEFAULT_FOLDER = 'habitacion_1';

/**
 * Obtiene la URL pública de un recurso alojado en Supabase Storage.
 * Si el path es relativo (ej. 'piso.jpg', 'ventana.jpg', 'cuadros/pizarra.jpg'),
 * lo resuelve dentro de 'imagenes/habitacion_1/...'.
 * @param {string} path - Ruta relativa dentro de la habitación o URL completa
 * @param {string} bucket - Nombre del bucket ('imagenes')
 * @returns {string} URL pública de Supabase Storage
 */
export function getStorageUrl(path, bucket = DEFAULT_BUCKET) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (!supabase) return path;

  // Normalizar: quitar '/img/' o '/' inicial si viene con formato local
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (cleanPath.startsWith('img/')) {
    cleanPath = cleanPath.slice(4);
  }
  if (cleanPath.startsWith('music/')) {
    cleanPath = 'mp3/' + cleanPath.slice(6);
  }

  // Anteponer la carpeta 'habitacion_1' si no la incluye
  if (!cleanPath.startsWith(DEFAULT_FOLDER + '/') && cleanPath !== DEFAULT_FOLDER) {
    cleanPath = `${DEFAULT_FOLDER}/${cleanPath}`;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  return data?.publicUrl || path;
}
