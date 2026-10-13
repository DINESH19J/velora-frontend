import { useCallback, useEffect, useState } from "react";
import "./AdminDashboard.css";

const API_URL = "http://localhost:8080";
const EMPTY_FORM = {
    name: "",
    brand: "",
    pricePerDay: "",
    vehicleType: "Sedan",
    imageUrl: "",
    available: true,
};

function money(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard({ onBack, onVehiclesChanged }) {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const loadVehicles = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_URL}/api/vehicles`, {
                method: "GET",
                credentials: "include",
            });
            if (!response.ok) throw new Error(`Could not load vehicles (HTTP ${response.status}).`);
            const data = await response.json();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Could not connect to the vehicle API.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVehicles();
    }, [loadVehicles]);

    function updateField(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function startEdit(vehicle) {
        setEditingId(vehicle.id);
        setForm({
            name: vehicle.name || "",
            brand: vehicle.brand || "",
            pricePerDay: String(vehicle.pricePerDay ?? ""),
            vehicleType: vehicle.vehicleType || "Sedan",
            imageUrl: vehicle.imageUrl || "",
            available: Boolean(vehicle.available),
        });
        setError("");
        setNotice(`Editing ${vehicle.name}.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetForm() {
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function submitVehicle(event) {
        event.preventDefault();
        setError("");
        setNotice("");

        const price = Number(form.pricePerDay);
        if (!form.name.trim() || !form.brand.trim() || !form.vehicleType.trim()) {
            setError("Please fill in the vehicle name, brand, and type.");
            return;
        }
        if (!Number.isFinite(price) || price <= 0) {
            setError("Enter a daily rental price greater than zero.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            brand: form.brand.trim(),
            pricePerDay: price,
            vehicleType: form.vehicleType,
            imageUrl: form.imageUrl.trim(),
            available: form.available,
        };

        setSaving(true);
        try {
            const isEditing = editingId !== null;
            const response = await fetch(
                isEditing ? `${API_URL}/api/vehicles/${editingId}` : `${API_URL}/api/vehicles`,
                {
                    method: isEditing ? "PUT" : "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Admin authorization failed. Sign in again with an ADMIN account.");
                }
                const detail = await response.text();
                throw new Error(detail || `Could not save vehicle (HTTP ${response.status}).`);
            }
            setNotice(isEditing ? "Vehicle updated successfully." : "Vehicle added successfully.");
            resetForm();
            await loadVehicles();
            onVehiclesChanged?.();
        } catch (err) {
            setError(err.message || "Could not save vehicle.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteVehicle(vehicle) {
        if (!window.confirm(`Delete ${vehicle.name}? This cannot be undone.`)) return;
        setError("");
        setNotice("");
        try {
            const response = await fetch(`${API_URL}/api/vehicles/${vehicle.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Admin authorization failed. Sign in again with an ADMIN account.");
                }
                throw new Error(`Could not delete vehicle (HTTP ${response.status}).`);
            }
            if (editingId === vehicle.id) resetForm();
            setNotice(`${vehicle.name} was deleted.`);
            await loadVehicles();
            onVehiclesChanged?.();
        } catch (err) {
            setError(err.message || "Could not delete vehicle.");
        }
    }

    return (
        <main className="admin-shell">
            <header className="admin-topbar">
                <a className="admin-brand" href="#admin" onClick={(event) => event.preventDefault()}>
                    <span className="admin-brand-mark">V</span>
                    <span><strong>VELORA</strong><small>ADMIN CONSOLE</small></span>
                </a>
                <button className="admin-secondary-button" type="button" onClick={onBack}>← Back to website</button>
            </header>

            <section className="admin-content">
                <div className="admin-heading-row">
                    <div>
                        <p className="admin-eyebrow">CONTROL CENTER / INVENTORY</p>
                        <h1>Vehicle management</h1>
                        <p className="admin-subtitle">Add vehicles to your fleet, update listings, and control availability.</p>
                    </div>
                    <div className="admin-stat"><span>FLEET SIZE</span><strong>{vehicles.length.toString().padStart(2, "0")}</strong></div>
                </div>

                {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
                {notice && <div className="admin-alert admin-alert-success" role="status">{notice}</div>}

                <div className="admin-layout">
                    <section className="admin-panel">
                        <div className="admin-panel-heading">
                            <div><p className="admin-eyebrow">{editingId === null ? "NEW LISTING" : `EDIT VEHICLE #${editingId}`}</p><h2>{editingId === null ? "Add a vehicle" : "Update vehicle"}</h2></div>
                            {editingId !== null && <button className="admin-text-button" type="button" onClick={resetForm}>Cancel edit</button>}
                        </div>
                        <form className="admin-form" onSubmit={submitVehicle}>
                            <label>Vehicle name<input name="name" value={form.name} onChange={updateField} placeholder="e.g. Honda City" required /></label>
                            <label>Brand<input name="brand" value={form.brand} onChange={updateField} placeholder="e.g. Honda" required /></label>
                            <div className="admin-form-grid">
                                <label>Price per day (₹)<input name="pricePerDay" type="number" min="1" step="0.01" value={form.pricePerDay} onChange={updateField} placeholder="2500" required /></label>
                                <label>Vehicle type<select name="vehicleType" value={form.vehicleType} onChange={updateField}><option>Sedan</option><option>SUV</option><option>Hatchback</option><option>Sports</option><option>Electric</option><option>Luxury</option><option>Other</option></select></label>
                            </div>
                            <label>Image URL<input name="imageUrl" type="url" value={form.imageUrl} onChange={updateField} placeholder="https://example.com/car.jpg" /></label>
                            <label className="admin-checkbox-label"><input name="available" type="checkbox" checked={form.available} onChange={updateField} /> Available for booking</label>
                            <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : editingId === null ? "+ Add vehicle" : "Save changes"}</button>
                        </form>
                    </section>

                    <section className="admin-panel admin-inventory-panel">
                        <div className="admin-panel-heading"><div><p className="admin-eyebrow">DATABASE INVENTORY</p><h2>Current vehicles</h2></div><button className="admin-secondary-button" type="button" onClick={loadVehicles} disabled={loading}>{loading ? "Loading..." : "↻ Refresh"}</button></div>
                        {loading ? <p className="admin-empty">Loading inventory…</p> : vehicles.length === 0 ? <p className="admin-empty">No vehicles found. Add your first vehicle using the form.</p> : (
                            <div className="admin-vehicle-list">
                                {vehicles.map((vehicle) => (
                                    <article className="admin-vehicle-row" key={vehicle.id}>
                                        <img src={vehicle.imageUrl || "https://placehold.co/160x100?text=VELORA"} alt={vehicle.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "https://placehold.co/160x100?text=VELORA"; }} />
                                        <div className="admin-vehicle-details"><strong>{vehicle.name}</strong><span>{vehicle.brand} · {vehicle.vehicleType || "Other"}</span><b>{money(vehicle.pricePerDay)} <small>/ day</small></b><span className={vehicle.available ? "admin-availability available" : "admin-availability unavailable"}>{vehicle.available ? "Available" : "Unavailable"}</span></div>
                                        <div className="admin-row-actions"><button type="button" className="admin-secondary-button" onClick={() => startEdit(vehicle)}>Edit</button><button type="button" className="admin-delete-button" onClick={() => deleteVehicle(vehicle)}>Delete</button></div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
                <p className="admin-footnote">Changes are saved through the Spring Boot API and your connected PostgreSQL database. Only an authenticated ADMIN can create, update, or delete listings.</p>
            </section>
        </main>
    );
}
