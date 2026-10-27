import React, { useMemo, useRef, useState } from "react";

const MAX_TRANSCRIPT_FILE_SIZE = 3 * 1024 * 1024;
const MINUTES_API_ERROR =
  'Minutes server returned an invalid response. Run "npm run dev" to start both the React app and API server.';
const SAMPLE_TRANSCRIPT = `Maya: Thanks, everyone. The main goal today is to get the spring launch ready for April.
Maya: We agreed to move the launch date to April 18 so the team has time to finish testing.
Jordan: I'll send the updated launch timeline to the group by Friday.
Priya: I will review the onboarding emails and share edits by Thursday.
Maya: Let's keep the first launch focused on the core features. The advanced analytics can come later.
Jordan: We decided to use the customer feedback from last week's pilot as our launch checklist.
Priya: The support team needs to prepare a short FAQ before launch.
Maya: Great. Jordan will coordinate with support on the FAQ, and I'll schedule a final review for next Tuesday.
Jordan: We should also check with the design team about the empty states.
Maya: Let's meet again next Wednesday to confirm we're on track.`;

function Icon({ name }) {
  const paths = {
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function App() {
  const fileInputRef = useRef(null);
  const [transcript, setTranscript] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [minutes, setMinutes] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [notice, setNotice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const wordCount = useMemo(() => transcript.trim() ? transcript.trim().split(/\s+/).length : 0, [transcript]);

  async function handleTranscriptFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setNotice("");
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setErrorMessage("Choose a plain-text .txt file.");
      input.value = "";
      return;
    }
    if (file.size > MAX_TRANSCRIPT_FILE_SIZE) {
      setErrorMessage("The .txt file must be 3 MB or smaller.");
      input.value = "";
      return;
    }
    if (file.size === 0) {
      setErrorMessage("This .txt file is empty.");
      input.value = "";
      return;
    }

    setIsReadingFile(true);
    try {
      const contents = (await file.text()).replace(/^\uFEFF/, "");
      if (!contents.trim()) {
        setErrorMessage("This .txt file does not contain any readable transcript text.");
        return;
      }
      if (contents.includes("\0")) {
        setErrorMessage("This file doesn't appear to be a plain-text transcript.");
        return;
      }
      setTranscript(contents);
      setUploadedFileName(file.name);
      setMinutes(null);
    } catch (error) {
      setErrorMessage("Couldn't read this file. Try saving it as UTF-8 plain text and uploading it again.");
      console.error("Could not read uploaded transcript file.", error);
    } finally {
      setIsReadingFile(false);
      input.value = "";
    }
  }

  async function generateMinutes() {
    if (!transcript.trim() || isReadingFile) return;
    setIsGenerating(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`${MINUTES_API_ERROR} (HTTP ${response.status})`);
      }
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error(MINUTES_API_ERROR);
      }
      if (!response.ok) throw new Error(result.error || "Could not generate meeting minutes.");
      setMinutes(result);
      setActiveTab("Overview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not reach the minutes server. Check that the app is running and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyMinutes() {
    if (!minutes) return;
    const text = JSON.stringify(minutes, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Minutes copied to clipboard");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (error) {
      setNotice("Clipboard access is unavailable in this browser");
      console.error("Could not copy meeting minutes.", error);
    }
  }

  function downloadMinutes() {
    if (!minutes) return;
    const blob = new Blob([JSON.stringify(minutes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meeting-minutes.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="MeetBrief home">
          <span className="brand-mark"><Icon name="sparkle" /></span>
          <span>meetbrief<span className="brand-period">.</span></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button className="nav-item selected"><span className="nav-icon"><Icon name="file" /></span> Transcript to minutes</button>
        <div className="sidebar-note">
          <span className="note-icon"><Icon name="sparkle" /></span>
          <strong>Clear meetings.<br />Clear next steps.</strong>
          <p>Turn the conversation into a plan your team can act on.</p>
        </div>
        <div className="sidebar-footer"><span className="status-dot" /> OpenAI API · key stays server-side</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Transcript to minutes</strong></div>
          <div className="local-badge"><span className="status-dot" /> OpenAI-powered</div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> MEETING WORKSPACE</div>
            <h1>From conversation<br className="mobile-break" /> to <span>clear next steps.</span></h1>
            <p className="heading-copy">Drop in a transcript. Get the important parts, without the noise.</p>
          </div>
          <div className="heading-decoration" aria-hidden="true">
            <div className="deco-orbit orbit-one" /><div className="deco-orbit orbit-two" />
            <span className="deco-star">✳</span><span className="deco-dot" />
          </div>
        </section>

        <div className="workspace-grid">
          <section className="panel input-panel">
            <div className="panel-heading">
              <div><span className="step-label">01 / INPUT</span><h2>Your transcript</h2></div>
              <div className="input-tools">
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  accept=".txt,text/plain"
                  aria-label="Upload a transcript text file"
                  onChange={handleTranscriptFile}
                />
                <button className="text-button" disabled={isReadingFile || isGenerating} onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" /> {isReadingFile ? "Reading…" : "Upload .txt"}
                </button>
                <button className="text-button" onClick={() => { setTranscript(SAMPLE_TRANSCRIPT); setUploadedFileName(""); setMinutes(null); setErrorMessage(""); }}>
                  <Icon name="file" /> Try a sample
                </button>
              </div>
            </div>
            <div className="input-meta"><span>{uploadedFileName || "Paste or upload a .txt transcript"}</span><span>{wordCount.toLocaleString()} words</span></div>
            <textarea
              aria-label="Meeting transcript"
              placeholder={"Paste a transcript here...\n\nSpeaker labels help us attribute action items to the right person."}
              value={transcript}
              onChange={(event) => { setTranscript(event.target.value); setUploadedFileName(""); }}
            />
            {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
            <div className="input-footnote"><span className="info-mark">i</span> Speaker labels like “Alex:” help identify owners accurately.</div>
            <button className="primary-button" disabled={!transcript.trim() || isGenerating || isReadingFile} onClick={generateMinutes}>
              <Icon name="sparkle" /> {isGenerating ? "Generating with OpenAI…" : "Generate meeting minutes"} <span className="button-arrow">{isGenerating ? "…" : "→"}</span>
            </button>
            <div className="privacy-caption"><span className="lock-mark">◈</span> Transcript is sent to OpenAI through the server.</div>
          </section>

          <section className={`panel results-panel ${minutes ? "has-results" : ""}`}>
            {!minutes ? (
              <div className="empty-state">
                <div className="empty-art">
                  <div className="art-card art-back"><span /><span /><span /></div>
                  <div className="art-card art-front"><i /><span /><span /><span /></div>
                  <div className="art-check"><Icon name="check" /></div>
                </div>
                <span className="step-label">02 / YOUR MINUTES</span>
                <h2>Good notes make<br />great follow-through.</h2>
                <p>Your meeting summary, key decisions, and action items will show up here.</p>
                <div className="empty-features"><span><Icon name="check" /> Meeting summary</span><span><Icon name="check" /> Decisions</span><span><Icon name="check" /> Action items</span></div>
              </div>
            ) : (
              <>
                <div className="results-heading">
                  <div><span className="step-label">02 / YOUR MINUTES</span><h2>Meeting minutes</h2></div>
                  <div className="result-actions">
                    <button className="icon-button" title="Copy minutes as JSON" aria-label="Copy minutes as JSON" onClick={copyMinutes}><Icon name="copy" /></button>
                    <button className="icon-button" title="Download minutes as JSON" aria-label="Download minutes as JSON" onClick={downloadMinutes}><Icon name="upload" /></button>
                  </div>
                </div>
                <div className="result-meta"><span><Icon name="clock" /> {minutes.wordCount.toLocaleString()} words · {minutes.chunkCount} {minutes.chunkCount === 1 ? "chunk" : "chunks"}</span><span className="local-tag">{minutes.model}</span></div>
                {notice && <div className="notice" role="status">{notice}</div>}
                <div className="tabs" role="tablist" aria-label="Meeting minutes sections">
                  {["Overview", `Decisions (${minutes.decisions.length})`, `Actions (${minutes.actionItems.length})`].map((tab) => {
                    const tabName = tab.split(" (")[0];
                    return <button key={tab} role="tab" aria-selected={activeTab === tabName} className={activeTab === tabName ? "active" : ""} onClick={() => setActiveTab(tabName)}>{tab}</button>;
                  })}
                </div>
                <div className="result-content">
                  {(activeTab === "Overview" || activeTab === "Summary") && (
                    <>
                      <section className="result-section">
                        <div className="section-title"><span className="section-icon summary-icon"><Icon name="sparkle" /></span><h3>Summary</h3></div>
                        {minutes.summary.length ? <ul className="summary-list">{minutes.summary.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="no-items">No summary could be extracted. Try adding more transcript detail.</p>}
                      </section>
                      <section className="result-section">
                        <div className="section-title"><span className="section-icon decision-icon"><Icon name="check" /></span><h3>Decisions</h3><span className="count-pill">{minutes.decisions.length}</span></div>
                        {minutes.decisions.length ? <ul className="decision-list">{minutes.decisions.map((decision, index) => <li key={`${index}-${decision}`}>{decision}</li>)}</ul> : <p className="no-items">No explicit decisions found.</p>}
                      </section>
                      <section className="result-section action-preview">
                        <div className="section-title"><span className="section-icon action-icon"><Icon name="arrow" /></span><h3>Action items</h3><span className="count-pill">{minutes.actionItems.length}</span></div>
                        {minutes.actionItems.length ? <ActionList items={minutes.actionItems.slice(0, 3)} /> : <p className="no-items">No explicit action items found.</p>}
                        {minutes.actionItems.length > 3 && <button className="show-more" onClick={() => setActiveTab("Actions")}>View all {minutes.actionItems.length} action items →</button>}
                      </section>
                    </>
                  )}
                  {activeTab === "Decisions" && <section className="result-section"><div className="section-title"><span className="section-icon decision-icon"><Icon name="check" /></span><h3>Decisions</h3><span className="count-pill">{minutes.decisions.length}</span></div>{minutes.decisions.length ? <ul className="decision-list">{minutes.decisions.map((decision, index) => <li key={`${index}-${decision}`}>{decision}</li>)}</ul> : <p className="no-items">No explicit decisions found.</p>}</section>}
                  {activeTab === "Actions" && <section className="result-section"><div className="section-title"><span className="section-icon action-icon"><Icon name="arrow" /></span><h3>Action items</h3><span className="count-pill">{minutes.actionItems.length}</span></div>{minutes.actionItems.length ? <ActionList items={minutes.actionItems} /> : <p className="no-items">No explicit action items found.</p>}</section>}
                </div>
                <div className="limitation-note"><span className="info-mark">i</span><p>{minutes.speakerLabelsFound ? "Owners are only attributed when the speaker or assignee is explicitly named." : "No speaker labels found. Owners are left unassigned rather than guessed. Add labels such as “Alex:” for better attribution."} AI-generated minutes can miss context; review details before sharing.</p></div>
              </>
            )}
          </section>
        </div>
        <footer className="page-footer"><span>MEETBRIEF <span className="brand-period">·</span> BETTER MEETINGS, BY DESIGN</span><span>Server-side API key. AI-generated minutes.</span></footer>
      </main>
    </div>
  );
}

function ActionList({ items }) {
  return (
    <div className="action-list">
      {items.map((item) => (
        <article className="action-row" key={item.id}>
          <span className="todo-checkbox" aria-hidden="true" />
          <div className="action-body"><p>{item.task}</p><div className="action-meta"><span className={item.owner ? "owner-chip" : "unassigned-chip"}>{item.owner ? item.owner : "Owner not stated"}</span><span className="deadline-chip">{item.deadline ?? "No deadline stated"}</span></div></div>
        </article>
      ))}
    </div>
  );
}

export default App;
