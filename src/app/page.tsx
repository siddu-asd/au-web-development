import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GitBranch,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Orbit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HomeNavigation } from "@/components/home-navigation";
import { LearningOrbit } from "@/components/learning-orbit";

const capabilities = [
  {
    number: "01",
    icon: Blocks,
    title: "A fair start for every idea.",
    description: "Published projects are reserved atomically, so a student gets one clear project and nobody gets an accidental double-booking.",
    tag: "EXCLUSIVE ALLOCATION",
    color: "blue",
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Small steps. Real momentum.",
    description: "A configurable day-by-day checklist turns a project brief into a practical path from first sketch to final deploy.",
    tag: "GUIDED PROGRESS",
    color: "violet",
  },
  {
    number: "03",
    icon: GraduationCap,
    title: "Feedback that moves work forward.",
    description: "Faculty review versioned submissions, leave useful feedback, and keep project activity in one shared workspace.",
    tag: "FACULTY REVIEW",
    color: "cyan",
  },
];

const steps = [
  ["01", "Find your subject", "Browse published subject folders and explore projects that are actually available."],
  ["02", "Choose your challenge", "Read the requirements, pick your project, and get a personal completion timeline."],
  ["03", "Build, track, submit", "Check off daily progress, share your live work, and receive faculty feedback."],
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-grid" aria-hidden="true"/>
        <div className="hero-ambient hero-ambient-blue" aria-hidden="true"/>
        <div className="hero-ambient hero-ambient-violet" aria-hidden="true"/>
        <HomeNavigation/>

        <div className="home-hero-content">
          <div className="home-hero-copy">
            <div className="hero-eyebrow"><span className="hero-eyebrow-pulse"/>THE PROJECT WORKSPACE FOR WHAT&apos;S NEXT</div>
            <h1 className="hero-title">
              Turn curiosity<br/>into <span className="hero-title-gradient">something real.</span>
            </h1>
            <p className="hero-description">
              One place to find a challenge, build with purpose, and bring your work all the way to review.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="hero-primary-button">Start building <ArrowRight size={17}/></Link>
              <Link href="/login" className="hero-secondary-button">Explore your workspace <ArrowUpRight size={15}/></Link>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={15}/> Clear project timelines</span>
              <i aria-hidden="true"/>
              <span><ShieldCheck size={15}/> Role-based access</span>
            </div>
            <a href="#features" className="hero-scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowDown size={14}/></a>
          </div>

          <div className="home-hero-visual">
            <LearningOrbit/>
            <div className="hero-caption"><span className="hero-caption-line"/>A better way to make progress.</div>
          </div>
        </div>
        <div className="hero-bottom-line" aria-hidden="true"><span>PROJECTHUB / YOUR NEXT CHAPTER</span><span>LEARN · BUILD · SHARE</span></div>
      </section>

      <section id="features" className="capabilities-section">
        <div className="section-container">
          <div className="section-heading home-reveal">
            <div>
              <div className="section-kicker"><span>01</span> THE TOOLKIT</div>
              <h2>Make room for<br/><span>the work that matters.</span></h2>
            </div>
            <p>Less searching, less guessing. A connected workspace that gives students and faculty a clear view of every project stage.</p>
          </div>
          <div className="capability-grid">
            {capabilities.map(({ number, icon: Icon, title, description, tag, color }) => (
              <article key={number} className={`capability-card capability-${color} home-reveal`}>
                <div className="capability-card-top"><span className="capability-number">{number} / 03</span><span className="capability-icon"><Icon size={20}/></span></div>
                <div className="capability-tag"><span/>{tag}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="capability-card-foot"><span>BUILT INTO YOUR WORKFLOW</span><ArrowUpRight size={15}/></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="workflow-section">
        <div className="workflow-glow" aria-hidden="true"/>
        <div className="section-container workflow-layout">
          <div className="workflow-intro home-reveal">
            <div className="section-kicker section-kicker-light"><span>02</span> FROM BRIEF TO BUILD</div>
            <h2>Clarity at<br/>every <span>step.</span></h2>
            <p>A good project should feel exciting, not overwhelming. ProjectHub keeps the next step visible while the big picture stays in reach.</p>
            <Link href="/register" className="workflow-link">Find your starting point <ArrowRight size={15}/></Link>
            <div className="workflow-orbit-mark"><Orbit size={96} strokeWidth={0.7}/><span><Sparkles size={17}/></span></div>
          </div>
          <div className="workflow-steps">
            {steps.map(([number, title, description], index) => (
              <article className="workflow-step home-reveal" key={number}>
                <div className="workflow-step-index"><span>{number}</span>{index < steps.length - 1 && <i/>}</div>
                <div className="workflow-step-copy"><h3>{title}</h3><p>{description}</p></div>
                <Check size={16} className="workflow-step-check"/>
              </article>
            ))}
            <div className="workflow-progress"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
            <p className="workflow-progress-label"><Clock3 size={13}/> YOUR PACE, YOUR PROGRESS</p>
          </div>
        </div>
      </section>

      <section id="security" className="trust-section">
        <div className="section-container trust-layout">
          <div className="trust-visual home-reveal" aria-hidden="true">
            <div className="trust-ring trust-ring-outer"/>
            <div className="trust-ring trust-ring-middle"/>
            <div className="trust-ring trust-ring-inner"/>
            <div className="trust-lock"><LockKeyhole size={27}/></div>
            <span className="trust-node trust-node-one"/><span className="trust-node trust-node-two"/><span className="trust-node trust-node-three"/>
          </div>
          <div className="trust-copy home-reveal">
            <div className="section-kicker"><span>03</span> PRIVATE BY DESIGN</div>
            <h2>Your work.<br/><span>Your space.</span></h2>
            <p>Students, faculty, and administrators each get the right view for their role. Supabase Row Level Security protects personal project records at the data layer.</p>
            <ul>
              <li><ShieldCheck size={16}/> Role-aware portal access</li>
              <li><Layers3 size={16}/> Student-owned progress and submissions</li>
              <li><GitBranch size={16}/> Your code stays in your repository</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="section-container">
          <div className="footer-cta home-reveal">
            <div><div className="section-kicker section-kicker-light"><span>READY WHEN YOU ARE</span></div><h2>Let&apos;s make<br/><span>something matter.</span></h2></div>
            <Link href="/register" className="footer-cta-button">Create your account <ArrowRight size={16}/></Link>
            <div className="footer-spark" aria-hidden="true"><Sparkles size={58} strokeWidth={0.8}/></div>
          </div>
          <div className="footer-bottom">
            <div className="footer-brand"><span className="footer-brand-mark"><Blocks size={17}/></span><b>ProjectHub</b><span>Academic workspace</span></div>
            <p>Built for the brave first version.</p>
            <Link href="/login">Sign in <ArrowUpRight size={13}/></Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
