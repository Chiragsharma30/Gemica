import { titleCase } from '../utils/format';

export default function StatusBadge({ value }) {
  return <span className={`status status--${value}`}>{titleCase(value)}</span>;
}
