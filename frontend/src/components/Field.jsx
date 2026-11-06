import { useId } from 'react';

// Accessible labelled input/select/textarea with inline error text.
export default function Field({ label, error, as = 'input', className = '', children, ...props }) {
  const id = useId();
  const Tag = as;
  const cls = as === 'select' ? 'select' : as === 'textarea' ? 'textarea' : 'input';
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} className={cls} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}>{children}</Tag>
      {error && <span id={`${id}-err`} className="field__error">{error}</span>}
    </div>
  );
}

// Map server validation issues ({path:'body.email', message}) to {email: message}.
export const fieldErrors = (err) =>
  Object.fromEntries((err?.errors || []).map((e) => [String(e.path).replace(/^body\./, ''), e.message]));
