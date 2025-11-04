import React, { useState } from "react";
import "./App.css";
 
const LOGO_ICON =
  "https://infinitysoftsystems.com/wp-content/uploads/2025/04/logo-ico.svg";
const LOGO_WORD =
  "https://infinitysoftsystems.com/wp-content/uploads/2025/07/Group-29786.svg";
 
export default function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [allRanked, setAllRanked] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
 
  const handleAnalyze = async () => {
    setError(null);
    setResults(null);
    setAllRanked([]);
 
    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }
 
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: jobDescription,
          include_analysis: includeAnalysis,
          num_candidates: topN,
        }),
      });
 
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Server error");
      } else {
        setAllRanked(data.ranked_candidates);
        setResults({
          visibleRanked: data.ranked_candidates.slice(0, topN),
          analysis: data.analysis || null,
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };
 
  // Change visible top resumes dynamically
  const handleTopNChange = (newTopN) => {
    setTopN(newTopN);
    if (allRanked.length > 0) {
      setResults((prev) => ({
        ...prev,
        visibleRanked: allRanked.slice(0, newTopN),
      }));
    }
  };
const handleDownload = () => {
  if (!results) return;

  let text = "";

  if (Array.isArray(results.analysis)) {
    text = results.analysis
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.file_name}:\n${item.analysis}\n`
      )
      .join("\n");
  } else if (results.analysis && typeof results.analysis === "object") {
    // fallback in case backend returns object
    text = Object.entries(results.analysis)
      .map(([name, summary]) => `${name}:\n${summary}\n`)
      .join("\n");
  } else {
    text = JSON.stringify(results, null, 2);
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resume_match_results.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};


 
  return (
<div className="site-root">
      {/* Header */}
<header className="site-header">
<div className="header-left">
<div className="logo-wrapper">
<img className="logo-icon" src={LOGO_ICON} alt="Logo Icon" />
<img className="logo-word" src={LOGO_WORD} alt="Company Wordmark" />
</div>
</div>
<div className="header-right">
<span className="ai-badge">AI Powered</span>
</div>
</header>
 
      {/* Hero Section */}
<div className="hero-area">
<div className="hero-copy">
<h1 className="hero-title">
            Find the Best Resume Match —{" "}
<span className="accent">Instantly</span>
</h1>
<p className="hero-sub">
            Paste a job description and discover the top matching resumes from
            your server-side folder using AI.
</p>
</div>
 
        {/* Analyzer Card */}
<div className="analyzer-card centered">
<label className="field-label">
            Job Description
<textarea
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description here..."
            />
</label>
 
          <div className="controls-row">
<label className="topn">
              Top N:
<input
                type="number"
                min={1}
                max={20}
                value={topN}
                onChange={(e) => handleTopNChange(Number(e.target.value))}
              />
</label>
 
            <label className="checkbox-label">
<input
                type="checkbox"
                checked={includeAnalysis}
                onChange={(e) => setIncludeAnalysis(e.target.checked)}
              />
              Include Detailed Analysis
</label>
 
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading}
>
              {loading ? "Analyzing..." : "Analyze"}
</button>
</div>
 
          {error && <div className="error">{error}</div>}
</div>
 
        {/* Results */}
<section className="results-section">
          {loading ? (
<div className="spinner-container">
<div className="spinner"></div>
<p>Analyzing resumes... please wait</p>
</div>
          ) : results ? (
<>
<div className="results-header fade-in">
<h2>Top {topN} Matches</h2>
<span className="muted">Showing best-ranked resumes</span>
</div>
 
              <div className="results-list fade-in">
                {results.visibleRanked?.map((r, idx) => (
<div className="result-card fade-in" key={r.file_name}>
<div className="result-left">
<div className="result-title">
  {idx + 1}.{" "}
  <a
    href={`http://localhost:5000/resumes/${encodeURIComponent(r.file_name)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="resume-link"
  >
    {r.file_name}
  </a>
</div>

<div className="result-expl">
                        Similarity Score:{" "}
<strong>
                          {r.similarity_score?.toFixed(3) ?? "N/A"}
</strong>
</div>
</div>
</div>
                ))}
</div>
 
              {results.analysis && (
<>
<h3 className="summary-title fade-in">Candidate Summary</h3>
<pre className="summary-box fade-in">
                   {results.analysis && (
  <>
    <h3 className="summary-title fade-in">Candidate Summary</h3>
    <pre className="summary-box fade-in">
      {Array.isArray(results.analysis)
        ? results.analysis
            .map(
              (item, idx) =>
                `${idx + 1}. ${item.file_name}:\n${item.analysis}\n`
            )
            .join("\n")
        : Object.entries(results.analysis)
            .map(([name, summary]) => `${name}:\n${summary}\n`)
            .join("\n")}
    </pre>
  </>
)}


</pre>
</>
              )}
</>
          ) : (
<div className="results-placeholder">
              Results will appear here after analysis...
</div>
          )}
</section>
</div>
 
      {/* Download Bar */}
<div className="download-bar">
<div className="download-bar-inner">
<div className="download-info">
<div className="download-title">Results Summary</div>
<div className="download-sub">
              Download the latest matching results and analysis
</div>
</div>
 
          <div className="download-action">
<button
              className="download-btn"
              onClick={handleDownload}
              disabled={!results}
              title={results ? "Download results" : "No results available"}
>
              Download Results
</button>
</div>
</div>
</div>
</div>
  );
}