"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  GTMLaunch,
  ChannelId,
  ChannelStrategies,
  CHANNEL_CONFIG,
  RetentionStrategy,
  CreativeStrategy,
  PaidMediaStrategy,
  OrganicSocialStrategy,
  InfluencerStrategy,
  EcomStrategy,
  PRAffiliateStrategy,
  RetailStrategy,
  RetentionEmailItem,
  RetentionSMSItem,
  CreativeConcept,
  OrganicPostItem,
  EMAIL_TYPES,
  SMS_TYPES,
  HOOK_FORMULAS,
} from "@/types/gtm";

// Channel order for display
const CHANNEL_ORDER: ChannelId[] = [
  "retention",
  "creative",
  "paid-media",
  "organic-social",
  "influencer",
  "ecom",
  "pr-affiliate",
  "retail",
];

export default function StrategyPage() {
  const params = useParams();
  const router = useRouter();
  const launchId = params.launchId as string;

  const [launch, setLaunch] = useState<GTMLaunch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDeliverables, setIsGeneratingDeliverables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Channel selection
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([
    "retention",
    "creative",
  ]);

  // Generated strategies
  const [strategies, setStrategies] = useState<ChannelStrategies>({});
  const [activeTab, setActiveTab] = useState<ChannelId>("retention");

  // Check if any strategy exists
  const hasAnyStrategy = Object.keys(strategies).length > 0;

  // Migrate old channel IDs to new ones
  const migrateChannelIds = (channels: string[]): ChannelId[] => {
    const migrationMap: Record<string, ChannelId> = {
      'email': 'retention',
      'sms': 'retention',
      'paid-social': 'creative',
      'web': 'ecom',
      'pr': 'pr-affiliate',
    };

    const migrated = channels.map(ch => migrationMap[ch] || ch as ChannelId);
    // Remove duplicates (e.g., if both email and sms were selected, they both become retention)
    return [...new Set(migrated)] as ChannelId[];
  };

  useEffect(() => {
    fetchLaunch();
  }, [launchId]);

  const fetchLaunch = async () => {
    try {
      const response = await fetch("/api/gtm/launches");
      const launches = await response.json();
      const found = launches.find((l: GTMLaunch) => l.id === launchId);
      if (found) {
        setLaunch(found);
        if (found.selectedChannels) {
          // Migrate old channel IDs to new ones
          const migratedChannels = migrateChannelIds(found.selectedChannels);
          setSelectedChannels(migratedChannels);
        }
        if (found.channelStrategies) {
          setStrategies(found.channelStrategies);
          // Set active tab to first channel with strategy
          const firstChannel = CHANNEL_ORDER.find(
            (ch) => found.channelStrategies[channelIdToKey(ch)]
          );
          if (firstChannel) setActiveTab(firstChannel);
        }
      }
    } catch (error) {
      console.error("Error fetching launch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert channel ID to strategy key
  const channelIdToKey = (channelId: ChannelId): keyof ChannelStrategies => {
    const map: Record<ChannelId, keyof ChannelStrategies> = {
      retention: "retention",
      creative: "creative",
      "paid-media": "paidMedia",
      "organic-social": "organicSocial",
      influencer: "influencer",
      ecom: "ecom",
      "pr-affiliate": "prAffiliate",
      retail: "retail",
    };
    return map[channelId];
  };

  const toggleChannel = (channelId: ChannelId) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const generateStrategies = async () => {
    if (selectedChannels.length === 0) {
      alert("Please select at least one channel");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/gtm/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId,
          channels: selectedChannels,
          pmc: launch?.pmc,
          creativeBrief: launch?.creativeBrief,
          tier: launch?.tier,
          productName: launch?.product || launch?.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate strategies");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const newStrategies = data.channelStrategies;
      setStrategies(newStrategies);

      // Set active tab to first generated channel
      const firstChannel = CHANNEL_ORDER.find(
        (ch) => newStrategies[channelIdToKey(ch)]
      );
      if (firstChannel) setActiveTab(firstChannel);

      // Save to launch
      await saveLaunch({
        selectedChannels,
        channelStrategies: newStrategies,
        status: "strategy-review",
      });
    } catch (error) {
      console.error("Error generating strategies:", error);
      alert("Failed to generate strategies. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveLaunch = async (updates: Partial<GTMLaunch>) => {
    if (!launch) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/gtm/launches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...launch,
          ...updates,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setLaunch(updated);
      }
    } catch (error) {
      console.error("Error saving launch:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const approveAndContinue = async () => {
    if (!hasAnyStrategy) {
      alert("Please generate strategies first");
      return;
    }

    setIsGeneratingDeliverables(true);

    try {
      // Mark all strategies as approved
      const approvedStrategies = { ...strategies };
      Object.keys(approvedStrategies).forEach((key) => {
        const strategy = approvedStrategies[key as keyof ChannelStrategies];
        if (strategy) {
          (strategy as { status: string }).status = "approved";
        }
      });

      // Save the approved strategies first
      await saveLaunch({
        selectedChannels,
        channelStrategies: approvedStrategies,
        status: "generating",
      });

      // Generate deliverables immediately
      const deliverablesResponse = await fetch("/api/gtm/generate-deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launchId,
          tier: launch?.tier,
          pmc: launch?.pmc,
          creativeBrief: launch?.creativeBrief,
          channelStrategies: approvedStrategies,
          selectedChannels,
          productName: launch?.product || launch?.name,
        }),
      });

      if (!deliverablesResponse.ok) {
        throw new Error("Failed to generate deliverables");
      }

      const { channelDeliverables } = await deliverablesResponse.json();

      // Save the deliverables and mark as complete
      await saveLaunch({
        channelDeliverables,
        status: "complete",
      });

      // Navigate to deliverables page
      router.push(`/gtm/${launchId}/deliverables`);
    } catch (error) {
      console.error("Error generating deliverables:", error);
      alert("Error generating deliverables. Please try again.");
    } finally {
      setIsGeneratingDeliverables(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="loading-shimmer w-8 h-8 rounded-full"></div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-[var(--foreground)]">Launch not found</h1>
          <Link
            href="/gtm"
            className="text-[var(--accent)] hover:underline mt-2 block cursor-pointer"
          >
            Back to launches
          </Link>
        </div>
      </div>
    );
  }

  if (!launch.pmc || !launch.creativeBrief) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl text-[var(--foreground)]">
            Brief not complete
          </h1>
          <p className="text-[var(--muted)] mt-2">
            Please complete the creative brief first.
          </p>
          <Link
            href={`/gtm/${launchId}/brief`}
            className="text-[var(--accent)] hover:underline mt-4 block cursor-pointer"
          >
            Go to Brief
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/gtm"
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                ← GTM Workflow
              </Link>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--foreground)] font-medium">
                {launch.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                {launch.tier.replace("tier-", "Tier ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/gtm/${launchId}/brief`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs">
                  ✓
                </span>
                <span className="hidden sm:inline">Brief</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/strategy`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  2
                </span>
                <span className="hidden sm:inline">Strategy</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/deliverables`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  hasAnyStrategy
                    ? "bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)]"
                    : "bg-[var(--input-bg)] text-[var(--muted)] cursor-not-allowed opacity-50"
                }`}
                onClick={(e) => !hasAnyStrategy && e.preventDefault()}
              >
                <span className="w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs">
                  3
                </span>
                <span className="hidden sm:inline">Deliverables</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
            Step 2: Integrated Marketing Plans
          </h1>
          <p className="text-[var(--muted)]">
            Select channels and generate strategic plans. Each channel gets a plan showing deliverables to be created. After approval, briefs will be generated.
          </p>
        </div>

        {/* Channel Selection */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Select Channels
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CHANNEL_ORDER.map((channelId) => {
              const config = CHANNEL_CONFIG[channelId];
              const isSelected = selectedChannels.includes(channelId);
              return (
                <button
                  key={channelId}
                  onClick={() => toggleChannel(channelId)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-[var(--foreground)] text-sm">
                      {config.name}
                    </span>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : "border-[var(--card-border)]"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--muted)]">
              {selectedChannels.length} channel
              {selectedChannels.length !== 1 ? "s" : ""} selected
            </p>
            <button
              onClick={generateStrategies}
              disabled={isGenerating || selectedChannels.length === 0}
              className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  {hasAnyStrategy ? "Regenerate Plans" : "Generate Plans"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Strategy Output */}
        {hasAnyStrategy && (
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg">
            {/* Tabs */}
            <div className="border-b border-[var(--card-border)] overflow-x-auto">
              <div className="flex">
                {CHANNEL_ORDER.filter(
                  (ch) => strategies[channelIdToKey(ch)]
                ).map((channelId) => {
                  const config = CHANNEL_CONFIG[channelId];
                  const isActive = activeTab === channelId;
                  return (
                    <button
                      key={channelId}
                      onClick={() => setActiveTab(channelId)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                        isActive
                          ? "border-[var(--accent)] text-[var(--accent)]"
                          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {config.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategy Content */}
            <div className="p-6">
              {activeTab === "retention" && strategies.retention && (
                <RetentionStrategyView
                  strategy={strategies.retention}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, retention: updated })
                  }
                />
              )}
              {activeTab === "creative" && strategies.creative && (
                <CreativeStrategyView
                  strategy={strategies.creative}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, creative: updated })
                  }
                />
              )}
              {activeTab === "paid-media" && strategies.paidMedia && (
                <PaidMediaStrategyView
                  strategy={strategies.paidMedia}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, paidMedia: updated })
                  }
                />
              )}
              {activeTab === "organic-social" && strategies.organicSocial && (
                <OrganicSocialStrategyView
                  strategy={strategies.organicSocial}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, organicSocial: updated })
                  }
                />
              )}
              {activeTab === "influencer" && strategies.influencer && (
                <InfluencerStrategyView
                  strategy={strategies.influencer}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, influencer: updated })
                  }
                />
              )}
              {activeTab === "ecom" && strategies.ecom && (
                <EcomStrategyView
                  strategy={strategies.ecom}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, ecom: updated })
                  }
                />
              )}
              {activeTab === "pr-affiliate" && strategies.prAffiliate && (
                <PRAffiliateStrategyView
                  strategy={strategies.prAffiliate}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, prAffiliate: updated })
                  }
                />
              )}
              {activeTab === "retail" && strategies.retail && (
                <RetailStrategyView
                  strategy={strategies.retail}
                  onUpdate={(updated) =>
                    setStrategies({ ...strategies, retail: updated })
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        {hasAnyStrategy && (
          <div className="flex items-center justify-between mt-6">
            <Link
              href={`/gtm/${launchId}/brief`}
              className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer"
            >
              ← Back to Brief
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  saveLaunch({
                    selectedChannels,
                    channelStrategies: strategies,
                  })
                }
                disabled={isSaving}
                className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={approveAndContinue}
                disabled={isGeneratingDeliverables}
                className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isGeneratingDeliverables ? (
                  <>
                    <span className="loading-shimmer w-4 h-4 rounded-full"></span>
                    Generating Copy Briefs...
                  </>
                ) : (
                  <>
                    Approve & Generate Copy
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// RETENTION STRATEGY VIEW (Calendar Timeline)
// ============================================
function RetentionStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: RetentionStrategy;
  onUpdate: (s: RetentionStrategy) => void;
}) {
  const addEmailItem = () => {
    const newItem: RetentionEmailItem = {
      id: `email-${Date.now()}`,
      type: "launch",
      name: "New Email",
      timing: "Launch Day",
      audience: "all",
      description: "",
    };
    onUpdate({ ...strategy, emailItems: [...strategy.emailItems, newItem] });
  };

  const addSmsItem = () => {
    const newItem: RetentionSMSItem = {
      id: `sms-${Date.now()}`,
      type: "launch",
      name: "New SMS",
      timing: "Launch Day",
      description: "",
    };
    onUpdate({ ...strategy, smsItems: [...strategy.smsItems, newItem] });
  };

  const updateEmailItem = (index: number, updates: Partial<RetentionEmailItem>) => {
    const newItems = [...strategy.emailItems];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...strategy, emailItems: newItems });
  };

  const updateSmsItem = (index: number, updates: Partial<RetentionSMSItem>) => {
    const newItems = [...strategy.smsItems];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...strategy, smsItems: newItems });
  };

  const deleteEmailItem = (index: number) => {
    const newItems = strategy.emailItems.filter((_, i) => i !== index);
    onUpdate({ ...strategy, emailItems: newItems });
  };

  const deleteSmsItem = (index: number) => {
    const newItems = strategy.smsItems.filter((_, i) => i !== index);
    onUpdate({ ...strategy, smsItems: newItems });
  };

  // Timing options for the calendar - more granular
  const timingOptions = [
    "D-14", "D-10", "D-7", "D-5", "D-3", "D-2", "D-1",
    "Launch Day",
    "D+1", "D+2", "D+3", "D+5", "D+7", "D+10", "D+14", "D+21"
  ];

  // Group items by timing for calendar view
  const timingOrder = timingOptions.reduce((acc, t, i) => ({ ...acc, [t]: i }), {} as Record<string, number>);
  const sortedEmails = [...strategy.emailItems].sort((a, b) =>
    (timingOrder[a.timing] ?? 99) - (timingOrder[b.timing] ?? 99)
  );
  const sortedSms = [...strategy.smsItems].sort((a, b) =>
    (timingOrder[a.timing] ?? 99) - (timingOrder[b.timing] ?? 99)
  );

  // Get email type info
  const getEmailTypeInfo = (typeId: string) => {
    return EMAIL_TYPES.find(t => t.id === typeId) || { id: typeId, name: typeId, description: '' };
  };

  return (
    <div className="space-y-8">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-3">
          Retention Strategy Overview
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={4}
          placeholder="Describe the overall retention strategy approach, key messaging themes, and goals for this campaign..."
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[120px]"
        />
      </div>

      {/* Email Calendar Timeline */}
      <div className="bg-[var(--input-bg)]/30 rounded-xl p-6 border border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Email Schedule
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              {strategy.emailItems.length} email{strategy.emailItems.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <button
            onClick={addEmailItem}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Email
          </button>
        </div>

        {/* Timeline View */}
        <div className="space-y-4">
          {sortedEmails.map((item, index) => {
            const typeInfo = getEmailTypeInfo(item.type);
            const originalIndex = strategy.emailItems.findIndex(e => e.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--accent)]/50 transition-colors"
              >
                {/* Header row with timing badge and delete */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <select
                      value={item.timing}
                      onChange={(e) => updateEmailItem(originalIndex, { timing: e.target.value })}
                      className="px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg text-sm font-semibold cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      {timingOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={item.audience}
                      onChange={(e) => updateEmailItem(originalIndex, { audience: e.target.value as RetentionEmailItem["audience"] })}
                      className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="all">All Subscribers</option>
                      <option value="prospects">Prospects Only</option>
                      <option value="repeat">Repeat Customers</option>
                      <option value="vip">VIP / Roadies</option>
                    </select>
                  </div>
                  <button
                    onClick={() => deleteEmailItem(originalIndex)}
                    className="p-2 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete email"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Name and Type */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                        Email Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateEmailItem(originalIndex, { name: e.target.value })}
                        placeholder="e.g., Launch Day Announcement"
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                        Email Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => updateEmailItem(originalIndex, { type: e.target.value as RetentionEmailItem["type"] })}
                        className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                      >
                        {EMAIL_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[var(--muted)] mt-2 italic">
                        {typeInfo.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Description */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      Purpose / Notes
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateEmailItem(originalIndex, { description: e.target.value })}
                      placeholder="Describe the goal of this email, key messaging points, or special considerations..."
                      rows={5}
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {strategy.emailItems.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No emails scheduled yet</p>
              <p className="text-xs mt-1">Click &quot;Add Email&quot; to start building your email calendar</p>
            </div>
          )}
        </div>
      </div>

      {/* SMS Calendar Timeline */}
      <div className="bg-[var(--input-bg)]/30 rounded-xl p-6 border border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              SMS Schedule
            </h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              {strategy.smsItems.length} SMS message{strategy.smsItems.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <button
            onClick={addSmsItem}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add SMS
          </button>
        </div>

        <div className="space-y-4">
          {sortedSms.map((item, index) => {
            const originalIndex = strategy.smsItems.findIndex(s => s.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 hover:border-[var(--accent)]/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <select
                      value={item.timing}
                      onChange={(e) => updateSmsItem(originalIndex, { timing: e.target.value })}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-lg text-sm font-semibold cursor-pointer focus:outline-none focus:border-emerald-500"
                    >
                      {timingOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={item.type}
                      onChange={(e) => updateSmsItem(originalIndex, { type: e.target.value as RetentionSMSItem["type"] })}
                      className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--foreground)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    >
                      {SMS_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => deleteSmsItem(originalIndex)}
                    className="p-2 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete SMS"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      SMS Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateSmsItem(originalIndex, { name: e.target.value })}
                      placeholder="e.g., Launch Day SMS"
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
                      Purpose / Notes
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateSmsItem(originalIndex, { description: e.target.value })}
                      placeholder="Key message or hook for this SMS..."
                      className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {strategy.smsItems.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-sm">No SMS messages scheduled yet</p>
              <p className="text-xs mt-1">Click &quot;Add SMS&quot; to add text messages to your campaign</p>
            </div>
          )}
        </div>
      </div>

      {/* Other Retention Elements */}
      <div className="space-y-4">
        {/* Direct Mail - Full Width */}
        <div className={`p-6 border rounded-xl transition-all ${
          strategy.directMail?.enabled
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--card-border)] bg-[var(--card)]"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-lg font-semibold text-[var(--foreground)]">Direct Mail</span>
              <p className="text-sm text-[var(--muted)] mt-1">Physical mailer sent to customers</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.directMail?.enabled || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    directMail: { ...(strategy.directMail || { description: "" }), enabled: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          {strategy.directMail?.enabled && (
            <textarea
              value={strategy.directMail.description}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  directMail: { ...(strategy.directMail || { enabled: true }), description: e.target.value },
                })
              }
              placeholder="Describe the direct mail piece - format, content, target audience, timing..."
              rows={4}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[100px]"
            />
          )}
        </div>

        {/* Popup - Full Width */}
        <div className={`p-6 border rounded-xl transition-all ${
          strategy.popup?.enabled
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-[var(--card-border)] bg-[var(--card)]"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-lg font-semibold text-[var(--foreground)]">Pop-up</span>
              <p className="text-sm text-[var(--muted)] mt-1">Site popup for email/SMS capture or promo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.popup?.enabled || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    popup: { ...(strategy.popup || { description: "" }), enabled: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
          {strategy.popup?.enabled && (
            <textarea
              value={strategy.popup.description}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  popup: { ...(strategy.popup || { enabled: true }), description: e.target.value },
                })
              }
              placeholder="Describe the popup - offer, messaging, timing, targeting rules..."
              rows={4}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] leading-relaxed focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-vertical min-h-[100px]"
            />
          )}
        </div>

        {/* Flows - Full Width */}
        <div className="p-6 border border-[var(--card-border)] rounded-xl bg-[var(--card)]">
          <div className="mb-4">
            <span className="text-lg font-semibold text-[var(--foreground)]">Email Flows</span>
            <p className="text-sm text-[var(--muted)] mt-1">Automated email sequences</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex items-start gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
              strategy.flows?.dedicatedFlow
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
            }`}>
              <input
                type="checkbox"
                checked={strategy.flows?.dedicatedFlow || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    flows: { ...(strategy.flows || { universalFooter: false }), dedicatedFlow: e.target.checked },
                  })
                }
                className="w-6 h-6 mt-0.5 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-base font-medium text-[var(--foreground)]">Dedicated Flow</span>
                <p className="text-sm text-[var(--muted)] mt-1">Create a new automated flow specifically for this launch (welcome series, post-purchase, etc.)</p>
              </div>
            </label>
            <label className={`flex items-start gap-4 cursor-pointer p-4 rounded-xl border transition-all ${
              strategy.flows?.universalFooter
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
            }`}>
              <input
                type="checkbox"
                checked={strategy.flows?.universalFooter || false}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    flows: { ...(strategy.flows || { dedicatedFlow: false }), universalFooter: e.target.checked },
                  })
                }
                className="w-6 h-6 mt-0.5 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <div>
                <span className="text-base font-medium text-[var(--foreground)]">Universal Footer</span>
                <p className="text-sm text-[var(--muted)] mt-1">Add product mention to footer of all existing flows during campaign period</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATIVE STRATEGY VIEW (Concept List)
