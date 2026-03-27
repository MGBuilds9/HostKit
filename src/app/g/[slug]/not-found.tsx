export default function GuestGuideNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'hsl(var(--guest-bg))' }}
    >
      <div className="text-center space-y-4 max-w-sm">
        <div
          className="text-5xl font-bold"
          style={{ color: 'hsl(var(--guest-accent))' }}
        >
          404
        </div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'hsl(var(--guest-text))' }}
        >
          This guide isn&apos;t available
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'hsl(var(--guest-text-muted))' }}
        >
          The guest guide you&apos;re looking for doesn&apos;t exist or may have
          been removed. Please contact your host directly for assistance.
        </p>
      </div>
    </div>
  );
}
