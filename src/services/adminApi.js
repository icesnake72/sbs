import axios from 'axios';
import { API_CONFIG } from '../config';

const buildAuthConfig = (accessToken, extra = {}) => ({
  ...extra,
  headers: {
    ...(extra.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  },
  withCredentials: true,
});

const extractData = (response) => response?.data?.data ?? response?.data;

export const adminApi = {
  getDashboardStats(accessToken) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/dashboard/stats`, buildAuthConfig(accessToken))
      .then(extractData);
  },

  // 날짜별 통계 (가입자, 게시글, 댓글, 조회수)
  getDailyStats(accessToken, days = 30) {
    return axios
      .get(
        `${API_CONFIG.baseUrl}/admin/dashboard/daily-stats`,
        buildAuthConfig(accessToken, { params: { days } })
      )
      .then(extractData);
  },

  getRecentUsers(accessToken, limit = 10) {
    return axios
      .get(
        `${API_CONFIG.baseUrl}/admin/dashboard/recent-users`,
        buildAuthConfig(accessToken, { params: { limit } })
      )
      .then(extractData);
  },

  getRecentPosts(accessToken, limit = 10) {
    return axios
      .get(
        `${API_CONFIG.baseUrl}/admin/dashboard/recent-posts`,
        buildAuthConfig(accessToken, { params: { limit } })
      )
      .then(extractData);
  },

  getUsers(accessToken, params) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/users`, buildAuthConfig(accessToken, { params }))
      .then(extractData);
  },

  getUserDetail(accessToken, userId) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/users/${userId}`, buildAuthConfig(accessToken))
      .then(extractData);
  },

  changeUserStatus(accessToken, userId, body) {
    return axios
      .put(`${API_CONFIG.baseUrl}/admin/users/${userId}/status`, body, buildAuthConfig(accessToken))
      .then(extractData);
  },

  changeUserRole(accessToken, userId, body) {
    return axios
      .put(`${API_CONFIG.baseUrl}/admin/users/${userId}/role`, body, buildAuthConfig(accessToken))
      .then(extractData);
  },

  forceLogout(accessToken, userId) {
    return axios
      .post(`${API_CONFIG.baseUrl}/admin/users/${userId}/force-logout`, {}, buildAuthConfig(accessToken))
      .then(extractData);
  },

  getPosts(accessToken, params) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/posts`, buildAuthConfig(accessToken, { params }))
      .then(extractData);
  },

  getPostDetail(accessToken, postId) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/posts/${postId}`, buildAuthConfig(accessToken))
      .then(extractData);
  },

  deletePost(accessToken, postId) {
    return axios
      .delete(`${API_CONFIG.baseUrl}/admin/posts/${postId}`, buildAuthConfig(accessToken))
      .then(extractData);
  },

  restorePost(accessToken, postId) {
    return axios
      .put(`${API_CONFIG.baseUrl}/admin/posts/${postId}/restore`, {}, buildAuthConfig(accessToken))
      .then(extractData);
  },

  changePostVisibility(accessToken, postId, body) {
    return axios
      .put(
        `${API_CONFIG.baseUrl}/admin/posts/${postId}/visibility`,
        body,
        buildAuthConfig(accessToken)
      )
      .then(extractData);
  },

  getComments(accessToken, params) {
    return axios
      .get(`${API_CONFIG.baseUrl}/admin/comments`, buildAuthConfig(accessToken, { params }))
      .then(extractData);
  },

  deleteComment(accessToken, commentId) {
    return axios
      .delete(`${API_CONFIG.baseUrl}/admin/comments/${commentId}`, buildAuthConfig(accessToken))
      .then(extractData);
  },
};

