import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Users, Scale, Crown, MessageSquare, Shield, Zap } from 'lucide-react';

const MODELS = [
  { name: 'GPT-5.2', provider: 'OpenAI', color: '#10A37F' },
  { name: 'Gemini 3.1 Pro', provider: 'Google', color: '#4285F4' },
  { name: 'Claude Sonnet 4.6', provider: 'Anthropic', color: '#D97706' },
  { name: 'Claude Opus 4.5', provider: 'Anthropic', color: '#CA8A04' },
  { name: 'Grok 4.1 Fast', provider: 'xAI', color: '#1D9BF0' },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[--background] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[--background]/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <span className="font-[--font-display] text-base sm:text-lg font-bold tracking-tight text-foreground">
              LLM Council
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-3 sm:px-5 text-xs sm:text-sm">
                Get Started
              </Button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-wisteria/15 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-iris/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] rounded-full bg-ivory/60 blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border mb-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Sparkles className="w-3.5 h-3.5 text-iris" />
            <span className="text-sm font-medium text-muted-foreground">
              Powered by {MODELS.length} leading AI models
            </span>
          </div>

          <h1 className="font-[--font-display] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-[1.1]">
            One question.
            <br />
            <span className="bg-gradient-to-r from-iris via-wisteria to-iris bg-clip-text text-transparent">
              Many minds.
            </span>
            <br />
            Best answer.
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 leading-relaxed">
            LLM Council assembles the world's top AI models to deliberate on your question —
            with anonymous peer review — so you get the most thoughtful, well-vetted answer possible.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <SignUpButton mode="modal">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-iris/20 transition-all hover:shadow-xl hover:shadow-iris/30 hover:-translate-y-0.5">
                Start a Council
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </SignUpButton>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-8 h-12 text-base border-border hover:bg-secondary">
                See how it works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Model Parade */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-medium text-muted-foreground mb-8 uppercase tracking-widest">
            The Council Members
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {MODELS.map((model) => (
              <div
                key={model.name}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: model.color }}
                />
                <div>
                  <span className="font-[--font-display] font-semibold text-foreground text-sm">
                    {model.name}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {model.provider}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-[--font-display] text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Three stages of deliberation
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Like a panel of experts, each model contributes independently,
              reviews peers anonymously, then a chairman synthesizes the best answer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Stage 1 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-iris/10 flex items-center justify-center border border-iris/20">
                <span className="font-[--font-display] font-bold text-iris text-sm">01</span>
              </div>
              <div className="pt-8 p-6 rounded-2xl bg-card border border-border h-full shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-iris" />
                </div>
                <h3 className="font-[--font-display] text-lg font-semibold text-foreground mb-2">
                  Parallel Inquiry
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your question is sent simultaneously to all council members.
                  Each model responds independently, bringing its unique strengths
                  and perspective to the table.
                </p>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-wisteria/15 flex items-center justify-center border border-wisteria/25">
                <span className="font-[--font-display] font-bold text-wisteria text-sm">02</span>
              </div>
              <div className="pt-8 p-6 rounded-2xl bg-card border border-border h-full shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-wisteria" />
                </div>
                <h3 className="font-[--font-display] text-lg font-semibold text-foreground mb-2">
                  Anonymous Peer Review
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Responses are anonymized as "Response A, B, C..." then each model
                  evaluates and ranks all answers — eliminating brand bias from the
                  deliberation process.
                </p>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="group relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-iris/10 flex items-center justify-center border border-iris/20">
                <span className="font-[--font-display] font-bold text-iris text-sm">03</span>
              </div>
              <div className="pt-8 p-6 rounded-2xl bg-card border border-border h-full shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Scale className="w-5 h-5 text-iris" />
                </div>
                <h3 className="font-[--font-display] text-lg font-semibold text-foreground mb-2">
                  Chairman Synthesis
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A designated chairman model reviews all responses and peer rankings
                  to synthesize the definitive answer — combining the best insights
                  from every council member.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-transparent via-secondary/30 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-[--font-display] text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Why a council, not a chatbot?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Single-model answers have blind spots. A council catches what one model misses.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Diverse perspectives"
              description="GPT, Gemini, Claude, Opus, and Grok each approach problems differently. You get the benefit of all of them."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Bias elimination"
              description="Anonymous peer review prevents models from favoring their own kind. Rankings are earned on merit alone."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Parallel processing"
              description="All models are queried simultaneously. The council's deliberation is fast, not sequential."
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Full transparency"
              description="Inspect every model's response, every peer review, and every ranking. Nothing is hidden."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl bg-gradient-to-br from-iris/5 via-wisteria/8 to-iris/5 border border-border p-8 sm:p-12 md:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-wisteria/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-iris/10 blur-[60px] pointer-events-none" />

            <div className="relative">
              <h2 className="font-[--font-display] text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
                Ready to convene the council?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Ask your toughest questions and get answers that no single AI could produce alone.
              </p>
              <SignUpButton mode="modal">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-10 h-12 text-base font-semibold shadow-lg shadow-iris/20 transition-all hover:shadow-xl hover:shadow-iris/30 hover:-translate-y-0.5">
                  Get Started — Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Crown className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-[--font-display] text-sm font-semibold text-foreground">
              LLM Council
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-model AI deliberation system
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 text-iris">
        {icon}
      </div>
      <h3 className="font-[--font-display] text-base font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default LandingPage;
