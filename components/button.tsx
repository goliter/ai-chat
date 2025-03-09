export function Button({ onClick, className, children } : { onClick: () => void, className: string, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-all ${className}`}
    >
      {children}
    </button>
  );
}
