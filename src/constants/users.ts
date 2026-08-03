export interface User {
  id: number;
  email: string;
  name: string;
  username: string;
  role: "admin" | "user" | "moderator";
  gender: "male" | "female" | "other";
  profile_image: string | null;
  bio: string | null;
  is_active: boolean;
}

export const MOCK_USERS: User[] = [
  {
    id: 1,
    name: "Иван Иванов",
    username: "ivan_admin",
    email: "ivan@example.com",
    role: "admin",
    gender: "male",
    profile_image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    bio: "Системен администратор на платформата. Обичам технологиите.",
    is_active: true,
  },
  {
    id: 2,
    name: "Мария Петрова",
    username: "maria_m",
    email: "maria@example.com",
    role: "moderator",
    gender: "female",
    profile_image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    bio: "Редактор и модератор на съдържанието. Винаги на линия.",
    is_active: true,
  },
  {
    id: 3,
    name: "Георги Георгиев",
    username: "gosho99",
    email: "georgi@example.com",
    role: "user",
    gender: "male",
    profile_image: null, // Тест с липсваща снимка (ще покажем инициали/иконка)
    bio: "Пътешественик и мигрант. Търся нови възможности.",
    is_active: false,
  },
];
