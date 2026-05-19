export interface StorageInfo {
  totalBytes: number;
  projectCount: number;
}

export interface AppSettingsData {
  aiModel: string;
}

export interface GhCliStatus {
  connected: boolean;
  login?: string;
}

export interface UpdateStatus {
  checking: boolean;
  updateAvailable?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  publisher: string;
  context: string;
  tier: "Free" | "Pro";
  description: string;
}

export const AI_MODELS: ModelInfo[] = [
  { id: "gpt-4o", name: "GPT-4o", publisher: "OpenAI", context: "128K", tier: "Free", description: "Advanced multimodal model for text and image tasks." },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", publisher: "OpenAI", context: "128K", tier: "Free", description: "Fast and affordable multimodal for diverse tasks." },
  { id: "gpt-4.1", name: "GPT-4.1", publisher: "OpenAI", context: "1M", tier: "Pro", description: "Top coding, instruction following, and long-context understanding." },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", publisher: "OpenAI", context: "1M", tier: "Pro", description: "Fast and efficient for everyday tasks." },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Fast and capable. Great for everyday coding and creative tasks." },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Balanced performance with exceptional coding and nuance." },
  { id: "claude-opus-4.6", name: "Claude Opus 4.6", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Most capable Claude. Deep reasoning and complex tasks." },
  { id: "claude-opus-4.7", name: "Claude Opus 4.7", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Latest Opus with improved reasoning capabilities." },
  { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", publisher: "Anthropic", context: "200K", tier: "Pro", description: "Fastest Claude model. Low latency responses." },
  { id: "gpt-5.4", name: "GPT-5.4", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Latest GPT model with advanced reasoning." },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Efficient next-gen model for most tasks." },
  { id: "gpt-5.2", name: "GPT-5.2", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Strong general-purpose model with reasoning." },
  { id: "gpt-5-mini", name: "GPT-5 Mini", publisher: "OpenAI", context: "200K", tier: "Pro", description: "Lightweight reasoning model." },
];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = (bytes / Math.pow(1024, unitIndex)).toFixed(1);
  return `${parseFloat(value)} ${units[unitIndex]}`;
}

export function getModelGroups(): [string, ModelInfo[]][] {
  const groups = AI_MODELS.reduce<Record<string, ModelInfo[]>>((acc, model) => {
    (acc[model.publisher] ||= []).push(model);
    return acc;
  }, {});
  return Object.entries(groups);
}

export function getGhCliStatusText(status: GhCliStatus | null): string {
  if (status === null) return "Checking...";
  if (status.connected) return `Connected as ${status.login}`;
  return "Not connected";
}

export function getGhCliTooltipText(status: GhCliStatus | null): string {
  if (status?.connected) return "Connected via gh CLI. You have access to Pro models (Claude, GPT-4.1, GPT-5).";
  return 'Install the GitHub CLI (gh) and run "gh auth login" in your terminal to unlock Pro models like Claude and GPT-5.';
}

export function getUpdateMessage(status: UpdateStatus): string {
  if (status.checking) return "Checking for updates...";
  if (status.updateAvailable) return `A new version (v${status.latestVersion}) is available!`;
  if (status.latestVersion) return "You're on the latest version.";
  return "Check if a newer version is available.";
}

export function getTierClassName(tier: ModelInfo["tier"]): string {
  if (tier === "Free") return "bg-green-400/10 text-green-400";
  return "bg-violet-400/10 text-violet-400";
}
