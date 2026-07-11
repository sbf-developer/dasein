import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Gauge, ListTodo, Plus, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const STEPS = ["welcome", "goals", "kpis", "todos", "done"] as const;

type KpiDraft = { title: string; target: string };

export function OnboardingPage() {
  const { user, loading, patchUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [kpis, setKpis] = useState<KpiDraft[]>([]);
  const [kpiTitle, setKpiTitle] = useState("");
  const [kpiTarget, setKpiTarget] = useState("");
  const [todos, setTodos] = useState<string[]>([]);
  const [todoInput, setTodoInput] = useState("");

  const [adding, setAdding] = useState(false);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardingCompletedAt) return <Navigate to="/" replace />;

  const progress = step / (STEPS.length - 1);
  const firstName = user.name?.split(" ")[0];

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      const { onboardingCompletedAt } = await api.settings.completeOnboarding();
      patchUser({ onboardingCompletedAt });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup");
      setFinishing(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void finish();
  };

  const addGoal = async () => {
    const title = goalInput.trim();
    if (!title || adding) return;
    setAdding(true);
    setError(null);
    try {
      await api.goals.create({ title });
      setGoals((prev) => [...prev, title]);
      setGoalInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add goal");
    } finally {
      setAdding(false);
    }
  };

  const addKpi = async () => {
    const title = kpiTitle.trim();
    const target = parseFloat(kpiTarget);
    if (!title || Number.isNaN(target) || adding) return;
    setAdding(true);
    setError(null);
    try {
      await api.kpis.create({ title, targetValue: target });
      setKpis((prev) => [...prev, { title, target: kpiTarget.trim() }]);
      setKpiTitle("");
      setKpiTarget("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add KPI");
    } finally {
      setAdding(false);
    }
  };

  const addTodo = async () => {
    const title = todoInput.trim();
    if (!title || adding) return;
    setAdding(true);
    setError(null);
    try {
      await api.doList.create({ title });
      setTodos((prev) => [...prev, title]);
      setTodoInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to-do");
    } finally {
      setAdding(false);
    }
  };

  const stepMeta = {
    welcome: { icon: Sparkles, label: "Welcome" },
    goals: { icon: Target, label: "Goals" },
    kpis: { icon: Gauge, label: "KPIs" },
    todos: { icon: ListTodo, label: "To-do list" },
    done: { icon: Check, label: "Done" },
  }[STEPS[step]];

  const StepIcon = stepMeta.icon;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-surface)]">
      <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
        <span className="text-sm font-medium tracking-[0.08em] text-[var(--color-text-secondary)]">
          Dasein
        </span>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 px-5 pb-8 sm:px-8">
        {step > 0 && step < STEPS.length - 1 && (
          <div className="mb-8">
            <div className="h-0.5 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-text)] transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-[var(--color-text-tertiary)]">
              <span>{stepMeta.label}</span>
              <span>
                {step} of {STEPS.length - 2}
              </span>
            </div>
          </div>
        )}

        <div key={STEPS[step]} className="animate-onboarding-in">
          {STEPS[step] === "welcome" && (
            <div className="flex flex-col items-center pt-12 text-center sm:pt-20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] shadow-[0_0_0_1px_var(--color-border-subtle)]">
                <Sparkles size={24} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
              </div>
              <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                {firstName ? `Welcome, ${firstName}` : "Welcome"}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Let's set up your workspace in under a minute. Add a few goals, metrics, and to-dos — or skip and do it later.
              </p>
              <Button variant="primary" className="mt-10 px-6 py-2.5" onClick={next}>
                Get started
                <ArrowRight size={15} />
              </Button>
            </div>
          )}

          {STEPS[step] === "goals" && (
            <StepShell
              icon={StepIcon}
              title="What are you working toward?"
              subtitle="Add one or more personal goals. You can always change these later."
            >
              <ItemList items={goals} emptyHint="No goals yet — add your first one below." />
              <div className="mt-4 flex gap-2">
                <Input
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addGoal()}
                  placeholder="e.g. Run a marathon"
                  className="flex-1"
                  autoFocus
                />
                <Button variant="subtle" onClick={() => void addGoal()} disabled={adding || !goalInput.trim()}>
                  <Plus size={15} />
                </Button>
              </div>
            </StepShell>
          )}

          {STEPS[step] === "kpis" && (
            <StepShell
              icon={StepIcon}
              title="What will you measure?"
              subtitle="KPIs are the numbers that tell you if you're on track."
            >
              <ItemList
                items={kpis.map((k) => `${k.title} — target ${k.target}`)}
                emptyHint="Optional — skip if you're not tracking numbers yet."
              />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={kpiTitle}
                  onChange={(e) => setKpiTitle(e.target.value)}
                  placeholder="Metric name"
                  className="flex-1"
                  autoFocus
                />
                <Input
                  value={kpiTarget}
                  onChange={(e) => setKpiTarget(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addKpi()}
                  placeholder="Target"
                  type="number"
                  className="w-full sm:w-28"
                />
                <Button
                  variant="subtle"
                  onClick={() => void addKpi()}
                  disabled={adding || !kpiTitle.trim() || !kpiTarget.trim()}
                >
                  <Plus size={15} />
                </Button>
              </div>
            </StepShell>
          )}

          {STEPS[step] === "todos" && (
            <StepShell
              icon={StepIcon}
              title="What's on your to-do list?"
              subtitle="Everyday tasks to keep you moving. Add as many as you like."
            >
              <ItemList items={todos} emptyHint="Nothing here yet — add a quick to-do below." />
              <div className="mt-4 flex gap-2">
                <Input
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addTodo()}
                  placeholder="e.g. Buy groceries"
                  className="flex-1"
                  autoFocus
                />
                <Button variant="subtle" onClick={() => void addTodo()} disabled={adding || !todoInput.trim()}>
                  <Plus size={15} />
                </Button>
              </div>
            </StepShell>
          )}

          {STEPS[step] === "done" && (
            <div className="flex flex-col items-center pt-12 text-center sm:pt-20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-text)] text-white">
                <Check size={24} strokeWidth={2} />
              </div>
              <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                You're all set
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {goals.length + kpis.length + todos.length > 0
                  ? `Added ${[goals.length && `${goals.length} goal${goals.length > 1 ? "s" : ""}`, kpis.length && `${kpis.length} KPI${kpis.length > 1 ? "s" : ""}`, todos.length && `${todos.length} to-do${todos.length > 1 ? "s" : ""}`].filter(Boolean).join(", ")}. Your workspace is ready.`
                  : "Your workspace is ready. You can add goals, KPIs, and to-dos anytime from the sidebar."}
              </p>
              <Button
                variant="primary"
                className="mt-10 px-6 py-2.5"
                onClick={() => void finish()}
                disabled={finishing}
              >
                {finishing ? "Finishing…" : "Go to Dasein"}
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        {step > 0 && step < STEPS.length - 1 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
            >
              Back
            </button>
            <Button variant="primary" className="px-5 py-2" onClick={next} disabled={finishing}>
              {step === STEPS.length - 2 ? "Finish" : "Continue"}
              <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Target;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] shadow-[0_0_0_1px_var(--color-border-subtle)]">
        <Icon size={20} strokeWidth={1.75} className="text-[var(--color-text-secondary)]" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ItemList({ items, emptyHint }: { items: string[]; emptyHint: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
        {emptyHint}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className="animate-onboarding-item flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5 text-sm text-[var(--color-text)]"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <Check size={13} strokeWidth={2.5} className="shrink-0 text-[var(--color-accent)]" />
          <span className="min-w-0 flex-1 truncate">{item}</span>
        </li>
      ))}
    </ul>
  );
}
