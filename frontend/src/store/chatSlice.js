import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sendChatMessage } from '../api/api';

const initialState = {
  messages: [
    {
      role: 'assistant',
      text: 'Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.',
    },
  ],
  status: 'idle', // idle | sending | error
  threadId: 'rep-session-1',
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message, { getState, rejectWithValue }) => {
    try {
      const { threadId } = getState().chat;
      const res = await sendChatMessage(message, threadId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', text: action.payload });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.status = 'sending';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = 'idle';
        state.messages.push({
          role: 'assistant',
          text: action.payload.reply,
          toolCalls: action.payload.tool_calls,
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = 'error';
        state.messages.push({
          role: 'assistant',
          text: `Sorry, something went wrong reaching the AI agent: ${action.payload}`,
        });
      });
  },
});

export const { addUserMessage } = chatSlice.actions;
export default chatSlice.reducer;
