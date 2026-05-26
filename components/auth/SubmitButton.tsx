'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingLabel = 'Bitte warten …'
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary btn-block btn-lg"
      disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
