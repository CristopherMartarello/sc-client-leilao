import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import NodeRSA from 'node-rsa';

const AuctionClient = () => {
  // Estados e referências mantidos
  const [currentItem, setCurrentItem] = useState(null);
  const [newBid, setNewBid] = useState('');
  const [user, setUser] = useState('');
  const [cpf, setCPF] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [symmetricKey, setSymmetricKey] = useState(null);
  const [multicastAddress, setMulticastAddress] = useState(null);
  const socketRef = useRef();

  // Função de geração de chaves (mesma lógica já usada)
  const generateKeyPair = () => {
    const storedPrivateKey = localStorage.getItem('privateKey');
    const storedPublicKey = localStorage.getItem('publicKey');

    if (storedPrivateKey && storedPublicKey) {
      console.log('Chaves existentes encontradas.');
      setPublicKey(storedPublicKey);
    } else {
      console.log('Gerando novo par de chaves...');
      const key = new NodeRSA({ b: 2048 });
      key.setOptions({ encryptionScheme: 'pkcs1' });

      // Exportar e armazenar a chave pública
      const publicKey = key.exportKey('public');
      localStorage.setItem('publicKey', publicKey);

      // Exportar e armazenar a chave privada
      const privateKey = key.exportKey('private');
      localStorage.setItem('privateKey', privateKey);

      setPublicKey(publicKey);
    }
  };

  // Função para descriptografar com a chave privada
  const decryptWithPrivateKey = (privateKey, encryptedMessage) => {
    const key = new NodeRSA();
    key.setOptions({ encryptionScheme: 'pkcs1' });
    key.importKey(privateKey, 'private');
    return key.decrypt(encryptedMessage, 'utf8');
};

  // Lógica de login
  const handleLogin = () => {
    fetch('http://localhost:3000/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, publicKey }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erro na autenticação.');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          console.log('Autenticação bem-sucedida.');

          // Descriptografar a chave simétrica e os dados
          const privateKey = localStorage.getItem('privateKey');
          const decryptedSymmetricKey = decryptWithPrivateKey(privateKey, data.encryptedSymmetricKey);
          const decryptedUserInfo = decryptWithPrivateKey(privateKey, data.encryptedUserInfo);
          const decryptedMulticastAddress = decryptWithPrivateKey(privateKey, data.encryptedMulticastAddress);
          const userInfo = JSON.parse(decryptedUserInfo);

          // Setando o estado para uso na interface
          setSymmetricKey(decryptedSymmetricKey);
          setUser(userInfo.nome);
          setMulticastAddress(decryptedMulticastAddress);

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

  // Efeito para gerar chaves ao carregar
  useEffect(() => {
    if (!isAuthenticated) generateKeyPair();
  }, [isAuthenticated]);

  // Efeito para conectar ao socket após autenticação
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Autenticado. Conectando ao multicast...');
      socketRef.current = io('http://localhost:3000');

      socketRef.current.on('currentItem', (item) => {
        setCurrentItem(item);
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div>
        <h1>Login</h1>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Nome"
        />
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCPF(e.target.value)}
          placeholder="CPF"
        />
        <button onClick={handleLogin}>Entrar</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Leilão Atual</h1>
      {currentItem ? (
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
          <button onClick={() => socketRef.current.emit('newBid', { amount: parseInt(newBid), user })}>
            Dar Lance
          </button>
        </div>
      ) : (
        <p>Carregando item...</p>
      )}
      <button onClick={() => setIsAuthenticated(false)}>Sair</button>
    </div>
  );
};

export default AuctionClient;
