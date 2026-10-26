import { useEffect, useState, lazy, Suspense } from 'react';
import Spinner from '../components/spinner';
import ErrorMessage from '../components/errormessage';
import { getTasks } from '../api';
import { useAuth } from '../context/AuthContext';

// Recharts chunk — only downloaded when user clicks "Show Chart"
const ProgressChart = lazy(() => import('../components/ProgressChart'));

const GITHUB_USERNAME = 'Hemangi-026';

function Projects() {
  // ---- GitHub repos ----
  const [repos, setRepos]           = useState([]);
  const [repoLoading, setRepoLoad]  = useState(true);
  const [repoError, setRepoError]   = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch]         = useState('');

  // ---- Task progress chart ----
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks]         = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Fetch GitHub repos
  useEffect(() => {
    setRepoLoad(true);
    setRepoError(null);
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=30`)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        return res.json();
      })
      .then((data) => setRepos(data))
      .catch((err) => setRepoError(err.message))
      .finally(() => setRepoLoad(false));
  }, [retryCount]);

  // Fetch tasks when user clicks "Show Chart" (lazy data fetch too)
  const handleToggleChart = () => {
    const next = !showChart;
    setShowChart(next);
    if (next && !tasksLoaded && isAuthenticated) {
      getTasks()
        .then((res) => { setTasks(res.data); setTasksLoaded(true); })
        .catch(() => { /* silently skip if not logged in */ });
    }
  };

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="projects-page">
      {/* ---- Page heading ---- */}
      <div className="projects-top">
        <div className="page-heading">
          <h1>📁 Projects</h1>
          <p className="subtitle">Task Manager progress overview</p>
        </div>

        {/* Show chart button — only when logged in */}
        {isAuthenticated && (
          <button
            className={`btn btn-chart ${showChart ? 'btn-chart--active' : ''}`}
            onClick={handleToggleChart}
          >
            {showChart ? 'Hide chart' : 'Show chart'}
          </button>
        )}
      </div>

      {/* ---- Progress chart (lazy) ---- */}
      {showChart && (
        <div className="progress-chart-wrap">
          <Suspense fallback={<Spinner />}>
            <ProgressChart tasks={tasks} loading={!tasksLoaded} />
          </Suspense>
        </div>
      )}

      {/* ---- GitHub repos section ---- */}
      <div className="projects-repos-heading">
        <h2>🗂 GitHub Repositories</h2>
        <input
          type="text"
          className="repo-search"
          placeholder="🔍  Search repositories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {repoLoading && <Spinner />}
      {repoError && (
        <ErrorMessage message={repoError} onRetry={() => setRetryCount((c) => c + 1)} />
      )}

      {!repoLoading && !repoError && (
        filtered.length === 0 ? (
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
        )
      )}
    </section>
  );
}

export default Projects;
