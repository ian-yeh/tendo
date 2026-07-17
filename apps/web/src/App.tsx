import { useState, useEffect } from 'react';
import { Eye, Terminal, Zap, Cpu, Key, Monitor, Shield, Check, Copy } from 'lucide-react';

type Tab = 'npx' | 'skills' | 'npm';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const [copied, setCopied] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 550);
    return () => clearInterval(interval);
  }, []);

  const tabCommands: Record<Tab, string> = {
    npx: 'npx -y @ianyeh/tendo look https://example.com',
    skills: 'npx skills add ian-yeh/tendo --skill tendo',
    npm: 'npm install -g @ianyeh/tendo',
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tabCommands[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-[#f9f8f6] text-gray-800 min-h-screen font-sans relative overflow-hidden">
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 grid-bg pointer-events-none z-0"></div>

      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(249, 248, 246, 0.75)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-widest text-teal-800">tendo</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-teal-800/20 bg-teal-800/5 text-teal-800 rounded">v0.1.0</span>
        </div>
        <ul className="hidden md:flex gap-8 list-none font-mono text-xs">
          <li><a href="#demo" className="text-gray-600 hover:text-black transition-colors">[ demo ]</a></li>
          <li><a href="#why" className="text-gray-600 hover:text-black transition-colors">[ why tendo? ]</a></li>
          <li><a href="#integrations" className="text-gray-600 hover:text-black transition-colors">[ integrations ]</a></li>
        </ul>
        <a href="https://github.com/ian-yeh/tendo" className="bracket-btn font-mono text-xs">github</a>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-32 text-center max-w-4xl mx-auto">
        <h1 className="font-serif text-5xl md:text-7xl font-normal leading-[1.1] tracking-tight text-gray-950 mb-6 max-w-3xl">
          Give your coding agents <span className="font-mono text-teal-700 text-3xl md:text-5xl">[</span>eyes<span className="font-mono text-teal-700 text-3xl md:text-5xl">]</span> and <span className="font-mono text-teal-700 text-3xl md:text-5xl"> [</span>hands<span className="font-mono text-teal-700 text-3xl md:text-5xl">]</span>.
        </h1>

        <p className="text-gray-700 font-light text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          Install a single skill to immediately upscale your agent's vision capabilities. Zero config, daemon-persistent browser control with no models, no API keys, and zero token overhead.
        </p>

        {/* INSTALLER TAB SELECTOR */}
        <div className="w-full max-w-lg border rounded-lg overflow-hidden bg-white/50 backdrop-blur" style={{ borderColor: 'var(--border)' }}>
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            {(['skills', 'npx', 'npm'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 font-mono text-xs py-3.5 border-r last:border-r-0 transition-colors uppercase tracking-wider ${activeTab === tab ? 'text-teal-800 bg-gray-100/50 border-b-2 border-b-teal-800' : 'text-gray-500 hover:text-gray-800'}`}
                style={{ borderColor: 'var(--border)' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-4 flex items-center justify-between font-mono text-sm md:text-base bg-white/90">
            <span className="text-gray-700 text-left select-all pr-4 break-all font-medium">
              <span className="text-gray-400 select-none">$ </span>
              {tabCommands[activeTab]}
            </span>
            <button 
              onClick={handleCopy}
              className="p-2 border border-gray-200 hover:border-gray-400 rounded bg-white text-gray-500 hover:text-black transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-teal-700" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </section>

      {/* CORE SPLIT SECTION (Why & How) */}
      <section id="demo" className="relative z-10 px-6 py-24 border-t max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start" style={{ borderColor: 'var(--border)' }}>
        
        {/* LEFT COLUMN: INTERACTIVE TERMINAL LOOP */}
        <div className="space-y-6">
          <div className="terminal">
            <div className="terminal-bar">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              </div>
              <span className="terminal-title">tendo look & act — agent session loop</span>
              <span className="w-8"></span>
            </div>
            
            <div className="terminal-body select-text">
              <div><span className="t-prompt">$ </span><span className="t-cmd">tendo look https://example.com --session s1 --annotate</span></div>
              <div className="t-comment">  # Launch persistent session; capture visual layout & annotated image</div>
              <div><span className="t-out">  ↳ daemon active (socket: /tmp/tendo-daemon.sock)</span></div>
              <div><span className="t-out">  ↳ screenshot saved: /tmp/tendo/s1_annotated.png</span></div>
              <div><span className="t-out">  ↳ elements mapped: 28 items</span></div>
              <div>&nbsp;</div>
              <div><span className="t-comment">{"  [ { \"id\": 1, \"role\": \"link\", \"name\": \"Products\" }, { \"id\": 3, \"role\": \"button\", \"name\": \"Sign In\" } ]"}</span></div>
              <div>&nbsp;</div>
              <div><span className="t-prompt">$ </span><span className="t-cmd">tendo act --session s1 --element 3</span></div>
              <div className="t-comment">  # Click target item resolved by fingerprint</div>
              <div><span className="t-out">  ↳ action: click button "Sign In" (#3)</span></div>
              <div><span className="t-out">  ↳ resolved fingerprint (button:Sign In) ✓</span></div>
              <div><span className="t-out">  ↳ state change detected: navigated to /signin</span></div>
              <div><span className="t-out">  ↳ post-action state returned inline:</span></div>
              <div className="t-comment">{"    { \"url\": \"https://example.com/signin\", \"elements\": 14, \"errors\": 0 }"}</div>
              <div>&nbsp;</div>
              <div><span className="t-success">  ✓ s1 session active (TTL 600s)</span>{cursorVisible && <span className="cursor"></span>}</div>
            </div>
          </div>

          <div className="p-4 border border-teal-800/10 bg-teal-800/5 rounded-lg flex items-start gap-3">
            <Shield size={16} className="text-teal-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed font-light">
              Tendo doesn't communicate with LLM endpoints directly. The calling agent (e.g. Claude Code) reads the element map and output screenshot locally, then writes commands back to the CLI in real-time.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: WHY TENDO TEXT */}
        <div id="why" className="space-y-10">
          <div>
            <h2 className="font-serif text-4xl italic font-normal text-gray-950 mb-6">
              Browser control, built for agent workflows.
            </h2>
            <p className="text-gray-700 font-light leading-relaxed text-lg md:text-xl">
              We love Playwright, but it was built for human QA writing scripts. Coding agents need fast, lightweight loops of glancing at a page, clicking elements, and seeing changes in milliseconds. Tendo provides the raw eyes and hands so your agent can drive any web page deterministically.
            </p>
          </div>

          <div className="space-y-6">
            <div className="feature-row">
              <div className="feature-title-serif">
                <span>01.</span>
                <span>Grounded Maps</span>
              </div>
              <p className="feature-desc-text text-base md:text-lg text-gray-600 font-light leading-relaxed">
                Pierces shadow-DOMs and indexes every interactable element with bounding boxes. No more blind clicking or fragile CSS selector failures.
              </p>
            </div>

            <div className="feature-row">
              <div className="feature-title-serif">
                <span>02.</span>
                <span>Persistent Sessions</span>
              </div>
              <p className="feature-desc-text text-base md:text-lg text-gray-600 font-light leading-relaxed">
                Keeps a background Unix socket daemon running Chromium. Shaves browser boot latency down to milliseconds and keeps element handles alive across agent turns.
              </p>
            </div>

            <div className="feature-row">
              <div className="feature-title-serif">
                <span>03.</span>
                <span>Token Efficiency</span>
              </div>
              <p className="feature-desc-text text-base md:text-lg text-gray-600 font-light leading-relaxed">
                Replaces massive HTML dumps with a compressed outline that uses 98% fewer tokens, filtering out network noise and console errors automatically.
              </p>
            </div>
          </div>


        </div>

      </section>

      {/* PERFORMANCE & ECONOMICS (AXI-style charts)
      <section id="performance" className="relative z-10 px-6 py-24 border-t max-w-6xl mx-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="font-mono text-[10px] tracking-wider text-teal-800 uppercase mb-3">
            // benchmark validation
          </div>
          <h2 className="font-serif text-4xl font-normal text-gray-950 mb-4">
            Optimized for the agent budget.
          </h2>
          <p className="text-gray-650 font-light text-sm leading-relaxed">
            Sending full HTML payloads or loading a new browser session on every prompt kills context window budget and agent speed. Tendo optimizes both parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          <div className="border p-6 md:p-8 rounded-lg bg-white/40" style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[10px] uppercase text-gray-500 tracking-wider">Avg. Context Overhead (Tokens per Step)</span>
            <h3 className="font-serif text-xl italic font-normal text-gray-950 mt-1 mb-6">Lower is cheaper</h3>
            
            <div className="space-y-5 font-mono text-[11px]">
              <div>
                <div className="flex justify-between mb-1.5 text-gray-600">
                  <span>Raw DOM / HTML Dump</span>
                  <span>~120,000 tokens</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1.5 text-gray-600">
                  <span>Markdown Scraped Content</span>
                  <span>~35,000 tokens</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full rounded-full" style={{ width: '29%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-teal-800 font-semibold">
                  <span>Tendo Element Map (TOON)</span>
                  <span>~1,800 tokens</span>
                </div>
                <div className="w-full bg-teal-50 h-2.5 rounded-full overflow-hidden border border-teal-800/20">
                  <div className="bg-teal-700 h-full rounded-full shadow-[0_0_8px_rgba(15,118,110,0.15)]" style={{ width: '1.5%', minWidth: '4px' }}></div>
                </div>
              </div>
            </div>
            <div className="mt-8 text-[11px] text-gray-500 font-light leading-relaxed">
              * Based on typical e-commerce and dashboard UI page steps. Tendo selectively summarizes only interactable elements and maps coordinates.
            </div>
          </div>

          <div className="border p-6 md:p-8 rounded-lg bg-white/40" style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[10px] uppercase text-gray-500 tracking-wider">Browser Startup Latency (Seconds)</span>
            <h3 className="font-serif text-xl italic font-normal text-gray-950 mt-1 mb-6">Lower is faster</h3>
            
            <div className="space-y-5 font-mono text-[11px]">
              <div>
                <div className="flex justify-between mb-1.5 text-gray-600">
                  <span>Cold Playwright Launch</span>
                  <span>4.2s</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1.5 text-gray-600">
                  <span>Cold CDP Reattach (Loss of Handles)</span>
                  <span>2.1s</span>
                </div>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-teal-800 font-semibold">
                  <span>Tendo Unix Socket Daemon</span>
                  <span>0.3s</span>
                </div>
                <div className="w-full bg-teal-50 h-2.5 rounded-full overflow-hidden border border-teal-800/20">
                  <div className="bg-teal-700 h-full rounded-full shadow-[0_0_8px_rgba(15,118,110,0.15)]" style={{ width: '7%' }}></div>
                </div>
              </div>
            </div>
            <div className="mt-8 text-[11px] text-gray-500 font-light leading-relaxed">
              * Tendo daemon runs in the background. Subsequent actions execute via Unix socket connection on the pre-initialized browser instance.
            </div>
          </div>

        </div>
      </section>
      */}

      {/* INTEGRATIONS & ECOSYSTEM */}
      <section id="integrations" className="relative z-10 px-6 py-24 border-t max-w-6xl mx-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col md:flex-row gap-12 lg:gap-16">
          <div className="md:w-1/3">
            <h2 className="font-serif text-4xl md:text-5xl italic font-normal text-gray-950 leading-tight">
              Works with your existing agent stack.
            </h2>
          </div>
          
          <div className="md:w-2/3">
            <p className="text-gray-700 font-light leading-relaxed text-lg md:text-xl">
              Tendo exposes a pure CLI interface that returns standard structured payloads (TOON or JSON), making it immediately compatible with any shell-enabled LLM agent. It works out of the box with <strong className="font-medium text-gray-950">Claude Code</strong>, <strong className="font-medium text-gray-950">Antigravity</strong>, <strong className="font-medium text-gray-950">Codex</strong>, and custom agent loops.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t px-6 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-mono text-xs text-gray-700">tendo — browser eyes and hands for coding agents</span>
          <span className="text-[10px] text-gray-500 font-mono">MIT License • Built by Ian Yeh</span>
        </div>
        <div className="flex gap-8 font-mono text-xs text-gray-600">
          <a href="https://github.com/ian-yeh/tendo" className="hover:text-black transition-colors">[ github ]</a>
          <a href="https://ianyeh.ca" className="hover:text-black transition-colors">[ ianyeh.ca ]</a>
        </div>
      </footer>
    </div>
  );
}
