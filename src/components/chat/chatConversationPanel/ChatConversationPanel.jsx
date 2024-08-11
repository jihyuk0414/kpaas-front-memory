'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import RequestMessages from './RequestMessages';
import ReceivedMessages from './ReceivedMessages';

export default function ChatConversationPanel({ userInfo }) {
  const [stompClient, setStompClient] = useState(null);
  const [message, setMessage] = useState('');
  const [allMessages, setAllMessages] = useState([]);

  useEffect(() => {
    const socket = new SockJS(
      'http://default-chat-service-7c2a3-25892552-1d82f05544d5.kr.lb.naverncp.com:50/ws'
    );
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe('/sub/room1', (msg) => {
          const receivedMessage = JSON.parse(msg.body);

          // 상대방에게 받은 메세지일때만 추가
          if (receivedMessage.sender.user_name !== userInfo.nick_name) {
            setAllMessages((prevMessages) => [
              ...prevMessages,
              { ...receivedMessage, type: 'received' },
            ]);
          }
        });
      },

      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, []);

  const sendMessage = () => {
    if (stompClient && stompClient.connected) {
      const messageBody = {
        sender: userInfo.nick_name,
        content: message,
        type: 'TALK', // TALK or ENTER
        roomId: '1',
      };

      stompClient.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify(messageBody),
      });
      setAllMessages((prevMessages) => [
        ...prevMessages,
        { ...messageBody, type: 'sent' },
      ]);

      setMessage('');
    } else {
      console.error('STOMP가 연결 안됐음');
    }
  };

  return (
    <StyledWrapper>
      <div className="wrapper-messages">
        {allMessages.map((msg, index) =>
          msg.type === 'sent' ? (
            <RequestMessages
              requestMessages={msg}
              userInfo={userInfo}
              key={index}
            />
          ) : (
            <ReceivedMessages key={index} receiveMessages={msg} />
          )
        )}
      </div>
      <div className="wrapper-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
        />
        <button onClick={sendMessage}>메시지 보내기</button>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 70%;
  /* background-color: greenyellow; */

  .wrapper-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }
  .wrapper-input {
    display: flex;
    padding: 10px;
    background-color: #fff;
    border-top: 1px solid #ccc;

    position: absolute;
    bottom: 0;
    input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-right: 10px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      background-color: #007bff;
      color: white;
      cursor: pointer;
    }
  }
`;
