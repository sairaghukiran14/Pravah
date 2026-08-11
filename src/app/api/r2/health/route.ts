import { checkR2Connection } from '@/lib/r2';
import { route } from '@/lib/api/route';

export const GET = route({ cost: 2 }, async () => {
  return checkR2Connection();
});
