const BASE_URL = 'http://localhost:5001';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      body.message || (body.errors && body.errors.join(', ')) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return body;
}

// ---------- Auth ----------
export const registerUser = (name, email, password, role) =>
  request('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });

export const loginUser = (email, password) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const googleLogin = (credential) =>
  request('/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

export const forgotPassword = (email) =>
  request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token, password) =>
  request(`/reset-password/${token}`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const getMe = () => request('/me');

export const updateProfile = (updates) =>
  request('/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

// ---------- Tasks ----------
export const getTasks = () => request('/tasks');

export const createTask = (task) =>
  request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });

export const updateTask = (id, updates) =>
  request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteTask = (id) =>
  request(`/tasks/${id}`, {
    method: 'DELETE',
  });
