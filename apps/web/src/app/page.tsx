import { redirect } from 'next/navigation';

// dev build test
export default function RootPage() {
  redirect('/dashboard');
}
