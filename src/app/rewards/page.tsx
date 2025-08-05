
// src/app/rewards/page.tsx
// This page is now deprecated as its content should be under /student/rewards
// and use the StudentLayout.
// For now, redirect or show a message.

import { redirect } from 'next/navigation';

export default function DeprecatedRewardsPage() {
  // Redirect to the new student-specific rewards page
  redirect('/student/rewards');
  
  // Or, if you want to keep it accessible for some reason (not recommended for clarity):
  // return (
  //   <div>
  //     <h1>Rewards Page</h1>
  //     <p>This page has moved. Please access rewards through your student dashboard.</p>
  //     <Link href="/student/rewards">Go to My Rewards</Link>
  //   </div>
  // );
}
