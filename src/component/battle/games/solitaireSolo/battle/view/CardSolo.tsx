import React from 'react';
import { SoloCard } from '../types/SoloTypes';
import "./card.css";
interface CardSVGProps {
  card: SoloCard;
  width?: string;
  height?: string;
}


export const CardSolo = ({ card, width = '100%', height = '100%' }: CardSVGProps) => {

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? 'red' : 'black';

  return (
    <div className="card-solo">

    </div>
  );
};




export default CardSolo;