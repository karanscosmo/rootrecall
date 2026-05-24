"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";

const TABS = [
  "Profile",
  "Workspace",
  "AI Preferences",
  "Replay Preferences",
  "Notifications",
  "Billing",
  "Security",
  "Integrations",
];

interface ProfileState {
  name: string;
  email: string;
  role: string;
  timezone: string;
}

interface WorkspaceState {
  title: string;
  defaultRepo: string;
}

interface AiPreferencesState {
  autoRemediate: boolean;
  confidenceThreshold: number;
  model: string;
}

interface ReplayPreferencesState {
  playbackSpeed: string;
  layoutGrid: string;
  enableAudio: boolean;
  autoplay: boolean;
  showK8s: boolean;
}

interface NotificationsState {
  slackAlerts: boolean;
  pagerDutyAlerts: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
}

interface SecurityState {
  accessTokenRotationDays: number;
  mfaEnabled: boolean;
}

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  created: string;
  used: string;
}

interface IntegrationItem {
  name: string;
  key: string;
  status: "connected" | "disconnected";
  icon: string;
  description: string;
  details?: Record<string, string>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form states
  const [profile, setProfile] = useState<ProfileState>({
    name: "Karan Sharma",
    email: "karan@rootrecall.ai",
    role: "SRE Lead",
    timezone: "UTC (Coordinated Universal Time)",
  });

  const [workspace, setWorkspace] = useState<WorkspaceState>({
    title: "MindMashAI Workspace",
    defaultRepo: "RootRecall/core",
  });

  const [aiPreferences, setAiPreferences] = useState<AiPreferencesState>({
    autoRemediate: false,
    confidenceThreshold: 0.85,
    model: "gemini-3.5-flash",
  });

  const [replayPreferences, setReplayPreferences] = useState<ReplayPreferencesState>({
    playbackSpeed: "1.25x",
    layoutGrid: "Standard (OpCenter)",
    enableAudio: true,
    autoplay: false,
    showK8s: true,
  });

  const [notifications, setNotifications] = useState<NotificationsState>({
    slackAlerts: true,
    pagerDutyAlerts: true,
    emailAlerts: false,
    smsAlerts: false,
  });

