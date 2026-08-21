const STEPS = [
  { step: 1, label: "Basic Information" },
  { step: 2, label: "Special Request" },
  { step: 3, label: "Payment Method" },
] as const;

// Three visual states, confirmed by two Figma exports showing step 1
// active (step 2/3 = upcoming) and step 2 active (step 1 = completed,
// step 3 = upcoming) — completed and upcoming are NOT the same style.
function stepStyles(step: number, current: number) {
  if (step === current) {
    return { box: "bg-[#E76B39]", number: "text-white", label: "text-[#E76B39]" };
  }
  if (step < current) {
    return { box: "bg-[#FAEDE8]", number: "text-[#E76B39]", label: "text-[#2A2E3F]" };
  }
  return { box: "bg-[#F1F2F6]", number: "text-[#9AA1B9]", label: "text-[#9AA1B9]" };
}

export function WizardStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-row items-start gap-15 border-b border-[#E4E6ED] py-10">
      {STEPS.map(({ step, label }) => {
        const styles = stepStyles(step, current);
        return (
          <li key={step} className="flex flex-row items-center gap-4">
            <span className={`flex h-16.5 w-16.5 flex-none items-center justify-center rounded ${styles.box}`}>
              <span
                className={`[font-family:var(--font-inter)] text-3xl leading-[150%] font-semibold tracking-[-0.02em] ${styles.number}`}
              >
                {step}
              </span>
            </span>
            <span
              className={`whitespace-nowrap [font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] ${styles.label}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
