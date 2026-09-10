import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // send/receive the httpOnly refresh-token cookie
});

api.interceptors.request.use((config) => {
    const userInfo = localStorage.getItem('userInfo');

    if (userInfo) {
        const { token } = JSON.parse(userInfo);

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }

    return config;
});

// When the access token expires, transparently swap in a fresh one using
// the httpOnly refresh-token cookie, then retry the original request once.
let refreshPromise = null;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        const isAuthRoute =
            config?.url?.includes('/auth/login') ||
            config?.url?.includes('/auth/register') ||
            config?.url?.includes('/auth/refresh');

        if (response?.status === 401 && !config._retry && !isAuthRoute) {
            config._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = api.post('/auth/refresh').finally(() => {
                        refreshPromise = null;
                    });
                }
                const { data } = await refreshPromise;

                const stored = localStorage.getItem('userInfo');
                if (stored) {
                    const userInfo = JSON.parse(stored);
                    userInfo.token = data.token;
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));
                }

                config.headers.Authorization = `Bearer ${data.token}`;
                return api(config);
            } catch (refreshError) {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
