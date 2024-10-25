import React, { useEffect, useState } from 'react';
import coin from '../../UI/svg/coin.svg';

interface FallingCoinProps {
  left: number;
  onFinish: () => void;
}

const FallingCoin: React.FC<FallingCoinProps> = ({ left, onFinish }) => {
  const [top, setTop] = useState(-20);

  useEffect(() => {
    const interval = setInterval(() => {
      setTop((prevTop) => {
        if (prevTop > window.innerHeight) {
          clearInterval(interval);
          onFinish();
          return prevTop;
        }
        return prevTop + 5;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      className="absolute"
      style={{ left: `${left}px`, top: `${top}px`, width: '40px', height: '40px', zIndex: 1 }}
    >
      <img src={coin} alt="coin" className="w-full h-full" />
    </div>
  );
};

export default FallingCoin;
