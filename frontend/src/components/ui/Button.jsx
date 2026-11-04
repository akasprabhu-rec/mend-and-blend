const variants = {
  primary: "bg-charcoal text-ivory hover:bg-olive-dark",
  secondary: "border border-charcoal/50 text-charcoal hover:bg-charcoal hover:text-ivory",
};

// Renders a link when `href` is given, otherwise a button.
export default function Button({ href, variant = "primary", className = "", children, ...props }) {
  const classes = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-300 ${variants[variant]} ${className}`;
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
