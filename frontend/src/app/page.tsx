'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import LottoABI from '../contracts/LottoFactory.json';

export default function LottoPage() {
  // 상태 관리 (나중에 Wagmi 연결 후 실제 데이터로 교체)
  const [ticketPrice, setTicketPrice] = useState('0.01 ETH');
  const [totalPool, setTotalPool] = useState('0.5 ETH');
  const [isJoined, setIsJoined] = useState(false);

  // 로또 참여 함수 (나중에 AA UserOp 로직이 들어갈 곳)
  const handleJoinLotto = () => {
    alert('로또 참여 트랜잭션을 실행합니다! (AA Wallet 필요)');
    // 여기에 번들러 전송 로직이 추가될 예정입니다.
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🎰 Tyler's AA Lotto DApp</h1>
      <hr />

      {/* 1. wallet connection */}
      <section>
        <h2>지갑 정보</h2>
        <ConnectButton />
      </section>

      <br />

      {/* 2. contract info section (Read) */}
      <section>
        <h2>로또 정보</h2>
        <ul>
          <li>티켓 가격: <strong>{ticketPrice}</strong></li>
          <li>현재 총 상금: <strong>{totalPool}</strong></li>
          <li>내 참여 상태: {isJoined ? '✅ 참여 중' : '❌ 미참여'}</li>
        </ul>
      </section>

      <br />

      {/* 3. 액션 섹션 (Write) */}
      <section>
        <h2>참여하기</h2>
        <p>스마트 계정(AA)을 통해 가스비 없이 참여하세요!</p>
        <button
          onClick={handleJoinLotto}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          로또 티켓 구매
        </button>
      </section>

      <br />
      <small>ABI 로드 확인: {LottoABI ? '✅ 완료' : '❌ 실패'}</small>
    </main>
  );
}
