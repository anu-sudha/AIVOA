import React from 'react';
import InteractionForm from './InteractionForm';
import ChatPanel from './ChatPanel';

const styles = {
  wrapper: {
    maxWidth: 1100,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e6e8ec',
    fontWeight: 600,
    fontSize: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
  },
  leftCol: {
    padding: 24,
    borderRight: '1px solid #e6e8ec',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    background: '#fafbfc',
  },
};

export default function LogInteractionScreen() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>Log HCP Interaction</div>
      <div style={styles.grid}>
        <div style={styles.leftCol}>
          <InteractionForm />
        </div>
        <div style={styles.rightCol}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
