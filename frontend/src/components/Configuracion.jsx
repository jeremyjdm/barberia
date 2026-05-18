import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Save, Upload, Download, UploadCloud, Store, MapPin, Phone, Image as ImageIcon, Keyboard, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import PageTransition from "./PageTransition";

const BASE = 'http://localhost:3000';

export default function Configuracion() {
  const toast = useToast();
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const logoInputRef = useRef(null);
  const restoreInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/configuracion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNombre(data.nombre_barberia || "");
        setDireccion(data.direccion || "");
        setTelefono(data.telefono || "");
        setLogoUrl(data.logo_url || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/configuracion`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_barberia: nombre, direccion, telefono }),
      });
      if (res.ok) {
        toast("Configuración guardada", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Error al guardar", "error");
      }
    } catch (error) {
      toast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`${BASE}/api/configuracion/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.logo_url);
        toast("Logo actualizado", "success");
      } else {
        toast(data.error || "Error al subir logo", "error");
      }
    } catch (error) {
      toast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportDB = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/api/admin/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al crear copia de seguridad");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_barberia_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast("Copia de seguridad descargada", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setExporting(false);
    }
  };

  const handleImportDB = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast("Debes seleccionar un archivo .zip", "error");
      return;
    }
    setImporting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("backup", file);
      const res = await fetch(`${BASE}/api/admin/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast("Base de datos restaurada correctamente", "success");
        fetchSettings();
      } else {
        toast(data.error || "Error al restaurar", "error");
      }
    } catch (error) {
      toast("Error de conexión", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <PageTransition>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Configuración</h2>
        <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
          Personaliza la información de tu barbería
        </p>
      </div>

      <div className="bento-grid">
        <div className="bento-card bento-col-6" style={{ gap: "1.25rem" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Store size={18} /> Información de la Barbería
          </h3>

          <div>
            <label className="label-sm">Nombre de la Barbería</label>
            <div style={{ position: "relative" }}>
              <Store size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Barbería El Clásico"
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div>
            <label className="label-sm">Dirección</label>
            <div style={{ position: "relative" }}>
              <MapPin size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input className="input-field" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Calle Principal #123, Col. Centro"
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div>
            <label className="label-sm">Teléfono</label>
            <div style={{ position: "relative" }}>
              <Phone size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input className="input-field" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 555-0123"
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <label className="label-sm">Logo de la Barbería</label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <div style={{
                width: "80px", height: "80px", borderRadius: "14px",
                border: "2px dashed var(--border-color)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
                background: "var(--bg-color)",
              }}>
                {logoPreview || logoUrl ? (
                  <img src={logoPreview || `${BASE}${logoUrl}`} alt="Logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <ImageIcon size={28} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                )}
              </div>
              <div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange}
                  style={{ display: "none" }}
                />
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)",
                    background: "transparent", color: "var(--text-main)", fontWeight: 600, fontSize: "0.85rem",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                  }}
                >
                  <Upload size={14} /> Subir Logo
                </motion.button>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                  PNG o JPG. Máx 2MB.
                </p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none",
              background: saving ? "var(--border-color)" : "linear-gradient(135deg, #6f4e37, #8a6344)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              boxShadow: saving ? "none" : "0 4px 14px rgba(111,78,55,0.3)",
              marginTop: "0.5rem",
            }}
          >
            <Save size={18} />
            {saving ? "Guardando..." : "Guardar Configuración"}
          </motion.button>
        </div>

        <div className="bento-card bento-col-6" style={{ gap: "1.25rem", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Download size={18} /> Copia de Seguridad
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Descarga un respaldo completo de tu base de datos en formato ZIP con todas las tablas en CSV.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportDB}
              disabled={exporting}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none",
                background: exporting ? "var(--border-color)" : "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                cursor: exporting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                boxShadow: exporting ? "none" : "0 4px 14px rgba(22,163,74,0.3)",
              }}
            >
              <Download size={18} />
              {exporting ? "Generando..." : "Descargar Copia de Seguridad"}
            </motion.button>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UploadCloud size={18} /> Restaurar Base de Datos
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Sube un archivo ZIP previamente descargado para restaurar los datos. Esto reemplazará todos los datos actuales.
            </p>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip"
              onChange={handleImportDB}
              style={{ display: "none" }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => restoreInputRef.current?.click()}
              disabled={importing}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "10px", border: "2px dashed var(--accent-primary)",
                background: "transparent", color: "var(--accent-primary)", fontWeight: 700, fontSize: "0.95rem",
                cursor: importing ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                opacity: importing ? 0.5 : 1,
              }}
            >
              <UploadCloud size={18} />
              {importing ? "Restaurando..." : "Seleccionar archivo ZIP y restaurar"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="bento-grid" style={{ marginTop: "1rem" }}>
        <div className="bento-col-12">
          <div className="bento-card">
            <div
              onClick={() => setShowShortcuts(s => !s)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <Keyboard size={18} /> Atajos de Teclado
              </h3>
              <motion.div
                animate={{ rotate: showShortcuts ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {showShortcuts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </motion.div>
            </div>
            {showShortcuts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
                style={{ marginTop: "1rem", overflow: "hidden" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {[
                    { keys: ["Ctrl", "N"], desc: "Nueva cita" },
                    { keys: ["Ctrl", "R"], desc: "Actualizar agenda" },
                    { keys: ["Esc"], desc: "Cerrar ventana / modal" },
                    { keys: ["Shift", "?"], desc: "Mostrar/ocultar atajos" },
                  ].map((s, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.6rem 0.75rem", borderRadius: "8px",
                      background: "rgba(111,78,55,0.06)",
                    }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{s.desc}</span>
                      <span className="shortcut-key">
                        {s.keys.map((k, j) => (
                          <span key={j}>{j > 0 && <span> + </span>}<span>{k}</span></span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{
                  fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem",
                  fontStyle: "italic",
                }}>
                  Los atajos funcionan en la pantalla de Gestión de Citas.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
