import React from "react";

// ---------- Industrial Precision design system: shared primitives ----------

export function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled = false, className = "", icon }) {
  const styles = {
    primary: "border-primary bg-primary text-on-primary hover:brightness-110",
    ghost: "border-outline bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary",
    danger: "border-outline bg-surface-container-lowest text-on-surface-variant hover:border-error hover:text-error",
    dark: "border-white/20 bg-transparent text-white hover:bg-white/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded border px-3 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {icon && <Icon name={icon} className="text-[16px]" />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-outline bg-surface-container text-on-surface-variant",
    success: "border-green-200 bg-green-100 text-green-800",
    warning: "border-orange-200 bg-orange-100 text-orange-800",
    primary: "border-primary/30 bg-primary/10 text-primary",
  };
  return <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.neutral}`}>{children}</span>;
}

export function Panel({ children, className = "", title, icon, action }) {
  return (
    <section className={`rounded-lg border border-outline bg-surface-container-lowest ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-outline px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
            {icon && <Icon name={icon} className="text-primary" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
      {label}
      {children}
      {hint && <span className="text-[11px] normal-case font-medium text-on-surface-variant/80">{hint}</span>}
    </label>
  );
}

const controlClass = "min-h-10 w-full rounded border border-outline bg-surface px-3 text-sm font-medium normal-case tracking-normal text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:border-2";

export function TextInput(props) {
  return <input {...props} className={`${controlClass} ${props.className || ""}`} />;
}

export function Select(props) {
  return <select {...props} className={`${controlClass} ${props.className || ""}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${controlClass} min-h-24 py-2 ${props.className || ""}`} />;
}

export function SectionTitle({ title, subtitle, action, onAction, icon }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-on-surface">
          {icon && <Icon name={icon} className="text-primary" />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {action && <Button onClick={onAction} icon="add">{action}</Button>}
    </div>
  );
}

export function StatCard({ label, value, tone = "primary" }) {
  const toneClass = tone === "error" ? "text-error" : "text-primary";
  return (
    <div className="rounded-lg border border-outline bg-surface-container-lowest p-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function IconButton({ icon, onClick, tone = "default", title }) {
  const toneClass = tone === "danger" ? "hover:text-error" : "hover:text-primary";
  return (
    <button type="button" onClick={onClick} title={title} className={`rounded p-1.5 text-on-surface-variant transition-colors ${toneClass}`}>
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}
