import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateField, submitInteraction, resetForm } from '../store/interactionSlice';
import { searchMaterials, summarizeVoiceNote } from '../api/api';

const label = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: '#4b5563' };
const input = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d8dce3',
  fontSize: 14, marginBottom: 14, background: '#fff',
};
const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

const smallBtn = {
  background: '#fff', color: '#2563eb', border: '1px solid #d8dce3', borderRadius: 6,
  padding: '5px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
};
const dropdown = {
  position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #d8dce3',
  borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', width: 260,
  maxHeight: 180, overflowY: 'auto',
};
const dropdownItem = { padding: '8px 12px', fontSize: 13, cursor: 'pointer' };

function appendCsv(existing, value) {
  const items = (existing || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!items.includes(value)) items.push(value);
  return items.join(', ');
}

export default function InteractionForm() {
  const dispatch = useDispatch();
  const { form, aiSuggestedFollowups, status } = useSelector((s) => s.interaction);

  const onChange = (field) => (e) => dispatch(updateField({ field, value: e.target.value }));

  const onSave = () => dispatch(submitInteraction());

  const sentimentOptions = ['Positive', 'Neutral', 'Negative'];

  // Search/Add materials + Add Sample pickers
  const [materialResults, setMaterialResults] = useState([]);
  const [sampleResults, setSampleResults] = useState([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showSamplePicker, setShowSamplePicker] = useState(false);

  const openMaterialPicker = async () => {
    const res = await searchMaterials('');
    setMaterialResults(res.data.materials);
    setShowMaterialPicker((v) => !v);
    setShowSamplePicker(false);
  };
  const openSamplePicker = async () => {
    const res = await searchMaterials('');
    setSampleResults(res.data.samples);
    setShowSamplePicker((v) => !v);
    setShowMaterialPicker(false);
  };

  // Summarize from Voice Note (Requires Consent)
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  const onVoiceNote = () => {
    const consented = window.confirm(
      'This will access your microphone to record a voice note, which will be sent to the AI ' +
      'for summarization. Do you consent to recording?'
    );
    if (!consented) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setRecording(true);
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognition.onresult = async (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      try {
        const res = await summarizeVoiceNote(transcript);
        dispatch(updateField({
          field: 'topics_discussed',
          value: form.topics_discussed ? `${form.topics_discussed}\n${res.data.summary}` : res.data.summary,
        }));
      } catch (e) {
        alert('Could not summarize the voice note. Check the backend is running.');
      }
    };

    recognition.start();
  };

  return (
    <div>
      <div style={row}>
        <div>
          <label style={label}>HCP Name</label>
          <input
            style={input}
            placeholder="Search or select HCP..."
            value={form.hcp_name_raw}
            onChange={onChange('hcp_name_raw')}
          />
        </div>
        <div>
          <label style={label}>Interaction Type</label>
          <select style={input} value={form.interaction_type} onChange={onChange('interaction_type')}>
            <option>Meeting</option>
            <option>Call</option>
            <option>Email</option>
            <option>Conference</option>
          </select>
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={label}>Date</label>
          <input style={input} type="date" value={form.date} onChange={onChange('date')} />
        </div>
        <div>
          <label style={label}>Time</label>
          <input style={input} type="time" value={form.time} onChange={onChange('time')} />
        </div>
      </div>

      <label style={label}>Attendees</label>
      <input style={input} placeholder="Enter names or search..." value={form.attendees} onChange={onChange('attendees')} />

      <label style={label}>Topics Discussed</label>
      <textarea
        style={{ ...input, minHeight: 70, resize: 'vertical' }}
        placeholder="Enter key discussion points..."
        value={form.topics_discussed}
        onChange={onChange('topics_discussed')}
      />
      <button type="button" onClick={onVoiceNote} style={{ ...smallBtn, marginTop: -8, marginBottom: 14 }}>
        {recording ? '🎙️ Listening...' : '🎙️ Summarize from Voice Note (Requires Consent)'}
      </button>

      <div style={row}>
        <div style={{ position: 'relative' }}>
          <label style={label}>Materials Shared</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, marginBottom: 6 }} placeholder="No materials added" value={form.materials_shared} onChange={onChange('materials_shared')} />
            <button type="button" style={{ ...smallBtn, height: 38 }} onClick={openMaterialPicker}>Search/Add</button>
          </div>
          {showMaterialPicker && (
            <div style={dropdown}>
              {materialResults.map((m) => (
                <div
                  key={m}
                  style={dropdownItem}
                  onClick={() => {
                    dispatch(updateField({ field: 'materials_shared', value: appendCsv(form.materials_shared, m) }));
                    setShowMaterialPicker(false);
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <label style={label}>Samples Distributed</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, marginBottom: 6 }} placeholder="No samples added" value={form.samples_distributed} onChange={onChange('samples_distributed')} />
            <button type="button" style={{ ...smallBtn, height: 38 }} onClick={openSamplePicker}>Add Sample</button>
          </div>
          {showSamplePicker && (
            <div style={dropdown}>
              {sampleResults.map((s) => (
                <div
                  key={s}
                  style={dropdownItem}
                  onClick={() => {
                    dispatch(updateField({ field: 'samples_distributed', value: appendCsv(form.samples_distributed, s) }));
                    setShowSamplePicker(false);
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <label style={label}>Observed / Inferred HCP Sentiment</label>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        {sentimentOptions.map((opt) => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input
              type="radio"
              name="sentiment"
              checked={form.sentiment === opt}
              onChange={() => dispatch(updateField({ field: 'sentiment', value: opt }))}
            />
            {opt}
          </label>
        ))}
      </div>

      <label style={label}>Outcomes</label>
      <textarea
        style={{ ...input, minHeight: 60, resize: 'vertical' }}
        placeholder="Key outcomes or agreements..."
        value={form.outcomes}
        onChange={onChange('outcomes')}
      />

      <label style={label}>Follow-up Actions</label>
      <textarea
        style={{ ...input, minHeight: 50, resize: 'vertical' }}
        placeholder="Enter next steps or tasks..."
        value={form.follow_up_actions}
        onChange={onChange('follow_up_actions')}
      />

      {aiSuggestedFollowups.length > 0 && (
        <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 16 }}>
          <strong>AI Suggested Follow-ups:</strong>
          <ul style={{ marginTop: 6 }}>
            {aiSuggestedFollowups.map((s, i) => (
              <li
                key={i}
                style={{ cursor: 'pointer', color: '#2563eb' }}
                onClick={() =>
                  dispatch(updateField({
                    field: 'follow_up_actions',
                    value: form.follow_up_actions ? `${form.follow_up_actions}; ${s}` : s,
                  }))
                }
              >
                + {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onSave}
          disabled={status === 'saving'}
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, fontSize: 14,
          }}
        >
          {status === 'saving' ? 'Saving...' : 'Log Interaction'}
        </button>
        <button
          onClick={() => dispatch(resetForm())}
          style={{
            background: '#fff', color: '#374151', border: '1px solid #d8dce3', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, fontSize: 14,
          }}
        >
          Clear
        </button>
      </div>
      {status === 'saved' && <p style={{ color: '#16a34a', fontSize: 13 }}>Interaction logged successfully.</p>}
      {status === 'error' && <p style={{ color: '#dc2626', fontSize: 13 }}>Failed to save. Check the backend is running.</p>}
    </div>
  );
}
