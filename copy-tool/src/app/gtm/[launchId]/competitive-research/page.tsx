"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GTMLaunch } from "@/types/gtm";

interface CompetitorProduct {
  id: string;
  brand: string;
  productName: string;
  url?: string;
  price?: string;
  positioning?: string;
  keyMessages?: string[];
  ingredients?: string;
}

interface ReviewAnalysis {
  productId: string;
  source: string; // 'brand-site' | 'sephora' | 'amazon' | 'ulta'
  fiveStarThemes: string[];
  oneStarThemes: string[];
  commonPraises: string[];
  commonComplaints: string[];
  notableQuotes: { rating: number; quote: string }[];
}

interface CompetitiveResearch {
  competitors: CompetitorProduct[];
  reviewAnalyses: ReviewAnalysis[];
  marketSummary?: string;
  positioningGaps?: string[];
  differentiation?: string;
  generatedAt?: string;
}

export default function CompetitiveResearchPage() {
  const params = useParams();
  const launchId = params.launchId as string;

  const [launch, setLaunch] = useState<GTMLaunch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Research inputs
  const [productCategory, setProductCategory] = useState("");
  const [competitorBrands, setCompetitorBrands] = useState("");
  const [specificProducts, setSpecificProducts] = useState("");
  const [researchFocus, setResearchFocus] = useState("");

  // Research outputs
  const [research, setResearch] = useState<CompetitiveResearch | null>(null);

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
        // Load existing research if any
        if (found.competitiveResearch) {
          setResearch(found.competitiveResearch);
        }
        // Pre-fill product category from launch
        if (found.product) {
          setProductCategory(found.product);
        }
      }
    } catch (error) {
      console.error("Error fetching launch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const runResearch = async () => {
    if (!productCategory.trim()) {
      alert("Please enter a product category");
      return;
    }

    setIsResearching(true);
    try {
      const response = await fetch("/api/gtm/competitive-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCategory,
          competitorBrands: competitorBrands.split(",").map(b => b.trim()).filter(Boolean),
          specificProducts: specificProducts.split("\n").map(p => p.trim()).filter(Boolean),
          researchFocus,
          productName: launch?.product || launch?.name,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run competitive research");
      }

      const data = await response.json();
      setResearch(data.research);

      // Save to launch
      await saveLaunch({ competitiveResearch: data.research });
    } catch (error) {
      console.error("Error running research:", error);
      alert("Failed to run competitive research. Please try again.");
    } finally {
      setIsResearching(false);
    }
  };

  const saveLaunch = async (updates: Partial<GTMLaunch & { competitiveResearch: CompetitiveResearch }>) => {
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

  const exportToMarkdown = () => {
    if (!research) return;

    const md = `# Competitive Market Research: ${launch?.product || launch?.name}

Generated: ${research.generatedAt || new Date().toISOString()}

## Market Summary
${research.marketSummary || "No summary available"}

## Positioning Gaps
${research.positioningGaps?.map(gap => `- ${gap}`).join("\n") || "None identified"}

## Recommended Differentiation
${research.differentiation || "Not yet defined"}

---

## Competitor Analysis

${research.competitors.map(comp => `
### ${comp.brand} - ${comp.productName}
${comp.url ? `URL: ${comp.url}` : ""}
${comp.price ? `Price: ${comp.price}` : ""}

**Positioning:** ${comp.positioning || "Unknown"}

**Key Messages:**
${comp.keyMessages?.map(m => `- ${m}`).join("\n") || "None identified"}
`).join("\n")}

---

## Review Analysis

${research.reviewAnalyses.map(ra => {
  const comp = research.competitors.find(c => c.id === ra.productId);
  return `
### ${comp?.brand} - ${comp?.productName} (${ra.source})

**5-Star Review Themes:**
${ra.fiveStarThemes.map(t => `- ${t}`).join("\n")}

**1-Star Review Themes:**
${ra.oneStarThemes.map(t => `- ${t}`).join("\n")}

**Common Praises:**
${ra.commonPraises.map(p => `- ${p}`).join("\n")}

**Common Complaints:**
${ra.commonComplaints.map(c => `- ${c}`).join("\n")}

**Notable Quotes:**
${ra.notableQuotes.map(q => `> "${q.quote}" (${q.rating}★)`).join("\n")}
`;
}).join("\n")}
`;

    // Download as file
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competitive-research-${launch?.product || "product"}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
          <Link href="/gtm" className="text-[var(--accent)] hover:underline mt-2 block cursor-pointer">
            Back to launches
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
              <Link href={`/gtm/${launchId}/brief`} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                ← Back to Brief
              </Link>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--foreground)] font-medium">{launch.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                Competitive Research
              </span>
            </div>
            {research && (
              <button
                onClick={exportToMarkdown}
                className="py-2 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export to Markdown
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
            Competitive Market Research
          </h1>
          <p className="text-[var(--muted)]">
            Research competitor products, analyze reviews, and identify positioning opportunities before creating your creative brief.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Research Input */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Research Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Product Category *
                </label>
                <p className="text-xs text-[var(--muted)] mb-2">
                  What type of product is this? (e.g., foundation stick, lip gloss, eyeshadow palette)
                </p>
                <input
                  type="text"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  placeholder="e.g., Foundation Stick"
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Competitor Brands
                </label>
                <p className="text-xs text-[var(--muted)] mb-2">
                  Comma-separated list of brands to research (e.g., Merit, ILIA, Westman Atelier)
                </p>
                <input
                  type="text"
                  value={competitorBrands}
                  onChange={(e) => setCompetitorBrands(e.target.value)}
                  placeholder="Merit, ILIA, Westman Atelier, Kosas"
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Specific Products to Research
                </label>
                <p className="text-xs text-[var(--muted)] mb-2">
                  One product per line (e.g., &quot;Merit Minimalist Perfecting Foundation Stick&quot;)
                </p>
                <textarea
                  value={specificProducts}
                  onChange={(e) => setSpecificProducts(e.target.value)}
                  placeholder={`Merit Minimalist Perfecting Complexion Stick
ILIA Skin Rewind Complexion Stick
Westman Atelier Vital Skin Foundation Stick`}
                  rows={4}
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Research Focus
                </label>
                <p className="text-xs text-[var(--muted)] mb-2">
                  What specific aspects do you want to understand? (positioning, claims, customer pain points, etc.)
                </p>
                <textarea
                  value={researchFocus}
                  onChange={(e) => setResearchFocus(e.target.value)}
                  placeholder={`e.g.,
- How do competitors position around "natural look" vs "coverage"?
- What are common complaints about foundation sticks (cakey, heavy)?
- What claims resonate most in reviews?`}
                  rows={4}
                  className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                />
              </div>

              <div className="pt-4 border-t border-[var(--card-border)]">
                <button
                  onClick={runResearch}
                  disabled={isResearching || !productCategory.trim()}
                  className="w-full btn-primary py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isResearching ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Researching...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Run Competitive Research
                    </>
                  )}
                </button>
                <p className="text-xs text-[var(--muted)] text-center mt-2">
                  AI will analyze competitor positioning, review sentiment, and identify opportunities.
                </p>
              </div>
            </div>
          </div>

          {/* Research Output */}
          <div className="space-y-6">
            {!research ? (
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-[var(--input-bg)] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-[var(--foreground)] font-medium mb-1">No Research Yet</p>
                <p className="text-sm text-[var(--muted)] text-center max-w-xs">
                  Fill in the research parameters and click &quot;Run Competitive Research&quot; to analyze the market.
                </p>
              </div>
            ) : (
              <>
                {/* Market Summary */}
                <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Market Summary</h3>
                  <p className="text-base text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                    {research.marketSummary || "No summary available"}
                  </p>
                </div>

                {/* Positioning Gaps */}
                {research.positioningGaps && research.positioningGaps.length > 0 && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">Positioning Gaps & Opportunities</h3>
                    <ul className="space-y-2">
                      {research.positioningGaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2 text-base text-[var(--foreground)]">
                          <span className="text-green-400 mt-1">→</span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Differentiation Recommendation */}
                {research.differentiation && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-3">Recommended Differentiation</h3>
                    <p className="text-base text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                      {research.differentiation}
                    </p>
                  </div>
                )}

                {/* Competitor Cards */}
                {research.competitors.map((comp) => {
                  const reviews = research.reviewAnalyses.filter(r => r.productId === comp.id);
                  return (
                    <div key={comp.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">{comp.brand}</h3>
                          <p className="text-sm text-[var(--muted)]">{comp.productName}</p>
                          {comp.price && <p className="text-sm text-[var(--accent)] mt-1">{comp.price}</p>}
                        </div>
                        {comp.url && (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            View Product →
                          </a>
                        )}
                      </div>

                      {comp.positioning && (
                        <div className="mb-4">
                          <p className="text-xs text-[var(--muted)] mb-1">Positioning</p>
                          <p className="text-sm text-[var(--foreground)]">{comp.positioning}</p>
                        </div>
                      )}

                      {comp.keyMessages && comp.keyMessages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-[var(--muted)] mb-1">Key Messages</p>
                          <ul className="text-sm text-[var(--foreground)] space-y-1">
                            {comp.keyMessages.map((m, i) => (
                              <li key={i}>• {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Review Analysis for this product */}
                      {reviews.map((ra) => (
                        <div key={ra.source} className="mt-4 pt-4 border-t border-[var(--card-border)]">
                          <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">
                            Review Analysis ({ra.source})
                          </p>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-green-400 mb-1">5★ Themes</p>
                              <ul className="text-xs text-[var(--foreground)] space-y-1">
                                {ra.fiveStarThemes.slice(0, 3).map((t, i) => (
                                  <li key={i}>+ {t}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs text-red-400 mb-1">1★ Themes</p>
                              <ul className="text-xs text-[var(--foreground)] space-y-1">
                                {ra.oneStarThemes.slice(0, 3).map((t, i) => (
                                  <li key={i}>- {t}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {ra.notableQuotes.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-[var(--muted)] mb-1">Notable Quotes</p>
                              {ra.notableQuotes.slice(0, 2).map((q, i) => (
                                <p key={i} className="text-xs text-[var(--foreground)] italic border-l-2 border-[var(--card-border)] pl-2 mt-1">
                                  &quot;{q.quote}&quot; ({q.rating}★)
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
