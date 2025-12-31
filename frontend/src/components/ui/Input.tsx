import React from "react";

type CommonProps = {
  label?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
};

type InputProps =
  | (CommonProps & React.InputHTMLAttributes<HTMLInputElement>)
  | (CommonProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>);

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  multiline = false,
  rows = 4,
  ...props
}) => {
  const base =
    `w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 ` +
    `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 ` +
    `${error ? "border-red-500" : ""} ${className}`;

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}

      {multiline ? (
        <textarea
          className={base}
          rows={rows}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={base}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};
