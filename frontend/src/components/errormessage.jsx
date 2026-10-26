function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message" role="alert">
      <p>Something went wrong: {message}</p>
      <button type="button" className="retry-btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default ErrorMessage;
