const variants = {
  primary:
    "bg-brand-blue text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-md",
  accent:
    "bg-terracotta-dark text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-md",
  secondary:
    "border border-brand-blue/45 bg-white/60 text-brand-blue hover:border-brand-blue hover:bg-brand-blue hover:text-white",
};

// Renders a link when `href` is given, otherwise a button.
export default function Button({ href, variant = "primary", className = "", children, ...props }) {
  const classes = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-all duration-300 ${variants[variant]} ${className}`;
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  const { disabled, ...buttonProps } = props;
  return (
    <button
      type="button"
      className={`${classes} disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={disabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
