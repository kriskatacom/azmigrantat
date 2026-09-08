export type BlockedUser = {
  id: number;
  blocked_user_id: number;
  name: string | null;
  public_code: string | null;
  profile_image: string | null;
  created_at: string | null;
};

export type BlockedUsersResponse = {
  success: true;
  data: BlockedUser[];
  meta: {
    has_more: boolean;
    next_before_id: number | null;
  };
};
