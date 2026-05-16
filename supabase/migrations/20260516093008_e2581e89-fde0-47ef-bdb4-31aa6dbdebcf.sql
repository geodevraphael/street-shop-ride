-- Allow users to create their own pending cash payout requests for the invite milestone
CREATE POLICY "rewards_user_request_invite_payout"
ON public.referral_rewards
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND reward_type = 'cash_payout'
  AND status = 'pending'
  AND (details->>'kind') = 'invite_20'
);