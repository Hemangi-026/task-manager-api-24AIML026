import { useEffect, useState } from 'react';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';

const GITHUB_USERNAME = 'Hemangi-026';

function Projects() {
  const [repos, setRepos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=30`)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        return res.json();
      })
      .then((data) => setRepos(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [retryCount]);

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;
  if (error)   return <ErrorMessage message={error} onRetry={() => setRetryCount((c) => c + 1)} />;

  return (
    <section className="projects-page">
      <div className="page-heading">
        <h1>🗂 Projects</h1>
        <p className="subtitle">GitHub repositories for <strong>{GITHUB_USERNAME}</strong></p>
      </div>

      <input
        type="text"
        className="repo-search"
        placeholder="🔍  Search repositories…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="no-results">No repositories match "{search}".</p>
      ) : (
        <div className="project-grid">
          {filtered.map((repo) => (
            <div className="project-card" key={repo.id}>
              <div className="project-card__top">
                <span className="project-card__icon">📁</span>
                <span className="star-count">★ {repo.stargazers_count}</span>
              </div>
              <h3>{repo.name}</h3>
              <p className="project-card__desc">
                {repo.description || 'No description provided.'}
              </p>
              {repo.language && (
                <span className="project-card__lang">{repo.language}</span>
              )}
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="repo-link"
              >
                View on GitHub →
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Projects;
