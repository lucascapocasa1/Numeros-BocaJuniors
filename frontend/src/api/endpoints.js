import client from './client';

// Economy
export const getEconomyRecords = (params = {}) => client.get('/economy', { params });
export const getEconomyRecord = (id) => client.get(`/economy/${id}`);
export const getEconomyMonthlySummary = () => client.get('/economy/monthly-summary');
export const getEconomyOverdueEvolution = () => client.get('/economy/overdue-evolution');
export const createEconomyRecord = (data) => client.post('/admin/economy', data);
export const updateEconomyRecord = (id, data) => client.put(`/admin/economy/${id}`, data);
export const deleteEconomyRecord = (id) => client.delete(`/admin/economy/${id}`);

// Contracts
export const getContracts = (params = {}) => client.get('/contracts', { params });
export const getContractStats = () => client.get('/contracts/stats');
export const getContractRecentMoves = () => client.get('/contracts/recent-moves');
export const getContract = (id) => client.get(`/contracts/${id}`);
export const createContract = (data) => client.post('/admin/contracts', data);
export const updateContract = (id, data) => client.put(`/admin/contracts/${id}`, data);
export const deleteContract = (id) => client.delete(`/admin/contracts/${id}`);
export const saveContractAsChange = (id, data) => client.post(`/admin/contracts/${id}/save-as-change`, data);

// Rights
export const getRights = (params = {}) => client.get('/rights', { params });
export const getRight = (id) => client.get(`/rights/${id}`);
export const createRight = (data) => client.post('/admin/rights', data);
export const updateRight = (id, data) => client.put(`/admin/rights/${id}`, data);
export const deleteRight = (id) => client.delete(`/admin/rights/${id}`);

// Stats
export const getPlayerStats = (id) => client.get(`/player/${id}/stats`);
export const getLeagueStats = (params = {}) => client.get('/league/stats', { params });
export const getTeam = (params = {}) => client.get('/team', { params });
export const getPlayerMatches = (id, year = null) => client.get(`/player/${id}/matches`, { params: year ? { year } : {} });
export const getPlayer = (id) => client.get(`/player/${id}`);

// Rumors
export const getRumors = (params = {}) => client.get('/rumors', { params });
export const getRumor = (id) => client.get(`/rumors/${id}`);
export const createRumor = (data) => client.post('/admin/rumors', data);
export const updateRumor = (id, data) => client.put(`/admin/rumors/${id}`, data);
export const deleteRumor = (id) => client.delete(`/admin/rumors/${id}`);

// Markets
export const getMarkets = () => client.get('/markets');
export const createMarket = (data) => client.post('/admin/markets', data);
export const updateMarket = (id, data) => client.put(`/admin/markets/${id}`, data);
export const deleteMarket = (id) => client.delete(`/admin/markets/${id}`);
export const activateMarket = (id) => client.post(`/admin/markets/${id}/activate`);
export const deactivateMarket = () => client.post('/admin/markets/deactivate');

// Elections (public)
export const getElections = () => client.get('/elections');
export const getElectionByToken = (token) => client.get(`/elections/token/${token}`);
export const getElectionBySlug = (slug) => client.get(`/elections/slug/${slug}`);
export const getElectionListLogoUrl = (id) => `${client.defaults.baseURL}/elections/lists/${id}/logo`;
export const getElectionCandidatePhotoUrl = (id) => `${client.defaults.baseURL}/elections/candidates/${id}/photo`;
export const getElectionCandidateCvUrl = (id) => `${client.defaults.baseURL}/elections/candidates/${id}/cv`;

