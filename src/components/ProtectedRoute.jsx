import React from "react";

export default function ProtectedRoute({ session, children }) {
  // Si no hay sesión activa en Supabase, no dibuja el panel de la granja
  if (!session) {
    return null;
  }

  // Si hay sesión, permite ver el contenido normal
  return children;
}