// ============================================
function CreativeStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: CreativeStrategy;
  onUpdate: (s: CreativeStrategy) => void;
}) {
  const addConcept = () => {
    const newConcept: CreativeConcept = {
      id: `concept-${Date.now()}`,
      name: "New Concept",
      hookFormula: "direct-benefit",
      angle: "",
      targetPersona: "",
      formats: ["static", "video"],
    };
    onUpdate({ ...strategy, concepts: [...strategy.concepts, newConcept] });
  };

  const updateConcept = (index: number, updates: Partial<CreativeConcept>) => {
    const newConcepts = [...strategy.concepts];
    newConcepts[index] = { ...newConcepts[index], ...updates };
    onUpdate({ ...strategy, concepts: newConcepts });
  };

  const deleteConcept = (index: number) => {
    const newConcepts = strategy.concepts.filter((_, i) => i !== index);
    onUpdate({ ...strategy, concepts: newConcepts });
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Visual Direction */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Visual Direction
        </label>
        <textarea
          value={strategy.visualDirection}
          onChange={(e) => onUpdate({ ...strategy, visualDirection: e.target.value })}
          rows={2}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Format Mix */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Format Mix (%)
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Static</label>
            <input
              type="number"
              value={strategy.formatMix.static}
              onChange={(e) =>
                onUpdate({ ...strategy, formatMix: { ...strategy.formatMix, static: parseInt(e.target.value) || 0 } })
              }
              className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Video</label>
            <input
              type="number"
              value={strategy.formatMix.video}
              onChange={(e) =>
                onUpdate({ ...strategy, formatMix: { ...strategy.formatMix, video: parseInt(e.target.value) || 0 } })
              }
              className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Carousel</label>
            <input
              type="number"
              value={strategy.formatMix.carousel}
              onChange={(e) =>
                onUpdate({ ...strategy, formatMix: { ...strategy.formatMix, carousel: parseInt(e.target.value) || 0 } })
              }
              className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
            />
          </div>
        </div>
      </div>

      {/* Concepts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Creative Concepts ({strategy.concepts.length})
          </label>
          <button
            onClick={addConcept}
            className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
          >
            + Add Concept
          </button>
        </div>
        <div className="space-y-4">
          {strategy.concepts.map((concept, index) => (
            <div
              key={concept.id}
              className="p-4 border border-[var(--card-border)] rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={concept.name}
                  onChange={(e) => updateConcept(index, { name: e.target.value })}
                  className="font-medium text-[var(--foreground)] bg-transparent border-none focus:outline-none text-lg"
                />
                <button
                  onClick={() => deleteConcept(index)}
                  className="p-1 text-red-400 hover:bg-red-400/10 rounded cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Hook Formula</label>
                  <select
                    value={concept.hookFormula}
                    onChange={(e) => updateConcept(index, { hookFormula: e.target.value as CreativeConcept["hookFormula"] })}
                    className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                  >
                    {HOOK_FORMULAS.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">Target Persona</label>
                  <input
                    type="text"
                    value={concept.targetPersona || ""}
                    onChange={(e) => updateConcept(index, { targetPersona: e.target.value })}
                    className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--muted)] mb-1">Formats</label>
                  <div className="flex gap-2">
                    {(["static", "video", "carousel"] as const).map((format) => (
                      <label key={format} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={concept.formats.includes(format)}
                          onChange={(e) => {
                            const newFormats = e.target.checked
                              ? [...concept.formats, format]
                              : concept.formats.filter((f) => f !== format);
                            updateConcept(index, { formats: newFormats });
                          }}
                          className="rounded border-[var(--card-border)]"
                        />
                        <span className="text-xs text-[var(--foreground)] capitalize">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Angle</label>
                <textarea
                  value={concept.angle}
                  onChange={(e) => updateConcept(index, { angle: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] resize-vertical"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAID MEDIA STRATEGY VIEW (Channel Cards)
// ============================================
function PaidMediaStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: PaidMediaStrategy;
  onUpdate: (s: PaidMediaStrategy) => void;
}) {
  const updateChannel = (index: number, updates: Partial<PaidMediaStrategy["channels"][0]>) => {
    const newChannels = [...strategy.channels];
    newChannels[index] = { ...newChannels[index], ...updates };
    onUpdate({ ...strategy, channels: newChannels });
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Campaign Type */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Campaign Type
        </label>
        <select
          value={strategy.campaignType}
          onChange={(e) => onUpdate({ ...strategy, campaignType: e.target.value as PaidMediaStrategy["campaignType"] })}
          className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)]"
        >
          <option value="net-new">Net New Purchase Campaign</option>
          <option value="bau-adsets">BAU Campaign Ad Sets</option>
          <option value="creative-testing">Creative Testing</option>
          <option value="none">No Paid Media</option>
        </select>
      </div>

      {/* Channel Cards */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Channel Allocation
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {strategy.channels.map((channel, index) => (
            <div
              key={channel.id}
              className={`p-4 border rounded-lg transition-all ${
                channel.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)] opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--foreground)] capitalize">{channel.name}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(e) => updateChannel(index, { enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
              {channel.enabled && (
                <>
                  <div className="mb-2">
                    <label className="block text-xs text-[var(--muted)] mb-1">Budget %</label>
                    <input
                      type="number"
                      value={channel.budgetPercent || 0}
                      onChange={(e) => updateChannel(index, { budgetPercent: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Notes</label>
                    <input
                      type="text"
                      value={channel.notes || ""}
                      onChange={(e) => updateChannel(index, { notes: e.target.value })}
                      className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-xs text-[var(--foreground)]"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Key Metrics
        </label>
        <div className="flex flex-wrap gap-2">
          {strategy.keyMetrics.map((metric, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
            >
              {metric}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ORGANIC SOCIAL STRATEGY VIEW (Calendar)
// ============================================
function OrganicSocialStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: OrganicSocialStrategy;
  onUpdate: (s: OrganicSocialStrategy) => void;
}) {
  const timingOptions = ["D-7", "D-5", "D-3", "D-1", "Launch Day", "D+1", "D+3", "D+5", "D+7", "D+10", "D+14"];

  const addPost = (platform: "instagram" | "tiktok" | "youtube") => {
    const newPost: OrganicPostItem = {
      id: `${platform}-${Date.now()}`,
      format: platform === "youtube" ? "short" : "reel",
      timing: "Launch Day",
      concept: "",
    };
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = (strategy[key] as OrganicPostItem[]) || [];
    onUpdate({ ...strategy, [key]: [...currentPosts, newPost] });
  };

  const updatePost = (platform: "instagram" | "tiktok" | "youtube", index: number, updates: Partial<OrganicPostItem>) => {
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = [...((strategy[key] as OrganicPostItem[]) || [])];
    currentPosts[index] = { ...currentPosts[index], ...updates };
    onUpdate({ ...strategy, [key]: currentPosts });
  };

  const deletePost = (platform: "instagram" | "tiktok" | "youtube", index: number) => {
    const key = `${platform}Posts` as keyof OrganicSocialStrategy;
    const currentPosts = ((strategy[key] as OrganicPostItem[]) || []).filter((_, i) => i !== index);
    onUpdate({ ...strategy, [key]: currentPosts });
  };

  const renderPostSection = (platform: "instagram" | "tiktok" | "youtube", posts: OrganicPostItem[], formatOptions: string[]) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-[var(--foreground)] capitalize">
          {platform} ({posts.length} posts)
        </label>
        <button
          onClick={() => addPost(platform)}
          className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
        >
          + Add Post
        </button>
      </div>
      <div className="space-y-2">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="p-3 border border-[var(--card-border)] rounded-lg bg-[var(--input-bg)]/50 flex gap-3 items-center"
          >
            <select
              value={post.timing}
              onChange={(e) => updatePost(platform, index, { timing: e.target.value })}
              className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] w-28"
            >
              {timingOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={post.format}
              onChange={(e) => updatePost(platform, index, { format: e.target.value as OrganicPostItem["format"] })}
              className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] w-24"
            >
              {formatOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              type="text"
              value={post.concept}
              onChange={(e) => updatePost(platform, index, { concept: e.target.value })}
              placeholder="Concept..."
              className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
            />
            <button
              onClick={() => deletePost(platform, index)}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Platform Posts */}
      {renderPostSection("instagram", strategy.instagramPosts || [], ["feed", "story", "reel"])}
      {renderPostSection("tiktok", strategy.tiktokPosts || [], ["reel"])}
      {renderPostSection("youtube", strategy.youtubePosts || [], ["short", "long-form"])}

      {/* Creator Content */}
      {strategy.creatorContent && (
        <div className="p-4 border border-[var(--card-border)] rounded-lg">
          <h4 className="font-medium text-[var(--foreground)] mb-3">Creator Content</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Outsourced Deliverables</label>
              <input
                type="number"
                value={strategy.creatorContent.deliverables}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    creatorContent: { ...strategy.creatorContent!, deliverables: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">Collab Posts</label>
              <input
                type="number"
                value={strategy.creatorContent.collabPosts}
                onChange={(e) =>
                  onUpdate({
                    ...strategy,
                    creatorContent: { ...strategy.creatorContent!, collabPosts: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INFLUENCER STRATEGY VIEW
// ============================================
function InfluencerStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: InfluencerStrategy;
  onUpdate: (s: InfluencerStrategy) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            ${(strategy.sponsoredBudget || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--muted)]">Sponsored Budget</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            ${(strategy.paidContentBudget || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--muted)]">Paid Content Budget</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {strategy.expectedAds || 0}
          </p>
          <p className="text-xs text-[var(--muted)]">Expected Ads</p>
        </div>
        <div className="p-4 bg-[var(--input-bg)] rounded-lg text-center">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {strategy.seedingCount.min}-{strategy.seedingCount.max}
          </p>
          <p className="text-xs text-[var(--muted)]">Seeding</p>
        </div>
      </div>

      {/* Creator Tiers */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Creator Tiers
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.micro}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, micro: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Micro</p>
          </div>
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.mid}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, mid: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Mid-Tier</p>
          </div>
          <div className="p-4 border border-[var(--card-border)] rounded-lg text-center">
            <input
              type="number"
              value={strategy.creatorTiers.macro}
              onChange={(e) =>
                onUpdate({
                  ...strategy,
                  creatorTiers: { ...strategy.creatorTiers, macro: parseInt(e.target.value) || 0 },
                })
              }
              className="w-full text-center text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none"
            />
            <p className="text-xs text-[var(--muted)]">Macro</p>
          </div>
        </div>
      </div>

      {/* Content Types */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Content Types
        </label>
        <div className="flex flex-wrap gap-2">
          {strategy.contentTypes.map((type, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-sm"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Brief Points */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Key Brief Points
        </label>
        <ul className="space-y-1">
          {strategy.briefPoints.map((point, i) => (
            <li key={i} className="text-sm text-[var(--foreground)]">
              • {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================
// ECOM STRATEGY VIEW (Checklist)
// ============================================
function EcomStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: EcomStrategy;
  onUpdate: (s: EcomStrategy) => void;
}) {
  const togglePlacement = (index: number) => {
    const newPlacements = [...strategy.placements];
    newPlacements[index] = { ...newPlacements[index], enabled: !newPlacements[index].enabled };
    onUpdate({ ...strategy, placements: newPlacements });
  };

  const updatePlacementNotes = (index: number, notes: string) => {
    const newPlacements = [...strategy.placements];
    newPlacements[index] = { ...newPlacements[index], notes };
    onUpdate({ ...strategy, placements: newPlacements });
  };

  const formatPlacementType = (type: string) => {
    return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Placement Checklist */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Site Placements
        </label>
        <div className="space-y-2">
          {strategy.placements.map((placement, index) => (
            <div
              key={placement.id}
              className={`p-3 border rounded-lg flex items-center gap-3 ${
                placement.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="checkbox"
                checked={placement.enabled}
                onChange={() => togglePlacement(index)}
                className="w-5 h-5 rounded border-[var(--card-border)] cursor-pointer"
              />
              <span className={`font-medium min-w-[180px] ${placement.enabled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {formatPlacementType(placement.type)}
              </span>
              {placement.enabled && (
                <input
                  type="text"
                  value={placement.notes || ""}
                  onChange={(e) => updatePlacementNotes(index, e.target.value)}
                  placeholder="Notes..."
                  className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Landing Pages */}
      {strategy.landingPages && (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
            Landing Pages
          </label>
          <div className="flex flex-wrap gap-3">
            {(["listicle", "trojanHorse", "custom"] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strategy.landingPages?.[type] || false}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      landingPages: { ...strategy.landingPages!, [type]: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded border-[var(--card-border)]"
                />
                <span className="text-[var(--foreground)] capitalize">
                  {type === "trojanHorse" ? "Trojan Horse" : type}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PR & AFFILIATE STRATEGY VIEW
// ============================================
function PRAffiliateStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: PRAffiliateStrategy;
  onUpdate: (s: PRAffiliateStrategy) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* PR Section */}
      <div className="border-b border-[var(--card-border)] pb-6">
        <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
          PR
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              PR Angle
            </label>
            <textarea
              value={strategy.prAngle}
              onChange={(e) => onUpdate({ ...strategy, prAngle: e.target.value })}
              rows={2}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Long Lead Features: {strategy.longLeadFeatures.count}
              </label>
              <div className="flex flex-wrap gap-2">
                {strategy.longLeadFeatures.targets.map((target, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Product Placements: {strategy.productPlacements.count}
              </label>
              <div className="flex flex-wrap gap-2">
                {strategy.productPlacements.targets.map((target, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[var(--input-bg)] rounded-full text-sm text-[var(--foreground)]"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.awards}
                onChange={(e) => onUpdate({ ...strategy, awards: e.target.checked })}
                className="rounded border-[var(--card-border)]"
              />
              <span className="text-sm text-[var(--foreground)]">Pursue Awards</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strategy.earlyAccess}
                onChange={(e) => onUpdate({ ...strategy, earlyAccess: e.target.checked })}
                className="rounded border-[var(--card-border)]"
              />
              <span className="text-sm text-[var(--foreground)]">Early Access</span>
            </label>
          </div>
        </div>
      </div>

      {/* Affiliate Section */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">
          Affiliate
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Affiliate Approach
            </label>
            <textarea
              value={strategy.affiliateApproach}
              onChange={(e) => onUpdate({ ...strategy, affiliateApproach: e.target.value })}
              rows={2}
              className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
            />
          </div>

          {strategy.commissionIncrease && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strategy.commissionIncrease.enabled}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      commissionIncrease: { ...strategy.commissionIncrease!, enabled: e.target.checked },
                    })
                  }
                  className="rounded border-[var(--card-border)]"
                />
                <span className="text-sm text-[var(--foreground)]">Commission Increase</span>
              </label>
              {strategy.commissionIncrease.enabled && (
                <input
                  type="text"
                  value={strategy.commissionIncrease.duration || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...strategy,
                      commissionIncrease: { ...strategy.commissionIncrease!, duration: e.target.value },
                    })
                  }
                  placeholder="Duration (e.g., 2 weeks)"
                  className="p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// RETAIL STRATEGY VIEW (Checklist)
// ============================================
function RetailStrategyView({
  strategy,
  onUpdate,
}: {
  strategy: RetailStrategy;
  onUpdate: (s: RetailStrategy) => void;
}) {
  const toggleActivation = (index: number) => {
    const newActivations = [...strategy.activations];
    newActivations[index] = { ...newActivations[index], enabled: !newActivations[index].enabled };
    onUpdate({ ...strategy, activations: newActivations });
  };

  const updateActivationNotes = (index: number, notes: string) => {
    const newActivations = [...strategy.activations];
    newActivations[index] = { ...newActivations[index], notes };
    onUpdate({ ...strategy, activations: newActivations });
  };

  const formatActivationType = (type: string) => {
    return type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Strategic Summary */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Strategic Summary
        </label>
        <textarea
          value={strategy.strategicSummary}
          onChange={(e) => onUpdate({ ...strategy, strategicSummary: e.target.value })}
          rows={3}
          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
        />
      </div>

      {/* Activation Checklist */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
          Retail Activations
        </label>
        <div className="space-y-2">
          {strategy.activations.map((activation, index) => (
            <div
              key={activation.id}
              className={`p-3 border rounded-lg flex items-center gap-3 ${
                activation.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="checkbox"
                checked={activation.enabled}
                onChange={() => toggleActivation(index)}
                className="w-5 h-5 rounded border-[var(--card-border)] cursor-pointer"
              />
              <span className={`font-medium min-w-[180px] ${activation.enabled ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {formatActivationType(activation.type)}
              </span>
              {activation.enabled && (
                <input
                  type="text"
                  value={activation.notes || ""}
                  onChange={(e) => updateActivationNotes(index, e.target.value)}
                  placeholder="Notes..."
                  className="flex-1 p-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
