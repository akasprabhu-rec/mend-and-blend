const variants = {
  primary:
    "bg-brand-blue text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] dark:bg-[#496D92] dark:hover:bg-[#3B5B7D] dark:hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)]",
  accent:
    "bg-terracotta-dark text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-[0_10px_22px_-8px_rgba(181,91,68,0.42)] dark:bg-terracotta dark:text-[#181E22] dark:font-semibold dark:hover:bg-[#CC725B] dark:hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)]",
  secondary:
    "border border-brand-blue/45 bg-white/70 text-brand-blue shadow-xs hover:border-brand-blue hover:bg-brand-blue hover:text-white hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.28)] dark:border-[#8FB2D6]/45 dark:bg-white/5 dark:text-[#A9C5E2] dark:hover:border-[#8FB2D6] dark:hover:bg-[#3B5B7D] dark:hover:text-white",
};

// Renders a link when `href` is given, otherwise a button.
export default function Button({ href, variant = "primary", className = "", children, ...props }) {
  const classes = `btn-interactive inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium tracking-wide ${variants[variant]} ${className}`;
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
