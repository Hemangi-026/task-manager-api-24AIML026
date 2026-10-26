import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="not-found-page">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/" className="btn" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
        Back to Tasks
      </Link>
    </section>
  );
}

export default NotFound;
