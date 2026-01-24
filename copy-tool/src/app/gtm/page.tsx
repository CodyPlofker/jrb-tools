"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GTMLaunch, LaunchTier, TIER_CONFIG } from "@/types/gtm";

export default function GTMPage() {
  const [launches, setLaunches] = useState<GTMLaunch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewLaunchModal, setShowNewLaunchModal] = useState(false);
  const [newLaunch, setNewLaunch] = useState({
    name: "",
    product: "",
    launchDate: "",
    tier: "tier-2" as LaunchTier,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchLaunches();
  }, []);

  const fetchLaunches = async () => {
    try {
      const response = await fetch("/api/gtm/launches");
      const data = await response.json();
      setLaunches(data);
    } catch (error) {
      console.error("Error fetching launches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createLaunch = async () => {
    if (!newLaunch.name) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/gtm/launches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLaunch,
          status: "draft",
        }),
      });

      if (response.ok) {
        const launch = await response.json();
        // Navigate to the brief step
        window.location.href = `/gtm/${launch.id}/brief`;
      }
    } catch (error) {
      console.error("Error creating launch:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteLaunch = async (launchId: string) => {
    if (!confirm("Are you sure you want to delete this launch?")) return;

    try {
      await fetch(`/api/gtm/launches?id=${launchId}`, { method: "DELETE" });
      setLaunches(launches.filter((l) => l.id !== launchId));
    } catch (error) {
      console.error("Error deleting launch:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/20 text-gray-400";
      case "brief-review":
        return "bg-yellow-500/20 text-yellow-400";
      case "strategy-review":
        return "bg-blue-500/20 text-blue-400";
      case "generating":
        return "bg-purple-500/20 text-purple-400";
      case "complete":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "brief-review":
        return "Brief Review";
      case "strategy-review":
        return "Strategy Review";
      case "generating":
        return "Generating";
      case "complete":
        return "Complete";
      default:
        return status;
    }
  };

  const getLaunchLink = (launch: GTMLaunch) => {
    switch (launch.status) {
      case "draft":
      case "brief-review":
        return `/gtm/${launch.id}/brief`;
      case "strategy-review":
        return `/gtm/${launch.id}/strategy`;
      case "generating":
      case "complete":
        return `/gtm/${launch.id}/deliverables`;
      default:
        return `/gtm/${launch.id}/brief`;
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded border border-[var(--card-border)] flex items-center justify-center">
                <span className="text-[var(--foreground)] text-xs font-semibold">JR</span>
              </div>
              <span className="font-medium text-[var(--foreground)]">Copy Studio</span>
            </Link>
            <span className="text-[var(--muted)]">/</span>
            <span className="text-[var(--foreground)]">GTM Workflow</span>
          </div>
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Back to Generator
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-[var(--foreground)] mb-2">
              Go-To-Market <span className="font-semibold">Workflow</span>
            </h1>
            <p className="text-[var(--muted)]">
              Create and manage product launches with AI-powered creative strategy
            </p>
          </div>
          <button
            onClick={() => setShowNewLaunchModal(true)}
            className="btn-primary py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Launch
          </button>
        </div>

        {/* Launches List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="loading-shimmer h-24 rounded-lg"></div>
            ))}
          </div>
        ) : launches.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--card-border)] rounded-lg">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">No launches yet</h3>
            <p className="text-sm text-[var(--muted)] mb-4">Create your first product launch to get started</p>
            <button
              onClick={() => setShowNewLaunchModal(true)}
              className="btn-primary py-2 px-4 rounded-lg text-sm cursor-pointer"
            >
              Create Launch
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {launches.map((launch) => (
              <div
                key={launch.id}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-5 hover:border-[var(--muted-dim)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={getLaunchLink(launch)}
                        className="text-lg font-medium text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        {launch.name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(launch.status)}`}>
                        {getStatusLabel(launch.status)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                        {launch.tier.replace("tier-", "Tier ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                      {launch.product && launch.product !== launch.name && (
                        <span>{launch.product}</span>
                      )}
                      {launch.launchDate && (
                        <span>Launch: {new Date(launch.launchDate).toLocaleDateString()}</span>
                      )}
                      <span>Updated: {new Date(launch.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={getLaunchLink(launch)}
                      className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Continue →
                    </Link>
                    <button
                      onClick={() => deleteLaunch(launch.id)}
                      className="p-2 text-[var(--muted)] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Launch Modal */}
      {showNewLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNewLaunchModal(false)}
          />
          <div className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">New Product Launch</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Launch Name *</label>
                <input
                  type="text"
                  value={newLaunch.name}
                  onChange={(e) => setNewLaunch({ ...newLaunch, name: e.target.value })}
                  placeholder="e.g., The Eyeshadow Stick Launch"
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Product Name</label>
                <input
                  type="text"
                  value={newLaunch.product}
                  onChange={(e) => setNewLaunch({ ...newLaunch, product: e.target.value })}
                  placeholder="e.g., The Eyeshadow Stick"
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--muted)] mb-1">Launch Date</label>
                <input
                  type="date"
                  value={newLaunch.launchDate}
                  onChange={(e) => setNewLaunch({ ...newLaunch, launchDate: e.target.value })}
                  className="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--muted)] mb-2">Launch Tier *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TIER_CONFIG) as LaunchTier[]).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setNewLaunch({ ...newLaunch, tier })}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        newLaunch.tier === tier
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                      }`}
                    >
                      <div className="font-medium text-[var(--foreground)]">
                        {tier.replace("tier-", "Tier ")}
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-0.5">
                        {TIER_CONFIG[tier].creative.concepts.min}-{TIER_CONFIG[tier].creative.concepts.max} concepts
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewLaunchModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={createLaunch}
                disabled={!newLaunch.name || isCreating}
                className="flex-1 btn-primary py-2.5 px-4 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {isCreating ? "Creating..." : "Create Launch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
