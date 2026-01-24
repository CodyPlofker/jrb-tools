"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { GTMLaunch, PMCDocument, CreativeBrief, TIER_CONFIG } from "@/types/gtm";

interface BrainstormInput {
  // Basic info
  insight: string;
  productDescription: string;
  keyBenefits: string;
  clinicalClaims: string;
  targetAudience: string;
  campaignDirection: string;
  launchGoals: string;
  competitivePositioning: string;
  bobbisQuotes: string;
  longFormNotes: string;
  additionalNotes: string;

  // Enhanced fields (new)
  consumerInsights: string;       // Top things customers look for, concerns, appealing claims
  potentialBarriers: string;      // Obstacles to purchase
  keyDifferentiator: string;      // THE main differentiator
  positioningStatement: string;   // Full positioning statement
  coreMessage: string;            // Main message to deliver
  creativeDeliverables: string;   // Visual direction ideas, tagline requests
  otherDifferentiators: string;   // Secondary differentiators
}

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const launchId = params.launchId as string;

  const [launch, setLaunch] = useState<GTMLaunch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Structured brainstorm input
  const [brainstorm, setBrainstorm] = useState<BrainstormInput>({
    insight: "",
    productDescription: "",
    keyBenefits: "",
    clinicalClaims: "",
    targetAudience: "",
    campaignDirection: "",
    launchGoals: "",
    competitivePositioning: "",
    bobbisQuotes: "",
    longFormNotes: "",
    additionalNotes: "",
    // New fields
    consumerInsights: "",
    potentialBarriers: "",
    keyDifferentiator: "",
    positioningStatement: "",
    coreMessage: "",
    creativeDeliverables: "",
    otherDifferentiators: "",
  });

  // Generated outputs - shown side by side
  const [pmc, setPmc] = useState<PMCDocument | undefined>(undefined);
  const [brief, setBrief] = useState<CreativeBrief | undefined>(undefined);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Test data for Foundation Stick example
  const loadTestData = () => {
    setBrainstorm({
      insight: "Women want foundation that looks natural and feels like nothing, but are skeptical of foundation sticks because they have a reputation for being heavy and cakey.",
      productDescription: "Your Skin Foundation Stick - A creamy, buildable coverage foundation in stick form. Available in multiple shades. Contains ceramides, sodium hyaluronate, shea butter, and squalane for hydration.",
      keyBenefits: `- Natural coverage with a weightless feel
- Hydrating, creamy formula that glides on smoothly and blends easily
- Comfortable satin finish (not matte like competitors)
- Medium to full buildable coverage
- Layer without feeling cakey
- Allows your skin to show through (freckles, etc.)`,
      clinicalClaims: `- Customers find "weightless and comfortable all day long" very/extremely appealing (76%)
- Customers care about immediate performance vs. long-term performance for foundation (90%)`,
      targetAudience: "Women who want natural-looking foundation coverage but have been disappointed by heavy, cakey foundation sticks. Busy professionals who want easy application.",
      campaignDirection: `- "Foundation for skeptics" angle
- Calling all foundation stick haters
- Challenge the category reputation
- Prove that foundation sticks can feel weightless`,
      launchGoals: "Convert foundation stick skeptics by proving our formula is different - weightless coverage that doesn't feel like anything.",
      competitivePositioning: `Competitors all have a version of the product and say they are light. In reality they are heavy/cakey.
e.g., Merit Minimalist uses a very similar positioning to us around "natural look"
Our formula uses intentionally lighter-weight ingredients vs. competitive formulas that are denser with more powders.`,
      bobbisQuotes: "",
      longFormNotes: "",
      additionalNotes: "",
      consumerInsights: `Top things customers are looking for:
1) Natural look / still looks like my skin
2) Doesn't feel heavy or cakey

Top concerns around foundation sticks:
1) Heavy / thick
2) Cakey

Very few customers like/love foundation sticks (34%)
Customers find "weightless and comfortable all day long" very/extremely appealing (76%)
Customers care about immediate performance vs. long-term performance for foundation (90%)`,
      potentialBarriers: `- Customers like the convenience and portability of a foundation stick but are skeptical due to cakey/heavy reputation
- Competitors all have a version of the product, and say they are light. In reality they are heavy/cakey
- e.g., Merit Minimalist uses a very similar positioning to us around "natural look"`,
      keyDifferentiator: "Natural coverage with a weightless feel – you feel like you're not wearing anything",
      positioningStatement: "Only the JRB Foundation Stick delivers real coverage while feeling completely weightless on your skin. We've intentionally chosen a blend of lightweight ingredients to create a barely-there effect, also allowing users to layer on coverage without ever feeling cakey.",
      coreMessage: `We are the first foundation stick that foundation stick haters will love – great coverage (moderate to full), while light and comfortable all day.

We want to provoke customers by calling all people who hate foundation sticks to try ours (e.g., "Calling all foundation stick haters")`,
      creativeDeliverables: `How could this launch come to life visually in a disruptive way? Let's have 3 ways in.
Please include mood boards + key visual examples (mock)
8-10 campaign taglines (e.g., "foundation for skeptics")`,
      otherDifferentiators: `Weightless
- Intentionally chosen blend of lightweight ingredients to create a barely-there effect, allowing users to layer on for additional coverage without ever feeling cakey
- Competitive formulas are denser, with a greater percentage of powders, creating a less-than-natural, cakey effect when applied

Hydrating, creamy formula that glides on smoothly and blends easily

Finish is "comfortable satin" unlike many competitive foundation sticks that are matte

Contains ceramides, sodium hyaluronate, shea butter, squalane for hydration

Coverage is medium to full buildable

Jones Road version of "full" - still allows "your skin" to show (freckles, etc) through unlike most competitive brands`,
    });
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
        // Parse raw notes back into structured fields if they exist
        if (found.rawNotes) {
          try {
            const parsed = JSON.parse(found.rawNotes);
            setBrainstorm(prev => ({ ...prev, ...parsed }));
          } catch {
            // Old format - put in additionalNotes
            setBrainstorm(prev => ({ ...prev, additionalNotes: found.rawNotes }));
          }
        }
        setPmc(found.pmc || undefined);
        setBrief(found.creativeBrief || undefined);
        setHasGenerated(!!(found.pmc || found.creativeBrief));
      }
    } catch (error) {
      console.error("Error fetching launch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateBrief = async () => {
    // Combine structured input into raw notes for API
    const rawNotes = `
CORE INSIGHT:
${brainstorm.insight}

PRODUCT DESCRIPTION:
${brainstorm.productDescription}

KEY BENEFITS:
${brainstorm.keyBenefits}

CLINICAL CLAIMS / CONSUMER TESTING RESULTS:
${brainstorm.clinicalClaims}

TARGET AUDIENCE:
${brainstorm.targetAudience}

CONSUMER INSIGHTS (What customers want, concerns, appealing claims):
${brainstorm.consumerInsights}

POTENTIAL BARRIERS TO PURCHASE:
${brainstorm.potentialBarriers}

KEY PRODUCT DIFFERENTIATOR (The main thing that sets us apart):
${brainstorm.keyDifferentiator}

PRODUCT POSITIONING STATEMENT:
${brainstorm.positioningStatement}

CORE MESSAGE TO DELIVER TO CONSUMER:
${brainstorm.coreMessage}

CREATIVE DELIVERABLES & VISUAL DIRECTION:
${brainstorm.creativeDeliverables}

OTHER PRODUCT DIFFERENTIATORS (Secondary points for additional assets):
${brainstorm.otherDifferentiators}

CAMPAIGN DIRECTION & IDEAS:
${brainstorm.campaignDirection}

LAUNCH GOALS:
${brainstorm.launchGoals}

COMPETITIVE POSITIONING:
${brainstorm.competitivePositioning}

BOBBI'S QUOTES/PERSPECTIVE:
${brainstorm.bobbisQuotes}

LONG FORM BRAINSTORM NOTES:
${brainstorm.longFormNotes}

ADDITIONAL NOTES:
${brainstorm.additionalNotes}
    `.trim();

    if (!brainstorm.productDescription.trim()) {
      alert("Please enter at least a product description");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/gtm/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes,
          tier: launch?.tier,
          productName: launch?.product || launch?.name,
          launchDate: launch?.launchDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate brief");
      }

      const data = await response.json();
      setPmc(data.pmc);
      setBrief(data.creativeBrief);
      setHasGenerated(true);

      // Save to launch
      await saveLaunch({
        rawNotes: JSON.stringify(brainstorm),
        pmc: data.pmc,
        creativeBrief: data.creativeBrief,
        status: "brief-review",
      });
    } catch (error) {
      console.error("Error generating brief:", error);
      alert("Failed to generate brief. Please try again.");
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
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Error saving launch:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDraft = async () => {
    await saveLaunch({
      rawNotes: JSON.stringify(brainstorm),
      pmc,
      creativeBrief: brief,
    });
  };

  const approveAndContinue = async () => {
    if (!pmc || !brief) {
      alert("Please generate the brief first");
      return;
    }
    await saveLaunch({
      rawNotes: JSON.stringify(brainstorm),
      pmc,
      creativeBrief: brief,
      status: "strategy-review",
    });
    router.push(`/gtm/${launchId}/strategy`);
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
              <Link href="/gtm" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                ← GTM Workflow
              </Link>
              <span className="text-[var(--muted)]">/</span>
              <span className="text-[var(--foreground)] font-medium">{launch.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                {launch.tier.replace("tier-", "Tier ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href={`/gtm/${launchId}/brief`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
                <span className="hidden sm:inline">Brief</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/strategy`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  launch?.pmc ? "bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)]" : "bg-[var(--input-bg)] text-[var(--muted)] cursor-not-allowed opacity-50"
                }`}
                onClick={(e) => !launch?.pmc && e.preventDefault()}
              >
                <span className="w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs">2</span>
                <span className="hidden sm:inline">Strategy</span>
              </Link>
              <Link
                href={`/gtm/${launchId}/deliverables`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  launch?.channelStrategies || launch?.paidSocialStrategy ? "bg-[var(--input-bg)] text-[var(--foreground)] hover:bg-[var(--card-border)]" : "bg-[var(--input-bg)] text-[var(--muted)] cursor-not-allowed opacity-50"
                }`}
                onClick={(e) => !(launch?.channelStrategies || launch?.paidSocialStrategy) && e.preventDefault()}
              >
                <span className="w-5 h-5 rounded-full bg-[var(--card-border)] flex items-center justify-center text-xs">3</span>
                <span className="hidden sm:inline">Deliverables</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Step 1: Generate Creative Brief & PMC
              </h1>
              <p className="text-[var(--muted)]">
                Fill in what you know about the product launch. AI will generate both the Creative Brief and PMC document.
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={loadTestData}
                className="py-2 px-4 rounded-lg border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-sm cursor-pointer flex items-center gap-2"
                title="Load Foundation Stick test data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Load Test Data
              </button>
              <Link
                href={`/gtm/${launchId}/competitive-research`}
                className="py-2 px-4 rounded-lg border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-colors text-sm cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Competitive Research
              </Link>
              {lastSaved && (
                <span className="text-xs text-[var(--muted)]">Last saved: {lastSaved}</span>
              )}
              <button
                onClick={saveDraft}
                disabled={isSaving}
                className="py-2 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Brainstorm Input */}
          <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Brainstorm Input
            </h2>

            <div className="space-y-6">
              {/* Section: Core Product Info */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Core Product Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Product Description *
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What is the product? Format, texture, key ingredients, shades available?
                    </p>
                    <textarea
                      value={brainstorm.productDescription}
                      onChange={(e) => setBrainstorm({ ...brainstorm, productDescription: e.target.value })}
                      placeholder="e.g., A creamy, highly pigmented eyeshadow in stick form. Comes in 8 matte neutral shades that work on all skin tones."
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Key Benefits
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What makes it great? Performance claims, ease of use, results?
                    </p>
                    <textarea
                      value={brainstorm.keyBenefits}
                      onChange={(e) => setBrainstorm({ ...brainstorm, keyBenefits: e.target.value })}
                      placeholder="e.g., One-swipe application, blends with fingertip (no brush needed), buildable coverage, long-lasting, crease-resistant"
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Clinical Claims / Consumer Testing
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Any claims from consumer testing, clinical studies, or surveys we can use?
                    </p>
                    <textarea
                      value={brainstorm.clinicalClaims}
                      onChange={(e) => setBrainstorm({ ...brainstorm, clinicalClaims: e.target.value })}
                      placeholder="e.g., 95% said it was easy to apply. 89% saw improvement in 2 weeks. Dermatologist tested. Clinically proven to hydrate for 24 hours."
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Consumer Insights & Barriers */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Consumer Insights & Market Position</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Consumer Insights
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What are customers looking for? What are their top concerns? What claims do they find appealing? Include percentages if available.
                    </p>
                    <textarea
                      value={brainstorm.consumerInsights}
                      onChange={(e) => setBrainstorm({ ...brainstorm, consumerInsights: e.target.value })}
                      placeholder={`e.g.,
Top things customers are looking for: 1) Natural look / still looks like my skin 2) Doesn't feel heavy or cakey
Top concerns: 1) Heavy / thick 2) Cakey
Very few customers like foundation sticks (34%)
Customers find "weightless and comfortable all day long" very/extremely appealing (76%)
Customers care about immediate performance vs. long-term performance (90%)`}
                      rows={6}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Potential Barriers
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What might stop customers from purchasing? Category skepticism, competitor comparisons, price concerns?
                    </p>
                    <textarea
                      value={brainstorm.potentialBarriers}
                      onChange={(e) => setBrainstorm({ ...brainstorm, potentialBarriers: e.target.value })}
                      placeholder={`e.g.,
Customers like the convenience and portability of a foundation stick but are skeptical due to cakey / heavy reputation
Competitors all have a version of the product, and say they are light. In reality they are heavy / cakey
e.g., Merit Minimalist uses a very similar positioning to us around "natural look"`}
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Target Audience
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Who is this product for? Demographics, lifestyle, pain points?
                    </p>
                    <textarea
                      value={brainstorm.targetAudience}
                      onChange={(e) => setBrainstorm({ ...brainstorm, targetAudience: e.target.value })}
                      placeholder="e.g., Women 30+ who want easy, foolproof eye makeup. Busy professionals who don't have time for complicated routines."
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Positioning & Messaging */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Positioning & Messaging</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Key Product Differentiator
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      THE main thing that sets this product apart. The single most important differentiator.
                    </p>
                    <textarea
                      value={brainstorm.keyDifferentiator}
                      onChange={(e) => setBrainstorm({ ...brainstorm, keyDifferentiator: e.target.value })}
                      placeholder="e.g., Natural coverage with a weightless feel – you feel like you're not wearing anything"
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Positioning Statement
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      The full positioning statement for this product.
                    </p>
                    <textarea
                      value={brainstorm.positioningStatement}
                      onChange={(e) => setBrainstorm({ ...brainstorm, positioningStatement: e.target.value })}
                      placeholder="e.g., Only the JRB Foundation Stick delivers real coverage while feeling completely weightless on your skin. We've intentionally chosen a blend of lightweight ingredients to create a barely-there effect, also allowing users to layer on coverage without ever feeling cakey."
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Core Message to Deliver
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      The main message we want to communicate to the consumer. What&apos;s the provocation or call to action?
                    </p>
                    <textarea
                      value={brainstorm.coreMessage}
                      onChange={(e) => setBrainstorm({ ...brainstorm, coreMessage: e.target.value })}
                      placeholder={`e.g.,
We are the first foundation stick that foundation stick haters will love – great coverage (moderate to full), while light and comfortable all day
We want to provoke customers by calling all people who hate foundation sticks to try ours (e.g., "Calling all foundation stick haters")`}
                      rows={4}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Core Insight
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What&apos;s the key human truth or tension this product addresses? The &quot;aha&quot; moment.
                    </p>
                    <textarea
                      value={brainstorm.insight}
                      onChange={(e) => setBrainstorm({ ...brainstorm, insight: e.target.value })}
                      placeholder="e.g., Women are told eyeshadow is hard. They've been intimidated out of a category they actually want to be in. What if it didn't have to be complicated?"
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Creative Direction */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Creative Direction</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Creative Deliverables & Visual Direction
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      How should this launch come to life visually? What creative assets are needed? Mood boards, taglines, visual concepts?
                    </p>
                    <textarea
                      value={brainstorm.creativeDeliverables}
                      onChange={(e) => setBrainstorm({ ...brainstorm, creativeDeliverables: e.target.value })}
                      placeholder={`e.g.,
How could this launch come to life visually in a disruptive way? Let's have 3 ways in.
Please include mood boards + key visual examples (mock)
8-10 campaign taglines (e.g., "foundation for skeptics")`}
                      rows={5}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Campaign Direction & Brainstorm Ideas
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Creative angles, potential campaign concepts, messaging territories to explore?
                    </p>
                    <textarea
                      value={brainstorm.campaignDirection}
                      onChange={(e) => setBrainstorm({ ...brainstorm, campaignDirection: e.target.value })}
                      placeholder="e.g., 'Permission to play' angle - making eye makeup approachable. Could lean into 'first eyeshadow for the eyeshadow-shy'. Tutorial fatigue messaging - you don't need a YouTube degree."
                      rows={5}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Other Differentiators */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Additional Product Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Other Product Differentiators
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Secondary differentiators to be used in additional assets. Ingredients, finish, formula details, etc.
                    </p>
                    <textarea
                      value={brainstorm.otherDifferentiators}
                      onChange={(e) => setBrainstorm({ ...brainstorm, otherDifferentiators: e.target.value })}
                      placeholder={`e.g.,
Weightless - Intentionally chosen blend of lightweight ingredients to create a barely-there effect
Hydrating, creamy formula that glides on smoothly and blends easily
Finish is "comfortable satin" unlike many competitive foundation sticks that are matte
Contains ceramides, sodium hyaluronate, shea butter, squalane for hydration
Coverage is medium to full buildable
Jones Road version of "full" - still allows "your skin" to show (freckles, etc) through`}
                      rows={6}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Competitive Positioning
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      How is this different from competitors? What makes it JRB?
                    </p>
                    <textarea
                      value={brainstorm.competitivePositioning}
                      onChange={(e) => setBrainstorm({ ...brainstorm, competitivePositioning: e.target.value })}
                      placeholder="e.g., Unlike traditional eyeshadow that requires brushes and skill, this is mistake-proof. Clean ingredients, no learning curve."
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Launch Details */}
              <div className="border-b border-[var(--card-border)] pb-6">
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Launch Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Launch Goals & Theme
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      What&apos;s the launch positioning? Campaign theme? Revenue targets?
                    </p>
                    <textarea
                      value={brainstorm.launchGoals}
                      onChange={(e) => setBrainstorm({ ...brainstorm, launchGoals: e.target.value })}
                      placeholder='e.g., "Not-So-Basic Basics" - everyday essentials that actually perform. Target: $3M first 90 days.'
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Bobbi&apos;s Perspective
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Any quotes, opinions, or POV from Bobbi on this product?
                    </p>
                    <textarea
                      value={brainstorm.bobbisQuotes}
                      onChange={(e) => setBrainstorm({ ...brainstorm, bobbisQuotes: e.target.value })}
                      placeholder="e.g., Bobbi loves this for her everyday neutral look. She says it is easy to swipe, smudge, and go."
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Additional Notes */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-4">Additional Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Long Form Brainstorm / Meeting Notes
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Paste in transcripts, Granola notes, brainstorm docs, or any long-form thinking here.
                    </p>
                    <textarea
                      value={brainstorm.longFormNotes}
                      onChange={(e) => setBrainstorm({ ...brainstorm, longFormNotes: e.target.value })}
                      placeholder="Paste your meeting notes, transcripts, or brainstorm documents here..."
                      rows={8}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Additional Notes
                    </label>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Anything else? Pricing, restrictions, special considerations?
                    </p>
                    <textarea
                      value={brainstorm.additionalNotes}
                      onChange={(e) => setBrainstorm({ ...brainstorm, additionalNotes: e.target.value })}
                      placeholder="e.g., Price point $28. No animal testing claims needed for this one. Consider bundling with brushes."
                      rows={3}
                      className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--card-border)]">
                <p className="text-sm text-[var(--muted)]">
                  Tier {launch.tier.replace("tier-", "")}: {TIER_CONFIG[launch.tier].description}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="py-2.5 px-4 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--input-bg)] transition-colors text-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={generateBrief}
                    disabled={isGenerating || !brainstorm.productDescription.trim()}
                    className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {hasGenerated ? "Regenerate" : "Generate Brief & PMC"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Generated Output */}
          <div className="space-y-6">
            {!hasGenerated ? (
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-[var(--input-bg)] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[var(--foreground)] font-medium mb-1">Ready to Generate</p>
                <p className="text-sm text-[var(--muted)] text-center max-w-xs">
                  Fill in the brainstorm fields above and click Generate to create your Creative Brief and PMC document.
                </p>
              </div>
            ) : (
              <>
                {/* Creative Brief - First */}
                {brief && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        Creative Brief
                      </h2>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                        Generated
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Launch Overview</label>
                        <textarea
                          value={brief.launchOverview}
                          onChange={(e) => setBrief({ ...brief, launchOverview: e.target.value })}
                          rows={4}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Key Benefits</label>
                        <div className="space-y-2">
                          {brief.keyBenefits.map((benefit, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={benefit}
                                onChange={(e) => {
                                  const newBenefits = [...brief.keyBenefits];
                                  newBenefits[index] = e.target.value;
                                  setBrief({ ...brief, keyBenefits: newBenefits });
                                }}
                                className="flex-1 p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                              />
                              <button
                                onClick={() => {
                                  const newBenefits = brief.keyBenefits.filter((_, i) => i !== index);
                                  setBrief({ ...brief, keyBenefits: newBenefits });
                                }}
                                className="p-3 text-[var(--muted)] hover:text-red-400 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Demographic</label>
                        <textarea
                          value={brief.targetDemographic}
                          onChange={(e) => setBrief({ ...brief, targetDemographic: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      {brief.positioningStatement && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Positioning Statement</label>
                          <textarea
                            value={brief.positioningStatement}
                            onChange={(e) => setBrief({ ...brief, positioningStatement: e.target.value })}
                            rows={3}
                            className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                          />
                        </div>
                      )}

                      {brief.coreMessage && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Core Message</label>
                          <textarea
                            value={brief.coreMessage}
                            onChange={(e) => setBrief({ ...brief, coreMessage: e.target.value })}
                            rows={3}
                            className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                          />
                        </div>
                      )}

                      {brief.keyDifferentiator && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Key Differentiator</label>
                          <textarea
                            value={brief.keyDifferentiator}
                            onChange={(e) => setBrief({ ...brief, keyDifferentiator: e.target.value })}
                            rows={2}
                            className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                          />
                        </div>
                      )}

                      {brief.consumerInsights && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Consumer Insights</label>
                          <div className="space-y-2 p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg">
                            {brief.consumerInsights.topDesires?.length > 0 && (
                              <div>
                                <span className="text-xs text-[var(--muted)]">Top Desires:</span>
                                <ul className="list-disc list-inside text-base text-[var(--foreground)]">
                                  {brief.consumerInsights.topDesires.map((d, i) => <li key={i}>{d}</li>)}
                                </ul>
                              </div>
                            )}
                            {brief.consumerInsights.topConcerns?.length > 0 && (
                              <div>
                                <span className="text-xs text-[var(--muted)]">Top Concerns:</span>
                                <ul className="list-disc list-inside text-base text-[var(--foreground)]">
                                  {brief.consumerInsights.topConcerns.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>
                            )}
                            {brief.consumerInsights.appealingClaims?.length > 0 && (
                              <div>
                                <span className="text-xs text-[var(--muted)]">Appealing Claims:</span>
                                <ul className="list-disc list-inside text-base text-[var(--foreground)]">
                                  {brief.consumerInsights.appealingClaims.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {brief.potentialBarriers && brief.potentialBarriers.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Potential Barriers</label>
                          <ul className="list-disc list-inside p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-base text-[var(--foreground)]">
                            {brief.potentialBarriers.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        </div>
                      )}

                      {brief.creativeDeliverables && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Creative Deliverables</label>
                          <div className="space-y-2 p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg">
                            {brief.creativeDeliverables.visualDirection && (
                              <div>
                                <span className="text-xs text-[var(--muted)]">Visual Direction:</span>
                                <p className="text-base text-[var(--foreground)]">{brief.creativeDeliverables.visualDirection}</p>
                              </div>
                            )}
                            {brief.creativeDeliverables.taglineOptions?.length > 0 && (
                              <div>
                                <span className="text-xs text-[var(--muted)]">Tagline Options:</span>
                                <ul className="list-disc list-inside text-base text-[var(--foreground)]">
                                  {brief.creativeDeliverables.taglineOptions.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Creative Considerations</label>
                        <textarea
                          value={brief.creativeConsiderations}
                          onChange={(e) => setBrief({ ...brief, creativeConsiderations: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PMC Document - Second */}
                {pmc && (
                  <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        PMC: Positioning, Messaging, Copy
                      </h2>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                        Generated
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Tagline</label>
                        <input
                          type="text"
                          value={pmc.tagline}
                          onChange={(e) => setPmc({ ...pmc, tagline: e.target.value })}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">What It Is</label>
                        <textarea
                          value={pmc.whatItIs}
                          onChange={(e) => setPmc({ ...pmc, whatItIs: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Why We Love It</label>
                        <textarea
                          value={pmc.whyWeLoveIt}
                          onChange={(e) => setPmc({ ...pmc, whyWeLoveIt: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">How It&apos;s Different</label>
                        <textarea
                          value={pmc.howItsDifferent}
                          onChange={(e) => setPmc({ ...pmc, howItsDifferent: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Who It&apos;s For</label>
                        <textarea
                          value={pmc.whoItsFor}
                          onChange={(e) => setPmc({ ...pmc, whoItsFor: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">How To Use</label>
                        <textarea
                          value={pmc.howToUse}
                          onChange={(e) => setPmc({ ...pmc, howToUse: e.target.value })}
                          rows={3}
                          className="w-full p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-base leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Bobbi&apos;s Quotes</label>
                        {pmc.bobbisQuotes.map((quote, index) => (
                          <div key={index} className="mb-3 p-4 bg-[var(--input-bg)] rounded-lg">
                            <input
                              type="text"
                              value={quote.context}
                              onChange={(e) => {
                                const newQuotes = [...pmc.bobbisQuotes];
                                newQuotes[index] = { ...quote, context: e.target.value };
                                setPmc({ ...pmc, bobbisQuotes: newQuotes });
                              }}
                              placeholder="Context"
                              className="w-full p-3 mb-2 bg-[var(--card)] border border-[var(--card-border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                            />
                            <textarea
                              value={quote.quote}
                              onChange={(e) => {
                                const newQuotes = [...pmc.bobbisQuotes];
                                newQuotes[index] = { ...quote, quote: e.target.value };
                                setPmc({ ...pmc, bobbisQuotes: newQuotes });
                              }}
                              rows={2}
                              className="w-full p-3 bg-[var(--card)] border border-[var(--card-border)] rounded text-base text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] resize-vertical"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={saveDraft}
                    disabled={isSaving}
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    onClick={approveAndContinue}
                    className="btn-primary py-2.5 px-6 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    Approve & Continue to Strategy
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
