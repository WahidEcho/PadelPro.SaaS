import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://leoeidhyylsplmjzxfe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlb2llZGh5eXBsc3BsbWp6eGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI4NDIyMywiZXhwIjoyMDYxODYwMjIzfQ.8JCCRiv-XRxQMvgRn6hAzJt1GPVD4CpOzRmdrHsgpFQ'
);

async function updateFullName() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'd5451520-6bad-47b3-8fea-d315de3ec6a0', // UID for hossam@sales.com
    { user_metadata: { full_name: 'Hossam' } }
  );
  if (error) {
    console.error('Error updating user:', error);
  } else {
    console.log('User updated:', data);
  }
}

updateFullName(); 