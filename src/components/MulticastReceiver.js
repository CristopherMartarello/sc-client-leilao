import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const AuctionClient = () => {
  const [currentItem, setCurrentItem] = useState(null);
  const [newBid, setNewBid] = useState('');
  const [user, setUser] = useState('');
  const [cpf, setCPF] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const socketRef = useRef();

  const generateKeyPair = async () => {
    const storedPrivateKey = localStorage.getItem('privateKey');
    const storedPublicKey = localStorage.getItem('publicKey');

    if (storedPrivateKey && storedPublicKey) {
      console.log('Chaves existentes encontradas.');
      setPublicKey(storedPublicKey);
    } else {
      console.log('Gerando novo par de chaves...');
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: 'SHA-256' },
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Exportar e armazenar a chave pública
      const exportedPublicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));
      localStorage.setItem('publicKey', publicKeyBase64);

      // Exportar e armazenar a chave privada
      const exportedPrivateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPrivateKey)));
      localStorage.setItem('privateKey', privateKeyBase64);

      setPublicKey(publicKeyBase64);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('privateKey');
    setIsAuthenticated(false);
    setUser('');
    setCPF('');
    setPublicKey('');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = io('http://localhost:3000');
      socketRef.current.on('currentItem', (item) => {
        setCurrentItem(item);
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleBid = () => {
    socketRef.current.emit('newBid', { amount: parseInt(newBid), user });
    setNewBid('');
  };

  const handleLogin = () => {
    fetch('http://localhost:3000/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cpf, publicKey }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Erro na autenticação. Servidor retornou um erro.');
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          console.log('Autenticação bem-sucedida.');
          setUser(data.user.nome);
          setIsAuthenticated(true);
        } else {
          alert('Autenticação falhou: ' + data.message);
        }
      })
      .catch((error) => {
        console.error('Erro na autenticação:', error);
        alert('Erro na autenticação. Verifique a conexão e tente novamente.');
      });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      generateKeyPair();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <>
        <div>
          <h1>Digite seu nome de usuário</h1>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Nome de usuário"
          />
        </div>
        <div>
          <h1>Digite o CPF:</h1>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCPF(e.target.value)}
            placeholder="CPF do usuário"
          />
          <button onClick={handleLogin}>Entrar</button>
        </div>
      </>
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
      <button onClick={clearSession}>Sair</button>
    </div>
  );
};

export default AuctionClient;
