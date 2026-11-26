export default function Loading() {
  return (
    <main className="portal-loading-screen" role="status" aria-label="Loading page">
      <div className="portal-loader-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
      <p className="portal-loader-brand">ProjectHub</p>
      <p className="portal-loader-caption">Preparing your workspace</p>
    </main>
  );
}
