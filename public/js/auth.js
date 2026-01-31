import { post } from './api.js';

export async function register(form) {
  const formData = new FormData(form);
  return post('/api/auth/register', {
    email: formData.get('email'),
    password: formData.get('password'),
    uiLanguage: formData.get('uiLanguage'),
  });
}

export async function login(form) {
  const formData = new FormData(form);
  return post('/api/auth/login', {
    email: formData.get('email'),
    password: formData.get('password'),
  });
}

export async function logout() {
  return post('/api/auth/logout', {});
}

export async function requestReset(email) {
  return post('/api/auth/request-reset', { email });
}
