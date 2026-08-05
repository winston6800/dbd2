import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** A one-time purchase. Its existence is the entitlement — there is no expiry. */
export interface Purchase {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string;
  stripe_checkout_session_id: string | null;
  amount_total: number;
  currency: string;
  status: 'paid' | 'refunded';
  created_at: string;
}

export async function getPurchase(userId: string): Promise<Purchase | null> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .maybeSingle();
  if (error) return null;
  return data;
}