// Elections lists (admin)
export const getAdminElections = () => client.get('/admin/elections');
export const createElectionList = (formData) => client.post('/admin/elections/lists', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateElectionList = (id, formData) => client.post(`/admin/elections/lists/${id}/update`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteElectionList = (id) => client.delete(`/admin/elections/lists/${id}`);

// Elections candidates (admin)
export const createElectionCandidate = (listId, formData) => client.post(`/admin/elections/lists/${listId}/candidates`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateElectionCandidate = (id, formData) => client.post(`/admin/elections/candidates/${id}/update`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteElectionCandidate = (id) => client.delete(`/admin/elections/candidates/${id}`);

// Elections proposals (admin)
export const createElectionProposal = (listId, data) => client.post(`/admin/elections/lists/${listId}/proposals`, data);
export const updateElectionProposal = (id, data) => client.put(`/admin/elections/proposals/${id}`, data);
export const deleteElectionProposal = (id) => client.delete(`/admin/elections/proposals/${id}`);

// Elections commitments (admin)
export const createElectionCommitment = (proposalId, data) => client.post(`/admin/elections/proposals/${proposalId}/commitments`, data);
export const updateElectionCommitment = (id, data) => client.put(`/admin/elections/commitments/${id}`, data);
export const deleteElectionCommitment = (id) => client.delete(`/admin/elections/commitments/${id}`);

// Settings
export const getSettings = () => client.get('/admin/settings');
export const updateSettings = (data) => client.put('/admin/settings', data);
export const getSectionSettings = () => client.get('/settings/sections');

// Balances (public)
export const getBalances = () => client.get('/balances');
export const getBalance = (id) => client.get(`/balances/${id}`);
export const getBalancesEvolution = (params = {}) => client.get('/balances/evolution', { params });
export const getBalanceDownloadUrl = (id) => `${client.defaults.baseURL}/balances/${id}/download`;

// Balances (admin)
export const getBalanceAllItems = () => client.get('/admin/balances/items');
export const createBalance = (data) => client.post('/admin/balances', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateBalance = (id, formData) => client.post(`/admin/balances/${id}/update`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteBalance = (id) => client.delete(`/admin/balances/${id}`);
export const analyzeBalance = (id) => client.post(`/admin/balances/${id}/analyze`);
export const applyBalanceAnalysis = (id, data) => client.post(`/admin/balances/${id}/apply-analysis`, data);

// Balance lines CRUD (admin)
export const createLine = (balanceId, data) => client.post(`/admin/balances/${balanceId}/lines`, data);
export const reorderLines = (balanceId, items) => client.post(`/admin/balances/${balanceId}/lines/reorder`, { items });
export const updateLine = (balanceId, lineId, data) => client.put(`/admin/balances/${balanceId}/lines/${lineId}`, data);
export const deleteLine = (balanceId, lineId) => client.delete(`/admin/balances/${balanceId}/lines/${lineId}`);

// Stadium (public)
export const getStadium = () => client.get('/stadium');

// Stadium config (admin)
export const saveStadiumConfig = (data) => client.post('/admin/stadium/config', data);

// Stadium sectors (admin)
export const createStadiumSector = (data) => client.post('/admin/stadium/sectors', data);
export const updateStadiumSector = (id, data) => client.put(`/admin/stadium/sectors/${id}`, data);
export const deleteStadiumSector = (id) => client.delete(`/admin/stadium/sectors/${id}`);


// Twitter accounts (admin)
export const getTwitterAccounts = () => client.get('/admin/twitter/accounts');
export const createTwitterAccount = (data) => client.post('/admin/twitter/accounts', data);
export const updateTwitterAccount = (id, data) => client.put(`/admin/twitter/accounts/${id}`, data);
export const deleteTwitterAccount = (id) => client.delete(`/admin/twitter/accounts/${id}`);

// Contact
export const sendContact = (data) => client.post('/contact', data);

// Auth
export const login = (credentials) => client.post('/auth/login', credentials);
export const getMe = () => client.get('/admin/me');
export const refreshToken = () => client.post('/admin/auth/refresh');
export const logout = () => client.post('/admin/auth/logout');
export const changePassword = (data) => client.post('/admin/auth/change-password', data);
