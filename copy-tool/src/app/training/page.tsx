"use client";

import { useState, useEffect } from "react";

const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
      {theme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

interface TrainingFile {
  name: string;
  path: string;
  category: string;
}

interface FileContent {
  path: string;
  content: string;
}

const categories = [
  { id: "brand", name: "Brand", description: "Core brand voice and style guide" },
  { id: "brand-voice", name: "Brand Voice", description: "Tone guidelines and example copy" },
  { id: "personas", name: "Personas", description: "Customer avatar profiles" },
  { id: "frameworks", name: "Frameworks", description: "Breakthrough Advertising concepts" },
  { id: "channels", name: "Channels", description: "Channel-specific writing guidelines" },
  { id: "products", name: "Products", description: "Product catalog and details" },
  { id: "reviews", name: "Reviews", description: "Customer reviews and testimonials" },
  { id: "performance", name: "Performance", description: "Winning ads and metrics" },
  { id: "compliance", name: "Compliance", description: "Regulatory claims and callouts" },
];

export default function TrainingPage() {
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("brand");
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/training");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    try {
      const response = await fetch(`/api/training?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setSelectedFile({ path, content: data.content });
      setEditContent(data.content);
      setIsEditing(false);
    } catch (error) {
      console.error("Error fetching file content:", error);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editContent,
        }),
      });

      if (response.ok) {
        setSelectedFile({ ...selectedFile, content: editContent });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFiles = files.filter((f) => f.category === selectedCategory);

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded border border-[var(--card-border)] flex items-center justify-center">
                <span className="text-[var(--foreground)] text-xs font-semibold">JR</span>
              </div>
              <span className="font-medium text-[var(--foreground)]">Copy Studio</span>
            </a>
            <span className="text-[var(--card-border)] mx-2">/</span>
            <span className="text-[var(--muted)]">Training Data</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
            >
              Back to Generator
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-light text-[var(--foreground)] mb-2">
            <span className="font-semibold">Training</span> Data
          </h1>
          <p className="text-[var(--muted)] mt-3 max-w-lg mx-auto">
            View and edit the data that trains the AI. Changes take effect immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Categories */}
          <div className="lg:col-span-2 space-y-2">
            <label className="floating-label mb-3 block">Categories</label>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedFile(null);
                }}
                className={`w-full p-3 text-left rounded-lg cursor-pointer transition-all ${
                  selectedCategory === category.id
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted-dim)]"
                }`}
              >
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Middle - File List */}
          <div className="lg:col-span-3 space-y-2">
            <label className="floating-label mb-3 block">Files</label>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="loading-shimmer h-14 rounded-lg"></div>
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-[var(--muted-dim)] text-sm p-4 text-center">No files in this category</div>
            ) : (
              filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => fetchFileContent(file.path)}
                  className={`w-full p-3 text-left rounded-lg cursor-pointer transition-all ${
                    selectedFile?.path === file.path
                      ? "bg-[var(--card)] border border-[var(--muted-dim)]"
                      : "bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--muted-dim)]"
                  }`}
                >
                  <div className="text-sm text-[var(--foreground)] capitalize">
                    {file.name.replace(".md", "").replace(/-/g, " ")}
                  </div>
                  <div className="text-xs text-[var(--muted-dim)] mt-0.5 truncate">
                    {file.name}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right - Content Viewer/Editor */}
          <div className="lg:col-span-7">
            <div className="flex justify-between items-center mb-3">
              <label className="floating-label">
                {selectedFile ? (isEditing ? "Editing" : "Preview") : "Select a file"}
              </label>
              {selectedFile && (
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(selectedFile.content);
                        }}
                        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={isSaving}
                        className="btn-primary text-xs px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="output-area rounded-lg min-h-[600px]">
              {selectedFile ? (
                isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[600px] p-6 font-mono text-sm text-[var(--foreground)] resize-none focus:outline-none rounded-lg bg-transparent"
                  />
                ) : (
                  <div className="p-6 overflow-auto max-h-[600px]">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--foreground)] leading-relaxed">
                      {selectedFile.content}
                    </pre>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-center">
                  <div className="w-12 h-12 rounded-lg bg-[var(--card)] border border-[var(--card-border)] flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--muted-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-[var(--foreground)] font-medium">Select a file</p>
                  <p className="text-sm text-[var(--muted-dim)] mt-1">
                    Choose a category and file to view or edit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
