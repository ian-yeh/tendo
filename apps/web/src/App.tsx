import { useState, useEffect } from 'react';
import { Eye, MessageSquare, RefreshCw, Zap, Monitor, BarChart3 } from 'lucide-react';

export default function App() {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 550);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-100 flex items-center justify-between px-12 py-5 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)' }}>
        <span className="font-mono text-sm font-medium" style={{ color: 'var(--accent)', letterSpacing: '0.02em' }}>tendo</span>
        <ul className="flex gap-8 list-none">
          <li><a href="#demo" className="text-xs font-normal hover:!text-white transition-colors" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>demo</a></li>
          <li><a href="#features" className="text-xs font-normal hover:!text-white transition-colors" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>features</a></li>
          <li><a href="#how" className="text-xs font-normal hover:!text-white transition-colors" style={{ color: 'var(--text-muted)', letterSpacing: '0.02em' }}>how it works</a></li>
        </ul>
        <a href="https://github.com/ian-yeh/tendo" className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-mono hover:!text-white transition-colors" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', transition: 'color 0.15s ease, border-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          github
        </a>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center px-8 py-32 relative overflow-hidden" style={{ paddingTop: '8rem' }}>
        {/* Grid background */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)',
        }}></div>

        <div className="relative z-10 max-w-4xl text-center space-y-8">
          <h1 className="fade-up font-serif text-5xl md:text-7xl font-normal leading-tight" style={{ letterSpacing: '-0.02em' }}>
            Autonomous QA<br />agent that tests<br />your web app the<br /><em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>way a person would.</em>
          </h1>

          <p className="fade-up delay-2 font-mono text-sm md:text-base" style={{ color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
            No test scripts. No selectors. No maintenance.
          </p>

          <div className="fade-up delay-3 flex gap-4 items-center justify-center flex-wrap">
            <a href="https://github.com/ian-yeh/tendo" className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              view on github
            </a>
            <a href="#demo" className="btn-secondary">see it run →</a>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="px-8 py-20 max-w-4xl mx-auto">
        <div className="section-label">demo</div>

        <div className="terminal">
          <div className="terminal-bar">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
            <span className="terminal-title">tendo test — add to cart and checkout</span>
          </div>
          <div className="terminal-body">
            <div><span className="t-prompt">$ </span><span className="t-cmd">tendo test https://example-store.com -p "Add the first featured item to the cart and proceed to checkout"</span></div>
            <div>&nbsp;</div>
            <div><span className="t-out">  ↳ launching chromium via playwright</span></div>
            <div><span className="t-out">  ↳ navigating to https://example-store.com</span></div>
            <div><span className="t-out">  ↳ screenshotting viewport…</span></div>
            <div>&nbsp;</div>
            <div><span className="t-out">  step 1/3: Identify and click the first featured item</span></div>
            <div><span className="t-out">  ↳ vlm reasoning: "The first featured item is the card with the green "ADD TO CART" button at (287, 456)"</span></div>
            <div><span className="t-out">  ↳ action: click(287, 456)</span></div>
            <div><span className="t-out">  ↳ outcome verified ✓ — product added to cart</span></div>
            <div>&nbsp;</div>
            <div><span className="t-out">  step 2/3: Navigate to cart and review items</span></div>
            <div><span className="t-out">  ↳ action: click(92, 48) — cart icon</span></div>
            <div><span className="t-out">  ↳ outcome verified ✓ — cart drawer opened, 1 item present</span></div>
            <div>&nbsp;</div>
            <div><span className="t-out">  step 3/3: Proceed to checkout</span></div>
            <div><span className="t-out">  ↳ action: click(156, 512) — "Proceed to Checkout" button</span></div>
            <div><span className="t-out">  ↳ outcome verified ✓ — navigated to checkout page</span></div>
            <div>&nbsp;</div>
            <div><span className="t-success">  ✓ flow passed</span> <span className="t-dim"> · 8.3s</span>{cursorVisible && <span className="cursor"></span>}</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-8 py-20 max-w-4xl mx-auto">
        <div className="section-label">features</div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {[
            { Icon: Eye, title: 'Visual perception', desc: 'Tendo screenshots the viewport and uses a vision-language model to see elements exactly as your users do. No CSS selectors. No DOM inspection.' },
            { Icon: MessageSquare, title: 'Plain English flows', desc: 'Describe your test in conversational language. "Add the first item to cart and check out." Tendo translates intent to action.' },
            { Icon: RefreshCw, title: 'Provider-agnostic', desc: 'Switch between Gemini and Groq with a single flag. Easy to add new LLM backends without changing your tests.' },
            { Icon: Zap, title: 'Action-outcome loops', desc: 'Each action is verified against the expected result. If Tendo clicks the wrong element, it reasons about the failure and retries with context.' },
            { Icon: Monitor, title: 'Real browser automation', desc: 'Powered by Playwright on real Chromium. Full JavaScript execution, network control, and all the power of modern automation.' },
            { Icon: BarChart3, title: 'Generated reports', desc: 'HTML reports with per-step screenshots and reasoning. Understand exactly what Tendo saw and why it took each action.' },
          ].map((feature, idx) => {
            const IconComponent = feature.Icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-icon">
                  <IconComponent size={18} strokeWidth={1.5} />
                </div>
                <div className="feature-title">{feature.title}</div>
                <div className="feature-desc">{feature.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-8 py-20 max-w-4xl mx-auto">
        <div className="section-label">how it works</div>

        <div>
          {[
            { num: '01', title: 'Write your test prompt', desc: 'Give Tendo a URL and a plain English description of what you want to test. "Log in and create a new project" or "add items to cart and check out."', code: 'tendo test <url> -p "<prompt>"' },
            { num: '02', title: 'Tendo sees and reasons', desc: 'Tendo launches a real browser, takes a screenshot, and sends it to a vision-language model. The model decides what to click, type, or scroll based on what it sees on screen.', code: 'screenshot + VLM → action' },
            { num: '03', title: 'Verify and adapt', desc: 'After each action, Tendo checks whether the expected outcome occurred. If the page changed as expected, it moves to the next step. If not, it reasons about what went wrong and retries.', code: 'action → verify → next step' },
            { num: '04', title: 'Report results', desc: 'When the flow completes, Tendo reports pass/fail with per-step screenshots and LLM reasoning. Use `tendo report` to generate an interactive HTML report.', code: 'tendo report <url> -p "<prompt>"' },
          ].map((step, idx) => (
            <div key={idx} className="step">
              <span className="step-num">{step.num}</span>
              <div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
                <span className="step-code">{step.code}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-12 py-6 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>tendo — autonomous qa agent</span>
        <div className="flex gap-8">
          <a href="https://github.com/ian-yeh/tendo" className="font-mono text-xs hover:!text-white transition-colors" style={{ color: 'var(--text-dim)' }}>github</a>
          <a href="https://ianyeh.ca" className="font-mono text-xs hover:!text-white transition-colors" style={{ color: 'var(--text-dim)' }}>ianyeh.ca</a>
        </div>
      </footer>
    </div>
  );
}
