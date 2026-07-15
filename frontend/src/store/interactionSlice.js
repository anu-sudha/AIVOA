import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createInteraction } from '../api/api';

const initialState = {
  form: {
    hcp_name_raw: '',
    interaction_type: 'Meeting',
    date: '',
    time: '',
    attendees: '',
    topics_discussed: '',
    materials_shared: '',
    samples_distributed: '',
    sentiment: 'Neutral',
    outcomes: '',
    follow_up_actions: '',
  },
  aiSuggestedFollowups: [
    'Schedule follow-up meeting in 2 weeks',
    'Send OncoBoost Phase III PDF',
    'Add Dr. Sharma to advisory board invite list',
  ],
  status: 'idle', // idle | saving | saved | error
  error: null,
};

export const submitInteraction = createAsyncThunk(
  'interaction/submit',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { form } = getState().interaction;
      const res = await createInteraction(form);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    resetForm: (state) => {
      state.form = initialState.form;
      state.status = 'idle';
    },
    applyExtractedFields: (state, action) => {
      // merges fields extracted by the AI (chat -> form) so both surfaces
      // stay in sync, matching the "flexibility to log via form or chat" requirement
      state.form = { ...state.form, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitInteraction.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(submitInteraction.fulfilled, (state) => {
        state.status = 'saved';
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload;
      });
  },
});

export const { updateField, resetForm, applyExtractedFields } = interactionSlice.actions;
export default interactionSlice.reducer;
