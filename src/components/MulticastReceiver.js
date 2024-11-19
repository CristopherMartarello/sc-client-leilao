import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const AuctionClient = () => {
  const [currentItem, setCurrentItem] = useState(null);
  const [newBid, setNewBid] = useState('');
  const [user, setUser] = useState('');
  const [isLogged, setIsLogged] = useState(false);
  const socketRef = useRef(); // useRef para manter a instância do socket

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('currentItem', (item) => {
      setCurrentItem(item);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleBid = () => {
    socketRef.current.emit('newBid', { amount: parseInt(newBid), user });
    setNewBid('');
  };

  const handleLogin = () => {
    setIsLogged(true);
  };

  if (!isLogged) {
    return (
      <div>
        <h1>Digite seu nome de usuário</h1>
        <input 
          type="text" 
          value={user} 
          onChange={(e) => setUser(e.target.value)} 
          placeholder="Nome de usuário" 
        />
        <button onClick={handleLogin}>Entrar</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Leilão Atual</h1>
      {currentItem && (
        <div>
          <p>Item: {currentItem.description}</p>
          <p>Lance Inicial: {currentItem.initialBid}</p>
          <p>Lance Atual: {currentItem.currentBid} por {currentItem.currentBidUser}</p>
          <p>Tempo Restante: {currentItem.timeRemaining} segundos</p>
          <input 
            type="number" 
            value={newBid} 
            onChange={(e) => setNewBid(e.target.value)} 
            placeholder="Digite seu lance" 
          />
          <button onClick={handleBid}>Dar Lance</button>
        </div>
      )}
    </div>
  );
};

export default AuctionClient;