  const [security, setSecurity] = useState<SecurityState>({
    accessTokenRotationDays: 90,
    mfaEnabled: false,
  });

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      return process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  };

  const loadSettings = async () => {
    try {
      const token = useStore.getState().user?.accessToken;
      const res = await fetch(`${getApiBase()}/settings`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        
        // Profile
        if (data.profile) {
          setProfile((prev) => ({ ...prev, ...data.profile }));
        }
        
        // Workspace
        if (data.workspace) {
          setWorkspace((prev) => ({ ...prev, ...data.workspace }));
        }

        // AI Preferences
        if (data.ai_preferences) {
          setAiPreferences((prev) => ({ ...prev, ...data.ai_preferences }));
        }

        // Replay Preferences
        if (data.replay_preferences) {
          setReplayPreferences((prev) => ({ ...prev, ...data.replay_preferences }));
        }

        // Notifications
        if (data.notifications) {
          setNotifications((prev) => ({ ...prev, ...data.notifications }));
        }

        // Security
        if (data.security) {
          setSecurity((prev) => ({ ...prev, ...data.security }));
        }

        // API Keys list
        if (data.api_keys) {
          setApiKeys(data.api_keys);
        }

        // Integrations
        if (data.integrations) {
          const dbInteg = data.integrations;
          setIntegrations((prev) =>
            prev.map((item) => {
              const matched = dbInteg[item.key];
              if (matched) {
                return {
                  ...item,
                  status: matched.connected ? "connected" : "disconnected",
                  details: {
                    ...item.details,
                    ...matched,
                    connected: undefined, // remove connected boolean from details obj
                  },
                };
              }
              return item;
            })
          );
        }
      }
    } catch (e) {
      console.error("Failed to load settings from server", e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const triggerFeedback = (message: string) => {
    setSaveMessage(message);
    setTimeout(() => {
      setSaveMessage(null);
    }, 3000);
  };

  const handleSaveSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const token = useStore.getState().user?.accessToken;
      const res = await fetch(`${getApiBase()}/settings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        triggerFeedback(`Successfully saved ${key.replace("_", " ")}.`);
      } else {
        triggerFeedback(`Failed to save ${key.replace("_", " ")}.`);
      }
    } catch (e) {
      console.error(`Failed to save settings: ${key}`, e);
      triggerFeedback(`Error saving ${key.replace("_", " ")}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntegration = async (target: IntegrationItem) => {
    const nextStatus: "connected" | "disconnected" = target.status === "connected" ? "disconnected" : "connected";
    const updated = integrations.map((item) => {
      if (item.key === target.key) {
        return { ...item, status: nextStatus };
      }
      return item;
    });
    setIntegrations(updated);

    // Prepare integrations mapping for DB
    const integrationsObj: Record<string, any> = {};
    updated.forEach((item) => {
      integrationsObj[item.key] = {
        connected: item.status === "connected",
        ...item.details,
      };
    });

    setSaving(true);
    try {
      const token = useStore.getState().user?.accessToken;
      const res = await fetch(`${getApiBase()}/settings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          key: "integrations",
          value: integrationsObj,
        }),
      });
      if (res.ok) {
        triggerFeedback(`${target.name} integration connection updated.`);
      }
    } catch (e) {
      console.error("Failed to save integration toggled status", e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateIntegrationDetails = async (key: string, field: string, val: string) => {
    const updated = integrations.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          details: {
            ...item.details,
            [field]: val,
          },
        };
      }
      return item;
    });
    setIntegrations(updated);

    // Save automatically on edit
    const integrationsObj: Record<string, any> = {};
    updated.forEach((item) => {
      integrationsObj[item.key] = {
        connected: item.status === "connected",
        ...item.details,
      };
    });

    try {
      const token = useStore.getState().user?.accessToken;
      await fetch(`${getApiBase()}/settings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          key: "integrations",
          value: integrationsObj,
        }),
      });
    } catch (e) {
      console.error("Failed to sync updated integration details", e);
    }
  };

  const handleAddApiKey = async () => {
    const randomHex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newKeyItem: ApiKeyItem = {
      id: Math.random().toString(),
      name: `Production API Key ${apiKeys.length + 1}`,
      prefix: `rr_live_${randomHex}...`,
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      used: "Never",
    };
    const nextKeys = [...apiKeys, newKeyItem];
    setApiKeys(nextKeys);
    
    // Save to server
    await handleSaveSetting("api_keys", nextKeys);
  };

  const handleRevokeApiKey = async (id: string) => {
    const nextKeys = apiKeys.filter((k) => k.id !== id);
    setApiKeys(nextKeys);
    
    // Save to server
    await handleSaveSetting("api_keys", nextKeys);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-transparent relative">
      {/* Toast Feedback Notification Banner */}
      {saveMessage && (
        <div className="absolute top-6 right-6 z-[9999] flex items-center gap-2 bg-rr-surface border border-rr-green/30 text-rr-green font-mono text-[11px] px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(103,247,177,0.15)] animate-scale-in">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Settings Navigation Sidebar */}
      <div className="w-64 border-r border-rr-border bg-rr-surface flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rr-border">
          <Logo iconOnly size="md" className="filter drop-shadow-[0_0_6px_rgba(103,247,177,0.2)]" />
          <div className="min-w-0">
            <div className="font-semibold text-[11px] text-rr-text leading-none truncate">
              {workspace.title || "MindMashAI Workspace"}
            </div>
            <div className="font-mono text-[9px] text-rr-muted mt-1 uppercase tracking-wider">RootRecall Platform</div>
          </div>
        </div>

        <h1 className="font-semibold text-[10px] text-rr-muted uppercase tracking-wider mb-3">Settings Panel</h1>
        <div className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-left px-3 py-2 rounded-md font-mono text-[12px] transition-colors",
                activeTab === tab
                  ? "bg-rr-green/10 text-rr-green border-l-2 border-rr-green"
                  : "text-rr-muted hover:text-rr-text hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Profile Tab */}
        {activeTab === "Profile" && (
          <div className="max-w-2xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Profile Settings</h2>
              <p className="font-mono text-[12px] text-rr-muted">Manage your personal developer metadata and identity.</p>
            </div>

            <div className="flex items-center gap-6 p-4 bg-rr-surface border border-rr-border rounded-lg">
              <div className="w-16 h-16 rounded-full border border-rr-border flex items-center justify-center bg-rr-bg shrink-0 relative overflow-hidden">
                <span className="material-symbols-outlined text-rr-muted" style={{ fontSize: 24 }}>person</span>
              </div>
              <div>
                <div className="font-semibold text-[13px] text-rr-text">{profile.name}</div>
                <div className="font-mono text-[11px] text-rr-muted mt-0.5">{profile.role} • {profile.email}</div>
                <button className="mt-2 bg-rr-bg border border-rr-border text-rr-text font-mono text-[10px] px-3 py-1 rounded hover:bg-white/5 transition-colors">
                  Upload New Avatar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Organization Role</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Timezone Location</label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                >
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>America/New_York (EST)</option>
                  <option>America/Los_Angeles (PST)</option>
                  <option>Europe/London (GMT)</option>
                  <option>Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => handleSaveSetting("profile", profile)}
              disabled={saving}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile Settings"}
            </button>
          </div>
        )}

        {/* Workspace Tab */}
        {activeTab === "Workspace" && (
          <div className="max-w-2xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Workspace Settings</h2>
              <p className="font-mono text-[12px] text-rr-muted">Configure default repository pipelines and organization titles.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Workspace Title</label>
                <input
                  type="text"
                  value={workspace.title}
                  onChange={(e) => setWorkspace({ ...workspace, title: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Default Monorepo Path</label>
                <input
                  type="text"
                  value={workspace.defaultRepo}
                  onChange={(e) => setWorkspace({ ...workspace, defaultRepo: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                />
              </div>
            </div>

            <button
              onClick={() => handleSaveSetting("workspace", workspace)}
              disabled={saving}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 animate-glow"
            >
              {saving ? "Saving..." : "Save Workspace Changes"}
            </button>

            {/* Team Members mock section */}
            <div className="pt-6 border-t border-rr-border space-y-4">
              <div>
                <h3 className="font-semibold text-rr-text text-[14px]">Active Workspace Members</h3>
                <p className="font-mono text-[11px] text-rr-muted">Collaborators with access to telemetry logs.</p>
              </div>

              <div className="divide-y divide-rr-border bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
                {[
                  { name: profile.name, email: profile.email, role: "Owner" }
                ].map((member, i) => (
                  <div key={i} className="flex justify-between items-center p-3 font-mono text-[11px]">
                    <div>
                      <div className="text-rr-text font-medium">{member.name}</div>
                      <div className="text-rr-muted text-[10px]">{member.email}</div>
                    </div>
                    <span className="text-rr-green bg-rr-green/10 px-2 py-0.5 border border-rr-green/20 rounded font-semibold text-[9px] uppercase tracking-wider">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Preferences Tab */}
        {activeTab === "AI Preferences" && (
          <div className="max-w-2xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">AI Agent Preferences</h2>
              <p className="font-mono text-[12px] text-rr-muted">Fine-tune the autonomous SRE analysis engine and confidence thresholds.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[11px] text-rr-muted">RCA Confidence Threshold ({Math.round(aiPreferences.confidenceThreshold * 100)}%)</label>
                  <span className="font-mono text-[11px] text-rr-green font-bold">High Precision</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={aiPreferences.confidenceThreshold}
                  onChange={(e) => setAiPreferences({ ...aiPreferences, confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-rr-border rounded-lg appearance-none cursor-pointer accent-rr-green"
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[11px] text-rr-muted">Autonomous Model Selection</label>
                <select
                  value={aiPreferences.model}
                  onChange={(e) => setAiPreferences({ ...aiPreferences, model: e.target.value })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fastest, Alert Classification)</option>
                  <option value="gemini-3.5-pro">Gemini 3.5 Pro (Deep Multi-modal Infrastructure Analysis)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Ultra-large Context Window)</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-rr-surface border border-rr-border rounded-lg">
                  <div>
                    <h3 className="font-medium text-[13px] text-rr-text">Enable Autonomous Auto-Remediation</h3>
                    <p className="font-mono text-[11px] text-rr-muted mt-1">Allows the AI daemon to trigger GitHub hotfix PRs or rollbacks without SRE approval.</p>
                  </div>
                  <button
                    onClick={() => setAiPreferences({ ...aiPreferences, autoRemediate: !aiPreferences.autoRemediate })}
                    className={cn("w-10 h-5 rounded-full relative transition-colors shrink-0", aiPreferences.autoRemediate ? "bg-rr-green" : "bg-rr-border")}
                  >
                    <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-rr-bg transition-transform", aiPreferences.autoRemediate ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSaveSetting("ai_preferences", aiPreferences)}
              disabled={saving}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save AI Preferences"}
            </button>
          </div>
        )}

        {/* Replay Preferences Tab */}
        {activeTab === "Replay Preferences" && (
          <div className="max-w-2xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Replay & Narrator Preferences</h2>
              <p className="font-mono text-[12px] text-rr-muted">Adjust playback layouts, narration speeds, and terminal stream styles.</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] text-rr-muted">Narration Playback Speed</label>
                  <select
                    value={replayPreferences.playbackSpeed}
                    onChange={(e) => setReplayPreferences({ ...replayPreferences, playbackSpeed: e.target.value })}
                    className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                  >
                    <option value="1.0x">1.0x - Normal Speed</option>
                    <option value="1.25x">1.25x - Professional Review</option>
                    <option value="1.5x">1.5x - SRE Speedrun</option>
                    <option value="2.0x">2.0x - Turbo Analysis</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] text-rr-muted">Default Live Grid Layout</label>
                  <select
                    value={replayPreferences.layoutGrid}
                    onChange={(e) => setReplayPreferences({ ...replayPreferences, layoutGrid: e.target.value })}
                    className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                  >
                    <option value="Compact (Dev)">Compact (Dev / Minimal)</option>
                    <option value="Standard (OpCenter)">Standard (Operational Center)</option>
                    <option value="Cinematic (Big Screen)">Cinematic (Video Wall & Audits)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: "enableAudio",
                    title: "Synthesize Audio Narration",
                    desc: "Enables natural voice text-to-speech logs during incident step-by-step playback.",
                  },
                  {
                    key: "autoplay",
                    title: "Autoplay Real-time Incidents",
                    desc: "Automatically shifts focal screen viewpoint when new critical alerts are triggered.",
                  },
                  {
                    key: "showK8s",
                    title: "Render Raw Kubernetes Metadata",
                    desc: "Appends complete raw cluster payload details inside side-pane telemetry widgets.",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-rr-surface border border-rr-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-[13px] text-rr-text">{item.title}</h3>
                      <p className="font-mono text-[11px] text-rr-muted mt-1">{item.desc}</p>
                    </div>
                    <button
                      onClick={() =>
                        setReplayPreferences({
                          ...replayPreferences,
                          [item.key]: !replayPreferences[item.key as keyof ReplayPreferencesState],
                        })
                      }
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors shrink-0",
                        replayPreferences[item.key as keyof ReplayPreferencesState] ? "bg-rr-green" : "bg-rr-border"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-rr-bg transition-transform",
                          replayPreferences[item.key as keyof ReplayPreferencesState] ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSaveSetting("replay_preferences", replayPreferences)}
              disabled={saving}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Replay Preferences"}
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "Notifications" && (
          <div className="max-w-2xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Notification Preferences</h2>
              <p className="font-mono text-[12px] text-rr-muted">Set notification channels for alerts, postmortems, and system events.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  key: "slackAlerts",
                  title: "Slack Live Alert Synchronization",
                  desc: "Pipe real-time incident updates and root cause summaries to designated channels.",
                },
                {
                  key: "pagerDutyAlerts",
                  title: "PagerDuty Paging / Ringing",
                  desc: "Automatically call or page on-call SRE pools for critical level SEV-1 anomalies.",
                },
                {
                  key: "emailAlerts",
                  title: "Daily Operational Email Summaries",
                  desc: "Receive structured morning postmortem summaries and platform telemetry reports.",
                },
                {
                  key: "smsAlerts",
                  title: "Urgent SMS Messages",
                  desc: "Direct cellular warnings when connection state with clusters drops off.",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-rr-surface border border-rr-border rounded-lg">
                  <div>
                    <h3 className="font-medium text-[13px] text-rr-text">{item.title}</h3>
                    <p className="font-mono text-[11px] text-rr-muted mt-1">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        [item.key]: !notifications[item.key as keyof NotificationsState],
                      })
                    }
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors shrink-0",
                      notifications[item.key as keyof NotificationsState] ? "bg-rr-green" : "bg-rr-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-rr-bg transition-transform",
                        notifications[item.key as keyof NotificationsState] ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSaveSetting("notifications", notifications)}
              disabled={saving}
              className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notification Preferences"}
            </button>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "Billing" && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Billing & Subscription</h2>
              <p className="font-mono text-[12px] text-rr-muted">Manage plan seats, review usage limits, and view invoice history.</p>
            </div>

            {/* Premium Plan Stats Display */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-rr-surface border border-rr-border rounded-lg space-y-1">
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-wider">Current Tier</div>
                <div className="text-lg font-bold text-rr-green">Enterprise AI-Native</div>
                <div className="font-mono text-[9px] text-rr-muted">Unlimited agents & RCAs</div>
              </div>
              <div className="p-4 bg-rr-surface border border-rr-border rounded-lg space-y-1">
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-wider">Workspace Seats</div>
                <div className="text-lg font-bold text-rr-text">3 / 10 Active</div>
                <div className="font-mono text-[9px] text-rr-muted">$150 / additional user</div>
              </div>
              <div className="p-4 bg-rr-surface border border-rr-border rounded-lg space-y-1">
                <div className="font-mono text-[10px] text-rr-muted uppercase tracking-wider">Next Invoice</div>
                <div className="text-lg font-bold text-rr-text">$1,250.00</div>
                <div className="font-mono text-[9px] text-rr-muted">Scheduled for June 24, 2026</div>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="space-y-3">
              <h3 className="font-semibold text-rr-text text-[14px]">Historical Invoice Audits</h3>
              <div className="bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-[12px]">
                  <thead className="bg-rr-bg border-b border-rr-border text-rr-muted text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Invoice Number</th>
                      <th className="px-4 py-3">Billing Period</th>
                      <th className="px-4 py-3">Amount Charged</th>
                      <th className="px-4 py-3 text-right">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rr-border text-rr-text">
                    {[
                      { inv: "INV-2026-0043", date: "May 24, 2026", amount: "$1,250.00", status: "Paid" },
                      { inv: "INV-2026-0021", date: "Apr 24, 2026", amount: "$1,250.00", status: "Paid" },
                      { inv: "INV-2026-0010", date: "Mar 24, 2026", amount: "$1,250.00", status: "Paid" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-rr-green">{row.inv}</td>
                        <td className="px-4 py-3 text-rr-muted">{row.date}</td>
                        <td className="px-4 py-3">{row.amount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[10px] text-rr-green bg-rr-green/10 border border-rr-green/20 px-2 py-0.5 rounded">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "Security" && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Security & Access Management</h2>
              <p className="font-mono text-[12px] text-rr-muted">Rotate keys, configure multi-factor auth, and view access audit trails.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-rr-surface border border-rr-border rounded-lg">
                <div>
                  <h3 className="font-medium text-[13px] text-rr-text">Force MFA Authentication</h3>
                  <p className="font-mono text-[11px] text-rr-muted mt-1">Requires all team members to authenticate using an OTP code or authenticator.</p>
                </div>
                <button
                  onClick={() => setSecurity({ ...security, mfaEnabled: !security.mfaEnabled })}
                  className={cn("w-10 h-5 rounded-full relative transition-colors shrink-0", security.mfaEnabled ? "bg-rr-green" : "bg-rr-border")}
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-rr-bg transition-transform", security.mfaEnabled ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-rr-muted">Access Token Expiry (Days)</label>
                <select
                  value={security.accessTokenRotationDays}
                  onChange={(e) => setSecurity({ ...security, accessTokenRotationDays: parseInt(e.target.value) })}
                  className="w-full bg-rr-surface border border-rr-border rounded-md px-3 py-2 font-mono text-[12px] text-rr-text focus:outline-none focus:border-rr-green"
                >
                  <option value={30}>30 Days (Recommended)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                </select>
              </div>

              <button
                onClick={() => handleSaveSetting("security", security)}
                disabled={saving}
                className="bg-rr-green text-rr-bg font-mono text-[12px] font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Security Rules"}
              </button>
            </div>

            {/* API Keys visual list inside Security */}
            <div className="pt-6 border-t border-rr-border space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-rr-text text-[14px]">Programmatic API Credentials</h3>
                  <p className="font-mono text-[11px] text-rr-muted">Secret keys for pushing external custom metrics / traces to backend pipelines.</p>
                </div>
                <button
                  onClick={handleAddApiKey}
                  className="bg-rr-surface border border-rr-border text-rr-text font-mono text-[11px] px-3 py-2 rounded-md hover:bg-white/5 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>Generate Key</span>
                </button>
              </div>

              <div className="bg-rr-surface border border-rr-border rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-[12px]">
                  <thead className="bg-rr-bg border-b border-rr-border text-rr-muted text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Label Name</th>
                      <th className="px-4 py-3">Key Token Prefix</th>
                      <th className="px-4 py-3">Generated At</th>
                      <th className="px-4 py-3">Last Active</th>
                      <th className="px-4 py-3 text-right">Revocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rr-border text-rr-text">
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-rr-muted">
                          No API Keys generated.
                        </td>
                      </tr>
                    ) : (
                      apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">{key.name}</td>
                          <td className="px-4 py-3 text-rr-muted">{key.prefix}</td>
                          <td className="px-4 py-3 text-rr-muted">{key.created}</td>
                          <td className="px-4 py-3 text-rr-muted">{key.used}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRevokeApiKey(key.id)}
                              className="text-rr-error hover:underline text-[11px]"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "Integrations" && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold text-rr-text mb-1">Integrations & Pipelines</h2>
              <p className="font-mono text-[12px] text-rr-muted">Link external platforms to build self-healing operational loops.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {integrations.map((integ) => (
                <div
                  key={integ.key}
                  className="flex flex-col p-4 bg-rr-surface border border-rr-border rounded-lg gap-3 justify-between"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-rr-bg border border-rr-border flex items-center justify-center shrink-0 logo-glow-hover">
                      <span className="material-symbols-outlined text-rr-green" style={{ fontSize: 20 }}>
                        {integ.icon}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[13px] text-rr-text leading-none">{integ.name}</h3>
                        {integ.status === "connected" ? (
                          <span className="text-[9px] font-mono text-rr-green bg-rr-green/10 border border-rr-green/20 px-2 py-0.5 rounded leading-none">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-rr-muted bg-rr-bg border border-rr-border px-2 py-0.5 rounded leading-none">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-rr-muted leading-relaxed">{integ.description}</p>
                    </div>
                  </div>

                  {/* Connected settings fields nested inside cards */}
                  {integ.status === "connected" && integ.details && (
                    <div className="mt-2 bg-rr-bg p-3 rounded-md border border-rr-border space-y-2">
                      <div className="font-mono text-[9px] text-rr-muted uppercase tracking-widest">
                        Connection Metadata Config
                      </div>
                      {Object.keys(integ.details).map((field) => (
                        <div key={field} className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-rr-muted capitalize">{field}:</span>
                          <input
                            type="text"
                            value={integ.details![field] || ""}
                            onChange={(e) =>
                              handleUpdateIntegrationDetails(integ.key, field, e.target.value)
                            }
                            className="bg-rr-surface border border-rr-border rounded px-2 py-0.5 font-mono text-[10px] text-rr-text focus:outline-none focus:border-rr-green flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleToggleIntegration(integ)}
                      className={cn(
                        "font-mono text-[11px] px-3 py-1.5 rounded-md transition-colors font-bold",
                        integ.status === "connected"
                          ? "text-rr-error hover:bg-rr-error/10 border border-rr-error/20"
                          : "bg-rr-green text-rr-bg hover:opacity-90"
                      )}
                    >
                      {integ.status === "connected" ? "Disconnect Channel" : "Connect Platform"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
