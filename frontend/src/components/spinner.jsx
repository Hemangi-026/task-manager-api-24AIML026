function Spinner() {
  return (
    <div className="spinner-wrapper" role="status" aria-live="polite">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

export default Spinner;
