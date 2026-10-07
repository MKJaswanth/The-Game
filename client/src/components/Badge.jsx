import React from 'react';

export default function Badge({
  children,
  variant = 'primary',
  icon = null,
  className = '',
  ...rest
}) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...rest}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
export { Badge };
