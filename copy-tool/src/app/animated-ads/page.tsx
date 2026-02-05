"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  AnimationPlatform,
  PlatformFormat,
  VideoBackend,
  AnimationSpecs,
  getFormatsForPlatform,
  ALL_FORMATS,
} from "@/types/animated-ads";

type WorkflowStep = "upload" | "configure" | "generate";

export default function AnimatedAdsPage() {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");

  // Progress state for combined analyze + generate
  const [progressMessage, setProgressMessage] = useState<string>("");

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration state - initialize format and duration based on default platform
  const [platform, setPlatform] = useState<AnimationPlatform>("meta");
  const [selectedFormat, setSelectedFormat] = useState<PlatformFormat | null>(() => {
    const formats = getFormatsForPlatform("meta");
    return formats[0] || null;
  });
  const [duration, setDuration] = useState<number>(() => {
    const formats = getFormatsForPlatform("meta");
    return formats[0]?.recommendedDuration || 15;
  });
  const [backend, setBackend] = useState<VideoBackend>("creatomate");

  // Analysis state (specs stored for reference after generation)
  const [animationSpecs, setAnimationSpecs] = useState<AnimationSpecs | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const availableFormats = getFormatsForPlatform(platform);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setCurrentStep("configure");
        // Reset any previous analysis/generation
        setAnimationSpecs(null);
        setGeneratedVideoUrl(null);
        setAnalysisError(null);
        setGenerationError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setCurrentStep("configure");
        setAnimationSpecs(null);
        setGeneratedVideoUrl(null);
        setAnalysisError(null);
        setGenerationError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = () => {
    setUploadedImage(null);
    setUploadedImageName("");
    setCurrentStep("upload");
    setAnimationSpecs(null);
    setGeneratedVideoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePlatformChange = (newPlatform: AnimationPlatform) => {
    setPlatform(newPlatform);
    // Reset format selection when platform changes
    const formats = getFormatsForPlatform(newPlatform);
    setSelectedFormat(formats[0] || null);
    // Update duration to recommended
    if (formats[0]) {
      setDuration(formats[0].recommendedDuration);
    }
  };

  const handleFormatChange = (formatId: string) => {
    const format = ALL_FORMATS.find((f) => f.id === formatId);
    if (format) {
      setSelectedFormat(format);
      setDuration(format.recommendedDuration);
    }
  };

  // Combined analyze + generate in one click
  const handleGenerateVideo = async () => {
    if (!uploadedImage || !selectedFormat) return;

    setIsGenerating(true);
    setAnalysisError(null);
    setGenerationError(null);
    setProgressMessage("Analyzing image with AI...");

    try {
      // Step 1: Analyze the image
      const analyzeResponse = await fetch("/api/animated-ads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedImage,
          platform,
          formatId: selectedFormat.id,
        }),
      });

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.error) {
        setAnalysisError(analyzeData.error);
        setIsGenerating(false);
        setProgressMessage("");
        return;
      }

      if (!analyzeData.specs) {
        setAnalysisError("Failed to analyze image. No specs returned.");
        setIsGenerating(false);
        setProgressMessage("");
        return;
      }

      // Save specs for reference
      setAnimationSpecs(analyzeData.specs);
      setProgressMessage("Generating video...");

      // Step 2: Generate the video immediately
      const generateResponse = await fetch("/api/animated-ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specs: analyzeData.specs,
          backend,
        }),
      });

      const generateData = await generateResponse.json();

      if (generateData.error) {
        setGenerationError(generateData.error);
      } else if (generateData.videoUrl) {
        setGeneratedVideoUrl(generateData.videoUrl);
        setCurrentStep("generate");
      }
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError("Failed to generate video. Please try again.");
    } finally {
      setIsGenerating(false);
      setProgressMessage("");
    }
  };

  const steps: { id: WorkflowStep; label: string; number: number }[] = [
    { id: "upload", label: "Upload", number: 1 },
    { id: "configure", label: "Configure", number: 2 },
    { id: "generate", label: "Generate", number: 3 },
  ];

  const getStepStatus = (stepId: WorkflowStep) => {
    const stepOrder = ["upload", "configure", "generate"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Static to Animated</h1>
              <p className="text-sm text-[var(--muted)]">Convert static ads into animated videos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        status === "completed"
                          ? "bg-green-500 text-white"
                          : status === "current"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--input-bg)] text-[var(--muted)]"
                      }`}
                    >
                      {status === "completed" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        status === "current" ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${
                        getStepStatus(steps[index + 1].id) !== "upcoming"
                          ? "bg-[var(--accent)]"
                          : "bg-[var(--card-border)]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input/Preview */}
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Static Ad</h2>

              {uploadedImage ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/5] bg-[var(--input-bg)] rounded-lg overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Uploaded static ad"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)] truncate">{uploadedImageName}</span>
                    <button
                      onClick={removeImage}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="block aspect-[4/5] border-2 border-dashed border-[var(--card-border)] rounded-lg cursor-pointer hover:border-[var(--muted-dim)] transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-xl bg-[var(--input-bg)] flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-[var(--muted-dim)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-[var(--foreground)] font-medium mb-1">Upload your static ad</p>
                    <p className="text-sm text-[var(--muted-dim)]">
                      Drag and drop or click to browse
                    </p>
                    <p className="text-xs text-[var(--muted-dim)] mt-2">PNG, JPG up to 10MB</p>
                  </div>
                </label>
              )}
            </div>

            {/* Generated Video Preview */}
            {generatedVideoUrl && (
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Generated Video</h2>
                <div className="aspect-[4/5] bg-black rounded-lg overflow-hidden">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <a
                    href={generatedVideoUrl}
                    download
                    className="flex-1 py-2.5 px-4 bg-[var(--accent)] text-white rounded-lg text-center font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Download Video
                  </a>
                  <button
                    onClick={() => {
                      setGeneratedVideoUrl(null);
                      setAnimationSpecs(null);
                      setCurrentStep("configure");
                    }}
                    className="py-2.5 px-4 bg-[var(--input-bg)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--card-border)] transition-colors cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Configuration */}
          <div className="space-y-6">
            {/* Platform Selection */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Platform</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["meta", "applovin"] as AnimationPlatform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePlatformChange(p)}
                    className={`py-3 px-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      platform === p
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                    }`}
                  >
                    <div className="text-center">
                      <span className="font-medium text-[var(--foreground)] capitalize">{p}</span>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {p === "meta" ? "Feed, Stories, Reels" : "Interstitial, Banner, Rewarded"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Format</h2>
              <select
                value={selectedFormat?.id || ""}
                onChange={(e) => handleFormatChange(e.target.value)}
                className="input-dark w-full p-3 rounded-lg cursor-pointer"
              >
                {availableFormats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name} ({format.aspectRatio})
                  </option>
                ))}
              </select>
              {selectedFormat && (
                <div className="mt-3 p-3 bg-[var(--input-bg)] rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[var(--muted)]">Dimensions:</span>
                      <span className="text-[var(--foreground)] ml-2">
                        {selectedFormat.dimensions.width}x{selectedFormat.dimensions.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)]">Duration:</span>
                      <span className="text-[var(--foreground)] ml-2">
                        {selectedFormat.minDuration}-{selectedFormat.maxDuration}s
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-dim)] mt-2">{selectedFormat.notes}</p>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Duration</h2>
              <div className="space-y-3">
                <input
                  type="range"
                  min={selectedFormat?.minDuration || 5}
                  max={selectedFormat?.maxDuration || 60}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">{selectedFormat?.minDuration || 5}s</span>
                  <span className="text-[var(--foreground)] font-medium">{duration} seconds</span>
                  <span className="text-[var(--muted)]">{selectedFormat?.maxDuration || 60}s</span>
                </div>
              </div>
            </div>

            {/* Video Backend */}
            <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-6">
              <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Video Backend</h2>
              <div className="grid grid-cols-2 gap-3">
                {(["creatomate", "veo"] as VideoBackend[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBackend(b)}
                    className={`py-3 px-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      backend === b
                        ? "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                    }`}
                  >
                    <div className="text-center">
                      <span className="font-medium text-[var(--foreground)] capitalize">{b}</span>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {b === "creatomate" ? "Precise, JSON-based" : "AI-creative"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Messages */}
            {analysisError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400">{analysisError}</p>
              </div>
            )}
            {generationError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400">{generationError}</p>
              </div>
            )}

            {/* Action Button - One Click Generation */}
            <div className="space-y-3">
              {!generatedVideoUrl && (
                <button
                  onClick={handleGenerateVideo}
                  disabled={!uploadedImage || !selectedFormat || isGenerating}
                  className="w-full py-3.5 px-6 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
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
                      {progressMessage || "Processing..."}
                    </span>
                  ) : (
                    "Generate Video"
                  )}
                </button>
              )}

              {generatedVideoUrl && (
                <button
                  onClick={() => {
                    setGeneratedVideoUrl(null);
                    setAnimationSpecs(null);
                    setCurrentStep("configure");
                  }}
                  className="w-full py-2.5 px-6 bg-[var(--input-bg)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--card-border)] transition-colors cursor-pointer"
                >
                  Generate Another
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
