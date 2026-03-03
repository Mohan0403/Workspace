import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>}
      <input
        className={`w-full rounded-xl border ${error ? 'border-red-500/70' : 'border-white/15'} bg-white/5 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;