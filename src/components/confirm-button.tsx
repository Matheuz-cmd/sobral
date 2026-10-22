"use client";

import type { ReactNode } from "react";

/** Botão de submit que pede confirmação antes de enviar o formulário. */
export function ConfirmButton({
  message,
  className = "btn",
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
