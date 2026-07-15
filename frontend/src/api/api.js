import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const createInteraction = (payload) => api.post('/api/interactions/', payload);
export const updateInteraction = (id, payload) => api.put(`/api/interactions/${id}`, payload);
export const listInteractions = () => api.get('/api/interactions/');
export const searchHcps = (q) => api.get(`/api/hcps/search?q=${encodeURIComponent(q)}`);
export const sendChatMessage = (message, threadId) =>
  api.post('/api/chat/', { message, thread_id: threadId });
export const searchMaterials = (q) => api.get(`/api/materials/search?q=${encodeURIComponent(q)}`);
export const summarizeVoiceNote = (transcript) =>
  api.post('/api/interactions/summarize-voice-note', { transcript });
