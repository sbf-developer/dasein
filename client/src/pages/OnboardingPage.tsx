import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Gauge, ListTodo, Plus, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const STEPS = ["welcome", "goals", "kpis", "todos", "done"] as const;
const SETUP_STEPS = 3;

type KpiDraft = { title: string; target: string };

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-colors focus:border-[var(--color-text-tertiary)]";

const actionClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-text)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40";

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
      <div className="flex h-full items-center justify-center bg-[var(--color-surface)]">
        <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.onboardingCompletedAt) return <Navigate to="/" replace />;

  const setupStep = step;
  const firstName = user.name?.split(" ")[0];
  const isSetupStep = step > 0 && step < STEPS.length - 1;

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
    <div className="flex h-full min-h-dvh flex-col bg-[var(--color-surface)]">
      <header className="flex h-14 shrink-0 items-center justify-between px-5 sm:px-10">
        <span className="text-[13px] font-medium tracking-[0.1em] text-[var(--color-text-secondary)]">
          Dasein
        </span>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Skip
          </button>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col justify-center px-5 sm:px-10">
        <div className="mx-auto w-full max-w-[26rem]">
          {isSetupStep && (
            <div className="mb-8 sm:mb-10">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: SETUP_STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i < setupStep ? "bg-[var(--color-text)]" : "bg-[var(--color-border)]"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex justify-between text-[11px] tracking-wide text-[var(--color-text-tertiary)]">
                <span>{stepMeta.label}</span>
                <span>
                  {setupStep} / {SETUP_STEPS}
                </span>
              </div>
            </div>
          )}

          <div key={STEPS[step]} className="animate-onboarding-in">
            {STEPS[step] === "welcome" && (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] shadow-[0_0_0_1px_var(--color-border-subtle)]">
                  <Sparkles size={22} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
                </div>
                <h1 className="mt-6 text-[1.65rem] font-semibold tracking-tight text-[var(--color-text)] sm:text-[1.75rem]">
                  {firstName ? `Welcome, ${firstName}` : "Welcome"}
                </h1>
                <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Set up your workspace in a minute — goals, metrics, and to-dos. Or skip and add them later.
                </p>
                <button type="button" onClick={next} className={`${actionClass} mt-8`}>
                  Get started
                  <ArrowRight size={15} strokeWidth={1.75} />
                </button>
              </div>
            )}

            {STEPS[step] === "goals" && (
              <StepShell
                icon={StepIcon}
                title="What are you working toward?"
                subtitle="Add personal goals. You can edit these anytime."
              >
                <ItemList items={goals} emptyHint="No goals yet" />
                <AddRow
                  value={goalInput}
                  onChange={setGoalInput}
                  onAdd={() => void addGoal()}
                  placeholder="e.g. Run a marathon"
                  disabled={adding || !goalInput.trim()}
                />
              </StepShell>
            )}

            {STEPS[step] === "kpis" && (
              <StepShell
                icon={StepIcon}
                title="What will you measure?"
                subtitle="Optional — track the numbers that matter."
              >
                <ItemList
                  items={kpis.map((k) => `${k.title} · ${k.target}`)}
                  emptyHint="No KPIs yet"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <OnboardingInput
                    value={kpiTitle}
                    onChange={(e) => setKpiTitle(e.target.value)}
                    placeholder="Metric name"
                    autoFocus
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <OnboardingInput
                      value={kpiTarget}
                      onChange={(e) => setKpiTarget(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void addKpi()}
                      placeholder="Target"
                      type="number"
                      className="w-24"
                    />
                    <AddButton
                      onClick={() => void addKpi()}
                      disabled={adding || !kpiTitle.trim() || !kpiTarget.trim()}
                    />
                  </div>
                </div>
              </StepShell>
            )}

            {STEPS[step] === "todos" && (
              <StepShell
                icon={StepIcon}
                title="What's on your to-do list?"
                subtitle="Everyday tasks to keep you moving."
              >
                <ItemList items={todos} emptyHint="Nothing here yet" />
                <AddRow
                  value={todoInput}
                  onChange={setTodoInput}
                  onAdd={() => void addTodo()}
                  placeholder="e.g. Buy groceries"
                  disabled={adding || !todoInput.trim()}
                />
              </StepShell>
            )}

            {STEPS[step] === "done" && (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-text)] text-white">
                  <Check size={22} strokeWidth={2} />
                </div>
                <h1 className="mt-6 text-[1.65rem] font-semibold tracking-tight text-[var(--color-text)] sm:text-[1.75rem]">
                  You're all set
                </h1>
                <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {goals.length + kpis.length + todos.length > 0
                    ? `Added ${[goals.length && `${goals.length} goal${goals.length > 1 ? "s" : ""}`, kpis.length && `${kpis.length} KPI${kpis.length > 1 ? "s" : ""}`, todos.length && `${todos.length} to-do${todos.length > 1 ? "s" : ""}`].filter(Boolean).join(", ")}.`
                    : "Your workspace is ready."}
                </p>
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={finishing}
                  className={`${actionClass} mt-8`}
                >
                  {finishing ? "Opening…" : "Go to Dasein"}
                  <ArrowRight size={15} strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>
      </main>

      {isSetupStep && (
        <footer className="shrink-0 border-t border-[var(--color-border-subtle)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10">
          <div className="mx-auto flex w-full max-w-[26rem] items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-full px-3 py-2 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={finishing}
              className={actionClass}
            >
              {step === STEPS.length - 2 ? "Finish" : "Continue"}
              <ArrowRight size={15} strokeWidth={1.75} />
            </button>
          </div>
        </footer>
      )}
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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-elevated)] shadow-[0_0_0_1px_var(--color-border-subtle)]">
        <Icon size={18} strokeWidth={1.75} className="text-[var(--color-text-secondary)]" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-[1.35rem]">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function OnboardingInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

function AddButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Add"
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-tertiary)] hover:text-[var(--color-text)] disabled:opacity-40"
    >
      <Plus size={16} strokeWidth={1.75} />
    </button>
  );
}

function AddRow({
  value,
  onChange,
  onAdd,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <OnboardingInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder={placeholder}
        autoFocus
        className="flex-1"
      />
      <AddButton onClick={onAdd} disabled={disabled} />
    </div>
  );
}

function ItemList({ items, emptyHint }: { items: string[]; emptyHint: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-[13px] text-[var(--color-text-tertiary)]">
        {emptyHint}
      </div>
    );
  }

  return (
    <ul className="max-h-[min(40vh,14rem)] space-y-1.5 overflow-y-auto overscroll-contain">
      {items.map((item, i) => (
        <li
          key={`${item}-${i}`}
          className="animate-onboarding-item flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <Check size={12} strokeWidth={2.5} className="shrink-0 text-[var(--color-text-tertiary)]" />
          <span className="min-w-0 flex-1 truncate">{item}</span>
        </li>
      ))}
    </ul>
  );
}
