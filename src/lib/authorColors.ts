export const AUTHOR_COLORS = [
  '#f50000', // Красный
  '#ffec38', // Желтый
  '#8fff38', // Салатовый
  '#38ffe1', // Бирюзовый
  '#383aff', // Синий
  '#9e38ff', // Фиолетовый
  '#ff38d2', // Розовый
  '#605252', // Серо-коричневый
  '#FFFFFF', // Белый
  '#258408', // Темно-зеленый
  '#FF7E00', // Оранжевый
] as const;

export type AuthorColor = (typeof AUTHOR_COLORS)[number];
