import React, { useState } from "react";
import {
  X,
  User,
  ShieldCheck,
  Globe2,
  Bell,
  Key,
  Compass,
  MapPin,
  Check,
  LogOut,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveStoredProfile,
  type AuthProvider,
  type OperatorRole,
  type UserProfile,
} from "@/types/userProfile";
import { MAP_LAYERS, type MapLayer } from "@/types/agroSpace";
import { ThemeSettingsCard } from "@/components/theme/ThemeSwitcher";

export interface UserProfileModalProps {
  profile: UserProfile;
  currentLat: number;
  currentLon: number;
  onSave: (updatedProfile: UserProfile) => void;
  onSignOut: () => void;
  onClose: () => void;
  onNavigateHome?: (lat: number, lon: number, label: string) => void;
}

const AVATAR_COLORS = [
  { name: "Cyan", hex: "#00F0FF" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Violet", hex: "#A855F7" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Blue", hex: "#3B82F6" },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  profile,
  currentLat,
  currentLon,
  onSave,
  onSignOut,
  onClose,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "mission" | "notifications" | "security">(
    "profile",
  );

  // Editable Profile States
  const [fullName, setFullName] = useState(profile.fullName);
  const [callsign, setCallsign] = useState(profile.callsign);
  const [role, setRole] = useState<OperatorRole>(profile.role);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || "#00F0FF");

  // Editable Preferences States
  const [homeBaseName, setHomeBaseName] = useState(profile.preferences.homeBaseName);
  const [homeLat, setHomeLat] = useState(profile.preferences.homeCoords.lat);
  const [homeLon, setHomeLon] = useState(profile.preferences.homeCoords.lon);
  const [defaultViewMode, setDefaultViewMode] = useState(profile.preferences.defaultViewMode);
  const [defaultActiveLayer, setDefaultActiveLayer] = useState(
    profile.preferences.defaultActiveLayer,
  );
  const [units, setUnits] = useState(profile.preferences.units);

  // Notification States
  const [cycloneAlerts, setCycloneAlerts] = useState(profile.notifications.cycloneAlerts);
  const [usgsQuakeAlerts, setUsgsQuakeAlerts] = useState(profile.notifications.usgsQuakeAlerts);
  const [droughtAlerts, setDroughtAlerts] = useState(profile.notifications.droughtAlerts);
  const [emailAlerts, setEmailAlerts] = useState(profile.notifications.emailAlerts);

  // Security & API Keys
  const [nasaApiKey, setNasaApiKey] = useState(profile.apiKeys?.nasaApiKey || "");

  const handleUseCurrentCoords = () => {
    setHomeLat(Number(currentLat.toFixed(4)));
    setHomeLon(Number(currentLon.toFixed(4)));
    toast.info("Coordinates Locked", {
      description: `Home coordinates set to current position: [${currentLat.toFixed(4)}°, ${currentLon.toFixed(4)}°]`,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      fullName: fullName.trim() || profile.fullName,
      callsign: callsign.trim() || profile.callsign,
      role,
      avatarColor,
      preferences: {
        homeBaseName: homeBaseName.trim() || "Kolar Plateau, Karnataka",
        homeCoords: {
          lat: Number(homeLat),
          lon: Number(homeLon),
        },
        defaultViewMode,
        defaultActiveLayer,
        units,
      },
      notifications: {
        cycloneAlerts,
        usgsQuakeAlerts,
        droughtAlerts,
        emailAlerts,
      },
      apiKeys: {
        nasaApiKey: nasaApiKey.trim(),
      },
    };

    saveStoredProfile(updated);
    onSave(updated);
    toast.success("Profile Updated", {
      description: "Mission preferences and operator credentials saved successfully.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070c18]/95 text-white shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-2xl">
        {/* Glowing Top Frame Accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-xl font-mono text-lg font-black text-slate-950 shadow-md"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}, #ffffff)`,
                boxShadow: `0 0 16px ${avatarColor}66`,
              }}
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{fullName}</h2>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  {role}
                </span>
                <span className="flex items-center gap-1 rounded bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  <ShieldCheck className="size-3 text-cyan-400" /> GMAIL VERIFIED
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{profile.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile Settings"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-6 bg-black/30">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="size-3.5" />
            <span>Profile Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mission")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "mission"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Mission Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "notifications"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="size-3.5" />
            <span>Hazard Alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="size-3.5" />
            <span>API & Session</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSaveProfile}>
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-5">
            {/* ---------------- TAB 1: PROFILE IDENTITY ---------------- */}
            {activeTab === "profile" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Operator Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Callsign / Title
                    </label>
                    <input
                      type="text"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      placeholder="e.g. Orbital Commander"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Operational Role Clearance
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as OperatorRole)}
                      className="w-full rounded-xl border border-white/12 bg-[#0c1424] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="COMMANDER">COMMANDER (Full Flight Clearance)</option>
                      <option value="OPERATOR">OPERATOR (Telemetry & Drone Fleet)</option>
                      <option value="AGRONOMIST">AGRONOMIST (Soil & Crop Analysis)</option>
                      <option value="RESEARCHER">RESEARCHER (NASA GIBS Remote Sensing)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Authentication Provider
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 font-mono text-sm text-slate-200">
                      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                      <span>{profile.provider}</span>
                      <span className="ml-auto text-[10px] text-emerald-400 font-bold">ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Avatar Color Theme */}
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Operator HUD Aura Color
                  </label>
                  <div className="flex items-center gap-3">
                    {AVATAR_COLORS.map((col) => {
                      const isSelected = avatarColor.toLowerCase() === col.hex.toLowerCase();
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => setAvatarColor(col.hex)}
                          className={`group relative flex size-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                              : "border-white/20 hover:scale-105"
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        >
                          {isSelected && <Check className="size-4 text-slate-950 font-black" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- TAB 2: MISSION PREFERENCES ---------------- */}
            {activeTab === "mission" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Default Home Base Name
                    </label>
                    {onNavigateHome && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateHome(homeLat, homeLon, homeBaseName);
                          toast.success("Navigating to Home Base", {
                            description: `Camera centering on ${homeBaseName}`,
                          });
                          onClose();
                        }}
                        className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-200 cursor-pointer"
                      >
                        <MapPin className="size-3" /> Fly to Base
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={homeBaseName}
                    onChange={(e) => setHomeBaseName(e.target.value)}
                    placeholder="e.g. Kolar Plateau, Karnataka"
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:bg-white/[0.08] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Base Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={homeLat}
                      onChange={(e) => setHomeLat(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Base Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={homeLon}
                      onChange={(e) => setHomeLon(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentCoords}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                >
                  <MapPin className="size-3.5 text-cyan-400" />
                  <span>
                    Lock Current GPS Position as Home Base [{currentLat.toFixed(4)}°,{" "}
                    {currentLon.toFixed(4)}°]
                  </span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Default View Mode
                    </label>
                    <select
                      value={defaultViewMode}
                      onChange={(e) => setDefaultViewMode(e.target.value as "3d" | "2d")}
                      className="w-full rounded-xl border border-white/12 bg-[#0c1424] px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="3d">3D Orbital Globe</option>
                      <option value="2d">2D Satellite Map</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Default NASA Layer
                    </label>
                    <select
                      value={defaultActiveLayer}
                      onChange={(e) => setDefaultActiveLayer(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-[#0c1424] px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {MAP_LAYERS.map((layer) => (
                        <option key={layer} value={layer}>
                          {layer}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Telemetry Units
                    </label>
                    <select
                      value={units}
                      onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
                      className="w-full rounded-xl border border-white/12 bg-[#0c1424] px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="metric">Metric (°C / km / mm)</option>
                      <option value="imperial">Imperial (°F / mi / in)</option>
                    </select>
                  </div>
                </div>

                {/* Display & Theme Appearance */}
                <div className="pt-4 border-t border-white/10">
                  <ThemeSettingsCard />
                </div>
              </div>
            )}

            {/* ---------------- TAB 3: HAZARD ALERTS & NOTIFICATIONS ---------------- */}
            {activeTab === "notifications" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  Configure orbital telemetry alert broadcasts and threshold monitoring.
                </p>

                {/* Cyclone Alert Toggle */}
                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <span>🌀</span> Severe Cyclone Track Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Notify immediately when an active EONET tropical storm vector is within 300
                      km.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={cycloneAlerts}
                    onChange={(e) => setCycloneAlerts(e.target.checked)}
                    className="size-4 accent-cyan-400 cursor-pointer"
                  />
                </label>

                {/* USGS Quake Toggle */}
                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span>⚡</span> USGS Seismic Epicenter Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Alert on seismic events above M2.0 detected within the agricultural grid
                      basin.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={usgsQuakeAlerts}
                    onChange={(e) => setUsgsQuakeAlerts(e.target.checked)}
                    className="size-4 accent-cyan-400 cursor-pointer"
                  />
                </label>

                {/* Drought Alert Toggle */}
                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <span>☀️</span> Severe Crop Drought & Water Stress
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Broadcast warning when ECOSTRESS Evaporative Stress Index exceeds 0.80 ratio.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={droughtAlerts}
                    onChange={(e) => setDroughtAlerts(e.target.checked)}
                    className="size-4 accent-cyan-400 cursor-pointer"
                  />
                </label>

                {/* Email Dispatch Toggle */}
                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                      <span>✉️</span> Emergency Email Dispatch
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Forward critical agricultural hazard alerts to {profile.email}.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="size-4 accent-cyan-400 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* ---------------- TAB 4: API KEYS & SECURITY ---------------- */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Custom NASA Earthdata API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={nasaApiKey}
                    onChange={(e) => setNasaApiKey(e.target.value)}
                    placeholder="Enter NASA CMR / GIBS token for extended rate limits"
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Leave blank to use default public NASA GIBS & POWER community endpoints.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="font-mono text-xs font-semibold text-slate-300">
                    Session Security Information
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>
                      Operator ID: <span className="font-mono text-cyan-400">{profile.id}</span>
                    </div>
                    <div>
                      Verified On:{" "}
                      <span className="font-mono text-slate-300">
                        {new Date(profile.verifiedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      Encryption:{" "}
                      <span className="font-mono text-emerald-400">
                        AES-256 GCM (Client-Side Storage)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sign Out Action */}
                <div className="pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="size-4 text-rose-400" />
                    <span>Sign Out & Terminate Clearance</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-black/40">
            <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="size-3 text-cyan-400" />
              <span>Real-time local state synchronization active</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2 font-mono text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 font-mono text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Save className="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
