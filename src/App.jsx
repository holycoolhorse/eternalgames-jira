import React from 'react';

function App() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>🚀 EternalGames Jira</h1>
      <p>Site başarıyla çalışıyor!</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/login" style={{ 
          background: '#007bff', 
          color: 'white', 
          padding: '10px 20px', 
          textDecoration: 'none', 
          borderRadius: '5px' 
        }}>
          Giriş Yap
        </a>
      </div>
    </div>
  );
}

export default App;
